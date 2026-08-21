import * as THREE from 'three';
import { createTorsoMesh, createPelvisMesh, createHeadMesh, createTaperedLimb, createFoot } from '../geometry/anatomy.js';
import { createDetailedHandGeometry } from '../geometry/hands.js';
import { resolveHumanProfile } from './human-profile.js';
import { createHumanoidRig, createPoseController, createRigHelper } from '../rig/skeleton.js';
import { autoSkinMesh } from '../rig/skinning.js';
import { createCorrectiveController } from '../rig/correctives.js';
import { createFacialController } from './facial-animation.js';
import { createFaceMorphController } from './face-morphs.js';

const mat=(color,roughness=.72,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const skinMaterial=h=>new THREE.MeshPhysicalMaterial({color:h.skin,roughness:h.skinRoughness??.46,metalness:0,clearcoat:.05,clearcoatRoughness:.72,sheen:.10,sheenRoughness:.82,thickness:.08+(h.subsurface??.4)*.08});
const corneaMaterial=h=>new THREE.MeshPhysicalMaterial({color:'#f5fbff',transparent:true,opacity:.14+(h.eyeWetness??.7)*.12,roughness:.04,metalness:0,transmission:.16,thickness:.015,clearcoat:1,clearcoatRoughness:.02});
function sphere(rx,ry,rz,material,seg=32){const g=new THREE.SphereGeometry(1,seg,Math.max(16,Math.round(seg/2)));g.scale(rx,ry,rz);const m=new THREE.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;return m;}
function place(group,mesh,x,y,z,rx=0,ry=0,rz=0,name=''){mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);if(name)mesh.name=name;group.add(mesh);return mesh;}
function createNeck(H,y,radius,material){const g=new THREE.CylinderGeometry(radius*.92,radius,H*.070,36,6,false);const m=new THREE.Mesh(g,material);m.position.set(0,y,0);m.castShadow=true;m.receiveShadow=true;m.name='NeckSurface';return m;}
function createTearline(headR,material){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-headR*.13,0,0),new THREE.Vector3(0,-headR*.012,headR*.005),new THREE.Vector3(headR*.13,0,0)]);return new THREE.Mesh(new THREE.TubeGeometry(curve,20,headR*.006,8,false),material);}

function createFaceGroup(h,p,materials){
  const group=new THREE.Group(); group.name='FaceAssembly';
  const {headR,headY}=p;
  const asym=h.asymmetry??0, eyeY=headY+headR*.10, eyeX=headR*.34*h.eyeSpacing, eyeZ=headR*.86*h.headDepth;
  const browMat=mat(h.hair,.72);
  const tearMat=new THREE.MeshPhysicalMaterial({color:'#d8edf0',transparent:true,opacity:.18+(h.tearline??.7)*.20,roughness:.04,clearcoat:1});
  for(const sx of [-1,1]){
    const s=sx<0?'L':'R', offset=sx*asym*headR*.10, ex=sx*eyeX+offset, ey=eyeY+offset*.12;
    place(group,sphere(headR*.155*h.eyeScale,headR*.088*h.eyeScale*h.eyelidOpen,headR*.064,materials.eyeWhite,30),ex,ey,eyeZ,0,0,0,`EyeBall_${s}`);
    place(group,sphere(headR*.066*h.eyeScale,headR*.066*h.eyeScale,headR*.030,materials.iris,24),ex,ey,eyeZ+headR*.052,0,0,0,`Iris_${s}`);
    place(group,sphere(headR*.025,headR*.025,headR*.010,materials.pupil,18),ex,ey,eyeZ+headR*.081,0,0,0,`Pupil_${s}`);
    place(group,sphere(headR*.158*h.eyeScale,headR*.091*h.eyeScale*h.eyelidOpen,headR*.018,materials.cornea,30),ex,ey,eyeZ+headR*.080,0,0,0,`Cornea_${s}`);
    const occ=new THREE.Mesh(new THREE.TorusGeometry(headR*.118*h.eyeScale,headR*.012,8,40,Math.PI),materials.eyeOcclusion);
    place(group,occ,ex,ey-headR*.010,eyeZ+headR*.069,0,0,sx<0?Math.PI:0,`EyeOcclusion_${s}`);
    place(group,createTearline(headR,tearMat),ex,ey-headR*.072*h.eyeScale,eyeZ+headR*.078,0,0,0,`Tearline_${s}`);
    const brow=new THREE.Mesh(new THREE.BoxGeometry(headR*.30*h.browThickness,headR*.026*h.browThickness,headR*.018),browMat);
    place(group,brow,sx*eyeX,eyeY+headR*.22*h.browHeight,eyeZ+headR*.045,0,0,sx*-.10,`Brow_${s}`);
    place(group,sphere(headR*.105*h.earScale,headR*.19*h.earScale,headR*.055,materials.skin,24),sx*headR*.93*h.faceWidth,headY-headR*.02,-headR*.02,0,0,0,`Ear_${s}`);
  }
  const bridge=new THREE.Mesh(new THREE.CapsuleGeometry(headR*.055*h.noseWidth,headR*.19*h.noseScale,6,18),materials.skin);
  place(group,bridge,0,headY+headR*.01,headR*.84*h.headDepth,Math.PI/2,0,0,'NoseBridge');
  const nose=new THREE.Mesh(new THREE.ConeGeometry(headR*.105*h.noseWidth,headR*.31*h.noseScale,24),materials.skin);
  place(group,nose,0,headY-headR*.08,headR*.91*h.headDepth,Math.PI/2,0,0,'NoseTip');
  for(const sx of [-1,1]) place(group,sphere(headR*.032*h.noseWidth,headR*.025,headR*.016,materials.shadow,18),sx*headR*.055*h.noseWidth,headY-headR*.19,headR*.985*h.headDepth,0,0,0,`Nostril_${sx<0?'L':'R'}`);
  const lipMat=mat(h.lipColor,.42,0);
  place(group,sphere(headR*.19*h.mouthWidth,headR*.037*h.lipFullness,headR*.032,lipMat,30),0,headY-headR*.35,headR*.88*h.headDepth,0,0,0,'Lip_Upper');
  place(group,sphere(headR*.18*h.mouthWidth,headR*.032*h.lipFullness,headR*.029,lipMat,30),0,headY-headR*.40,headR*.87*h.headDepth,0,0,0,'Lip_Lower');
  place(group,new THREE.Mesh(new THREE.BoxGeometry(headR*.30*h.mouthWidth,headR*.010,headR*.010),materials.shadow),0,headY-headR*.375,headR*.918*h.headDepth,0,0,0,'MouthGap');
  if((h.oralDetail??.8)>.35){
    place(group,new THREE.Mesh(new THREE.BoxGeometry(headR*.25*h.mouthWidth,headR*.038,headR*.018),materials.teeth),0,headY-headR*.375,headR*.927*h.headDepth,0,0,0,'Teeth');
    place(group,sphere(headR*.12*h.mouthWidth,headR*.018,headR*.028,materials.tongue,20),0,headY-headR*.397,headR*.920*h.headDepth,0,0,0,'Tongue');
  }
  return group;
}

function createHair(h,p,material){
  const {headR,headY}=p; const hair=new THREE.Group(); hair.name='HairSystem';
  place(hair,sphere(headR*1.035,headR*.82,headR*1.02,material,48),0,headY+headR*.27,-headR*.045,0,0,0,'HairScalp');
  if(h.hairStyle==='short')return hair;
  const base=h.hairStyle==='bob'?24:34, strands=Math.max(16,Math.round(base*(h.hairDensity??1))), length=headR*(h.hairStyle==='bob'?1.15:2.25)*h.hairLength, spread=h.hairStyle==='bob'?.84:.92;
  for(let i=0;i<strands;i++){
    const u=i/(strands-1),side=u*2-1,rootX=side*headR*spread,rootY=headY+headR*(.30-.25*Math.abs(side)),rootZ=-headR*(.05+.16*Math.abs(side));
    const wave=Math.sin(u*Math.PI*5)*headR*.055*(h.hairStyle==='long-side'?1:0),tipX=rootX+side*headR*.18+wave,tipY=rootY-length*(.72+.18*Math.abs(side)),tipZ=rootZ-headR*(.10+.22*(1-Math.abs(side))),r=headR*(h.hairStyle==='bob'?.045:.034);
    const strand=createTaperedLimb({start:[rootX,rootY,rootZ],end:[tipX,tipY,tipZ],radii:[r,r*.78,r*.18],material,radialSegments:8,segments:10,ellipticity:.58}); strand.name=`HairStrand_${i}`; hair.add(strand);
  }
  return hair;
}
function createGarmentShell(h,p,material){const sp={...p,bodyMass:p.bodyMass*(h.outfit==='jacket'?1.10:h.outfit==='formal'?1.07:1.035),chestWidth:p.chestWidth*(h.outfit==='jacket'?1.05:1.01),waistWidth:p.waistWidth*(h.outfit==='formal'?1.02:1),shoulderWidth:p.shoulderWidth*(h.outfit==='jacket'?1.04:1.01)};const shell=createTorsoMesh(sp,material,48);shell.name='UpperGarment';return shell;}

function createLegParts(h,p,materials){
  const parts=[],rigid=[]; const H=p.H,upperLeg=p.legLen*.50,lowerLeg=p.legLen*.43,thighTopY=p.hipY-H*.020,kneeY=thighTopY-upperLeg,ankleY=Math.max(H*.060,kneeY-lowerLeg),legX=p.hipHalf*.55;
  const thighR=H*.037*p.bodyMass*(1+(p.glute-1)*.28),calfR=H*.029*p.bodyMass*(1+(p.muscle-1)*.34);
  for(const sx of [-1,1]){
    const s=sx<0?'L':'R';
    const thigh=createTaperedLimb({start:[sx*legX,thighTopY,0],end:[sx*legX*.98,kneeY,H*.005],radii:[thighR*1.06,thighR*.92,H*.030*p.bodyMass],material:materials.bottom,radialSegments:34,segments:16,ellipticity:.90});thigh.name=`Thigh_${s}`;parts.push(thigh);
    const calf=createTaperedLimb({start:[sx*legX*.98,kneeY,H*.005],end:[sx*legX*.96,ankleY,0],radii:[H*.030*p.bodyMass,calfR*1.06,H*.020*p.bodyMass],material:materials.skin,radialSegments:30,segments:14,ellipticity:.92});calf.name=`Calf_${s}`;parts.push(calf);
    const foot=createFoot(H,H*.043*p.bodyMass,H*.082,materials.shoe);foot.position.set(sx*legX*.96,0,H*.035);foot.name=`FootMesh_${s}`;rigid.push({mesh:foot,bone:`foot_${s}`});
  }
  return {parts,rigid};
}
function createArmParts(h,p,materials){
  const parts=[]; const H=p.H,armLen=H*.325*h.armLength,upperLen=armLen*.49,lowerLen=armLen*.43,shoulderX=p.shoulderHalf*.96,shoulderY=p.shoulderY-H*.014;
  const upperR=H*.0255*p.bodyMass*(1+(p.muscle-1)*.36),foreR=H*.0215*p.bodyMass*(1+(p.muscle-1)*.28);
  for(const sx of [-1,1]){
    const s=sx<0?'L':'R',elbow=[sx*(shoulderX+H*.012),shoulderY-upperLen,H*.002],wrist=[sx*(shoulderX+H*.020),shoulderY-upperLen-lowerLen,H*.006];
    const upper=createTaperedLimb({start:[sx*shoulderX,shoulderY,0],end:elbow,radii:[upperR*1.08,upperR,upperR*.82],material:materials.top,radialSegments:28,segments:12,ellipticity:.96});upper.name=`UpperArmMesh_${s}`;parts.push(upper);
    const fore=createTaperedLimb({start:elbow,end:wrist,radii:[foreR*1.06,foreR,foreR*.70],material:materials.skin,radialSegments:26,segments:12,ellipticity:.94});fore.name=`ForearmMesh_${s}`;parts.push(fore);
  }
  return {parts};
}
function attachPreservingWorld(root,bone,obj){root.add(obj);root.updateMatrixWorld(true);bone.attach(obj);}
function attachLocal(bone,obj,offset=[0,0,0]){obj.position.set(...offset);bone.add(obj);}

export function generateHuman(input){
  const h=resolveHumanProfile(input); const root=new THREE.Group(); root.name='ProceduralHuman';
  const H=h.height,female=h.sex==='female',bodyMass=h.bodyMass,legLen=H*.455*h.legLength,torsoLen=H*.285*h.torsoLength,hipY=legLen,shoulderY=hipY+torsoLen,headR=H*.083*h.headScale,neckY=shoulderY+H*.047,headY=neckY+headR*1.08,shoulderHalf=H*.112*h.shoulderWidth*(female?.95:1.07),hipHalf=H*.087*h.hipWidth*(female?1.08:.96);
  const p={H,female,bodyMass,legLen,torsoLen,hipY,shoulderY,headR,headY,shoulderHalf,hipHalf,shoulderWidth:h.shoulderWidth,hipWidth:h.hipWidth,waistWidth:h.waistWidth,chestWidth:h.chestWidth,chestDepth:h.chestDepth,glute:h.glute,muscle:h.muscle,sexWidth:female?.95:1.05,sexHip:female?1.07:.96,faceWidth:h.faceWidth,jawWidth:h.jawWidth,cheekbones:h.cheekbones,headDepth:h.headDepth,chinSize:h.chinSize,foreheadHeight:h.foreheadHeight};
  const materials={skin:skinMaterial(h),eyeWhite:mat('#f4f5f1',.20),iris:mat(h.eyes,.18),pupil:mat('#090b0d',.18),cornea:corneaMaterial(h),eyeOcclusion:mat('#3b2522',.52),shadow:mat('#2b1715',.60),teeth:mat('#f1eee5',.30),tongue:mat('#a05257',.48),hair:mat(h.hair,.60),top:mat(h.topColor,.80),bottom:mat(h.bottomColor,.84),shoe:mat('#111318',.52,.06)};
  const rig=createHumanoidRig(p); root.add(rig); root.updateMatrixWorld(true);
  const sourceMeshes=[];
  const pelvis=createPelvisMesh(p,materials.bottom,52);pelvis.name='PelvisSurface';sourceMeshes.push(pelvis);
  const torso=createTorsoMesh(p,materials.skin,56);torso.name='TorsoAnatomy';sourceMeshes.push(torso);
  const garment=createGarmentShell(h,p,materials.top);sourceMeshes.push(garment);
  const head=createHeadMesh(p,materials.skin,68,50);head.name='ParametricHead';sourceMeshes.push(head);
  const legs=createLegParts(h,p,materials),arms=createArmParts(h,p,materials);sourceMeshes.push(...legs.parts,...arms.parts);
  const skinnedMeshes=sourceMeshes.map(mesh=>autoSkinMesh(mesh,rig,p));skinnedMeshes.forEach(mesh=>root.add(mesh));
  const headSkinned=skinnedMeshes.find(mesh=>mesh.name==='ParametricHead');

  const neck=createNeck(H,neckY,H*.027*h.neckThickness*bodyMass,materials.skin);attachPreservingWorld(root,rig.userData.bones.neck,neck);
  const face=createFaceGroup(h,p,materials);attachPreservingWorld(root,rig.userData.bones.head,face);
  const hair=createHair(h,p,materials.hair);attachPreservingWorld(root,rig.userData.bones.head,hair);
  legs.rigid.forEach(({mesh,bone})=>attachPreservingWorld(root,rig.userData.bones[bone],mesh));
  for(const side of ['L','R']){
    const handParts=createDetailedHandGeometry(p,side,materials.skin,{handScale:h.handScale??1,fingerLength:h.fingerLength??1});
    handParts.forEach(({mesh,bone,localOffset})=>{const target=rig.userData.bones[bone];if(target)attachLocal(target,mesh,localOffset);});
  }

  const rigHelper=createRigHelper(rig,!!h.rigVisible);root.add(rigHelper);
  const poseController=createPoseController(rig,h);
  const facialController=createFacialController(face,h);
  const faceMorphController=createFaceMorphController(headSkinned,p,h);
  const correctiveController=createCorrectiveController(skinnedMeshes,rig,p,h);
  root.userData.update=time=>{
    poseController(time);
    correctiveController();
    faceMorphController();
    facialController(time);
    if(h.animation==='idle')root.rotation.y=Math.sin(time*.28)*.008*(h.animationStrength??.55);
  };
  root.userData.profile=h;
  root.userData.rig={type:'humanoid-v3',bones:Object.keys(rig.userData.bones),retarget:rig.userData.retarget,autoSkin:'nearest-bone-semantic-v1',correctives:'pose-space-v1',faceMorphs:'procedural-blendshape-v1',ik:!!h.ikEnabled,fingers:true};
  root.userData.stats={height:H,age:Math.round(h.age??0),autonomy:h.autonomy??0,mode:'parametric-human-v6',parts:root.children.length,topology:'procedural-skinned-surfaces',fidelity:'rigged-autoskinned-corrective-hands-face-morphs'};
  return root;
}
