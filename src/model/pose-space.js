import * as THREE from 'three';

const clamp01=v=>THREE.MathUtils.clamp(v,0,1);

function influenceAt(p,center,radius){
  const d=p.distanceTo(center)/Math.max(radius,1e-6);
  if(d>=1)return 0;
  const t=1-d;
  return t*t*(3-2*t);
}

export function applyPoseCorrectiveField(mesh,profile,poseState={}){
  if(!mesh?.geometry?.attributes?.position)return mesh;
  const H=profile.H;
  const position=mesh.geometry.attributes.position;
  const p=new THREE.Vector3();
  const shoulder=Math.max(Math.abs(poseState.upperArmL??0),Math.abs(poseState.upperArmR??0));
  const elbow=Math.max(Math.abs(poseState.lowerArmL??0),Math.abs(poseState.lowerArmR??0));
  const hip=Math.max(Math.abs(poseState.upperLegL??0),Math.abs(poseState.upperLegR??0));
  const knee=Math.max(Math.abs(poseState.lowerLegL??0),Math.abs(poseState.lowerLegR??0));
  const centers=[
    {c:new THREE.Vector3(-profile.shoulderHalf*.85,profile.shoulderY,0),r:H*.10,w:shoulder,d:new THREE.Vector3(-H*.010,H*.004,H*.008)},
    {c:new THREE.Vector3(profile.shoulderHalf*.85,profile.shoulderY,0),r:H*.10,w:shoulder,d:new THREE.Vector3(H*.010,H*.004,H*.008)},
    {c:new THREE.Vector3(-profile.hipHalf*.55,profile.hipY-H*.02,0),r:H*.11,w:hip,d:new THREE.Vector3(-H*.008,H*.002,H*.010)},
    {c:new THREE.Vector3(profile.hipHalf*.55,profile.hipY-H*.02,0),r:H*.11,w:hip,d:new THREE.Vector3(H*.008,H*.002,H*.010)},
    {c:new THREE.Vector3(-profile.hipHalf*.54,profile.hipY-profile.legLen*.50,H*.004),r:H*.075,w:knee,d:new THREE.Vector3(0,0,H*.011)},
    {c:new THREE.Vector3(profile.hipHalf*.54,profile.hipY-profile.legLen*.50,H*.004),r:H*.075,w:knee,d:new THREE.Vector3(0,0,H*.011)}
  ];
  for(let i=0;i<position.count;i++){
    p.fromBufferAttribute(position,i);
    for(const f of centers){
      const w=influenceAt(p,f.c,f.r)*clamp01(f.w);
      if(!w)continue;
      p.addScaledVector(f.d,w);
    }
    if(elbow>0){
      const side=Math.sign(p.x||1);
      const cy=profile.shoulderY-H*.205;
      const c=new THREE.Vector3(side*(profile.shoulderHalf+H*.01),cy,H*.004);
      const w=influenceAt(p,c,H*.07)*clamp01(elbow);
      p.z+=H*.010*w;
    }
    position.setXYZ(i,p.x,p.y,p.z);
  }
  position.needsUpdate=true;
  mesh.geometry.computeVertexNormals();
  mesh.userData.poseSpace={model:'engine-person-pose-v1'};
  return mesh;
}

export function readRigPoseState(rig){
  const b=rig?.userData?.bones??{};
  return {
    upperArmL:b.upperArm_L?.rotation.length?.()??Math.abs(b.upperArm_L?.rotation.x??0)+Math.abs(b.upperArm_L?.rotation.z??0),
    upperArmR:b.upperArm_R?.rotation.length?.()??Math.abs(b.upperArm_R?.rotation.x??0)+Math.abs(b.upperArm_R?.rotation.z??0),
    lowerArmL:Math.abs(b.lowerArm_L?.rotation.x??0),
    lowerArmR:Math.abs(b.lowerArm_R?.rotation.x??0),
    upperLegL:Math.abs(b.upperLeg_L?.rotation.x??0),
    upperLegR:Math.abs(b.upperLeg_R?.rotation.x??0),
    lowerLegL:Math.abs(b.lowerLeg_L?.rotation.x??0),
    lowerLegR:Math.abs(b.lowerLeg_R?.rotation.x??0)
  };
}
