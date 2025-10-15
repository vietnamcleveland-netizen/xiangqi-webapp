// Xiangqi: select–move–capture (no full rules yet)
// Works with a 9x10 board drawn inside #board (position:relative; 540x600)

const board = document.getElementById("board");
const turnDisplay = document.getElementById("turn");

const CELL = 60;          // mỗi ô 60px
const PAD  = 5;           // viền trong cho quân
let currentTurn = "red";
let selected = null;

const pieces = []; // mảng các <div class="piece">

function setTurnText() {
  turnDisplay.textContent = currentTurn === "red" ? "Red to move" : "Black to move";
}
setTurnText();

// ===== Khởi tạo quân =====
function createPiece(text, color, x, y) {
  const p = document.createElement("div");
  p.className = `piece ${color}`;
  p.textContent = text;
  positionPiece(p, x, y);

  p.dataset.x = String(x);
  p.dataset.y = String(y);
  p.dataset.color = color;
  p.dataset.name = text;

  // chọn quân – cực kỳ quan trọng: chặn bubbling
  p.addEventListener("click", (e) => {
    e.stopPropagation();
    // chỉ được chọn đúng lượt
    if (p.dataset.color !== currentTurn) return;

    if (selected === p) {
      hideHL();
      selected = null;
      return;
    }
    selected = p;
    showHLAt(x, y);
  });

  board.appendChild(p);
  pieces.push(p);
}

function positionPiece(p, x, y) {
  p.style.left = (x * CELL + PAD) + "px";
  p.style.top  = (y * CELL + PAD) + "px";
}

// Dàn quân tiêu chuẩn
(function initPieces() {
  const r0 = ["車","馬","相","仕","帥","仕","相","馬","車"];
  const b0 = ["車","馬","象","士","將","士","象","馬","車"];

  for (let i = 0; i < 9; i++) {
    createPiece(r0[i], "red",   i, 9);
    createPiece(b0[i], "black", i, 0);
  }
  // red
  createPiece("炮","red",1,7); createPiece("炮","red",7,7);
  for (let i = 0; i < 9; i += 2) createPiece("兵","red",i,6);
  // black
  createPiece("砲","black",1,2); createPiece("砲","black",7,2);
  for (let i = 0; i < 9; i += 2) createPiece("卒","black",i,3);
})();

// ===== Highlight khung chọn =====
const hl = document.createElement("div");
hl.className = "hl";
hl.style.display = "none";
board.appendChild(hl);

function showHLAt(x, y) {
  hl.style.display = "block";
  hl.style.left = (x * CELL + PAD) + "px";
  hl.style.top  = (y * CELL + PAD) + "px";
}
function hideHL() { hl.style.display = "none"; }

// =====-helpers=====
function pieceAt(x, y) {
  return pieces.find(pp => +pp.dataset.x === x && +pp.dataset.y === y);
}
function inside(x, y) { return x >= 0 && x <= 8 && y >= 0 && y <= 9; }

// ===== Click trên bàn (đi quân) =====
board.addEventListener("click", (e) => {
  if (!selected) return;

  // chuyển tọa độ pixel -> ô
  const rect = board.getBoundingClientRect();
  const relX = e.clientX - rect.left - PAD; // trừ PAD vì quân cũng lệch PAD
  const relY = e.clientY - rect.top  - PAD;

  const x = Math.round(relX / CELL);
  const y = Math.round(relY / CELL);
  if (!inside(x, y)) return;

  const sx = +selected.dataset.x;
  const sy = +selected.dataset.y;

  // chặn đứng nếu click lại chính ô đang đứng
  if (x === sx && y === sy) return;

  // Nếu có quân ở đích
  const target = pieceAt(x, y);
  if (target) {
    // không được ăn quân cùng màu
    if (target.dataset.color === selected.dataset.color) { return; }
    // ăn quân đối phương
    board.removeChild(target);
    const idx = pieces.indexOf(target);
    if (idx >= 0) pieces.splice(idx, 1);
  }

  // di chuyển
  selected.dataset.x = String(x);
  selected.dataset.y = String(y);
  positionPiece(selected, x, y);

  // bỏ highlight & đổi lượt
  hideHL();
  selected = null;
  currentTurn = (currentTurn === "red") ? "black" : "red";
  setTurnText();
});
