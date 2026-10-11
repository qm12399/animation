// The lake world: one consistent lake used from every camera (top-down map, bank, 3/4 views)
import { THREE, V3, std, rng, TIME, GLOW, GRASS, LEAF, addSway, bladeGeo, instances, glowPoints, clamp, lerp } from './core.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

export const RX = 20, RZ = 34;
export function lakeR(th) {            // shoreline radius vector at polar angle th (ellipse with wobble)
  const n = 1 + .055 * Math.sin(3 * th + 1) + .035 * Math.sin(5 * th + 2) + .015 * Math.sin(9 * th + .5);
  return [RX * Math.cos(th) * n, RZ * Math.sin(th) * n];
}
export function sdist(x, z) {          // approx signed distance to shore (negative = in the lake)
  const th = Math.atan2(z / RZ, x / RX), [ex, ez] = lakeR(th), R = Math.hypot(ex, ez);
  return (Math.hypot(x, z) / R - 1) * R;
}
export function shore(th, off = 0, y = 0) {   // point on the shore, off > 0 = onto land
  const [ex, ez] = lakeR(th), R = Math.hypot(ex, ez); const k = (R + off) / R; return V3(ex * k, y, ez * k);
}
const noise2 = (x, z) => Math.sin(x * .21 + 1.3) * Math.sin(z * .17 + .4) * .5 + Math.sin(x * .07 - z * .05) * .5;

// key places on the lake
export const PLACES = {
  bankTh: Math.PI / 2 + .05,  // near bank (bottom of the map): the angler's spot
  windTh: .18,                // right bank: wind blows onto it
  dockTh: 1.02, inletTh: -.78, lilyTh: Math.PI + .75, weedTh: -.55,
};
const CREEK = (() => {          // creek path from the inlet outward (polyline on land)
  const a = shore(PLACES.inletTh, -1.0), pts = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24; const dir = V3(Math.cos(PLACES.inletTh) * .8, 0, Math.sin(PLACES.inletTh)); pts.push(a.clone().add(dir.multiplyScalar(u * 34)).add(V3(Math.sin(u * 5) * 2.5 * u, 0, 0))); }
  return pts;
})();
function creekDist(x, z) { let m = 1e9, idx = 0; for (let i = 0; i < CREEK.length - 1; i++) { const a = CREEK[i], b = CREEK[i + 1], abx = b.x - a.x, abz = b.z - a.z, t = clamp(((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz)); const d = Math.hypot(x - a.x - abx * t, z - a.z - abz * t); if (d < m) { m = d; idx = i + t; } } return [m, idx]; }

function terrainHeight(x, z) {
  const d = sdist(x, z);
  let h = d < 0 ? -Math.min(3, -d * .45) : d < 1.6 ? .04 + d * .19 : .34 + .12 * noise2(x, z) * clamp((d - 1.6) / 6);
  if (d > 30) h += (d - 30) * .05 * (.6 + .4 * noise2(x * .5, z * .5));
  const [cd, ci] = creekDist(x, z);
  if (ci > .3 && cd < 3.2) h = Math.min(h, lerp(-.25, h, clamp((cd - 1.1) / 2.1)));
  return h;
}

export function buildLake(logoImg) {
  const scene = new THREE.Scene(), r = rng(1234);
  const skyTop = new THREE.Color(0xa1a8bd), skyHor = new THREE.Color(0xbcc0cd);
  scene.fog = new THREE.Fog(skyHor.clone().multiplyScalar(.95), 45, 260);
  // sky dome
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: skyTop.clone().convertSRGBToLinear() }, hor: { value: skyHor.clone().convertSRGBToLinear() } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top, hor; varying vec3 vP; void main(){ float h = normalize(vP).y; gl_FragColor = vec4(mix(hor, top, smoothstep(0., .5, h)) * (h < 0. ? .9 : 1.), 1.); }`,
  })); scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xcdd5e6, 0x5a6040, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0da, 2.3); sun.position.set(45, 70, 35); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; scene.add(sun, sun.target);
  function shadowFocus(c, span) { sun.position.copy(c).add(V3(45, 70, 35)); sun.target.position.copy(c); Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 260 }); sun.shadow.camera.updateProjectionMatrix(); }
  shadowFocus(V3(), 70);

  // ---- terrain
  const tg = new THREE.PlaneGeometry(380, 380, 230, 230); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position, tc = [];
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), h = terrainHeight(x, z); tp.setY(i, h);
    const d = sdist(x, z), n = noise2(x * 1.7, z * 1.7) * .5 + .5;
    let c = new THREE.Color().setRGB(1.25 + n * .3, 1.3 + n * .2, .85 + n * .1);              // grass tint (multiplies the grass map)
    const mud = new THREE.Color().setRGB(1.15, .82, .58);
    c.lerp(mud, clamp(1 - (d - .2) / 1.6) * .9);
    if (d < .2) c.multiplyScalar(.75);
    const [cd, ci] = creekDist(x, z); if (ci > .3 && cd < 2.6) c.lerp(new THREE.Color().setRGB(.7, .62, .5), clamp(1 - (cd - 1) / 1.6));
    tc.push(c.r, c.g, c.b);
  }
  tg.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3)); tg.computeVertexNormals();
  GRASS.repeat.set(70, 70);
  const ground = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: GRASS, vertexColors: true, roughness: 1 }));
  ground.receiveShadow = true; scene.add(ground);

  // ---- water (planar reflection + depth colour)
  const SEG = 180, RING = 30, pos = [], dep = [], idx = [];
  pos.push(0, 0, 0); dep.push(1);
  for (let k = 1; k <= RING; k++) for (let i = 0; i < SEG; i++) {
    const th = i / SEG * Math.PI * 2, s = k / RING, [x, z] = lakeR(th), sc = s * 1.04;
    pos.push(x * sc, -z * sc, 0); dep.push(clamp(1 - Math.pow(s, 1.5)));      // local xy plane (mesh is rotated)
  }
  for (let i = 0; i < SEG; i++) idx.push(0, 1 + i, 1 + (i + 1) % SEG);
  for (let k = 1; k < RING; k++) for (let i = 0; i < SEG; i++) { const a = 1 + (k - 1) * SEG + i, b = 1 + (k - 1) * SEG + (i + 1) % SEG; idx.push(a, a + SEG, b, b, a + SEG, b + SEG); }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wg.setAttribute('depth', new THREE.Float32BufferAttribute(dep, 1)); wg.setIndex(idx);
  const waterShader = {
    uniforms: { color: { value: new THREE.Color(0xffffff) }, tDiffuse: { value: null }, textureMatrix: { value: null }, uMap: { value: 0 }, uWind: { value: .3 }, uRefl: { value: 1 }, uDead: { value: 0 } },
    vertexShader: `uniform mat4 textureMatrix; attribute float depth; varying vec4 vUv; varying float vD; varying vec3 vW;
      void main(){ vUv = textureMatrix * vec4(position, 1.); vD = depth; vW = (modelMatrix * vec4(position, 1.)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uMap, uWind, uRefl, uDead; varying vec4 vUv; varying float vD; varying vec3 vW;
      float wv(vec2 p){ return sin(p.x*1.1+uTime*1.3)*.5 + sin(p.y*1.6-uTime*1.0+p.x*.35)*.45 + sin((p.x*.7+p.y)*3.3+uTime*2.1)*.22 + sin((p.x-p.y*.6)*6.1-uTime*2.7)*.1; }
      void main(){
        vec2 p = vW.xz * vec2(1., 1.) + vec2(uTime * uWind * 1.5, 0.);
        float e = .12, h = wv(p); vec2 n = vec2(wv(p + vec2(e, 0.)) - h, wv(p + vec2(0., e)) - h) / e;
        vec3 V = normalize(cameraPosition - vW);
        float fres = .03 + .97 * pow(1. - clamp(V.y, 0., 1.), 4.);
        vec4 uv = vUv; uv.xy += n * (.012 + .03 * uWind) * uv.w;
        vec3 refl = texture2DProj(tDiffuse, uv).rgb * vec3(.72, .84, .9);
        vec3 deep = vec3(.004, .018, .040), mid = vec3(.014, .045, .065), shal = vec3(.075, .075, .045);
        vec3 base = mix(shal, mid, smoothstep(0., .16, vD)); base = mix(base, deep, smoothstep(.22, .95, vD));
        base += .0012 * wv(vW.xz * .6);
        base = mix(base, base * vec3(1.6, .8, .75), uDead * smoothstep(.45, .7, vD));
        float c = smoothstep(.46, .5, abs(fract(vD * 6.) - .5)) * uMap * smoothstep(.05, .2, vD); base += .018 * c;
        vec3 col = mix(base, refl, clamp(fres * uRefl, 0., .92));
        col += vec3(.9, .85, .75) * pow(max(0., n.y * .5 + .2), 12.) * .04 * uRefl * fres;
        gl_FragColor = vec4(col, 1.);
      }`,
  };
  const water = new Reflector(wg, { textureWidth: 360, textureHeight: 640, shader: waterShader, clipBias: .003 });
  water.material.uniforms.uTime = TIME; water.material.side = THREE.DoubleSide; water.rotation.x = -Math.PI / 2; water.position.y = 0; scene.add(water);
  const reflRender = water.onBeforeRender;
  function setReflect(on) { water.onBeforeRender = on ? reflRender : () => {}; water.material.uniforms.uRefl.value = on ? 1 : 0; }

  // ---- trees: trunk + branches + leaf cards
  const treeList = [];
  for (let i = 0; i < 900 && treeList.length < 150; i++) {
    const x = (r() - .5) * 170, z = (r() - .5) * 200, d = sdist(x, z);
    if (d < 4.5 || d > 70) continue;
    if (Math.hypot(x - shore(PLACES.bankTh).x, z - shore(PLACES.bankTh).z) < 9) continue;      // keep the angler's bank open
    if (r() < clamp((d - 4) / 25) * .5) continue;
    treeList.push({ x, z, h: 3.2 + r() * 3, cr: 2 + r() * 1.6, y: terrainHeight(x, z) });
  }
  for (let i = 0; i < 70; i++) { const th = r() * 6.3, R = 110 + r() * 40; treeList.push({ x: Math.cos(th) * R, z: Math.sin(th) * R * 1.2, h: 4 + r() * 3, cr: 2.5 + r() * 1.5, y: terrainHeight(Math.cos(th) * R, Math.sin(th) * R * 1.2), far: true }); }
  const cards = [], trunks = [], branches = [];
  treeList.forEach(t => {
    trunks.push({ p: V3(t.x, t.y + t.h * .5, t.z), s: V3(1, t.h, 1) });
    for (let b = 0; b < 3; b++) { const a = r() * 6.3; branches.push({ p: V3(t.x + Math.cos(a) * .6, t.y + t.h * (.7 + b * .1), t.z + Math.sin(a) * .6), r: new THREE.Euler(Math.sin(a) * .9, 0, -Math.cos(a) * .9), s: V3(.6, t.h * .45, .6) }); }
    const n = t.far ? 22 : 70;
    for (let k = 0; k < n; k++) {
      const a = r() * 6.3, rr = Math.cbrt(r()) * t.cr, yy = (r() - .45) * t.cr * 1.3;
      const lum = .75 + r() * .4, warm = r();
      cards.push({ p: V3(t.x + Math.cos(a) * rr, t.y + t.h + yy, t.z + Math.sin(a) * rr), r: new THREE.Euler(r() * 3, r() * 3, r() * 3), s: V3(1, 1, 1).multiplyScalar(.95 + r() * .7), c: new THREE.Color().setRGB(lum * (.8 + warm * .25), lum, lum * .8) });
    }
  });
  const barkM = std(0x4a3a2c, { roughness: 1 });
  const tr = instances(new THREE.CylinderGeometry(.13, .24, 1, 7), barkM, trunks, o => o); tr.castShadow = true; scene.add(tr);
  const br = instances(new THREE.CylinderGeometry(.04, .09, 1, 5).translate(0, .5, 0), barkM, branches, o => o); br.castShadow = true; scene.add(br);
  const leafM = new THREE.MeshStandardMaterial({ map: LEAF, alphaTest: .45, side: THREE.DoubleSide, roughness: .9 });
  addSway(leafM, .02, 1.1);
  const leaves = instances(new THREE.PlaneGeometry(1, 1), leafM, cards, o => o);
  leaves.castShadow = true; leaves.receiveShadow = true;
  leaves.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: LEAF, alphaTest: .45 });
  scene.add(leaves);
  // distant pine wall (fogs to grey-blue)
  const pines = []; for (let i = 0; i < 420; i++) { const th = r() * 6.3, R = 150 + r() * 60; pines.push({ p: V3(Math.cos(th) * R, 5, Math.sin(th) * R * 1.15), s: V3(2.2 + r(), 9 + r() * 6, 2.2 + r()) }); }
  scene.add(instances(new THREE.ConeGeometry(1, 1, 6), std(0x24331f), pines, o => o));

  // ---- shoreline reeds and grass blades
  const blades = [];
  for (let i = 0; i < 6500; i++) {
    const th = r() * 6.3, off = -1.0 + Math.pow(r(), 1.6) * 3.2, p = shore(th, off);
    if (Math.abs(th - PLACES.dockTh) < .05) continue;
    const g = r(); p.y = Math.max(0, terrainHeight(p.x, p.z)) - .02;
    const nearSpot = Math.min(p.distanceTo(shore(PLACES.bankTh, 2)), p.distanceTo(shore(PLACES.windTh, 2))) < 7 ? .55 : 1;
    const tall = (off < .6 ? .5 + r() * .7 : .2 + r() * .4) * nearSpot;
    blades.push({ p, r: new THREE.Euler((r() - .5) * .5, r() * 6.3, (r() - .5) * .5), s: V3(1.4, tall, 1), c: new THREE.Color().setRGB(.3 + g * .22, .4 + g * .2, .13 + g * .06) });
  }
  // grass tufts around the two angler spots
  for (const th of [PLACES.bankTh, PLACES.windTh]) for (let i = 0; i < 2600; i++) {
    const c = shore(th, 2.5 + r() * 10), a = r() * 6.3, rr = Math.sqrt(r()) * 9, p = c.add(V3(Math.cos(a) * rr, 0, Math.sin(a) * rr));
    if (sdist(p.x, p.z) < .8) continue; p.y = terrainHeight(p.x, p.z) - .01; const g = r();
    blades.push({ p, r: new THREE.Euler((r() - .5) * .6, r() * 6.3, (r() - .5) * .6), s: V3(1, .18 + r() * .25, 1), c: new THREE.Color().setRGB(.3 + g * .2, .4 + g * .18, .14 + g * .06) });
  }
  const bladeM = addSway(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .85 }), .12, 1.5);
  const reeds = instances(bladeGeo(.06, 5, .3), bladeM, blades, o => o); reeds.castShadow = true; reeds.receiveShadow = true; scene.add(reeds);

  // ---- lily pads (top-left)
  const pads = []; for (let i = 0; i < 48; i++) { const p = shore(PLACES.lilyTh + (r() - .5) * .45, -1.5 - r() * 5); p.y = .03; pads.push({ p, r: new THREE.Euler(0, r() * 6.3, 0), s: V3(1, 1, 1).multiplyScalar(.5 + r() * .5), c: new THREE.Color().setRGB(.7 + r() * .3, 1, .6 + r() * .2) }); }
  const padG = new THREE.CircleGeometry(.55, 18, .3, Math.PI * 1.85).rotateX(-Math.PI / 2);
  const lily = instances(padG, std(0x55823a, { roughness: .6 }), pads, o => o); lily.receiveShadow = true; scene.add(lily);

  // ---- dock (bottom-right)
  const dock = new THREE.Group(), wood = std(0x9a8062, { roughness: .95 });
  for (let i = 0; i < 16; i++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(1.6, .07, .22), wood); pl.position.set(0, .45, -i * .25); pl.castShadow = pl.receiveShadow = true; dock.add(pl); }
  for (const x of [-.7, .7]) for (const z of [0, -1.9, -3.8]) { const po = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 1.4, 8), std(0x5b4a38)); po.position.set(x, -.2, z); dock.add(po); }
  const dp = shore(PLACES.dockTh, 1.0); dock.position.copy(dp); dock.lookAt(shore(PLACES.dockTh, -10)); dock.rotateY(Math.PI); scene.add(dock);

  // ---- creek: flowing strip + stones
  const cw = [], cidx = [], cuv = [];
  CREEK.forEach((p, i) => {
    const nx = CREEK[Math.min(i + 1, CREEK.length - 1)].clone().sub(CREEK[Math.max(i - 1, 0)]).normalize(), side = V3(-nx.z, 0, nx.x), w = 1.1 + (i === 0 ? .6 : 0);
    for (const s of [-1, 1]) { const q = p.clone().add(side.clone().multiplyScalar(s * w)); cw.push(q.x, Math.max(-.02, terrainHeight(p.x, p.z) + .14), q.z); cuv.push(s * .5 + .5, i / (CREEK.length - 1)); }
    if (i) { const a = (i - 1) * 2; cidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cw, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(cuv, 2)); cg.setIndex(cidx); cg.computeVertexNormals();
  const creekM = new THREE.ShaderMaterial({ uniforms: { uTime: TIME }, transparent: true, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv; void main(){ float f = vUv.y * 60. + uTime * 4.; float s = sin(f + sin(vUv.x * 9. + uTime) * 1.5) * .5 + .5;
      float edge = smoothstep(0., .25, vUv.x) * smoothstep(1., .75, vUv.x);
      vec3 c = mix(vec3(.03,.07,.09), vec3(.16,.22,.24), pow(s, 6.) * edge); c += vec3(.25) * pow(s, 30.) * edge * .5; gl_FragColor = vec4(c, .95); }` });
  scene.add(new THREE.Mesh(cg, creekM));
  const stones = []; CREEK.forEach((p, i) => { for (let k = 0; k < 4; k++) { const a = r() * 6.3, q = p.clone().add(V3(Math.cos(a) * (1.3 + r()), 0, Math.sin(a) * (1.3 + r()))); q.y = terrainHeight(q.x, q.z) + .05; stones.push({ p: q, r: new THREE.Euler(r() * 3, r() * 3, 0), s: V3(.3 + r() * .4, .18 + r() * .2, .3 + r() * .4) }); } });
  const st = instances(new THREE.DodecahedronGeometry(1, 0), std(0x7d7a72, { roughness: .9 }), stones, o => o); st.castShadow = true; st.receiveShadow = true; scene.add(st);

  // ---- weed bed near the inlet: dark patch under the surface + emergent stalks
  const patchG = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
  const wc = shore(PLACES.weedTh, -4.5); const patch = new THREE.Mesh(patchG, new THREE.MeshBasicMaterial({ color: 0x1d3a1a, transparent: true, opacity: .55, depthWrite: false }));
  patch.position.copy(wc).setY(.012); patch.scale.set(5, 1, 3.2); patch.rotation.y = -.4; scene.add(patch);
  const stalks = []; for (let i = 0; i < 900; i++) { const a = r() * 6.3, rr = Math.sqrt(r()); const p = wc.clone().add(V3(Math.cos(a) * rr * 5, -.1, Math.sin(a) * rr * 3.2)); stalks.push({ p, r: new THREE.Euler((r() - .5) * .3, r() * 6.3, 0), s: V3(1, .3 + r() * .5, 1), c: new THREE.Color().setRGB(.35 + r() * .2, .5 + r() * .2, .2) }); }
  scene.add(instances(bladeGeo(.05, 3, .15), addSway(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }), .1), stalks, o => o));

  // ---- glowing fish clusters along the edges (map view)
  const fishPts = []; for (const [th, n] of [[.25, 7], [1.3, 5], [1.9, 6], [2.7, 5], [3.6, 6], [4.4, 7], [5.2, 6], [5.8, 5]]) for (let i = 0; i < n; i++) { const p = shore(th + (r() - .5) * .2, -1.2 - r() * 2.6); p.y = .1; fishPts.push(p); }
  const fishGlow = glowPoints(fishPts, 1.7); scene.add(fishGlow);

  function setFog(near, far) { scene.fog.near = near; scene.fog.far = far; }
  return { scene, water, setReflect, setFog, shadowFocus, sun, fishGlow, terrainHeight, creek: CREEK, weedCenter: wc };
}
