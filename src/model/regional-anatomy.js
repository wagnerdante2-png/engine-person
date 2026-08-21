import * as THREE from 'three';

const clamp=THREE.MathUtils.clamp;
const smooth01=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};

function ellipsoidWeight(p,c,r){
  const dx=(p.x-c.x)/Math.max(r.x,1e-5),dy=(p.y-c.y)/Math.max(r.y,1e-5),dz=(p.z-c.z)/Math.max(r.z,1e-5);
  const d=Math.sqrt(dx*dx+dy*dy+dz*dz);
  return d>=1?0:smooth01(1-d);
}

function pushRadial(p,c,amount,w,axes={x:1,y:0,z:1}){
  const v=new THREE.Vector3(p.x-c.x,0,p.z-c.z);
  if(v.lengthSq()<1e-8)v.set(0,0,1);
  v.normalize();
  p.x+=v.x*amount*w*(axes.x??1);
  p.y+=amount*w*(axes.y??0);
  p.z+=v.z*amount*w*(axes.z??1);
}

function applyField(pos,field,coeff=1){
  if(Math.abs(coeff)<1e-5)return;
  const p=new THREE.Vector3();
  for(let i=0;i<pos.count;i++){
    p.fromBufferAttribute(pos,i);
    const w=ellipsoidWeight(p,field.center,field.radius)*coeff*(field.strength??1);
    if(!w)continue;
    if(field.mode==='vector'){
      p.x+=field.delta.x*w;p.y+=field.delta.y*w;p.z+=field.delta.z*w;
    }else pushRadial(p,field.center,field.amount*w,1,field.axes);
    pos.setXYZ(i,p.x,p.y,p.z);
  }
}

function bodyFields(a,h,name){
  const H=a.H,m=(h.muscle??1)-1,mass=(h.bodyMass??1)-1,female=h.sex==='female';
  const side=name.endsWith('_L')?-1:name.endsWith('_R')?1:0;
  const fields=[];
  if(/Torso|Garment/i.test(name)){
    fields.push(
      {center:new THREE.Vector3(0,a.shoulderY-H*.045,H*.010),radius:new THREE.Vector3(H*.19,H*.075,H*.11),mode:'vector',delta:new THREE.Vector3(0,H*.003,H*.010),strength:.65+.35*Math.max(0,m)},
      {center:new THREE.Vector3(0,a.shoulderY-H*.135,a.chestDepth*.42),radius:new THREE.Vector3(H*.155,H*.105,H*.095),amount:H*(.004+.010*Math.max(0,m)),axes:{x:.55,y:.15,z:1}},
      {center:new THREE.Vector3(0,(a.shoulderY+a.hipY)*.52,H*.018),radius:new THREE.Vector3(H*.13,H*.12,H*.09),amount:H*(.003+.014*Math.max(0,mass)),axes:{x:.60,y:0,z:1}},
      {center:new THREE.Vector3(0,(a.shoulderY+a.hipY)*.44,-H*.025),radius:new THREE.Vector3(H*.125,H*.115,H*.075),amount:H*(.002+.007*Math.max(0,m)),axes:{x:.45,y:0,z:1}}
    );
    for(const sx of [-1,1]){
      fields.push({center:new THREE.Vector3(sx*a.shoulderHalf*.54,a.shoulderY-H*.105,H*.025),radius:new THREE.Vector3(H*.09,H*.09,H*.08),amount:H*(.004+.009*Math.max(0,m)),axes:{x:.70,y:.08,z:1}});
      fields.push({center:new THREE.Vector3(sx*a.shoulderHalf*.58,a.shoulderY-H*.12,-H*.040),radius:new THREE.Vector3(H*.095,H*.11,H*.075),amount:H*(.003+.006*Math.max(0,m)),axes:{x:.65,y:0,z:1}});
    }
    if(female){
      for(const sx of [-1,1])fields.push({center:new THREE.Vector3(sx*H*.055,a.shoulderY-H*.145,a.chestDepth*.72),radius:new THREE.Vector3(H*.075,H*.07,H*.075),amount:H*.006*(h.chestDepth??1),axes:{x:.38,y:.18,z:1}});
    }
  }
  if(/Pelvis/i.test(name)){
    fields.push({center:new THREE.Vector3(0,a.hipY-H*.045,-H*.050),radius:new THREE.Vector3(H*.14,H*.10,H*.105),amount:H*(.006+.012*Math.max(0,(h.glute??1)-1)+.007*Math.max(0,mass)),axes:{x:.55,y:.10,z:1}});
    for(const sx of [-1,1])fields.push({center:new THREE.Vector3(sx*a.hipHalf*.72,a.hipY-H*.025,-H*.015),radius:new THREE.Vector3(H*.085,H*.09,H*.085),amount:H*(.005+.008*Math.max(0,mass)),axes:{x:1,y:.05,z:.55}});
  }
  if(/Thigh/i.test(name)&&side){
    const x=side*a.hipHalf*.54;
    fields.push({center:new THREE.Vector3(x,a.hipY-H*.11,H*.018),radius:new THREE.Vector3(H*.065,H*.14,H*.07),amount:H*(.004+.011*Math.max(0,m)),axes:{x:.70,y:0,z:1}});
    fields.push({center:new THREE.Vector3(x,a.hipY-H*.15,-H*.028),radius:new THREE.Vector3(H*.067,H*.15,H*.068),amount:H*(.003+.009*Math.max(0,m)),axes:{x:.65,y:0,z:1}});
    fields.push({center:new THREE.Vector3(x+side*H*.028,a.hipY-H*.12,0),radius:new THREE.Vector3(H*.055,H*.135,H*.06),amount:H*(.002+.006*Math.max(0,m)),axes:{x:1,y:0,z:.45}});
  }
  if(/Calf/i.test(name)&&side){
    const x=side*a.hipHalf*.53;
    fields.push({center:new THREE.Vector3(x,a.kneeY-H*.105,-H*.018),radius:new THREE.Vector3(H*.055,H*.115,H*.060),amount:H*(.004+.010*Math.max(0,m)),axes:{x:.65,y:0,z:1}});
    fields.push({center:new THREE.Vector3(x+side*H*.017,a.kneeY-H*.11,H*.010),radius:new THREE.Vector3(H*.045,H*.10,H*.050),amount:H*(.002+.006*Math.max(0,m)),axes:{x:1,y:0,z:.55}});
  }
  if(/UpperArm/i.test(name)&&side){
    const x=side*a.shoulderHalf*.94;
    fields.push({center:new THREE.Vector3(x,a.shoulderY-H*.085,-H*.010),radius:new THREE.Vector3(H*.045,H*.10,H*.05),amount:H*(.003+.009*Math.max(0,m)),axes:{x:.70,y:0,z:1}});
  }
  if(/Forearm/i.test(name)&&side){
    const x=side*(a.shoulderHalf*.94+H*.012);
    fields.push({center:new THREE.Vector3(x,a.elbowY-H*.065,H*.004),radius:new THREE.Vector3(H*.038,H*.095,H*.042),amount:H*(.002+.006*Math.max(0,m)),axes:{x:.72,y:0,z:1}});
  }
  return fields;
}

function faceFields(a,h){
  const R=a.headR,F=a.faceFront;
  return [
    {center:new THREE.Vector3(0,a.headY+R*.42,-R*.12),radius:new THREE.Vector3(R*.70,R*.55,R*.62),mode:'vector',delta:new THREE.Vector3(0,R*.008,-R*.008),strength:.55},
    {center:new THREE.Vector3(0,a.headY-R*.18,F*.48),radius:new THREE.Vector3(R*.58,R*.40,R*.35),amount:R*.010,axes:{x:.45,y:0,z:1}},
    {center:new THREE.Vector3(0,a.headY-R*.52,F*.18),radius:new THREE.Vector3(R*.50,R*.30,R*.30),mode:'vector',delta:new THREE.Vector3(0,-R*.012,R*.006),strength:.65},
    {center:new THREE.Vector3(-a.eyeSpacing,a.eyeLine,F*.76),radius:new THREE.Vector3(R*.22,R*.16,R*.18),mode:'vector',delta:new THREE.Vector3(0,-R*.004,-R*.010),strength:.8},
    {center:new THREE.Vector3(a.eyeSpacing,a.eyeLine,F*.76),radius:new THREE.Vector3(R*.22,R*.16,R*.18),mode:'vector',delta:new THREE.Vector3(0,-R*.004,-R*.010),strength:.8},
    {center:new THREE.Vector3(0,a.noseY,F*.82),radius:new THREE.Vector3(R*.18,R*.25,R*.20),mode:'vector',delta:new THREE.Vector3(0,-R*.003,R*.010*(h.noseScale??1)),strength:.9}
  ];
}

export function applyRegionalAnatomy(mesh,h,a,{region='body'}={}){
  if(!mesh?.geometry?.attributes?.position)return mesh;
  const pos=mesh.geometry.attributes.position;
  const fields=region==='head'?faceFields(a,h):bodyFields(a,h,mesh.name||'');
  for(const field of fields)applyField(pos,field,1);
  pos.needsUpdate=true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingSphere();
  mesh.userData.regionalAnatomy={version:'2.0',region,fields:fields.length};
  return mesh;
}
