import { mulberry32 } from '../core/state.js';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function weightedZone(rand,mix,era){ if(era==='medieval'){const r=rand(); if(r<mix*.30)return'market'; if(r<.62)return'residential'; return'craft';} const r=rand(),commercial=clamp(mix,0,1)*.42,mixed=.22+clamp(mix,0,1)*.18; if(r<commercial)return'commercial'; if(r<commercial+mixed)return'mixed'; return'residential'; }
function splitParcel(rand,block,subdivision){ const parcels=[]; const baseCount=subdivision<.34?1:subdivision<.72?2:4; const count=rand()<subdivision*.35?Math.min(4,baseCount+1):baseCount; const gap=block.size*.025; if(count===1){parcels.push({x:block.x,z:block.z,w:block.size-gap*2,d:block.size-gap*2});return parcels;} if(count===2){const vertical=rand()>.5,ratio=.44+rand()*.12;if(vertical){const w1=block.size*ratio-gap*1.5,w2=block.size*(1-ratio)-gap*1.5;parcels.push({x:block.x-block.size*(1-ratio)/2,z:block.z,w:w1,d:block.size-gap*2});parcels.push({x:block.x+block.size*ratio/2,z:block.z,w:w2,d:block.size-gap*2});}else{const d1=block.size*ratio-gap*1.5,d2=block.size*(1-ratio)-gap*1.5;parcels.push({x:block.x,z:block.z-block.size*(1-ratio)/2,w:block.size-gap*2,d:d1});parcels.push({x:block.x,z:block.z+block.size*ratio/2,w:block.size-gap*2,d:d2});}return parcels;} const cell=block.size/2;for(const dx of[-.25,.25])for(const dz of[-.25,.25])parcels.push({x:block.x+dx*block.size,z:block.z+dz*block.size,w:cell-gap*1.5,d:cell-gap*1.5});return parcels; }
export function generateUrbanPlan(c){
  const rand=mulberry32(c.seed),era=c.era??'modern',medieval=era==='medieval',organic=clamp(c.organicLayout??0,0,1);
  const blockPitch=medieval?2.15:2.6, roadWidth=blockPitch*c.streetWidth*(medieval?.72:1), blockSize=blockPitch-roadWidth;
  const blocks=[],roads=[],parcels=[]; const totalW=c.blocksX*blockPitch,totalD=c.blocksZ*blockPitch;
  for(let i=0;i<=c.blocksX;i++){const base=(i-c.blocksX/2)*blockPitch,jitter=(rand()-.5)*blockPitch*.28*organic;const x=base+jitter;const hierarchy=medieval?(i===Math.floor(c.blocksX/2)?'market':'lane'):(i===Math.floor(c.blocksX/2)?'arterial':(i%3===0?'collector':'local'));roads.push({axis:'z',x,z:0,length:totalD+blockPitch,width:roadWidth*(hierarchy==='arterial'?1.35:hierarchy==='collector'?1.12:hierarchy==='market'?1.55:1),hierarchy,era});}
  for(let i=0;i<=c.blocksZ;i++){const base=(i-c.blocksZ/2)*blockPitch,jitter=(rand()-.5)*blockPitch*.28*organic;const z=base+jitter;const hierarchy=medieval?(i===Math.floor(c.blocksZ/2)?'market':'lane'):(i===Math.floor(c.blocksZ/2)?'arterial':(i%3===0?'collector':'local'));roads.push({axis:'x',x:0,z,length:totalW+blockPitch,width:roadWidth*(hierarchy==='arterial'?1.35:hierarchy==='collector'?1.12:hierarchy==='market'?1.55:1),hierarchy,era});}
  for(let gx=0;gx<c.blocksX;gx++)for(let gz=0;gz<c.blocksZ;gz++){
    const baseX=(gx-(c.blocksX-1)/2)*blockPitch,baseZ=(gz-(c.blocksZ-1)/2)*blockPitch;
    const jx=(rand()-.5)*blockPitch*.22*organic,jz=(rand()-.5)*blockPitch*.22*organic;
    const x=baseX+jx,z=baseZ+jz,centerDist=Math.hypot(x/Math.max(1,totalW*.5),z/Math.max(1,totalD*.5)),centerFactor=clamp(1-centerDist,0,1);
    const isPark=rand()<c.greenRatio*(medieval?.70:1.15-centerFactor*.35); const isMarket=medieval&&!isPark&&rand()<(c.marketRatio??.18)*(.55+centerFactor*.9);
    const block={id:`b-${gx}-${gz}`,gx,gz,x,z,size:blockSize,isPark,isMarket,centerFactor,rotation:(rand()-.5)*organic*.18};blocks.push(block);if(isPark||isMarket)continue;
    const localParcels=splitParcel(rand,block,c.parcelSubdivision);localParcels.forEach((parcel,index)=>{
      const zone=weightedZone(rand,c.commercialMix+centerFactor*.22,era),occupancy=clamp(c.density*(.72+centerFactor*.52)*(.82+rand()*.28),.12,1);
      const floorBoost=medieval?(zone==='market'?1.05:.82):(zone==='commercial'?1.25:zone==='mixed'?1.12:.92);
      const minFloors=Math.max(1,Math.round(c.minFloors*(medieval?.65:.72+centerFactor*.40)));
      const maxBase=medieval?Math.min(5,c.maxFloors):c.maxFloors; const maxFloors=Math.max(minFloors,Math.round(maxBase*(medieval?.72+.28*centerFactor:.55+centerFactor*.70)*floorBoost));
      parcels.push({...parcel,x:parcel.x+jx*.35,z:parcel.z+jz*.35,id:`${block.id}-p${index}`,blockId:block.id,zone,occupancy,minFloors,maxFloors,centerFactor,seed:Math.floor(rand()*1e9),rotation:block.rotation+(rand()-.5)*organic*.22,era});
    });
  }
  return{blockPitch,roadWidth,blockSize,totalW,totalD,roads,blocks,parcels,era};
}
