// FLAME2023_Open derived runtime head mesh (full template)
// Source: Max Planck Institute for Intelligent Systems / FLAME.
// License: CC BY 4.0. See docs/THIRD_PARTY.md.
const POS_B64='__POS__';
const IDX_B64='__IDX__';
const JNT_B64='__JNT__';
const V=5023,F=9976;
function bytes(b64){const s=atob(b64);const out=new Uint8Array(s.length);for(let i=0;i<s.length;i++)out[i]=s.charCodeAt(i);return out;}
function f32(b64){const b=bytes(b64);return new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));}
function u16(b64){const b=bytes(b64);return new Uint16Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));}
function decode(){return{positions:f32(POS_B64),indices:u16(IDX_B64),joints:f32(JNT_B64)}}
export const FLAME_OPEN={version:'FLAME2023_Open',vertexCount:V,faceCount:F,bounds:{min:[-0.10978439,-0.18724248,-0.15323225],max:[0.10776618,0.13212053,0.07508866]},decode};".replace("__POS__