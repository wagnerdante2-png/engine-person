import * as THREE from 'three';
import { createTorsoMesh } from '../geometry/anatomy.js';

function garmentMaterial(color, h={}){
  const fabric=h.fabricType??'cotton';
  const presets={
    cotton:{roughness:.86,sheen:.08},
    denim:{roughness:.78,sheen:.05},
    leather:{roughness:.42,sheen:.18},
    satin:{roughness:.28,sheen:.55}
  };
  const p=presets[fabric]??presets.cotton;
  return new THREE.MeshPhysicalMaterial({color,roughness:p.roughness,metalness:0,sheen:p.sheen,sheenRoughness:.55});
}

function makeShellProfile(h,p){
  const fit=h.garmentFit??.42;
  const ease=.018+(1-fit)*.055;
  const jacket=h.outfit==='jacket';
  const formal=h.outfit==='formal';
  return {
    ...p,
    bodyMass:p.bodyMass*(1+ease+(jacket?.045:formal?.030:0)),
    chestWidth:p.chestWidth*(1+ease*.35+(jacket?.025:0)),
    waistWidth:p.waistWidth*(1+ease*.22+(formal?.015:0)),
    shoulderWidth:p.shoulderWidth*(1+ease*.24+(jacket?.025:0)),
    chestDepth:p.chestDepth*(1+ease*.30)
  };
}

function createHem(profile,material,h){
  const H=profile.H;
  const y=profile.hipY+H*(h.outfit==='formal'?.045:.075);
  const rx=H*(.085*profile.bodyMass+.022*profile.hipWidth);
  const rz=H*(.055*profile.bodyMass+.012*profile.glute);
  const g=new THREE.TorusGeometry(1,.018,8,64);
  g.scale(rx,H*.28,rz);
  g.rotateX(Math.PI/2);
  const mesh=new THREE.Mesh(g,material);mesh.position.y=y;mesh.name='GarmentHem';
  return mesh;
}

function createCollar(profile,material,h){
  const H=profile.H;
  const group=new THREE.Group();group.name='GarmentCollar';
  const y=profile.shoulderY-H*.008;
  const neck=H*.034;
  for(const sx of [-1,1]){
    const g=new THREE.BoxGeometry(H*.055,H*.018,H*.055);
    const m=new THREE.Mesh(g,material);
    m.position.set(sx*H*.035,y,H*.018);
    m.rotation.z=sx*.18;
    group.add(m);
  }
  if(h.outfit==='jacket'){
    const back=new THREE.Mesh(new THREE.BoxGeometry(H*.12,H*.022,H*.035),material);
    back.position.set(0,y+H*.01,-neck*.5);group.add(back);
  }
  return group;
}

function createSeamLines(profile,h){
  const H=profile.H;
  const mat=new THREE.LineBasicMaterial({color:new THREE.Color(h.topColor).multiplyScalar(.6),transparent:true,opacity:.55});
  const group=new THREE.Group();group.name='GarmentSeams';
  const shoulderY=profile.shoulderY-H*.03, hipY=profile.hipY+H*.06;
  for(const sx of [-1,1]){
    const points=[new THREE.Vector3(sx*H*.025,shoulderY,H*.078),new THREE.Vector3(sx*H*.032,(shoulderY+hipY)/2,H*.075),new THREE.Vector3(sx*H*.038,hipY,H*.068)];
    const g=new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.Line(g,mat));
  }
  return group;
}

export function createConformingGarment(h,p){
  const group=new THREE.Group();group.name='GarmentSystemV2';
  const material=garmentMaterial(h.topColor,h);
  const shell=createTorsoMesh(makeShellProfile(h,p),material,64);
  shell.name='UpperGarmentConformed';
  group.add(shell,createHem(p,material,h),createCollar(p,material,h),createSeamLines(p,h));
  group.userData.garment={system:'conforming-shell-v1',outfit:h.outfit,fit:h.garmentFit??.42,fabric:h.fabricType??'cotton'};
  return {group,shell,material};
}

export function createGarmentDynamicsController(group,h={}){
  const strength=h.garmentMotion??.18;
  return time=>{
    if(!group||!strength)return;
    group.rotation.z=Math.sin(time*.9)*.003*strength;
    group.scale.z=1+Math.sin(time*1.45)*.0025*strength;
  };
}
