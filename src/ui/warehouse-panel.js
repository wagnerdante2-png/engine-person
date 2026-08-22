const RANGE=(path,label,min,max,step=.01,suffix='')=>({type:'range',path,label,min,max,step,suffix});
const CHECK=(path,label)=>({type:'check',path,label});
const STEPPER=(path,label,min,max,step=1,suffix='')=>({type:'stepper',path,label,min,max,step,suffix});
const TOGGLE=(path,label,options)=>({type:'toggle',path,label,options});

const schema={title:'Centro de Distribuição',sections:[
  {title:'Configuração das longarinas',controls:[
    TOGGLE('warehouse.rackType','Tipo de configuração',[['unitary','Unitária'],['double','Dupla']])
  ],html:'<p class="warehouse-dimension-hint">Unitária: uma longarina de cada lado da rua. Dupla: duas longarinas encostadas, costas com costas, em cada lado da rua.</p>'},
  {title:'Dimensionamento rápido',controls:[
    STEPPER('warehouse.rows','Longarinas',1,30,1),
    STEPPER('warehouse.bays','Posições no comprimento',1,16,1),
    STEPPER('warehouse.levels','Posições na altura',1,7,1)
  ],html:'<p class="warehouse-dimension-hint">Ex.: 30 longarinas × 16 posições de comprimento × 7 posições de altura.</p>'},
  {title:'Estrutura das longarinas',controls:[
    RANGE('warehouse.bayWidth','Largura do módulo',1.10,2.20,.05,' m'),
    RANGE('warehouse.rackDepth','Profundidade do rack',.80,1.50,.05,' m'),
    RANGE('warehouse.levelHeight','Altura entre níveis',.70,1.50,.05,' m')
  ]},
  {title:'Operação e ocupação',controls:[
    RANGE('warehouse.aisleWidth','Largura dos corredores',1.60,4.50,.05,' m'),
    RANGE('warehouse.occupancy','Ocupação dos paletes',0,1,.01),
    CHECK('warehouse.showForklifts','Exibir empilhadeiras'),
    RANGE('warehouse.forklifts','Empilhadeiras',1,6,1)
  ]},
  {title:'Leitura operacional',html:'<p style="font-size:11px;color:#9ba8b8;line-height:1.55;margin:0">Use Unitária/Dupla para alternar entre uma ou duas longarinas encostadas de cada lado do corredor. O corredor permanece livre no centro.</p>'}
]};

function formatValue(c,v){if(c.step>=1)return`${Math.round(v)}${c.suffix??''}`;const digits=c.step<.01?3:c.step<.1?2:1;return`${Number(v).toFixed(digits)}${c.suffix??''}`;}

export class WarehousePanelUI{
  constructor(store,onChange){this.store=store;this.onChange=onChange;this.title=document.querySelector('#panelTitle');this.content=document.querySelector('#panelContent');}
  render(){this.title.textContent=schema.title;this.content.innerHTML='';schema.sections.forEach(section=>{const el=document.createElement('section');el.className='section';el.innerHTML=`<h3>${section.title}</h3>`;if(section.html)el.insertAdjacentHTML('beforeend',section.html);if(section.controls)section.controls.forEach(c=>el.appendChild(this.control(c)));this.content.appendChild(el);});}
  control(c){const wrap=document.createElement('div');wrap.className=`control${c.type==='stepper'?' warehouse-stepper-control':''}`;const value=this.store.get(c.path);const label=document.createElement('label');label.textContent=c.label;wrap.appendChild(label);
    if(c.type==='toggle'){
      const group=document.createElement('div');group.className='warehouse-toggle';
      c.options.forEach(([v,text])=>{const btn=document.createElement('button');btn.type='button';btn.className=`warehouse-toggle-btn ${value===v?'active':''}`;btn.textContent=text;btn.addEventListener('click',()=>{if(this.store.get(c.path)===v)return;this.store.set(c.path,v);this.onChange?.(c.path);this.render();});group.appendChild(btn);});
      wrap.appendChild(group);
    } else if(c.type==='stepper'){
      const controls=document.createElement('div');controls.className='warehouse-stepper';
      const minus=document.createElement('button');minus.type='button';minus.className='warehouse-stepper-btn';minus.textContent='−';minus.title=`Diminuir ${c.label.toLowerCase()}`;
      const output=document.createElement('output');output.className='warehouse-stepper-value';output.textContent=formatValue(c,value);
      const plus=document.createElement('button');plus.type='button';plus.className='warehouse-stepper-btn';plus.textContent='+';plus.title=`Aumentar ${c.label.toLowerCase()}`;
      const apply=(delta)=>{const current=Number(this.store.get(c.path));const next=Math.max(c.min,Math.min(c.max,current+delta));if(next===current)return;this.store.set(c.path,next);output.textContent=formatValue(c,next);minus.disabled=next<=c.min;plus.disabled=next>=c.max;this.onChange?.(c.path);};
      minus.addEventListener('click',()=>apply(-c.step));plus.addEventListener('click',()=>apply(c.step));minus.disabled=value<=c.min;plus.disabled=value>=c.max;
      controls.append(minus,output,plus);wrap.appendChild(controls);
    }
    else if(c.type==='range'){const output=document.createElement('output');output.textContent=formatValue(c,value);const input=document.createElement('input');input.type='range';input.min=c.min;input.max=c.max;input.step=c.step;input.value=value;input.addEventListener('input',()=>{const next=Number(input.value);output.textContent=formatValue(c,next);this.store.set(c.path,next);this.onChange?.(c.path);});wrap.append(output,input);}
    else if(c.type==='check'){const input=document.createElement('input');input.type='checkbox';input.checked=!!value;input.addEventListener('change',()=>{this.store.set(c.path,input.checked);this.onChange?.(c.path);});wrap.appendChild(input);}
    return wrap;
  }
}
