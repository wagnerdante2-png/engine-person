import * as THREE from 'three';

const clamp=THREE.MathUtils.clamp;
const lerp=THREE.MathUtils.lerp;
const bell=(x,c,r)=>Math.exp(-Math.pow((x-c)/r,2));

export function meshFromRings(rings,radialSegments=48,material){
  const positions=[],uvs=[],indices=[];
  rings.forEach((ring,yi)=>{
    for(let i=0;i<radialSegments;i++){
      const a=i/radialSegments*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);
      const front=Math.max(0,sa),back=Math.max(0,-sa);
      const side=Math.abs(ca);
      const rx=ring.rx*(1+(ring.sideShape??0)*side*side);
      const x=ring.cx+ca*rx;
      const z=ring.cz+sa*ring.rz+front*(ring.front??0)-back*(ring.back??0);
      const y=ring.y+(ring.shoulderSlope??0)*side;
      positions.push(x,y,z);uvs.push(i/radialSegments,yi/Math.max(1,rings.length-1));
    }
  });
  for(let y=0;y<rings.length-1;y++){
    const row=y*radialSegments,next=(y+1)*radialSegments;
    for(let i=0;i<radialSegments;i++){
      const n=(i+1)%radialSegments;
      indices.push(row+i,next+i,next+n,row+i,next+n,row+n);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}

export function createTorsoMesh(profile,material,radialSegments=64){
  const {hipY,shoulderY,H}=profile;
  const rings=[],count=42;
  for(let i=0;i<=count;i++){
    const t=i/count;
    const y=lerp(hipY+H*.020,shoulderY+H*.018,t);
    const iliac=bell(t,.05,.15),waist=bell(t,.31,.18),abdomen=bell(t,.43,.22),rib=bell(t,.63,.24),chest=bell(t,.76,.19),shoulder=bell(t,.95,.11);
    let rx=H*(.063*profile.bodyMass+.022*profile.hipWidth*iliac+.010*abdomen+.024*profile.chestWidth*chest+.040*profile.shoulderWidth*shoulder);
    rx-=H*.011*(2-profile.waistWidth)*waist;
    const femaleBust=profile.female?bell(t,.73,.12):0;
    const rz=H*(.041*profile.bodyMass+.010*iliac+.012*abdomen+.016*profile.chestDepth*rib+.014*profile.muscle*chest);
    const front=H*(.0035*abdomen+.009*chest+femaleBust*.007);
    const back=H*(.006*iliac+.0045*rib+.003*shoulder);
    rings.push({
      y,rx:Math.max(H*.052,rx)*profile.sexWidth,rz:Math.max(H*.039,rz),cx:0,
      cz:H*(.0015*abdomen-.003*shoulder),front,back,
      shoulderSlope:-H*.010*shoulder,sideShape:.025*shoulder
    });
  }
  return meshFromRings(rings,radialSegments,material);
}

export function createPelvisMesh(profile,material,radialSegments=60){
  const H=profile.H,rings=[],bottom=profile.hipY-H*.070,top=profile.hipY+H*.095,count=24;
  for(let i=0;i<=count;i++){
    const t=i/count;
    const upper=bell(t,.72,.28),glute=bell(t,.38,.30),groin=bell(t,.08,.16);
    const rx=H*(.061*profile.bodyMass+.032*profile.hipWidth*(.45+.55*upper)+.010*glute)*profile.sexHip;
    const rz=H*(.042*profile.bodyMass+.019*profile.glute*glute+.009*upper);
    rings.push({
      y:lerp(bottom,top,t),rx,rz,cx:0,cz:-H*.002+H*.008*upper,
      front:H*(.003+groin*.003),back:H*(.008*profile.glute*glute),sideShape:.025*upper
    });
  }
  return meshFromRings(rings,radialSegments,material);
}

export function createHeadMesh(profile,material,radialSegments=88,verticalSegments=64){
  const {headR,headY,faceWidth,jawWidth,cheekbones,headDepth,chinSize}=profile;
  const positions=[],uvs=[],indices=[];
  for(let y=0;y<=verticalSegments;y++){
    const v=y/verticalSegments,phi=v*Math.PI,py=Math.cos(phi),eq=Math.sin(phi);
    const lower=clamp((v-.44)/.56,0,1);
    const temple=bell(v,.40,.17),cheek=bell(v,.56,.13),jaw=bell(v,.73,.14),chin=bell(v,.90,.08);
    const jawBlend=lerp(1,jawWidth,Math.pow(lower,1.55));
    for(let x=0;x<radialSegments;x++){
      const u=x/radialSegments,theta=u*Math.PI*2,cx=Math.cos(theta),sz=Math.sin(theta),front=Math.max(0,sz),back=Math.max(0,-sz);
      let width=headR*faceWidth*eq*jawBlend;
      width*=1+(cheekbones-1)*cheek*.40;
      width*=1-temple*.035;
      width*=1-chin*.25;
      let depth=headR*.91*headDepth*eq;
      let px=cx*width;
      let yy=headY+py*headR*1.15;
      let pz=sz*depth;

      pz+=front*headR*(.028+.035*cheek+.018*(1-lower));
      pz-=back*headR*(.018+.012*temple);
      yy-=chin*headR*.075*chinSize;
      pz+=front*chin*headR*.045*chinSize;
      if(lower>.55) pz-=back*headR*.018*(lower-.55)/.45;

      positions.push(px,yy,pz);uvs.push(u,1-v);
    }
  }
  for(let y=0;y<verticalSegments;y++){
    const row=y*radialSegments,next=(y+1)*radialSegments;
    for(let i=0;i<radialSegments;i++){
      const n=(i+1)%radialSegments;indices.push(row+i,next+i,next+n,row+i,next+n,row+n);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}

export function createTaperedLimb({start,end,radii,material,radialSegments=32,segments=18,ellipticity=.94}){
  const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),axis=new THREE.Vector3().subVectors(b,a),length=axis.length(),dir=axis.clone().normalize();
  const up=Math.abs(dir.y)>.92?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
  const tangent=new THREE.Vector3().crossVectors(dir,up).normalize(),bitangent=new THREE.Vector3().crossVectors(dir,tangent).normalize();
  const rings=[];
  for(let i=0;i<=segments;i++){
    const t=i/segments;
    let r=t<.5?lerp(radii[0],radii[1],t*2):lerp(radii[1],radii[2],(t-.5)*2);
    r*=1+.055*bell(t,.30,.18)-.025*bell(t,.52,.12)+.040*bell(t,.70,.17);
    const center=a.clone().addScaledVector(dir,length*t);
    rings.push({center,r});
  }
  const positions=[],uvs=[],indices=[];
  rings.forEach((ring,ri)=>{
    for(let j=0;j<radialSegments;j++){
      const theta=j/radialSegments*Math.PI*2;
      const p=ring.center.clone().addScaledVector(tangent,Math.cos(theta)*ring.r).addScaledVector(bitangent,Math.sin(theta)*ring.r*ellipticity);
      positions.push(p.x,p.y,p.z);uvs.push(j/radialSegments,ri/segments);
    }
  });
  for(let r=0;r<rings.length-1;r++){
    const row=r*radialSegments,next=(r+1)*radialSegments;
    for(let j=0;j<radialSegments;j++){
      const n=(j+1)%radialSegments;indices.push(row+j,next+j,next+n,row+j,next+n,row+n);
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}

export function createFoot(H,width,length,material){
  const group=new THREE.Group();group.name='FootGeometry';
  const heelG=new THREE.SphereGeometry(1,32,20);heelG.scale(width*.86,H*.026,length*.42);heelG.translate(0,H*.028,-length*.10);
  const heel=new THREE.Mesh(heelG,material);heel.castShadow=true;heel.receiveShadow=true;group.add(heel);
  const foreG=new THREE.SphereGeometry(1,36,20);foreG.scale(width,H*.024,length*.62);foreG.translate(0,H*.026,length*.38);
  const fore=new THREE.Mesh(foreG,material);fore.castShadow=true;fore.receiveShadow=true;group.add(fore);
  const toeG=new THREE.SphereGeometry(1,30,18);toeG.scale(width*.94,H*.020,length*.30);toeG.translate(0,H*.024,length*.86);
  const toe=new THREE.Mesh(toeG,material);toe.castShadow=true;toe.receiveShadow=true;group.add(toe);
  return group;
}

export function createHand(H,width,material){
  const g=new THREE.SphereGeometry(1,32,20);g.scale(width,H*.043,H*.019);
  const mesh=new THREE.Mesh(g,material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
