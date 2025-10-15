import { all, run, getDB } from './db.js';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

export async function generateRoundRobin(tournamentId) {
  const db = getDB();
  try {
    const players = await all(db, 'SELECT user_id FROM tournament_players WHERE tournament_id = ?', [tournamentId]);
    const ids = players.map(p=>p.user_id);
    if (ids.length < 2) throw new Error('Need at least 2 players');

    ids.sort(()=>Math.random()-0.5);
    const bye = (ids.length % 2 !== 0) ? null : undefined;
    const list = [...ids];
    if (bye === null) list.push(-1);

    const n = list.length;
    const rounds = n - 1;
    const pairings = [];

    for (let round = 0; round < rounds; round++) {
      for (let i = 0; i < n/2; i++) {
        const a = list[i];
        const b = list[n - 1 - i];
        if (a !== -1 && b !== -1) {
          const redFirst = (round + i) % 2 === 0;
          const matchId = nanoid();
          const red_id = redFirst ? a : b;
          const black_id = redFirst ? b : a;
          await run(db, `INSERT INTO matches(id, tournament_id, red_id, black_id, status, red_time_left, black_time_left)
                         SELECT ?, ?, ?, ?, 'pending', t.time_initial_seconds, t.time_initial_seconds FROM tournaments t WHERE t.id = ?`,
            [matchId, tournamentId, red_id, black_id, tournamentId]);
          pairings.push(matchId);
        }
      }
      const fixed = list[0];
      const rest = list.slice(1);
      rest.unshift(rest.pop());
      list.splice(0, list.length, fixed, ...rest);
    }
    return pairings;
  } finally { db.close(); }
}