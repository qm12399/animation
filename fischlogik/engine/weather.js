// Weather for the lake scene: blue-sky sun -> heavy storm clouds. storm k in [0,1].
// makeWeather(L) -> { set(k, t, sunPos?), sunDisc, clouds, rain(g, t, k), flash(t, t0) }
import { THREE, V3, GLOW, clamp, lerp, rng, W, H, S } from './core.js';

const puffTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), r = rng(42);
  for (let i = 0; i < 26; i++) { const px = 50 + r() * 156, py = 90 + r() * 90 - Math.abs(px - 128) * .25, rad = 28 + r() * 46;
    const gr = x.createRadialGradient(px, py, 0, px, py, rad); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(.6, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();

const SUNNY = { top: 0x6ea6e0, hor: 0xd3e3ef, hemi: 1.75, sun: 3.2 }, STORM = { top: 0x262c36, hor: 0x5a616c, hemi: .85, sun: .25 };
const lin = h => new THREE.Color(h).convertSRGBToLinear();

export function makeWeather(L) {
  const sc = L.scene, r = rng(9);
  let sky = null, hemi = null; sc.traverse(o => { if (o.material?.uniforms?.top && o.material.uniforms.hor) sky = o; if (o.isHemisphereLight) hemi = o; });
  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: new THREE.Color(4, 3.6, 2.8), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  sunDisc.scale.setScalar(70); sc.add(sunDisc);
  const clouds = new THREE.Group(); sc.add(clouds);
  for (let i = 0; i < 70; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, fog: false, opacity: 0 }));
    const a = r() * 6.3, R = 90 + r() * 260; m.position.set(Math.cos(a) * R, 45 + r() * 55 + R * .08, Math.sin(a) * R);
    m.scale.set(90 + r() * 90, 45 + r() * 40, 1); m.userData = { th: r(), a, R, sp: .4 + r() * .6 }; clouds.add(m);
  }
  const top = lin(SUNNY.top), hor = lin(SUNNY.hor);
  function set(k, t, sunPos = V3(-120, 140, -320)) {
    k = clamp(k);
    if (sky) { sky.material.uniforms.top.value.copy(top).lerp(lin(STORM.top), k); sky.material.uniforms.hor.value.copy(hor).lerp(lin(STORM.hor), k); }
    sc.fog.color.set(SUNNY.hor).lerp(new THREE.Color(STORM.hor), k).multiplyScalar(.95);
    if (hemi) hemi.intensity = lerp(SUNNY.hemi, STORM.hemi, k);
    L.sun.intensity = lerp(SUNNY.sun, STORM.sun, k);
    sunDisc.position.copy(sunPos); sunDisc.material.opacity = clamp(1 - k * 2.2);
    const col = new THREE.Color(0xffffff).lerp(new THREE.Color(0x3a404b), clamp(k * 1.2));
    clouds.children.forEach(m => { const u = m.userData, on = clamp((k * 1.25 - u.th) * 4);
      m.material.opacity = on * lerp(.55, .95, k); m.material.color.copy(col);
      const a = u.a + t * .004 * u.sp; m.position.x = Math.cos(a) * u.R; m.position.z = Math.sin(a) * u.R; });
    L.water.material.uniforms.uWind.value = lerp(.12, 1.3, k);
  }
  return { set, sunDisc, clouds };
}

// 2D rain streaks over the frame
export function rain(g, t, k, slant = .18) {
  if (k <= 0) return; const r = rng(7); g.save(); g.strokeStyle = `rgba(220,230,240,${.35 * clamp(k)})`; g.lineWidth = 1.3 * S; g.beginPath();
  for (let i = 0; i < 160 * k; i++) { const x0 = r() * W * 1.2, sp = 1400 + r() * 600, y = ((r() * H + t * sp * S) % (H + 80)) - 40, x = x0 - y * slant, l = (26 + r() * 22) * S;
    g.moveTo(x, y); g.lineTo(x - l * slant, y + l); }
  g.stroke(); g.restore();
}
// lightning: bright flash at t0 with a quick double flicker
export const flash = (t, t0) => t < t0 ? 0 : Math.max(0, 1 - (t - t0) * 6) * .85 + (t - t0 > .12 && t - t0 < .2 ? .5 : 0);
// 2D snow: soft flakes drifting down with sway
export function snow(g, t, k, n = 120) {
  if (k <= 0) return; const r = rng(11); g.save(); g.fillStyle = '#f4f8ff';
  for (let i = 0; i < n; i++) { const sz = (1.2 + r() * 2.6) * S, sp = (40 + r() * 70) * S, x = (r() * W + Math.sin(t * (.6 + r()) + i) * 18 * S) % W, y = ((r() * H + t * sp) % (H + 20)) - 10;
    g.globalAlpha = k * (.35 + r() * .5); g.beginPath(); g.arc(x, y, sz, 0, 7); g.fill(); }
  g.restore();
}
