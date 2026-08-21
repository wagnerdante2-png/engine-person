import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

function download(data, filename, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sanitizeForExport(root) {
  const clone = root.clone(true);
  clone.traverse(obj => {
    if (obj.name === 'RigHelper' || obj.type === 'SkeletonHelper') obj.visible = false;
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => { if ('wireframe' in m) m.wireframe = false; });
    }
  });
  clone.userData = {
    enginePerson: true,
    schema: 1,
    sourceProfile: root.userData?.profile ?? null,
    rig: root.userData?.rig ?? null,
    stats: root.userData?.stats ?? null
  };
  return clone;
}

export async function exportGLTF(root, options={}) {
  if (!root) throw new Error('Nenhum objeto disponível para exportação.');
  const binary = options.binary ?? true;
  const exporter = new GLTFExporter();
  const scene = sanitizeForExport(root);
  const result = await exporter.parseAsync(scene, {
    binary,
    trs: true,
    onlyVisible: true,
    truncateDrawRange: true,
    maxTextureSize: options.maxTextureSize ?? 2048,
    animations: options.animations ?? []
  });
  return result;
}

export async function downloadGLTF(root, options={}) {
  const binary = options.binary ?? true;
  const result = await exportGLTF(root, options);
  const base = options.filename ?? `engine-person-${Date.now()}`;
  if (binary) {
    download(result, `${base}.glb`, 'model/gltf-binary');
  } else {
    download(JSON.stringify(result, null, 2), `${base}.gltf`, 'model/gltf+json');
  }
  return { binary, filename: `${base}.${binary ? 'glb' : 'gltf'}` };
}

export function exportManifest(root) {
  let meshes=0, skinnedMeshes=0, vertices=0, triangles=0, materials=0;
  const materialSet = new Set();
  root?.traverse(obj => {
    if (!obj.isMesh) return;
    meshes++;
    if (obj.isSkinnedMesh) skinnedMeshes++;
    const g=obj.geometry;
    vertices += g?.attributes?.position?.count ?? 0;
    triangles += g?.index ? Math.floor(g.index.count/3) : Math.floor((g?.attributes?.position?.count ?? 0)/3);
    const mats=Array.isArray(obj.material)?obj.material:[obj.material];
    mats.filter(Boolean).forEach(m=>materialSet.add(m.uuid));
  });
  materials=materialSet.size;
  return { format:'engine-person-export-manifest-v1', meshes, skinnedMeshes, vertices, triangles, materials, rig:root?.userData?.rig ?? null, profile:root?.userData?.profile ?? null };
}
