// public/app.js

const board = document.getElementById("board");

// Vẽ lưới 9x10 (mỗi ô 60px)
for (let y = 0; y < 10; y++) {
  for (let x = 0; x < 9; x++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.style.left = `${x * 60}px`;
    cell.style.top = `${y * 60}px`;
    board.appendChild(cell);
  }
}

// Hàm đặt quân
function placePiece(text, color, x, y) {
  const p = document.createElement("div");
  p.className = `piece ${color}`;
  p.textContent = text;
  p.style.left = `${x * 60 + 5}px`;
  p.style.top = `${y * 60 + 5}px`;
  board.appendChild(p);
}

// Bố trí quân đen (trên)
const blackPieces = ["車","馬","象","士","將","士","象","馬","車"];
blackPieces.forEach((t, i) => placePiece(t, "black", i, 0));
placePiece("砲", "black", 1, 2);
placePiece("砲", "black", 7, 2);
for (let i = 0; i < 9; i += 2) placePiece("卒", "black", i, 3);

// Bố trí quân đỏ (dưới)
const redPieces = ["車","馬","相","仕","帥","仕","相","馬","車"];
redPieces.forEach((t, i) => placePiece(t, "red", i, 9));
placePiece("炮", "red", 1, 7);
placePiece("炮", "red", 7, 7);
for (let i = 0; i < 9; i += 2) placePiece("兵", "red", i, 6);
