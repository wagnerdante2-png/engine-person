import * as THREE from 'three';

const CANONICAL=['hips','spine','chest','upperChest','neck','head','clavicle_L','upperArm_L','lowerArm_L','hand_L','clavicle_R','upperArm_R','lowerArm_R','hand_R','upperLeg_L','lowerLeg_L','foot_L','upperLeg_R','lowerLeg_R','foot_R'];

function capture(bones,names){
  const out={};names.forEach(n=>{const b=bones[n];if(b)out[n]={q:b.quaternion.clone(),p:b.position.clone()};});return out;
}
function restore(bones,snap){Object.entries(snap).forEach(([n,v])=>{bones[n]?.quaternion.copy(v.q);bones[n]?.position.copy(v.p);});}

export function bakeProceduralClip(rig,controller,{name='EnginePerson_Action',duration=2,fps=30,bones=CANONICAL}={}){
  const map=rig?.userData?.bones;if(!map)throw new Error('Rig inválido para baking.');
  const names=bones.filter(n=>map[n]);const base=capture(map,names);const times=[];const qData=new Map();const pData=new Map();
  names.forEach(n=>{qData.set(n,[]);pData.set(n,[]);});
  const frames=Math.max(2,Math.ceil(duration*fps));
  for(let i=0;i<=frames;i++){
    const t=i/frames*duration;times.push(t);controller(t);
    names.forEach(n=>{const b=map[n];qData.get(n).push(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w);pData.get(n).push(b.position.x,b.position.y,b.position.z);});
  }
  restore(map,base);
  const tracks=[];
  names.forEach(n=>{
    tracks.push(new THREE.QuaternionKeyframeTrack(`${n}.quaternion`,times,qData.get(n)));
    if(n==='hips')tracks.push(new THREE.VectorKeyframeTrack(`${n}.position`,times,pData.get(n)));
  });
  const clip=new THREE.AnimationClip(name,duration,tracks);clip.optimize();return clip;
}

export function createAnimationLibrary(){
  const clips=new Map();
  return {add(clip){clips.set(clip.name,clip);return clip;},get(name){return clips.get(name);},remove(name){return clips.delete(name);},clear(){clips.clear();},list(){return [...clips.values()];},names(){return [...clips.keys()];}};
}
