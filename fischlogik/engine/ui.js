// 2D overlay drawn on top of the WebGL canvas: karaoke subtitles, pills, chapters, title, end card, paths
import { W, H, S, clamp, lerp, seg, eo, back, ss, toScreen, V3 } from './core.js';

export const C = { gold: '#fbc464', orange: '#f2a33a', blue: '#6aa8e8', red: '#e0524a', green: '#7fd18b', pill: 'rgba(27,42,56,.86)', white: '#ffffff' };
const cv = document.createElement('canvas'); cv.width = W; cv.height = H; document.body.appendChild(cv);
export const g = cv.getContext('2d');
export function clear() { g.clearRect(0, 0, W, H); }
const F = (w, px) => `${w} ${px * S}px PJS`;
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

// ---------- dissolve: grab the current webgl frame, draw it over the next one ----------
const snap = document.createElement('canvas'); snap.width = W; snap.height = H; const sg = snap.getContext('2d');
export function grab(glCanvas) { sg.clearRect(0, 0, W, H); sg.drawImage(glCanvas, 0, 0); }
export function overlaySnap(alpha) { if (alpha <= 0) return; g.save(); g.globalAlpha = clamp(alpha); g.drawImage(snap, 0, 0); g.restore(); }
export function fill(color, alpha) { if (alpha <= 0) return; g.save(); g.globalAlpha = clamp(alpha); g.fillStyle = color; g.fillRect(0, 0, W, H); g.restore(); }

// ---------- karaoke ----------
let CH = [];
export function setWords(words, keySet, maxWords = 4) {
  CH = []; let cur = [];
  words.forEach((w, i) => {
    cur.push(w); const nx = words[i + 1], end = /[,.!?:]$/.test(w.w), gap = nx ? nx.t0 - w.t1 : 9;
    if (end || cur.length >= maxWords || gap > .35 || !nx) { CH.push(cur); cur = []; }
  });
  CH = CH.map((ws, i) => ({ ws: ws.map(w => ({ ...w, key: keySet.has(w.w.replace(/[^\wäöüßÄÖÜ]/g, '')) })) }));
  CH.forEach((c, i) => { const nx = CH[i + 1]; c.a = c.ws[0].t0 - .08; c.b = nx ? Math.min(nx.ws[0].t0 - .08, c.ws.at(-1).t1 + 1.2) : c.ws.at(-1).t1 + .8; });
  return CH;
}
export function karaoke(t, y = .665) {
  const c = CH.find(c => t >= c.a && t < c.b); if (!c) return;
  g.save(); g.font = F(800, 41); g.textBaseline = 'middle';
  const sp = g.measureText(' ').width, ws = c.ws.map(w => g.measureText(w.w).width);
  let tot = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1), sc = 1;
  if (tot > W - 60 * S) { sc = (W - 60 * S) / tot; }
  g.translate(W / 2, H * y); g.scale(sc, sc);
  let x = -tot / 2;
  c.ws.forEach((w, i) => {
    const on = seg(t, w.t0 - .05, w.t0 + .06);
    g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 14 * S; g.shadowOffsetY = 2 * S;
    g.fillStyle = w.key && on > .5 ? C.gold : `rgba(255,255,255,${lerp(.55, 1, on)})`;
    g.fillText(w.w, x, 0); x += ws[i] + sp;
  });
  g.restore();
}

// ---------- callouts ----------
// pill at (x,y) centred; opts: dot colour, icon 'x', sub text
export function pill(text, x, y, k, o = {}) {
  if (k <= 0) return;
  const sc = lerp(.82, 1, back(clamp(k * 1.3))), a = clamp(k * 2.2);
  g.save(); g.globalAlpha = a * (o.alpha ?? 1); g.translate(x, y); g.scale(sc, sc);
  g.font = F(700, 16); const tw = g.measureText(text).width; let sw = 0;
  if (o.sub) { g.font = F(500, 11); sw = g.measureText(o.sub).width; }
  const lead = o.dot || o.icon ? 20 * S : 0, pw = Math.max(tw, sw) + lead + 26 * S, ph = (o.sub ? 44 : 32) * S;
  g.fillStyle = C.pill; g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 10 * S; rr(-pw / 2, -ph / 2, pw, ph, ph / 2); g.fill(); g.shadowBlur = 0;
  let tx = -pw / 2 + 13 * S;
  const ty = o.sub ? -7 * S : 0;
  if (o.dot) { g.fillStyle = o.dot; g.beginPath(); g.arc(tx + 5 * S, ty, 5 * S, 0, 7); g.fill(); }
  if (o.icon === 'x') { g.strokeStyle = '#fff'; g.lineWidth = 2 * S; const c = tx + 5 * S, d = 4.5 * S; g.beginPath(); g.moveTo(c - d, ty - d); g.lineTo(c + d, ty + d); g.moveTo(c + d, ty - d); g.lineTo(c - d, ty + d); g.stroke(); }
  tx += lead; g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.font = F(700, 16); g.fillText(text, tx, ty + 1);
  if (o.sub) { g.font = F(500, 11); g.fillStyle = 'rgba(255,255,255,.72)'; g.fillText(o.sub, tx, 10 * S); }
  g.restore();
}
// anchor dot + leader line toward (bx,by), then the pill beyond it
export function callout(text, ax, ay, dx, dy, k, o = {}) {
  if (k <= 0) return;
  const bx = ax + dx * S, by = ay + dy * S, e = eo(clamp(k * 1.8));
  g.save(); g.globalAlpha = clamp(k * 3) * (o.alpha ?? 1); g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = 1.6 * S;
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(lerp(ax, bx, e), lerp(ay, by, e)); g.stroke();
  g.fillStyle = o.dot || C.gold; g.beginPath(); g.arc(ax, ay, 5.5 * S, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.5 * S; g.stroke(); g.restore();
  g.font = F(700, 16); const tw = g.measureText(text).width + 46 * S;
  const px = dx === 0 ? bx : bx + Math.sign(dx) * tw / 2, py = dx === 0 ? by + Math.sign(dy) * 16 * S : by;
  pill(text, px, py, clamp((k - .25) * 1.6), o);
}
export function chapter(n, title, sub, k) {
  if (k <= 0) return;
  const y = 135 * S + (1 - eo(k)) * -16 * S;
  g.save(); g.globalAlpha = clamp(k * 1.6);
  g.font = F(800, 20); const tw = g.measureText(title).width; g.font = F(500, 11.5); const sw = g.measureText(sub).width;
  const pw = Math.max(tw, sw) + 70 * S, ph = 52 * S, x = W / 2 - pw / 2;
  g.fillStyle = C.pill; rr(x, y - ph / 2, pw, ph, ph / 2); g.fill();
  g.fillStyle = '#9cc8f0'; g.beginPath(); g.arc(x + 27 * S, y, 13 * S, 0, 7); g.fill();
  g.fillStyle = '#16283a'; g.font = F(800, 14); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, x + 27 * S, y + 1);
  g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = F(800, 20); g.fillText(title, x + 50 * S, y - 7 * S);
  g.fillStyle = 'rgba(255,255,255,.72)'; g.font = F(500, 11.5); g.fillText(sub, x + 50 * S, y + 12 * S);
  g.restore();
}
function kicker(text, y, a = .9) { g.save(); g.font = F(700, 12); g.letterSpacing = `${4.2 * S}px`; g.fillStyle = `rgba(255,255,255,${a})`; g.textAlign = 'center'; g.fillText(text, W / 2 + 2 * S, y); g.restore(); }
function serifLine(parts, y, px) {   // parts: [[text, gold?], ...]
  g.font = `italic 900 ${px * S}px PF`; const ws = parts.map(p => g.measureText(p[0]).width), tot = ws.reduce((a, b) => a + b, 0);
  let x = W / 2 - tot / 2; parts.forEach((p, i) => { g.fillStyle = p[1] ? C.gold : '#fff'; g.fillText(p[0], x, y); x += ws[i]; });
}
export function title(ep, l1, l2, k) {
  if (k <= 0) return;
  g.save(); g.globalAlpha = clamp(k); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 16 * S; g.textBaseline = 'alphabetic';
  kicker(`FISCHLOGIK · FOLGE ${ep}`, 168 * S + (1 - eo(k)) * 10 * S);
  g.translate(0, (1 - eo(k)) * 14 * S); serifLine(l1, 228 * S, 50); serifLine(l2, 286 * S, 50);
  g.restore();
}
export function endCard(t, t0, ep, l1, l2, logo) {
  const k = seg(t, t0, t0 + .5); if (k <= 0) return;
  g.save(); g.globalAlpha = k;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#133f63'); gr.addColorStop(1, '#0b2642'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const u = eo(seg(t, t0 + .15, t0 + .9));
  g.globalAlpha = k * u; kicker(`FISCHLOGIK · FOLGE ${ep}`, 240 * S);
  g.translate(0, (1 - u) * 18 * S); serifLine(l1, 310 * S, 48); serifLine(l2, 368 * S, 48); g.translate(0, -(1 - u) * 18 * S);
  const v = seg(t, t0 + .6, t0 + 1.2), L = 120 * S * lerp(.85, 1, back(v)), cx = W / 2, cy = 520 * S;
  g.globalAlpha = k * clamp(v * 2);
  // corner brackets
  g.strokeStyle = '#2f8fb0'; g.lineWidth = 4 * S; const b = L * .62, c = 18 * S;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(cx + sx * b, cy + sy * (b - c)); g.lineTo(cx + sx * b, cy + sy * b); g.lineTo(cx + sx * (b - c), cy + sy * b); g.stroke(); }
  g.drawImage(logo, cx - L / 2, cy - L / 2, L, L);
  g.font = `italic 500 ${32 * S}px PF`; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('Fischlogik', cx, cy + L * .62 + 58 * S);
  g.font = F(600, 11.5); g.letterSpacing = `${5 * S}px`; g.fillStyle = 'rgba(205,218,232,.8)'; g.fillText('ANGELN MIT VERSTAND', cx + 2 * S, cy + L * .62 + 92 * S);
  g.restore();
}

// ---------- world-space drawing (through the camera) ----------
export function dots(cam, pts, k, o = {}) {      // dotted path through world points, drawn up to fraction k
  const n = pts.length - 1; g.save();
  for (let i = 0; i <= n; i++) {
    if (i / n > k) break;
    const s = toScreen(cam, pts[i]); if (!s.on) continue;
    const fade = o.head ? clamp(1 - (k - i / n) * o.head) : 1;
    g.globalAlpha = fade * (o.alpha ?? 1); g.fillStyle = o.color || 'rgba(255,246,225,.95)';
    if (o.glow) { g.shadowColor = 'rgba(255,240,200,.9)'; g.shadowBlur = 10 * S; }
    g.beginPath(); g.arc(s.x, s.y, (o.r ?? 2.6) * S, 0, 7); g.fill();
  }
  g.restore();
}
export function arcPts(a, b, h, n = 40) { const out = []; for (let i = 0; i <= n; i++) { const u = i / n, p = a.clone().lerp(b, u); p.y += Math.sin(u * Math.PI) * h; out.push(p); } return out; }
export function ring(cam, c, r, k, color, o = {}) {      // dotted ring on the ground plane
  if (k <= 0) return; const n = o.n ?? 44; g.save(); g.fillStyle = color; g.globalAlpha = clamp(k * 2) * (o.alpha ?? 1);
  for (let i = 0; i < n * eo(k); i++) { const a = i / n * Math.PI * 2 - Math.PI / 2, s = toScreen(cam, c.clone().add(V3(Math.cos(a) * r, 0, Math.sin(a) * r))); g.beginPath(); g.arc(s.x, s.y, (o.dot ?? 2.4) * S, 0, 7); g.fill(); }
  g.restore();
}
export function screenRing(x, y, r, k, color, o = {}) {   // dotted ring in screen space (for rings in side views)
  if (k <= 0) return; const n = o.n ?? 30; g.save(); g.fillStyle = color; g.globalAlpha = clamp(o.alpha ?? 1);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * (o.half ? 1 : 2) + (o.half ? Math.PI : 0); g.beginPath(); g.arc(x + Math.cos(a) * r * (o.sx ?? 1), y + Math.sin(a) * r * (o.sy ?? 1), (o.dot ?? 2.4) * S, 0, 7); g.fill(); }
  g.restore();
}
export function polyline(cam, pts, k, color, width = 2, dash) {
  if (k <= 0) return; g.save(); g.strokeStyle = color; g.lineWidth = width * S; g.globalAlpha = clamp(k * 2); if (dash) g.setLineDash(dash.map(d => d * S));
  g.beginPath(); const n = Math.floor((pts.length - 1) * eo(k));
  for (let i = 0; i <= n; i++) { const s = toScreen(cam, pts[i]); i ? g.lineTo(s.x, s.y) : g.moveTo(s.x, s.y); } g.stroke(); g.restore();
}
export function streaks(t, k, dir = 1, n = 9, yA = .3, yB = .75) {   // wind streaks across the screen
  if (k <= 0) return; g.save(); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const y = H * lerp(yA, yB, (i * .618) % 1), sp = .32 + (i % 3) * .08, ph = ((t * sp + i * .37) % 1);
    const x = dir > 0 ? lerp(-.2, 1.2, ph) * W : lerp(1.2, -.2, ph) * W, L = (60 + (i % 4) * 25) * S;
    g.globalAlpha = k * Math.sin(ph * Math.PI) * .8; g.lineWidth = 2 * S;
    g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x - dir * L * .3, y - 4 * S, x - dir * L * .6, y + 4 * S, x - dir * L, y); g.stroke();
  }
  g.restore();
}
export function depthRuler(x, y0, pxPerM, marks, k, hiM) {   // vertical ruler with metre marks
  if (k <= 0) return; g.save(); g.globalAlpha = clamp(k * 1.5); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5 * S;
  const yEnd = y0 + pxPerM * marks.at(-1) * eo(k); g.beginPath(); g.moveTo(x, y0); g.lineTo(x, yEnd); g.stroke();
  g.font = F(600, 12); g.textBaseline = 'middle';
  marks.forEach(m => { const y = y0 + m * pxPerM; if (y > yEnd + 1) return; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10 * S, y); g.stroke(); g.fillStyle = m === hiM ? C.gold : 'rgba(255,255,255,.85)'; g.fillText(`${m} m`, x + 16 * S, y); });
  g.restore();
}

// ---------- episode 2 additions ----------
export function bigStat(num, label, x, y, k) {       // large gold number + small caption
  if (k <= 0) return;
  g.save(); g.globalAlpha = clamp(k * 1.6); g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 16 * S;
  const sc = lerp(.8, 1, back(clamp(k * 1.2))); g.translate(x, y); g.scale(sc, sc);
  g.font = `italic 900 ${64 * S}px PF`; g.fillStyle = C.gold; g.fillText(num, 0, 0);
  g.font = F(700, 15); g.fillStyle = '#fff'; g.fillText(label, 0, 30 * S); g.restore();
}
export function stack(items, x, y, gap = 46) {          // column of pills: [[text, k, dot], ...]
  items.forEach(([text, k, dot], i) => pill(text, x, y + i * gap * S, k, { dot: dot || C.gold }));
}
export function scoreCard(title, rows, k, y = 210) {    // rows: [[label, ok, k], ...]
  if (k <= 0) return;
  const w = 300 * S, rh = 40 * S, h = 64 * S + rows.length * rh, x = W / 2 - w / 2, y0 = y * S;
  g.save(); g.globalAlpha = clamp(k * 1.6); g.translate(0, (1 - eo(k)) * -14 * S);
  g.fillStyle = C.pill; g.beginPath(); g.roundRect(x, y0, w, h, 22 * S); g.fill();
  g.font = F(800, 18); g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(title, x + 22 * S, y0 + 30 * S);
  const score = rows.filter(r => r[1] && r[2] > .5).length;
  g.textAlign = 'right'; g.fillStyle = score === rows.length ? C.gold : 'rgba(255,255,255,.75)'; g.font = `italic 900 ${26 * S}px PF`; g.fillText(`${score}/${rows.length}`, x + w - 22 * S, y0 + 30 * S); g.textAlign = 'left';
  rows.forEach(([label, ok, kr], i) => {
    const yy = y0 + 64 * S + i * rh + rh / 2 - 6 * S, a = clamp(kr * 2);
    g.globalAlpha = clamp(k * 1.6) * (.35 + .65 * a); g.font = F(600, 16); g.fillStyle = '#fff'; g.fillText(label, x + 56 * S, yy);
    const cx = x + 32 * S; g.lineWidth = 3 * S; g.lineCap = 'round';
    if (a > 0) {
      g.globalAlpha = clamp(k * 1.6) * a;
      if (ok) { g.strokeStyle = C.green; g.beginPath(); g.moveTo(cx - 7 * S, yy); g.lineTo(cx - 2 * S, yy + 5 * S); g.lineTo(cx + 8 * S, yy - 6 * S); g.stroke(); }
      else { g.strokeStyle = C.red; g.beginPath(); g.moveTo(cx - 6 * S, yy - 6 * S); g.lineTo(cx + 6 * S, yy + 6 * S); g.moveTo(cx + 6 * S, yy - 6 * S); g.lineTo(cx - 6 * S, yy + 6 * S); g.stroke(); }
    }
  });
  g.restore();
}
export function arrow(x0, y0, x1, y1, k, color = 'rgba(255,255,255,.9)', w = 3) {   // straight arrow drawn up to k
  if (k <= 0) return; const e = eo(k), x = lerp(x0, x1, e), y = lerp(y0, y1, e), a = Math.atan2(y1 - y0, x1 - x0);
  g.save(); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = w * S; g.lineCap = 'round'; g.globalAlpha = clamp(k * 2);
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke();
  g.beginPath(); g.moveTo(x + Math.cos(a) * 10 * S, y + Math.sin(a) * 10 * S); g.lineTo(x + Math.cos(a + 2.5) * 10 * S, y + Math.sin(a + 2.5) * 10 * S); g.lineTo(x + Math.cos(a - 2.5) * 10 * S, y + Math.sin(a - 2.5) * 10 * S); g.fill();
  g.restore();
}
export function swirl(x, y, r, t, k, color = 'rgba(255,255,255,.85)', dir = 1) {   // dotted spiral = eddy
  if (k <= 0) return; g.save(); g.fillStyle = color; g.globalAlpha = clamp(k * 2);
  for (let i = 0; i < 26; i++) { const u = i / 26, a = dir * (u * Math.PI * 3.2 - t * 2.5), rr = r * (.25 + .75 * u); g.beginPath(); g.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .6, (1.4 + u * 1.6) * S, 0, 7); g.fill(); }
  g.restore();
}
