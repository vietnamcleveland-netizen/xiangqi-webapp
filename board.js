export function renderBoard(container) {
  const w = 520, h = 580;
  const files = 9, ranks = 10;
  const pad = 20;
  const dx = (w - 2*pad) / (files - 1);
  const dy = (h - 2*pad) / (ranks - 1);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);

  for (let r=0;r<ranks;r++){
    if (r===4||r===5) continue;
    const y = pad + r*dy;
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', pad); line.setAttribute('x2', w-pad);
    line.setAttribute('y1', y); line.setAttribute('y2', y);
    line.setAttribute('stroke', '#444');
    svg.appendChild(line);
  }
  for (let f=0; f<files; f++){
    const x = pad + f*dx;
    const top = pad; const bottom = h - pad;
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', `M ${x} ${top} L ${x} ${top+4*dy} M ${x} ${bottom} L ${x} ${bottom-4*dy}`);
    path.setAttribute('stroke', '#444');
    svg.appendChild(path);
  }
  const river = document.createElementNS(svgNS, 'rect');
  river.setAttribute('x', pad); river.setAttribute('y', pad+4*dy);
  river.setAttribute('width', w-2*pad); river.setAttribute('height', dy);
  river.setAttribute('class', 'river');
  svg.appendChild(river);

  const labels = document.createElementNS(svgNS, 'g');
  for (let f=0; f<files; f++){
    const x = pad + f*dx; const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', x); t.setAttribute('y', h-2); t.setAttribute('text-anchor','middle'); t.setAttribute('class','label');
    t.textContent = String.fromCharCode(97+f);
    labels.appendChild(t);
  }
  for (let r=0; r<ranks; r++){
    const y = pad + r*dy; const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', 8); t.setAttribute('y', y+4); t.setAttribute('class','label');
    t.textContent = r;
    labels.appendChild(t);
  }
  svg.appendChild(labels);

  const piecesLayer = document.createElementNS(svgNS, 'g');
  piecesLayer.setAttribute('id','pieces');
  svg.appendChild(piecesLayer);

  container.innerHTML = '';
  container.appendChild(svg);

  return { svg, pad, dx, dy };
}