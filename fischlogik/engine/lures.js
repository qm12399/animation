// Twelve artificial lures built from primitives. Unit length ~1 along +x (nose at +x). Scale the root.
import { THREE, V3, renderer, rng } from './core.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const ENV = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
const metal = (c, r = .18) => new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: r, envMap: ENV, envMapIntensity: 1.2 });
const plastic = (o = {}) => new THREE.MeshStandardMaterial({ roughness: .32, metalness: .05, envMap: ENV, envMapIntensity: .6, ...o });
const soft = (o = {}) => new THREE.MeshStandardMaterial({ roughness: .75, ...o });
export const M = { chrome: metal(0xe6e8ea), gold: metal(0xd8b04a, .22), hook: metal(0x30302e, .35), lead: plastic({ color: 0xc8352a }), dark: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: .4 }),
  eyeY: plastic({ color: 0xf2d23a }), lip: new THREE.MeshPhysicalMaterial({ color: 0xdfe8ee, roughness: .05, transmission: .6, transparent: true, opacity: .55, envMap: ENV }) };

function lathe(prof, seg = 28, flat = 1) {
  const g = new THREE.LatheGeometry(prof.map(([x, r]) => new THREE.Vector2(Math.max(r, .001), x)), seg);
  g.rotateZ(-Math.PI / 2); g.scale(1, 1, flat); g.computeVertexNormals(); return g;
}
function paint(g, fn) {
  const p = g.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.max(1e-3, Math.hypot(y, z)); fn(x, y / r, z, col, y); c.set([col.r, col.g, col.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o; };
const eyes = (root, x, y, z, r = .035) => { for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(r, 12, 8), M.eyeY); e.position.set(x, y, z * s); const p = mesh(new THREE.SphereGeometry(r * .55, 10, 6), M.dark); p.position.set(x + r * .2, y, z * s + s * r * .5); root.add(e, p); } };

export function treble(s = .22) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0, -.55, 0), V3(.06, -.85, 0), V3(.25, -.92, 0), V3(.36, -.72, 0), V3(.34, -.5, 0)].map(v => v.multiplyScalar(s)));
  const tg = new THREE.TubeGeometry(curve, 24, .018 * s / .22, 6);
  for (let i = 0; i < 3; i++) { const h = mesh(tg, M.hook); h.rotation.y = i * Math.PI * 2 / 3; g.add(h); }
  const eye = mesh(new THREE.TorusGeometry(.035 * s / .22, .01 * s / .22, 6, 14), M.hook); eye.position.y = .02; g.add(eye);
  return g;
}
function single(s = .3, up = true) {
  const curve = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(-.7, 0, 0), V3(-.9, .08, 0), V3(-.92, .28, 0), V3(-.75, .36, 0), V3(-.6, .3, 0)].map(v => v.multiplyScalar(s)));
  const h = mesh(new THREE.TubeGeometry(curve, 24, .016, 6), M.hook); if (!up) h.rotation.x = Math.PI; return h;
}
function strands(n, len, color, spread = .4, seed = 1) {
  const r = rng(seed), g = new THREE.Group(), m = soft({ color });
  for (let i = 0; i < n; i++) { const s = mesh(new THREE.CylinderGeometry(.006, .01, len * (.8 + r() * .4), 4).translate(0, -len / 2, 0), m); s.rotation.set((r() - .5) * spread, 0, Math.PI / 2 + (r() - .5) * spread); g.add(s); }
  return g;
}

const BUILD = {
  popper() {
    const root = new THREE.Group(), C1 = new THREE.Color(0x3f8a3a), C2 = new THREE.Color(0xf2efe6);
    root.add(mesh(paint(lathe([[-.5, 0], [-.48, .07], [-.3, .13], [0, .16], [.3, .165], [.46, .15], [.5, .14]]), (x, up, z, c) => c.copy(C2).lerp(C1, Math.max(0, up) * 1.2)), plastic({ vertexColors: true })));
    const cup = mesh(new THREE.CircleGeometry(.12, 20).rotateY(Math.PI / 2), M.dark); cup.position.x = .495; root.add(cup);
    eyes(root, .38, .06, .14);
    const t1 = treble(.2); t1.position.set(.12, -.16, 0); const t2 = treble(.2); t2.position.set(-.48, -.02, 0); root.add(t1, t2);
    const fe = strands(14, .22, 0xc9302c, .5, 3); fe.position.set(-.52, 0, 0); fe.rotation.z = Math.PI; root.add(fe);
    return { root, cup };
  },
  stickbait() {
    const root = new THREE.Group(), B = new THREE.Color(0x2e5f9a), S = new THREE.Color(0xdfe6ec);
    root.add(mesh(paint(lathe([[-.55, 0], [-.5, .05], [-.2, .1], [.2, .105], [.45, .08], [.55, 0]], 28, .9), (x, up, z, c) => c.copy(S).lerp(B, Math.max(0, up) * 1.3)), plastic({ vertexColors: true, metalness: .4, roughness: .2 })));
    eyes(root, .42, .03, .07, .028);
    const t1 = treble(.17); t1.position.set(.15, -.1, 0); const t2 = treble(.17); t2.position.set(-.3, -.09, 0); root.add(t1, t2);
    return { root };
  },
  frog() {
    const root = new THREE.Group(), G = new THREE.Color(0x4f8a2c), Y = new THREE.Color(0xe6d65a);
    const body = mesh(paint(new THREE.SphereGeometry(1, 28, 16), (x, up, z, c) => { c.copy(Y).lerp(G, clamp01(up * 1.6 + .5)); if (up > .2 && Math.sin(x * 40) * Math.sin(z * 30) > .6) c.multiplyScalar(.45); }), soft({ vertexColors: true, roughness: .5 }));
    body.scale.set(.42, .17, .28); root.add(body);
    eyes(root, .22, .13, .1, .045);
    for (const s of [-1, 1]) { const leg = strands(8, .45, 0x3f6f24, .25, s > 0 ? 4 : 5); leg.position.set(-.35, -.02, .12 * s); leg.rotation.y = s * .25; leg.rotation.z = Math.PI; root.add(leg); }
    for (const s of [-1, 1]) { const h = single(.55); h.position.set(.25, .1, .1 * s); h.rotation.z = -.15; root.add(h); }
    return { root };
  },
  spinner() {
    const root = new THREE.Group();
    const shaft = mesh(new THREE.CylinderGeometry(.008, .008, 1.0, 6).rotateZ(Math.PI / 2), M.chrome); root.add(shaft);
    const body = mesh(lathe([[-.15, 0], [-.12, .05], [.05, .06], [.18, .04], [.22, 0]]), M.gold); root.add(body);
    for (let i = 0; i < 3; i++) { const b = mesh(new THREE.SphereGeometry(.035, 12, 8), i === 1 ? M.lead : M.gold); b.position.x = .24 + i * .06; root.add(b); }
    const bladeP = new THREE.Group(); bladeP.position.x = .32; root.add(bladeP);
    const bg = new THREE.CircleGeometry(.16, 24); bg.scale(1.6, 1, 1); const pp = bg.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, -(pp.getX(i) ** 2 + pp.getY(i) ** 2) * .9); bg.computeVertexNormals();
    const blade = mesh(bg, new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 1, roughness: .12, envMap: ENV, side: THREE.DoubleSide, envMapIntensity: 1.5 }));
    blade.position.set(-.08, .16, 0); blade.rotation.set(0, 0, -.5); bladeP.add(blade);
    const t = treble(.2); t.position.set(-.52, 0, 0); t.rotation.z = Math.PI / 2; root.add(t);
    const fe = strands(14, .2, 0xc9302c, .5, 6); fe.position.set(-.5, 0, 0); fe.rotation.z = Math.PI; root.add(fe);
    return { root, blade: bladeP };
  },
  blinker() {
    const root = new THREE.Group();
    const g = new THREE.CircleGeometry(.5, 32, 0, Math.PI * 2); g.scale(1, .42, 1);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, -(p.getY(i) ** 2) * 1.8 - (p.getX(i) ** 2) * .3); g.computeVertexNormals();
    const front = mesh(g, metal(0xe8e8e8, .1)); root.add(front);
    const bg = g.clone(); paint(bg, (x, up, z, c, y) => c.set(Math.sin(x * 14) > 0 ? 0xc8302a : 0xf0ece0)); const back = mesh(bg, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.BackSide, roughness: .4 })); root.add(back);
    root.rotation.x = Math.PI / 2;
    const t = treble(.2); t.position.set(-.55, 0, 0); t.rotation.z = Math.PI / 2; const wrap = new THREE.Group(); wrap.add(root, t);
    return { root: wrap, spoon: root };
  },
  crankbait() {
    const root = new THREE.Group(), Gr = new THREE.Color(0x6aa02c), Yl = new THREE.Color(0xf2d02a), Or = new THREE.Color(0xf07a1a);
    root.add(mesh(paint(lathe([[-.5, 0], [-.45, .1], [-.2, .2], [.1, .22], [.35, .18], [.5, .07]], 28, .72), (x, up, z, c) => { c.copy(Yl).lerp(Gr, clamp01(up * 1.5)).lerp(Or, clamp01(-up * 1.6)); if (up > 0 && Math.sin(x * 26) > .5) c.multiplyScalar(.35); }), plastic({ vertexColors: true })));
    eyes(root, .33, .07, .13, .04);
    const lip = mesh(new THREE.BoxGeometry(.32, .015, .26), M.lip); lip.position.set(.6, -.08, 0); lip.rotation.z = -.55; root.add(lip);
    const t1 = treble(.2); t1.position.set(.12, -.2, 0); const t2 = treble(.2); t2.position.set(-.48, -.03, 0); root.add(t1, t2);
    return { root };
  },
  twitchbait() {
    const root = new THREE.Group(), B = new THREE.Color(0x3a4a2a), S = new THREE.Color(0xe6eaee), P = new THREE.Color(0xe08aa0);
    root.add(mesh(paint(lathe([[-.6, 0], [-.55, .05], [-.3, .1], [.2, .11], [.45, .09], [.6, 0]], 28, .55), (x, up, z, c) => { c.copy(S).lerp(B, clamp01(up * 1.8)); if (Math.abs(up) < .15) c.lerp(P, .6); }), plastic({ vertexColors: true, metalness: .35, roughness: .2 })));
    eyes(root, .48, .03, .055, .03);
    const lip = mesh(new THREE.BoxGeometry(.16, .01, .12), M.lip); lip.position.set(.65, -.04, 0); lip.rotation.z = -.35; root.add(lip);
    for (const x of [.25, -.1, -.45]) { const t = treble(.15); t.position.set(x, -.1, 0); root.add(t); }
    return { root };
  },
  chatterbait() {
    const root = new THREE.Group();
    const head = mesh(new THREE.SphereGeometry(.12, 18, 12), plastic({ color: 0x2f3a30 })); head.position.x = .22; root.add(head);
    eyes(root, .3, .04, .09, .03);
    const bp = new THREE.Group(); bp.position.x = .4; root.add(bp);
    const blade = mesh(new THREE.CircleGeometry(.17, 6), new THREE.MeshStandardMaterial({ color: 0xd6d6d6, metalness: 1, roughness: .15, envMap: ENV, side: THREE.DoubleSide })); blade.rotation.y = Math.PI / 2; blade.position.x = .06; bp.add(blade);
    const sk = strands(46, .55, 0x3d6a3a, .6, 9); sk.position.x = .12; sk.rotation.z = Math.PI; root.add(sk);
    const h = single(.5); h.position.set(.15, .02, 0); root.add(h);
    return { root, blade: bp };
  },
  gummifisch(o = {}) {
    const root = new THREE.Group(), W = new THREE.Color(o.belly ?? 0xf0eee6), B = new THREE.Color(o.back ?? 0x3a70a8), tailCol = o.tail ?? o.belly ?? 0xe8e6de;
    const bm = soft({ vertexColors: true, roughness: o.gloss ? .3 : .55, emissive: new THREE.Color(o.glow ?? 0), emissiveIntensity: o.glowI ?? 0 });
    root.add(mesh(paint(lathe([[-.45, .04], [-.4, .08], [-.15, .14], [.15, .15], [.35, .12], [.45, .06]], 28, .6), (x, up, z, c) => { c.copy(W).lerp(B, clamp01(up * 1.4)); if (o.bars && up > -.2 && Math.sin(x * 30) > .45) c.multiplyScalar(.45); if (o.glitter && Math.sin(x * 211 + up * 97) * Math.sin(z * 173) > .85) c.setRGB(1, .9, .6); }), bm));
    const tailP = new THREE.Group(); tailP.position.x = -.45; root.add(tailP);
    const tm = soft({ color: tailCol, emissive: new THREE.Color(o.glow ?? 0), emissiveIntensity: o.glowI ?? 0 }); const stem = mesh(new THREE.CylinderGeometry(.03, .045, .14, 10).rotateZ(Math.PI / 2), tm); stem.position.x = -.06; tailP.add(stem);
    const paddle = mesh(new THREE.CylinderGeometry(.13, .13, .03, 20).rotateZ(Math.PI / 2), tm); paddle.position.x = -.14; paddle.scale.set(1, 1, .75); tailP.add(paddle);
    const head = mesh(new THREE.SphereGeometry(.11, 16, 12), o.head ? plastic({ color: o.head }) : M.lead); head.position.x = .5; root.add(head);
    eyes(root, .56, .04, .08, .03);
    const h = single(.45); h.position.set(.5, .05, 0); root.add(h);
    return { root, tail: tailP, body: bm, tailM: tm };
  },
  twister() {
    const root = new THREE.Group(), col = 0x8fc43a;
    const head = mesh(new THREE.SphereGeometry(.1, 16, 12), M.lead); head.position.x = .42; root.add(head);
    eyes(root, .48, .04, .07, .028);
    root.add(mesh(paint(lathe([[-.15, .04], [-.1, .06], [.1, .07], [.32, .07], [.38, .05]], 20), (x, up, z, c) => c.set(col).multiplyScalar(Math.sin(x * 90) > .3 ? .85 : 1)), soft({ vertexColors: true, roughness: .5, transparent: true, opacity: .92 })));
    const segs = []; let parent = root;
    for (let i = 0; i < 12; i++) { const p = new THREE.Group(); p.position.x = i ? -.07 : -.15; parent.add(p); const s = mesh(new THREE.BoxGeometry(.075, .018, .11 - i * .006).translate(-.035, 0, 0), soft({ color: col, transparent: true, opacity: .92 })); p.add(s); p.rotation.y = i ? .28 : 0; segs.push(p); parent = p; }
    const h = single(.45); h.position.set(.42, .04, 0); root.add(h);
    return { root, segs };
  },
  krebs() {
    const root = new THREE.Group(), Br = new THREE.Color(0x8a5a2e), Or = new THREE.Color(0xd2833a);
    const m = soft({ vertexColors: true, roughness: .55 });
    root.add(mesh(paint(lathe([[-.45, .02], [-.4, .07], [-.2, .09], [0, .11], [.2, .13], [.35, .1], [.42, .04]], 20, .75), (x, up, z, c) => { c.copy(Or).lerp(Br, clamp01(up * 1.5)); if (x < 0 && Math.sin(x * 50) > .6) c.multiplyScalar(.7); }), m));
    const fan = mesh(new THREE.CircleGeometry(.12, 10, Math.PI / 2, Math.PI).rotateX(Math.PI / 2), soft({ color: 0x9a6232, side: THREE.DoubleSide })); fan.position.x = -.45; root.add(fan);
    const claws = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(.32, .02, .07 * s); root.add(sh);
      const arm = mesh(new THREE.CylinderGeometry(.025, .03, .28, 8).rotateZ(Math.PI / 2).translate(.14, 0, 0), soft({ color: 0x9a6232 })); sh.add(arm);
      const pin = new THREE.Group(); pin.position.x = .28; sh.add(pin);
      for (const k of [-1, 1]) { const p = mesh(new THREE.SphereGeometry(1, 12, 8), soft({ color: 0xa8662e })); p.scale.set(.16, .03, .055); p.position.set(.12, .025 * k, 0); pin.add(p); }
      sh.rotation.y = -s * .45; claws.push(sh);
    }
    for (const s of [-1, 1]) { const a = mesh(new THREE.CylinderGeometry(.004, .006, .7, 4).rotateZ(Math.PI / 2).translate(.35, 0, 0), soft({ color: 0x6a4424 })); a.position.set(.38, .05, .03 * s); a.rotation.y = -s * .35; a.rotation.z = .25; root.add(a); }
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const l = mesh(new THREE.CylinderGeometry(.008, .01, .16, 4), soft({ color: 0x7a4c28 })); l.position.set(.1 - i * .08, -.08, .08 * s); l.rotation.x = s * .9; root.add(l); }
    eyes(root, .4, .05, .04, .02);
    return { root, claws };
  },
  zikade() {
    const root = new THREE.Group();
    const s = new THREE.Shape(); s.moveTo(.5, 0); s.bezierCurveTo(.45, .2, .1, .26, -.3, .14); s.lineTo(-.5, .2); s.lineTo(-.45, 0); s.lineTo(-.5, -.12); s.lineTo(-.3, -.06); s.bezierCurveTo(.1, -.16, .45, -.12, .5, 0);
    const plate = mesh(new THREE.ExtrudeGeometry(s, { depth: .03, bevelEnabled: false }).translate(0, 0, -.015), metal(0xd9dde2, .12)); root.add(plate);
    for (const z of [-1, 1]) { const e = mesh(new THREE.CircleGeometry(.04, 14), plastic({ color: 0xf0c020 })); e.position.set(.35, .04, z * .017); if (z < 0) e.rotation.y = Math.PI; root.add(e); }
    const snap = mesh(new THREE.TorusGeometry(.04, .01, 6, 12), M.chrome); snap.position.set(.05, .24, 0); root.add(snap);
    const t1 = treble(.17); t1.position.set(.15, -.16, 0); const t2 = treble(.17); t2.position.set(-.35, -.1, 0); root.add(t1, t2);
    return { root };
  },
};
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
export const LURE_KINDS = Object.keys(BUILD);
export function makeLure(kind, scale = .35, opts) { const L = BUILD[kind](opts); const wrap = new THREE.Group(); wrap.add(L.root); wrap.scale.setScalar(scale); L.wrap = wrap; L.kind = kind; return L; }
