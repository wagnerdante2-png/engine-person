import * as THREE from 'three';

const mat = (color, roughness = 0.72, metalness = 0.0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

function capsule(radius, length, material, radial = 20) {
  const g = new THREE.CapsuleGeometry(radius, Math.max(0.001, length), 8, radial);
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function sphere(rx, ry, rz, material, seg = 32) {
  const g = new THREE.SphereGeometry(1, seg, Math.max(16, seg / 2));
  g.scale(rx, ry, rz);
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function place(group, mesh, x, y, z, rx = 0, ry = 0, rz = 0) {
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
}

function createHair(h, headY, headR, hairMaterial) {
  const hair = new THREE.Group();
  if (h.hairStyle === 'short') {
    place(hair, sphere(headR * 1.04, headR * 0.72, headR * 1.03, hairMaterial, 28), 0, headY + headR * .28, -headR * .05);
  } else if (h.hairStyle === 'bob') {
    place(hair, sphere(headR * 1.08, headR * 1.18, headR * 1.08, hairMaterial, 28), 0, headY - headR * .08, -headR * .06);
  } else {
    place(hair, sphere(headR * 1.07, headR * .78, headR * 1.05, hairMaterial, 28), 0, headY + headR * .26, -headR * .05);
    const side = capsule(headR * .30, headR * 1.45, hairMaterial, 16);
    place(hair, side, -headR * .78, headY - headR * .54, -headR * .02, 0.08, 0, -0.08);
    const back = capsule(headR * .42, headR * 1.55, hairMaterial, 16);
    place(hair, back, headR * .16, headY - headR * .58, -headR * .62, -0.02, 0, 0.06);
  }
  return hair;
}

export function generateHuman(h) {
  const root = new THREE.Group();
  root.name = 'ProceduralHuman';

  const H = h.height;
  const female = h.sex === 'female';
  const skin = mat(h.skin, .58, 0.0);
  const hairMat = mat(h.hair, .76, 0.0);
  const eyeWhite = mat('#f4f4ef', .35);
  const iris = mat(h.eyes, .32);
  const topMat = mat(h.topColor, .82);
  const bottomMat = mat(h.bottomColor, .86);
  const shoeMat = mat('#121318', .58, .08);

  const headR = H * 0.083 * h.headScale;
  const legLen = H * 0.455 * h.legLength;
  const torsoLen = H * 0.285 * h.torsoLength;
  const hipY = legLen;
  const chestY = hipY + torsoLen * .60;
  const shoulderY = hipY + torsoLen;
  const neckY = shoulderY + H * .035;
  const headY = neckY + headR * 1.10;
  const shoulderHalf = H * 0.115 * h.shoulderWidth * (female ? .94 : 1.06);
  const hipHalf = H * 0.085 * h.hipWidth * (female ? 1.06 : .96);
  const mass = h.bodyMass;
  const limbR = H * .030 * mass;

  // Torso and pelvis volumes.
  place(root, sphere(shoulderHalf * .92, torsoLen * .48, H * .075 * mass, topMat, 36), 0, chestY, 0);
  place(root, sphere(hipHalf, H * .095, H * .072 * mass, bottomMat, 32), 0, hipY + H * .055, 0);

  // Neck.
  place(root, capsule(H * .027 * mass, H * .035, skin, 20), 0, neckY, 0);

  // Head shell.
  const head = sphere(headR * h.faceWidth, headR * 1.12, headR * .93, skin, 40);
  place(root, head, 0, headY, 0);

  // Jaw/chin overlay to make silhouette responsive to jaw parameter.
  place(root, sphere(headR * .62 * h.jawWidth, headR * .43, headR * .75, skin, 32), 0, headY - headR * .63, headR * .05);

  // Nose.
  const nose = new THREE.Mesh(new THREE.ConeGeometry(headR * .13 * h.noseScale, headR * .33 * h.noseScale, 16), skin);
  nose.rotation.x = Math.PI / 2;
  place(root, nose, 0, headY - headR * .07, headR * .91, Math.PI / 2);

  // Eyes.
  const eyeY = headY + headR * .12;
  const eyeX = headR * .38;
  for (const sx of [-1, 1]) {
    place(root, sphere(headR * .17 * h.eyeScale, headR * .10 * h.eyeScale, headR * .07, eyeWhite, 20), sx * eyeX, eyeY, headR * .86);
    place(root, sphere(headR * .075 * h.eyeScale, headR * .075 * h.eyeScale, headR * .035, iris, 18), sx * eyeX, eyeY, headR * .925);
  }

  // Hair system placeholder with modular styles.
  root.add(createHair(h, headY, headR, hairMat));

  // Legs.
  const upperLeg = legLen * .49;
  const lowerLeg = legLen * .43;
  const kneeY = hipY - upperLeg * .52;
  const ankleY = H * .065;
  const legX = hipHalf * .56;
  for (const sx of [-1, 1]) {
    const thigh = capsule(limbR * 1.25, upperLeg * .72, bottomMat, 24);
    place(root, thigh, sx * legX, hipY - upperLeg * .45, 0, 0, 0, 0);
    const calf = capsule(limbR * 1.03, lowerLeg * .76, skin, 22);
    place(root, calf, sx * legX, kneeY - lowerLeg * .55, 0);
    const foot = sphere(H * .047, H * .028, H * .085, shoeMat, 24);
    place(root, foot, sx * legX, ankleY * .48, H * .047);
  }

  // Arms.
  const armLen = H * .325 * h.armLength;
  const upperArm = armLen * .49;
  const foreArm = armLen * .43;
  for (const sx of [-1, 1]) {
    const armX = sx * (shoulderHalf + limbR * 1.12);
    const upper = capsule(limbR * .82, upperArm * .72, topMat, 20);
    place(root, upper, armX, shoulderY - upperArm * .47, 0, 0, 0, sx * -0.035);
    const fore = capsule(limbR * .72, foreArm * .76, skin, 20);
    place(root, fore, armX + sx * H * .006, shoulderY - upperArm - foreArm * .42, 0, 0, 0, sx * -0.02);
    place(root, sphere(limbR * .77, limbR * 1.15, limbR * .56, skin, 20), armX + sx * H * .009, shoulderY - upperArm - foreArm * .92, 0);
  }

  // Outfit variations stay topology-independent.
  if (h.outfit === 'jacket') {
    const jacket = sphere(shoulderHalf * .99, torsoLen * .50, H * .081 * mass, mat('#2b313d', .66), 32);
    place(root, jacket, 0, chestY, -H * .006);
  } else if (h.outfit === 'formal') {
    const coat = sphere(shoulderHalf * .98, torsoLen * .53, H * .078 * mass, mat('#111827', .62), 32);
    place(root, coat, 0, chestY - H * .01, 0);
  }

  root.userData.stats = {
    height: H,
    mode: 'procedural-human',
    parts: root.children.length
  };
  return root;
}