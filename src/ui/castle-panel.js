const RANGE=(path,label,min,max,step=.01,suffix='')=>({type:'range',path,label,min,max,step,suffix});
const CHECK=(path,label)=>({type:'check',path,label});
const SELECT=(path,label,options)=>({type:'select',path,label,options});

const schema={title:'Castelos Medievais',sections:[
  {title:'Arquitetura',controls:[
    SELECT('castle.style','Modelo',[['norman','Normando'],['concentric','Concêntrico'],['highland','Fortaleza de colina'],['romantic','Romântico']]),
    SELECT('castle.towerStyle','Torres',[['round','Circulares'],['square','Quadradas']]),
    RANGE('castle.outerWidth','Largura da fortificação',8,22,.5,' m'),
    RANGE('castle.outerDepth','Profundidade da fortificação',8,22,.5,' m'),
    RANGE('castle.wallHeight','Altura das muralhas',1.4,4.5,.1,' m')
  ]},
  {title:'Castelo central',controls:[
    RANGE('castle.keepWidth','Largura da torre de menagem',2.8,8,.1,' m'),
    RANGE('castle.keepDepth','Profundidade da torre',2.8,8,.1,' m'),
    RANGE('castle.keepHeight','Altura da torre',2.5,8,.1,' m'),
    CHECK('castle.innerCourtyard','Pátio interno / poço')
  ]},
  {title:'Defesas',controls:[
    CHECK('castle.moat','Fosso'),
    RANGE('castle.bridgeWidth','Largura da ponte',.8,2.6,.1,' m')
  ]},
  {title:'Entorno',controls:[
    CHECK('castle.garden','Jardins'),
    RANGE('castle.forestDensity','Densidade da floresta',0,1,.01),
    CHECK('castle.village','Vila externa'),
    RANGE('castle.villageHouses','Casas da vila',0,30,1)
  ]},
  {title:'Leitura',html:'<p style="font-size:11px;color:#9ba8b8;line-height:1.55;margin:0">Gere castelos com muralhas, torres, torre de menagem, ameias, fosso, ponte, pátio, jardins, floresta e povoado externo. A seed mantém cada composição reproduzível.</p>'}
]};
function formatValue(c,v){if(c.step>=1)return`${Math.round(v)}${c.suffix??''}`;const digits=c.step<.01?3:c.step<.1?2:1;return`${Number(v).toFixed(digits)}${c.suffix??''}`;}
export class CastlePanelUI{
  constructor(store,onChange){this.store=store;this.onChange=onChange;this.title=document.querySelector('#panelTitle');this.content=document.querySelector('#panelContent');}
  render(){this.title.textContent=schema.title;this.content.innerHTML='';for(const section of schema.sections){const el=document.createElement('section');el.className='section';el.innerHTML=`<h3>${section.title}</h3>`;if(section.html)el.insertAdjacentHTML('beforeend',section.html);for(const c of section.controls??[])el.appendChild(this.control(c));this.content.appendChild(el);}}
  control(c){const wrap=document.createElement('div');wrap.className='control';const value=this.store.get(c.path);const label=document.createElement('label');label.textContent=c.label;wrap.appendChild(label);if(c.type==='range'){const output=document.createElement('output');output.textContent=formatValue(c,value);const input=document.createElement('input');input.type='range';input.min=c.min;input.max=c.max;input.step=c.step;input.value=value;input.addEventListener('input',()=>{const next=Number(input.value);output.textContent=formatValue(c,next);this.store.set(c.path,next);this.onChange?.(c.path);});wrap.append(output,input);}else if(c.type==='check'){const input=document.createElement('input');input.type='checkbox';input.checked=!!value;input.addEventListener('change',()=>{this.store.set(c.path,input.checked);this.onChange?.(c.path);});wrap.appendChild(input);}else if(c.type==='select'){const input=document.createElement('select');for(const [v,t] of c.options)input.add(new Option(t,v));input.value=value;input.addEventListener('change',()=>{this.store.set(c.path,input.value);this.onChange?.(c.path);});wrap.appendChild(input);}return wrap;}
}
