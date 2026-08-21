import * as THREE from 'three';

const clamp01=v=>THREE.MathUtils.clamp(v,0,1);

export function createFacialState(h={}) {
  return {
    expression:h.expression ?? 'neutral',
    blink:0,
    blinkSpeed:h.blinkSpeed ?? 1,
    smile:h.smile ?? 0,
    jawOpen:h.jawOpen ?? 0,
    browRaise:h.browRaise ?? 0,
    squint:h.squint ?? 0
  };
}

function expressionPreset(name) {
  switch(name) {
    case 'smile': return {smile:.78,jawOpen:.08,browRaise:.08,squint:.12};
    case 'serious': return {smile:0,jawOpen:0,browRaise:-.08,squint:.24};
    case 'surprised': return {smile:.05,jawOpen:.48,browRaise:.55,squint:0};
    case 'angry': return {smile:0,jawOpen:.10,browRaise:-.34,squint:.34};
    default: return {smile:0,jawOpen:0,browRaise:0,squint:0};
  }
}

export function registerFacialParts(root) {
  const parts={eyes:[],brows:[],lips:[],teeth:[],tongue:[]};
  root.traverse(obj=>{
    const n=obj.name||'';
    if(n.startsWith('EyeBall_')||n.startsWith('Cornea_')) parts.eyes.push(obj);
    else if(n.startsWith('Brow_')) parts.brows.push(obj);
    else if(n.startsWith('Lip_')) parts.lips.push(obj);
    else if(n==='Teeth') parts.teeth.push(obj);
    else if(n==='Tongue') parts.tongue.push(obj);
  });
  return parts;
}

export function createFacialController(root,h={}) {
  const parts=registerFacialParts(root);
  const state=createFacialState(h);
  const preset=expressionPreset(state.expression);
  state.smile=clamp01(Math.max(state.smile,preset.smile||0));
  state.jawOpen=clamp01(Math.max(state.jawOpen,preset.jawOpen||0));
  state.browRaise=THREE.MathUtils.clamp((state.browRaise||0)+(preset.browRaise||0),-.6,.8);
  state.squint=clamp01(Math.max(state.squint,preset.squint||0));
  const bases=new Map();
  [...parts.eyes,...parts.brows,...parts.lips,...parts.teeth,...parts.tongue].forEach(o=>bases.set(o,{p:o.position.clone(),s:o.scale.clone(),r:o.rotation.clone()}));

  return time=>{
    const speed=Math.max(.1,state.blinkSpeed);
    const cycle=(time*speed)%4.6;
    const autoBlink=cycle>4.42?Math.sin(((cycle-4.42)/.18)*Math.PI):0;
    const blink=Math.max(state.blink,autoBlink);
    parts.eyes.forEach(o=>{
      const b=bases.get(o); if(!b)return;
      o.scale.y=b.s.y*Math.max(.08,1-blink*.92-state.squint*.35);
    });
    parts.brows.forEach((o,i)=>{
      const b=bases.get(o); if(!b)return;
      o.position.y=b.p.y + (state.browRaise*.018) + (state.smile*.003);
      o.rotation.z=b.r.z + (i%2===0?-1:1)*state.browRaise*.08;
    });
    if(parts.lips.length>=2){
      const upper=parts.lips[0], lower=parts.lips[1];
      const bu=bases.get(upper), bl=bases.get(lower);
      upper.scale.x=bu.s.x*(1+state.smile*.10); lower.scale.x=bl.s.x*(1+state.smile*.12);
      upper.position.y=bu.p.y+state.smile*.004+state.jawOpen*.006;
      lower.position.y=bl.p.y-state.jawOpen*.025+state.smile*.002;
    }
    parts.teeth.forEach(o=>{const b=bases.get(o);o.position.y=b.p.y-state.jawOpen*.010;});
    parts.tongue.forEach(o=>{const b=bases.get(o);o.position.y=b.p.y-state.jawOpen*.018;});
  };
}
