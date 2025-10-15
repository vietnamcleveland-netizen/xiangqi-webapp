
/* ===== Board & rendering ===== */

const boardDiv = document.getElementById("board");
const CELL = 60;             // kích thước 1 ô
const OFFSET = 5;            // căn giữa quân trong ô

// Tọa độ -> pixel
const toPx = (x, y) => ({ left: `${x * CELL + OFFSET}px`, top: `${y * CELL + OFFSET}px` });

// Mã quân: Red in UPPER, Black in lower
// R/N/B/A/K/C/P  (rook/horse/elephant/advisor/king/cannon/pawn)
const START = [
  // y = 0..9 (0: hàng trên cùng – bên Đen)
  ['r','n','b','a','k','a','b','n','r'], // 0
  [null,null,null,null,null,null,null,null,null], // 1
  [null,'c',null,null,null,null,null,'c',null],   // 2
  ['p',null,'p',null,'p',null,'p',null,'p'],      // 3
  [null,null,null,null,null,null,null,null,null], // 4
  [null,null,null,null,null,null,null,null,null], // 5
  ['P',null,'P',null,'P',null,'P',null,'P'],      // 6
  [null,'C',null,null,null,null,null,'C',null],   // 7
  [null,null,null,null,null,null,null,null,null], // 8
  ['R','N','B','A','K','A','B','N','R'],          // 9
];

// Ký tự hiển thị
const CHAR = {
  R: '車', N:'馬', B:'相', A:'仕', K:'帥', C:'炮', P:'兵',
  r: '車', n:'馬', b:'象', a:'士', k:'將', c:'砲', p:'卒',
};

// Trạng thái ván
const state = {
  board: START.map(row => row.slice()),
  turn: 'red', // 'red' or 'black'
  selected: null, // {x,y}
  ui: new Map(),  // Map "x,y" -> element div (quân)
  highlights: [],
};

/* ===== UI dựng bàn và quân ===== */

function drawBoardGrid() {
  // vẽ 9x10 ô (chỉ làm nền hit-box cho click)
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const { left, top } = toPx(x, y);
      cell.style.left = left; cell.style.top = top;
      cell.style.width = `${CELL}px`; cell.style.height = `${CELL}px`;
      cell.dataset.x = x; cell.dataset.y = y;
      cell.addEventListener('click', onCellClick);
      boardDiv.appendChild(cell);
    }
  }
}

function placePieceEl(x, y, code) {
  const el = document.createElement('div');
  el.className = `piece ${isRed(code) ? 'red' : 'black'}`;
  const { left, top } = toPx(x, y);
  el.style.left = left; el.style.top = top;
  el.textContent = CHAR[code];
  el.dataset.x = x; el.dataset.y = y;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onPieceClick(x, y);
  });
  boardDiv.appendChild(el);
  state.ui.set(`${x},${y}`, el);
}

function rebuildPieces() {
  // clear old
  for (const [, el] of state.ui) el.remove();
  state.ui.clear();
  // build new
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const p = state.board[y][x];
      if (p) placePieceEl(x, y, p);
    }
  }
  updateTurnBanner();
}

/* ===== Helper & luật cơ bản ===== */

const inBounds = (x, y) => x >= 0 && x < 9 && y >= 0 && y < 10;
const isRed = (code) => code && code === code.toUpperCase();
const sideOf = (code) => isRed(code) ? 'red' : 'black';

function empty(x, y) { return inBounds(x, y) && !state.board[y][x]; }
function hasEnemy(x, y, meSide) {
  const p = inBounds(x, y) ? state.board[y][x] : null;
  return p && sideOf(p) !== meSide;
}
function hasFriend(x, y, meSide) {
  const p = inBounds(x, y) ? state.board[y][x] : null;
  return p && sideOf(p) === meSide;
}

function riverSide(y) { return y < 5 ? 'north' : 'south'; } // top/bottom side of river

// Cấm tướng đối mặt (flying generals) – sau khi đi xong
function generalsFacing(board) {
  let rx=-1, ry=-1, bx=-1, by=-1;
  for (let y=0;y<10;y++) for (let x=0;x<9;x++) {
    const p=board[y][x];
    if (p==='K') { rx=x; ry=y; }
    if (p==='k') { bx=x; by=y; }
  }
  if (rx === bx) {
    let blocked = false;
    const miny = Math.min(ry, by), maxy = Math.max(ry, by);
    for (let y = miny+1; y < maxy; y++) {
      if (board[y][rx]) { blocked = true; break; }
    }
    return !blocked;
  }
  return false;
}

/* ===== Sinh nước đi hợp lệ từng quân ===== */

function movesFor(x, y) {
  const code = state.board[y][x];
  if (!code) return [];
  const meSide = sideOf(code);
  const out = [];

  const push = (nx, ny) => { if (!inBounds(nx, ny)) return;
    if (!hasFriend(nx, ny, meSide)) out.push({ x:nx, y:ny }); };

  const addLine = (dx, dy) => {
    let nx = x + dx, ny = y + dy;
    while (inBounds(nx, ny) && !state.board[ny][nx]) {
      out.push({x:nx, y:ny});
      nx += dx; ny += dy;
    }
    if (inBounds(nx, ny) && hasEnemy(nx, ny, meSide)) out.push({x:nx, y:ny});
  };

  switch (code.toLowerCase()) {
    case 'r': // Xe
      addLine(1,0); addLine(-1,0); addLine(0,1); addLine(0,-1);
      break;

    case 'n': { // Mã – chặn chân
      const candidates = [
        { nx:x+2, ny:y+1, block:[x+1,y] },
        { nx:x+2, ny:y-1, block:[x+1,y] },
        { nx:x-2, ny:y+1, block:[x-1,y] },
        { nx:x-2, ny:y-1, block:[x-1,y] },
        { nx:x+1, ny:y+2, block:[x,y+1] },
        { nx:x-1, ny:y+2, block:[x,y+1] },
        { nx:x+1, ny:y-2, block:[x,y-1] },
        { nx:x-1, ny:y-2, block:[x,y-1] },
      ];
      for (const c of candidates) {
        const [bx,by] = c.block;
        if (!inBounds(c.nx,c.ny)) continue;
        if (state.board[by][bx]) continue; // chân bị chặn
        if (!hasFriend(c.nx,c.ny,meSide)) out.push({x:c.nx, y:c.ny});
      }
      break;
    }

    case 'b': { // Tượng/Elephant – đi chéo 2, không qua sông, chặn mắt
      const cand = [
        { nx:x+2, ny:y+2, eye:[x+1,y+1] },
        { nx:x-2, ny:y+2, eye:[x-1,y+1] },
        { nx:x+2, ny:y-2, eye:[x+1,y-1] },
        { nx:x-2, ny:y-2, eye:[x-1,y-1] },
      ];
      for (const c of cand) {
        if (!inBounds(c.nx,c.ny)) continue;
        const [ex,ey] = c.eye;
        if (state.board[ey][ex]) continue; // mắt bị chặn
        // không qua sông
        if (isRed(code) && c.ny < 5) continue;
        if (!isRed(code) && c.ny > 4) continue;
        if (!hasFriend(c.nx,c.ny,meSide)) out.push({x:c.nx,y:c.ny});
      }
      break;
    }

    case 'a': { // Sĩ – chéo 1 trong cung
      const cand = [
        {nx:x+1, ny:y+1}, {nx:x-1, ny:y+1},
        {nx:x+1, ny:y-1}, {nx:x-1, ny:y-1},
      ];
      for (const c of cand) {
        if (!inBounds(c.nx,c.ny)) continue;
        if (!inPalace(c.nx, c.ny, meSide, true)) continue;
        if (!hasFriend(c.nx,c.ny,meSide)) out.push({x:c.nx,y:c.ny});
      }
      break;
    }

    case 'k': { // Tướng – đi 1 ô ortho trong cung + cấm đối mặt
      const cand = [
        {nx:x+1, ny:y}, {nx:x-1, ny:y}, {nx:x, ny:y+1}, {nx:x, ny:y-1},
      ];
      for (const c of cand) {
        if (!inBounds(c.nx,c.ny)) continue;
        if (!inPalace(c.nx,c.ny, meSide, false)) continue;
        if (hasFriend(c.nx,c.ny,meSide)) continue;
        // thử move để kiểm “đối mặt”
        const nb = cloneBoard(state.board);
        nb[c.ny][c.nx] = nb[y][x]; nb[y][x] = null;
        if (!generalsFacing(nb)) out.push({x:c.nx,y:c.ny});
      }
      break;
    }

    case 'c': { // Pháo – đi như Xe, ăn phải có 1 quân chắn giữa
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      for (const [dx,dy] of dirs) {
        let nx = x + dx, ny = y + dy, screen = false;
        while (inBounds(nx,ny)) {
          if (!screen) {
            if (!state.board[ny][nx]) out.push({x:nx,y:ny});
            else { screen = true; nx += dx; ny += dy; break; }
          } else {
            if (state.board[ny][nx]) {
              if (hasEnemy(nx,ny,meSide)) out.push({x:nx,y:ny});
              break;
            }
          }
          nx += dx; ny += dy;
        }
      }
      break;
    }

    case 'p': { // Tốt/Binh – đi 1 ô: tiến; qua sông thêm trái/phải; không lùi
      const dir = isRed(code) ? -1 : 1; // red đi lên (y-1), black đi xuống (y+1)
      const forward = { nx:x, ny:y+dir };
      if (inBounds(forward.nx, forward.ny) && !hasFriend(forward.nx, forward.ny, meSide))
        out.push(forward);
      // qua sông
      const crossed = isRed(code) ? (y <= 4) : (y >= 5);
      if (crossed) {
        for (const nx of [x-1, x+1]) {
          if (inBounds(nx, y) && !hasFriend(nx, y, meSide)) out.push({x:nx,y});
        }
      }
      break;
    }
  }

  return out;
}

function inPalace(x, y, side, diagonalOnly) {
  if (side === 'red')   return (x>=3 && x<=5 && y>=7 && y<=9);
  if (side === 'black') return (x>=3 && x<=5 && y>=0 && y<=2);
  return false;
}

function cloneBoard(b) { return b.map(r => r.slice()); }

/* ===== Tương tác click ===== */

function clearHighlights() {
  state.highlights.forEach(el => el.remove());
  state.highlights = [];
}

function showHighlights(moves) {
  clearHighlights();
  for (const m of moves) {
    const hl = document.createElement('div');
    hl.className = 'hl';
    const { left, top } = toPx(m.x, m.y);
    hl.style.left = left; hl.style.top = top;
    hl.style.width = `${CELL}px`; hl.style.height = `${CELL}px`;
    hl.addEventListener('click', () => doMove(state.selected, m));
    boardDiv.appendChild(hl);
    state.highlights.push(hl);
  }
}

function onPieceClick(x, y) {
  const p = state.board[y][x];
  if (!p) return;
  const me = sideOf(p);
  if (me !== state.turn) return; // chưa tới lượt

  state.selected = { x, y };
  const mv = movesFor(x, y);
  showHighlights(mv);
}

function onCellClick(e) {
  if (!state.selected) return;
  const x = +e.currentTarget.dataset.x;
  const y = +e.currentTarget.dataset.y;
  const allowed = movesFor(state.selected.x, state.selected.y)
    .some(m => m.x === x && m.y === y);
  if (allowed) doMove(state.selected, {x,y});
}

function doMove(from, to) {
  clearHighlights();
  const b = state.board;
  const moving = b[from.y][from.x];

  // tạo bản sao để check “tướng đối mặt” (nếu là nước đi tướng đã kiểm ở movesFor rồi)
  const nb = cloneBoard(b);
  nb[to.y][to.x] = moving; nb[from.y][from.x] = null;
  if (generalsFacing(nb)) return; // không cho đối mặt sau khi đi

  // cập nhật thật
  const captured = b[to.y][to.x];
  b[to.y][to.x] = moving; b[from.y][from.x] = null;

  // cập nhật UI
  const el = state.ui.get(`${from.x},${from.y}`);
  state.ui.delete(`${from.x},${from.y}`);
  if (captured) {
    const cel = state.ui.get(`${to.x},${to.y}`);
    if (cel) cel.remove();
    state.ui.delete(`${to.x},${to.y}`);
  }
  const { left, top } = toPx(to.x, to.y);
  el.style.left = left; el.style.top = top;
  el.dataset.x = to.x; el.dataset.y = to.y;
  state.ui.set(`${to.x},${to.y}`, el);

  state.selected = null;
  // đổi lượt
  state.turn = (state.turn === 'red') ? 'black' : 'red';
  updateTurnBanner();
}

function updateTurnBanner() {
  const banner = document.getElementById('turn');
  if (!banner) return;
  banner.textContent = state.turn === 'red' ? 'Red to move' : 'Black to move';
}

/* ===== Khởi tạo ===== */

drawBoardGrid();
rebuildPieces();
updateTurnBanner();
