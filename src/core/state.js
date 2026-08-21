export const defaultState = {
  version: 2,
  mode: 'human',
  activeTool: 'shape',
  seed: 483921,
  human: {
    sex: 'female',
    height: 1.70,
    shoulderWidth: 0.96,
    torsoLength: 1.00,
    hipWidth: 1.00,
    waistWidth: 1.00,
    chestWidth: 1.00,
    chestDepth: 1.00,
    glute: 1.00,
    muscle: 1.00,
    neckThickness: 1.00,
    legLength: 1.00,
    armLength: 1.00,
    bodyMass: 0.95,
    headScale: 1.00,
    faceWidth: 1.00,
    headDepth: 1.00,
    jawWidth: 0.94,
    cheekbones: 1.00,
    chinSize: 1.00,
    noseScale: 1.00,
    noseWidth: 1.00,
    eyeScale: 1.00,
    eyeSpacing: 1.00,
    mouthWidth: 1.00,
    lipColor: '#9b5b57',
    skin: '#c98f72',
    hair: '#4a2b20',
    eyes: '#5c493d',
    hairStyle: 'long-side',
    hairLength: 1.00,
    outfit: 'casual',
    topColor: '#191b22',
    bottomColor: '#20334a'
  },
  city: {
    seed: 952731,
    blocksX: 7,
    blocksZ: 7,
    density: 0.74,
    streetWidth: 0.18,
    minFloors: 2,
    maxFloors: 14,
    variation: 0.72,
    greenRatio: 0.15,
    facadeHue: 0.58
  },
  environment: {
    timeOfDay: 18.2,
    exposure: 1.0,
    ground: '#11151d',
    autoRotate: false,
    grid: true
  }
};

export function cloneState(source = defaultState) {
  return JSON.parse(JSON.stringify(source));
}

function mergeDeep(base, incoming) {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return incoming ?? base;
  const out = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    out[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? mergeDeep(base?.[key] ?? {}, value)
      : value;
  }
  return out;
}

export class Store extends EventTarget {
  constructor(initial = defaultState) {
    super();
    this.state = cloneState(mergeDeep(defaultState, initial));
  }

  get(path) {
    return path.split('.').reduce((acc, key) => acc?.[key], this.state);
  }

  set(path, value, silent = false) {
    const keys = path.split('.');
    let node = this.state;
    for (let i = 0; i < keys.length - 1; i++) node = node[keys[i]];
    node[keys.at(-1)] = value;
    if (!silent) this.dispatchEvent(new CustomEvent('change', { detail: { path, value, state: this.state } }));
  }

  replace(next) {
    this.state = cloneState(mergeDeep(defaultState, next));
    this.state.version = defaultState.version;
    this.dispatchEvent(new CustomEvent('replace', { detail: { state: this.state } }));
  }

  randomizeSeed(target = 'seed') {
    const seed = Math.floor(Math.random() * 900000) + 100000;
    if (target === 'city') this.set('city.seed', seed);
    else this.set('seed', seed);
    return seed;
  }

  serialize() {
    return JSON.stringify(this.state, null, 2);
  }
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
