const BASE = new URL('./', import.meta.url);

async function fetchJson(name) {
  const response = await fetch(new URL(name, BASE));
  if (!response.ok) throw new Error(`FLAME asset ${name}: HTTP ${response.status}`);
  return response.json();
}

async function fetchTyped(name, Type, expectedLength) {
  const response = await fetch(new URL(name, BASE));
  if (!response.ok) throw new Error(`FLAME asset ${name}: HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  const value = new Type(buffer);
  if (expectedLength != null && value.length !== expectedLength) {
    throw new Error(`FLAME asset ${name}: expected ${expectedLength} values, got ${value.length}`);
  }
  return value;
}

let runtimePromise;
let runtimeCache;

export function loadFlame2023OpenCore() {
  if (runtimeCache) return Promise.resolve(runtimeCache);
  if (runtimePromise) return runtimePromise;
  runtimePromise = (async () => {
    const metadata = await fetchJson('metadata.json');
    if (metadata.vertexCount !== 5023 || metadata.faceCount !== 9976) {
      throw new Error(`Unexpected FLAME topology ${metadata.vertexCount}/${metadata.faceCount}`);
    }
    const [positions, indices, joints] = await Promise.all([
      fetchTyped('template.f32', Float32Array, metadata.vertexCount * 3),
      fetchTyped('faces.u32', Uint32Array, metadata.faceCount * 3),
      fetchTyped('joints.f32', Float32Array, metadata.jointCount * 3),
    ]);
    runtimeCache = { metadata, positions, indices, joints, shapeChunks: new Map(), poseDirs: null, weights: null, jRegressor: null, kintree: null };
    return runtimeCache;
  })();
  return runtimePromise;
}

export function getFlame2023OpenCore() {
  if (!runtimeCache) throw new Error('FLAME2023_Open core has not been loaded yet');
  return runtimeCache;
}

export async function loadFlameShapeChunk(component) {
  const runtime = await loadFlame2023OpenCore();
  const size = runtime.metadata.shapeChunkSize || 10;
  const start = Math.floor(component / size) * size;
  const end = Math.min(start + size, runtime.metadata.shapeComponents) - 1;
  const key = `${start}-${end}`;
  if (runtime.shapeChunks.has(key)) return runtime.shapeChunks.get(key);
  const name = `shapedirs-${String(start).padStart(3, '0')}-${String(end).padStart(3, '0')}.f32`;
  const values = await fetchTyped(name, Float32Array, runtime.metadata.vertexCount * 3 * (end - start + 1));
  const chunk = { start, end, values };
  runtime.shapeChunks.set(key, chunk);
  return chunk;
}

export async function loadFlameRigData() {
  const runtime = await loadFlame2023OpenCore();
  const m = runtime.metadata;
  if (!runtime.poseDirs) runtime.poseDirs = await fetchTyped('posedirs.f32', Float32Array, m.vertexCount * 3 * m.posedirsComponents);
  if (!runtime.weights) runtime.weights = await fetchTyped('weights.f32', Float32Array, m.vertexCount * m.jointCount);
  if (!runtime.jRegressor) runtime.jRegressor = await fetchTyped('j_regressor.f32', Float32Array, m.jRegressorShape[0] * m.jRegressorShape[1]);
  if (!runtime.kintree) runtime.kintree = await fetchTyped('kintree.u32', Uint32Array, m.kintreeShape[0] * m.kintreeShape[1]);
  return runtime;
}
