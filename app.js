let socket = null;
let me = null;

const $ = (s)=>document.querySelector(s);

async function api(path, method='GET', body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error((await res.json()).error || 'API error');
  return res.json();
}

function renderAuth() {
  const el = document.querySelector('#auth');
  if (me) {
    el.innerHTML = `<div class="panel">Xin chào, <b>${me.display_name}</b> (ID: ${me.id})</div>`;
    document.querySelector('#btn-login').style.display='none';
    document.querySelector('#btn-register').style.display='none';
    document.querySelector('#btn-logout').style.display='inline-block';
  } else {
    el.innerHTML = `
      <div class="panel">
        <h2>Đăng nhập</h2>
        <input id="email" placeholder="Email" />
        <input id="pwd" type="password" placeholder="Mật khẩu" />
        <button id="do-login">Đăng nhập</button>
      </div>
      <div class="panel">
        <h2>Đăng ký</h2>
        <input id="rname" placeholder="Tên hiển thị" />
        <input id="remail" placeholder="Email" />
        <input id="rpwd" type="password" placeholder="Mật khẩu" />
        <button id="do-register">Tạo tài khoản</button>
      </div>`;
    document.querySelector('#btn-login').style.display='inline-block';
    document.querySelector('#btn-register').style.display='inline-block';
    document.querySelector('#btn-logout').style.display='none';

    document.querySelector('#do-login').onclick = async ()=>{
      try { await api('/api/auth/login','POST',{ email: document.querySelector('#email').value, password: document.querySelector('#pwd').value }); me = { display_name: document.querySelector('#email').value, id: 1 }; renderAuth(); loadLeaderboard(); }
      catch(e){ alert(e.message); }
    };
    document.querySelector('#do-register').onclick = async ()=>{
      try { await api('/api/auth/register','POST',{ display_name: document.querySelector('#rname').value, email: document.querySelector('#remail').value, password: document.querySelector('#rpwd').value }); me = { display_name: document.querySelector('#rname').value, id: 1 }; renderAuth(); loadLeaderboard(); }
      catch(e){ alert(e.message); }
    };
  }
}

import { renderBoard } from '/public/board.js';
const board = renderBoard(document.querySelector('#board'));

function ensureSocket(){
  if (!socket) socket = io();
}

document.querySelector('#join').onclick = ()=>{
  ensureSocket();
  const matchId = document.querySelector('#match-id').value.trim();
  const userId = me?.id || 0;
  socket.emit('join_match', { matchId, userId });
};

document.querySelector('#start').onclick = ()=>{
  if (!socket) return;
  socket.emit('start_match', { matchId: document.querySelector('#match-id').value.trim() });
};

document.querySelector('#move').onclick = ()=>{
  if (!socket) return;
  socket.emit('move', {
    matchId: document.querySelector('#match-id').value.trim(),
    userId: me?.id,
    fromSq: document.querySelector('#from').value.trim(),
    toSq: document.querySelector('#to').value.trim()
  });
};

document.querySelector('#resign').onclick = ()=>{
  if (!socket) return;
  socket.emit('result', { matchId: document.querySelector('#match-id').value.trim(), result: me?.color==='red'?'forfeit_red':'forfeit_black' });
};

document.querySelector('#claim-draw').onclick = ()=>{
  if (!socket) return;
  socket.emit('result', { matchId: document.querySelector('#match-id').value.trim(), result: 'draw' });
};

function loadLeaderboard(){
  fetch('/api/leaderboard').then(r=>r.json()).then(rows=>{
    const tbody = document.querySelector('#board tbody');
    tbody.innerHTML = rows.map(r=>`<tr><td>${r.display_name}</td><td>${r.wins||0}</td><td>${r.draws||0}</td><td>${r.losses||0}</td></tr>`).join('');
  });
}

ensureSocket();
loadLeaderboard();

if (socket){
  socket.on('state', (st)=>{
    document.querySelector('#game').classList.remove('hidden');
    document.querySelector('#role').textContent = `Bạn là: ${st.youAre}`;
    document.querySelector('#redTime').textContent = st.redTime + 's';
    document.querySelector('#blackTime').textContent = st.blackTime + 's';
  });
  socket.on('moved', (ev)=>{
    document.querySelector('#from').value=''; document.querySelector('#to').value='';
    document.querySelector('#redTime').textContent = ev.redTime + 's';
    document.querySelector('#blackTime').textContent = ev.blackTime + 's';
  });
  socket.on('clock', (ev)=>{
    document.querySelector('#redTime').textContent = ev.redTime + 's';
    document.querySelector('#blackTime').textContent = ev.blackTime + 's';
  });
  socket.on('finished', ({ result })=>{
    alert('Kết thúc: ' + result);
  });
}

// Group/tournament buttons
document.querySelector('#create-group').onclick = async ()=>{
  try { const r = await api('/api/groups','POST',{ name: document.querySelector('#group-name').value }); alert('Group ID: '+r.id); }
  catch(e){ alert(e.message); }
};
document.querySelector('#create-tour').onclick = async ()=>{
  try { const r = await api('/api/tournaments','POST',{ group_id: parseInt(document.querySelector('#tour-group').value,10), name: document.querySelector('#tour-name').value, time_initial_seconds: parseInt(document.querySelector('#tour-time').value,10)||600 }); alert('Tournament ID: '+r.id); }
  catch(e){ alert(e.message); }
};
document.querySelector('#add-player').onclick = async ()=>{
  try { await api(`/api/tournaments/${document.querySelector('#tour-id').value}/add-player`,'POST',{ user_id: parseInt(document.querySelector('#player-id').value,10) }); alert('Đã thêm'); }
  catch(e){ alert(e.message); }
};
document.querySelector('#gen-pair').onclick = async ()=>{
  try { const r = await api(`/api/tournaments/${document.querySelector('#tour-id').value}/generate`,'POST'); alert('Tạo trận: '+r.matches.join(', ')); }
  catch(e){ alert(e.message); }
};

renderAuth();