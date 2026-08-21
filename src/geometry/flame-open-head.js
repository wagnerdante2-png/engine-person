import * as THREE from 'three';
import { FLAME_OPEN as FLAME_PREVIEW } from '../assets/flame-open-lod.js';
import { getFlame2023OpenCore } from '../assets/flame2023-open/runtime.js';

function resolveFlameData(){
  try {
    const core=getFlame2023OpenCore();
    return {
      positions:core.positions,
      indices:core.indices,
      joints:core.joints,
      bounds:core.metadata.bounds,
      vertexCount:core.metadata.vertexCount,
      faceCount:core.metadata.faceCount,
      exact:true,
    };
  } catch (_) {
    const preview=FLAME_PREVIEW.decode();
    return {
      positions:preview.positions,
      indices:preview.indices,
      joints:preview.joints,
      bounds:FLAME_PREVIEW.bounds,
      vertexCount:FLAME_PREVIEW.vertexCount,
      faceCount:FLAME_PREVIEW.faceCount,
      exact:false,
    };
  }
}

function flameScale(h,a){
  // FLAME's Y extent contains lower-neck geometry, while Engine Person headLength is
  // crown-to-chin. 0.245 m is the canonical FLAME crown/chin span used only for scale;
  // every vertex still comes from the official template.
  return (a.headLength/0.245) * (h.flameScale??1);
}

function transformedPoint(x,y,z,h,a,data){
  const s=flameScale(h,a);
  const top=data.bounds.max[1];
  const sx=s*(h.faceWidth??1), sy=s, sz=s*(h.headDepth??1);
  // FLAME uses +Z as the facial/front direction. The Engine Person camera is also on
  // +Z, so do NOT mirror Z. The previous preview integration did, which exposed the
  // wrong side of the template and contributed to the mannequin-like result.
  return new THREE.Vector3(x*sx, a.H-(top-y)*sy, z*sz);
}

export function createFlameOpenHead(h,a,material){
  const data=resolveFlameData();
  const positions=new Float32Array(data.positions.length);
  for(let i=0;i<data.positions.length;i+=3){
    const p=transformedPoint(data.positions[i],data.positions[i+1],data.positions[i+2],h,a,data);
    positions[i]=p.x;positions[i+1]=p.y;positions[i+2]=p.z;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(positions,3));
  g.setIndex(new THREE.BufferAttribute(data.indices,1));
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
  const m=new THREE.Mesh(g,material.clone());
  m.material.flatShading=false;m.material.needsUpdate=true;
  m.castShadow=true;m.receiveShadow=true;m.name='FLAME2023OpenHead';
  m.userData.flame={
    source:'FLAME2023_Open',license:'CC BY 4.0',
    vertexCount:data.vertexCount,faceCount:data.faceCount,
    exact:data.exact,lod:data.exact?'full-template':'preview-fallback',
    topology:data.exact?'5023v-9976f':'351v-700f'
  };
  return m;
}

function sphere(radius,material,segments=32){const g=new THREE.SphereGeometry(radius,segments,Math.max(18,segments>>1));const m=new THREE.Mesh(g,material);m.castShadow=true;return m;}

export function createFlameEyeAssembly(h,a,M){
  const data=resolveFlameData(),g=new THREE.Group();g.name='FLAMEEyeAssembly';
  const s=flameScale(h,a);
  for(const [jointIndex,side] of [[3,'L'],[4,'R']]){
    const o=jointIndex*3;
    const p=transformedPoint(data.joints[o],data.joints[o+1],data.joints[o+2],h,a,data);
    const eye=sphere(.0122*s*(h.eyeScale??1),M.eyeWhite,40);eye.position.copy(p);eye.name=`EyeBall_${side}`;g.add(eye);
    const iris=sphere(.0056*s*(h.eyeScale??1),M.iris,32);iris.scale.z=.16;iris.position.set(p.x,p.y,p.z+.0113*s);iris.name=`Iris_${side}`;g.add(iris);
    const pupil=sphere(.00235*s,M.pupil,28);pupil.scale.z=.12;pupil.position.set(p.x,p.y,p.z+.01225*s);pupil.name=`Pupil_${side}`;g.add(pupil);
    const cornea=sphere(.01235*s*(h.eyeScale??1),M.cornea,40);cornea.scale.z=.16;cornea.position.set(p.x,p.y,p.z+.0107*s);cornea.name=`Cornea_${side}`;g.add(cornea);
  }
  g.userData.flameEyes={jointDriven:true,source:'FLAME2023_Open',exact:data.exact};
  return g;
}
