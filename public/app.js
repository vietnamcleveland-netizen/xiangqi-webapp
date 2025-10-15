// public/app.js

const board = document.getElementById("board");

// Kích thước ô
const COLS = 9, ROWS = 10, CELL = 60;

// Lưới 9x10
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.style.left = `${x * CELL}px`;
    cell.style.top  = `${y * CELL}px`;
    // cho phép click ô để di chuyển quân đã chọn
    cell.addEventListener("click", () => tryMoveTo(x, y));
    board.appendChild(cell);
  }
}

// Trạng thái bàn cờ (lưu phần tử quân ở mỗi ô hoặc null)
const state = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
let selected = null; // {el, x, y, color, name}

// Hàm đặt quân
function placePiece(text, color, x, y) {
  const p = document.createElement("div");
  p.className = `piece ${color}`;
  p.textContent = text;
  p.style.left = `${x * CELL + 5}px`;
  p.style.top  = `${y * CELL + 5}px`;

  // metadata
  p.dataset.x = x;
  p.dataset.y = y;
  p.dataset.color = color;
  p.dataset.name = text;

  // click để chọn quân
  p.addEventListener("click", (e) => {
    e.stopPropagation();
    selectPiece(p);
  });

  board.appendChild(p);
  state[y][x] = p;
}

function selectPiece(p) {
  // bỏ highlight quân cũ
  if (selected?.el) selected.el.style.boxShadow = "";
  const x = Number(p.dataset.x), y = Number(p.dataset.y);
  selected = { el: p, x, y, color: p.dataset.color, name: p.dataset.name };
  // highlight
  p.style.boxShadow = "0 0 0 3px rgba(0,128,255,.6)";
}

// Thử di chuyển quân đã chọn tới (tx,ty)
// (chưa kiểm tra luật, chỉ tránh đè quân cùng màu)
function tryMoveTo(tx, ty) {
  if (!selected) return;

  // Nếu có quân cùng màu ở đích thì không cho đi
  const target = state[ty][tx];
  if (target && target.dataset.color === selected.color) return;

  // Cập nhật state: xoá vị trí cũ
  state[selected.y][selected.x] = null;

  // Nếu có quân khác màu ở đích: "ăn" = remove
  if (target) {
    target.remove();
  }

  // Di chuyển phần tử
  selected.el.style.left = `${tx * CELL + 5}px`;
  selected.el.style.top  = `${ty * CELL + 5}px`;
  selected.el.dataset.x = tx;
  selected.el.dataset.y = ty;

  // Ghi vị trí mới
  state[ty][tx] = selected.el;

  // Bỏ chọn
  selected.el.style.boxShadow = "";
  selected = null;
}

/* --- Sắp xếp quân ban đầu --- */
// Hàng trên (đen)
const blackPieces = ["車","馬","象","士","將","士","象","馬","車"];
blackPieces.forEach((t,i)=>placePiece(t,"black",i,0));
placePiece("炮","black",1,2);
placePiece("炮","black",7,2);
for (let i=0;i<9;i+=2) placePiece("卒","black",i,3);

// Hàng dưới (đỏ)
const redPieces = ["車","馬","相","仕","帥","仕","相","馬","車"];
redPieces.forEach((t,i)=>placePiece(t,"red",i,9));
placePiece("炮","red",1,7);
placePiece("炮","red",7,7);
for (let i=0;i<9;i+=2) placePiece("兵","red",i,6);
