const PDFJS_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs';
const PDFJS_WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

function waitEngine(){return new Promise(resolve=>{const tick=()=>window.enginePerson?.store?resolve(window.enginePerson):setTimeout(tick,60);tick();});}

function makeButton(){
  if(document.querySelector('#pdfPlanImportBtn'))return;
  const panel=document.querySelector('#panelContent');
  if(!panel||window.enginePerson?.store?.get('mode')!=='supermarket')return;
  const section=document.createElement('section');section.className='section';section.id='pdfPlanImportSection';
  section.innerHTML='<h3>Importar planta</h3><p class="warehouse-dimension-hint">Importe uma planta baixa em PDF. O sistema tenta extrair linhas vetoriais, mostra a prévia e converte paredes/divisórias para o mesmo modelo 2D/3D da loja.</p>';
  const btn=document.createElement('button');btn.id='pdfPlanImportBtn';btn.type='button';btn.className='primary';btn.textContent='Importar planta PDF';btn.onclick=openImporter;section.appendChild(btn);
  panel.prepend(section);
}

function modalShell(){
  document.querySelector('#pdfPlanImporterModal')?.remove();
  const overlay=document.createElement('div');overlay.id='pdfPlanImporterModal';overlay.className='pdf-import-overlay';
  overlay.innerHTML=`<div class="pdf-import-modal">
    <aside class="pdf-import-side">
      <div class="eyebrow">IMPORTADOR DE PLANTA</div><h2>PDF → Planta 2D/3D</h2>
      <p class="warehouse-dimension-hint">Preferência por PDFs vetoriais exportados de CAD/Revit. PDFs rasterizados continuam aceitos para prévia, mas a extração automática de paredes pode ser limitada.</p>
      <label class="pdf-import-label">Arquivo PDF<input id="pdfImportFile" type="file" accept="application/pdf"></label>
      <label class="pdf-import-label">Página<select id="pdfImportPage"><option value="1">1</option></select></label>
      <label class="pdf-import-label">Largura real da planta (m)<input id="pdfImportWidthM" type="number" min="5" max="1000" step="0.5" value="30"></label>
      <label class="pdf-import-label">Sensibilidade de linhas<input id="pdfImportTolerance" type="range" min="0.5" max="8" step="0.5" value="2.5"><output id="pdfImportToleranceOut">2.5</output></label>
      <div class="pdf-import-stats" id="pdfImportStats">Selecione um PDF.</div>
      <button id="pdfImportDetect" class="ghost-btn" disabled>Reprocessar linhas</button>
      <button id="pdfImportApply" class="primary" disabled>Gerar planta 3D</button>
      <button id="pdfImportClose" class="ghost-btn">Fechar</button>
    </aside>
    <main class="pdf-import-preview"><div class="pdf-import-toolbar"><span>Prévia 2D vetorial</span><span id="pdfImportPageInfo"></span></div><div class="pdf-import-canvas-wrap"><canvas id="pdfImportCanvas"></canvas><canvas id="pdfImportOverlay"></canvas></div></main>
  </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#pdfImportClose').onclick=()=>overlay.remove();
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
  return overlay;
}

let session={pdf:null,page:null,viewport:null,segments:[],pdfjs:null};
async function openImporter(){
  const modal=modalShell();
  const fileInput=modal.querySelector('#pdfImportFile'),pageSel=modal.querySelector('#pdfImportPage'),tol=modal.querySelector('#pdfImportTolerance');
  tol.oninput=()=>modal.querySelector('#pdfImportToleranceOut').textContent=tol.value;
  fileInput.onchange=async()=>{const file=fileInput.files?.[0];if(!file)return;await loadPdf(file,modal);};
  pageSel.onchange=()=>loadPage(Number(pageSel.value),modal);
  modal.querySelector('#pdfImportDetect').onclick=()=>extractAndDraw(modal);
  modal.querySelector('#pdfImportApply').onclick=()=>applyToPlan(modal);
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
  const page=await session.pdf.getPage(pageNumber);session.page=page;
  const base=page.getViewport({scale:1});const maxW=1200,maxH=760,scale=Math.min(2.1,maxW/base.width,maxH/base.height);const viewport=page.getViewport({scale});session.viewport=viewport;
  const canvas=modal.querySelector('#pdfImportCanvas'),ctx=canvas.getContext('2d');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:ctx,viewport}).promise;
  const overlay=modal.querySelector('#pdfImportOverlay');overlay.width=canvas.width;overlay.height=canvas.height;
  modal.querySelector('#pdfImportPageInfo').textContent=`página ${pageNumber}/${session.pdf.numPages}`;
  await extractAndDraw(modal);
}

async function extractAndDraw(modal){
  const page=session.page,pdfjs=session.pdfjs,viewport=session.viewport;if(!page||!pdfjs)return;
  const tolerance=Number(modal.querySelector('#pdfImportTolerance').value||2.5),opList=await page.getOperatorList();const raw=[];let cx=0,cy=0;
  const moveTo=pdfjs.OPS.moveTo,lineTo=pdfjs.OPS.lineTo,rectangle=pdfjs.OPS.rectangle;
  for(let i=0;i<opList.fnArray.length;i++){
    if(opList.fnArray[i]!==pdfjs.OPS.constructPath)continue;
    const args=opList.argsArray[i]||[],ops=args[0]||[],pts=args[1]||[];let pi=0;
    for(const op of ops){
      if(op===moveTo){cx=pts[pi++];cy=pts[pi++];}
      else if(op===lineTo){const nx=pts[pi++],ny=pts[pi++];raw.push([cx,cy,nx,ny]);cx=nx;cy=ny;}
      else if(op===rectangle){const x=pts[pi++],y=pts[pi++],w=pts[pi++],h=pts[pi++];raw.push([x,y,x+w,y],[x+w,y,x+w,y+h],[x+w,y+h,x,y+h],[x,y+h,x,y]);cx=x;cy=y;}
      else { const arity=(op===pdfjs.OPS.curveTo?6:op===pdfjs.OPS.curveTo2||op===pdfjs.OPS.curveTo3?4:0); pi+=arity; }
    }
  }
  const seg=[];
  for(const s of raw){const [x1,y1]=viewport.convertToViewportPoint(s[0],s[1]),[x2,y2]=viewport.convertToViewportPoint(s[2],s[3]);const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);if(len<8)continue;const nearH=Math.abs(dy)<=tolerance,nearV=Math.abs(dx)<=tolerance;if(nearH)seg.push({x1,y1,x2,y2:y1,axis:'h'});else if(nearV)seg.push({x1,y1,x2:x1,y2,axis:'v'});}
  session.segments=dedupeSegments(seg,3);
  drawOverlay(modal);
  modal.querySelector('#pdfImportStats').textContent=`${raw.length} segmentos vetoriais lidos · ${session.segments.length} linhas ortogonais úteis detectadas.`;
  modal.querySelector('#pdfImportDetect').disabled=false;modal.querySelector('#pdfImportApply').disabled=session.segments.length===0;
}

function dedupeSegments(items,eps){const out=[];for(const s of items){const norm=s.axis==='h'?{...s,x1:Math.min(s.x1,s.x2),x2:Math.max(s.x1,s.x2)}:{...s,y1:Math.min(s.y1,s.y2),y2:Math.max(s.y1,s.y2)};if(out.some(o=>o.axis===norm.axis&&Math.abs(o.x1-norm.x1)<eps&&Math.abs(o.y1-norm.y1)<eps&&Math.abs(o.x2-norm.x2)<eps&&Math.abs(o.y2-norm.y2)<eps))continue;out.push(norm);}return out;}
function drawOverlay(modal){const c=modal.querySelector('#pdfImportOverlay'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.strokeStyle='rgba(124,231,211,.9)';ctx.lineWidth=1.35;for(const s of session.segments){ctx.beginPath();ctx.moveTo(s.x1,s.y1);ctx.lineTo(s.x2,s.y2);ctx.stroke();}}

async function applyToPlan(modal){
  const engine=await waitEngine(),p=engine.store.state.supermarket.plan||(engine.store.state.supermarket.plan={});if(!session.segments.length)return;
  const xs=session.segments.flatMap(s=>[s.x1,s.x2]),ys=session.segments.flatMap(s=>[s.y1,s.y2]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),pxW=Math.max(1,maxX-minX),pxH=Math.max(1,maxY-minY);
  const realW=Math.max(5,Number(modal.querySelector('#pdfImportWidthM').value||30)),realH=realW*(pxH/pxW),targetCell=Math.max(.25,Math.min(2,Math.max(realW,realH)/80));
  const cols=Math.max(4,Math.min(120,Math.ceil(realW/targetCell))),rows=Math.max(4,Math.min(120,Math.ceil(realH/targetCell))),cellSize=Math.max(realW/cols,realH/rows);
  const div=new Set();
  for(const s of session.segments){const x1=(s.x1-minX)/pxW*realW,x2=(s.x2-minX)/pxW*realW,y1=(s.y1-minY)/pxH*realH,y2=(s.y2-minY)/pxH*realH;if(s.axis==='h'){const r=Math.max(0,Math.min(rows-1,Math.round(((y1+y2)/2)/cellSize)));const ca=Math.max(0,Math.min(cols-1,Math.floor(Math.min(x1,x2)/cellSize))),cb=Math.max(0,Math.min(cols-1,Math.floor(Math.max(x1,x2)/cellSize)));for(let c=ca;c<=cb;c++)div.add(`${r},${c},h`);}else{const c=Math.max(0,Math.min(cols-1,Math.round(((x1+x2)/2)/cellSize)));const ra=Math.max(0,Math.min(rows-1,Math.floor(Math.min(y1,y2)/cellSize))),rb=Math.max(0,Math.min(rows-1,Math.floor(Math.max(y1,y2)/cellSize)));for(let r=ra;r<=rb;r++)div.add(`${r},${c},v`);}}
  p.cols=cols;p.rows=rows;p.cellSize=cellSize;p.targetArea=realW*realH;p.activeCells=[];p.dividers=[...div];p.showWalls=true;p.importedPdf={page:Number(modal.querySelector('#pdfImportPage').value||1),widthM:realW,heightM:realH,segments:session.segments.length,importedAt:new Date().toISOString()};
  engine.regenerateNow?.('supermarket.plan');engine.renderInspector?.('supermarket',engine.store.get('activeTool'));modal.querySelector('#pdfImportStats').textContent=`Importado: ${realW.toFixed(1)} × ${realH.toFixed(1)} m · ${cols} × ${rows} células · ${div.size} divisórias. O 3D foi atualizado.`;
}

const observer=new MutationObserver(()=>makeButton());observer.observe(document.body,{subtree:true,childList:true});waitEngine().then(()=>makeButton());
