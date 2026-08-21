function issue(level, code, message, object='') { return { level, code, message, object }; }

export function inspectObject(root) {
  const issues=[];
  const stats={objects:0,meshes:0,skinnedMeshes:0,bones:0,vertices:0,triangles:0,materials:0,drawCallsEstimate:0};
  const mats=new Set();
  if (!root) return { ok:false, stats, issues:[issue('error','NO_ROOT','Nenhum objeto carregado.')] };
  root.traverse(obj=>{
    stats.objects++;
    if(obj.isBone) stats.bones++;
    if(!obj.isMesh)return;
    stats.meshes++; stats.drawCallsEstimate++;
    if(obj.isSkinnedMesh) stats.skinnedMeshes++;
    const g=obj.geometry;
    if(!g?.attributes?.position) issues.push(issue('error','NO_POSITION','Malha sem atributo position.',obj.name));
    const count=g?.attributes?.position?.count??0;
    stats.vertices+=count;
    stats.triangles+=g?.index?Math.floor(g.index.count/3):Math.floor(count/3);
    if(g?.attributes?.normal && g.attributes.normal.count!==count) issues.push(issue('error','NORMAL_COUNT','Contagem de normals incompatível.',obj.name));
    if(obj.isSkinnedMesh){
      const si=g?.attributes?.skinIndex, sw=g?.attributes?.skinWeight;
      if(!si||!sw) issues.push(issue('error','SKIN_ATTR','SkinnedMesh sem skinIndex/skinWeight.',obj.name));
      if(!obj.skeleton?.bones?.length) issues.push(issue('error','NO_SKELETON','SkinnedMesh sem skeleton válido.',obj.name));
      if(sw){
        for(let i=0;i<Math.min(sw.count,2000);i++){
          let sum=0; for(let k=0;k<sw.itemSize;k++)sum+=sw.getComponent(i,k);
          if(Math.abs(sum-1)>.025){issues.push(issue('warning','WEIGHT_SUM',`Peso do vértice ${i} soma ${sum.toFixed(3)}.`,obj.name));break;}
        }
      }
    }
    const list=Array.isArray(obj.material)?obj.material:[obj.material];
    list.filter(Boolean).forEach(m=>mats.add(m.uuid));
  });
  stats.materials=mats.size;
  if(stats.vertices>500000) issues.push(issue('warning','HIGH_VERTICES',`${stats.vertices.toLocaleString()} vértices podem exigir LOD.`));
  if(stats.drawCallsEstimate>180) issues.push(issue('warning','HIGH_DRAWCALLS',`${stats.drawCallsEstimate} draw calls estimadas.`));
  if(stats.meshes && !stats.skinnedMeshes && stats.bones) issues.push(issue('warning','RIG_NOT_BOUND','Rig encontrado, mas nenhuma malha está ligada por skinning.'));
  return {ok:!issues.some(x=>x.level==='error'),stats,issues};
}

export function formatDiagnostics(report) {
  const s=report.stats;
  const header=`${report.ok?'OK':'FALHA'} · ${s.meshes} meshes · ${s.skinnedMeshes} skinned · ${s.bones} bones · ${s.vertices.toLocaleString()} vértices · ${s.triangles.toLocaleString()} tris`;
  if(!report.issues.length)return header+' · sem alertas';
  return `${header}\n${report.issues.map(x=>`[${x.level.toUpperCase()}] ${x.code}: ${x.message}${x.object?` (${x.object})`:''}`).join('\n')}`;
}
