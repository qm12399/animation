// Close-up pike head: duck-bill snout, hinged lower jaw, rows of needle teeth. Nose points +x.
import { THREE, V3, std, rng, instances } from './core.js';

function paint(g, fn) { const p = g.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), col); c.set([col.r, col.g, col.b], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; }
const skin = (x, y, z, c) => { const up = y > 0 ? 1 : 0; c.set(0x5b7030).lerp(new THREE.Color(0x2c3a1c), up * .7).lerp(new THREE.Color(0xd9d6b0), y < -.05 ? .8 : 0);
  if (Math.sin(x * 38 + y * 9) * Math.sin(z * 41 - x * 7) > .55 && y > -.05) c.lerp(new THREE.Color(0xd8d49a), .7); };

export function makePikeJaw() {
  const root = new THREE.Group(), r = rng(700);
  const skinM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .1 }), mouthM = std(0x6a1e22, { roughness: .6, side: THREE.DoubleSide });
  const toothM = new THREE.MeshStandardMaterial({ color: 0xf4f0e2, roughness: .25, metalness: .05 });
  // upper head: flattened half-ellipsoid stretched along x
  const up = new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2); up.scale(1.0, .22, .32); paint(up, skin);
  const upper = new THREE.Mesh(up, skinM); root.add(upper);
  const palate = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(Math.PI / 2).scale(.98, 1, .3), mouthM); palate.position.y = -.002; root.add(palate);
  // body behind the head
  const body = new THREE.Mesh(paint(new THREE.SphereGeometry(1, 32, 20).scale(1.4, .38, .36), skin), skinM); body.position.x = -1.5; root.add(body);
  // eyes
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), std(0xd8b44a, { roughness: .2 })); e.position.set(-.35, .12, .24 * s); root.add(e);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(.04, 12, 8), std(0x111111, { roughness: .1 })); pu.position.set(-.31, .13, .29 * s); root.add(pu); }
  // lower jaw on a hinge at the back
  const hinge = new THREE.Group(); hinge.position.set(-.85, -.02, 0); root.add(hinge);
  const lo = new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); lo.scale(.98, .2, .3); paint(lo, skin);
  const lower = new THREE.Mesh(lo, skinM); lower.position.x = .85; hinge.add(lower);
  const tongue = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2).scale(.95, 1, .28), mouthM); tongue.position.set(.85, .002, 0); hinge.add(tongue);
  // teeth: needle cones along the jaw rims + palate rows (~ a few hundred instances)
  const cone = new THREE.ConeGeometry(.012, .06, 6).translate(0, .03, 0);
  const upT = [], loT = [];
  for (let i = 0; i < 70; i++) { const u = i / 69, a = (u * 2 - 1) * Math.PI * .5, x = Math.cos(a) * .96, z = Math.sin(a) * .29 * (x > 0 ? 1 : 1);
    const s = .6 + (1 - Math.abs(u - .5) * 2) * .3 + r() * .4;
    loT.push({ p: V3(x, 0, z), r: new THREE.Euler(0, 0, 0), s: V3(1, s * (x > .5 ? 1.5 : 1), 1) });
    upT.push({ p: V3(x, 0, z * .92), r: new THREE.Euler(Math.PI, 0, 0), s: V3(1, s * .8, 1) }); }
  for (let row = 0; row < 4; row++) for (let i = 0; i < 40; i++) { const x = .9 - i * .042, z = (row - 1.5) * .07 + (r() - .5) * .01; if (Math.abs(z) > .26 * Math.sqrt(Math.max(0, 1 - x * x))) continue; upT.push({ p: V3(x, -.003, z), r: new THREE.Euler(Math.PI + .3, 0, 0), s: V3(.7, .55 + r() * .3, .7) }); }
  root.add(instances(cone, toothM, upT, o => o));
  const lowTeeth = instances(cone, toothM, loT, o => o); lowTeeth.position.x = .85; hinge.add(lowTeeth);
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  function open(a) { hinge.rotation.z = -a; }
  return { root, open, hinge };
}

// leader as a 3D tube through world points (rebuilt each frame; cheap for ~30 points)
export function makeLeader(kind) {
  const mat = kind === 'fluoro' ? new THREE.MeshPhysicalMaterial({ color: 0xe8f4f4, roughness: .05, transmission: .85, transparent: true, opacity: .35, thickness: .01 })
    : kind === 'thick' ? new THREE.MeshPhysicalMaterial({ color: 0xe0eef0, roughness: .1, transmission: .6, transparent: true, opacity: .6 })
    : new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: .35, metalness: .9 });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat); mesh.frustumCulled = false;
  const radius = kind === 'thick' ? .012 : kind === 'steel' ? .0045 : .003;
  function set(pts) { mesh.geometry.dispose(); mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, radius, 6, false); }
  return { mesh, set, radius };
}
