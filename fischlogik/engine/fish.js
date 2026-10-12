// Stylised fish: one merged geometry (body + fins) with vertex colours, tail wag in the vertex shader.
import { THREE, V3, TIME, rng } from './core.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SPEC = {
  // prof: radius along the body (tail -> nose); back/belly colours; pattern; fins colour
  barsch: { prof: [0, .07, .1, .16, .21, .23, .22, .19, .14, .07, 0], flat: .55, back: 0x3b4a22, belly: 0xd8d2a0, side: 0x7d8a3c, pattern: 'bars', fin: 0xd2552a, dorsalSpiky: true, len: 1 },
  hecht:  { prof: [0, .05, .07, .095, .11, .115, .11, .1, .085, .06, .02], flat: .6, back: 0x2c3a1c, belly: 0xd9d6b0, side: 0x5b7030, pattern: 'spots', fin: 0x7a6a3a, dorsalBack: true, len: 1 },
  forelle: { prof: [0, .06, .085, .12, .15, .165, .16, .145, .115, .07, .01], flat: .55, back: 0x4a5a34, belly: 0xe6e2d2, side: 0xb8b8a0, pattern: 'trout', fin: 0x8a8060, len: 1 },
  ukelei: { prof: [0, .045, .065, .09, .11, .12, .115, .1, .08, .05, 0], flat: .45, back: 0x4f6a78, belly: 0xf2f4f6, side: 0xd4dce2, pattern: 'none', fin: 0xb9c2c6, len: 1 },
  zander: { prof: [0, .06, .085, .11, .135, .145, .14, .125, .1, .065, .02], flat: .6, back: 0x4a5048, belly: 0xdcdccc, side: 0x8a9080, pattern: 'saddle', fin: 0x8a8a78, dorsalSpiky: true, len: 1 },
  rotauge: { prof: [0, .07, .11, .17, .2, .21, .2, .17, .12, .06, 0], flat: .45, back: 0x34485a, belly: 0xe8ecef, side: 0xb9c3c8, pattern: 'none', fin: 0xc8452e, len: 1 },
};

function colorize(geo, f) {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color();
  for (let i = 0; i < p.count; i++) { f(p.getX(i), p.getY(i), p.getZ(i), col); c.set([col.r, col.g, col.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo;
}
function finShape(pts) { const s = new THREE.Shape(); s.moveTo(...pts[0]); pts.slice(1).forEach(p => s.lineTo(...p)); return new THREE.ShapeGeometry(s); }

export function fishGeometry(kind) {
  const sp = SPEC[kind], r = rng(kind.length * 31);
  const n = sp.prof.length, pts = sp.prof.map((rad, i) => new THREE.Vector2(Math.max(rad, .001), i / (n - 1)));
  const body = new THREE.LatheGeometry(pts, 20).toNonIndexed();
  body.rotateZ(-Math.PI / 2); body.scale(1, 1, sp.flat);                 // axis +x: tail at x=0, nose x=1
  const back = new THREE.Color(sp.back), belly = new THREE.Color(sp.belly), side = new THREE.Color(sp.side);
  colorize(body, (x, y, z, col) => {
    const rad = Math.max(.01, Math.hypot(y, z / sp.flat)), up = y / rad;
    col.copy(side).lerp(back, Math.max(0, up)).lerp(belly, Math.max(0, -up) * .9);
    if (sp.pattern === 'bars' && up > -.3 && Math.sin(x * 38) > .45 && x > .15 && x < .8) col.multiplyScalar(.45);
    if (sp.pattern === 'spots' && up > -.4) { const h = Math.sin(x * 91 + up * 17) * Math.sin(x * 57 - z * 40); if (h > .55) col.lerp(new THREE.Color(0xd8d49a), .7); }
    if (sp.pattern === 'trout') { if (Math.abs(up) < .18) col.lerp(new THREE.Color(0xd08a90), .55); if (up > -.1 && Math.sin(x * 120 + up * 31) * Math.sin(x * 77 - up * 53) > .72) col.multiplyScalar(.25); }
    if (sp.pattern === 'saddle' && up > -.2 && Math.sin(x * 26 + 1) > .55 && x > .15 && x < .85) col.multiplyScalar(.55);
    if (x > .93) col.multiplyScalar(.8);
  });
  const fin = new THREE.Color(sp.fin), parts = [body];
  const add = (g, color) => { const q = g.index ? g.toNonIndexed() : g; colorize(q, (x, y, z, c) => c.copy(color)); parts.push(q); };
  const tail = finShape([[0, 0], [-.2, .17], [-.15, 0], [-.2, -.17]]); tail.translate(.03, 0, 0); add(tail, kind === 'hecht' ? side : fin);
  if (sp.dorsalSpiky) { const d = finShape([[.35, .2], [.4, .33], [.45, .25], [.5, .34], [.55, .26], [.6, .32], [.66, .2]]); add(d, new THREE.Color(0x3a3a24)); }
  else if (sp.dorsalBack) { const d = finShape([[.12, .08], [.17, .2], [.25, .1]]); add(d, side); }
  else { const d = finShape([[.42, .19], [.5, .33], [.6, .19]]); add(d, back); }
  const anal = finShape([[.2, -.12], [.26, -.22], [.32, -.12]]); add(anal, fin);
  const pel = finShape([[.5, -.15], [.56, -.26], [.62, -.15]]); add(pel, fin);
  const merged = mergeGeometries(parts.map(g => { const q = g.index ? g.toNonIndexed() : g; if (!q.attributes.uv) q.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(q.attributes.position.count * 2), 2)); if (!q.attributes.normal) q.computeVertexNormals(); return q; }));
  merged.computeVertexNormals(); merged.translate(-.5, 0, 0);            // centre at origin, nose +x
  return merged;
}

// material with tail wag; per-instance phase via aPhase when instanced
export function fishMaterial({ amp = .09, freq = 9 } = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .45, metalness: .15, side: THREE.DoubleSide });
  m.userData.phase = { value: 0 }; m.userData.amp = { value: amp };
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = TIME; sh.uniforms.uPhase = m.userData.phase; sh.uniforms.uAmp = m.userData.amp;
    sh.vertexShader = 'uniform float uTime; uniform float uPhase; uniform float uAmp;\n#ifdef USE_INSTANCING\nattribute float aPhase;\n#endif\n' +
      sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = uPhase;
        #ifdef USE_INSTANCING
          ph += aPhase;
        #endif
        float u = clamp(.5 - position.x, 0., 1.2);      // 0 at mid-body, grows toward tail
        transformed.z += sin(uTime * ${freq.toFixed(1)} + ph - position.x * 5.) * uAmp * u * u * 2.2;`);
  };
  return m;
}

export function makeFish(kind, length, opts) {
  const m = new THREE.Mesh(fishGeometry(kind), fishMaterial(opts)); m.scale.setScalar(length); m.castShadow = true;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(.022, 10, 8), new THREE.MeshStandardMaterial({ color: kind === 'rotauge' ? 0x8a1a10 : kind === 'zander' ? 0xd8d0b0 : 0x111111, roughness: .2 }));
  const eye2 = eye.clone(); const ey = kind === 'hecht' ? .03 : .05;
  eye.position.set(.38, ey, .07); eye2.position.set(.38, ey, -.07); m.add(eye, eye2);
  return m;
}
export function makeSchool(kind, length, list) {   // list of {p, yaw}
  const geo = fishGeometry(kind); const ph = new Float32Array(list.length);
  list.forEach((f, i) => ph[i] = f.phase ?? i * 1.7);
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1));
  const m = new THREE.InstancedMesh(geo, fishMaterial({ amp: .1, freq: 11 }), list.length); m.castShadow = true;
  m.userData.list = list; m.userData.len = length; placeSchool(m); return m;
}
export function placeSchool(m, offset = V3(), yawAdd = 0) {
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), Sc = V3();
  m.userData.list.forEach((f, i) => {
    E.set(0, f.yaw + yawAdd, f.roll || 0); Q.setFromEuler(E); Sc.setScalar(m.userData.len * (f.s || 1));
    M.compose(f.p.clone().add(offset), Q, Sc); m.setMatrixAt(i, M);
  });
  m.instanceMatrix.needsUpdate = true;
}
