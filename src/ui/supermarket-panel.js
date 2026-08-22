const RANGE=(path,label,min,max,step=.01,suffix='')=>({type:'range',path,label,min,max,step,suffix});
const CHECK=(path,label)=>({type:'check',path,label});
const STEPPER=(path,label,min,max,step=1)=>({type:'stepper',path,label,min,max,step});

const SECTOR_TYPES=[
  ['sales','Área de vendas','#cfe6ff'],
  ['checkout','Frente de caixa','#ffd9a8'],
  ['stock','Depósito','#d8d1ff'],
  ['parking','Estacionamento','#c9d0d6'],
  ['service','Atendimento / serviços','#cfead8'],
  ['office','Administrativo','#ffe7b8'],
  ['receiving','Recebimento','#d6e1c3'],
  ['custom','Outro setor','#d9dde2']
];

const schema={title:'Gôndolas de Supermercado',sections:[
  {title:'Planta da loja',custom:'plan'},
  {title:'Dimensionamento',controls:[STEPPER('supermarket.gondolaRows','Fileiras de gôndolas',1,40,1),STEPPER('supermarket.modules','Módulos por gôndola',1,40,1),STEPPER('supermarket.shelves','Prateleiras',1,12,1)]},
  {title:'Estrutura',controls:[RANGE('supermarket.moduleWidth','Largura do módulo',.70,1.40,.05,' m'),RANGE('supermarket.depth','Profundidade',.45,1.10,.05,' m'),RANGE('supermarket.height','Altura',1.20,2.40,.05,' m'),RANGE('supermarket.aisleWidth','Largura do corredor',1.10,4,.05,' m'),CHECK('supermarket.doubleSided','Gôndolas dupla face'),CHECK('supermarket.backPanel','Fundo / painel traseiro')]},
  {title:'Terminais e laterais',controls:[CHECK('supermarket.endcaps','Terminais de gôndola'),CHECK('supermarket.wallGondolas','Laterais / paredes com gôndolas')]},
  {title:'Operação de loja',controls:[RANGE('supermarket.productFill','Ocupação de produtos',0,1,.01),STEPPER('supermarket.promoTables','Bancadas promocionais',0,12,1),STEPPER('supermarket.checkouts','Checkouts / caixas',0,24,1)]},
  {title:'Leitura do módulo',html:'<p class="warehouse-dimension-hint">A planta agora pode chegar a grandes formatos por área em m². O mapa 2D replica a malha da loja e permite delimitar setores operacionais, incluindo estacionamento com número de vagas.</p>'}
]};

function format(c,v){if(c.step>=1)return String(Math.round(v));const digits=c.step<.1?2:1;return`${Number(v).toFixed(digits)}${c.suffix??''}`;}
export class SupermarketPanelUI{
  constructor(store,onChange){this.store=store;this.onChange=onChange;this.title=document.querySelector('#panelTitle');this.content=document.querySelector('#panelContent');this.planMode='area';this.activeSectorId=null;}
  ensurePlan(){
    if(!this.store.state.supermarket.plan)this.store.state.supermarket.plan={cols:16,rows:12,cellSize:1.5,targetArea:432,showWalls:true,wallHeight:2.8,wallThickness:.12,activeCells:[],dividers:[],sectors:[]};
    const p=this.store.state.supermarket.plan;
    p.cols=Math.max(4,Math.min(120,Math.round(p.cols??16)));p.rows=Math.max(4,Math.min(120,Math.round(p.rows??12)));p.cellSize=Math.max(.4,Math.min(10,Number(p.cellSize??1.5)));p.targetArea=Number(p.targetArea??(p.cols*p.rows*p.cellSize*p.cellSize));p.showWalls=!!p.showWalls;p.wallHeight=Number(p.wallHeight??2.8);p.wallThickness=Number(p.wallThickness??.12);if(!Array.isArray(p.activeCells))p.activeCells=[];if(!Array.isArray(p.dividers))p.dividers=[];if(!Array.isArray(p.sectors))p.sectors=[];
    return p;
  }
  render(){this.ensurePlan();this.title.textContent=schema.title;this.content.innerHTML='';for(const section of schema.sections){const el=document.createElement('section');el.className='section';el.innerHTML=`<h3>${section.title}</h3>`;if(section.html)el.insertAdjacentHTML('beforeend',section.html);if(section.custom==='plan')el.appendChild(this.planEditor());for(const c of section.controls??[])el.appendChild(this.control(c));this.content.appendChild(el);}}
  planEditor(){
    const p=this.ensurePlan(),wrap=document.createElement('div');
    const hint=document.createElement('p');hint.className='warehouse-dimension-hint';hint.textContent='Desenhe a planta por células, ou informe uma área alvo em m². Use o Mapa 2D / Setores para delimitar áreas operacionais sobre a própria planta.';wrap.appendChild(hint);

    const areaBox=document.createElement('div');areaBox.style.display='grid';areaBox.style.gridTemplateColumns='1fr 88px';areaBox.style.gap='7px';areaBox.style.marginBottom='10px';
    const areaInput=document.createElement('input');areaInput.type='number';areaInput.min='25';areaInput.max='200000';areaInput.step='25';areaInput.value=Math.round(p.targetArea||p.cols*p.rows*p.cellSize*p.cellSize);areaInput.style.cssText='width:100%;border:1px solid rgba(255,255,255,.09);border-radius:9px;background:#111722;color:#edf2f7;padding:9px';
    const areaBtn=document.createElement('button');areaBtn.type='button';areaBtn.className='warehouse-toggle-btn';areaBtn.textContent='Aplicar m²';areaBtn.onclick=()=>this.applyTargetArea(Number(areaInput.value));
    const areaLabel=document.createElement('small');areaLabel.textContent='Área alvo da planta (m²)';areaLabel.style.gridColumn='1/3';areaLabel.style.color='#9ba8b8';areaBox.append(areaLabel,areaInput,areaBtn);wrap.appendChild(areaBox);

    const mapBtn=document.createElement('button');mapBtn.type='button';mapBtn.className='primary';mapBtn.textContent='Abrir Mapa 2D / Setores';mapBtn.style.marginBottom='10px';mapBtn.onclick=()=>this.openSectorModal();wrap.appendChild(mapBtn);

    const wallToggle=document.createElement('div');wallToggle.style.display='grid';wallToggle.style.gridTemplateColumns='1fr 1fr';wallToggle.style.gap='7px';wallToggle.style.marginBottom='10px';
    for(const [value,label] of [[true,'Mostrar paredes'],[false,'Ocultar paredes']]){const b=document.createElement('button');b.type='button';b.className=`warehouse-toggle-btn ${p.showWalls===value?'active':''}`;b.textContent=label;b.onclick=()=>{p.showWalls=value;this.onChange?.('supermarket.plan.showWalls');this.render();};wallToggle.appendChild(b);}wrap.appendChild(wallToggle);

    const dims=document.createElement('div');dims.style.display='grid';dims.style.gridTemplateColumns='1fr 1fr';dims.style.gap='8px';dims.style.marginBottom='10px';
    dims.append(this.miniStepper('Colunas',p.cols,4,120,v=>{p.cols=v;this.cropPlan();p.targetArea=p.cols*p.rows*p.cellSize*p.cellSize;this.onChange?.('supermarket.plan.cols');this.render();}),this.miniStepper('Linhas',p.rows,4,120,v=>{p.rows=v;this.cropPlan();p.targetArea=p.cols*p.rows*p.cellSize*p.cellSize;this.onChange?.('supermarket.plan.rows');this.render();}));wrap.appendChild(dims);

    const tools=document.createElement('div');tools.style.display='grid';tools.style.gridTemplateColumns='repeat(3,1fr)';tools.style.gap='6px';tools.style.marginBottom='9px';
    for(const [mode,label] of [['area','Área'],['h','Div. H'],['v','Div. V']]){const b=document.createElement('button');b.type='button';b.className=`warehouse-toggle-btn ${this.planMode===mode?'active':''}`;b.textContent=label;b.onclick=()=>{this.planMode=mode;this.render();};tools.appendChild(b);}wrap.appendChild(tools);

    const actions=document.createElement('div');actions.style.display='grid';actions.style.gridTemplateColumns='1fr 1fr';actions.style.gap='6px';actions.style.marginBottom='10px';
    const full=document.createElement('button');full.type='button';full.className='ghost-btn';full.textContent='Retângulo cheio';full.onclick=()=>{p.activeCells=[];p.dividers=[];this.onChange?.('supermarket.plan');this.render();};
    const clear=document.createElement('button');clear.type='button';clear.className='ghost-btn';clear.textContent='Limpar divisórias';clear.onclick=()=>{p.dividers=[];this.onChange?.('supermarket.plan.dividers');this.render();};actions.append(full,clear);wrap.appendChild(actions);

    const grid=this.createGrid(p,{compact:true,onCell:(r,c)=>this.editPlanCell(r,c)});wrap.appendChild(grid);
    wrap.append(this.compactRange('Tamanho da célula',p.cellSize,.5,10,.1,' m',v=>{p.cellSize=v;p.targetArea=p.cols*p.rows*v*v;this.onChange?.('supermarket.plan.cellSize');}),this.compactRange('Altura das paredes',p.wallHeight,1.5,5,.1,' m',v=>{p.wallHeight=v;this.onChange?.('supermarket.plan.wallHeight');}));
    return wrap;
  }
  createGrid(p,{compact=false,onCell=null,sectorMode=false}={}){
    const grid=document.createElement('div');grid.style.display='grid';grid.style.gridTemplateColumns=`repeat(${p.cols},minmax(${compact?'7px':'12px'},1fr))`;grid.style.gap=compact?'2px':'1px';grid.style.padding='6px';grid.style.border='1px solid rgba(255,255,255,.09)';grid.style.borderRadius='10px';grid.style.background='#0b1017';grid.style.maxHeight=compact?'300px':'68vh';grid.style.overflow='auto';
    const activeSet=new Set(p.activeCells),custom=activeSet.size>0,divSet=new Set(p.dividers),sectorByCell=new Map();for(const s of p.sectors)for(const key of s.cells??[])sectorByCell.set(key,s);
    for(let r=0;r<p.rows;r++)for(let c=0;c<p.cols;c++){
      const key=`${r},${c}`,active=custom?activeSet.has(key):true,sector=sectorByCell.get(key),cell=document.createElement('button');cell.type='button';cell.title=`L${r+1} C${c+1}${sector?' · '+sector.name:''}`;cell.style.aspectRatio='1';cell.style.minWidth=compact?'7px':'12px';cell.style.border='1px solid rgba(255,255,255,.08)';cell.style.borderRadius='2px';cell.style.padding='0';cell.style.cursor=active?'pointer':'not-allowed';cell.style.opacity=active?'1':'.18';cell.style.background=sectorMode&&sector?sector.color:(active?'rgba(124,231,211,.24)':'rgba(255,255,255,.025)');
      if(!sectorMode&&divSet.has(`${key},h`))cell.style.backgroundImage='linear-gradient(0deg,transparent 42%,#ffca66 42%,#ffca66 58%,transparent 58%)';
      if(!sectorMode&&divSet.has(`${key},v`))cell.style.backgroundImage=(cell.style.backgroundImage?cell.style.backgroundImage+',':'')+'linear-gradient(90deg,transparent 42%,#ffca66 42%,#ffca66 58%,transparent 58%)';
      if(active&&onCell)cell.onclick=()=>onCell(r,c);grid.appendChild(cell);
    }return grid;
  }
  applyTargetArea(area){const p=this.ensurePlan();if(!Number.isFinite(area)||area<25)return;const ratio=Math.max(.25,Math.min(4,p.cols/Math.max(1,p.rows)));const cells=Math.ceil(area/(p.cellSize*p.cellSize));let rows=Math.max(4,Math.round(Math.sqrt(cells/ratio))),cols=Math.max(4,Math.ceil(cells/rows));if(cols>120||rows>120){const neededCell=Math.sqrt(area/(120*120));p.cellSize=Math.min(10,Math.max(p.cellSize,Math.ceil(neededCell*10)/10));const cells2=Math.ceil(area/(p.cellSize*p.cellSize));rows=Math.max(4,Math.min(120,Math.round(Math.sqrt(cells2/ratio))));cols=Math.max(4,Math.min(120,Math.ceil(cells2/rows)));}p.cols=Math.min(120,cols);p.rows=Math.min(120,rows);p.targetArea=area;p.activeCells=[];p.dividers=[];p.sectors=[];this.onChange?.('supermarket.plan');this.render();}
  openSectorModal(){
    const p=this.ensurePlan();document.querySelector('#supermarketSectorModal')?.remove();
    const overlay=document.createElement('div');overlay.id='supermarketSectorModal';overlay.style.cssText='position:fixed;inset:0;z-index:200;background:rgba(3,6,10,.82);backdrop-filter:blur(8px);display:grid;place-items:center;padding:24px';
    const modal=document.createElement('div');modal.style.cssText='width:min(1180px,96vw);height:min(820px,92vh);background:#0d1219;border:1px solid rgba(255,255,255,.12);border-radius:18px;display:grid;grid-template-columns:300px 1fr;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.55)';
    const side=document.createElement('div');side.style.cssText='padding:18px;border-right:1px solid rgba(255,255,255,.09);overflow:auto';
    const head=document.createElement('div');head.innerHTML='<div style="font-size:10px;color:#7ce7d3;letter-spacing:.14em">MAPA OPERACIONAL 2D</div><h2 style="margin:5px 0 5px">Setores da loja</h2><p style="font-size:11px;color:#8f9bad;line-height:1.45">Selecione um setor e clique nas células da planta para pintar sua área. O mapa usa exatamente a mesma malha do 3D.</p>';side.appendChild(head);

    const list=document.createElement('div');list.style.display='grid';list.style.gap='6px';list.style.margin='14px 0';
    const renderSectorList=()=>{list.innerHTML='';for(const s of p.sectors){const b=document.createElement('button');b.type='button';b.className=`warehouse-toggle-btn ${this.activeSectorId===s.id?'active':''}`;b.style.textAlign='left';b.innerHTML=`<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${s.color};margin-right:7px"></span>${s.name}${s.type==='parking'?` · ${s.parkingSpaces||0} vagas`:''}`;b.onclick=()=>{this.activeSectorId=s.id;renderSectorList();renderMap();};list.appendChild(b);}};side.appendChild(list);

    const type=document.createElement('select');type.style.cssText='width:100%;background:#111722;color:#edf2f7;border:1px solid rgba(255,255,255,.1);border-radius:9px;padding:9px;margin-bottom:7px';for(const [v,l] of SECTOR_TYPES){const o=document.createElement('option');o.value=v;o.textContent=l;type.appendChild(o);}side.appendChild(type);
    const name=document.createElement('input');name.placeholder='Nome do setor';name.style.cssText='width:100%;background:#111722;color:#edf2f7;border:1px solid rgba(255,255,255,.1);border-radius:9px;padding:9px;margin-bottom:7px';side.appendChild(name);
    const parking=document.createElement('input');parking.type='number';parking.min='0';parking.max='5000';parking.placeholder='Número de vagas';parking.style.cssText='display:none;width:100%;background:#111722;color:#edf2f7;border:1px solid rgba(255,255,255,.1);border-radius:9px;padding:9px;margin-bottom:7px';side.appendChild(parking);type.onchange=()=>parking.style.display=type.value==='parking'?'block':'none';
    const add=document.createElement('button');add.className='primary';add.textContent='Adicionar setor';add.onclick=()=>{const spec=SECTOR_TYPES.find(x=>x[0]===type.value),id=`S${Date.now()}`;const s={id,type:type.value,name:name.value.trim()||spec[1],color:spec[2],parkingSpaces:type.value==='parking'?Math.max(0,Number(parking.value||0)):0,cells:[]};p.sectors.push(s);this.activeSectorId=id;name.value='';parking.value='';renderSectorList();renderMap();};side.appendChild(add);
    const erase=document.createElement('button');erase.className='ghost-btn';erase.textContent='Borracha de setor';erase.style.cssText='width:100%;margin-top:8px';erase.onclick=()=>{this.activeSectorId='__erase__';renderSectorList();};side.appendChild(erase);
    const remove=document.createElement('button');remove.className='ghost-btn';remove.textContent='Excluir setor selecionado';remove.style.cssText='width:100%;margin-top:8px';remove.onclick=()=>{if(!this.activeSectorId||this.activeSectorId==='__erase__')return;p.sectors=p.sectors.filter(s=>s.id!==this.activeSectorId);this.activeSectorId=null;renderSectorList();renderMap();};side.appendChild(remove);

    const main=document.createElement('div');main.style.cssText='display:flex;flex-direction:column;min-width:0';
    const toolbar=document.createElement('div');toolbar.style.cssText='height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid rgba(255,255,255,.09)';
    const meta=document.createElement('div');meta.style.cssText='font-size:11px;color:#9ba8b8';meta.textContent=`${p.cols} × ${p.rows} células · ${p.cellSize.toFixed(1)} m/célula · aprox. ${Math.round(p.cols*p.rows*p.cellSize*p.cellSize)} m² brutos`;
    const close=document.createElement('button');close.className='ghost-btn';close.textContent='Concluir';close.onclick=()=>{overlay.remove();this.onChange?.('supermarket.plan.sectors');this.render();};toolbar.append(meta,close);main.appendChild(toolbar);
    const mapHost=document.createElement('div');mapHost.style.cssText='padding:16px;overflow:auto;flex:1';main.appendChild(mapHost);
    const renderMap=()=>{mapHost.innerHTML='';const grid=this.createGrid(p,{sectorMode:true,onCell:(r,c)=>{const key=`${r},${c}`;for(const s of p.sectors)s.cells=(s.cells??[]).filter(k=>k!==key);if(this.activeSectorId&&this.activeSectorId!=='__erase__'){const target=p.sectors.find(s=>s.id===this.activeSectorId);if(target)target.cells.push(key);}renderMap();}});grid.style.maxHeight='none';grid.style.width='max-content';grid.style.minWidth='100%';mapHost.appendChild(grid);};
    modal.append(side,main);overlay.appendChild(modal);document.body.appendChild(overlay);renderSectorList();renderMap();overlay.onclick=e=>{if(e.target===overlay){overlay.remove();this.onChange?.('supermarket.plan.sectors');this.render();}};
  }
  editPlanCell(r,c){const p=this.ensurePlan(),key=`${r},${c}`;if(this.planMode==='area'){let set=new Set(p.activeCells);if(set.size===0){for(let rr=0;rr<p.rows;rr++)for(let cc=0;cc<p.cols;cc++)set.add(`${rr},${cc}`);}if(set.has(key))set.delete(key);else set.add(key);p.activeCells=[...set];p.dividers=p.dividers.filter(x=>!x.startsWith(`${key},`));for(const s of p.sectors)s.cells=(s.cells??[]).filter(k=>k!==key);}else{const dkey=`${key},${this.planMode}`,set=new Set(p.dividers);if(set.has(dkey))set.delete(dkey);else set.add(dkey);p.dividers=[...set];}this.onChange?.('supermarket.plan');this.render();}
  cropPlan(){const p=this.ensurePlan();const valid=k=>{const [r,c]=k.split(',').map(Number);return r<p.rows&&c<p.cols;};p.activeCells=p.activeCells.filter(valid);p.dividers=p.dividers.filter(valid);for(const s of p.sectors)s.cells=(s.cells??[]).filter(valid);}
  miniStepper(label,value,min,max,onSet){const w=document.createElement('div');w.style.display='grid';w.style.gridTemplateColumns='28px 1fr 28px';w.style.gap='4px';const t=document.createElement('small');t.textContent=label;t.style.gridColumn='1/4';t.style.color='#9ba8b8';const m=document.createElement('button'),o=document.createElement('output'),p=document.createElement('button');m.type=p.type='button';m.className=p.className='warehouse-stepper-btn';m.textContent='−';p.textContent='+';o.className='warehouse-stepper-value';o.textContent=value;m.onclick=()=>onSet(Math.max(min,value-1));p.onclick=()=>onSet(Math.min(max,value+1));w.append(t,m,o,p);return w;}
  compactRange(label,value,min,max,step,suffix,onSet){const w=document.createElement('div');w.className='control';const l=document.createElement('label'),o=document.createElement('output'),i=document.createElement('input');l.textContent=label;o.textContent=`${Number(value).toFixed(1)}${suffix}`;i.type='range';i.min=min;i.max=max;i.step=step;i.value=value;i.oninput=()=>{const v=Number(i.value);o.textContent=`${v.toFixed(1)}${suffix}`;onSet(v);};w.append(l,o,i);return w;}
  control(c){const wrap=document.createElement('div');wrap.className=`control${c.type==='stepper'?' warehouse-stepper-control':''}`;const value=this.store.get(c.path),label=document.createElement('label');label.textContent=c.label;wrap.appendChild(label);
    if(c.type==='stepper'){const ctr=document.createElement('div');ctr.className='warehouse-stepper';const minus=document.createElement('button'),plus=document.createElement('button'),out=document.createElement('output');minus.type=plus.type='button';minus.className=plus.className='warehouse-stepper-btn';minus.textContent='−';plus.textContent='+';out.className='warehouse-stepper-value';out.textContent=format(c,value);const apply=d=>{const cur=Number(this.store.get(c.path)),next=Math.max(c.min,Math.min(c.max,cur+d));if(next===cur)return;this.store.set(c.path,next);out.textContent=format(c,next);minus.disabled=next<=c.min;plus.disabled=next>=c.max;this.onChange?.(c.path);};minus.onclick=()=>apply(-c.step);plus.onclick=()=>apply(c.step);minus.disabled=value<=c.min;plus.disabled=value>=c.max;ctr.append(minus,out,plus);wrap.appendChild(ctr);}
    else if(c.type==='range'){const out=document.createElement('output'),input=document.createElement('input');out.textContent=format(c,value);input.type='range';input.min=c.min;input.max=c.max;input.step=c.step;input.value=value;input.oninput=()=>{const next=Number(input.value);out.textContent=format(c,next);this.store.set(c.path,next);this.onChange?.(c.path);};wrap.append(out,input);}
    else if(c.type==='check'){const input=document.createElement('input');input.type='checkbox';input.checked=!!value;input.onchange=()=>{this.store.set(c.path,input.checked);this.onChange?.(c.path);};wrap.appendChild(input);}return wrap;}
}
