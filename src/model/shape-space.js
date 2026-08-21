import * as THREE from 'three';

const clamp=THREE.MathUtils.clamp;

function basisWeight(v,center,radius){
  const d=v.distanceTo(center)/Math.max(radius,1e-6);
  if(d>=1)return 0;
  const t=1-d;
  return t*t*(3-2*t);
}

function applyBasis(position,base,coeff){
  if(!coeff)return;
  const p=new THREE.Vector3();
  for(let i=0;i<position.count;i++){
    p.fromBufferAttribute(position,i);
    const w=basisWeight(p,base.center,base.radius)*coeff;
    if(!w)continue;
    p.x+=base.delta.x*w;
    p.y+=base.delta.y*w;
    p.z+=base.delta.z*w;
    position.setXYZ(i,p.x,p.y,p.z);
  }
}

export function buildHumanShapeCoefficients(h,a){
  return {
    stature:clamp(((h.height??1.70)-1.70)/.30,-1,1),
    mass:clamp(((h.bodyMass??1)-1)/.35,-1,1),
    muscle:clamp(((h.muscle??1)-1)/.35,-1,1),
    shoulder:clamp((h.shoulderWidth??1)-1,-.3,.3)/.3,
    hip:clamp((h.hipWidth??1)-1,-.3,.3)/.3,
    waist:clamp((h.waistWidth??1)-1,-.3,.3)/.3,
    chest:clamp((h.chestWidth??1)-1,-.3,.3)/.3,
    leg:clamp((h.legLength??1)-1,-.2,.2)/.2,
    arm:clamp((h.armLength??1)-1,-.2,.2)/.2,
    face:clamp((h.faceWidth??1)-1,-.2,.2)/.2,
    jaw:clamp((h.jawWidth??1)-1,-.25,.25)/.25,
    cheek:clamp((h.cheekbones??1)-1,-.25,.25)/.25,
    nose:clamp((h.noseScale??1)-1,-.25,.25)/.25,
    age:clamp(((h.age??30)-35)/50,-.35,1)
  };
}

export function createBodyShapeBases(a){
  const H=a.H;
  return [
    {key:'shoulder',center:new THREE.Vector3(0,a.shoulderY,0),radius:H*.19,delta:new THREE.Vector3(H*.028,0,0)},
    {key:'chest',center:new THREE.Vector3(0,a.shoulderY-H*.12,a.chestDepth*.28),radius:H*.18,delta:new THREE.Vector3(H*.018,H*.002,H*.022)},
    {key:'waist',center:new THREE.Vector3(0,(a.shoulderY+a.hipY)*.5,0),radius:H*.15,delta:new THREE.Vector3(H*.018,0,H*.010)},
    {key:'hip',center:new THREE.Vector3(0,a.hipY,0),radius:H*.16,delta:new THREE.Vector3(H*.024,0,H*.014)},
    {key:'mass',center:new THREE.Vector3(0,(a.shoulderY+a.hipY)*.5,0),radius:H*.30,delta:new THREE.Vector3(H*.018,0,H*.018)},
    {key:'muscle',center:new THREE.Vector3(0,a.shoulderY-H*.08,0),radius:H*.24,delta:new THREE.Vector3(H*.010,H*.003,H*.010)}
  ];
}

export function createHeadShapeBases(a){
  const R=a.headR,F=a.faceFront;
  return [
    {key:'face',center:new THREE.Vector3(0,a.headY,F*.30),radius:R*.92,delta:new THREE.Vector3(R*.034,0,0)},
    {key:'jaw',center:new THREE.Vector3(0,a.headY-R*.48,F*.22),radius:R*.48,delta:new THREE.Vector3(R*.045,-R*.004,0)},
    {key:'cheek',center:new THREE.Vector3(0,a.headY-R*.02,F*.58),radius:R*.42,delta:new THREE.Vector3(R*.030,R*.004,R*.020)},
    {key:'nose',center:new THREE.Vector3(0,a.noseY,F*.78),radius:R*.30,delta:new THREE.Vector3(0,-R*.006,R*.045)},
    {key:'age',center:new THREE.Vector3(0,a.headY-R*.36,F*.55),radius:R*.55,delta:new THREE.Vector3(0,-R*.010,-R*.006)}
  ];
}

export function applyShapeSpace(mesh,h,a,{region='body'}={}){
  if(!mesh?.geometry?.attributes?.position)return mesh;
  const coeffs=buildHumanShapeCoefficients(h,a);
  const bases=region==='head'?createHeadShapeBases(a):createBodyShapeBases(a);
  const pos=mesh.geometry.attributes.position;
  for(const base of bases)applyBasis(pos,base,coeffs[base.key]??0);
  pos.needsUpdate=true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingSphere();
  mesh.userData.shapeSpace={model:'engine-person-shape-v1',region,coefficients:coeffs,bases:bases.length};
  return mesh;
}
