// Cross-section of the lake: sky + trees above, warm layer, thermocline line, cold layer, bowl-shaped bottom
import { THREE, V3, std, rng, TIME, LEAF, GLOW, instances, addSway } from './core.js';

// world units: 1 = 1 m of depth. surface y=0, thermocline y=-THERMO, bottom bowl ~ -7
export const THERMO = 2.4;
export const bottomY = x => -7.2 + .045 * x * x + .25 * Math.sin(x * .7);

export function buildSection() {
  const scene = new THREE.Scene(), r = rng(7);
  scene.background = new THREE.Color(0xb7bccb); scene.fog = new THREE.Fog(0xaab0c2, 14, 55);
  scene.add(new THREE.HemisphereLight(0xdde3ee, 0x55603a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0da, 1.6); sun.position.set(8, 20, 12); scene.add(sun);
  // sky backdrop
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(120, 40), new THREE.ShaderMaterial({ depthWrite: false,
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `varying vec2 vU; void main(){ gl_FragColor = vec4(mix(vec3(.42,.45,.53), vec3(.26,.29,.40), vU.y), 1.); }` }));
  sky.position.set(0, 18, -30); scene.add(sky);
  // far bank + trees
  const bank = new THREE.Mesh(new THREE.BoxGeometry(120, .6, 14), std(0x5b6a33)); bank.position.set(0, .05, -14); scene.add(bank);
  const cards = [], trunks = [];
  for (let i = 0; i < 22; i++) {
    const x = -30 + i * 2.9 + (r() - .5) * 1.5, z = -11 - r() * 6, h = 2.6 + r() * 2.2, cr = 1.6 + r() * 1.2;
    trunks.push({ p: V3(x, h / 2, z), s: V3(1, h, 1) });
    for (let k = 0; k < 170; k++) { const a = r() * 6.3, rr = Math.cbrt(r()) * cr; cards.push({ p: V3(x + Math.cos(a) * rr, h + (r() - .4) * cr * 1.2, z + Math.sin(a) * rr * .6), r: new THREE.Euler(r() * 3, r() * 3, r() * 3), s: V3(1, 1, 1).multiplyScalar(.5 + r() * .35), c: new THREE.Color().setRGB(.8 + r() * .3, .9 + r() * .2, .7) }); }
  }
  scene.add(instances(new THREE.CylinderGeometry(.1, .18, 1, 6), std(0x3e3226), trunks, o => o));
  scene.add(instances(new THREE.PlaneGeometry(1, 1), addSway(new THREE.MeshStandardMaterial({ map: LEAF, alphaTest: .45, side: THREE.DoubleSide }), .02, 1), cards, o => o));

  // the water slab (a plane at z=0 with a layered shader)
  const slabM = new THREE.ShaderMaterial({
    uniforms: { uTime: TIME, uReveal: { value: 0 }, uDead: { value: 0 }, uLayers: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform float uTime, uReveal, uDead, uLayers; varying vec3 vP;
      void main(){
        float x = vP.x, y = vP.y, th = -${THERMO.toFixed(2)} + .06 * sin(x * .5 + uTime * .7);
        float by = -7.2 + .045 * x * x + .25 * sin(x * .7);
        vec3 top = vec3(.10,.19,.14), warm = vec3(.06,.135,.11);
        vec3 coldT = vec3(.028,.10,.13), coldB = vec3(.012,.04,.06);
        vec3 one = mix(vec3(.02,.08,.08), vec3(.06,.15,.13), smoothstep(-6., 0., y));          // before the layers appear
        vec3 two = y > th ? mix(warm, top, smoothstep(th, 0., y)) : mix(coldB, coldT, smoothstep(by, th, y));
        vec3 c = mix(one, two, uLayers);
        c += .045 * pow(max(0., sin(x * .9 + y * .45 + uTime * .3)), 12.) * smoothstep(th - 1., 0., y);       // light rays
        float dead = uDead * smoothstep(-3.6, -5.2, y);
        c = mix(c, c * vec3(1.9, .75, .6) + vec3(.03, .0, -.01), dead);
        float line = smoothstep(.07, 0., abs(y - th)) * step(x, mix(-30., 30., uReveal));
        c = mix(c, vec3(.75, .82, .78), line * .95);
        c = mix(c, vec3(.45,.58,.54), smoothstep(.06, 0., abs(y)) * .7);
        if (y < by) c = vec3(.016,.022,.026) + .006 * sin(x * 4. + y * 9.);
        gl_FragColor = vec4(c, 1.);
      }` });
  const slab = new THREE.Mesh(new THREE.PlaneGeometry(80, 14, 1, 1).translate(0, -7, 0), slabM); scene.add(slab);
  // particles in front of the slab, oxygen bubbles (fade below the line when uDead rises)
  const motes = []; for (let i = 0; i < 380; i++) motes.push(V3(-14 + r() * 28, -7 + r() * 7, .2 + r() * 1.5));
  const moteM = new THREE.PointsMaterial({ map: GLOW, size: .07, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending });
  scene.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(motes), moteM));
  const ox = []; for (let i = 0; i < 90; i++) ox.push({ x: -10 + r() * 20, y: -7 + r() * 4.2, ph: r() * 6 });
  const oxG = new THREE.BufferGeometry().setFromPoints(ox.map(o => V3(o.x, o.y, .3)));
  const oxM = new THREE.PointsMaterial({ map: GLOW, size: .16, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }); oxM.color.setRGB(1.2, 1.6, 2);
  scene.add(new THREE.Points(oxG, oxM));
  function update(t) { const pp = oxG.attributes.position; ox.forEach((o, i) => pp.setXYZ(i, o.x + Math.sin(t + o.ph) * .1, o.y + Math.sin(t * .8 + o.ph) * .15, .3)); pp.needsUpdate = true; }
  return { scene, slabM, oxM, update };
}

// Side cutaway of the bank: earth profile on the left, water (cut open) on the right, used for the stomp shot
export function buildBankCut() {
  const scene = new THREE.Scene(), r = rng(3);
  scene.background = new THREE.Color(0xb9bdcb); scene.fog = new THREE.Fog(0xb9bdcb, 9, 34);
  scene.add(new THREE.HemisphereLight(0xdde3ee, 0x4a3a2a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0da, 2.2); sun.position.set(-6, 12, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); scene.add(sun);
  const prof = new THREE.Shape(); prof.moveTo(-20, -8); prof.lineTo(-20, .4); prof.lineTo(-.2, .4); prof.bezierCurveTo(.4, .3, .7, -.7, 1.2, -1.15);
  prof.lineTo(4.2, -1.35); prof.bezierCurveTo(5, -1.5, 5.5, -3.5, 7, -4.6); prof.lineTo(25, -5); prof.lineTo(25, -8); prof.lineTo(-20, -8);
  const earth = new THREE.Mesh(new THREE.ExtrudeGeometry(prof, { depth: 8, bevelEnabled: false }), [std(0x3e2c20, { roughness: 1 }), std(0x4a3626, { roughness: 1 })]);
  earth.position.z = -4; earth.receiveShadow = true; scene.add(earth);
  const turf = new THREE.Mesh(new THREE.BoxGeometry(20, .08, 8), std(0x56712e)); turf.position.set(-10.2, .44, 0); turf.receiveShadow = true; scene.add(turf);
  // grass blades on the turf
  const bl = []; for (let i = 0; i < 1500; i++) { const x = -12 + r() * 12.2, z = -4 + r() * 8, g = r(); bl.push({ p: V3(x, .45, z), r: new THREE.Euler((r() - .5) * .5, r() * 6.3, 0), s: V3(1, .15 + r() * .3 + (x > -1.2 && z < 2 ? .25 : 0), 1), c: new THREE.Color().setRGB(.3 + g * .2, .42 + g * .2, .14) }); }
  scene.add(instances(new THREE.PlaneGeometry(.05, 1, 1, 3).translate(0, .5, 0), addSway(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }), .1), bl, o => o));
  // trees behind
  const cards = [], trunks = [];
  for (let i = 0; i < 14; i++) { const x = -18 + i * 3.4, z = -9 - r() * 6, h = 3 + r() * 2.5, cr = 1.8 + r(); trunks.push({ p: V3(x, h / 2, z), s: V3(1, h, 1) });
    for (let k = 0; k < 170; k++) { const a = r() * 6.3, rr = Math.cbrt(r()) * cr; cards.push({ p: V3(x + Math.cos(a) * rr, h + (r() - .4) * cr, z + Math.sin(a) * rr), r: new THREE.Euler(r() * 3, r() * 3, r() * 3), s: V3(1, 1, 1).multiplyScalar(.5 + r() * .35), c: new THREE.Color().setRGB(.85, .95, .75) }); } }
  scene.add(instances(new THREE.CylinderGeometry(.1, .18, 1, 6), std(0x3e3226), trunks, o => o));
  scene.add(instances(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: LEAF, alphaTest: .45, side: THREE.DoubleSide }), cards, o => o));
  // water: cut-open front + surface
  const front = new THREE.Mesh(new THREE.PlaneGeometry(30, 6).translate(15, -3, 0), new THREE.MeshBasicMaterial({ color: 0x1f6a60, transparent: true, opacity: .55, depthWrite: false }));
  front.position.z = 3.9; scene.add(front);
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(30, 8).translate(15, 0, 0), std(0x2f6f6a, { roughness: .1, metalness: .2, transparent: true, opacity: .8 }));
  surf.rotation.x = -Math.PI / 2; surf.position.set(0, -.02, 0); scene.add(surf);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 6).translate(15, -3, 0), new THREE.MeshBasicMaterial({ color: 0x123c38 })); back.position.z = -3.9; scene.add(back);
  return { scene, sun };
}
