/* Xiangqi SVG board + full move & capture basics
   Tác giả: bạn ChatGPT
   Lưới 9x10, mỗi ô 60px. Tọa độ logic: x=0..8 (cột), y=0..9 (hàng)
*/

const W = 540, H = 600, CELL = 60;

// ======= tiện ích toạ độ & DOM =======
const xy2px = (x, y) => ({ cx: 30 + x * CELL, cy: 30 + y * CELL });
const inside = (x, y) => x>=0 && x<=8 && y>=0 && y<=9;
const same = (a,b)=> a.x===b.x && a.y===b.y;

const boardEl = document.getElementById('board');
const grid = document.getElementById('grid');
const piecesLayer = document.getElementById('pieces');
const hintsLayer = document.getElementById('hints');

// ======= vẽ lưới, sông, cung =======
function drawBoard() {
  const g = [];
  // nền trong khung (vàng đậm hơn)
  g.push(`<rect x="20" y="20" width="${W-40}" height="${H-40}" rx="2" ry="2" fill="#e6b061" stroke="#8a4e14" stroke-width="2"/>`);

  // kẻ lưới (9 cột x 10 hàng), để chừa sông (khoảng giữa 2 hàng y=4..5 không nối dọc)
  for (let r = 0; r <= 9; r++) {
    const y = 30 + r * CELL;
    g.push(`<line x1="30" y1="${y}" x2="${W-30}" y2="${y}" stroke="#3b2b17" stroke-width="2" />`);
  }
  // cột: ngắt ở sông
  for (let c = 0; c <= 8; c++) {
    const x = 30 + c * CELL;
    // trên
    g.push(`<line x1="${x}" y1="30" x2="${x}" y2="${30 + 4*CELL}" stroke="#3b2b17" stroke-width="2" />`);
    // dưới
    g.push(`<line x1="${x}" y1="${30 + 5*CELL}" x2="${x}" y2="${30 + 9*CELL}" stroke="#3b2b17" stroke-width="2" />`);
  }
  // cung (hai ô 3x3 với đường chéo X)
  // cung trên (đen)
  g.push(diagonals(3, 0));
  // cung dưới (đỏ)
  g.push(diagonals(3, 7));

  // sông
  g.push(`<rect x="30" y="${30 + 4*CELL}" width="${CELL*8}" height="${CELL}" fill="#e8a24d" />`);
  // chữ sông (đơn giản cho gọn)
  g.push(`<text x="${W/2-70}" y="${30 + 4.5*CELL}" font-size="28" fill="#3b2b17">楚河</text>`);
  g.push(`<text x="${W/2+25}" y="${30 + 4.5*CELL}" font-size="28" fill="#3b2b17">漢界</text>`);

  grid.innerHTML = g.join('');
}

function diagonals(leftCol, topRow){
  const x1 = 30 + leftCol*CELL, x2 = x1 + 2*CELL, xc = x1 + CELL;
  const y1 = 30 + topRow*CELL, y2 = y1 + 2*CELL, yc = y1 + CELL;
  return `
    <rect x="${x1}" y="${y1}" width="${CELL*2}" height="${CELL*2}" fill="none" stroke="#3b2b17" stroke-width="2"/>
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3b2b17" stroke-width="2"/>
    <line x1="${x2}" y1="${y1}" x2="${x1}" y2="${y2}" stroke="#3b2b17" stroke-width="2"/>
  `;
}

// ======= dữ liệu quân & sắp xếp =======
const RED = 'red', BLACK = 'black';

const C = {
  R: '車', N: '馬', B: '相', A: '仕', K: '帥', C: '炮', P: '兵',
  rR:'車', rN:'馬', rB:'象', rA:'士', rK:'將', rC:'砲', rP:'卒'
};
// khởi tạo theo chuẩn (đen trên – dùng ký tự tương ứng)
let pieces = [
  // đen (trên)
  {t:'rR', c:BLACK, x:0,y:0}, {t:'rN', c:BLACK, x:1,y:0}, {t:'rB', c:BLACK, x:2,y:0}, {t:'rA', c:BLACK, x:3,y:0}, {t:'rK', c:BLACK, x:4,y:0}, {t:'rA', c:BLACK, x:5,y:0}, {t:'rB', c:BLACK, x:6,y:0}, {t:'rN', c:BLACK, x:7,y:0}, {t:'rR', c:BLACK, x:8,y:0},
  {t:'rC', c:BLACK, x:1,y:2}, {t:'rC', c:BLACK, x:7,y:2},
  {t:'rP', c:BLACK, x:0,y:3}, {t:'rP', c:BLACK, x:2,y:3}, {t:'rP', c:BLACK, x:4,y:3}, {t:'rP', c:BLACK, x:6,y:3}, {t:'rP', c:BLACK, x:8,y:3},

  // đỏ (dưới)
  {t:'R', c:RED, x:0,y:9}, {t:'N', c:RED, x:1,y:9}, {t:'B', c:RED, x:2,y:9}, {t:'A', c:RED, x:3,y:9}, {t:'K', c:RED, x:4,y:9}, {t:'A', c:RED, x:5,y:9}, {t:'B', c:RED, x:6,y:9}, {t:'N', c:RED, x:7,y:9}, {t:'R', c:RED, x:8,y:9},
  {t:'C', c:RED, x:1,y:7}, {t:'C', c:RED, x:7,y:7},
  {t:'P', c:RED, x:0,y:6}, {t:'P', c:RED, x:2,y:6}, {t:'P', c:RED, x:4,y:6}, {t:'P', c:RED, x:6,y:6}, {t:'P', c:RED, x:8,y:6},
];

// tra cứu quân ở ô
const at = (x,y)=> pieces.find(p => p.x===x && p.y===y);

// ======= vẽ quân =======
function drawPieces(selected=null, moves=[]) {
  piecesLayer.innerHTML = pieces.map((p, idx) => {
    const {cx,cy} = xy2px(p.x,p.y);
    const txt = (p.c===RED)
      ? C[p.t] ?? C[p.t.toUpperCase()]
      : C[p.t] ?? C['r'+p.t];
    return `
      <g class="piece ${p.c} ${selected===idx?'selected':''}" data-i="${idx}">
        <circle cx="${cx}" cy="${cy}" r="24"></circle>
        <text x="${cx}" y="${cy+1}">${txt}</text>
      </g>
    `;
  }).join('');

  // hints
  hintsLayer.innerHTML = moves.map(m=>{
    const {cx,cy} = xy2px(m.x,m.y);
    const cap = at(m.x,m.y);
    return `<circle class="hint ${cap?'capture':''}" cx="${cx}" cy="${cy}" r="18" data-m="${m.x},${m.y}"></circle>`;
  }).join('');
}

// ======= sinh nước đi =======
// vùng cung
const inPalace = (c,x,y)=>{
  if(c===RED)   return (x>=3 && x<=5 && y>=7 && y<=9);
  if(c===BLACK) return (x>=3 && x<=5 && y>=0 && y<=2);
  return false;
};
// qua sông?
const crossed = (c,y)=> c===RED ? y<=4 : y>=5;

// đường đi thẳng cho Xe/Pháo (trả về các ô trống đến khi gặp chướng ngại)
function ray(x,y,dx,dy){
  const out=[];
  let nx=x+dx, ny=y+dy;
  while(inside(nx,ny) && !at(nx,ny)){
    out.push({x:nx,y:ny});
    nx+=dx; ny+=dy;
  }
  return { path: out, block: inside(nx,ny)?{x:nx,y:ny}:null };
}

function legalMoves(i){
  const p = pieces[i]; if(!p) return [];
  const M = [];
  const pushIf = (x,y)=> { if(!inside(x,y)) return;
    const occ=at(x,y);
    if(!occ) M.push({x,y});
    else if(occ.c!==p.c) M.push({x,y}); // ăn quân
  };

  switch(p.t){
    case 'K': case 'rK': { // Tướng/Soái – đi 4 hướng trong cung, không “đối mặt”
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
        const x=p.x+dx, y=p.y+dy;
        if(inPalace(p.c,x,y)){
          // kiểm tra đối mặt
          if(!facesKing(p, {x,y})) pushIf(x,y);
        }
      });
      break;
    }
    case 'A': case 'rA': { // Sĩ – chéo 1 trong cung
      [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dx,dy])=>{
        const x=p.x+dx, y=p.y+dy;
        if(inPalace(p.c,x,y)) pushIf(x,y);
      });
      break;
    }
    case 'B': case 'rB': { // Tượng/Elephant – chéo 2, không qua sông, chặn ở “tiểu nhãn”
      [[2,2],[2,-2],[-2,2],[-2,-2]].forEach(([dx,dy])=>{
        const x=p.x+dx, y=p.y+dy;
        const eye = {x:p.x+dx/2, y:p.y+dy/2};
        if( inside(x,y) && at(eye.x,eye.y)==null ){
          // không qua sông
          if(p.c===RED && y>=5) pushIf(x,y);
          if(p.c===BLACK && y<=4) pushIf(x,y);
        }
      });
      break;
    }
    case 'N': case 'rN': { // Mã – (1,2) kiểu L, chặn “chân mã”
      const steps = [
        {leg:[1,0], move:[2,1]}, {leg:[1,0], move:[2,-1]},
        {leg:[-1,0], move:[-2,1]}, {leg:[-1,0], move:[-2,-1]},
        {leg:[0,1], move:[1,2]}, {leg:[0,1], move:[-1,2]},
        {leg:[0,-1], move:[1,-2]}, {leg:[0,-1], move:[-1,-2]},
      ];
      steps.forEach(s=>{
        const lx=p.x+s.leg[0], ly=p.y+s.leg[1];
        if(at(lx,ly)) return; // bị chặn
        const x=p.x+s.move[0], y=p.y+s.move[1];
        pushIf(x,y);
      });
      break;
    }
    case 'R': case 'rR': { // Xe – thẳng 4 hướng
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
        const r = ray(p.x,p.y,dx,dy);
        r.path.forEach(q=>M.push(q));
        if(r.block){
          const occ = at(r.block.x, r.block.y);
          if(occ && occ.c!==p.c) M.push(r.block);
        }
      });
      break;
    }
    case 'C': case 'rC': { // Pháo – đi như Xe nhưng ăn phải “qua 1 màn”
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
        const r = ray(p.x,p.y,dx,dy);
        r.path.forEach(q=>M.push(q)); // đi thường
        if(r.block){
          // tìm đúng 1 màn rồi mới ăn
          let nx=r.block.x+dx, ny=r.block.y+dy; // sau màn
          while(inside(nx,ny) && !at(nx,ny)){ nx+=dx; ny+=dy; }
          if(inside(nx,ny)){
            const occ = at(nx,ny);
            if(occ && occ.c!==p.c) M.push({x:nx,y:ny});
          }
        }
      });
      break;
    }
    case 'P': case 'rP': { // Tốt/Binh
      const dir = (p.c===RED)? -1 : 1; // đỏ đi lên, đen đi xuống theo toạ độ y
      pushIf(p.x, p.y+dir);
      if(crossed(p.c, p.y)){
        pushIf(p.x-1, p.y);
        pushIf(p.x+1, p.y);
      }
      break;
    }
  }

  // loại nước làm tướng “đối mặt” (rule chung)
  return M.filter(m => !kingsFaceAfterMove(i,m));
}

// kiểm “đối mặt tướng” hiện tại nếu tướng đi đến (nx,ny)
function facesKing(king, toPos){
  // lấy tướng còn lại
  const other = pieces.find(p => (p.t==='K' || p.t==='rK') && p.c!==king.c);
  const kx = toPos.x, ky = toPos.y, ox = other.x, oy = other.y;
  if(kx!==ox) return false;
  // đếm vật cản giữa 2 tướng theo cột
  let minY = Math.min(ky, oy), maxY = Math.max(ky, oy), blocks=0;
  for(let y=minY+1; y<maxY; y++) if(at(kx,y)) blocks++;
  return blocks===0;
}
// kiểm sau khi di chuyển nước m (giảm clone tối đa)
function kingsFaceAfterMove(i, m){
  const saved = {x:pieces[i].x, y:pieces[i].y};
  const capIndex = pieces.findIndex(q => q.x===m.x && q.y===m.y);
  // tạm áp dụng
  pieces[i].x = m.x; pieces[i].y = m.y;
  let captured; if(capIndex>=0){ captured = pieces[capIndex]; pieces.splice(capIndex,1); }
  // check
  const kRed   = pieces.find(p=>p.t==='K' || (p.t==='K' && p.c===RED));
  const kBlack = pieces.find(p=>p.t==='rK' || (p.t==='rK' && p.c===BLACK));
  let face=false;
  if(kRed && kBlack && kRed.x===kBlack.x){
    let minY=Math.min(kRed.y,kBlack.y), maxY=Math.max(kRed.y,kBlack.y), blocks=0;
    for(let y=minY+1;y<maxY;y++) if(at(y===-1?999: kRed.x, y)) blocks++;
    face = (blocks===0);
  }
  // revert
  if(captured) pieces.splice(capIndex,0,captured);
  pieces[i].x = saved.x; pieces[i].y = saved.y;
  return face;
}

// ======= tương tác =======
let turn = RED; // đỏ đi trước
let selected = null;
let currentMoves = [];

function refresh(){
  drawPieces(selected, currentMoves);
}

function onBoardClick(evt){
  const target = evt.target;

  // click vào gợi ý
  if(target.classList.contains('hint')){
    const [mx,my] = target.getAttribute('data-m').split(',').map(Number);
    moveTo(selected, {x:mx, y:my});
    return;
  }

  // click vào quân
  const g = target.closest('.piece');
  if(!g){ // click nền -> bỏ chọn
    selected = null; currentMoves = []; refresh();
    return;
  }
  const i = +g.getAttribute('data-i');
  const p = pieces[i];
  if(p.c !== turn){ // không phải lượt
    return;
  }
  if(selected===i){ // bỏ chọn nếu chọn lại
    selected = null; currentMoves = []; refresh();
    return;
  }
  selected = i;
  currentMoves = legalMoves(i);
  refresh();
}

function moveTo(i, m){
  if(i==null) return;
  // ăn quân (nếu có)
  const capIdx = pieces.findIndex(q => q.x===m.x && q.y===m.y);
  if(capIdx>=0) pieces.splice(capIdx,1);

  pieces[i].x = m.x; pieces[i].y = m.y;

  // đổi lượt
  turn = (turn===RED? BLACK: RED);
  selected = null; currentMoves = [];
  refresh();
}

piecesLayer.addEventListener('click', onBoardClick);
hintsLayer.addEventListener('click', onBoardClick);
grid.addEventListener('click', onBoardClick);

// ======= khởi chạy =======
drawBoard();
refresh();
