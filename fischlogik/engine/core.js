// Fischlogik engine: renderer, post, shared textures and helpers
import * as THREE from 'three';
import { makePost } from '/core/three/post.js';
export { THREE };
export const W = innerWidth, H = innerHeight, S = W / 720;

export const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// one post chain per scene; camera can be swapped per shot
const posts = new Map();
export function post(scene, camera, o = {}) {
  let p = posts.get(scene);
  if (!p) { p = makePost(renderer, scene, camera, W, H, { ssaa: 1 }); posts.set(scene, p); }
  p.dof.camera = camera;
  p.dof.focus = o.focus ?? 1e6; p.dof.aper = o.aper ?? 0; p.dof.maxCoc = o.maxCoc ?? (o.aper ? 10 : 0);
  p.bloom.strength = o.bloom ?? .35; p.bloom.radius = .55; p.bloom.threshold = o.thr ?? .9;
  const v = p.vig.material.uniforms; v.amt.value = o.vig ?? .38; v.sat.value = o.sat ?? .86; v.contrast.value = o.contrast ?? -.06; v.warm.value = o.warm ?? 0; v.fade.value = o.fade ?? 1;
  return p;
}
export function draw(scene, camera, o) { camera.updateMatrixWorld(); post(scene, camera, o).composer.render(); }

// ---------- math ----------
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const eo = t => 1 - Math.pow(1 - clamp(t), 3);
export const ei = t => Math.pow(clamp(t), 3);
export const back = (t, s = 1.7) => { t = clamp(t) - 1; return 1 + t * t * ((s + 1) * t + s); };
export function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const lerpV = (a, b, t) => a.clone().lerp(b, t);
// piecewise keyframes [[t, value], ...] with easing between keys
export function keys(k, t, ease = eio) {
  if (t <= k[0][0]) return k[0][1]; if (t >= k.at(-1)[0]) return k.at(-1)[1];
  let i = 0; while (t > k[i + 1][0]) i++;
  const u = ease((t - k[i][0]) / (k[i + 1][0] - k[i][0])), a = k[i][1], b = k[i + 1][1];
  return typeof a === 'number' ? lerp(a, b, u) : a.clone().lerp(b, u);
}
export function toScreen(cam, v) { const p = v.clone().project(cam); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, z: p.z, on: p.z < 1 }; }

// ---------- materials & textures ----------
export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, ...o });
function canvasTex(w, h, fn, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = o.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat, o.repeat); }
  t.anisotropy = 4; return t;
}
export const GLOW = canvasTex(64, 64, (x) => {
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.2, 'rgba(255,250,235,.85)'); g.addColorStop(.5, 'rgba(255,240,210,.25)'); g.addColorStop(1, 'rgba(255,240,210,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
});
// leaf cluster card: many small leaves, alpha cut
export const LEAF = canvasTex(256, 256, (x, w, h) => {
  const r = rng(77); x.clearRect(0, 0, w, h);
  for (let i = 0; i < 1500; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), .55) * 118, px = 128 + Math.cos(a) * d, py = 128 + Math.sin(a) * d * .85;
    const shade = 1 - d / 200 + (py < 128 ? .1 : -.1);
    x.fillStyle = `hsl(${78 + r() * 34},${32 + r() * 22}%,${(18 + r() * 22) * shade}%)`;
    x.save(); x.translate(px, py); x.rotate(r() * 6.3); x.beginPath(); x.ellipse(0, 0, 4.5 + r() * 3, 2 + r() * 1.4, 0, 0, 7); x.fill(); x.restore();
  }
});
export const GRASS = canvasTex(256, 256, (x, w, h) => {
  const r = rng(5); x.fillStyle = '#5a6630'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 6000; i++) { x.fillStyle = `hsla(${68 + r() * 28},${35 + r() * 25}%,${16 + r() * 20}%,.6)`; x.fillRect(r() * w, r() * h, 1 + r() * 2, 2 + r() * 5); }
}, { repeat: 1 });
export const SAND = canvasTex(256, 256, (x, w, h) => {
  const r = rng(9); x.fillStyle = '#8a7a58'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 6000; i++) { x.fillStyle = `hsla(${35 + r() * 15},${15 + r() * 20}%,${30 + r() * 30}%,.5)`; x.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  for (let i = 0; i < 40; i++) { x.fillStyle = `hsla(30,10%,${25 + r() * 20}%,.8)`; x.beginPath(); x.ellipse(r() * w, r() * h, 2 + r() * 5, 2 + r() * 3, r() * 3, 0, 7); x.fill(); }
}, { repeat: 1 });
export function logoTex(img) {
  return canvasTex(512, 512, (x) => {
    x.clearRect(0, 0, 512, 512); x.globalAlpha = .92; x.drawImage(img, 136, 70, 240, 240);
    x.font = '800 66px PJS'; x.textAlign = 'center'; x.fillStyle = '#e9eadf'; x.fillText('Fischlogik', 256, 390);
  });
}

// ---------- geometry helpers ----------
export function limb(r, mat, r2 = r) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, 1, 14, 1), mat); m.castShadow = true; return m; }
export function ball(r, mat) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat); m.castShadow = true; return m; }
const UP = new THREE.Vector3(0, 1, 0);
export function span(m, a, b) {   // stretch a unit cylinder from a to b
  const d = b.clone().sub(a), L = d.length();
  m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); m.scale.set(1, Math.max(.001, L), 1);
}
// glow points (bloomed); color values > 1 so they pass the bloom threshold
export function glowPoints(pts, size, color = [2.2, 2.0, 1.6]) {
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const m = new THREE.PointsMaterial({ map: GLOW, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.color.setRGB(...color); return new THREE.Points(geo, m);
}
// time uniform shared by all animated materials
export const TIME = { value: 0 };
// sway: bend instanced blades/leaves by wind (amount grows with height)
export function addSway(mat, amp = .12, freq = 1.4, windVec = [1, .3]) {
  mat.userData.windAmp = { value: amp };
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = TIME; sh.uniforms.uAmp = mat.userData.windAmp;
    sh.vertexShader = 'uniform float uTime; uniform float uAmp;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #else
        vec3 ip = vec3(0.);
      #endif
      float hh = max(0., position.y); float ph = ip.x * .7 + ip.z * .4;
      float sw = (sin(uTime * ${freq.toFixed(2)} + ph) * .6 + sin(uTime * ${(freq * 2.3).toFixed(2)} + ph * 1.7) * .3 + .5) * uAmp * hh * hh;
      transformed.x += sw * ${windVec[0].toFixed(2)}; transformed.z += sw * ${windVec[1].toFixed(2)};`);
  };
  return mat;
}
// a curved grass/reed blade, base at y=0, height 1
export function bladeGeo(w = .05, segs = 5, bend = .25) {
  const g = new THREE.PlaneGeometry(w, 1, 1, segs); g.translate(0, .5, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * .9)); p.setZ(i, bend * y * y); }
  g.computeVertexNormals(); return g;
}
export function instances(geo, mat, list, fn) {   // list -> InstancedMesh, fn(item) -> {p, r(euler), s(vector)}
  const m = new THREE.InstancedMesh(geo, mat, list.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion();
  list.forEach((it, i) => { const o = fn(it, i); Q.setFromEuler(o.r || new THREE.Euler()); M.compose(o.p, Q, o.s || V3(1, 1, 1)); m.setMatrixAt(i, M); if (o.c) m.setColorAt(i, o.c); });
  m.instanceMatrix.needsUpdate = true; return m;
}
