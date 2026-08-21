import * as THREE from 'three';

const EPS = 1e-5;

function worldPosition(obj) {
  const p = new THREE.Vector3();
  obj.getWorldPosition(p);
  return p;
}

function orientBoneToward(bone, targetWorld) {
  const parent = bone.parent;
  const origin = worldPosition(bone);
  const localTarget = targetWorld.clone();
  if (parent) parent.worldToLocal(localTarget);
  const localOrigin = bone.position.clone();
  const dir = localTarget.sub(localOrigin).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,-1,0),dir);
  bone.quaternion.slerp(q, .92);
}

export function solveTwoBoneIK(rig, chain, target, pole=null, weight=1) {
  const b = rig.userData.bones;
  const upper=b?.[chain.upper], lower=b?.[chain.lower], end=b?.[chain.end];
  if (!upper || !lower || !end || weight<=0) return;
  rig.updateMatrixWorld(true);

  const a=worldPosition(upper), m=worldPosition(lower), e=worldPosition(end);
  const targetWorld = target.isVector3 ? target.clone() : new THREE.Vector3(...target);
  const len1=Math.max(EPS,a.distanceTo(m)), len2=Math.max(EPS,m.distanceTo(e));
  const toTarget=targetWorld.clone().sub(a);
  const dist=THREE.MathUtils.clamp(toTarget.length(),Math.abs(len1-len2)+EPS,len1+len2-EPS);
  const dir=toTarget.normalize();
  const poleWorld = pole ? (pole.isVector3?pole.clone():new THREE.Vector3(...pole)) : a.clone().add(new THREE.Vector3(0,0,1));
  const poleDir=poleWorld.sub(a).normalize();
  const normal=new THREE.Vector3().crossVectors(dir,poleDir).normalize();
  if (normal.lengthSq()<EPS) normal.set(0,0,1);
  const bend=new THREE.Vector3().crossVectors(normal,dir).normalize();
  const cosA=THREE.MathUtils.clamp((len1*len1 + dist*dist - len2*len2)/(2*len1*dist),-1,1);
  const along=len1*cosA;
  const height=Math.sqrt(Math.max(0,len1*len1-along*along));
  const elbow=a.clone().addScaledVector(dir,along).addScaledVector(bend,height);

  const oldUpper=upper.quaternion.clone(), oldLower=lower.quaternion.clone();
  orientBoneToward(upper,elbow);
  rig.updateMatrixWorld(true);
  orientBoneToward(lower,targetWorld);
  if (weight<1) {
    upper.quaternion.slerpQuaternions(oldUpper,upper.quaternion,weight);
    lower.quaternion.slerpQuaternions(oldLower,lower.quaternion,weight);
  }
}

export function applyIKTargets(rig, options={}) {
  const p=rig.userData.profile;
  if (!p || !options.ikEnabled) return;
  const H=p.H;
  const reach=options.ikReach??.45;
  const targets={
    hand_L:new THREE.Vector3(-p.shoulderHalf*1.25,p.shoulderY-H*.18,H*.16*reach),
    hand_R:new THREE.Vector3(p.shoulderHalf*1.25,p.shoulderY-H*.18,H*.16*reach),
    foot_L:new THREE.Vector3(-p.hipHalf*.55,H*.04,H*.08*reach),
    foot_R:new THREE.Vector3(p.hipHalf*.55,H*.04,H*.08*reach)
  };
  solveTwoBoneIK(rig,{upper:'upperArm_L',lower:'lowerArm_L',end:'hand_L'},targets.hand_L,[-H*.30,p.shoulderY-H*.18,H*.35],options.ikWeight??.72);
  solveTwoBoneIK(rig,{upper:'upperArm_R',lower:'lowerArm_R',end:'hand_R'},targets.hand_R,[H*.30,p.shoulderY-H*.18,H*.35],options.ikWeight??.72);
  solveTwoBoneIK(rig,{upper:'upperLeg_L',lower:'lowerLeg_L',end:'foot_L'},targets.foot_L,[-H*.18,p.hipY-H*.35,H*.35],options.ikWeight??.72);
  solveTwoBoneIK(rig,{upper:'upperLeg_R',lower:'lowerLeg_R',end:'foot_R'},targets.foot_R,[H*.18,p.hipY-H*.35,H*.35],options.ikWeight??.72);
}
