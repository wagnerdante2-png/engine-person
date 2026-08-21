import * as THREE from 'three';

const d=THREE.MathUtils.degToRad;

export function createFaceArticulationController(face,rig,h={}){
  const eyes={L:[],R:[]};
  face?.traverse?.(obj=>{
    const n=obj.name||'';
    if(/_(L)$/.test(n)&&/EyeBall|Iris|Pupil|Cornea/.test(n))eyes.L.push(obj);
    if(/_(R)$/.test(n)&&/EyeBall|Iris|Pupil|Cornea/.test(n))eyes.R.push(obj);
  });
  const bases=new Map();
  [...eyes.L,...eyes.R].forEach(o=>bases.set(o,{p:o.position.clone(),r:o.rotation.clone()}));
  const bones=rig?.userData?.bones??{};
  const jaw=bones.jaw,neck=bones.neck,head=bones.head;
  const eyeYaw=d(h.eyeYaw??0),eyePitch=d(h.eyePitch??0);
  const neckYaw=d(h.neckYaw??0),neckPitch=d(h.neckPitch??0);
  const jawOpen=THREE.MathUtils.clamp(h.jawOpen??0,0,1);
  const jawForward=THREE.MathUtils.clamp(h.jawForward??0,-1,1);

  return ()=>{
    if(neck){neck.rotation.y=neckYaw;neck.rotation.x=neckPitch;}
    if(head&&Math.abs(h.headTilt??0)>1e-5)head.rotation.z=d(h.headTilt);
    if(jaw){jaw.rotation.x=d(22)*jawOpen;jaw.position.z=(rig.userData.profile?.H??1.7)*.006*jawForward;}
    for(const side of ['L','R'])for(const obj of eyes[side]){
      const b=bases.get(obj);if(!b)continue;
      obj.rotation.set(b.r.x+eyePitch,b.r.y+eyeYaw,b.r.z);
    }
  };
}
