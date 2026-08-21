import { Store, defaultState } from './core/state.js';
import { SceneRuntime } from './core/scene.js';
import { generateHuman } from './generators/human.js';
import { generateCity } from './generators/city.js';
import { InspectorUI } from './ui/panels.js';
import { loadFlame2023OpenCore } from './assets/flame2023-open/runtime.js';

let flameRuntimeReady = false;
try {
  const flame = await loadFlame2023OpenCore();
  flameRuntimeReady = flame.metadata.vertexCount === 5023 && flame.metadata.faceCount === 9976;
  console.info(`[Engine Person] FLAME2023_Open ready: ${flame.metadata.vertexCount} vertices / ${flame.metadata.faceCount} faces`);
} catch (error) {
  console.warn('[Engine Person] Exact FLAME runtime assets are not available yet; fallback remains active.', error);
}

const store = new Store(defaultState);
const runtime = new SceneRuntime(document.querySelector('#viewport'), store);
const stats = document.querySelector('#objectStats');
const modeLabel = document.querySelector('#modeLabel');
const seedLabel = document.querySelector('#seedLabel');
const inspector = new InspectorUI(store, regenerate);

function renderCurrent() {
  const mode = store.get('mode');
  if (mode === 'human') {
    const obj = generateHuman({ ...store.state.human, seed: store.state.seed });
    runtime.setObject(obj, { mode:'human' });
    const s = obj.userData.stats;
    const bones = obj.userData.rig?.bones?.length ?? 0;
    const head = obj.userData.systems?.headBase ?? 'unknown-head';
    const flameTag = flameRuntimeReady ? ` · FLAME ${s.headVertices ?? '?'}v/${s.headFaces ?? '?'}f` : ` · ${head}`;
    stats.textContent = `Pessoa paramétrica · ${bones} ossos · ${store.get('human.pose')} · ${store.get('human.animation')} · ${s.height.toFixed(2)} m · autonomia ${Math.round(s.autonomy*100)}%${flameTag}`;
    modeLabel.textContent = 'PERSON DESIGN';
    seedLabel.textContent = String(store.get('seed')).padStart(6,'0');
  } else if (mode === 'city') {
    const obj = generateCity(store.state.city);
    runtime.setObject(obj, { mode:'city' });
    const s = obj.userData.stats;
    stats.textContent = `${s.eraLabel} · ${s.buildings} construções · ${s.parcels} lotes · ${s.roads} vias · ${s.parks} áreas verdes`;
    modeLabel.textContent = s.era === 'medieval' ? 'MEDIEVAL WORLD' : s.era === 'hybrid' ? 'MIXED WORLD' : 'CITY DESIGN';
    seedLabel.textContent = String(store.get('city.seed')).padStart(6,'0');
  } else {
    runtime.clearContent();
    stats.textContent = 'Projeto local · JSON determinístico · sem backend';
    modeLabel.textContent = 'PROJECT';
    seedLabel.textContent = String(store.get('seed')).padStart(6,'0');
  }
  runtime.applyEnvironment(store.state.environment);
}
function regenerate(path='') { if (path.startsWith('environment.')) runtime.applyEnvironment(store.state.environment); else renderCurrent(); }
function setMode(mode) {
  store.set('mode', mode, true);
  document.querySelectorAll('.workspace-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
  document.querySelectorAll('.tool-button').forEach(btn => btn.disabled = mode !== 'human' && btn.dataset.tool !== 'environment');
  inspector.render(mode, store.get('activeTool')); renderCurrent();
}
function setTool(tool) { store.set('activeTool', tool, true); document.querySelectorAll('.tool-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tool === tool)); inspector.render(store.get('mode'), tool); }
document.querySelectorAll('.workspace-tab').forEach(btn => btn.addEventListener('click',()=>setMode(btn.dataset.mode)));
document.querySelectorAll('.tool-button').forEach(btn => btn.addEventListener('click',()=>setTool(btn.dataset.tool)));
document.querySelector('#randomizeBtn').addEventListener('click',()=>{ const mode = store.get('mode'); if (mode === 'city') store.randomizeSeed('city'); else store.randomizeSeed(); renderCurrent(); });
document.querySelector('#saveBtn').addEventListener('click',()=>{ const blob = new Blob([store.serialize()], { type:'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`engine-person-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url); });
document.querySelector('#openProject').addEventListener('change', async event => { const file = event.target.files?.[0]; if (!file) return; try { const data = JSON.parse(await file.text()); store.replace(data); setMode(store.get('mode') ?? 'human'); setTool(store.get('activeTool') ?? 'shape'); } catch (err) { alert(`Projeto inválido: ${err.message}`); } finally { event.target.value=''; } });
document.querySelector('#resetCameraBtn').addEventListener('click',()=>runtime.frame(store.get('mode')));
document.querySelector('#toggleGridBtn').addEventListener('click',()=>{ store.set('environment.grid', !store.get('environment.grid')); runtime.applyEnvironment(store.state.environment); });
document.querySelector('#toggleAutoRotateBtn').addEventListener('click',()=>store.set('environment.autoRotate', !store.get('environment.autoRotate')));
document.querySelector('#collapseInspector').addEventListener('click',()=>document.querySelector('#inspector').classList.toggle('collapsed'));
window.addEventListener('keydown',event=>{ if (event.key.toLowerCase()==='f') runtime.frame(store.get('mode')); if (event.key.toLowerCase()==='g') { store.set('environment.grid', !store.get('environment.grid')); runtime.applyEnvironment(store.state.environment); } });
inspector.render(); renderCurrent();
