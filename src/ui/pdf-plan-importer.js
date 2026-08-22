const PDFJS_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs';
const PDFJS_WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

function waitEngine(){return new Promise(resolve=>{const tick=()=>window.enginePerson?.store?resolve(window.enginePerson):setTimeout(tick,60);tick();});}

function makeButton(){
  if(document.querySelector('#pdfPlanImportBtn'))return;
  const panel=document.querySelector('#panelContent');
  if(!panel||window.enginePerson?.store?.get('mode')!=='supermarket')return;
  const section=document.createElement('section');section.className='section';section.id='pdfPlanImportSection';
  section.innerHTML='<h3>Importar planta</h3><p class="warehouse-dimension-hint">Importe um PDF e delimite a área da planta. O modo Estrutural filtra cotas, mobiliário, gôndolas, símbolos e carimbo, mantendo preferencialmente paredes e divisórias arquitetônicas.</p>';
  const btn=document.createElement('button');btn.id='pdfPlanImportBtn';btn.type='button';btn.className='primary';btn.textContent='Importar planta PDF';btn.onclick=openImporter;section.appendChild(btn);
  panel.prepend(section);
}

function modalShell(){
  document.querySelector('#pdfPlanImporterModal')?.remove();
  const overlay=document.createElement('div');overlay.id='pdfPlanImporterModal';overlay.className='pdf-import-overlay';
  overlay.innerHTML=`<div class="pdf-import-modal">
    <aside class="pdf-import-side">
      <div class="eyebrow">IMPORTADOR DE PLANTA</div><h2>PDF → Planta 2D/3D</h2>
      <p class="warehouse-dimension-hint">1. Carregue o PDF. 2. Arraste um retângulo sobre somente a planta que deseja importar. 3. Use <b>Estrutural</b> para eliminar gôndolas, cotas, textos e detalhes.</p>
      <label class="pdf-import-label">Arquivo PDF<input id="pdfImportFile" type="file" accept="application/pdf"></label>
      <label class="pdf-import-label">Página<select id="pdfImportPage"><option value="1">1</option></select></label>
      <label class="pdf-import-label">Largura real da área selecionada (m)<input id="pdfImportWidthM" type="number" min="5" max="1000" step="0.5" value="30"></label>
      <label class="pdf-import-label">Modo de leitura<select id="pdfImportMode"><option value="structural" selected>Estrutural — paredes/divisórias</option><option value="all">Todas as linhas ortogonais</option></select></label>
      <label class="pdf-import-label">Filtro estrutural<input id="pdfImportTolerance" type="range" min="1" max="10" step="0.5" value="5"><output id="pdfImportToleranceOut">5.0</output></label>
      <div class="pdf-import-stats" id="pdfImportStats">Selecione um PDF.</div>
      <button id="pdfImportResetCrop" class="ghost-btn" disabled>Limpar seleção da planta</button>
      <button id="pdfImportDetect" class="ghost-btn" disabled>Reprocessar paredes</button>
      <button id="pdfImportApply" class="primary" disabled>Gerar planta 3D</button>
      <button id="pdfImportClose" class="ghost-btn">Fechar</button>
    </aside>
    <main class="pdf-import-preview"><div class="pdf-import-toolbar"><span>Prévia — arraste para selecionar a planta</span><span id="pdfImportPageInfo"></span></div><div class="pdf-import-canvas-wrap"><canvas id="pdfImportCanvas"></canvas><canvas id="pdfImportOverlay" style="cursor:crosshair"></canvas></div></main>
  </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#pdfImportClose').onclick=()=>overlay.remove();
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
  return overlay;
}

let session={pdf:null,page:null,viewport:null,rawSegments:[],segments:[],pdfjs:null,crop:null,dragStart:null};

async function openImporter(){
  const modal=modalShell();
  const fileInput=modal.querySelector('#pdfImportFile'),pageSel=modal.querySelector('#pdfImportPage'),tol=modal.querySelector('#pdfImportTolerance'),mode=modal.querySelector('#pdfImportMode');
  tol.oninput=()=>{modal.querySelector('#pdfImportToleranceOut').textContent=Number(tol.value).toFixed(1);};
  tol.onchange=()=>extractAndDraw(modal);
  mode.onchange=()=>extractAndDraw(modal);
  fileInput.onchange=async()=>{const file=fileInput.files?.[0];if(!file)return;await loadPdf(file,modal);};
  pageSel.onchange=()=>loadPage(Number(pageSel.value),modal);
  modal.querySelector('#pdfImportDetect').onclick=()=>extractAndDraw(modal);
  modal.querySelector('#pdfImportApply').onclick=()=>applyToPlan(modal);
  modal.querySelector('#pdfImportResetCrop').onclick=()=>{session.crop=null;drawOverlay(modal);extractAndDraw(modal);};
  installCropInteraction(modal);
}

function installCropInteraction(modal){
  const canvas=modal.querySelector('#pdfImportOverlay');
  const pos=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)};};
  canvas.onpointerdown=e=>{if(!session.page)return;session.dragStart=pos(e);canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(!session.dragStart)return;const p=pos(e),a=session.dragStart;session.crop={x:Math.min(a.x,p.x),y:Math.min(a.y,p.y),w:Math.abs(p.x-a.x),h:Math.abs(p.y-a.y)};drawOverlay(modal,true);};
  canvas.onpointerup=e=>{if(!session.dragStart)return;session.dragStart=null;if(session.crop?.w<20||session.crop?.h<20)session.crop=null;modal.querySelector('#pdfImportResetCrop').disabled=!session.crop;extractAndDraw(modal);};
}

async function loadPdf(file,modal){
  const stats=modal.querySelector('#pdfImportStats');stats.textContent='Carregando PDF…';
  try{
    const pdfjs=await import(PDFJS_URL);pdfjs.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;session.pdfjs=pdfjs;
    const data=new Uint8Array(await file.arrayBuffer());session.pdf=await pdfjs.getDocument({data}).promise;
    const sel=modal.querySelector('#pdfImportPage');sel.innerHTML='';for(let i=1;i<=session.pdf.numPages;i++){const o=document.createElement('option');o.value=i;o.textContent=i;sel.appendChild(o);}await loadPage(1,modal);
  }catch(err){console.error(err);stats.textContent=`Falha ao abrir PDF: ${err.message}`;}
}

async function loadPage(pageNumber,modal){
  const page=await session.pdf.getPage(pageNumber);session.page=page;session.crop=null;session.rawSegments=[];session.segments=[];
  const base=page.getViewport({scale:1}),maxW=1200,maxH=760,scale=Math.min(2.1,maxW/base.width,maxH/base.height),viewport=page.getViewport({scale});session.viewport=viewport;
  const canvas=modal.querySelector('#pdfImportCanvas'),ctx=canvas.getContext('2d');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:ctx,viewport}).promise;
  const overlay=modal.querySelector('#pdfImportOverlay');overlay.width=canvas.width;overlay.height=canvas.height;
  modal.querySelector('#pdfImportPageInfo').textContent=`página ${pageNumber}/${session.pdf.numPages}`;
  modal.querySelector('#pdfImportResetCrop').disabled=true;
  await extractAndDraw(modal);
}

async function collectRawSegments(){
  const page=session.page,pdfjs=session.pdfjs,viewport=session.viewport;if(!page||!pdfjs)return[];
  const opList=await page.getOperatorList(),raw=[];let cx=0,cy=0;
  const moveTo=pdfjs.OPS.moveTo,lineTo=pdfjs.OPS.lineTo,rectangle=pdfjs.OPS.rectangle;
  for(let i=0;i<opList.fnArray.length;i++){
    if(opList.fnArray[i]!==pdfjs.OPS.constructPath)continue;
    const args=opList.argsArray[i]||[],ops=args[0]||[],pts=args[1]||[];let pi=0;
    for(const op of ops){
      if(op===moveTo){cx=pts[pi++];cy=pts[pi++];}
      else if(op===lineTo){const nx=pts[pi++],ny=pts[pi++];raw.push(convertSegment(cx,cy,nx,ny,viewport));cx=nx;cy=ny;}
      else if(op===rectangle){const x=pts[pi++],y=pts[pi++],w=pts[pi++],h=pts[pi++];raw.push(convertSegment(x,y,x+w,y,viewport),convertSegment(x+w,y,x+w,y+h,viewport),convertSegment(x+w,y+h,x,y+h,viewport),convertSegment(x,y+h,x,y,viewport));cx=x;cy=y;}
      else{const arity=(op===pdfjs.OPS.curveTo?6:op===pdfjs.OPS.curveTo2||op===pdfjs.OPS.curveTo3?4:0);pi+=arity;}
    }
  }
  return raw.filter(Boolean);
}
function convertSegment(x1,y1,x2,y2,viewport){const a=viewport.convertToViewportPoint(x1,y1),b=viewport.convertToViewportPoint(x2,y2);return{x1:a[0],y1:a[1],x2:b[0],y2:b[1]};}

function inCrop(s){const c=session.crop;if(!c)return true;const mx=(s.x1+s.x2)/2,my=(s.y1+s.y2)/2;return mx>=c.x&&mx<=c.x+c.w&&my>=c.y&&my<=c.y+c.h;}
function cropBounds(){return session.crop||{x:0,y:0,w:session.viewport?.width||1,h:session.viewport?.height||1};}

function orthogonalize(raw,tolerance){const out=[];for(const s of raw){if(!inCrop(s))continue;const dx=s.x2-s.x1,dy=s.y2-s.y1,len=Math.hypot(dx,dy);if(len<5)continue;const nearH=Math.abs(dy)<=tolerance,nearV=Math.abs(dx)<=tolerance;if(nearH)out.push({x1:s.x1,y1:s.y1,x2:s.x2,y2:s.y1,axis:'h',len:Math.abs(dx)});else if(nearV)out.push({x1:s.x1,y1:s.y1,x2:s.x1,y2:s.y2,axis:'v',len:Math.abs(dy)});}return out;}

function normalizeSegment(s){return s.axis==='h'?{...s,x1:Math.min(s.x1,s.x2),x2:Math.max(s.x1,s.x2)}:{...s,y1:Math.min(s.y1,s.y2),y2:Math.max(s.y1,s.y2)};}
function mergeCollinear(items,axisTol=2.5,gap=5){
  const sorted=items.map(normalizeSegment).sort((a,b)=>a.axis.localeCompare(b.axis)||(a.axis==='h'?a.y1-b.y1:a.x1-b.x1)||(a.axis==='h'?a.x1-b.x1:a.y1-b.y1)),out=[];
  for(const s of sorted){const last=out[out.length-1];if(last&&last.axis===s.axis){if(s.axis==='h'&&Math.abs(last.y1-s.y1)<=axisTol&&s.x1<=last.x2+gap){last.x2=Math.max(last.x2,s.x2);last.len=last.x2-last.x1;continue;}if(s.axis==='v'&&Math.abs(last.x1-s.x1)<=axisTol&&s.y1<=last.y2+gap){last.y2=Math.max(last.y2,s.y2);last.len=last.y2-last.y1;continue;}}out.push({...s});}return out;
}
function overlap1D(a1,a2,b1,b2){return Math.max(0,Math.min(a2,b2)-Math.max(a1,b1));}
function structuralFilter(items,strength){
  const b=cropBounds(),diag=Math.hypot(b.w,b.h),minLen=diag*(0.018+strength*.0015),veryLong=diag*(0.16+strength*.004),pairGap=3+strength*1.9;
  const merged=mergeCollinear(items,2.2+strength*.18,5+strength*.7).filter(s=>s.len>=minLen),keep=new Set();
  for(let i=0;i<merged.length;i++){
    const a=merged[i];
    if(a.len>=veryLong)keep.add(i);
    for(let j=i+1;j<merged.length;j++){
      const d=merged[j];if(a.axis!==d.axis)continue;
      const gap=a.axis==='h'?Math.abs(a.y1-d.y1):Math.abs(a.x1-d.x1);if(gap<1||gap>pairGap)continue;
      const ov=a.axis==='h'?overlap1D(a.x1,a.x2,d.x1,d.x2):overlap1D(a.y1,a.y2,d.y1,d.y2),ratio=ov/Math.max(1,Math.min(a.len,d.len));
      if(ratio>=0.58&&ov>=minLen*.8){keep.add(i);keep.add(j);}
    }
  }
  let selected=[...keep].map(i=>merged[i]);
  // Remove dense repetitive fixture bands: many parallel lines with nearly identical spacing/length are usually gondolas, shelving, hatches or title blocks.
  selected=selected.filter((s,idx,arr)=>{let neighbors=0;for(let j=0;j<arr.length;j++){if(j===idx||arr[j].axis!==s.axis)continue;const d=arr[j],parallelDist=s.axis==='h'?Math.abs(s.y1-d.y1):Math.abs(s.x1-d.x1);if(parallelDist>pairGap*2.2)continue;const lenRatio=Math.min(s.len,d.len)/Math.max(s.len,d.len);if(lenRatio>.82)neighbors++;}return neighbors<7||s.len>=veryLong*1.35;});
  return dedupeSegments(selected,2.5);
}

async function extractAndDraw(modal){
  if(!session.page)return;
  const tolerance=Number(modal.querySelector('#pdfImportTolerance').value||5),mode=modal.querySelector('#pdfImportMode').value;
  if(!session.rawSegments.length)session.rawSegments=await collectRawSegments();
  const ortho=orthogonalize(session.rawSegments,2.5);
  session.segments=mode==='structural'?structuralFilter(ortho,tolerance):dedupeSegments(mergeCollinear(ortho,2.5,5).filter(s=>s.len>=8),3);
  drawOverlay(modal);
  const crop=session.crop?` · recorte ${Math.round(session.crop.w)}×${Math.round(session.crop.h)} px`:' · página inteira';
  modal.querySelector('#pdfImportStats').textContent=`${session.rawSegments.length} vetores no PDF · ${ortho.length} ortogonais no recorte · ${session.segments.length} ${mode==='structural'?'paredes prováveis':'linhas úteis'}${crop}.`;
  modal.querySelector('#pdfImportDetect').disabled=false;modal.querySelector('#pdfImportApply').disabled=session.segments.length===0;
}

function dedupeSegments(items,eps){const out=[];for(const raw of items){const s=normalizeSegment(raw);if(out.some(o=>o.axis===s.axis&&Math.abs(o.x1-s.x1)<eps&&Math.abs(o.y1-s.y1)<eps&&Math.abs(o.x2-s.x2)<eps&&Math.abs(o.y2-s.y2)<eps))continue;out.push(s);}return out;}
function drawOverlay(modal,dragging=false){const c=modal.querySelector('#pdfImportOverlay'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.strokeStyle='rgba(124,231,211,.95)';ctx.lineWidth=1.8;for(const s of session.segments){ctx.beginPath();ctx.moveTo(s.x1,s.y1);ctx.lineTo(s.x2,s.y2);ctx.stroke();}if(session.crop){ctx.save();ctx.fillStyle='rgba(124,231,211,.07)';ctx.strokeStyle=dragging?'rgba(255,210,102,.95)':'rgba(255,210,102,.9)';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.fillRect(session.crop.x,session.crop.y,session.crop.w,session.crop.h);ctx.strokeRect(session.crop.x,session.crop.y,session.crop.w,session.crop.h);ctx.restore();}}

async function applyToPlan(modal){
  const engine=await waitEngine(),p=engine.store.state.supermarket.plan||(engine.store.state.supermarket.plan={});if(!session.segments.length)return;
  const b=session.crop||(()=>{const xs=session.segments.flatMap(s=>[s.x1,s.x2]),ys=session.segments.flatMap(s=>[s.y1,s.y2]);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}})();
  const minX=b.x,maxX=b.x+b.w,minY=b.y,maxY=b.y+b.h,pxW=Math.max(1,maxX-minX),pxH=Math.max(1,maxY-minY);
  const realW=Math.max(5,Number(modal.querySelector('#pdfImportWidthM').value||30)),realH=realW*(pxH/pxW),targetCell=Math.max(.25,Math.min(1.5,Math.max(realW,realH)/100));
  const cols=Math.max(4,Math.min(160,Math.ceil(realW/targetCell))),rows=Math.max(4,Math.min(160,Math.ceil(realH/targetCell))),cellSize=Math.max(realW/cols,realH/rows),div=new Set();
  for(const s of session.segments){const x1=(s.x1-minX)/pxW*realW,x2=(s.x2-minX)/pxW*realW,y1=(s.y1-minY)/pxH*realH,y2=(s.y2-minY)/pxH*realH;if(s.axis==='h'){const r=Math.max(0,Math.min(rows-1,Math.round(((y1+y2)/2)/cellSize))),ca=Math.max(0,Math.min(cols-1,Math.floor(Math.min(x1,x2)/cellSize))),cb=Math.max(0,Math.min(cols-1,Math.floor(Math.max(x1,x2)/cellSize)));for(let c=ca;c<=cb;c++)div.add(`${r},${c},h`);}else{const c=Math.max(0,Math.min(cols-1,Math.round(((x1+x2)/2)/cellSize))),ra=Math.max(0,Math.min(rows-1,Math.floor(Math.min(y1,y2)/cellSize))),rb=Math.max(0,Math.min(rows-1,Math.floor(Math.max(y1,y2)/cellSize)));for(let r=ra;r<=rb;r++)div.add(`${r},${c},v`);}}
  p.cols=cols;p.rows=rows;p.cellSize=cellSize;p.targetArea=realW*realH;p.activeCells=[];p.dividers=[...div];p.showWalls=true;p.importedPdf={page:Number(modal.querySelector('#pdfImportPage').value||1),widthM:realW,heightM:realH,segments:session.segments.length,mode:modal.querySelector('#pdfImportMode').value,cropped:!!session.crop,importedAt:new Date().toISOString()};
  engine.regenerateNow?.('supermarket.plan');engine.renderInspector?.('supermarket',engine.store.get('activeTool'));modal.querySelector('#pdfImportStats').textContent=`Importado: ${realW.toFixed(1)} × ${realH.toFixed(1)} m · ${cols} × ${rows} células · ${session.segments.length} paredes vetoriais convertidas.`;
}

const observer=new MutationObserver(()=>makeButton());observer.observe(document.body,{subtree:true,childList:true});waitEngine().then(()=>makeButton());
