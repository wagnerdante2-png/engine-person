import * as THREE from 'three';

const clamp01 = v => THREE.MathUtils.clamp(v, 0, 1);

function makeTarget(geometry, selector, deltaFn) {
  const base = geometry.attributes.position;
  const target = new Float32Array(base.array.length);
  const p = new THREE.Vector3();
  const d = new THREE.Vector3();
  for (let i = 0; i < base.count; i++) {
    p.fromBufferAttribute(base, i);
    const w = clamp01(selector(p));
    d.copy(p);
    if (w > 0) deltaFn(p, d, w);
    target[i * 3] = d.x;
    target[i * 3 + 1] = d.y;
    target[i * 3 + 2] = d.z;
  }
  return new THREE.Float32BufferAttribute(target, 3);
}

function bell(v, center, radius) {
  const x = Math.abs(v - center) / Math.max(radius, 1e-5);
  return x >= 1 ? 0 : .5 + .5 * Math.cos(Math.PI * x);
}

export function prepareCorrectiveMorphs(mesh, profile) {
  if (!mesh?.isSkinnedMesh || !mesh.geometry?.attributes?.position) return null;
  const g = mesh.geometry;
  if (g.userData.correctivesPrepared) return g.userData.correctives;

  const H = profile.H;
  const hipY = profile.hipY;
  const shoulderY = profile.shoulderY;
  const kneeY = hipY - profile.legLen * .50;
  const elbowY = shoulderY - H * .16;
  const name = mesh.name || '';
  const morphs = [];
  const keys = [];

  const add = (key, selector, deltaFn) => {
    morphs.push(makeTarget(g, selector, deltaFn));
    keys.push(key);
  };

  if (/Torso|Garment|UpperArm/i.test(name)) {
    add('shoulderVolume', p => bell(p.y, shoulderY - H * .015, H * .085), (p, d, w) => {
      const side = Math.sign(p.x || 1);
      const lateral = Math.max(0, Math.abs(p.x) - profile.shoulderHalf * .38);
      d.x += side * H * .012 * w * (1 + lateral / Math.max(H * .08, 1e-5));
      d.z += H * .007 * w;
    });
  }

  if (/UpperArm|Forearm/i.test(name)) {
    add('elbowFlex', p => bell(p.y, elbowY, H * .07), (p, d, w) => {
      d.z += H * .011 * w;
      d.y += H * .004 * w;
    });
  }

  if (/Thigh|Calf|Pelvis/i.test(name)) {
    add('kneeFlex', p => bell(p.y, kneeY, H * .075), (p, d, w) => {
      d.z += H * .013 * w;
      d.y -= H * .003 * w;
    });
  }

  if (/Pelvis|Thigh/i.test(name)) {
    add('hipFlex', p => bell(p.y, hipY - H * .025, H * .10), (p, d, w) => {
      d.z += H * .010 * w;
      d.x *= 1 + .018 * w;
    });
  }

  if (!morphs.length) return null;
  g.morphAttributes.position = morphs;
  mesh.updateMorphTargets();
  const map = Object.fromEntries(keys.map((key, index) => [key, index]));
  g.userData.correctivesPrepared = true;
  g.userData.correctives = map;
  mesh.userData.correctives = map;
  return map;
}

export function createCorrectiveController(meshes, rig, profile, options = {}) {
  const strength = clamp01(options.correctiveStrength ?? .8);
  const records = meshes.map(mesh => ({ mesh, map: prepareCorrectiveMorphs(mesh, profile) })).filter(x => x.map);
  const b = rig?.userData?.bones ?? {};

  const angle = bone => bone ? Math.abs(bone.rotation.x) + Math.abs(bone.rotation.z) * .35 : 0;
  const set = (record, key, value) => {
    const i = record.map[key];
    if (i == null || !record.mesh.morphTargetInfluences) return;
    record.mesh.morphTargetInfluences[i] = clamp01(value * strength);
  };

  return () => {
    const elbow = Math.max(angle(b.lowerArm_L), angle(b.lowerArm_R));
    const knee = Math.max(angle(b.lowerLeg_L), angle(b.lowerLeg_R));
    const hip = Math.max(angle(b.upperLeg_L), angle(b.upperLeg_R));
    const shoulder = Math.max(angle(b.upperArm_L), angle(b.upperArm_R));
    for (const record of records) {
      set(record, 'elbowFlex', elbow / 1.45);
      set(record, 'kneeFlex', knee / 1.55);
      set(record, 'hipFlex', hip / 1.35);
      set(record, 'shoulderVolume', shoulder / 1.45);
    }
  };
}
