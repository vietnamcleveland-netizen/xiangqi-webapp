import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getDB, all, run } from './db.js';
import authRoutes from './auth.js';
import { generateRoundRobin } from './tournament.js';
import { attachSockets } from './sockets.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/public', express.static('public'));

const limiter = rateLimit({ windowMs: 60*1000, limit: 300 });
app.use(limiter);

function auth(req, res, next){
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Auth required' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); return next(); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
}

app.use('/api/auth', authRoutes);

// Groups
app.post('/api/groups', auth, async (req,res)=>{
  const { name } = req.body; const db = getDB();
  try {
    const r = await run(db, 'INSERT INTO groups(name, owner_id) VALUES(?,?)', [name, req.user.id]);
    await run(db, 'INSERT INTO group_members(group_id, user_id, role) VALUES(?,?,?)', [r.lastID, req.user.id, 'owner']);
    res.json({ id: r.lastID, name });
  } finally { db.close(); }
});

app.get('/api/groups/mine', auth, async (req,res)=>{
  const db = getDB();
  try {
    const rows = await all(db, `SELECT g.* FROM groups g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = ?`, [req.user.id]);
    res.json(rows);
  } finally { db.close(); }
});

app.post('/api/groups/:id/invite', auth, async (req,res)=>{
  const { user_id } = req.body; const db = getDB();
  try {
    await run(db, 'INSERT OR IGNORE INTO group_members(group_id, user_id, role) VALUES(?,?,?)', [req.params.id, user_id, 'member']);
    res.json({ ok: true });
  } finally { db.close(); }
});

// Tournaments
app.post('/api/tournaments', auth, async (req,res)=>{
  const { group_id, name, time_initial_seconds=600, time_increment_seconds=0 } = req.body;
  const db = getDB();
  try {
    const r = await run(db, `INSERT INTO tournaments(group_id, name, time_initial_seconds, time_increment_seconds, status) VALUES(?,?,?,?, 'draft')`, [group_id, name, time_initial_seconds, time_increment_seconds]);
    res.json({ id: r.lastID });
  } finally { db.close(); }
});

app.post('/api/tournaments/:id/add-player', auth, async (req,res)=>{
  const db = getDB();
  try {
    await run(db, 'INSERT OR IGNORE INTO tournament_players(tournament_id, user_id) VALUES(?,?)', [req.params.id, req.body.user_id]);
    res.json({ ok: true }); 
  } finally { db.close(); }
});

app.post('/api/tournaments/:id/generate', auth, async (req,res)=>{
  try {
    const ids = await generateRoundRobin(parseInt(req.params.id,10));
    const db = getDB();
    await run(db, 'UPDATE tournaments SET status = "active" WHERE id = ?', [req.params.id]);
    db.close();
    res.json({ matches: ids });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Public: leaderboard
app.get('/api/leaderboard', async (req,res)=>{
  const db = getDB();
  try {
    const rows = await all(db, `
      SELECT u.id, u.display_name,
        SUM(CASE WHEN m.result = 'red' AND m.red_id = u.id THEN 1 WHEN m.result = 'black' AND m.black_id = u.id THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN m.result IN ('red','black') AND ((m.red_id = u.id AND m.result='black') OR (m.black_id = u.id AND m.result='red')) THEN 1 ELSE 0 END) AS losses,
        SUM(CASE WHEN m.result = 'draw' THEN 1 ELSE 0 END) AS draws
      FROM users u LEFT JOIN matches m ON (m.red_id = u.id OR m.black_id = u.id)
      GROUP BY u.id, u.display_name
      ORDER BY wins DESC, draws DESC
      LIMIT 50;
    `);
    res.json(rows);
  } finally { db.close(); }
});

// Static UI
app.get('/', (req,res)=> res.redirect('/public/index.html'));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: true, credentials: true } });
attachSockets(io);

const port = process.env.PORT || 8080;
httpServer.listen(port, ()=> console.log(`Xiangqi server listening on :${port}`));