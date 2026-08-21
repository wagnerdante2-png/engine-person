import * as THREE from 'three';

const EPS=1e-6;
export const gaussianRBF=(distance,radius)=>Math.exp(-Math.pow(distance/Math.max(radius,EPS),2));
export const compactRBF=(distance,radius)=>{const q=THREE.MathUtils.clamp(1-distance/Math.max(radius,EPS),0,1);return q*q*(3-2*q);};

export function deformGeometryByLandmarks(geometry,landmarks,{kernel='compact',iterations=1,recomputeNormals=true}={}){
  if(!geometry?.attributes?.position||!landmarks?.length)return geometry;
  const pos=geometry.attributes.position;
  const p=new THREE.Vector3();
  const delta=new THREE.Vector3();
  const kernelFn=kernel==='gaussian'?gaussianRBF:compactRBF;
  for(let pass=0;pass<iterations;pass++){
    for(let i=0;i<pos.count;i++){
      p.fromBufferAttribute(pos,i);delta.set(0,0,0);let total=0;
      for(const lm of landmarks){
        const center=lm.center instanceof THREE.Vector3?lm.center:new THREE.Vector3(...lm.center);
        const offset=lm.offset instanceof THREE.Vector3?lm.offset:new THREE.Vector3(...lm.offset);
        const radius=lm.radius??1;
        let w=kernelFn(p.distanceTo(center),radius)*(lm.strength??1);
        if(lm.mask)w*=THREE.MathUtils.clamp(lm.mask(p),0,1);
        if(w<=0)continue;
        delta.addScaledVector(offset,w);total+=w;
      }
      if(total>1)delta.multiplyScalar(1/total);
      pos.setXYZ(i,p.x+delta.x,p.y+delta.y,p.z+delta.z);
    }
  }
  pos.needsUpdate=true;
  if(recomputeNormals)geometry.computeVertexNormals();
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return geometry;
}

export function laplacianRelax(geometry,{iterations=1,strength=.18,preserveBoundary=true}={}){
  const pos=geometry?.attributes?.position,index=geometry?.index;
  if(!pos||!index)return geometry;
  const count=pos.count,neighbors=Array.from({length:count},()=>new Set());
  const arr=index.array;
  for(let i=0;i<arr.length;i+=3){const a=arr[i],b=arr[i+1],c=arr[i+2];neighbors[a].add(b).add(c);neighbors[b].add(a).add(c);neighbors[c].add(a).add(b);}
  const base=new Float32Array(pos.array.length),next=new Float32Array(pos.array.length);base.set(pos.array);
  for(let iter=0;iter<iterations;iter++){
    for(let i=0;i<count;i++){
      const ns=[...neighbors[i]];const o=i*3;
      if(!ns.length||(preserveBoundary&&ns.length<4)){next[o]=base[o];next[o+1]=base[o+1];next[o+2]=base[o+2];continue;}
      let x=0,y=0,z=0;for(const n of ns){x+=base[n*3];y+=base[n*3+1];z+=base[n*3+2];}const inv=1/ns.length;
      next[o]=THREE.MathUtils.lerp(base[o],x*inv,strength);next[o+1]=THREE.MathUtils.lerp(base[o+1],y*inv,strength);next[o+2]=THREE.MathUtils.lerp(base[o+2],z*inv,strength);
    }
    base.set(next);
  }
  pos.array.set(base);pos.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
