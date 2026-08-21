import * as THREE from 'three';
import { createRetargetProfile } from './retarget.js';
import { applyIKTargets } from './ik.js';

const d = THREE.MathUtils.degToRad;

function addFingerChain(add, hand, side, name, H, baseX, baseZ, curlBias=0) {
  const sx = side === 'L' ? -1 : 1;
  const root = add(`${name}_1_${side}`, hand, sx*baseX, -H*.020, baseZ);
  const mid = add(`${name}_2_${side}`, root, 0, -H*.022, H*.002);
  const tip = add(`${name}_3_${side}`, mid, 0, -H*.019, H*.001);
  root.userData.curlBias = curlBias;
  return [root, mid, tip];
}

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

    addFingerChain(add, hand, s, 'thumb', H, .014, .010, .15);
    addFingerChain(add, hand, s, 'index', H, .010, .020, 0);
    addFingerChain(add, hand, s, 'middle', H, .003, .022, .03);
    addFingerChain(add, hand, s, 'ring', H, -.004, .020, .07);
    addFingerChain(add, hand, s, 'pinky', H, -.010, .016, .11);

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

export function applyHandPose(rig, pose='relaxed', strength=1) {
  const b = rig.userData.bones;
  const presets = {
    open:[0,0,0,0,0], relaxed:[.16,.11,.14,.18,.24], fist:[.72,.95,1,1,.96], grip:[.58,.80,.86,.90,.88], point:[.65,0,.82,.90,.92]
  };
  const values = presets[pose] ?? presets.relaxed;
  const names = ['thumb','index','middle','ring','pinky'];
  for (const side of ['L','R']) {
    names.forEach((name, fi) => {
      const curl = values[fi] * strength;
      for (let i=1;i<=3;i++) {
        const bone = b[`${name}_${i}_${side}`];
        if (!bone) continue;
        bone.rotation.x = d((name==='thumb'?48:70) * curl * (i===1?.72:i===2?.95:1.05));
        if (name === 'thumb' && i === 1) bone.rotation.z = d((side==='L'?-1:1) * 28 * curl);
      }
    });
  }
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
  applyHandPose(rig, options.handPose ?? 'relaxed', options.handCurlStrength ?? 1);
  const baseHipY = rig.userData.profile?.hipY ?? 0;
  return time => {
    if (!b) return;
    if (mode !== 'off') {
      const t = time * speed;
      if (mode === 'idle' || mode === 'breathing') {
        b.chest.rotation.x = Math.sin(t*1.5)*.016*strength;
        b.upperChest.rotation.z = Math.sin(t*.55)*.008*strength;
        b.head.rotation.y = Math.sin(t*.43)*.025*strength;
        const micro = .04 + Math.max(0, Math.sin(t*.31))*.025;
        applyHandPose(rig, options.handPose ?? 'relaxed', (options.handCurlStrength ?? 1) * (1 + micro*strength));
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
