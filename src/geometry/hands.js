import * as THREE from 'three';

const capsule = (radius, length, material, radial = 12) => {
  const g = new THREE.CapsuleGeometry(radius, Math.max(.001, length - radius * 2), 5, radial);
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

export function createDetailedHandGeometry(profile, side, material, options = {}) {
  const H = profile.H;
  const sx = side === 'L' ? -1 : 1;
  const scale = options.handScale ?? 1;
  const fingerLength = options.fingerLength ?? 1;
  const palmW = H * .028 * scale;
  const palmH = H * .050 * scale;
  const palmD = H * .017 * scale;

  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), material);
  palm.geometry.scale(palmW, palmH, palmD);
  palm.name = `Palm_${side}`;
  palm.castShadow = true;
  palm.receiveShadow = true;

  const fingerDefs = [
    ['thumb', .86, -.62, .15],
    ['index', 1.02, -.35, .52],
    ['middle', 1.10, -.12, .58],
    ['ring', 1.02, .12, .54],
    ['pinky', .84, .36, .42]
  ];

  const attachments = [{ mesh: palm, bone: `hand_${side}`, localOffset:[0, -H*.018, H*.004] }];
  for (const [name, lenMul, lateral, forward] of fingerDefs) {
    const total = H * .064 * lenMul * fingerLength * scale;
    const r = H * (name === 'thumb' ? .0068 : .0055) * scale;
    const phalanx = [0.38, 0.34, 0.28];
    let accum = 0;
    for (let i = 0; i < 3; i++) {
      const segLen = total * phalanx[i];
      const mesh = capsule(r * (1 - i * .10), segLen, material, 10);
      mesh.name = `${name}_${i + 1}_${side}_mesh`;
      mesh.rotation.z = sx * (name === 'thumb' ? -.52 : 0);
      attachments.push({
        mesh,
        bone:`${name}_${i + 1}_${side}`,
        localOffset:[sx * H * .004 * lateral, -segLen * .48, H * .006 * forward + accum * .06]
      });
      accum += segLen;
    }
  }

  return attachments;
}
