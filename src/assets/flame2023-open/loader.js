const BASE=new URL('./data/',import.meta.url);
let cache=null;
let loading=null;

async function loadBuffer(file){
  const response=await fetch(new URL(file,BASE));
  if(!response.ok)throw new Error(`FLAME asset ${file}: HTTP ${response.status}`);
  return response.arrayBuffer();
}

function f32(buffer){return new Float32Array(buffer);}
function u16(buffer){return new Uint16Array(buffer);}
function i32(buffer){return new Int32Array(buffer);}

export async function preloadFlameOpen({loadShapeSpace=true}={}){
  if(cache)return cache;
  if(loading)return loading;
  loading=(async()=>{
    const manifestResponse=await fetch(new URL('manifest.json',BASE));
    if(!manifestResponse.ok)throw new Error(`FLAME manifest missing: HTTP ${manifestResponse.status}`);
    const manifest=await manifestResponse.json();
    if(manifest.vertexCount!==5023||manifest.faceCount!==9976)throw new Error('Unexpected FLAME2023_Open topology');

    const [vbuf,fbuf,wbuf,jbuf,rbuf,kbuf,pbuf]=await Promise.all([
      loadBuffer('v_template.f32'),loadBuffer('faces.u16'),loadBuffer('weights.f32'),
      loadBuffer('joints.f32'),loadBuffer('j_regressor.f32'),loadBuffer('kintree.i32'),
      loadBuffer('posedirs.f32')
    ]);

    const data={
      manifest,
      vTemplate:f32(vbuf),
      faces:u16(fbuf),
      weights:f32(wbuf),
      joints:f32(jbuf),
      jRegressor:f32(rbuf),
      kintree:i32(kbuf),
      poseDirs:f32(pbuf),
      shapeChunks:[]
    };

    if(loadShapeSpace){
      data.shapeChunks=await Promise.all(manifest.shapeChunks.map(async chunk=>({
        ...chunk,
        data:f32(await loadBuffer(chunk.file))
      })));
    }
    cache=data;
    return data;
  })();
  try{return await loading;}finally{loading=null;}
}

export function getFlameOpen(){
  if(!cache)throw new Error('FLAME2023_Open assets have not been preloaded');
  return cache;
}

export function hasFlameOpen(){return !!cache;}

export function applyFlameCoefficients({identity=[],expression=[]}={}){
  const flame=getFlameOpen();
  const V=flame.manifest.vertexCount;
  const result=new Float32Array(flame.vTemplate);
  const coeff=new Float32Array(400);
  for(let i=0;i<Math.min(300,identity.length);i++)coeff[i]=identity[i]||0;
  for(let i=0;i<Math.min(100,expression.length);i++)coeff[300+i]=expression[i]||0;
  for(const chunk of flame.shapeChunks){
    const C=chunk.count,start=chunk.start,d=chunk.data;
    for(let v=0;v<V;v++){
      for(let axis=0;axis<3;axis++){
        const base=(v*3+axis)*C;
        let delta=0;
        for(let c=0;c<C;c++){
          const k=coeff[start+c];
          if(k)delta+=d[base+c]*k;
        }
        result[v*3+axis]+=delta;
      }
    }
  }
  return result;
}
