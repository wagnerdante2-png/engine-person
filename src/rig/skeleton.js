import * as THREE from 'three';
import { createRetargetProfile } from './retarget.js';
import { applyIKTargets } from './ik.js';

const d = THREE.MathUtils.degToRad;

export function createHumanoidRig(profile) {
  const H = profile.H;
  const rig = new THREE.Group();
  rig.name = 'HumanoidRig';
  const bones = {};
  const orderedBones = [];
  const add = (name, parent, x, y, z) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(x, y, z);
    bones[name] = bone;
    orderedBones.push(bone);
    parent.add(bone);
    return bone;
  };

  const hips = add('hips', rig, 0, profile.hipY, 0);
  const spine = add('spine', hips, 0, H*.09, 0);
  const chest = add('chest', spine, 0, H*.12, 0);
  const upperChest = add('upperChest', chest, 0, H*.10, 0);
  const neck = add('neck', upperChest, 0, H*.07, 0);
  const head = add('head', neck, 0, H*.10, 0);
  add('jaw', head, 0, -H*.035, H*.035);

  for (const sx of [-1,1]) {
    const s = sx < 0 ? 'L' : 'R';
    const clavicle = add(`clavicle_${s}`, upperChest, sx*profile.shoulderHalf*.55, H*.015, 0);
    const upperArm = add(`upperArm_${s}`, clavicle, sx*profile.shoulderHalf*.45, 0, 0);
    const lowerArm = add(`lowerArm_${s}`, upperArm, sx*H*.012, -H*.16, 0);
    const hand = add(`hand_${s}`, lowerArm, sx*H*.008, -H*.145, H*.004);
    add(`index_${s}`, hand, sx*H*.015, -H*.035, H*.018);
    add(`thumb_${s}`, hand, sx*H*.020, -H*.018, H*.012);
    const upperLeg = add(`upperLeg_${s}`, hips, sx*profile.hipHalf*.55, -H*.025, 0);
    const lowerLeg = add(`lowerLeg_${s}`, upperLeg, 0, -profile.legLen*.50, H*.004);
    const foot = add(`foot_${s}`, lowerLeg, 0, -profile.legLen*.43, 0);
    add(`toe_${s}`, foot, 0, -H*.01, H*.075);
  }

  rig.userData.bones = bones;
  rig.userData.orderedBones = orderedBones;
  rig.userData.profile = profile;
  rig.updateMatrixWorld(true);
  rig.userData.retarget = createRetargetProfile(rig);
  return rig;
}

export function applyPose(rig, pose='relaxed') {
  const b = rig.userData.bones;
  if (!b) return;
  Object.values(b).forEach(x => x.rotation.set(0,0,0));
  if (pose === 'tpose') {
    b.upperArm_L.rotation.z=d(-90); b.upperArm_R.rotation.z=d(90); return;
  }
  if (pose === 'apose') {
    b.upperArm_L.rotation.z=d(-48); b.upperArm_R.rotation.z=d(48); return;
  }
  if (pose === 'hero') {
    b.upperArm_L.rotation.z=d(-18); b.upperArm_R.rotation.z=d(18);
    b.lowerArm_L.rotation.x=d(-12); b.lowerArm_R.rotation.x=d(-12);
    b.chest.rotation.x=d(-3); return;
  }
  if (pose === 'contrapposto') {
    b.hips.rotation.z=d(4); b.chest.rotation.z=d(-3);
    b.upperLeg_L.rotation.z=d(-3); b.upperLeg_R.rotation.z=d(2);
    b.upperArm_L.rotation.z=d(-7); b.upperArm_R.rotation.z=d(9); return;
  }
  b.upperArm_L.rotation.z=d(-6); b.upperArm_R.rotation.z=d(6);
}

export function createPoseController(rig, options={}) {
  const b = rig.userData.bones;
  const mode = options.animation ?? 'idle';
  const speed = options.animationSpeed ?? 1;
  const strength = options.animationStrength ?? .55;
  applyPose(rig, options.pose ?? 'relaxed');
  const baseHipY = rig.userData.profile?.hipY ?? 0;
  return time => {
    if (!b) return;
    if (mode !== 'off') {
      const t = time * speed;
      if (mode === 'idle' || mode === 'breathing') {
        b.chest.rotation.x = Math.sin(t*1.5)*.016*strength;
        b.upperChest.rotation.z = Math.sin(t*.55)*.008*strength;
        b.head.rotation.y = Math.sin(t*.43)*.025*strength;
      } else if (mode === 'walk') {
        const stride = Math.sin(t*5.2)*.48*strength;
        b.upperLeg_L.rotation.x=stride; b.upperLeg_R.rotation.x=-stride;
        b.lowerLeg_L.rotation.x=Math.max(0,-stride)*.72; b.lowerLeg_R.rotation.x=Math.max(0,stride)*.72;
        b.upperArm_L.rotation.x=-stride*.68; b.upperArm_R.rotation.x=stride*.68;
        b.hips.position.y=baseHipY+Math.abs(Math.sin(t*5.2))*.012*strength;
      } else if (mode === 'run') {
        const stride = Math.sin(t*7.8)*.72*strength;
        b.upperLeg_L.rotation.x=stride; b.upperLeg_R.rotation.x=-stride;
        b.lowerLeg_L.rotation.x=Math.max(0,-stride)*1.0; b.lowerLeg_R.rotation.x=Math.max(0,stride)*1.0;
        b.upperArm_L.rotation.x=-stride*.85; b.upperArm_R.rotation.x=stride*.85;
        b.chest.rotation.x=d(-7)*strength;
        b.hips.position.y=baseHipY+Math.abs(Math.sin(t*7.8))*.020*strength;
      }
    }
    applyIKTargets(rig, options);
  };
}

export function createRigHelper(rig, visible=false) {
  const helper = new THREE.SkeletonHelper(rig);
  helper.visible = visible;
  helper.material.depthTest = false;
  helper.renderOrder = 50;
  helper.name = 'RigHelper';
  return helper;
}
