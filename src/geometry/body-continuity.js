import * as THREE from 'three';

function metaballBridge(a,b,ra,rb,material,segments=20,radial=28){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),axis=B.clone().sub(A),len=axis.length();
  const dir=axis.clone().normalize();
  const ref=Math.abs(dir.y)>.92?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
  const tangent=new THREE.Vector3().crossVectors(dir,ref).normalize();
  const bitangent=new THREE.Vector3().crossVectors(dir,tangent).normalize();
  const positions=[],uvs=[],indices=[];
  for(let s=0;s<=segments;s++){
    const t=s/segments;
    const center=A.clone().addScaledVector(dir,len*t);
    const smooth=t*t*(3-2*t);
    const r=THREE.MathUtils.lerp(ra,rb,smooth)*(1+.08*Math.sin(Math.PI*t));
    for(let i=0;i<radial;i++){
      const ang=i/radial*Math.PI*2;
      const p=center.clone().addScaledVector(tangent,Math.cos(ang)*r).addScaledVector(bitangent,Math.sin(ang)*r*.92);
      positions.push(p.x,p.y,p.z);uvs.push(i/radial,t);
    }
  }
  for(let s=0;s<segments;s++)for(let i=0;i<radial;i++){
    const n=(i+1)%radial,a0=s*radial+i,b0=(s+1)*radial+i,c0=(s+1)*radial+n,d0=s*radial+n;
    indices.push(a0,b0,c0,a0,c0,d0);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}

export function createJointContinuityMeshes(p,materials){
  const group=new THREE.Group();group.name='BodyContinuity';
  const H=p.H, shoulderY=p.shoulderY-H*.018, hipY=p.hipY-H*.015;
  for(const sx of [-1,1]){
    const shoulder=[sx*p.shoulderHalf*.72,shoulderY,0], arm=[sx*p.shoulderHalf*.98,shoulderY-H*.012,0];
    const shoulderBridge=metaballBridge(shoulder,arm,H*.050*p.bodyMass,H*.031*p.bodyMass,materials.skin,12,30);
    shoulderBridge.name=`ShoulderBridge_${sx<0?'L':'R'}`;group.add(shoulderBridge);
    const hip=[sx*p.hipHalf*.42,hipY,0], thigh=[sx*p.hipHalf*.56,hipY-H*.040,0];
    const hipBridge=metaballBridge(hip,thigh,H*.055*p.bodyMass,H*.041*p.bodyMass,materials.skin,12,30);
    hipBridge.name=`HipBridge_${sx<0?'L':'R'}`;group.add(hipBridge);
  }
  const chestA=[0,p.shoulderY-H*.17,0],neck=[0,p.shoulderY+H*.035,0];
  const neckBridge=metaballBridge(chestA,neck,H*.055*p.bodyMass,H*.030*p.bodyMass,materials.skin,16,32);
  neckBridge.name='NeckChestBridge';group.add(neckBridge);
  group.userData.continuity={system:'joint-bridge-v1',regions:['shoulders','hips','neck']};
  return group;
}

export function createJointVolumeController(group,rig,strength=.55){
  const b=rig?.userData?.bones;
  if(!group||!b)return ()=>{};
  return ()=>{
    const shoulder=Math.max(Math.abs(b.upperArm_L.rotation.z),Math.abs(b.upperArm_R.rotation.z));
    const hip=Math.max(Math.abs(b.upperLeg_L.rotation.x),Math.abs(b.upperLeg_R.rotation.x));
    const shoulderScale=1+Math.min(.10,shoulder*.055*strength);
    const hipScale=1+Math.min(.08,hip*.045*strength);
    group.children.forEach(obj=>{
      if(obj.name.startsWith('ShoulderBridge'))obj.scale.set(shoulderScale,1,shoulderScale);
      if(obj.name.startsWith('HipBridge'))obj.scale.set(hipScale,1,hipScale);
    });
  };
}
