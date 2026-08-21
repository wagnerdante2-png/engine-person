import { mulberry32 } from '../core/state.js';

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const pick=(rand,items)=>items[Math.floor(rand()*items.length)];
const range=(rand,a,b)=>a+rand()*(b-a);

const SKINS=['#f2c9ae','#deb092','#c98f72','#a86f54','#80513e','#5b382d'];
const EYES=['#516a72','#61704e','#5c493d','#744c30','#3f2f27'];
const HAIRS=['#171414','#2b1b16','#4a2b20','#6b4630','#9b7049','#c5a77b'];
const LIPS=['#8e5454','#9b5b57','#a96b66','#7f4745'];

export function resolveHumanProfile(input={}) {
  const h={...input};
  const autonomy=clamp(Number(h.autonomy??0),0,1);
  const seed=(Number(h.seed??483921)>>>0) || 483921;
  const rand=mulberry32(seed);
  if (autonomy<=0) return h;

  const sex=h.sex==='male'?'male':'female';
  const generated={
    age:Math.round(range(rand,18,72)),
    height:sex==='female'?range(rand,1.50,1.84):range(rand,1.61,1.96),
    bodyMass:range(rand,.82,1.18),
    muscle:range(rand,.82,1.22),
    shoulderWidth:sex==='female'?range(rand,.88,1.08):range(rand,.98,1.18),
    chestWidth:range(rand,.88,1.14),
    chestDepth:range(rand,.88,1.13),
    waistWidth:range(rand,.84,1.16),
    hipWidth:sex==='female'?range(rand,.94,1.17):range(rand,.88,1.08),
    glute:range(rand,.88,1.16),
    torsoLength:range(rand,.93,1.08),
    legLength:range(rand,.94,1.08),
    armLength:range(rand,.95,1.06),
    neckThickness:sex==='female'?range(rand,.88,1.08):range(rand,.98,1.16),
    headScale:range(rand,.95,1.06),
    faceWidth:range(rand,.91,1.09),
    headDepth:range(rand,.93,1.08),
    jawWidth:sex==='female'?range(rand,.86,1.02):range(rand,.96,1.12),
    cheekbones:range(rand,.90,1.12),
    chinSize:range(rand,.90,1.12),
    foreheadHeight:range(rand,.88,1.14),
    browHeight:range(rand,.88,1.12),
    browThickness:range(rand,.75,1.35),
    eyeScale:range(rand,.92,1.09),
    eyeSpacing:range(rand,.93,1.08),
    eyelidOpen:range(rand,.82,1.10),
    noseScale:range(rand,.88,1.13),
    noseWidth:range(rand,.86,1.14),
    noseBridge:range(rand,.82,1.18),
    mouthWidth:range(rand,.90,1.12),
    lipFullness:range(rand,.76,1.28),
    earScale:range(rand,.86,1.15),
    asymmetry:range(rand,0,.12),
    skinRoughness:range(rand,.38,.60),
    skinDetail:range(rand,.35,1.00),
    hairDensity:range(rand,.72,1.20),
    hairLength:range(rand,.70,1.32),
    hairStyle:pick(rand,['short','bob','long-side']),
    skin:pick(rand,SKINS), eyes:pick(rand,EYES), hair:pick(rand,HAIRS), lipColor:pick(rand,LIPS)
  };

  for (const [key,value] of Object.entries(generated)) {
    if (typeof value==='number' && typeof h[key]==='number') h[key]=lerp(h[key],value,autonomy);
    else if (autonomy>.55 || h[key]==null) h[key]=value;
  }

  const ageFactor=clamp((h.age-35)/45,0,1);
  h.skinRoughness=clamp((h.skinRoughness??.46)+ageFactor*.09,.30,.72);
  h.eyeScale=clamp((h.eyeScale??1)*(1-ageFactor*.025),.78,1.24);
  h.bodyMass=clamp(h.bodyMass??1,.70,1.38);
  return h;
}
