import * as THREE from 'three';

const lerp=THREE.MathUtils.lerp;
const clamp=THREE.MathUtils.clamp;

export function buildAnthropometricProfile(h){
  const H=h.height;
  const female=h.sex==='female';
  const mass=clamp(h.bodyMass??1,.72,1.35);
  const muscle=clamp(h.muscle??1,.75,1.35);
  const age=clamp(h.age??30,18,85);
  const headLength=H*(female?.126:.128)*(h.headScale??1);
  const eyeLine=H*.935-headLength*.43;
  const shoulderY=H*.815*(h.torsoLength??1);
  const hipY=H*.535*(h.legLength??1);
  const kneeY=H*.285*(h.legLength??1);
  const ankleY=H*.055;
  const shoulderHalf=H*(female?.105:.118)*(h.shoulderWidth??1)*(1+(muscle-1)*.08);
  const hipHalf=H*(female?.092:.083)*(h.hipWidth??1)*(1+(mass-1)*.08);
  const chestDepth=H*.082*(h.chestDepth??1)*(1+(mass-1)*.12);
  const waistHalf=H*.074*(h.waistWidth??1)*(1+(mass-1)*.10);
  const headR=headLength*.52;
  const headY=H-headLength*.48;
  const neckBaseY=shoulderY+H*.035;
  const faceFront=headR*.84*(h.headDepth??1);
  const ageSoftening=clamp((age-35)/50,0,1);
  return {
    H,female,mass,muscle,age,headLength,headR,headY,eyeLine,shoulderY,hipY,kneeY,ankleY,
    shoulderHalf,hipHalf,chestDepth,waistHalf,neckBaseY,faceFront,ageSoftening,
    elbowY:shoulderY-H*.205*(h.armLength??1),wristY:shoulderY-H*.385*(h.armLength??1),
    mouthY:headY-headR*.36,noseY:headY-headR*.13,browY:headY+headR*.23,
    eyeSpacing:headR*.31*(h.eyeSpacing??1),jawHalf:headR*.55*(h.jawWidth??1),cheekHalf:headR*.67*(h.cheekbones??1)
  };
}

export function faceLandmarks(a,h){
  const R=a.headR,F=a.faceFront,E=a.eyeSpacing;
  const skinSoft=.8+a.ageSoftening*.18;
  return [
    {name:'templeL',center:[-R*.62,a.headY+R*.12,F*.22],offset:[R*.018,0,-R*.018],radius:R*.34,strength:.8},
    {name:'templeR',center:[ R*.62,a.headY+R*.12,F*.22],offset:[-R*.018,0,-R*.018],radius:R*.34,strength:.8},
    {name:'browRidgeL',center:[-E,a.browY,F*.70],offset:[0,R*.020,R*.030],radius:R*.23,strength:.9},
    {name:'browRidgeR',center:[ E,a.browY,F*.70],offset:[0,R*.020,R*.030],radius:R*.23,strength:.9},
    {name:'orbitL',center:[-E,a.eyeLine,F*.78],offset:[0,-R*.010,-R*.040],radius:R*.22,strength:.95},
    {name:'orbitR',center:[ E,a.eyeLine,F*.78],offset:[0,-R*.010,-R*.040],radius:R*.22,strength:.95},
    {name:'zygomaL',center:[-a.cheekHalf*.72,a.headY-R*.02,F*.66],offset:[-R*.020,R*.006,R*.038],radius:R*.27,strength:1.0},
    {name:'zygomaR',center:[ a.cheekHalf*.72,a.headY-R*.02,F*.66],offset:[ R*.020,R*.006,R*.038],radius:R*.27,strength:1.0},
    {name:'nasalBridge',center:[0,a.headY+R*.04,F*.76],offset:[0,0,R*.040*(h.noseBridge??1)],radius:R*.24,strength:.95},
    {name:'nasalTip',center:[0,a.noseY,F*.82],offset:[0,-R*.004,R*.065*(h.noseScale??1)],radius:R*.20,strength:1.0},
    {name:'maxilla',center:[0,a.headY-R*.27,F*.69],offset:[0,-R*.006,R*.028],radius:R*.30,strength:.75},
    {name:'mouthPlane',center:[0,a.mouthY,F*.70],offset:[0,0,R*.020],radius:R*.25,strength:.55},
    {name:'chin',center:[0,a.headY-R*.61,F*.50],offset:[0,-R*.030*(h.chinSize??1),R*.038*(h.chinSize??1)],radius:R*.28,strength:1.0},
    {name:'jawL',center:[-a.jawHalf*.82,a.headY-R*.48,F*.22],offset:[-R*.018*(h.jawWidth??1),-R*.006,0],radius:R*.30,strength:.95},
    {name:'jawR',center:[ a.jawHalf*.82,a.headY-R*.48,F*.22],offset:[ R*.018*(h.jawWidth??1),-R*.006,0],radius:R*.30,strength:.95},
    {name:'submental',center:[0,a.headY-R*.72,F*.18],offset:[0,R*.012*skinSoft,-R*.012],radius:R*.24,strength:.7}
  ];
}

export function bodyLandmarks(a,h){
  const H=a.H;
  return [
    {center:[0,a.shoulderY-H*.015,0],offset:[0,H*.004,H*.012],radius:H*.13,strength:.75},
    {center:[0,lerp(a.hipY,a.shoulderY,.62),a.chestDepth*.65],offset:[0,H*.006,H*.018*(h.chestDepth??1)],radius:H*.16,strength:.8},
    {center:[0,lerp(a.hipY,a.shoulderY,.34),0],offset:[0,0,-H*.006],radius:H*.14,strength:.6},
    {center:[0,a.hipY-H*.025,-H*.025],offset:[0,0,-H*.016*(h.glute??1)],radius:H*.13,strength:.75},
    {center:[-a.hipHalf*.75,a.hipY-H*.02,0],offset:[-H*.010,0,0],radius:H*.11,strength:.65},
    {center:[ a.hipHalf*.75,a.hipY-H*.02,0],offset:[ H*.010,0,0],radius:H*.11,strength:.65}
  ];
}
