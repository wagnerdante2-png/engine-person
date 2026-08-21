import * as THREE from 'three';

const clamp=(v,a=-1,b=1)=>THREE.MathUtils.clamp(v,a,b);

function preset(name){
  switch(name){
    case 'smile': return {smile:.78,jawOpen:.06,browRaise:.08,squint:.12,frown:0};
    case 'serious': return {smile:0,jawOpen:0,browRaise:-.08,squint:.18,frown:.22};
    case 'surprised': return {smile:.03,jawOpen:.62,browRaise:.70,squint:0,frown:0};
    case 'angry': return {smile:0,jawOpen:.08,browRaise:-.28,squint:.30,frown:.58};
    default: return {smile:0,jawOpen:0,browRaise:0,squint:0,frown:0};
  }
}

export function buildExpressionCoefficients(h={}){
  const p=preset(h.expression??'neutral');
  return {
    smile:clamp(Math.max(h.smile??0,p.smile),0,1),
    jawOpen:clamp(Math.max(h.jawOpen??0,p.jawOpen),0,1),
    browRaise:clamp((h.browRaise??0)+p.browRaise,-1,1),
    squint:clamp(Math.max(h.squint??0,p.squint),0,1),
    frown:clamp(p.frown,0,1),
    mouthPress:clamp(h.mouthPress??0,0,1),
    mouthPucker:clamp(h.mouthPucker??0,0,1)
  };
}

function gauss3(p,c,r){
  const dx=(p.x-c.x)/r.x,dy=(p.y-c.y)/r.y,dz=(p.z-c.z)/r.z;
  return Math.exp(-.5*(dx*dx+dy*dy+dz*dz));
}

function applyField(pos,center,radius,delta,coeff){
  if(Math.abs(coeff)<1e-5)return;
  const p=new THREE.Vector3();
  for(let i=0;i<pos.count;i++){
    p.fromBufferAttribute(pos,i);
    const w=gauss3(p,center,radius)*coeff;
    if(w<1e-4)continue;
    p.x+=delta.x*w;p.y+=delta.y*w;p.z+=delta.z*w;
    pos.setXYZ(i,p.x,p.y,p.z);
  }
}

export function applyExpressionSpace(mesh,h,a){
  if(!mesh?.geometry?.attributes?.position)return mesh;
  const pos=mesh.geometry.attributes.position;
  const psi=buildExpressionCoefficients(h);
  const R=a.headR,F=a.faceFront,Y=a.headY,E=a.eyeSpacing;

  // Global expression bases, deliberately low-dimensional and smooth.
  for(const sx of [-1,1]){
    applyField(pos,new THREE.Vector3(sx*R*.18,Y-R*.35,F*.73),new THREE.Vector3(R*.22,R*.12,R*.14),new THREE.Vector3(sx*R*.020,R*.040,R*.010),psi.smile);
    applyField(pos,new THREE.Vector3(sx*R*.30,Y-R*.24,F*.64),new THREE.Vector3(R*.22,R*.20,R*.18),new THREE.Vector3(sx*R*.010,R*.020,R*.012),psi.smile);
    applyField(pos,new THREE.Vector3(sx*E,Y+R*.12,F*.70),new THREE.Vector3(R*.23,R*.18,R*.18),new THREE.Vector3(0,R*.038,R*.004),Math.max(0,psi.browRaise));
    applyField(pos,new THREE.Vector3(sx*E,Y+R*.12,F*.70),new THREE.Vector3(R*.23,R*.18,R*.18),new THREE.Vector3(0,-R*.025,R*.004),Math.max(0,-psi.browRaise));
    applyField(pos,new THREE.Vector3(sx*E,Y+R*.04,F*.78),new THREE.Vector3(R*.21,R*.12,R*.17),new THREE.Vector3(0,-R*.018,-R*.008),psi.squint);
    applyField(pos,new THREE.Vector3(sx*R*.22,Y-R*.34,F*.72),new THREE.Vector3(R*.18,R*.13,R*.14),new THREE.Vector3(0,-R*.024,-R*.004),psi.frown);
  }

  applyField(pos,new THREE.Vector3(0,Y-R*.48,F*.54),new THREE.Vector3(R*.38,R*.30,R*.28),new THREE.Vector3(0,-R*.080,R*.020),psi.jawOpen);
  applyField(pos,new THREE.Vector3(0,Y-R*.37,F*.74),new THREE.Vector3(R*.28,R*.12,R*.14),new THREE.Vector3(0,-R*.025,R*.006),psi.jawOpen);
  applyField(pos,new THREE.Vector3(0,Y-R*.37,F*.74),new THREE.Vector3(R*.25,R*.12,R*.15),new THREE.Vector3(0,0,R*.018),psi.mouthPucker);
  applyField(pos,new THREE.Vector3(0,Y-R*.37,F*.74),new THREE.Vector3(R*.28,R*.11,R*.14),new THREE.Vector3(0,-R*.006,-R*.010),psi.mouthPress);

  pos.needsUpdate=true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingSphere();
  mesh.userData.expressionSpace={model:'ephm-expression-v1',coefficients:psi};
  return mesh;
}
