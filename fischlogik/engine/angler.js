// The angler: a doll-like figure (no face), seen mostly from behind. 2-bone IK for arms and legs.
import { THREE, V3, std, limb, ball, span, logoTex, lerp, keys, eio } from './core.js';

const M = {
  vest: std(0x3e5236, { roughness: .9 }), sleeve: std(0xc4532f, { roughness: .8 }), pants: std(0x232b3a, { roughness: .9 }),
  skin: std(0x6b4a33, { roughness: .7 }), boot: std(0x1a1a1c, { roughness: .6 }), hat: std(0xb99a5e, { roughness: .9 }),
  band: std(0x4a3524), rod: std(0x1d1d1f, { roughness: .4, metalness: .3 }), reel: std(0x8a8f96, { metalness: .6, roughness: .35 }),
};
const L = { upArm: .30, foreArm: .29, thigh: .45, shin: .45, rod: 2.5 };

function ik(S, T, l1, l2, pole) {   // returns elbow/knee position
  const d = T.clone().sub(S), dist = Math.min(d.length(), l1 + l2 - 1e-3), dir = d.normalize();
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  return S.clone().add(dir.multiplyScalar(a)).add(p.multiplyScalar(h));
}

export const POSES = {
  idle:     { pelvis: .95, lean: .04, handR: V3(.22, 1.12, -.36), handL: V3(.0, 1.0, -.30), rod: V3(.05, .62, -1), footR: V3(.14, .06, .02), footL: V3(-.14, .06, -.06), head: 0 },
  castBack: { pelvis: .95, lean: -.08, handR: V3(.26, 1.62, -.02), handL: V3(.06, 1.40, -.16), rod: V3(.05, .45, 1), footR: V3(.14, .06, .1), footL: V3(-.14, .06, -.12), head: 0 },
  castFwd:  { pelvis: .93, lean: .18, handR: V3(.2, 1.28, -.58), handL: V3(.0, 1.12, -.48), rod: V3(.02, .12, -1), footR: V3(.14, .06, .12), footL: V3(-.14, .06, -.2), head: 0 },
  stompUp:  { pelvis: .97, lean: .02, handR: V3(.32, 1.0, -.15), handL: V3(-.32, 1.0, -.1), rod: V3(.3, .9, -.4), footR: V3(.16, .42, -.28), footL: V3(-.14, .06, .0), head: 0 },
  stompDn:  { pelvis: .90, lean: .1, handR: V3(.34, 1.05, -.1), handL: V3(-.34, 1.05, -.05), rod: V3(.3, .9, -.4), footR: V3(.16, .06, -.3), footL: V3(-.14, .06, .0), head: 0 },
  walkA:    { pelvis: .96, lean: .05, handR: V3(.28, .95, .1), handL: V3(-.28, .95, -.12), rod: V3(.3, .9, -.4), footR: V3(.14, .1, -.25), footL: V3(-.14, .06, .2), head: 0 },
  hold:     { pelvis: .95, lean: .06, handR: V3(.24, 1.08, -.38), handL: V3(.04, 1.02, -.34), rod: V3(.04, .32, -1), footR: V3(.14, .06, .02), footL: V3(-.14, .06, -.06), head: 0 },
  walkB:    { pelvis: .96, lean: .05, handR: V3(.28, .95, -.12), handL: V3(-.28, .95, .1), rod: V3(.3, .9, -.4), footR: V3(.14, .06, .2), footL: V3(-.14, .1, -.25), head: 0 },
};
export function blendPose(a, b, u) {
  const o = {}; for (const k in a) o[k] = typeof a[k] === 'number' ? lerp(a[k], b[k], u) : a[k].clone().lerp(b[k], u); return o;
}

export function makeAngler(logoImg) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const torso = ball(1, M.vest); torso.scale.set(.29, .38, .21); body.add(torso);
  const belly = ball(1, M.pants); belly.scale.set(.25, .14, .19); body.add(belly);
  const neck = limb(.065, M.skin); body.add(neck);
  const head = ball(.165, M.skin); body.add(head);
  const hat = new THREE.Group(); head.add(hat); hat.position.y = .12;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .025, 28), M.hat); brim.castShadow = true; hat.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(.17, .19, .13, 24), M.hat); crown.position.y = .07; crown.castShadow = true; hat.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.192, .192, .035, 24), M.band); band.position.y = .03; hat.add(band);
  // back logo: a curved patch on the vest
  const logo = new THREE.Mesh(new THREE.CylinderGeometry(.215, .215, .3, 24, 1, true, -.75, 1.5),
    new THREE.MeshStandardMaterial({ map: logoTex(logoImg), transparent: true, roughness: .9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  body.add(logo);
  const parts = {};
  for (const s of ['R', 'L']) {
    parts['up' + s] = limb(.078, M.sleeve, .085); parts['fo' + s] = limb(.064, M.sleeve, .074); parts['hand' + s] = ball(.065, M.skin);
    parts['el' + s] = ball(.075, M.sleeve); parts['sh' + s] = ball(.1, M.sleeve);
    parts['th' + s] = limb(.1, M.pants, .115); parts['sn' + s] = limb(.085, M.pants, .095); parts['kn' + s] = ball(.1, M.pants);
    parts['boot' + s] = new THREE.Mesh(new THREE.BoxGeometry(.15, .1, .28), M.boot); parts['boot' + s].castShadow = true;
  }
  Object.values(parts).forEach(p => root.add(p));
  const rod = new THREE.Group(); root.add(rod);
  const blank = new THREE.Mesh(new THREE.CylinderGeometry(.008, .022, L.rod, 8), M.rod); blank.position.y = L.rod / 2 - .35; blank.castShadow = true; rod.add(blank);
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .05, 14), M.reel); reel.rotation.z = Math.PI / 2; reel.position.set(.05, -.12, 0); rod.add(reel);
  const tip = new THREE.Object3D(); tip.position.y = L.rod - .35; rod.add(tip);
  // reel crank: arm + knob, spins around the reel axis (local x of the rod)
  const crank = new THREE.Group(); crank.position.set(.05, -.12, .045); rod.add(crank);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(.012, .085, .012), M.reel); arm.position.y = .04; crank.add(arm);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .04, 10), std(0x222222)); knob.rotation.x = Math.PI / 2; knob.position.set(0, .08, .02); crank.add(knob);

  function apply(P, t = 0) {
    const pel = V3(0, P.pelvis, 0), lean = P.lean, breathe = .006 * Math.sin(t * 2.2);
    const chest = V3(0, P.pelvis + .45 + breathe, -lean * .5), neckB = V3(0, P.pelvis + .66 + breathe, -lean * .7);
    torso.position.set(0, P.pelvis + .36 + breathe, -lean * .35); torso.rotation.x = -lean;
    belly.position.set(0, P.pelvis + .04, 0);
    logo.position.copy(torso.position).add(V3(0, .04, .0)); logo.rotation.set(-lean, 0, 0);
    span(neck, neckB, neckB.clone().add(V3(0, .14, -lean * .1)));
    head.position.copy(neckB).add(V3(0, .26, -lean * .15)); head.rotation.y = P.head;
    for (const [s, sx] of [['R', 1], ['L', -1]]) {
      const sh = V3(sx * .3, P.pelvis + .56 + breathe, -lean * .55), hand = P['hand' + s];
      const el = ik(sh, hand, L.upArm, L.foreArm, V3(sx * .6, -1, .5));
      parts['sh' + s].position.copy(sh); span(parts['up' + s], sh, el); parts['el' + s].position.copy(el); span(parts['fo' + s], el, hand); parts['hand' + s].position.copy(hand);
      const hip = V3(sx * .12, P.pelvis, 0), foot = P['foot' + s];
      const kn = ik(hip, foot.clone().add(V3(0, .06, 0)), L.thigh, L.shin, V3(0, 0, -1));
      span(parts['th' + s], hip, kn); parts['kn' + s].position.copy(kn); span(parts['sn' + s], kn, foot.clone().add(V3(0, .06, 0)));
      parts['boot' + s].position.copy(foot).add(V3(0, 0, -.05));
    }
    rod.position.copy(P.handR); rod.quaternion.setFromUnitVectors(V3(0, 1, 0), P.rod.clone().normalize());
    root.updateMatrixWorld(true);
  }
  const tipWorld = () => tip.getWorldPosition(new THREE.Vector3());
  return { root, apply, tipWorld, head, rod, crank };
}

// a full cast as keyframes: wind-up, whip, follow-through. Returns pose at time u (seconds since start)
export function castPose(u) {
  const P = POSES;
  if (u < 0) return P.idle;
  if (u < .45) return blendPose(P.idle, P.castBack, eio(u / .45));
  if (u < .62) return blendPose(P.castBack, P.castFwd, eio((u - .45) / .17));
  if (u < 1.4) return blendPose(P.castFwd, P.idle, eio((u - .62) / .78) * .6);
  return blendPose(P.castFwd, P.idle, .6);
}
export function walkPose(u, speed = 1.6) {   // cyclic walk
  const k = .5 + .5 * Math.sin(u * speed * Math.PI);
  return blendPose(POSES.walkA, POSES.walkB, k);
}
