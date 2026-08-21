import * as THREE from 'three';
import { createTorsoMesh, createPelvisMesh, createHeadMesh, createTaperedLimb, createFoot } from '../geometry/anatomy.js';
import { createDetailedHandGeometry } from '../geometry/hands.js';
import { createJointContinuityMeshes, createJointVolumeController } from '../geometry/body-continuity.js';
import { resolveHumanProfile } from './human-profile.js';
import { createHumanoidRig, createPoseController, createRigHelper } from '../rig/skeleton.js';
import { autoSkinMesh } from '../rig/skinning.js';
import { createCorrectiveController } from '../rig/correctives.js';
import { createFacialController } from './facial-animation.js';
import { createFaceMorphController } from './face-morphs.js';
import { createProceduralHair, updateHairSecondaryMotion } from './hair-system.js';
import { createConformingGarment, createGarmentDynamicsController } from './garment-system.js';

const mat=(color,roughness=.72,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const skinMaterial=h=>new THREE.MeshPhysicalMaterial({color:h.skin,roughness:h.skinRoughness??.46,metalness:0,clearcoat:.05,clearcoatRoughness:.72,sheen:.10,sheenRoughness:.82,thickness:.08+(h.subsurface??.4)*.08});
const corneaMaterial=h=>new THREE.MeshPhysicalMaterial({color:'#f5fbff',transparent:true,opacity:.14+(h.eyeWetness??.7)*.12,roughness:.04,transmission:.16,thickness:.015,clearcoat:1,clearcoatRoughness:.02});
function sphere(rx,ry,rz,material,seg=32){const g=new THREE.SphereGeometry(1,seg,Math.max(16,Math.round(seg/2)));g.scale(rx,ry,rz);const m=new THREE.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;return m;}
function place(group,mesh,x,y,z,name=''){mesh.position.set(x,y,z);if(name)mesh.name=name;group.add(mesh);return mesh;}
function attachPreservingWorld(root,bone,obj){root.add(obj);root.updateMatrixWorld(true);bone.attach(obj);}
function attachLocal(bone,obj,offset=[0,0,0]){obj.position.set(...offset);bone.add(obj);}

function createFaceGroup(h,p,M){
  const g=new THREE.Group();g.name='FaceAssembly';
  const {headR,headY}=p,eyeY=headY+headR*.10,eyeX=headR*.34*h.eyeSpacing,eyeZ=headR*.86*h.headDepth;
  for(const sx of [-1,1]){
    const s=sx<0?'L':'R',x=sx*eyeX;
    place(g,sphere(headR*.155*h.eyeScale,headR*.088*h.eyeScale*h.eyelidOpen,headR*.064,M.eyeWhite,30),x,eyeY,eyeZ,`EyeBall_${s}`);
    place(g,sphere(headR*.066*h.eyeScale,headR*.066*h.eyeScale,headR*.030,M.iris,24),x,eyeY,eyeZ+headR*.052,`Iris_${s}`);
    place(g,sphere(headR*.025,headR*.025,headR*.010,M.pupil,18),x,eyeY,eyeZ+headR*.081,`Pupil_${s}`);
    place(g,sphere(headR*.158*h.eyeScale,headR*.091*h.eyeScale*h.eyelidOpen,headR*.018,M.cornea,30),x,eyeY,eyeZ+headR*.080,`Cornea_${s}`);
    const brow=new THREE.Mesh(new THREE.BoxGeometry(headR*.30*h.browThickness,headR*.026*h.browThickness,headR*.018),M.hair);
    brow.rotation.z=sx*-.10;place(g,brow,x,eyeY+headR*.22*h.browHeight,eyeZ+headR*.045,`Brow_${s}`);
    place(g,sphere(headR*.105*h.earScale,headR*.19*h.earScale,headR*.055,M.skin,24),sx*headR*.93*h.faceWidth,headY-headR*.02,-headR*.02,`Ear_${s}`);
  }
  const bridge=new THREE.Mesh(new THREE.CapsuleGeometry(headR*.055*h.noseWidth,headR*.19*h.noseScale,6,18),M.skin);bridge.rotation.x=Math.PI/2;place(g,bridge,0,headY+headR*.01,headR*.84*h.headDepth,'NoseBridge');
  const nose=new THREE.Mesh(new THREE.ConeGeometry(headR*.105*h.noseWidth,headR*.31*h.noseScale,24),M.skin);nose.rotation.x=Math.PI/2;place(g,nose,0,headY-headR*.08,headR*.91*h.headDepth,'NoseTip');
  const lip=mat(h.lipColor,.42);
  place(g,sphere(headR*.19*h.mouthWidth,headR*.037*h.lipFullness,headR*.032,lip,30),0,headY-headR*.35,headR*.88*h.headDepth,'Lip_Upper');
  place(g,sphere(headR*.18*h.mouthWidth,headR*.032*h.lipFullness,headR*.029,lip,30),0,headY-headR*.40,headR*.87*h.headDepth,'Lip_Lower');
  if((h.oralDetail??.8)>.35){
    place(g,new THREE.Mesh(new THREE.BoxGeometry(headR*.25*h.mouthWidth,headR*.038,headR*.018),M.teeth),0,headY-headR*.382,headR*.923*h.headDepth,'Teeth');
    place(g,sphere(headR*.12*h.mouthWidth,headR*.018,headR*.028,M.tongue,20),0,headY-headR*.401,headR*.918*h.headDepth,'Tongue');
  }
  return g;
}

function createLegParts(h,p,M){
  const meshes=[],rigid=[],H=p.H,upper=p.legLen*.50,lower=p.legLen*.43,top=p.hipY-H*.020,knee=top-upper,ankle=Math.max(H*.060,knee-lower),x=p.hipHalf*.55;
  const thighR=H*.037*p.bodyMass*(1+(p.glute-1)*.28),calfR=H*.029*p.bodyMass*(1+(p.muscle-1)*.34);
  for(const sx of [-1,1]){
    const s=sx<0?'L':'R';
    const thigh=createTaperedLimb({start:[sx*x,top,0],end:[sx*x*.98,knee,H*.005],radii:[thighR*1.06,thighR*.92,H*.030*p.bodyMass],material:M.bottom,radialSegments:34,segments:18,ellipticity:.90});thigh.name=`Thigh_${s}`;meshes.push(thigh);
    const calf=createTaperedLimb({start:[sx*x*.98,knee,H*.005],end:[sx*x*.96,ankle,0],radii:[H*.030*p.bodyMass,calfR*1.06,H*.020*p.bodyMass],material:M.skin,radialSegments:30,segments:16,ellipticity:.92});calf.name=`Calf_${s}`;meshes.push(calf);
    const foot=createFoot(H,H*.043*p.bodyMass,H*.082,M.shoe);foot.position.set(sx*x*.96,0,H*.035);foot.name=`FootMesh_${s}`;rigid.push({mesh:foot,bone:`foot_${s}`});
  }
  return {meshes,rigid};
}
function createArmParts(h,p,M){
  const meshes=[],H=p.H,armLen=H*.325*h.armLength,upperLen=armLen*.49,lowerLen=armLen*.43,x=p.shoulderHalf*.96,y=p.shoulderY-H*.014;
  const upperR=H*.0255*p.bodyMass*(1+(p.muscle-1)*.36),foreR=H*.0215*p.bodyMass*(1+(p.muscle-1)*.28);
  for(const sx of [-1,1]){
    const s=sx<0?'L':'R',elbow=[sx*(x+H*.012),y-upperLen,H*.002],wrist=[sx*(x+H*.020),y-upperLen-lowerLen,H*.006];
    const upper=createTaperedLimb({start:[sx*x,y,0],end:elbow,radii:[upperR*1.08,upperR,upperR*.82],material:M.skin,radialSegments:30,segments:14,ellipticity:.96});upper.name=`UpperArmMesh_${s}`;meshes.push(upper);
    const fore=createTaperedLimb({start:elbow,end:wrist,radii:[foreR*1.06,foreR,foreR*.70],material:M.skin,radialSegments:28,segments:14,ellipticity:.94});fore.name=`ForearmMesh_${s}`;meshes.push(fore);
  }
  return meshes;
}

export function generateHuman(input){
  const h=resolveHumanProfile(input),root=new THREE.Group();root.name='ProceduralHuman';
  const H=h.height,female=h.sex==='female',bodyMass=h.bodyMass,legLen=H*.455*h.legLength,torsoLen=H*.285*h.torsoLength,hipY=legLen,shoulderY=hipY+torsoLen,headR=H*.083*h.headScale,headY=shoulderY+H*.047+headR*1.08,shoulderHalf=H*.112*h.shoulderWidth*(female?.95:1.07),hipHalf=H*.087*h.hipWidth*(female?1.08:.96);
  const p={H,female,bodyMass,legLen,torsoLen,hipY,shoulderY,headR,headY,shoulderHalf,hipHalf,shoulderWidth:h.shoulderWidth,hipWidth:h.hipWidth,waistWidth:h.waistWidth,chestWidth:h.chestWidth,chestDepth:h.chestDepth,glute:h.glute,muscle:h.muscle,sexWidth:female?.95:1.05,sexHip:female?1.07:.96,faceWidth:h.faceWidth,jawWidth:h.jawWidth,cheekbones:h.cheekbones,headDepth:h.headDepth,chinSize:h.chinSize,foreheadHeight:h.foreheadHeight};
  const M={skin:skinMaterial(h),eyeWhite:mat('#f4f5f1',.20),iris:mat(h.eyes,.18),pupil:mat('#090b0d',.18),cornea:corneaMaterial(h),teeth:mat('#f1eee5',.30),tongue:mat('#a05257',.48),hair:mat(h.hair,.60),bottom:mat(h.bottomColor,.84),shoe:mat('#111318',.52,.06)};
  const rig=createHumanoidRig(p);root.add(rig);root.updateMatrixWorld(true);

  const skinSources=[];
  const pelvis=createPelvisMesh(p,M.skin,56);pelvis.name='PelvisSurface';skinSources.push(pelvis);
  const torso=createTorsoMesh(p,M.skin,64);torso.name='TorsoAnatomy';skinSources.push(torso);
  const head=createHeadMesh(p,M.skin,76,56);head.name='ParametricHead';skinSources.push(head);
  const legs=createLegParts(h,p,M);skinSources.push(...legs.meshes,...createArmParts(h,p,M));
  const continuity=createJointContinuityMeshes(p,M);continuity.children.forEach(m=>skinSources.push(m));
  const skinned=skinSources.map(m=>autoSkinMesh(m,rig,p));skinned.forEach(m=>root.add(m));

  const garmentPack=createConformingGarment(h,p);const oldShell=garmentPack.shell;garmentPack.group.remove(oldShell);const garmentSkinned=autoSkinMesh(oldShell,rig,p);garmentPack.group.add(garmentSkinned);root.add(garmentPack.group);
  const face=createFaceGroup(h,p,M);attachPreservingWorld(root,rig.userData.bones.head,face);
  const hair=createProceduralHair(h,p);attachPreservingWorld(root,rig.userData.bones.head,hair);
  for(const side of ['L','R']) for(const item of createDetailedHandGeometry(p,side,M.skin,h)) if(rig.userData.bones[item.bone]) attachLocal(rig.userData.bones[item.bone],item.mesh,item.localOffset);
  for(const item of legs.rigid) if(rig.userData.bones[item.bone]) attachPreservingWorld(root,rig.userData.bones[item.bone],item.mesh);

  const rigHelper=createRigHelper(rig,!!h.rigVisible);root.add(rigHelper);
  const poseController=createPoseController(rig,h),facialController=createFacialController(face,h),faceMorph=createFaceMorphController(skinned.find(m=>m.name==='ParametricHead'),p,h);
  const correctives=createCorrectiveController([...skinned,garmentSkinned],rig,p,h),jointVolumes=createJointVolumeController(continuity,rig,h.continuityStrength??.72),garmentDynamics=createGarmentDynamicsController(garmentPack.group,h);
  root.userData.update=time=>{poseController(time);facialController(time);faceMorph(time);correctives(time);jointVolumes(time);garmentDynamics(time);updateHairSecondaryMotion(hair,time,h);if(h.animation==='idle')root.rotation.y=Math.sin(time*.28)*.008*(h.animationStrength??.55);};
  root.userData.profile=h;
  root.userData.rig={type:'humanoid-v3',bones:Object.keys(rig.userData.bones),retarget:rig.userData.retarget,autoSkin:'nearest-bone-semantic-v1',ik:!!h.ikEnabled,correctives:true};
  root.userData.systems={hair:hair.userData.hair,garment:garmentPack.group.userData.garment,continuity:continuity.userData.continuity,faceMorphs:true,hands:'five-finger-3-phalanx'};
  root.userData.stats={height:H,age:Math.round(h.age??0),autonomy:h.autonomy??0,mode:'parametric-human-v7',parts:root.children.length,topology:'continuous-skinned-modular',fidelity:'production-pipeline-foundation'};
  return root;
}
