const RANGE = (path, label, min, max, step = .01, suffix = '') => ({ type:'range', path, label, min, max, step, suffix });
const SELECT = (path, label, options) => ({ type:'select', path, label, options });
const COLOR = (path, label) => ({ type:'color', path, label });

const humanPanels = {
  shape: {
    title:'Corpo',
    sections:[
      { title:'Base', controls:[
        SELECT('human.sex','Tipo corporal',[['female','Feminino'],['male','Masculino']]),
        RANGE('human.height','Altura',1.45,2.05,.01,' m'),
        RANGE('human.bodyMass','Volume corporal',.72,1.35,.01),
        RANGE('human.headScale','Escala da cabeça',.88,1.12,.01)
      ]},
      { title:'Proporções', controls:[
        RANGE('human.shoulderWidth','Ombros',.78,1.25,.01),
        RANGE('human.hipWidth','Quadril',.78,1.28,.01),
        RANGE('human.torsoLength','Tronco',.84,1.18,.01),
        RANGE('human.legLength','Pernas',.86,1.16,.01),
        RANGE('human.armLength','Braços',.88,1.14,.01)
      ]}
    ]
  },
  face: {
    title:'Rosto',
    sections:[
      { title:'Estrutura facial', controls:[
        RANGE('human.faceWidth','Largura facial',.84,1.16,.01),
        RANGE('human.jawWidth','Mandíbula',.78,1.20,.01),
        RANGE('human.noseScale','Nariz',.78,1.24,.01),
        RANGE('human.eyeScale','Olhos',.82,1.22,.01)
      ]},
      { title:'Olhos e pele', controls:[COLOR('human.skin','Pele'),COLOR('human.eyes','Íris')]}
    ]
  },
  hair: {
    title:'Cabelo',
    sections:[
      { title:'Estilo', cards:{ path:'human.hairStyle', options:[['long-side','Longo lateral','Volume longo e assimétrico'],['bob','Bob','Corte médio arredondado'],['short','Curto','Volume compacto']] }},
      { title:'Material', controls:[COLOR('human.hair','Cor do cabelo')]}
    ]
  },
  clothing: {
    title:'Roupa',
    sections:[
      { title:'Conjunto', cards:{ path:'human.outfit', options:[['casual','Casual','Camiseta e calça'],['jacket','Jaqueta','Camada externa estruturada'],['formal','Formal','Casaco e visual sóbrio']] }},
      { title:'Cores', controls:[COLOR('human.topColor','Parte superior'),COLOR('human.bottomColor','Parte inferior')]}
    ]
  },
  materials: {
    title:'Materiais',
    sections:[{ title:'Superfícies atuais', controls:[COLOR('human.skin','Pele'),COLOR('human.hair','Cabelo'),COLOR('human.topColor','Roupa superior'),COLOR('human.bottomColor','Roupa inferior')] }]
  },
  environment: {
    title:'Ambiente',
    sections:[{ title:'Iluminação', controls:[RANGE('environment.timeOfDay','Hora',0,24,.1,' h'),RANGE('environment.exposure','Exposição',.45,1.8,.01),COLOR('environment.ground','Solo')] }]
  }
};

const cityPanel = {
  title:'Cidade Procedural',
  sections:[
    { title:'Malha urbana', controls:[
      RANGE('city.blocksX','Blocos X',3,12,1),
      RANGE('city.blocksZ','Blocos Z',3,12,1),
      RANGE('city.streetWidth','Largura das ruas',.10,.35,.01),
      RANGE('city.density','Densidade',.18,1,.01),
      RANGE('city.greenRatio','Áreas verdes',0,.42,.01)
    ]},
    { title:'Edificações', controls:[
      RANGE('city.minFloors','Mín. pavimentos',1,8,1),
      RANGE('city.maxFloors','Máx. pavimentos',3,28,1),
      RANGE('city.variation','Variação',0,1,.01),
      RANGE('city.facadeHue','Família de cor',0,1,.01)
    ]}
  ]
};

const projectPanel = {
  title:'Projeto',
  sections:[
    { title:'Engine Person', html:'<p style="font-size:11px;color:#9ba8b8;line-height:1.55;margin:0">O projeto é determinístico e local-first. Os parâmetros de pessoa, cidade e ambiente são salvos em JSON. A arquitetura já reserva módulos independentes para malhas-base, morphs, catálogo, rig, materiais, geração urbana e exportação.</p>' }
  ]
};

function formatValue(control, value) {
  if (control.step >= 1) return `${Math.round(value)}${control.suffix ?? ''}`;
  const digits = control.step < .1 ? 2 : 1;
  return `${Number(value).toFixed(digits)}${control.suffix ?? ''}`;
}

export class InspectorUI {
  constructor(store, onChange) {
    this.store = store;
    this.onChange = onChange;
    this.title = document.querySelector('#panelTitle');
    this.content = document.querySelector('#panelContent');
  }

  render(mode = this.store.get('mode'), tool = this.store.get('activeTool')) {
    const schema = mode === 'city' ? cityPanel : mode === 'project' ? projectPanel : (humanPanels[tool] ?? humanPanels.shape);
    this.title.textContent = schema.title;
    this.content.innerHTML = '';
    schema.sections.forEach(section => {
      const el = document.createElement('section');
      el.className = 'section';
      el.innerHTML = `<h3>${section.title}</h3>`;
      if (section.html) el.insertAdjacentHTML('beforeend', section.html);
      if (section.controls) section.controls.forEach(control => el.appendChild(this.control(control)));
      if (section.cards) el.appendChild(this.cards(section.cards));
      this.content.appendChild(el);
    });
  }

  control(c) {
    const wrap = document.createElement('div');
    wrap.className = 'control';
    const value = this.store.get(c.path);
    const label = document.createElement('label');
    label.textContent = c.label;
    wrap.appendChild(label);

    if (c.type === 'range') {
      const output = document.createElement('output');
      output.textContent = formatValue(c, value);
      const input = document.createElement('input');
      input.type = 'range'; input.min = c.min; input.max = c.max; input.step = c.step; input.value = value;
      input.addEventListener('input', () => {
        const next = Number(input.value);
        output.textContent = formatValue(c, next);
        this.store.set(c.path, next);
        this.onChange?.(c.path);
      });
      wrap.append(output,input);
    } else if (c.type === 'select') {
      const input = document.createElement('select');
      c.options.forEach(([v,t]) => input.add(new Option(t,v)));
      input.value = value;
      input.addEventListener('change',()=>{ this.store.set(c.path,input.value); this.onChange?.(c.path); });
      wrap.appendChild(input);
    } else if (c.type === 'color') {
      const input = document.createElement('input'); input.type='color'; input.value=value;
      input.addEventListener('input',()=>{ this.store.set(c.path,input.value); this.onChange?.(c.path); });
      wrap.appendChild(input);
    }
    return wrap;
  }

  cards(schema) {
    const grid = document.createElement('div'); grid.className='card-grid';
    schema.options.forEach(([value,title,desc])=>{
      const button = document.createElement('button');
      button.className = `choice-card ${this.store.get(schema.path)===value?'active':''}`;
      button.innerHTML = `<strong>${title}</strong><span>${desc}</span>`;
      button.addEventListener('click',()=>{
        this.store.set(schema.path,value); this.onChange?.(schema.path); this.render();
      });
      grid.appendChild(button);
    });
    return grid;
  }
}