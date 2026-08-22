const RANGE=(path,label,min,max,step=.01,suffix='')=>({type:'range',path,label,min,max,step,suffix});
const CHECK=(path,label)=>({type:'check',path,label});
const STEPPER=(path,label,min,max,step=1)=>({type:'stepper',path,label,min,max,step});

const schema={title:'Gôndolas de Supermercado',sections:[
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
  {title:'Terminais e laterais',controls:[
    CHECK('supermarket.endcaps','Terminais de gôndola'),
    CHECK('supermarket.wallGondolas','Laterais / paredes com gôndolas')
  ]},
  {title:'Operação de loja',controls:[
    RANGE('supermarket.productFill','Ocupação de produtos',0,1,.01),
    STEPPER('supermarket.promoTables','Bancadas promocionais',0,8,1),
    STEPPER('supermarket.checkouts','Checkouts / caixas',0,12,1)
  ]},
  {title:'Leitura do módulo',html:'<p class="warehouse-dimension-hint">Motor procedural para gôndolas de supermercado: módulos, prateleiras, terminais, laterais, corredores, bancadas promocionais, produtos simulados e checkouts. A seed mantém a mesma loja reproduzível.</p>'}
]};

function format(c,v){if(c.step>=1)return String(Math.round(v));const digits=c.step<.1?2:1;return`${Number(v).toFixed(digits)}${c.suffix??''}`;}
export class SupermarketPanelUI{
  constructor(store,onChange){this.store=store;this.onChange=onChange;this.title=document.querySelector('#panelTitle');this.content=document.querySelector('#panelContent');}
  render(){this.title.textContent=schema.title;this.content.innerHTML='';for(const section of schema.sections){const el=document.createElement('section');el.className='section';el.innerHTML=`<h3>${section.title}</h3>`;if(section.html)el.insertAdjacentHTML('beforeend',section.html);for(const c of section.controls??[])el.appendChild(this.control(c));this.content.appendChild(el);}}
  control(c){const wrap=document.createElement('div');wrap.className=`control${c.type==='stepper'?' warehouse-stepper-control':''}`;const value=this.store.get(c.path);const label=document.createElement('label');label.textContent=c.label;wrap.appendChild(label);
    if(c.type==='stepper'){const ctr=document.createElement('div');ctr.className='warehouse-stepper';const minus=document.createElement('button'),plus=document.createElement('button'),out=document.createElement('output');minus.type=plus.type='button';minus.className=plus.className='warehouse-stepper-btn';minus.textContent='−';plus.textContent='+';out.className='warehouse-stepper-value';out.textContent=format(c,value);const apply=d=>{const cur=Number(this.store.get(c.path)),next=Math.max(c.min,Math.min(c.max,cur+d));if(next===cur)return;this.store.set(c.path,next);out.textContent=format(c,next);minus.disabled=next<=c.min;plus.disabled=next>=c.max;this.onChange?.(c.path);};minus.onclick=()=>apply(-c.step);plus.onclick=()=>apply(c.step);minus.disabled=value<=c.min;plus.disabled=value>=c.max;ctr.append(minus,out,plus);wrap.appendChild(ctr);}
    else if(c.type==='range'){const out=document.createElement('output'),input=document.createElement('input');out.textContent=format(c,value);input.type='range';input.min=c.min;input.max=c.max;input.step=c.step;input.value=value;input.oninput=()=>{const next=Number(input.value);out.textContent=format(c,next);this.store.set(c.path,next);this.onChange?.(c.path);};wrap.append(out,input);}
    else if(c.type==='check'){const input=document.createElement('input');input.type='checkbox';input.checked=!!value;input.onchange=()=>{this.store.set(c.path,input.checked);this.onChange?.(c.path);};wrap.appendChild(input);}
    return wrap;
  }
}
