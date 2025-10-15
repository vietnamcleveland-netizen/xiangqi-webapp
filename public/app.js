(() => {
  const CELL = 60;          // 60px/ô
  const ORI  = 5;           // biên trái/trên của lưới (trùng SVG)
  const boardEl = document.getElementById('board');
  const turnEl  = document.getElementById('turn');

  const toPx = (c, r) => ({ x: ORI + c * CELL, y: ORI + r * CELL });

  // trạng thái
  let turn = 'red';
  let selected = null;         // {id, c, r, color, type}
  let hlEl = null;

  // mảng quân khởi tạo (chuẩn theo ảnh)
  const pieces = [];

  const add = (type, color, c, r, txt) => {
    const id = `${type}_${color}_${c}_${r}_${Math.random().toString(36).slice(2,7)}`;
    pieces.push({ id, type, color, c, r, txt });
  };

  // --- đen (trên)
  '车马象士将士象马车'.split('').forEach((t,i)=>add('top', 'black', i, 0, t));
  add('cannon','black',1,2,'炮'); add('cannon','black',7,2,'炮');
  [0,2,4,6,8].forEach(c=>add('sold','black',c,3,'卒'));

  // --- đỏ (dưới)
  '车马相仕帅仕相马车'.split('').forEach((t,i)=>add('bot','red', i, 9, t));
  add('cannon','red',1,7,'炮'); add('cannon','red',7,7,'炮');
  [0,2,4,6,8].forEach(c=>add('sold','red',c,6,'兵'));

  // hiển thị turn
  const updateTurn = () => { turnEl.textContent = (turn === 'red' ? 'Red' : 'Black') + ' to move'; };

  // render lên DOM
  const byId = new Map(); // id -> element
  const posMap = new Map(); // key "c,r" -> piece id

  const posKey = (c,r)=>`${c},${r}`;

  const mountAll = () => {
    // clear
    [...boardEl.querySelectorAll('.piece, .hl')].forEach(n=>n.remove());
    byId.clear(); posMap.clear();

    pieces.forEach(p=>{
      const el = document.createElement('div');
      el.className = `piece ${p.color}`;
      el.textContent = p.txt;
      const {x,y} = toPx(p.c,p.r);
      el.style.left = `${x}px`;
      el.style.top  = `${y}px`;
      el.dataset.id = p.id;
      el.addEventListener('click', onPieceClick);
      boardEl.appendChild(el);
      byId.set(p.id, el);
      posMap.set(posKey(p.c,p.r), p.id);
    });
  };

  const pieceAt = (c,r)=> {
    const id = posMap.get(posKey(c,r));
    return id ? pieces.find(p=>p.id===id) : null;
  };

  // chọn quân
  const onPieceClick = (e) => {
    const id = e.currentTarget.dataset.id;
    const p  = pieces.find(x=>x.id===id);
    if (!p) return;

    // nếu đang chọn và click vào đối phương -> cố gắng ăn
    if (selected && selected.id !== p.id) {
      if (selected.color !== p.color) {
        // ăn: di chuyển selected tới vị trí p, xoá p
        moveTo(selected, p.c, p.r, true);
      } else {
        // đổi chọn
        select(p);
      }
      return;
    }

    // nếu chưa có hoặc chính nó => chọn nó (đúng lượt)
    if (p.color !== turn) return;
    select(p);
  };

  const select = (p) => {
    selected = p;
    if (!hlEl) {
      hlEl = document.createElement('div');
      hlEl.className = 'hl';
      boardEl.appendChild(hlEl);
    }
    const {x,y}=toPx(p.c,p.r);
    hlEl.style.left=`${x}px`; hlEl.style.top=`${y}px`;
  };

  const clearSelect = () => { selected=null; if (hlEl) { hlEl.remove(); hlEl=null; } };

  // click nền để đi quân đến giao điểm gần nhất
  boardEl.addEventListener('click', (e)=>{
    // nếu click trúng quân thì handler ở quân đã chạy, ta bỏ qua ở đây
    if (e.target.classList.contains('piece')) return;
    if (!selected) return;

    // lấy toạ độ chuột so với board
    const rect = boardEl.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // làm tròn về giao điểm gần nhất (ORI + n*CELL)
    const c = Math.max(0, Math.min(8, Math.round((px - ORI)/CELL)));
    const r = Math.max(0, Math.min(9, Math.round((py - ORI)/CELL)));

    // nếu có quân cùng màu -> không đi
    const target = pieceAt(c,r);
    if (target && target.color === selected.color) return;

    moveTo(selected, c, r, !!target);
  });

  // di chuyển / ăn
  const moveTo = (p, c, r, capture=false) => {
    // xoá pos cũ
    posMap.delete(posKey(p.c,p.r));

    // nếu ăn: xoá quân bị ăn
    if (capture) {
      const victim = pieceAt(c,r);
      if (victim) {
        const idx = pieces.findIndex(x=>x.id===victim.id);
        if (idx>=0) pieces.splice(idx,1);
        const vEl = byId.get(victim.id);
        if (vEl) vEl.remove();
        byId.delete(victim.id);
        posMap.delete(posKey(c,r));
      }
    }

    // cập nhật quân
    p.c = c; p.r = r;
    posMap.set(posKey(c,r), p.id);
    const el = byId.get(p.id);
    const {x,y} = toPx(c,r);
    el.style.left = `${x}px`; el.style.top = `${y}px`;

    // đổi lượt
    turn = (turn==='red') ? 'black' : 'red';
    updateTurn();
    clearSelect();
  };

  // khởi tạo
  updateTurn();
  mountAll();
})();
