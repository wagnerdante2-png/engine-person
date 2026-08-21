import * as THREE from 'three';

function makeHairMaterial(color, roughness=.42){
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness:0,
    transparent:true,
    opacity:.98,
    side:THREE.DoubleSide,
    sheen:.45,
    sheenRoughness:.38,
    clearcoat:.04,
    clearcoatRoughness:.55,
    depthWrite:true
  });
}

function scalpSurface(headR, headY, color){
  const g=new THREE.SphereGeometry(1,56,32,0,Math.PI*2,0,Math.PI*.72);
  g.scale(headR*1.035,headR*.88,headR*1.03);
  const m=new THREE.MeshPhysicalMaterial({color,roughness:.48,sheen:.30,sheenRoughness:.45});
  const mesh=new THREE.Mesh(g,m);
  mesh.position.set(0,headY+headR*.15,-headR*.03);
  mesh.name='HairScalp';
  mesh.castShadow=true;
  return mesh;
}

function guideCurve(root, tip, bend, wave=0){
  const mid=root.clone().lerp(tip,.46);
  mid.x+=bend.x; mid.z+=bend.z;
  if(wave) mid.x+=Math.sin((root.x+root.y)*43)*wave;
  return new THREE.CatmullRomCurve3([root,mid,tip]);
}

function ribbonFromCurve(curve,width,segments,material,name){
  const positions=[],uvs=[],indices=[];
  const up=new THREE.Vector3(0,0,1), tangent=new THREE.Vector3(),side=new THREE.Vector3();
  for(let i=0;i<=segments;i++){
    const t=i/segments, p=curve.getPoint(t);
    curve.getTangent(t,tangent).normalize();
    side.crossVectors(tangent,up);
    if(side.lengthSq()<1e-6) side.set(1,0,0); else side.normalize();
    const taper=1-Math.pow(t,.75)*.82;
    const w=width*taper;
    for(const s of [-1,1]){
      const q=p.clone().addScaledVector(side,w*s);
      positions.push(q.x,q.y,q.z); uvs.push(s<0?0:1,t);
    }
  }
  for(let i=0;i<segments;i++){
    const a=i*2,b=a+1,c=a+2,d=a+3;
    indices.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,material);mesh.name=name;mesh.castShadow=true;
  return mesh;
}

export function createProceduralHair(h,p){
  const group=new THREE.Group();group.name='HairSystemV2';
  const {headR,headY}=p;
  group.add(scalpSurface(headR,headY,h.hair));
  if(h.hairStyle==='short'){
    group.userData.hair={system:'guide-card-v1',guides:0,cards:0,style:'short'};
    return group;
  }
  const density=THREE.MathUtils.clamp(h.hairDensity??1,.4,1.8);
  const quality=h.hairQuality??.75;
  const rings=Math.max(4,Math.round(5+quality*5));
  const perRing=Math.max(10,Math.round((12+quality*22)*density));
  const material=makeHairMaterial(h.hair,h.hairRoughness??.42);
  let count=0;
  const styleLength=h.hairStyle==='bob'?1.08:2.1;
  const length=headR*styleLength*(h.hairLength??1);
  for(let r=0;r<rings;r++){
    const v=(r+.5)/rings;
    const phi=.18+v*1.18;
    const radiusX=headR*.98*Math.sin(phi);
    const radiusZ=headR*.93*Math.sin(phi);
    const y=headY+headR*.92*Math.cos(phi)+headR*.12;
    for(let i=0;i<perRing;i++){
      const u=i/perRing, a=u*Math.PI*2;
      if(Math.sin(a)>.92 && v>.72) continue;
      const root=new THREE.Vector3(Math.cos(a)*radiusX,y,Math.sin(a)*radiusZ-headR*.02);
      const side=Math.sign(root.x||1);
      const back=THREE.MathUtils.clamp((-Math.sin(a)+1)/2,0,1);
      const drop=length*(.55+.35*v+.12*back);
      const tip=new THREE.Vector3(root.x*(1.06+.16*v),root.y-drop,root.z-headR*(.12+.20*back));
      if(h.hairStyle==='bob') tip.y=Math.max(tip.y,headY-headR*.98);
      const bend=new THREE.Vector3(side*headR*.07*(.3+v),0,-headR*.05*back);
      const curve=guideCurve(root,tip,bend,headR*.025*(h.hairWave??.25));
      const width=headR*(.020+(1-quality)*.008);
      group.add(ribbonFromCurve(curve,width,8+Math.round(quality*8),material,`HairCard_${count++}`));
    }
  }
  group.userData.hair={system:'guide-card-v1',guides:count,cards:count,style:h.hairStyle,quality};
  return group;
}

export function updateHairSecondaryMotion(hair,time,h={}){
  if(!hair) return;
  const motion=(h.hairMotion??.35)*.018;
  hair.rotation.z=Math.sin(time*.72)*motion;
  hair.rotation.x=Math.sin(time*.53+1.2)*motion*.35;
}
