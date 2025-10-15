// Minimal placeholder for server-side validation.
// In production, replace with a real xiangqi engine.
export function isLegalMove(positionFen, fromSq, toSq) {
  const files = 'abcdefghi';
  const ranks = '0123456789';
  const ok = (sq) => sq.length === 2 && files.includes(sq[0]) && ranks.includes(sq[1]);
  return ok(fromSq) && ok(toSq) && fromSq !== toSq;
}

export function initialFen() {
  return 'init';
}