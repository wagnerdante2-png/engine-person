import * as THREE from 'three';

function hash(x,y,z,seed=0){
  const s=Math.sin(x*127.1+y*311.7+z*74.7+seed*0.013)*43758.5453123;
  return s-Math.floor(s);
}

export function applyProceduralSkinColors(mesh,h,seed=1){
  if(!mesh?.geometry?.attributes?.position)return mesh;
  const pos=mesh.geometry.attributes.position;
  const colors=new Float32Array(pos.count*3);
  const base=new THREE.Color(h.skin??'#d49a7d');
  const c=new THREE.Color();
  const detail=h.skinDetail??.72;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const n1=hash(x*31,y*31,z*31,seed)-.5;
    const n2=hash(x*79,y*79,z*79,seed+17)-.5;
    const vascular=Math.max(0,Math.sin(y*18+z*11)*.5+.5)*.018*detail;
    const warm=(n1*.022+n2*.010)*detail;
    c.copy(base);
    c.r=THREE.MathUtils.clamp(c.r+warm+vascular,0,1);
    c.g=THREE.MathUtils.clamp(c.g+warm*.35-vascular*.18,0,1);
    c.b=THREE.MathUtils.clamp(c.b-warm*.12-vascular*.08,0,1);
    colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
  }
  mesh.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  if(mesh.material){
    mesh.material=mesh.material.clone();
    mesh.material.vertexColors=true;
    mesh.material.needsUpdate=true;
  }
  mesh.userData.skinSurface={type:'procedural-vertex-microvariation-v1',detail};
  return mesh;
}

export function enhanceSkinMaterial(material,h){
  if(!material)return material;
  material.roughness=h.skinRoughness??.43;
  if('sheen' in material)material.sheen=.10;
  if('sheenRoughness' in material)material.sheenRoughness=.86;
  if('clearcoat' in material)material.clearcoat=.025;
  if('clearcoatRoughness' in material)material.clearcoatRoughness=.78;
  material.userData.skinModel={version:'1.0',subsurfaceApprox:h.subsurface??.48,microdetail:h.skinDetail??.72};
  return material;
}
