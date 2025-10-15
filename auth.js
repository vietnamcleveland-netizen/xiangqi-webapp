import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDB, run, all } from './db.js';

const router = express.Router();

function setToken(res, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7*24*3600*1000 });
}

router.post('/register', async (req, res) => {
  const { email, password, display_name } = req.body;
  if (!email || !password || !display_name) return res.status(400).json({ error: 'Missing fields' });
  const db = getDB();
  const hash = await bcrypt.hash(password, 10);
  try {
    const r = await run(db, 'INSERT INTO users(email, password_hash, display_name) VALUES(?,?,?)', [email, hash, display_name]);
    setToken(res, { id: r.lastID, email, display_name });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Email already in use' });
  } finally { db.close(); }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = getDB();
  try {
    const rows = await all(db, 'SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    setToken(res, { id: user.id, email: user.email, display_name: user.display_name });
    res.json({ ok: true });
  } finally { db.close(); }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

export default router;