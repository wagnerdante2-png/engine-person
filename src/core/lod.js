import * as THREE from 'three';

export const QUALITY_PROFILES={
  cinematic:{pixelRatio:2,shadowMap:2048,detail:1,distanceScale:1.0},
  high:{pixelRatio:1.6,shadowMap:1536,detail:.82,distanceScale:.90},
  balanced:{pixelRatio:1.25,shadowMap:1024,detail:.62,distanceScale:.78},
  performance:{pixelRatio:1,shadowMap:512,detail:.42,distanceScale:.62}
};

export class PerformanceGovernor {
  constructor({renderer,camera,onQualityChange,initial='high'}={}){
    this.renderer=renderer;this.camera=camera;this.onQualityChange=onQualityChange;this.quality=initial;
    this.samples=[];this.last=performance.now();this.cooldown=0;this.enabled=true;
  }
  setQuality(name){
    if(!QUALITY_PROFILES[name])return;
    this.quality=name; const q=QUALITY_PROFILES[name];
    this.renderer?.setPixelRatio(Math.min(devicePixelRatio||1,q.pixelRatio));
    this.onQualityChange?.(name,q);
  }
  sample(now=performance.now()){
    if(!this.enabled)return this.quality;
    const dt=now-this.last;this.last=now;if(dt<=0||dt>500)return this.quality;
    const fps=1000/dt;this.samples.push(fps);if(this.samples.length>90)this.samples.shift();
    if(this.samples.length<45)return this.quality;
    if(this.cooldown>0){this.cooldown--;return this.quality;}
    const avg=this.samples.reduce((a,b)=>a+b,0)/this.samples.length;
    const order=['performance','balanced','high','cinematic']; let i=order.indexOf(this.quality);
    if(avg<42&&i>0){this.setQuality(order[i-1]);this.cooldown=180;this.samples.length=0;}
    else if(avg>57&&i<order.length-1){this.setQuality(order[i+1]);this.cooldown=300;this.samples.length=0;}
    return this.quality;
  }
}

export function createDistanceLOD(levels=[]){
  const lod=new THREE.LOD();
  levels.forEach(({object,distance=0,hysteresis=.08})=>lod.addLevel(object,distance,hysteresis));
  return lod;
}

export function estimateComplexity(root){
  let vertices=0,triangles=0,meshes=0;
  root?.traverse(o=>{if(!o.isMesh)return;meshes++;const g=o.geometry;const v=g?.attributes?.position?.count??0;vertices+=v;triangles+=g?.index?g.index.count/3:v/3;});
  const score=vertices/100000+triangles/150000+meshes/40;
  return {vertices,triangles:Math.round(triangles),meshes,score:Number(score.toFixed(2)),recommended:score>8?'performance':score>4?'balanced':score>2?'high':'cinematic'};
}
