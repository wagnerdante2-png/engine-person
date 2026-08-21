import * as THREE from 'three';

export const HUMANOID_RETARGET_MAP = {
  hips:'hips', spine:'spine', chest:'chest', upperChest:'upperChest', neck:'neck', head:'head',
  leftShoulder:'clavicle_L', leftUpperArm:'upperArm_L', leftLowerArm:'lowerArm_L', leftHand:'hand_L',
  rightShoulder:'clavicle_R', rightUpperArm:'upperArm_R', rightLowerArm:'lowerArm_R', rightHand:'hand_R',
  leftUpperLeg:'upperLeg_L', leftLowerLeg:'lowerLeg_L', leftFoot:'foot_L', leftToes:'toe_L',
  rightUpperLeg:'upperLeg_R', rightLowerLeg:'lowerLeg_R', rightFoot:'foot_R', rightToes:'toe_R'
};

export function createRetargetProfile(rig) {
  const bones=rig.userData.bones ?? {};
  const profile={ version:1, convention:'engine-person-humanoid', map:{...HUMANOID_RETARGET_MAP}, rest:{} };
  for (const [semantic,name] of Object.entries(profile.map)) {
    const bone=bones[name];
    if (!bone) continue;
    profile.rest[semantic]={
      position:bone.position.toArray(),
      quaternion:bone.quaternion.toArray(),
      scale:bone.scale.toArray()
    };
  }
  return profile;
}

export function applyRetargetPose(rig, poseData={}, weight=1) {
  const bones=rig.userData.bones ?? {};
  const map=rig.userData.retarget?.map ?? HUMANOID_RETARGET_MAP;
  const w=THREE.MathUtils.clamp(weight,0,1);
  for (const [semantic,transform] of Object.entries(poseData)) {
    const name=map[semantic] ?? semantic;
    const bone=bones[name];
    if (!bone || !transform) continue;
    if (transform.quaternion) {
      const q=new THREE.Quaternion().fromArray(transform.quaternion);
      bone.quaternion.slerp(q,w);
    } else if (transform.rotation) {
      const e=new THREE.Euler(...transform.rotation);
      const q=new THREE.Quaternion().setFromEuler(e);
      bone.quaternion.slerp(q,w);
    }
    if (transform.position) {
      const p=new THREE.Vector3().fromArray(transform.position);
      bone.position.lerp(p,w);
    }
  }
}

export function normalizeExternalPose(source={}, sourceMap={}) {
  const out={};
  for (const [semantic,targetName] of Object.entries(HUMANOID_RETARGET_MAP)) {
    const sourceName=sourceMap[semantic] ?? semantic;
    if (source[sourceName]) out[semantic]=source[sourceName];
  }
  return out;
}
