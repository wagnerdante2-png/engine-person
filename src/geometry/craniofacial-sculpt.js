import * as THREE from 'three';

const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const gaussian=(x,s)=>Math.exp(-(x*x)/(2*s*s));

function fieldWeight(p,c,r){
  const dx=(p.x-c.x)/r.x,dy=(p.y-c.y)/r.y,dz=(p.z-c.z)/r.z;
  return Math.exp(-.5*(dx*dx+dy*dy+dz*dz));
}

function applyField(pos,center,radius,delta,falloff=1){
  const p=new THREE.Vector3();
  for(let i=0;i<pos.count;i++){
    p.fromBufferAttribute(pos,i);
    const w=Math.pow(fieldWeight(p,center,radius),falloff);
    if(w<1e-4)continue;
    pos.setXYZ(i,p.x+delta.x*w,p.y+delta.y*w,p.z+delta.z*w);
  }
}

function symmetricField(pos,x,y,z,rx,ry,rz,dx,dy,dz,falloff=1){
  applyField(pos,new THREE.Vector3(-x,y,z),new THREE.Vector3(rx,ry,rz),new THREE.Vector3(-dx,dy,dz),falloff);
  applyField(pos,new THREE.Vector3( x,y,z),new THREE.Vector3(rx,ry,rz),new THREE.Vector3( dx,dy,dz),falloff);
}

export function sculptCraniofacialSurface(mesh,h,a){
  const g=mesh?.geometry;
  const pos=g?.attributes?.position;
  if(!pos)return mesh;
  const R=a.headR,F=a.faceFront,Y=a.headY;
  const E=a.eyeSpacing;
  const fw=h.faceWidth??1,jaw=h.jawWidth??1,cheek=h.cheekbones??1;
  const noseW=h.noseWidth??1,noseL=h.noseScale??1,bridge=h.noseBridge??1;
  const mouthW=h.mouthWidth??1,lip=h.lipFullness??1;

  // Cranial vault and temporal flattening.
  applyField(pos,new THREE.Vector3(0,Y+R*.34,-R*.08),new THREE.Vector3(R*.78,R*.72,R*.78),new THREE.Vector3(0,R*.014,R*.008));
  symmetricField(pos,R*.60,Y+R*.10,R*.12,R*.28,R*.30,R*.30,R*.012*fw,0,-R*.010,1.15);

  // Brow ridge, orbital cavities and eyelid support.
  symmetricField(pos,E,Y+R*.12,F*.68,R*.23,R*.19,R*.20,0,R*.014,R*.020*bridge,.95);
  symmetricField(pos,E,Y+R*.06,F*.78,R*.20,R*.14,R*.16,0,-R*.016,-R*.026,1.1);
  symmetricField(pos,E,Y-R*.015,F*.74,R*.22,R*.13,R*.18,0,R*.007,R*.012,.95);

  // Zygomatic arches and mid-face projection.
  symmetricField(pos,R*.39*fw,Y-R*.04,F*.62,R*.30,R*.28,R*.28,R*.018*cheek,R*.004,R*.026*cheek,.9);
  applyField(pos,new THREE.Vector3(0,Y-R*.12,F*.61),new THREE.Vector3(R*.38,R*.32,R*.30),new THREE.Vector3(0,-R*.004,R*.012));

  // Nose grows directly out of the facial surface: radix, bridge, dorsum, tip and alae.
  applyField(pos,new THREE.Vector3(0,Y+R*.12,F*.72),new THREE.Vector3(R*.16*noseW,R*.24,R*.19),new THREE.Vector3(0,0,R*.034*bridge),.85);
  applyField(pos,new THREE.Vector3(0,Y-R*.02,F*.76),new THREE.Vector3(R*.145*noseW,R*.26,R*.18),new THREE.Vector3(0,-R*.003,R*.055*noseL),.9);
  applyField(pos,new THREE.Vector3(0,Y-R*.16,F*.81),new THREE.Vector3(R*.15*noseW,R*.14,R*.14),new THREE.Vector3(0,-R*.006,R*.055*noseL),1.0);
  symmetricField(pos,R*.075*noseW,Y-R*.18,F*.80,R*.10,R*.09,R*.11,R*.010*noseW,-R*.002,R*.018,.95);

  // Philtrum/maxilla and perioral muzzle.
  applyField(pos,new THREE.Vector3(0,Y-R*.27,F*.72),new THREE.Vector3(R*.13,R*.14,R*.12),new THREE.Vector3(0,-R*.002,R*.012),1.0);
  applyField(pos,new THREE.Vector3(0,Y-R*.35,F*.73),new THREE.Vector3(R*.24*mouthW,R*.10,R*.13),new THREE.Vector3(0,0,R*.014*lip),1.0);
  symmetricField(pos,R*.14*mouthW,Y-R*.34,F*.73,R*.12,R*.10,R*.12,R*.005*mouthW,R*.006,R*.010*lip,1.05);
  applyField(pos,new THREE.Vector3(0,Y-R*.40,F*.72),new THREE.Vector3(R*.22*mouthW,R*.10,R*.12),new THREE.Vector3(0,-R*.006,R*.012*lip),1.0);

  // Chin, mandibular body and gonial angle.
  applyField(pos,new THREE.Vector3(0,Y-R*.59,F*.50),new THREE.Vector3(R*.27,R*.23,R*.25),new THREE.Vector3(0,-R*.018*(h.chinSize??1),R*.024*(h.chinSize??1)),.9);
  symmetricField(pos,R*.34*jaw,Y-R*.48,F*.24,R*.30,R*.28,R*.30,R*.020*jaw,-R*.004,-R*.006,.9);
  symmetricField(pos,R*.47*jaw,Y-R*.37,F*.08,R*.24,R*.30,R*.28,R*.018*jaw,-R*.004,-R*.010,.95);

  // Nasolabial and cheek softness, age dependent.
  const age=clamp01(((h.age??30)-35)/45);
  symmetricField(pos,R*.18,Y-R*.27,F*.74,R*.12,R*.18,R*.12,0,-R*.005*(.4+age),-R*.006*(.5+age),1.2);
  symmetricField(pos,R*.29,Y-R*.23,F*.63,R*.22,R*.22,R*.20,0,-R*.004*age,-R*.004*age,1.0);

  pos.needsUpdate=true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
  mesh.userData.craniofacialSculpt={version:'2.0',method:'anisotropic-gaussian-fields',continuous:true};
  return mesh;
}
