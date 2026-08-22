const RANGE=(path,label,min,max,step=.01,suffix='')=>({type:'range',path,label,min,max,step,suffix});
const CHECK=(path,label)=>({type:'check',path,label});
const STEPPER=(path,label,min,max,step=1)=>({type:'stepper',path,label,min,max,step});

const schema={title:'Gôndolas de Supermercado',sections:[
  {title:'Planta da loja',custom:'plan'},
  {title:'Dimensionamento',controls:[
    STEPPER('supermarket.gondolaRows','Fileiras de gôndolas',1,20,1),
    STEPPER('supermarket.modules','Módulos por gôndola',1,24,1),
    STEPPER('supermarket.shelves','Prateleiras',1,10,1)
  ]},
  {title:'Estrutura',controls:[
    RANGE('supermarket.moduleWidth','Largura do módulo',.70,1.40,.05,' m'),
    RANGE('supermarket.depth','Profundidade',.45,1.10,.05,' m'),
    RANGE('supermarket.height','Altura',1.20,2.40,.05,' m'),
    RANGE('supermarket.aisleWidth','Largura do corredor',1.10,3.50,.05,' m'),
    CHECK('supermarket.doubleSided','Gôndolas dupla face'),
    CHECK('supermarket.backPanel','Fundo / painel traseiro')
  ]},
  {title:'Terminais e laterais',controls:[CHECK('supermarket.endcaps','Terminais de gôndola'),CHECK('supermarket.wallGondolas','Laterais / paredes com gôndolas')]},
  {title:'Operação de loja',controls:[RANGE('supermarket.productFill','Ocupação de produtos',0,1,.01),STEPPER('supermarket.promoTables','Bancadas promocionais',0,8,1),STEPPER('supermarket.checkouts','Checkouts / caixas',0,12,1)]},
  {title:'Leitura do módulo',html:'<p class="warehouse-dimension-hint">A planta funciona em uma malha modular. Você pode recortar qualquer formato ortogonal da loja, criar vazios e adicionar divisórias internas. Paredes podem ser exibidas ou ocultadas sem alterar a planta.</p>'}
]};

function format(c,v){if(c.step>=1)return String(Math.round(v));const digits=c.step<.1?2:1;return`${Number(v).toFixed(digits)}${c.suffix??''}`;}
export class SupermarketPanelUI{
  constructor(store,onChange){this.store=store;this.onChange=onChange;this.title=document.querySelector('#panelTitle');this.content=document.querySelector('#panelContent');this.planMode='area';}
  ensurePlan(){
    if(!this.store.state.supermarket.plan)this.store.state.supermarket.plan={cols:16,rows:12,cellSize:1,showWalls:false,wallHeight:2.8,wallThickness:.12,activeCells:[],dividers:[]};
    const p=this.store.state.supermarket.plan;
    p.cols=Math.max(4,Math.min(40,Math.round(p.cols??16)));p.rows=Math.max(4,Math.min(40,Math.round(p.rows??12)));p.cellSize=Number(p.cellSize??1);p.showWalls=!!p.showWalls;p.wallHeight=Number(p.wallHeight??2.8);p.wallThickness=Number(p.wallThickness??.12);if(!Array.isArray(p.activeCells))p.activeCells=[];if(!Array.isArray(p.dividers))p.dividers=[];
    return p;
  }
  render(){this.ensurePlan();this.title.textContent=schema.title;this.content.innerHTML='';for(const section of schema.sections){const el=document.createElement('section');el.className='section';el.innerHTML=`<h3>${section.title}</h3>`;if(section.html)el.insertAdjacentHTML('beforeend',section.html);if(section.custom==='plan')el.appendChild(this.planEditor());for(const c of section.controls??[])el.appendChild(this.control(c));this.content.appendChild(el);}}
  planEditor(){
    const p=this.ensurePlan(),wrap=document.createElement('div');
    const hint=document.createElement('p');hint.className='warehouse-dimension-hint';hint.textContent='Desenhe a planta por células. Área remove/adiciona piso; Div. H/V cria paredes internas. Células vazias viram recortes da loja.';wrap.appendChild(hint);
    const wallToggle=document.createElement('div');wallToggle.style.display='grid';wallToggle.style.gridTemplateColumns='1fr 1fr';wallToggle.style.gap='7px';wallToggle.style.marginBottom='10px';
    for(const [value,label] of [[true,'Mostrar paredes'],[false,'Ocultar paredes']]){const b=document.createElement('button');b.type='button';b.className=`warehouse-toggle-btn ${p.showWalls===value?'active':''}`;b.textContent=label;b.onclick=()=>{p.showWalls=value;this.onChange?.('supermarket.plan.showWalls');this.render();};wallToggle.appendChild(b);}wrap.appendChild(wallToggle);
    const dims=document.createElement('div');dims.style.display='grid';dims.style.gridTemplateColumns='1fr 1fr';dims.style.gap='8px';dims.style.marginBottom='10px';
    dims.append(this.miniStepper('Colunas',p.cols,4,40,v=>{p.cols=v;this.cropPlan();this.onChange?.('supermarket.plan.cols');this.render();}),this.miniStepper('Linhas',p.rows,4,40,v=>{p.rows=v;this.cropPlan();this.onChange?.('supermarket.plan.rows');this.render();}));wrap.appendChild(dims);
    const tools=document.createElement('div');tools.style.display='grid';tools.style.gridTemplateColumns='repeat(3,1fr)';tools.style.gap='6px';tools.style.marginBottom='9px';
    for(const [mode,label] of [['area','Área'],['h','Div. H'],['v','Div. V']]){const b=document.createElement('button');b.type='button';b.className=`warehouse-toggle-btn ${this.planMode===mode?'active':''}`;b.textContent=label;b.onclick=()=>{this.planMode=mode;this.render();};tools.appendChild(b);}wrap.appendChild(tools);
    const actions=document.createElement('div');actions.style.display='grid';actions.style.gridTemplateColumns='1fr 1fr';actions.style.gap='6px';actions.style.marginBottom='10px';
    const full=document.createElement('button');full.type='button';full.className='ghost-btn';full.textContent='Retângulo cheio';full.onclick=()=>{p.activeCells=[];p.dividers=[];this.onChange?.('supermarket.plan');this.render();};
    const clear=document.createElement('button');clear.type='button';clear.className='ghost-btn';clear.textContent='Limpar divisórias';clear.onclick=()=>{p.dividers=[];this.onChange?.('supermarket.plan.dividers');this.render();};actions.append(full,clear);wrap.appendChild(actions);
    const grid=document.createElement('div');grid.style.display='grid';grid.style.gridTemplateColumns=`repeat(${p.cols},1fr)`;grid.style.gap='2px';grid.style.padding='6px';grid.style.border='1px solid rgba(255,255,255,.09)';grid.style.borderRadius='10px';grid.style.background='#0b1017';grid.style.maxHeight='300px';grid.style.overflow='auto';
    const activeSet=new Set(p.activeCells),custom=activeSet.size>0,divSet=new Set(p.dividers);
    for(let r=0;r<p.rows;r++)for(let c=0;c<p.cols;c++){
      const key=`${r},${c}`,active=custom?activeSet.has(key):true,cell=document.createElement('button');cell.type='button';cell.title=`L${r+1} C${c+1}`;cell.style.aspectRatio='1';cell.style.minWidth='10px';cell.style.border='1px solid rgba(255,255,255,.08)';cell.style.borderRadius='2px';cell.style.padding='0';cell.style.cursor='pointer';cell.style.background=active?'rgba(124,231,211,.24)':'rgba(255,255,255,.025)';
      if(divSet.has(`${key},h`))cell.style.backgroundImage='linear-gradient(0deg,transparent 42%,#ffca66 42%,#ffca66 58%,transparent 58%)';
      if(divSet.has(`${key},v`))cell.style.backgroundImage=(cell.style.backgroundImage?cell.style.backgroundImage+',':'')+'linear-gradient(90deg,transparent 42%,#ffca66 42%,#ffca66 58%,transparent 58%)';
      cell.onclick=()=>{this.editPlanCell(r,c);};grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    wrap.append(this.compactRange('Tamanho da célula',p.cellSize,.5,2,.1,' m',v=>{p.cellSize=v;this.onChange?.('supermarket.plan.cellSize');}),this.compactRange('Altura das paredes',p.wallHeight,1.5,4,.1,' m',v=>{p.wallHeight=v;this.onChange?.('supermarket.plan.wallHeight');}));
    return wrap;
  }
  editPlanCell(r,c){const p=this.ensurePlan(),key=`${r},${c}`;if(this.planMode==='area'){let set=new Set(p.activeCells);if(set.size===0){for(let rr=0;rr<p.rows;rr++)for(let cc=0;cc<p.cols;cc++)set.add(`${rr},${cc}`);}if(set.has(key))set.delete(key);else set.add(key);p.activeCells=[...set];p.dividers=p.dividers.filter(x=>!x.startsWith(`${key},`));}else{const dkey=`${key},${this.planMode}`,set=new Set(p.dividers);if(set.has(dkey))set.delete(dkey);else set.add(dkey);p.dividers=[...set];}this.onChange?.('supermarket.plan');this.render();}
  cropPlan(){const p=this.ensurePlan();p.activeCells=p.activeCells.filter(k=>{const [r,c]=k.split(',').map(Number);return r<p.rows&&c<p.cols;});p.dividers=p.dividers.filter(k=>{const [r,c]=k.split(',').map(Number);return r<p.rows&&c<p.cols;});}
  miniStepper(label,value,min,max,onSet){const w=document.createElement('div');w.style.display='grid';w.style.gridTemplateColumns='28px 1fr 28px';w.style.gap='4px';const t=document.createElement('small');t.textContent=label;t.style.gridColumn='1/4';t.style.color='#9ba8b8';const m=document.createElement('button'),o=document.createElement('output'),p=document.createElement('button');m.type=p.type='button';m.className=p.className='warehouse-stepper-btn';m.textContent='−';p.textContent='+';o.className='warehouse-stepper-value';o.textContent=value;m.onclick=()=>onSet(Math.max(min,value-1));p.onclick=()=>onSet(Math.min(max,value+1));w.append(t,m,o,p);return w;}
  compactRange(label,value,min,max,step,suffix,onSet){const w=document.createElement('div');w.className='control';const l=document.createElement('label'),o=document.createElement('output'),i=document.createElement('input');l.textContent=label;o.textContent=`${Number(value).toFixed(1)}${suffix}`;i.type='range';i.min=min;i.max=max;i.step=step;i.value=value;i.oninput=()=>{const v=Number(i.value);o.textContent=`${v.toFixed(1)}${suffix}`;onSet(v);};w.append(l,o,i);return w;}
  control(c){const wrap=document.createElement('div');wrap.className=`control${c.type==='stepper'?' warehouse-stepper-control':''}`;const value=this.store.get(c.path),label=document.createElement('label');label.textContent=c.label;wrap.appendChild(label);
    if(c.type==='stepper'){const ctr=document.createElement('div');ctr.className='warehouse-stepper';const minus=document.createElement('button'),plus=document.createElement('button'),out=document.createElement('output');minus.type=plus.type='button';minus.className=plus.className='warehouse-stepper-btn';minus.textContent='−';plus.textContent='+';out.className='warehouse-stepper-value';out.textContent=format(c,value);const apply=d=>{const cur=Number(this.store.get(c.path)),next=Math.max(c.min,Math.min(c.max,cur+d));if(next===cur)return;this.store.set(c.path,next);out.textContent=format(c,next);minus.disabled=next<=c.min;plus.disabled=next>=c.max;this.onChange?.(c.path);};minus.onclick=()=>apply(-c.step);plus.onclick=()=>apply(c.step);minus.disabled=value<=c.min;plus.disabled=value>=c.max;ctr.append(minus,out,plus);wrap.appendChild(ctr);}
    else if(c.type==='range'){const out=document.createElement('output'),input=document.createElement('input');out.textContent=format(c,value);input.type='range';input.min=c.min;input.max=c.max;input.step=c.step;input.value=value;input.oninput=()=>{const next=Number(input.value);out.textContent=format(c,next);this.store.set(c.path,next);this.onChange?.(c.path);};wrap.append(out,input);}
    else if(c.type==='check'){const input=document.createElement('input');input.type='checkbox';input.checked=!!value;input.onchange=()=>{this.store.set(c.path,input.checked);this.onChange?.(c.path);};wrap.appendChild(input);}return wrap;}
}
