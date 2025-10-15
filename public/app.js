 board = document.getElementById("board");
const turnDisplay = document.getElementById("turn");

let currentTurn = "red";
let selected = null;
const gridSize = 60;

// 9 x 10 board
const pieces = [];
const setup = {
  red: [
    ["車","馬","相","仕","帥","仕","相","馬","車", 9, 0],
    ["炮",1,7], ["炮",7,7],
    ["兵",0,6],["兵",2,6],["兵",4,6],["兵",6,6],["兵",8,6]
  ],
  black: [
    ["車","馬","象","士","將","士","象","馬","車", 0, 0],
    ["砲",1,2], ["砲",7,2],
    ["卒",0,3],["卒",2,3],["卒",4,3],["卒",6,3],["卒",8,3]
  ]
};

// create div pieces
function createPiece(text, color, x, y) {
  const p = document.createElement("div");
  p.className = `piece ${color}`;
  p.textContent = text;
  p.style.left = x * gridSize + 5 + "px";
  p.style.top = y * gridSize + 5 + "px";
  p.dataset.x = x;
  p.dataset.y = y;
  p.dataset.color = color;
  p.dataset.name = text;
  p.addEventListener("click", () => selectPiece(p));
  board.appendChild(p);
  pieces.push(p);
}

function initPieces() {
  for (let i=0; i<9; i++) {
    createPiece(setup.red[0][i], "red", i, 9);
    createPiece(setup.black[0][i], "black", i, 0);
  }
  for (let i=1;i<setup.red.length;i++){
    createPiece(setup.red[i][0], "red", setup.red[i][1], setup.red[i][2]);
  }
  for (let i=1;i<setup.black.length;i++){
    createPiece(setup.black[i][0], "black", setup.black[i][1], setup.black[i][2]);
  }
}
initPieces();

// Highlight possible moves (basic)
const hl = document.createElement("div");
hl.className = "hl";
hl.style.display = "none";
board.appendChild(hl);

function selectPiece(p) {
  if (p.dataset.color !== currentTurn) return;
  if (selected === p) {
    selected = null;
    hl.style.display = "none";
    return;
  }
  selected = p;
  hl.style.display = "block";
  hl.style.left = p.style.left;
  hl.style.top = p.style.top;
  hl.style.width = "50px";
  hl.style.height = "50px";
}

// click to move
board.addEventListener("click", e => {
  if (!selected) return;

  // clicked position
  const rect = board.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left - 30) / gridSize);
  const y = Math.round((e.clientY - rect.top - 30) / gridSize);
  if (x < 0 || x > 8 || y < 0 || y > 9) return;

  // check if another piece there
  const target = pieces.find(pp => parseInt(pp.dataset.x) === x && parseInt(pp.dataset.y) === y);
  if (target) {
    if (target.dataset.color === selected.dataset.color) return;
    // capture
    board.removeChild(target);
    const idx = pieces.indexOf(target);
    if (idx >= 0) pieces.splice(idx,1);
  }

  // move piece
  selected.dataset.x = x;
  selected.dataset.y = y;
  selected.style.left = x * gridSize + 5 + "px";
  selected.style.top = y * gridSize + 5 + "px";
  hl.style.display = "none";
  selected = null;

  // switch turn
  currentTurn = currentTurn === "red" ? "black" : "red";
  turnDisplay.textContent = currentTurn === "red" ? "Red to move" : "Black to move";
});
