// A simple gull: white body, grey wings with black tips, flapping
import { THREE, std } from './core.js';
const white = std(0xf2f2ee, { roughness: .7 }), grey = std(0xaab0b8, { roughness: .8, side: THREE.DoubleSide }), black = std(0x1e1e1e, { side: THREE.DoubleSide }), beak = std(0xe8b23a);
function wingGeo(side) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(.18 * side, .02); s.lineTo(.62 * side, -.06); s.lineTo(.85 * side, -.2); s.lineTo(.45 * side, -.22); s.lineTo(0, -.18);
  const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); return g;
}
export function makeGull() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), white); body.scale.set(.11, .1, .3); root.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 8), white); head.position.set(0, .06, -.3); root.add(head);
  const b = new THREE.Mesh(new THREE.ConeGeometry(.02, .09, 6), beak); b.rotation.x = -Math.PI / 2; b.position.set(0, .05, -.41); root.add(b);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 4), white); tail.rotation.x = Math.PI / 2; tail.position.z = .32; tail.scale.set(1, 1, .3); root.add(tail);
  const wings = [];
  for (const side of [1, -1]) {
    const piv = new THREE.Group(); piv.position.set(.08 * side, .04, -.05); root.add(piv);
    const w = new THREE.Mesh(wingGeo(side), grey); piv.add(w);
    const tip = new THREE.Mesh(new THREE.PlaneGeometry(.2, .12).rotateX(-Math.PI / 2), black); tip.position.set(.74 * side, -.0, .14); piv.add(tip);
    wings.push({ piv, side });
  }
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  function flap(t, amp = .7, rate = 6) { wings.forEach(({ piv, side }) => { piv.rotation.z = side * Math.sin(t * rate) * amp; }); }
  function fold(k) { wings.forEach(({ piv, side }) => { piv.rotation.z = side * -.2 * k; piv.rotation.y = side * 1.1 * k; }); }
  root.scale.setScalar(2.2);
  return { root, flap, fold };
}
