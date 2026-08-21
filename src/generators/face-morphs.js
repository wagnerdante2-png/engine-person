import * as THREE from 'three';

const clamp01=v=>THREE.MathUtils.clamp(v,0,1);
const smooth=(x,a,b)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};

function buildTarget(geometry, fn){
  const base=geometry.attributes.position;
  const out=new Float32Array(base.array.length);
  const p=new THREE.Vector3(), d=new THREE.Vector3();
  for(let i=0;i<base.count;i++){
    p.fromBufferAttribute(base,i); d.copy(p); fn(p,d);
    out[i*3]=d.x; out[i*3+1]=d.y; out[i*3+2]=d.z;
  }
  return new THREE.Float32BufferAttribute(out,3);
}

export function prepareFaceMorphs(mesh, profile){
  if(!mesh?.geometry?.attributes?.position)return null;
  const g=mesh.geometry;
  if(g.userData.faceMorphsPrepared)return g.userData.faceMorphs;
  const {headY,headR}=profile;
  const morphs=[], names=[];
  const add=(name,fn)=>{names.push(name);morphs.push(buildTarget(g,fn));};

  add('smileCheeks',(p,d)=>{
    const lower=smooth(headY+headR*.12,p.y,headY-headR*.48);
    const side=smooth(Math.abs(p.x),headR*.08,headR*.72);
    const front=smooth(p.z,0,headR*.75);
    const w=lower*side*front;
    d.y+=headR*.050*w; d.x+=Math.sign(p.x||1)*headR*.018*w;
  });
  add('jawOpen',(p,d)=>{
    const w=smooth(headY-headR*.12,p.y,headY-headR*.88)*smooth(p.z,-headR*.10,headR*.62);
    d.y-=headR*.090*w; d.z+=headR*.025*w;
  });
  add('browRaise',(p,d)=>{
    const vertical=smooth(p.y,headY+headR*.05,headY+headR*.58);
    const front=smooth(p.z,0,headR*.60);
    d.y+=headR*.045*vertical*front;
  });
  add('squint',(p,d)=>{
    const eyeBand=1-Math.min(1,Math.abs(p.y-(headY+headR*.10))/(headR*.20));
    const front=smooth(p.z,headR*.15,headR*.72);
    d.y-=Math.sign(p.y-(headY+headR*.10))*headR*.020*Math.max(0,eyeBand)*front;
  });
  add('frown',(p,d)=>{
    const lower=smooth(headY-headR*.05,p.y,headY-headR*.55);
    const front=smooth(p.z,0,headR*.68);
    d.y-=headR*.025*lower*front;
    d.x-=Math.sign(p.x||1)*headR*.010*lower*front;
  });

  g.morphAttributes.position=morphs;
  mesh.updateMorphTargets?.();
  const map=Object.fromEntries(names.map((n,i)=>[n,i]));
  g.userData.faceMorphsPrepared=true;
  g.userData.faceMorphs=map;
  mesh.userData.faceMorphs=map;
  return map;
}

function preset(name){
  switch(name){
    case 'smile': return {smile:.82,jaw:.06,brow:.08,squint:.10,frown:0};
    case 'serious': return {smile:0,jaw:0,brow:-.04,squint:.18,frown:.22};
    case 'surprised': return {smile:0,jaw:.70,brow:.72,squint:0,frown:0};
    case 'angry': return {smile:0,jaw:.08,brow:-.25,squint:.28,frown:.62};
    default: return {smile:0,jaw:0,brow:0,squint:0,frown:0};
  }
}

export function createFaceMorphController(mesh, profile, h={}){
  const map=prepareFaceMorphs(mesh,profile);
  if(!map||!mesh.morphTargetInfluences)return()=>{};
  const p=preset(h.expression??'neutral');
  const set=(name,v)=>{const i=map[name];if(i!=null)mesh.morphTargetInfluences[i]=THREE.MathUtils.clamp(v,0,1);};
  return()=>{
    set('smileCheeks',Math.max(h.smile??0,p.smile));
    set('jawOpen',Math.max(h.jawOpen??0,p.jaw));
    set('browRaise',Math.max(0,(h.browRaise??0)+p.brow));
    set('squint',Math.max(h.squint??0,p.squint));
    set('frown',p.frown);
  };
}
