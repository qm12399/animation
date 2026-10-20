// Sea beach (Ostsee/Nordsee): shore along x, sea toward -z. Profile: shore -> first trough (Rinne, d~7)
// -> sandbar (d~15, breaking waves) -> open sea. A rip gap in the bar at x = RIPX, a stone groyne at x = GX.
import { THREE, V3, TIME, rng, std, instances, bladeGeo, addSway, clamp, SAND } from './core.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const RIPX = 14, GX = -24;
const gauss = (u) => Math.exp(-u * u);
export function groundY(x, z) {
  const d = -z;
  if (d < 0) return -d * .05 + 2.2 * clamp((z - 14) / 9) ** 2;
  const barK = 1 - .85 * gauss((x - RIPX) / 4);
  return -Math.min(4, d * .09) - .7 * gauss((d - 7) / 3) + 1.05 * barK * gauss((d - 15) / 2.6);
}
export const depthAt = (x, z) => Math.max(0, -groundY(x, z));
const GLSL_H = `
  float gauss(float u){ return exp(-u*u); }
  float hgt(vec2 p){ float d = -p.y; if (d < 0.) return -d*.05;
    float barK = 1. - .85*gauss((p.x - ${RIPX.toFixed(1)})/4.);
    return -min(4., d*.09) - .7*gauss((d - 7.)/3.) + 1.05*barK*gauss((d - 15.)/2.6); }`;

export function buildBeach() {
  const scene = new THREE.Scene(), r = rng(31);
  const skyTop = new THREE.Color(0x7fb0e0), skyHor = new THREE.Color(0xdde8ee);
  scene.fog = new THREE.Fog(skyHor.clone(), 60, 260);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: skyTop.clone().convertSRGBToLinear() }, hor: { value: skyHor.clone().convertSRGBToLinear() } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top, hor; varying vec3 vP; void main(){ float h = normalize(vP).y; gl_FragColor = vec4(mix(hor, top, smoothstep(0., .45, h)), 1.); }` }));
  scene.add(sky);
  const hemi = new THREE.HemisphereLight(0xdfe8f2, 0x8a7a58, 1.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2de, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; scene.add(sun, sun.target);
  function shadowFocus(c, span) { sun.position.copy(c).add(V3(40, 70, 30)); sun.target.position.copy(c); Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 260 }); sun.shadow.camera.updateProjectionMatrix(); }
  shadowFocus(V3(), 30);

  // ---- terrain (sand), vertex colours: dry / wet / seabed
  const tg = new THREE.PlaneGeometry(260, 200, 260, 220); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, -60);
  const tp = tg.attributes.position, tc = new Float32Array(tp.count * 3), c = new THREE.Color();
  for (let i = 0; i < tp.count; i++) { const x = tp.getX(i), z = tp.getZ(i), y = groundY(x, z) + (z > 0 ? .03 * Math.sin(x * 1.3 + z * .7) * Math.sin(z * 2.1) : 0); tp.setY(i, y);
    if (z > 2.6) c.set(0xe6d6ab).lerp(new THREE.Color(0xbfb37a), clamp((z - 15) / 6) * .6); else if (z > 0) c.set(0xb8a274).lerp(new THREE.Color(0xe6d6ab), clamp((z - 1.6) / 1)); else c.set(0xc9b88a).lerp(new THREE.Color(0xa89870), clamp(-y / 3));
    tc.set([c.r, c.g, c.b], i * 3); }
  tg.setAttribute('color', new THREE.BufferAttribute(tc, 3)); tg.computeVertexNormals();
  const sandTex = SAND.clone(); sandTex.needsUpdate = true; sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping; sandTex.repeat.set(90, 70);
  const ground = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, map: sandTex, color: new THREE.Color(1.45, 1.4, 1.32) })); ground.receiveShadow = true; scene.add(ground);

  // ---- water: analytic depth colours, travelling breakers on bar + shore, groyne foam, rip streaks
  const fogU = { uFogCol: { value: skyHor.clone() }, uFogN: { value: 60 }, uFogF: { value: 260 } };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(260, 140, 1, 1).rotateX(-Math.PI / 2).translate(0, 0, -68), new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, uniforms: { uTime: TIME, uRip: { value: 0 }, uMap: { value: 0 }, uSun: { value: V3(.45, .75, .35).normalize() }, ...fogU },
    vertexShader: `varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position,1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW,1.); }`,
    fragmentShader: `uniform float uTime, uRip, uMap, uFogN, uFogF; uniform vec3 uSun, uFogCol; varying vec3 vW; ${GLSL_H}
      void main(){
        vec2 p = vW.xz; float d = -p.y, dep = max(0., -hgt(p));
        float ph = d * 1.1 + uTime * 1.7 + sin(p.x * .15) * .6;
        float crest = pow(.5 + .5 * sin(ph), 10.);
        float nz = (.5 + .5 * sin(p.x * 4.1 + uTime * .9) * sin(p.y * 3.7 - uTime * 1.3)) * (.6 + .4 * sin(p.x * 11.3 - p.y * 8.1 + uTime)) * (.7 + .3 * sin(p.x * 23. + p.y * 19.));
        if (!gl_FrontFacing) { vec3 cu = vec3(.30, .56, .56) + vec3(.25) * crest * (1. - smoothstep(.35, .8, dep)) + .05 * nz;
          float fu = smoothstep(2., 26., length(vW - cameraPosition)); gl_FragColor = vec4(mix(cu, uFogCol, fu), 1.); return; }
        vec3 shal = vec3(.38, .66, .60), mid = vec3(.10, .40, .44), deep = vec3(.04, .19, .27), sand = vec3(.62, .57, .43);
        float k2 = 1. + uMap;
        vec3 col = mix(shal, mid, smoothstep(.2, .9, dep)); col = mix(col, deep, smoothstep(.9 / k2, 2.4 / k2, dep));
        col = mix(sand, col, smoothstep(0., .3, dep));
        float brk = 1. - smoothstep(.32, .7, dep);
        float foam = (crest * 1.3 + .45) * brk * step(.8, d) + (1. - smoothstep(0., .3, dep)) * (.35 + .65 * pow(.5 + .5 * sin(ph * 1.3), 3.));
        float gx = 1. - smoothstep(.6, 2.6, abs(p.x - ${GX.toFixed(1)})); foam += gx * step(0., d) * (1. - smoothstep(13., 18., d)) * (.35 + .65 * pow(.5 + .5 * sin(ph * 1.6 + p.x), 2.));
        foam = smoothstep(.28, .55, foam * (.5 + .8 * nz));
        float rip = uRip * (1. - smoothstep(1.8, 3.6, abs(p.x - ${RIPX.toFixed(1)}))) * smoothstep(5., 9., d) * (1. - smoothstep(20., 26., d));
        col += rip * vec3(.10, .12, .10) * pow(.5 + .5 * sin((d - uTime * 2.2) * 2.4 + sin(p.x * 1.7)), 4.);
        col = mix(col, vec3(.95, .97, .97), clamp(foam, 0., 1.) * .9);
        vec2 gr = vec2(cos(ph) * .06, .03 * sin(p.x * .8 + uTime)); vec3 n = normalize(vec3(gr.y, 1., gr.x));
        vec3 V = normalize(cameraPosition - vW); float fres = pow(1. - clamp(V.y, 0., 1.), 4.);
        col = mix(col, uFogCol * .95, fres * .35) + pow(max(dot(reflect(-V, n), uSun), 0.), 90.) * .5;
        col = mix(col, uFogCol, smoothstep(uFogN, uFogF, length(vW - cameraPosition)));
        gl_FragColor = vec4(col, smoothstep(0., .06, dep) * step(-1., d));
      }` }));
  scene.add(water);

  // ---- stone groyne at x = GX (and a second one far right)
  const rocks = [];
  for (const gx of [GX, 46]) for (let i = 0; i < 70; i++) { const z = 3 - i * .3 + (r() - .5) * .2, x = gx + (r() - .5) * 1.6, s = .45 + r() * .35;
    rocks.push({ p: V3(x, Math.max(groundY(x, z), -1.4) + s * .35 + .25, z), r: new THREE.Euler(r() * 3, r() * 3, r() * 3), s: V3(1, .8, 1.1).multiplyScalar(s) }); }
  const rockMesh = instances(new THREE.DodecahedronGeometry(1, 0), std(0x6e6a64, { roughness: .95 }), rocks, o => o); rockMesh.castShadow = true; scene.add(rockMesh);

  // ---- dune grass
  const blades = []; for (let i = 0; i < 2600; i++) { const x = (r() - .5) * 220, z = 15 + r() * 22; blades.push({ p: V3(x, groundY(x, z) - .05, z), r: new THREE.Euler((r() - .5) * .4, r() * 6.3, 0), s: V3(1.4, .5 + r() * .7, 1), c: new THREE.Color().setRGB(.55 + r() * .15, .6 + r() * .12, .32) }); }
  scene.add(instances(bladeGeo(.05, 4, .3), addSway(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .9 }), .12), blades, o => o));

  // ---- worm casts (Kothäufchen) on the wet sand
  const coil = mergeGeometries([0, 1, 2].map(k => new THREE.TorusGeometry(.035 - k * .009, .012, 6, 14).rotateX(Math.PI / 2).translate(0, .012 + k * .016, 0)));
  const casts = []; for (let i = 0; i < 70; i++) { const x = -5 + r() * 10, z = .35 + r() * 2.1; casts.push({ p: V3(x, groundY(x, z), z), r: new THREE.Euler(0, r() * 6, 0), s: V3(1, 1, 1).multiplyScalar(.8 + r() * .6) }); }
  const castMesh = instances(coil, std(0xa4906a, { roughness: 1 }), casts, o => o); scene.add(castMesh);

  function setUnder(on) {
    if (on) { scene.fog.color.set(0x2f6a68); scene.fog.near = 0; scene.fog.far = 7.5; fogU.uFogCol.value.set(0x2f6a68); }
    else { scene.fog.color.copy(skyHor); scene.fog.near = 60; scene.fog.far = 260; fogU.uFogCol.value.copy(skyHor); }
    sky.visible = !on;
  }
  return { scene, water, sun, hemi, shadowFocus, setUnder, rockMesh, castMesh, casts };
}

// ---- small beach animals
export function makeWorm() { const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(V3(u * .14, Math.sin(u * 6) * .012, Math.cos(u * 5) * .012)); }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, .007, 6), std(0xc8706a, { roughness: .5 })); return m; }
export function makeShrimp() { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xd8cdb4, roughness: .3, transparent: true, opacity: .8 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 8).scale(2.2, .7, .7), m); g.add(b);
  const t = new THREE.Mesh(new THREE.ConeGeometry(.015, .05, 8).rotateZ(Math.PI / 2), m); t.position.x = -.08; g.add(t);
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(.0015, .0015, .09), m); a.rotation.z = -1.2; a.rotation.y = s * .3; a.position.set(.09, .01, s * .008); g.add(a); }
  return g; }
export function makeCrab() { const g = new THREE.Group(), m = std(0x9a6a3a, { roughness: .6 });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(.05, 14, 10).scale(1.1, .45, .9), m));
  for (const s of [-1, 1]) { for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.005, .004, .07), m); l.position.set(-.02 + i * .025, -.01, s * .055); l.rotation.x = s * 1.0; g.add(l); }
    const cl = new THREE.Mesh(new THREE.SphereGeometry(.018, 10, 8).scale(1.4, .7, 1), m); cl.position.set(.06, 0, s * .04); g.add(cl); }
  return g; }
