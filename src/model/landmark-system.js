import * as THREE from 'three';

function nearestVertexIndex(position,target){
  let best=0,bestD=Infinity;
  const p=new THREE.Vector3();
  for(let i=0;i<position.count;i++){
    p.fromBufferAttribute(position,i);
    const d=p.distanceToSquared(target);
    if(d<bestD){bestD=d;best=i;}
  }
  return best;
}

function landmarkTargets(a,h){
  const R=a.headR,F=a.faceFront,Y=a.headY,E=a.eyeSpacing;
  return {
    browInnerL:new THREE.Vector3(-E*.55,Y+R*.16,F*.69),
    browInnerR:new THREE.Vector3(E*.55,Y+R*.16,F*.69),
    eyeOuterL:new THREE.Vector3(-E-R*.12,Y+R*.05,F*.76),
    eyeInnerL:new THREE.Vector3(-E+R*.10,Y+R*.05,F*.78),
    eyeInnerR:new THREE.Vector3(E-R*.10,Y+R*.05,F*.78),
    eyeOuterR:new THREE.Vector3(E+R*.12,Y+R*.05,F*.76),
    noseBridge:new THREE.Vector3(0,Y+R*.06,F*.78),
    noseTip:new THREE.Vector3(0,Y-R*.16,F*.88),
    noseWingL:new THREE.Vector3(-R*.075*(h.noseWidth??1),Y-R*.19,F*.83),
    noseWingR:new THREE.Vector3(R*.075*(h.noseWidth??1),Y-R*.19,F*.83),
    mouthLeft:new THREE.Vector3(-R*.19*(h.mouthWidth??1),Y-R*.37,F*.74),
    mouthRight:new THREE.Vector3(R*.19*(h.mouthWidth??1),Y-R*.37,F*.74),
    upperLip:new THREE.Vector3(0,Y-R*.35,F*.76),
    lowerLip:new THREE.Vector3(0,Y-R*.40,F*.75),
    chin:new THREE.Vector3(0,Y-R*.62,F*.50),
    jawL:new THREE.Vector3(-R*.48*(h.jawWidth??1),Y-R*.43,F*.18),
    jawR:new THREE.Vector3(R*.48*(h.jawWidth??1),Y-R*.43,F*.18)
  };
}

export function buildStaticLandmarkEmbedding(mesh,a,h){
  const position=mesh?.geometry?.attributes?.position;
  if(!position)return null;
  const targets=landmarkTargets(a,h);
  const indices={};
  for(const [name,target] of Object.entries(targets))indices[name]=nearestVertexIndex(position,target);
  const embedding={type:'vertex-embedding-v1',indices};
  mesh.userData.landmarkEmbedding=embedding;
  return embedding;
}

export function readLandmarks(mesh,embedding=mesh?.userData?.landmarkEmbedding){
  const position=mesh?.geometry?.attributes?.position;
  if(!position||!embedding)return {};
  const out={};
  for(const [name,index] of Object.entries(embedding.indices))out[name]=new THREE.Vector3().fromBufferAttribute(position,index);
  return out;
}

export function dynamicContourLandmarks(mesh,a,h,yawRadians=0){
  const position=mesh?.geometry?.attributes?.position;
  if(!position)return {};
  const R=a.headR,Y=a.headY;
  const side=yawRadians>=0?1:-1;
  const strength=Math.min(1,Math.abs(yawRadians)/(Math.PI*.22));
  const targets={};
  for(let i=0;i<7;i++){
    const t=i/6;
    targets[`contour_${i}`]=new THREE.Vector3(side*R*(.48+.10*t*strength),Y+R*(.40-.95*t),R*(.05-.18*t));
  }
  const out={};
  for(const [name,target] of Object.entries(targets)){
    const index=nearestVertexIndex(position,target);
    out[name]=new THREE.Vector3().fromBufferAttribute(position,index);
  }
  return out;
}
