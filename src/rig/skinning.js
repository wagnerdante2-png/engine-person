import * as THREE from 'three';

const DEFAULT_BONES = [
  'hips','spine','chest','upperChest','neck','head',
  'clavicle_L','upperArm_L','lowerArm_L','hand_L',
  'clavicle_R','upperArm_R','lowerArm_R','hand_R',
  'upperLeg_L','lowerLeg_L','foot_L','toe_L',
  'upperLeg_R','lowerLeg_R','foot_R','toe_R'
];

function localBonePositions(mesh, rig, names) {
  rig.updateMatrixWorld(true);
  mesh.updateMatrixWorld(true);
  const inv = mesh.matrixWorld.clone().invert();
  return names.map(name => {
    const bone = rig.userData.bones?.[name];
    if (!bone) return null;
    const p = new THREE.Vector3();
    bone.getWorldPosition(p).applyMatrix4(inv);
    return { name, bone, p };
  }).filter(Boolean);
}

function semanticPenalty(name, vertex, profile) {
  const H = profile.H;
  const hipY = profile.hipY;
  const shoulderY = profile.shoulderY;
  let penalty = 0;
  const side = vertex.x < -H*.012 ? '_L' : vertex.x > H*.012 ? '_R' : '';
  if (side && name.endsWith(side === '_L' ? '_R' : '_L')) penalty += H*.65;
  if (vertex.y > shoulderY + H*.06 && !['neck','head','upperChest'].includes(name)) penalty += H*.55;
  if (vertex.y < hipY - H*.04 && !name.includes('Leg') && !name.includes('foot') && !name.includes('toe') && name !== 'hips') penalty += H*.55;
  if (Math.abs(vertex.x) > profile.shoulderHalf*.72 && vertex.y > hipY + H*.10 && !name.includes('Arm') && !name.includes('hand') && !name.includes('clavicle') && name !== 'upperChest') penalty += H*.42;
  return penalty;
}

export function autoSkinMesh(mesh, rig, profile, options={}) {
  if (!mesh?.geometry?.attributes?.position || !rig?.userData?.bones) return mesh;
  const names = (options.bones ?? DEFAULT_BONES).filter(name => rig.userData.bones[name]);
  const samples = localBonePositions(mesh, rig, names);
  if (!samples.length) return mesh;

  const position = mesh.geometry.attributes.position;
  const skinIndex = new Uint16Array(position.count * 4);
  const skinWeight = new Float32Array(position.count * 4);
  const v = new THREE.Vector3();
  const falloff = options.falloff ?? 2.2;

  for (let i=0;i<position.count;i++) {
    v.fromBufferAttribute(position,i);
    const ranked = samples.map((entry,index) => {
      const d = Math.max(.0001, v.distanceTo(entry.p) + semanticPenalty(entry.name,v,profile));
      return { index, score: 1 / Math.pow(d,falloff) };
    }).sort((a,b)=>b.score-a.score).slice(0,4);
    const total = ranked.reduce((sum,x)=>sum+x.score,0) || 1;
    for (let k=0;k<4;k++) {
      const hit = ranked[k] ?? ranked[0];
      skinIndex[i*4+k] = hit.index;
      skinWeight[i*4+k] = hit.score / total;
    }
  }

  mesh.geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex,4));
  mesh.geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight,4));
  const bones = samples.map(x=>x.bone);
  const skeleton = new THREE.Skeleton(bones);
  skeleton.calculateInverses();
  const skinned = new THREE.SkinnedMesh(mesh.geometry, mesh.material);
  skinned.name = mesh.name || 'AutoSkinnedMesh';
  skinned.position.copy(mesh.position); skinned.rotation.copy(mesh.rotation); skinned.scale.copy(mesh.scale);
  skinned.castShadow = mesh.castShadow; skinned.receiveShadow = mesh.receiveShadow;
  skinned.bind(skeleton, mesh.matrixWorld.clone());
  skinned.userData.skinning = { method:'nearest-bone-semantic-v1', influences:4, bones:names };
  return skinned;
}

export function autoSkinCollection(meshes, rig, profile, options={}) {
  return meshes.map(mesh => autoSkinMesh(mesh,rig,profile,options));
}
