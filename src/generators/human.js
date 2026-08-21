import * as THREE from 'three';
import { createTorsoMesh, createPelvisMesh, createHeadMesh, createTaperedLimb, createFoot, createHand } from '../geometry/anatomy.js';
import { resolveHumanProfile } from './human-profile.js';

const mat=(color,roughness=.72,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const skinMaterial=(h)=>new THREE.MeshPhysicalMaterial({ color:h.skin, roughness:h.skinRoughness??.46, metalness:0, clearcoat:.06, clearcoatRoughness:.72, sheen:.10, sheenRoughness:.82 });
function sphere(rx,ry,rz,material,seg=32){ const g=new THREE.SphereGeometry(1,seg,Math.max(16,Math.round(seg/2))); g.scale(rx,ry,rz); const m=new THREE.Mesh(g,material); m.castShadow=true; m.receiveShadow=true; return m; }
function place(group,mesh,x,y,z,rx=0,ry=0,rz=0){ mesh.position.set(x,y,z); mesh.rotation.set(rx,ry,rz); group.add(mesh); return mesh; }
function createNeck(H,y,radius,material){ const g=new THREE.CylinderGeometry(radius*.92,radius,H*.070,36,6,false); const m=new THREE.Mesh(g,material); m.position.set(0,y,0); m.castShadow=true; m.receiveShadow=true; return m; }

function createFaceFeatures(root,h,p,materials){
  const {headR,headY}=p;
  const asym=h.asymmetry??0;
  const eyeY=headY+headR*.10;
  const eyeX=headR*.34*h.eyeSpacing;
  const eyeZ=headR*.86*h.headDepth;
  const browMat=mat(h.hair,.72);
  for(const sx of [-1,1]){
    const offset=sx*asym*headR*.10;
    place(root,sphere(headR*.155*h.eyeScale,headR*.088*h.eyeScale*h.eyelidOpen,headR*.064,materials.eyeWhite,30),sx*eyeX+offset,eyeY+offset*.12,eyeZ);
    place(root,sphere(headR*.066*h.eyeScale,headR*.066*h.eyeScale,headR*.030,materials.iris,24),sx*eyeX+offset,eyeY+offset*.12,eyeZ+headR*.052);
    place(root,sphere(headR*.025,headR*.025,headR*.010,materials.pupil,18),sx*eyeX+offset,eyeY+offset*.12,eyeZ+headR*.081);
    const brow=new THREE.Mesh(new THREE.BoxGeometry(headR*.30*h.browThickness,headR*.026*h.browThickness,headR*.018),browMat);
    place(root,brow,sx*eyeX,eyeY+headR*.22*h.browHeight,eyeZ+headR*.045,0,0,sx*-.10);
    place(root,sphere(headR*.105*h.earScale,headR*.19*h.earScale,headR*.055,materials.skin,24),sx*headR*.93*h.faceWidth,headY-headR*.02,-headR*.02);
  }
  const noseMat=materials.skin;
  const bridge=new THREE.Mesh(new THREE.CapsuleGeometry(headR*.055*h.noseWidth,headR*.19*h.noseScale,6,18),noseMat);
  place(root,bridge,0,headY+headR*.01,headR*.84*h.headDepth,Math.PI/2,0,0);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(headR*.105*h.noseWidth,headR*.31*h.noseScale,24),noseMat);
  place(root,nose,0,headY-headR*.08,headR*.91*h.headDepth,Math.PI/2);
  for(const sx of [-1,1]) place(root,sphere(headR*.032*h.noseWidth,headR*.025,headR*.016,materials.shadow,18),sx*headR*.055*h.noseWidth,headY-headR*.19,headR*.985*h.headDepth);
  const lipMat=mat(h.lipColor,.46,0);
  place(root,sphere(headR*.19*h.mouthWidth,headR*.037*h.lipFullness,headR*.032,lipMat,30),0,headY-headR*.35,headR*.88*h.headDepth);
  place(root,sphere(headR*.18*h.mouthWidth,headR*.032*h.lipFullness,headR*.029,lipMat,30),0,headY-headR*.40,headR*.87*h.headDepth);
  const mouthGap=new THREE.Mesh(new THREE.BoxGeometry(headR*.30*h.mouthWidth,headR*.009,headR*.008),materials.shadow);
  place(root,mouthGap,0,headY-headR*.375,headR*.918*h.headDepth);

  const detail=h.skinDetail??0;
  if(detail>.45){
    const freckleMat=mat(new THREE.Color(h.skin).multiplyScalar(.72),.62);
    const count=Math.round(6+detail*12);
    for(let i=0;i<count;i++){
      const side=i%2===0?-1:1;
      const u=(i%6)/5;
      place(root,sphere(headR*.008,headR*.006,headR*.003,freckleMat,10),side*headR*(.17+.26*u),headY+headR*(.02-.12*u),headR*.94*h.headDepth);
    }
  }
}

function createHair(h,p,material){
  const {headR,headY}=p; const hair=new THREE.Group(); hair.name='HairSystem';
  const cap=sphere(headR*1.035,headR*.82,headR*1.02,material,48); place(hair,cap,0,headY+headR*.27,-headR*.045);
  if(h.hairStyle==='short') return hair;
  const baseStrands=h.hairStyle==='bob'?24:34;
  const strands=Math.max(16,Math.round(baseStrands*(h.hairDensity??1)));
  const length=headR*(h.hairStyle==='bob'?1.15:2.25)*h.hairLength;
  const spread=h.hairStyle==='bob'?.84:.92;
  for(let i=0;i<strands;i++){
    const u=strands===1?0:i/(strands-1), side=u*2-1;
    const rootX=side*headR*spread, rootY=headY+headR*(.30-.25*Math.abs(side)), rootZ=-headR*(.05+.16*Math.abs(side));
    const wave=Math.sin(u*Math.PI*5)*headR*.055*(h.hairStyle==='long-side'?1:0);
    const tipX=rootX+side*headR*.18+wave, tipY=rootY-length*(.72+.18*Math.abs(side)), tipZ=rootZ-headR*(.10+.22*(1-Math.abs(side)));
    const r=headR*(h.hairStyle==='bob'?.045:.034);
    hair.add(createTaperedLimb({start:[rootX,rootY,rootZ],end:[tipX,tipY,tipZ],radii:[r,r*.78,r*.18],material,radialSegments:8,segments:10,ellipticity:.58}));
  }
  return hair;
}
function createGarmentShell(h,p,bodyMaterial){ const shellProfile={...p,bodyMass:p.bodyMass*(h.outfit==='jacket'?1.10:h.outfit==='formal'?1.07:1.035),chestWidth:p.chestWidth*(h.outfit==='jacket'?1.05:1.01),waistWidth:p.waistWidth*(h.outfit==='formal'?1.02:1),shoulderWidth:p.shoulderWidth*(h.outfit==='jacket'?1.04:1.01)}; const shell=createTorsoMesh(shellProfile,bodyMaterial,48); shell.name='UpperGarment'; return shell; }
function createLegs(root,h,p,materials){
  const H=p.H, upperLeg=p.legLen*.50, lowerLeg=p.legLen*.43, thighTopY=p.hipY-H*.020, kneeY=thighTopY-upperLeg, ankleY=Math.max(H*.060,kneeY-lowerLeg), legX=p.hipHalf*.55;
  const thighR=H*.037*p.bodyMass*(1+(p.glute-1)*.28), calfR=H*.029*p.bodyMass*(1+(p.muscle-1)*.34);
  for(const sx of [-1,1]){
    root.add(createTaperedLimb({start:[sx*legX,thighTopY,0],end:[sx*legX*.98,kneeY,H*.005],radii:[thighR*1.06,thighR*.92,H*.030*p.bodyMass],material:materials.bottom,radialSegments:34,segments:16,ellipticity:.90}));
    root.add(createTaperedLimb({start:[sx*legX*.98,kneeY,H*.005],end:[sx*legX*.96,ankleY,0],radii:[H*.030*p.bodyMass,calfR*1.06,H*.020*p.bodyMass],material:materials.skin,radialSegments:30,segments:14,ellipticity:.92}));
    const foot=createFoot(H,H*.043*p.bodyMass,H*.082,materials.shoe); foot.position.set(sx*legX*.96,0,H*.035); root.add(foot);
  }
}
function createArms(root,h,p,materials){
  const H=p.H, armLen=H*.325*h.armLength, upperLen=armLen*.49, lowerLen=armLen*.43, shoulderX=p.shoulderHalf*.96, shoulderY=p.shoulderY-H*.014;
  const upperR=H*.0255*p.bodyMass*(1+(p.muscle-1)*.36), foreR=H*.0215*p.bodyMass*(1+(p.muscle-1)*.28);
  for(const sx of [-1,1]){
    const elbow=[sx*(shoulderX+H*.012),shoulderY-upperLen,H*.002], wrist=[sx*(shoulderX+H*.020),shoulderY-upperLen-lowerLen,H*.006];
    root.add(createTaperedLimb({start:[sx*shoulderX,shoulderY,0],end:elbow,radii:[upperR*1.08,upperR,upperR*.82],material:materials.top,radialSegments:28,segments:12,ellipticity:.96}));
    root.add(createTaperedLimb({start:elbow,end:wrist,radii:[foreR*1.06,foreR,foreR*.70],material:materials.skin,radialSegments:26,segments:12,ellipticity:.94}));
    const hand=createHand(H,H*.026*p.bodyMass,materials.skin); hand.position.set(wrist[0],wrist[1]-H*.038,wrist[2]); hand.rotation.z=sx*-.04; root.add(hand);
  }
}

export function generateHuman(input){
  const h=resolveHumanProfile(input); const root=new THREE.Group(); root.name='ProceduralHuman';
  const H=h.height, female=h.sex==='female', bodyMass=h.bodyMass, legLen=H*.455*h.legLength, torsoLen=H*.285*h.torsoLength, hipY=legLen, shoulderY=hipY+torsoLen, headR=H*.083*h.headScale, neckY=shoulderY+H*.047, headY=neckY+headR*1.08, shoulderHalf=H*.112*h.shoulderWidth*(female?.95:1.07), hipHalf=H*.087*h.hipWidth*(female?1.08:.96);
  const p={H,female,bodyMass,legLen,torsoLen,hipY,shoulderY,headR,headY,shoulderHalf,hipHalf,shoulderWidth:h.shoulderWidth,hipWidth:h.hipWidth,waistWidth:h.waistWidth,chestWidth:h.chestWidth,chestDepth:h.chestDepth,glute:h.glute,muscle:h.muscle,sexWidth:female?.95:1.05,sexHip:female?1.07:.96,faceWidth:h.faceWidth,jawWidth:h.jawWidth,cheekbones:h.cheekbones,headDepth:h.headDepth,chinSize:h.chinSize,foreheadHeight:h.foreheadHeight};
  const materials={skin:skinMaterial(h),eyeWhite:mat('#f4f5f1',.24),iris:mat(h.eyes,.24),pupil:mat('#090b0d',.20),shadow:mat('#2b1715',.60),hair:mat(h.hair,.60),top:mat(h.topColor,.80),bottom:mat(h.bottomColor,.84),shoe:mat('#111318',.52,.06)};
  const pelvis=createPelvisMesh(p,materials.bottom,52); pelvis.name='PelvisSurface'; root.add(pelvis);
  const torsoSkin=createTorsoMesh(p,materials.skin,56); torsoSkin.name='TorsoAnatomy'; root.add(torsoSkin);
  root.add(createGarmentShell(h,p,materials.top));
  const neck=createNeck(H,neckY,H*.027*h.neckThickness*bodyMass,materials.skin); neck.name='Neck'; root.add(neck);
  const head=createHeadMesh(p,materials.skin,68,50); head.name='ParametricHead'; root.add(head);
  createFaceFeatures(root,h,p,materials); root.add(createHair(h,p,materials.hair)); createLegs(root,h,p,materials); createArms(root,h,p,materials);
  root.userData.profile=h;
  root.userData.stats={height:H,age:Math.round(h.age??0),autonomy:h.autonomy??0,mode:'parametric-human-v3',parts:root.children.length,topology:'procedural-ring-surfaces',fidelity:'detailed-autonomous-foundation'};
  return root;
}
