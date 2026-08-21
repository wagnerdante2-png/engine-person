import * as THREE from 'three';
import { createTorsoMesh, createPelvisMesh, createHeadMesh, createTaperedLimb, createFoot } from '../geometry/anatomy.js';
import { createFlameOpenHead, createFlameEyeAssembly } from '../geometry/flame-open-head.js';
import { createDetailedHandGeometry } from '../geometry/hands.js';
import { createJointContinuityMeshes, createJointVolumeController } from '../geometry/body-continuity.js';
import { createAnatomicalNeck, createShoulderCaps, createKneeCap } from '../geometry/human-realism.js';
import { createSurfaceFaceDetails } from '../geometry/face-details.js';
import { sculptCraniofacialSurface } from '../geometry/craniofacial-sculpt.js';
import { refineHeadSurface, refineBodySurface } from '../geometry/human-surface-refinement.js';
import { EnginePersonHumanModel } from '../model/human-model.js';
import { applyRegionalAnatomy } from '../model/regional-anatomy.js';
import { buildStaticLandmarkEmbedding, readLandmarks, dynamicContourLandmarks } from '../model/landmark-system.js';
import { createFaceArticulationController } from '../model/face-articulation.js';
import { applyProceduralSkinColors, enhanceSkinMaterial } from '../materials/skin-surface.js';
import { resolveHumanProfile } from './human-profile.js';
import { createHumanoidRig, createPoseController, createRigHelper } from '../rig/skeleton.js';
import { autoSkinMesh } from '../rig/skinning.js';
import { createCorrectiveController } from '../rig/correctives.js';
import { createFacialController } from './facial-animation.js';
import { createProceduralHair, updateHairSecondaryMotion } from './hair-system.js';
import { createConformingGarment, createGarmentDynamicsController } from './garment-system.js';

const mat=(color,roughness=.72,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const skinMaterial=h=>enhanceSkinMaterial(new THREE.MeshPhysicalMaterial({
  color:h.skin,roughness:h.skinRoughness??.46,metalness:0,
  clearcoat:.035,clearcoatRoughness:.72,sheen:.09,sheenRoughness:.82,
  transmission:0,thickness:.10+(h.subsurface??.4)*.09
}),h);
const corneaMaterial=h=>new THREE.MeshPhysicalMaterial({
  color:'#f8fbff',transparent:true,opacity:.17+(h.eyeWetness??.7)*.11,
  roughness:.025,transmission:.18,thickness:.012,clearcoat:1,clearcoatRoughness:.012
});
function attachPreservingWorld(root,bone,obj){root.add(obj);root.updateMatrixWorld(true);bone.attach(obj);}
function attachLocal(bone,obj,offset=[0,0,0]){obj.position.set(...offset);bone.add(obj);}

function createLegParts(h,p,M){
  const meshes=[],rigid=[],H=p.H,upper=p.legLen*.50,lower=p.legLen*.43,top=p.hipY-H*.018,knee=top-upper,ankle=Math.max(H*.064,knee-lower),x=p.hipHalf*.54;
  const thighTop=H*.043*p.bodyMass*(1+(p.glute-1)*.24),thighMid=H*.038*p.bodyMass*(1+(p.muscle-1)*.28),kneeR=H*.029*p.bodyMass,calfMax=H*.033*p.bodyMass*(1+(p.muscle-1)*.30),ankleR=H*.0205*p.bodyMass;
  for(const sx of [-1,1]){
    const s=sx<0?'L':'R';
    const thigh=createTaperedLimb({start:[sx*x,top,-H*.004],end:[sx*x*.985,knee,H*.006],radii:[thighTop,thighMid,kneeR],material:M.skin,radialSegments:44,segments:28,ellipticity:.91});thigh.name=`Thigh_${s}`;meshes.push(thigh);
    const calf=createTaperedLimb({start:[sx*x*.985,knee,H*.006],end:[sx*x*.965,ankle,0],radii:[kneeR,calfMax,ankleR],material:M.skin,radialSegments:42,segments:26,ellipticity:.90});calf.name=`Calf_${s}`;meshes.push(calf);
    const foot=createFoot(H,H*.037*p.bodyMass,H*.074,M.shoe);foot.position.set(sx*x*.965,0,H*.044);foot.scale.set(1,.86,1.06);foot.name=`FootMesh_${s}`;rigid.push({mesh:foot,bone:`foot_${s}`});
  }
  return {meshes,rigid};
}

function createArmParts(h,p,M){
  const meshes=[],H=p.H,armLen=H*.318*h.armLength,upperLen=armLen*.50,lowerLen=armLen*.43,x=p.shoulderHalf*.94,y=p.shoulderY-H*.020;
  const upperTop=H*.031*p.bodyMass*(1+(p.muscle-1)*.34),upperMid=H*.027*p.bodyMass*(1+(p.muscle-1)*.30),elbowR=H*.0205*p.bodyMass,foreMax=H*.0245*p.bodyMass*(1+(p.muscle-1)*.25),wristR=H*.0165*p.bodyMass;
  for(const sx of [-1,1]){
    const s=sx<0?'L':'R',elbow=[sx*(x+H*.010),y-upperLen,H*.004],wrist=[sx*(x+H*.014),y-upperLen-lowerLen,H*.008];
    const upper=createTaperedLimb({start:[sx*x,y,0],end:elbow,radii:[upperTop,upperMid,elbowR],material:M.skin,radialSegments:40,segments:24,ellipticity:.95});upper.name=`UpperArmMesh_${s}`;meshes.push(upper);
    const fore=createTaperedLimb({start:elbow,end:wrist,radii:[elbowR,foreMax,wristR],material:M.skin,radialSegments:38,segments:24,ellipticity:.93});fore.name=`ForearmMesh_${s}`;meshes.push(fore);
  }
  return meshes;
}

function prepareSkinMesh(mesh,h,a,region='body'){
  applyRegionalAnatomy(mesh,h,a,{region});
  applyProceduralSkinColors(mesh,h,(h.seed??1)+(mesh.name?.length??0)*31);
  return mesh;
}

function createSafeHead(h,a,p,M,humanModel){
  try{
    const head=createFlameOpenHead(h,a,M.skin);head.name='ParametricHead';
    const count=head.geometry?.attributes?.position?.count??0;
    if(count<100)throw new Error(`FLAME mesh inválida: ${count} vértices`);
    humanModel.applyExpression(head);
    applyProceduralSkinColors(head,h,(h.seed??1)+911);
    head.userData.enginePersonHead={source:'FLAME2023_Open',fallback:false};
    return {head,flame:true};
  }catch(error){
    console.error('[Engine Person] FLAME head failed; using safe procedural fallback.',error);
    const head=createHeadMesh(p,M.skin,128,92);head.name='ParametricHead';
    humanModel.applyIdentity(head,'head');
    applyRegionalAnatomy(head,h,a,{region:'head'});
    sculptCraniofacialSurface(head,h,a);
    refineHeadSurface(head,a,h);
    humanModel.applyExpression(head);
    applyProceduralSkinColors(head,h,(h.seed??1)+911);
    head.userData.enginePersonHead={source:'procedural-fallback',fallback:true,error:String(error?.message??error)};
    return {head,flame:false};
  }
}

export function generateHuman(input){
  const h=resolveHumanProfile(input),root=new THREE.Group();root.name='ProceduralHuman';
  const humanModel=new EnginePersonHumanModel(h),a=humanModel.anthropometry;
  const H=a.H,female=a.female,bodyMass=h.bodyMass;
  const legLen=Math.max(H*.39,a.hipY),torsoLen=Math.max(H*.245,a.shoulderY-a.hipY),hipY=a.hipY,shoulderY=a.shoulderY;
  const headR=a.headR,headY=a.headY,shoulderHalf=a.shoulderHalf,hipHalf=a.hipHalf;
  const p={H,female,bodyMass,legLen,torsoLen,hipY,shoulderY,headR,headY,shoulderHalf,hipHalf,shoulderWidth:h.shoulderWidth,hipWidth:h.hipWidth,waistWidth:h.waistWidth,chestWidth:h.chestWidth,chestDepth:h.chestDepth,glute:h.glute,muscle:h.muscle,sexWidth:female?.95:1.05,sexHip:female?1.07:.96,faceWidth:h.faceWidth,jawWidth:h.jawWidth,cheekbones:h.cheekbones,headDepth:h.headDepth,chinSize:h.chinSize,foreheadHeight:h.foreheadHeight};
  const M={skin:skinMaterial(h),eyeWhite:mat('#f4f3ee',.22),iris:mat(h.eyes,.17),pupil:mat('#08090b',.15),cornea:corneaMaterial(h),teeth:mat('#eee9df',.28),tongue:mat('#a4565c',.46),hair:mat(h.hair,.58),bottom:mat(h.bottomColor,.80),shoe:mat('#15171c',.50,.04)};

  const rig=createHumanoidRig(p);root.add(rig);root.updateMatrixWorld(true);
  const skinSources=[];
  const pelvis=createPelvisMesh(p,M.skin,76);pelvis.name='PelvisSurface';humanModel.applyIdentity(pelvis,'body');prepareSkinMesh(pelvis,h,a,'body');skinSources.push(pelvis);
  const torso=createTorsoMesh(p,M.skin,88);torso.name='TorsoAnatomy';humanModel.applyIdentity(torso,'body');prepareSkinMesh(torso,h,a,'body');skinSources.push(torso);

  // Keep FLAME outside auto-skinning during the first integration pass. The head is
  // attached rigidly to the canonical head bone, which prevents a malformed FLAME
  // payload or head-specific skin weights from taking down the whole character.
  const headPack=createSafeHead(h,a,p,M,humanModel),head=headPack.head;
  const landmarkEmbedding=buildStaticLandmarkEmbedding(head,a,h);

  const legs=createLegParts(h,p,M),arms=createArmParts(h,p,M);
  [...legs.meshes,...arms].forEach(m=>{humanModel.applyIdentity(m,'body');prepareSkinMesh(m,h,a,'body');});
  skinSources.push(...legs.meshes,...arms);refineBodySurface([pelvis,torso,...legs.meshes,...arms],a,h);

  const continuity=createJointContinuityMeshes(p,M);continuity.children.forEach(m=>{prepareSkinMesh(m,h,a,'body');skinSources.push(m);});
  const shoulders=createShoulderCaps(p,M.skin);shoulders.children.forEach(m=>{prepareSkinMesh(m,h,a,'body');skinSources.push(m);});
  const kneeL=createKneeCap(p,'L',M.skin),kneeR=createKneeCap(p,'R',M.skin);prepareSkinMesh(kneeL,h,a,'body');prepareSkinMesh(kneeR,h,a,'body');skinSources.push(kneeL,kneeR);
  const skinned=skinSources.map(m=>autoSkinMesh(m,rig,p));skinned.forEach(m=>root.add(m));

  attachPreservingWorld(root,rig.userData.bones.head,head);
  const neck=createAnatomicalNeck(p,M.skin);applyProceduralSkinColors(neck,h,(h.seed??1)+77);attachPreservingWorld(root,rig.userData.bones.neck,neck);
  const garmentPack=createConformingGarment(h,p),oldShell=garmentPack.shell;garmentPack.group.remove(oldShell);const garmentSkinned=autoSkinMesh(oldShell,rig,p);garmentPack.group.add(garmentSkinned);root.add(garmentPack.group);

  let face;
  try{face=headPack.flame?createFlameEyeAssembly(h,a,M):createSurfaceFaceDetails(h,p,M);}catch(error){console.error('[Engine Person] FLAME eye assembly failed; using fallback facial details.',error);face=createSurfaceFaceDetails(h,p,M);}
  attachPreservingWorld(root,rig.userData.bones.head,face);
  const hair=createProceduralHair(h,p);attachPreservingWorld(root,rig.userData.bones.head,hair);

  for(const side of ['L','R'])for(const item of createDetailedHandGeometry(p,side,M.skin,h))if(rig.userData.bones[item.bone]){applyProceduralSkinColors(item.mesh,h,(h.seed??1)+(side==='L'?301:401));attachLocal(rig.userData.bones[item.bone],item.mesh,item.localOffset);}
  for(const item of legs.rigid)if(rig.userData.bones[item.bone])attachPreservingWorld(root,rig.userData.bones[item.bone],item.mesh);

  const rigHelper=createRigHelper(rig,!!h.rigVisible);root.add(rigHelper);
  const poseController=createPoseController(rig,h),facialController=createFacialController(face,h),articulation=createFaceArticulationController(face,rig,h);
  const correctives=createCorrectiveController([...skinned,garmentSkinned],rig,p,h),jointVolumes=createJointVolumeController(continuity,rig,h.continuityStrength??.80),garmentDynamics=createGarmentDynamicsController(garmentPack.group,h);
  root.userData.update=time=>{poseController(time);articulation(time);facialController(time);correctives(time);jointVolumes(time);garmentDynamics(time);updateHairSecondaryMotion(hair,time,h);if(h.animation==='idle')root.rotation.y=Math.sin(time*.28)*.006*(h.animationStrength??.55);};
  root.userData.profile=h;root.userData.anthropometry=a;root.userData.humanModel=humanModel.metadata();
  root.userData.landmarks={embedding:landmarkEmbedding,static:()=>readLandmarks(head,landmarkEmbedding),dynamicContour:()=>dynamicContourLandmarks(head,a,h,THREE.MathUtils.degToRad(h.neckYaw??0))};
  root.userData.rig={type:'humanoid-v9',bones:Object.keys(rig.userData.bones),retarget:rig.userData.retarget,autoSkin:'nearest-bone-semantic-v1',ik:!!h.ikEnabled,correctives:true,articulatedFace:true};
  root.userData.systems={humanModel:'EPHM-1.4',headBase:headPack.flame?'FLAME2023_Open-CC-BY-4.0':'procedural-fallback',shapeSpace:'engine-person-shape-v1-body',expressionSpace:'ephm-expression-v1',landmarks:'static+dynamic-contour-v1',faceArticulation:'neck-jaw-eyes-v1',regionalAnatomy:'regional-fields-v2-body',skinSurface:'procedural-microvariation-v1',hair:hair.userData.hair,garment:garmentPack.group.userData.garment,continuity:continuity.userData.continuity,hands:'five-finger-3-phalanx'};
  root.userData.stats={height:H,age:Math.round(h.age??0),autonomy:h.autonomy??0,mode:'parametric-human-v14.1',parts:root.children.length,topology:headPack.flame?'flame-head+ephm-body':'fallback-head+ephm-body',fidelity:'FLAME-base-integration-safe-pass'};
  return root;
}
