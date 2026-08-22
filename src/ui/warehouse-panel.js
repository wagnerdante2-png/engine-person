const RANGE=(path,label,min,max,step=.01,suffix='')=>({type:'range',path,label,min,max,step,suffix});
const CHECK=(path,label)=>({type:'check',path,label});

const schema={title:'Centro de Distribuição',sections:[
  {title:'Estrutura das longarinas',controls:[
    RANGE('warehouse.rows','Fileiras de racks',2,10,1),
    RANGE('warehouse.bays','Módulos por fileira',2,14,1),
    RANGE('warehouse.levels','Níveis por longarina',1,7,1),
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
  {title:'Leitura operacional',html:'<p style="font-size:11px;color:#9ba8b8;line-height:1.55;margin:0">Racks azuis, posições por nível, paletes com carga procedural, corredores e empilhadeiras. A seed mantém o layout determinístico para repetir uma mesma simulação.</p>'}
]};

function formatValue(c,v){if(c.step>=1)return`${Math.round(v)}${c.suffix??''}`;const digits=c.step<.01?3:c.step<.1?2:1;return`${Number(v).toFixed(digits)}${c.suffix??''}`;}

export class WarehousePanelUI{
  constructor(store,onChange){this.store=store;this.onChange=onChange;this.title=document.querySelector('#panelTitle');this.content=document.querySelector('#panelContent');}
  render(){this.title.textContent=schema.title;this.content.innerHTML='';schema.sections.forEach(section=>{const el=document.createElement('section');el.className='section';el.innerHTML=`<h3>${section.title}</h3>`;if(section.html)el.insertAdjacentHTML('beforeend',section.html);if(section.controls)section.controls.forEach(c=>el.appendChild(this.control(c)));this.content.appendChild(el);});}
  control(c){const wrap=document.createElement('div');wrap.className='control';const value=this.store.get(c.path);const label=document.createElement('label');label.textContent=c.label;wrap.appendChild(label);
    if(c.type==='range'){const output=document.createElement('output');output.textContent=formatValue(c,value);const input=document.createElement('input');input.type='range';input.min=c.min;input.max=c.max;input.step=c.step;input.value=value;input.addEventListener('input',()=>{const next=Number(input.value);output.textContent=formatValue(c,next);this.store.set(c.path,next);this.onChange?.(c.path);});wrap.append(output,input);}
    else if(c.type==='check'){const input=document.createElement('input');input.type='checkbox';input.checked=!!value;input.addEventListener('change',()=>{this.store.set(c.path,input.checked);this.onChange?.(c.path);});wrap.appendChild(input);}
    return wrap;
  }
}
