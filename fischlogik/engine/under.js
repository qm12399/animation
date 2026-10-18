// Underwater set: a shallow shelf that drops off (Scharkante) into deep water; weeds, bubbles, shafts, murky dead zone
import { THREE, V3, std, rng, TIME, GLOW, SAND, addSway, bladeGeo, instances, clamp, lerp } from './core.js';

const noise = (x, z) => Math.sin(x * .9 + 1.2) * Math.sin(z * .7) * .25 + Math.sin(x * .31 - z * .23) * .35;
export function bedHeight(x, z) {          // shelf at -1.3 for x<0, drop-off to -6 over x in [0,4]
  const e = clamp(x / 4); const k = e * e * (3 - 2 * e);
  return lerp(-1.3 + noise(x, z) * .4, -6.2 + noise(x * .5, z * .5) * .6, k);
}

export const MODES = {
  shallow: { fog: 0x3f5a4c, near: 2, far: 22, shafts: .55, caus: 1 },
  open:    { fog: 0x1d5f57, near: 1, far: 18, shafts: .7, caus: .4 },
  weeds:   { fog: 0x24584b, near: 1, far: 16, shafts: .9, caus: .6 },
  clear:   { fog: 0x3f7a70, near: 3, far: 30, shafts: 1.1, caus: 1.4, surf: [.16, .36, .33] },
  deep:    { fog: 0x14303a, near: 1, far: 12, shafts: .15, caus: .08, surf: [.05, .12, .13], light: .55 },
  murky:   { fog: 0x3a4630, near: .3, far: 6.5, shafts: .5, caus: 0, surf: [.12, .14, .08], shaft: 0xb48cff, light: .6 },
  night:   { fog: 0x08141c, near: 1, far: 11, shafts: 0, caus: 0, surf: [.07, .11, .15], light: .22 },
};

export function buildUnder() {
  const scene = new THREE.Scene(), r = rng(99);
  scene.fog = new THREE.Fog(0x1d5f57, 1, 18); scene.background = new THREE.Color(0x1d5f57);
  const hemi = new THREE.HemisphereLight(0x9fd8cf, 0x1f2a22, 1.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xe8fff4, 1.6); sun.position.set(-4, 20, 6); scene.add(sun);

  // seabed with caustics
  const g = new THREE.PlaneGeometry(90, 90, 180, 180); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, bedHeight(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  SAND.repeat.set(18, 18);
  const bedM = new THREE.MeshStandardMaterial({ map: SAND, roughness: 1, color: 0xb8a888 });
  bedM.userData.caus = { value: 1 };
  bedM.onBeforeCompile = sh => {
    sh.uniforms.uTime = TIME; sh.uniforms.uCaus = bedM.userData.caus;
    sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = 'uniform float uTime; uniform float uCaus; varying vec3 vWp;\n' +
      `float caus(vec2 q){ float t = uTime * .55, c = 0.; for (int i = 0; i < 3; i++) { q = vec2(q.x + .6 * sin(q.y * 1.7 + t), q.y + .6 * sin(q.x * 1.3 - t * 1.1)); c += 1. / (1. + abs(sin(q.x * 2.1) * sin(q.y * 2.1)) * 14.); } return c / 3.; }\n` +
      sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float cs = caus(vWp.xz * 1.6); totalEmissiveRadiance += vec3(.6, .7, .5) * pow(cs, 3.) * uCaus * smoothstep(-7., -1., vWp.y) * .45;`);
  };
  const bed = new THREE.Mesh(g, bedM); scene.add(bed);
  // pebbles + rocks on the shelf
  const rocks = []; for (let i = 0; i < 160; i++) { let x = -14 + r() * 18, z = -30 + r() * 70; if (x > -6 && z > -2 && z < 9) x -= 9; rocks.push({ p: V3(x, bedHeight(x, z) + .05, z), r: new THREE.Euler(r() * 3, r() * 3, 0), s: V3(1, .6, 1).multiplyScalar(.1 + Math.pow(r(), 3) * .7) }); }
  scene.add(instances(new THREE.DodecahedronGeometry(1, 0), std(0x6c6656, { roughness: 1 }), rocks, o => o));

  // weeds: sparse on the shelf + a dense wall (Krautkante) at z in [14, 40]
  const weeds = [];
  for (let i = 0; i < 2600; i++) {
    const wall = i < 2100; let x = wall ? -7 + r() * 6.2 : -14 + r() * 13, z = wall ? 14 + r() * 26 : -30 + r() * 44;
    if (!wall && x > -6 && z > -2 && z < 9) x -= 8;
    const h = wall ? 1.4 + r() * 2.6 : .3 + r() * .6, gg = r();
    weeds.push({ p: V3(x, bedHeight(x, z) - .05, z), r: new THREE.Euler((r() - .5) * .3, r() * 6.3, (r() - .5) * .3), s: V3(2.2, h, 1), c: new THREE.Color().setRGB(.22 + gg * .2, .38 + gg * .2, .14 + gg * .08) });
  }
  const weedM = addSway(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .8 }), .16, .9, [.4, 1]);
  const weedMesh = instances(bladeGeo(.07, 6, .35), weedM, weeds, o => o); scene.add(weedMesh);

  // surface seen from below
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShaderMaterial({
    side: THREE.DoubleSide, fog: false, uniforms: { uTime: TIME, uSurf: { value: new THREE.Vector3(.10, .26, .24) }, uGl: { value: 1 } },
    vertexShader: `varying vec2 vP; void main(){ vP = (modelMatrix * vec4(position,1.)).xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform float uTime; uniform vec3 uSurf; uniform float uGl; varying vec2 vP; void main(){ float w = sin(vP.x * 1.3 + uTime) * sin(vP.y * 1.1 - uTime * .8) + sin((vP.x + vP.y) * 2.7 + uTime * 1.6) * .4;
      gl_FragColor = vec4(uSurf + vec3(.06, .09, .08) * uGl * pow(max(0., w), 3.), 1.); }` }));
  surf.rotation.x = Math.PI / 2; surf.position.y = 0; scene.add(surf);

  // light shafts: additive planes from the surface
  const shaftTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,240,.9)'); gr.addColorStop(1, 'rgba(255,255,240,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 256); const g2 = x.createLinearGradient(0, 0, 64, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = g2; x.fillRect(0, 0, 64, 256); return new THREE.CanvasTexture(c); })();
  const shaftM = new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const shafts = new THREE.Group(); for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.6 + r() * 1.4, 9), shaftM); m.position.set(-12 + r() * 26, -4.5, -20 + r() * 60); m.rotation.set(.25, r() * 3, .2); shafts.add(m); } scene.add(shafts);

  // floating particles
  const motes = []; for (let i = 0; i < 1400; i++) motes.push(V3(-16 + r() * 30, -6 + r() * 6, -30 + r() * 70));
  const moteM = new THREE.PointsMaterial({ map: GLOW, size: .05, transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending });
  scene.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(motes), moteM));

  // bubbles (animated in update)
  const NB = 160, bub = []; for (let i = 0; i < NB; i++) bub.push({ x: -7 + r() * 6, z: 14 + r() * 26, sp: .4 + r() * .6, ph: r() * 10 });
  const bubG = new THREE.BufferGeometry().setFromPoints(bub.map(() => V3()));
  const bubM = new THREE.PointsMaterial({ map: GLOW, size: .09, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending });
  bubM.color.setRGB(1.6, 1.8, 1.7); const bubbles = new THREE.Points(bubG, bubM); scene.add(bubbles);

  // dead zone: murky red-brown layers below -3.6 over deep water
  const murk = new THREE.Group(); for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshBasicMaterial({ color: 0x3a1c14, transparent: true, opacity: .14, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.set(20, -3.6 - i * .35, 0); murk.add(m); }
  scene.add(murk);

  function setMode(mode, k = 1, to) {   // with `to`: blend mode -> to by k
    const A = MODES[mode], B = to ? MODES[to] : A, u = to ? k : 0, l = (x, y) => x + (y - x) * u;
    scene.fog.color.setHex(A.fog).lerp(new THREE.Color(B.fog), u); scene.background.copy(scene.fog.color); scene.fog.near = l(A.near, B.near); scene.fog.far = l(A.far, B.far);
    shaftM.opacity = .1 * l(A.shafts, B.shafts); bedM.userData.caus.value = l(A.caus, B.caus);
    const sa = A.surf || [.10, .26, .24], sb = B.surf || [.10, .26, .24]; surf.material.uniforms.uSurf.value.set(l(sa[0], sb[0]), l(sa[1], sb[1]), l(sa[2], sb[2])); surf.material.uniforms.uGl.value = mode === 'night' ? .3 : 1;
    shaftM.color.setHex(A.shaft || 0xffffff); const li = l(A.light ?? 1, B.light ?? 1); hemi.intensity = 1.6 * li; sun.intensity = 1.6 * li;
  }
  function update(t) {
    const pp = bubG.attributes.position;
    bub.forEach((b, i) => { const y = bedHeight(b.x, b.z) + ((t * b.sp + b.ph) % 5); pp.setXYZ(i, b.x + Math.sin(t * 3 + b.ph) * .05, y, b.z); });
    pp.needsUpdate = true;
  }
  return { scene, setMode, update, murk, bubbles, shafts, weedMesh };
}
