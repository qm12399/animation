// River world: a river flowing toward +z, bridge pillar, groynes (Buhnen), a mid-river boulder.
// The water shader bends its flow streaks around obstacles and calms the water behind them.
import { THREE, V3, std, rng, TIME, LEAF, GRASS, addSway, bladeGeo, instances, clamp, lerp } from './core.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

export const halfW = z => 14 + 1.6 * Math.sin(z * .045 + 1) + .8 * Math.sin(z * .11);
export const PILLAR = V3(0, 0, -60), BOULDER = V3(5.5, 0, 40);
export const GROYNES = [-28, -12, 4].map(z => ({ z, len: 6.5 }));   // on the left bank (x<0)
const noise2 = (x, z) => Math.sin(x * .21 + 1.3) * Math.sin(z * .17 + .4) * .5 + Math.sin(x * .07 - z * .05) * .5;
export function riverHeight(x, z) {
  const d = Math.abs(x) - halfW(z);
  if (d < 0) return -Math.min(2.6, -d * .35) - .2;
  return d < 1.5 ? -.2 + d * .33 : .3 + .15 * noise2(x, z) * clamp((d - 1.5) / 5) + Math.max(0, d - 25) * .06;
}

export function buildRiver() {
  const scene = new THREE.Scene(), r = rng(555);
  const skyTop = new THREE.Color(0xa1a8bd), skyHor = new THREE.Color(0xbcc0cd);
  scene.fog = new THREE.Fog(skyHor.clone().multiplyScalar(.95), 45, 260);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: skyTop.convertSRGBToLinear() }, hor: { value: skyHor.clone().convertSRGBToLinear() } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top, hor; varying vec3 vP; void main(){ float h = normalize(vP).y; gl_FragColor = vec4(mix(hor, top, smoothstep(0., .5, h)), 1.); }` })));
  scene.add(new THREE.HemisphereLight(0xcdd5e6, 0x5a6040, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0da, 2.3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; scene.add(sun, sun.target);
  function shadowFocus(c, span) { sun.position.copy(c).add(V3(45, 70, 35)); sun.target.position.copy(c); Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 260 }); sun.shadow.camera.updateProjectionMatrix(); }
  shadowFocus(V3(), 70);

  // terrain
  const tg = new THREE.PlaneGeometry(200, 300, 160, 240); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position, tc = [];
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i); tp.setY(i, riverHeight(x, z));
    const d = Math.abs(x) - halfW(z), n = noise2(x * 1.7, z * 1.7) * .5 + .5;
    const c = new THREE.Color().setRGB(1.25 + n * .3, 1.3 + n * .2, .85 + n * .1).lerp(new THREE.Color().setRGB(1.2, 1.0, .8), clamp(1 - (d - .2) / 2) * .9);
    tc.push(c.r, c.g, c.b);
  }
  tg.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3)); tg.computeVertexNormals();
  const gmap = GRASS.clone(); gmap.needsUpdate = true; gmap.repeat.set(40, 60);
  const ground = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: gmap, vertexColors: true, roughness: 1 })); ground.receiveShadow = true; scene.add(ground);

  // water
  const wg = new THREE.PlaneGeometry(60, 300, 1, 1);
  const shader = {
    uniforms: { color: { value: new THREE.Color(0xffffff) }, tDiffuse: { value: null }, textureMatrix: { value: null }, uRefl: { value: 1 }, uSeam: { value: 0 } },
    vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
      void main(){ vUv = textureMatrix * vec4(position, 1.); vW = (modelMatrix * vec4(position, 1.)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uRefl, uSeam; varying vec4 vUv; varying vec3 vW;
      const vec3 O0 = vec3(${PILLAR.x.toFixed(1)}, ${PILLAR.z.toFixed(1)}, 1.5), O1 = vec3(${BOULDER.x.toFixed(1)}, ${BOULDER.z.toFixed(1)}, 1.3);
      float hw(float z){ return 14. + 1.6 * sin(z * .045 + 1.) + .8 * sin(z * .11); }
      float h1(float n){ return fract(sin(n * 127.1) * 43758.5); }
      void obst(vec3 o, vec2 p, inout float q, inout float wake, inout float foam){
        float dx = p.x - o.x, dz = p.y - o.y, r = o.z;
        float near = exp(-max(0., abs(dz) - r) / (r * 4.));
        q += sign(dx) * r * r / (abs(dx) + r) * near * smoothstep(-6. * r, 0., dz);
        float w = exp(-dx * dx / (r * r * 1.2)) * exp(-max(dz, 0.) / (r * 7.)) * step(-.2 * r, dz);
        wake = max(wake, w);
        float rr = length(vec2(dx, dz)); foam += smoothstep(r * 1.5, r * 1.05, rr) * step(dz, .3 * r) * .9;
      }
      void main(){
        vec2 p = vW.xz; float q = p.x, wake = 0., foam = 0.;
        obst(O0, p, q, wake, foam); obst(O1, p, q, wake, foam);
        // groynes: calm water just downstream of each groyne, along the left bank
        ${GROYNES.map(g => `{ float bx = -hw(${g.z.toFixed(1)}); float c = smoothstep(${g.len.toFixed(1)} + 1., ${g.len.toFixed(1)} - 1., p.x - bx) * step(${g.z.toFixed(1)}, p.y) * smoothstep(${(g.z + 14).toFixed(1)}, ${(g.z + 4).toFixed(1)}, p.y); wake = max(wake, c); }`).join('\n')}
        float spd = 1. - .85 * wake;
        float lane = floor(q * 1.3), fl = fract(q * 1.3);
        float s = p.y * .35 - uTime * 2.4 * spd + h1(lane) * 40.;
        float streak = pow(max(0., sin(s * 1.7 + h1(lane + 3.) * 6.)), 14.) * smoothstep(0., .25, fl) * smoothstep(.75, .4, fl) * (1. - wake);
        float d = abs(p.x) - hw(p.y);
        vec3 deep = vec3(.016, .042, .040), shal = vec3(.07, .07, .045);
        vec3 base = mix(deep, shal, smoothstep(-6., 0., d));
        base = mix(base, base * vec3(.85, .95, 1.0), wake);
        float sw = sin(atan(p.y - O1.y - 2., p.x - O1.x) * 2. + length(p - O1.xy) * 3. - uTime * 2.) * wake;
        base += .006 * sw;
        float seam = smoothstep(.3, .5, wake) * smoothstep(.75, .5, wake);
        vec3 col = base + vec3(.55, .58, .55) * (streak * .22 + foam * .35 + seam * .12 * (1. + uSeam * 3.));
        vec3 V = normalize(cameraPosition - vW); float fres = .03 + .97 * pow(1. - clamp(V.y, 0., 1.), 4.);
        vec4 uv = vUv; uv.xy += vec2(sin(p.y * 2. - uTime * 4.), cos(p.x * 2.)) * .02 * uv.w;
        vec3 refl = texture2DProj(tDiffuse, uv).rgb * vec3(.7, .82, .84);
        gl_FragColor = vec4(mix(col, refl, clamp(fres * uRefl, 0., .85)) + vec3(.4) * streak * .1 * uRefl, 1.);
      }`,
  };
  const water = new Reflector(wg, { textureWidth: 360, textureHeight: 640, shader, clipBias: .003 });
  water.material.uniforms.uTime = TIME; water.material.side = THREE.DoubleSide; water.rotation.x = -Math.PI / 2; scene.add(water);
  const reflRender = water.onBeforeRender;
  function setReflect(on) { water.onBeforeRender = on ? reflRender : () => {}; water.material.uniforms.uRefl.value = on ? 1 : 0; }

  // bridge: pillar with an upstream nose, deck, railings, abutments
  const stone = std(0x8d8a82, { roughness: .95 });
  const ps = new THREE.Shape(); ps.moveTo(0, -2.6); ps.lineTo(1.2, -1.2); ps.lineTo(1.2, 1.6); ps.lineTo(-1.2, 1.6); ps.lineTo(-1.2, -1.2); ps.lineTo(0, -2.6);
  const pil = new THREE.Mesh(new THREE.ExtrudeGeometry(ps, { depth: 9, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, 6.5, 0), stone);
  pil.position.set(PILLAR.x, 0, PILLAR.z); pil.castShadow = pil.receiveShadow = true; scene.add(pil);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(46, .8, 4.2), std(0x9a968c)); deck.position.set(0, 6.9, PILLAR.z); deck.castShadow = deck.receiveShadow = true; scene.add(deck);
  for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(46, .5, .2), std(0x6b6b6b)); rail.position.set(0, 7.55, PILLAR.z + s * 2); scene.add(rail); }
  for (const s of [-1, 1]) { const ab = new THREE.Mesh(new THREE.BoxGeometry(6, 7, 5), stone); ab.position.set(s * 22, 3.2, PILLAR.z); ab.castShadow = true; scene.add(ab); }
  // boulder
  const bol = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 1), std(0x77746c, { flatShading: true })); bol.scale.set(1.1, .8, 1.3); bol.position.set(BOULDER.x, -.1, BOULDER.z); bol.castShadow = true; scene.add(bol);
  // groynes: rock rows from the left bank
  const rocks = [];
  GROYNES.forEach(g => { const bx = -halfW(g.z) - 1.5; for (let i = 0; i < 70; i++) { const u = r(); rocks.push({ p: V3(bx + u * (g.len + 1.5), lerp(.25, -.15, u) + (r() - .5) * .2, g.z + (r() - .5) * 2.2), r: new THREE.Euler(r() * 3, r() * 3, 0), s: V3(1, .7, 1).multiplyScalar(.35 + r() * .45) }); } });
  const gr = instances(new THREE.DodecahedronGeometry(1, 0), std(0x7d7a72, { roughness: .95 }), rocks, o => o); gr.castShadow = gr.receiveShadow = true; scene.add(gr);

  // trees on both banks
  const cards = [], trunks = [];
  for (let i = 0; i < 160; i++) {
    const side = r() < .5 ? -1 : 1, z = -140 + r() * 280, x = side * (halfW(z) + 6 + Math.pow(r(), 1.5) * 50);
    if (Math.abs(z - PILLAR.z) < 6 && Math.abs(x) < 30) continue;
    const h = 3.2 + r() * 3, cr = 2 + r() * 1.6, y = riverHeight(x, z);
    trunks.push({ p: V3(x, y + h / 2, z), s: V3(1, h, 1) });
    for (let k = 0; k < 60; k++) { const a = r() * 6.3, rr = Math.cbrt(r()) * cr; cards.push({ p: V3(x + Math.cos(a) * rr, y + h + (r() - .45) * cr * 1.3, z + Math.sin(a) * rr), r: new THREE.Euler(r() * 3, r() * 3, r() * 3), s: V3(1, 1, 1).multiplyScalar(.95 + r() * .7), c: new THREE.Color().setRGB(.75 + r() * .3, .9 + r() * .2, .7) }); }
  }
  const tr = instances(new THREE.CylinderGeometry(.13, .24, 1, 7), std(0x4a3a2c), trunks, o => o); tr.castShadow = true; scene.add(tr);
  const leafM = addSway(new THREE.MeshStandardMaterial({ map: LEAF, alphaTest: .45, side: THREE.DoubleSide, roughness: .9 }), .02, 1.1);
  const lv = instances(new THREE.PlaneGeometry(1, 1), leafM, cards, o => o); lv.castShadow = true; lv.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: LEAF, alphaTest: .45 }); scene.add(lv);
  // bank grass and reeds
  const blades = [];
  for (let i = 0; i < 5000; i++) { const side = r() < .5 ? -1 : 1, z = -140 + r() * 280, off = -.6 + Math.pow(r(), 1.5) * 4, x = side * (halfW(z) + off), g = r();
    blades.push({ p: V3(x, Math.max(-.15, riverHeight(x, z)), z), r: new THREE.Euler((r() - .5) * .5, r() * 6.3, (r() - .5) * .5), s: V3(1.3, off < .8 ? .4 + r() * .7 : .2 + r() * .35, 1), c: new THREE.Color().setRGB(.3 + g * .22, .4 + g * .2, .13 + g * .06) }); }
  const rd = instances(bladeGeo(.06, 5, .3), addSway(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .85 }), .12, 1.5), blades, o => o); rd.castShadow = true; scene.add(rd);

  function setFog(near, far) { scene.fog.near = near; scene.fog.far = far; }
  return { scene, water, setReflect, setFog, shadowFocus };
}
