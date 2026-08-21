import { deformGeometryByLandmarks, laplacianRelax } from './rbf-deformer.js';
import { faceLandmarks, bodyLandmarks } from '../generators/anthropometry.js';

export function refineHeadSurface(mesh,anthro,h){
  if(!mesh?.geometry)return mesh;
  deformGeometryByLandmarks(mesh.geometry,faceLandmarks(anthro,h),{kernel:'gaussian',iterations:2});
  laplacianRelax(mesh.geometry,{iterations:2,strength:.08,preserveBoundary:false});
  mesh.geometry.computeVertexNormals();
  mesh.userData.refinement={method:'anthropometric-rbf',landmarks:faceLandmarks(anthro,h).length,pass:2};
  return mesh;
}

export function refineBodySurface(meshes,anthro,h){
  const landmarks=bodyLandmarks(anthro,h);
  for(const mesh of meshes){
    if(!mesh?.geometry)continue;
    deformGeometryByLandmarks(mesh.geometry,landmarks,{kernel:'compact',iterations:1});
    laplacianRelax(mesh.geometry,{iterations:1,strength:.045,preserveBoundary:true});
    mesh.geometry.computeVertexNormals();
    mesh.userData.refinement={method:'anthropometric-rbf',landmarks:landmarks.length,pass:1};
  }
  return meshes;
}
