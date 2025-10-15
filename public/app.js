// ===== Cấu hình cơ bản =====
const CELL = 60;                      // mỗi ô 60px
const WIDTH = CELL * 9, HEIGHT = CELL * 10;
const svg = document.getElementById("svg");
const turnEl = document.getElementById("turn");

// helper tạo phần tử SVG
function S(tag, attrs={}){ const e=document.createElementNS("http://www.w3.org/2000/svg", tag);
  for(const k in attrs) e.setAttribute(k, attrs[k]); return e; }

// vẽ BÀN CỜ chuẩn (lưới, sông, chéo cung)
function drawBoard(){
  // nền bàn (màu vàng)
  svg.append(S("rect",{x:0,y:0,width:WIDTH,height:HEIGHT,fill:"#f2bd6a"}));

  // sông (khoảng trống giữa 2 hàng 4/5)
  svg.append(S("rect",{x:0,y:CELL*4,width:WIDTH,height:CELL,fill:"#f2bd6a"})); // cùng màu nền

  // viền khung bàn trong (đen)
  svg.append(S("rect",{x:0.5,y:0.5,width:WIDTH-1,height:HEIGHT-1,fill:"none",stroke:"#000","stroke-width":2}));

  // kẻ dọc (9 cột)
  for(let c=0;c<9;c++){
    const x= c*CELL+0.5;
    // đoạn trên
    svg.append(S("line",{x1:x,y1:0,x2:x,y2:CELL*4,stroke:"#000"}));
    // đoạn dưới
    svg.append(S("line",{x1:x,y1:CELL*5,x2:x,y2:HEIGHT,stroke:"#000"}));
  }
  // kẻ ngang (10 hàng)
  for(let r=0;r<10;r++){
    const y=r*CELL+0.5;
    svg.append(S("line",{x1:0,y1:y,x2:WIDTH,y2:y,stroke:"#000"}));
  }

  // chữ "楚河  漢界"
  const river = S("text",{x:WIDTH/2,y:CELL*4.5, "text-anchor":"middle",
    "dominant-baseline":"central", "font-size":"32", "font-family":"Noto Serif SC, serif",
    fill:"#6c3b00", opacity:.75});
  river.textContent="楚 河    漢 界";
  svg.append(river);

  // cung Tướng (trên & dưới) với 2 đường chéo
  function palace(y0){
    // khung 3x3
    svg.append(S("rect",{x:3*CELL+0.5,y:y0+0.5,width:CELL*3-1,height:CELL*3-1,fill:"none",stroke:"#000"}));
    // chéo
    svg.append(S("line",{x1:3*CELL+0.5,y1:y0+0.5,x2:6*CELL-0.5,y2:y0+3*CELL-0.5,stroke:"#000"}));
    svg.append(S("line",{x1:6*CELL-0.5,y1:y0+0.5,x2:3*CELL+0.5,y2:y0+3*CELL-0.5,stroke:"#000"}));
  }
  palace(0);
  palace(CELL*7);
}

// ===== Trạng thái bàn cờ =====
const RED="red", BLACK="black";

// bố trí chuẩn (x:0..8, y:0..9)
let pieces = [
  // ĐEN (trên)
  P("r",BLACK,0,0), P("n",BLACK,1,0), P("b",BLACK,2,0), P("a",BLACK,3,0),
  P("k",BLACK,4,0), P("a",BLACK,5,0), P("b",BLACK,6,0), P("n",BLACK,7,0), P("r",BLACK,8,0),
  P("c",BLACK,1,2), P("c",BLACK,7,2),
  ...[0,2,4,6,8].map(x=>P("p",BLACK,x,3)),

  // ĐỎ (dưới)
  P("r",RED,0,9), P("n",RED,1,9), P("b",RED,2,9), P("a",RED,3,9),
  P("k",RED,4,9), P("a",RED,5,9), P("b",RED,6,9), P("n",RED,7,9), P("r",RED,8,9),
  P("c",RED,1,7), P("c",RED,7,7),
  ...[0,2,4,6,8].map(x=>P("p",RED,x,6)),
];

function P(type,color,x,y){ return {id:crypto.randomUUID(), type,color,x,y,dead:false}; }

// ký hiệu hiển thị
const TEXT = {
  [RED]:  { r:"車", n:"馬", b:"相", a:"仕", k:"帥", c:"炮", p:"兵" },
  [BLACK]:{ r:"車", n:"馬", b:"象", a:"士", k:"將", c:"砲", p:"卒" },
};

// ===== Vẽ quân lên SVG =====
let gPieces = S("g"); svg.append(gPieces);
let gUI = S("g"); svg.append(gUI); // layer highlight

function drawPieces(){
  gPieces.innerHTML="";
  for(const pc of pieces.filter(p=>!p.dead)){
    const group = S("g", {class:`piece ${pc.color}`, "data-id":pc.id,
      transform:`translate(${pc.x*CELL},${pc.y*CELL})`});
    const cx=CELL/2, cy=CELL/2, r=23;

    group.append(S("circle",{class:"stone", cx,cy,r}));
    const t = S("text",{class:"label", x:cx, y:cy});
    t.textContent = TEXT[pc.color][pc.type];
    group.append(t);

    group.addEventListener("click", onPieceClick);
    gPieces.append(group);
  }
}

// ===== Tương tác & luật đi =====
let turn = RED;                 // Đỏ đi trước
let selected = null;            // quân đang chọn
let hlCells = [];               // highlight

function setTurnUI(){
  turnEl.innerHTML = `Lượt: <b>${turn===RED?"Đỏ":"Đen"}</b>`;
}

function clearHL(){
  hlCells.forEach(e=>e.remove());
  hlCells.length = 0;
}

function addHLCell(x,y, cls="hl-cell"){
  const rect = S("rect",{x:x*CELL+1,y:y*CELL+1,width:CELL-2,height:CELL-2, class:cls});
  gUI.append(rect); hlCells.push(rect);
}

function onPieceClick(e){
  const id = e.currentTarget.getAttribute("data-id");
  const pc = pieces.find(p=>p.id===id);
  if(!pc || pc.color!==turn) return;

  // chọn mới
  clearHL(); selected = pc;
  addHLCell(pc.x, pc.y, "hl-cell");

  // gợi ý các ô đi hợp lệ
  const moves = legalMoves(pc, pieces);
  for(const m of moves){
    addHLCell(m.x, m.y, "hl-target");
  }
}

svg.addEventListener("click", (e)=>{
  if(!selected) return;
  // tìm tọa độ ô click (nếu click trúng khoảng trống)
  const pt = svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY;
  const m = svg.getScreenCTM().inverse(); const p = pt.matrixTransform(m);
  const x = Math.floor(p.x / CELL), y = Math.floor(p.y / CELL);
  if(x<0||x>8||y<0||y>9) return;

  const target = pieceAt(x,y);
  const cand = legalMoves(selected, pieces).find(m=>m.x===x&&m.y===y);
  if(!cand) return;

  // ăn quân (nếu có)
  if(target && target.color!==selected.color){
    target.dead = true;
  }
  // di chuyển
  selected.x = x; selected.y = y;

  // Không cho “tướng đối mặt” – nếu vi phạm, hoàn tác
  if(flyingGeneralFacing()){
    // hoàn tác
    if(target) target.dead=false;
    selected.x = cand.from.x; selected.y = cand.from.y;
    return;
  }

  // xong nước, đổi lượt
  selected = null; clearHL(); drawPieces();
  turn = (turn===RED?BLACK:RED); setTurnUI();
});

function pieceAt(x,y){ return pieces.find(p=>!p.dead && p.x===x && p.y===y); }
function betweenClear(x1,y1,x2,y2){
  if(x1===x2){
    const [a,b]= y1<y2?[y1,y2]:[y2,y1];
    for(let y=a+1;y<b;y++) if(pieceAt(x1,y)) return false;
    return true;
  }else if(y1===y2){
    const [a,b]= x1<x2?[x1,x2]:[x2,x1];
    for(let x=a+1;x<b;x++) if(pieceAt(x,y1)) return false;
    return true;
  }
  return false;
}

// kiểm tra “tướng đối mặt” (không quân nào giữa 2 tướng trên cùng cột)
function flyingGeneralFacing(){
  const kr = pieces.find(p=>!p.dead && p.type==="k" && p.color===RED);
  const kb = pieces.find(p=>!p.dead && p.type==="k" && p.color===BLACK);
  if(kr.x!==kb.x) return false;
  const x = kr.x, [ya,yb]= kr.y<kb.y?[kr.y,kb.y]:[kb.y,kr.y];
  for(let y=ya+1;y<yb;y++) if(pieceAt(x,y)) return false;
  return true;
}

// ===== Luật đi cho từng loại quân =====
function legalMoves(pc, all){
  const moves = [];
  const add = (x,y)=>{
    if(x<0||x>8||y<0||y>9) return;
    const t = pieceAt(x,y);
    if(!t || t.color!==pc.color){
      moves.push({x,y,from:{x:pc.x,y:pc.y}});
    }
  };
  const same = (x,y)=> x===pc.x && y===pc.y;

  const riverSide = (color)=> color===RED ? "south":"north";
  const inPalace = (x,y,color)=>{
    const xr = (x>=3 && x<=5);
    const yr = color===RED ? (y>=7 && y<=9) : (y>=0 && y<=2);
    return xr && yr;
  };
  const beyondRiver = (y,color)=> color===RED ? (y<=4) : (y>=5);

  switch(pc.type){
    case "r": // xe
      for(let x=pc.x+1; x<9; x++){ const t=pieceAt(x,pc.y); add(x,pc.y); if(t) break; }
      for(let x=pc.x-1; x>=0; x--){ const t=pieceAt(x,pc.y); add(x,pc.y); if(t) break; }
      for(let y=pc.y+1; y<10; y++){ const t=pieceAt(pc.x,y); add(pc.x,y); if(t) break; }
      for(let y=pc.y-1; y>=0; y--){ const t=pieceAt(pc.x,y); add(pc.x,y); if(t) break; }
      break;

    case "c": // pháo
      // đi thường như xe (đường trống)
      const tryLine = (dx,dy)=>{
        let x=pc.x+dx, y=pc.y+dy, jumped=false;
        while(x>=0&&x<9&&y>=0&&y<10){
          const t=pieceAt(x,y);
          if(!jumped){
            if(!t){ add(x,y); }
            else jumped=true;
          }else{
            if(t && t.color!==pc.color){ add(x,y); }
            break;
          }
          x+=dx; y+=dy;
        }
      };
      tryLine(1,0); tryLine(-1,0); tryLine(0,1); tryLine(0,-1);
      break;

    case "n": // mã (chân ngựa)
      const KN = [
        {dx:1,dy:2, block:{x:pc.x, y:pc.y+1}},
        {dx:-1,dy:2, block:{x:pc.x, y:pc.y+1}},
        {dx:1,dy:-2, block:{x:pc.x, y:pc.y-1}},
        {dx:-1,dy:-2, block:{x:pc.x, y:pc.y-1}},
        {dx:2,dy:1, block:{x:pc.x+1, y:pc.y}},
        {dx:-2,dy:1, block:{x:pc.x-1, y:pc.y}},
        {dx:2,dy:-1, block:{x:pc.x+1, y:pc.y}},
        {dx:-2,dy:-1, block:{x:pc.x-1, y:pc.y}},
      ];
      for(const k of KN){
        if(pieceAt(k.block.x,k.block.y)) continue;
        add(pc.x+k.dx, pc.y+k.dy);
      }
      break;

    case "b": // tượng/elephant – đi chéo 2, chặn "mắt", không qua sông
      const EB = [[2,2],[2,-2],[-2,2],[-2,-2]];
      for(const [dx,dy] of EB){
        const mx=pc.x+dx/2, my=pc.y+dy/2;
        const x=pc.x+dx, y=pc.y+dy;
        if(pieceAt(mx,my)) continue;
        // cấm qua sông
        if(pc.color===RED && y<=4) continue;
        if(pc.color===BLACK && y>=5) continue;
        add(x,y);
      }
      break;

    case "a": // sĩ – chéo 1 trong cung
      for(const [dx,dy] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
        const x=pc.x+dx, y=pc.y+dy;
        if(inPalace(x,y,pc.color)) add(x,y);
      }
      break;

    case "k": // tướng – đi 1 ô thẳng trong cung, không đối mặt
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const x=pc.x+dx, y=pc.y+dy;
        if(inPalace(x,y,pc.color)) add(x,y);
      }
      // “tướng bay” ăn thẳng tướng đối phương nếu không có quân cản
      const enemyK = pieces.find(p=>!p.dead && p.type==="k" && p.color!==pc.color);
      if(enemyK && enemyK.x===pc.x && betweenClear(pc.x,pc.y,enemyK.x,enemyK.y)){
        add(enemyK.x, enemyK.y);
      }
      break;

    case "p": // tốt/binh – đi 1 bước: trước khi qua sông chỉ tiến, sau đó tiến hoặc ngang
      const dir = pc.color===RED ? -1 : 1; // RED đi lên (y giảm), BLACK đi xuống (y tăng)
      add(pc.x, pc.y+dir);
      if(beyondRiver(pc.y, pc.color)){ add(pc.x-1, pc.y); add(pc.x+1, pc.y); }
      break;
  }
  // loại các nước khiến tướng 2 bên đối mặt sau khi đi
  const safe = [];
  for(const m of moves){
    const back = {x:pc.x,y:pc.y};
    const target = pieceAt(m.x,m.y);
    if(target && target.color!==pc.color) target.dead=true;
    pc.x=m.x; pc.y=m.y;
    if(!flyingGeneralFacing()) safe.push(m);
    // hoàn tác
    pc.x=back.x; pc.y=back.y;
    if(target) target.dead=false;
  }
  return safe;
}

// ===== Khởi tạo =====
drawBoard();
drawPieces();
setTurnUI();
