import * as THREE from 'three';
import { FLAME_OPEN } from '../assets/flame-open-lod.js';

function transformedPoint(x,y,z,h,a){
  const s=h.headScale??1;
  const top=FLAME_OPEN.bounds.max[1];
  const sx=s*(h.faceWidth??1), sy=s, sz=s*(h.headDepth??1);
  return new THREE.Vector3(x*sx, a.H-(top-y)*sy, -z*sz);
}

export function createFlameOpenHead(h,a,material){
  const data=FLAME_OPEN.decode();
  const positions=new Float32Array(data.positions.length);
  for(let i=0;i<data.positions.length;i+=3){
    const p=transformedPoint(data.positions[i],data.positions[i+1],data.positions[i+2],h,a);
    positions[i]=p.x;positions[i+1]=p.y;positions[i+2]=p.z;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(positions,3));
  g.setIndex(new THREE.BufferAttribute(data.indices,1));
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
  const m=new THREE.Mesh(g,material.clone());
  m.material.flatShading=false;m.material.needsUpdate=true;
  m.castShadow=true;m.receiveShadow=true;m.name='FLAME2023OpenHead';
  m.userData.flame={source:'FLAME2023_Open',license:'CC BY 4.0',vertexCount:FLAME_OPEN.vertexCount,faceCount:FLAME_OPEN.faceCount,lod:'preview'};
  return m;
}

function sphere(radius,material,segments=32){const g=new THREE.SphereGeometry(radius,segments,Math.max(18,segments>>1));const m=new THREE.Mesh(g,material);m.castShadow=true;return m;}

export function createFlameEyeAssembly(h,a,M){
  const data=FLAME_OPEN.decode(),g=new THREE.Group();g.name='FLAMEEyeAssembly';
  const s=h.headScale??1;
  for(const [jointIndex,side] of [[3,'L'],[4,'R']]){
    const o=jointIndex*3;
    const p=transformedPoint(data.joints[o],data.joints[o+1],data.joints[o+2],h,a);
    const eye=sphere(.0122*s*(h.eyeScale??1),M.eyeWhite,36);eye.position.copy(p);eye.name=`EyeBall_${side}`;g.add(eye);
    const iris=sphere(.0055*s*(h.eyeScale??1),M.iris,30);iris.scale.z=.20;iris.position.set(p.x,p.y,p.z+.0115*s);iris.name=`Iris_${side}`;g.add(iris);
    const pupil=sphere(.0023*s,M.pupil,24);pupil.scale.z=.15;pupil.position.set(p.x,p.y,p.z+.0126*s);pupil.name=`Pupil_${side}`;g.add(pupil);
    const cornea=sphere(.01235*s*(h.eyeScale??1),M.cornea,36);cornea.scale.z=.18;cornea.position.set(p.x,p.y,p.z+.0108*s);cornea.name=`Cornea_${side}`;g.add(cornea);
  }
  g.userData.flameEyes={jointDriven:true,source:'FLAME2023_Open'};
  return g;
}
