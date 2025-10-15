import { getDB, all, run } from './db.js';
import { isLegalMove, initialFen } from './validate.js';

function now() { return Date.now(); }

const matchesState = new Map(); // matchId -> { fen, turn, lastTs, redTime, blackTime, increment }

export function attachSockets(io) {
  io.on('connection', (socket) => {
    socket.on('join_match', async ({ matchId, userId }) => {
      const db = getDB();
      try {
        const rows = await all(db, 'SELECT * FROM matches WHERE id = ?', [matchId]);
        if (!rows.length) return socket.emit('error_msg', 'Match not found');
        const m = rows[0];
        const isPlayer = (userId === m.red_id || userId === m.black_id);
        socket.join(matchId);

        if (!matchesState.has(matchId)) {
          matchesState.set(matchId, {
            fen: initialFen(),
            turn: 'red',
            lastTs: now(),
            redTime: m.red_time_left ?? 600,
            blackTime: m.black_time_left ?? 600,
            increment: 0
          });
        }
        const st = matchesState.get(matchId);
        socket.emit('state', { ...st, match: m, youAre: isPlayer ? (userId===m.red_id?'red':'black') : 'spectator' });
      } finally { db.close(); }
    });

    socket.on('start_match', async ({ matchId }) => {
      const db = getDB();
      try {
        const rows = await all(db, 'SELECT * FROM matches WHERE id = ?', [matchId]);
        if (!rows.length) return;
        if (rows[0].status === 'pending') {
          await run(db, 'UPDATE matches SET status = "active", started_at = CURRENT_TIMESTAMP WHERE id = ?', [matchId]);
          const st = matchesState.get(matchId);
          st.lastTs = now();
          io.to(matchId).emit('started');
          tick(io, matchId);
        }
      } finally { db.close(); }
    });

    socket.on('move', async ({ matchId, userId, fromSq, toSq }) => {
      const db = getDB();
      try {
        const [m] = await all(db, 'SELECT * FROM matches WHERE id = ?', [matchId]);
        if (!m || m.status !== 'active') return;
        const st = matchesState.get(matchId);

        const color = (userId === m.red_id) ? 'red' : (userId === m.black_id ? 'black' : null);
        if (!color) return; // only players can move
        if (st.turn !== color) return;

        if (!isLegalMove(st.fen, fromSq, toSq)) return;

        const elapsed = Math.floor((now() - st.lastTs)/1000);
        if (color === 'red') st.redTime -= elapsed; else st.blackTime -= elapsed;
        st.lastTs = now();
        if (color === 'red') st.redTime += st.increment; else st.blackTime += st.increment;

        const ply = (await all(db, 'SELECT COUNT(*) as c FROM moves WHERE match_id = ?', [matchId]))[0].c + 1;
        await run(db, 'INSERT INTO moves(match_id, ply, from_sq, to_sq) VALUES(?,?,?,?)', [matchId, ply, fromSq, toSq]);

        st.turn = (st.turn === 'red') ? 'black' : 'red';

        io.to(matchId).emit('moved', { ply, fromSq, toSq, turn: st.turn, redTime: st.redTime, blackTime: st.blackTime });
      } finally { db.close(); }
    });

    socket.on('result', async ({ matchId, result }) => {
      const db = getDB();
      try {
        await run(db, 'UPDATE matches SET status = "finished", finished_at = CURRENT_TIMESTAMP, result = ? WHERE id = ?', [result, matchId]);
        io.to(matchId).emit('finished', { result });
      } finally { db.close(); }
    });

    socket.on('disconnect', ()=>{});
  });
}

function tick(io, matchId) {
  const st = matchesState.get(matchId);
  if (!st) return;
  const interval = setInterval(() => {
    const db = getDB();
    db.get('SELECT status, red_id, black_id FROM matches WHERE id = ?', [matchId], (err, m)=>{
      if (err || !m || m.status !== 'active') { clearInterval(interval); db.close(); return; }
      const elapsed = Math.floor((now() - st.lastTs)/1000);
      const color = st.turn;
      const remain = (color === 'red') ? st.redTime - elapsed : st.blackTime - elapsed;
      if (remain <= 0) {
        clearInterval(interval);
        const timeoutRes = (color === 'red') ? 'timeout_red' : 'timeout_black';
        run(db, 'UPDATE matches SET status = "finished", finished_at = CURRENT_TIMESTAMP, result = ? WHERE id = ?', [timeoutRes, matchId])
          .then(()=>{
            io.to(matchId).emit('finished', { result: timeoutRes });
          })
          .finally(()=>db.close());
      } else {
        io.to(matchId).emit('clock', { turn: st.turn, redTime: st.redTime - (color==='red'?elapsed:0), blackTime: st.blackTime - (color==='black'?elapsed:0) });
        db.close();
      }
    });
  }, 1000);
}