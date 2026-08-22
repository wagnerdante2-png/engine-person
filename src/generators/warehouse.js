import * as THREE from 'three';
import { mulberry32 } from '../core/state.js';

const mat=(color,roughness=.82,metalness=.04)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const BLUE='#185fb5';
const BLUE_DARK='#0f3f7a';
const BEAM='#2877d4';
const STEEL='#6f7b87';
const WOOD='#8a5a32';
const FLOOR='#303840';
const SAFETY='#e6b92f';
const BOXES=['#b98a58','#8f6a48','#c49a6c','#a9794f','#d1aa78','#7d644e'];

function box(w,h,d,material,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;}

function createPallet(rand,width,depth,loadHeight,fill){
  const g=new THREE.Group();
  const wood=mat(WOOD,.96), darkWood=mat('#654326',.98);
  const deckH=.07, palletH=.15;
  for(let i=-1;i<=1;i++) g.add(box(width*.94,deckH,depth*.16,wood,0,.11,i*depth*.31));
  for(let i=-1;i<=1;i++) g.add(box(width*.15,.09,depth*.88,darkWood,i*width*.33,.045,0));
  if(rand()>fill){g.userData.empty=true;return g;}
  const layers=Math.max(1,Math.floor(2+rand()*4));
  const cols=rand()<.6?3:2, rows=rand()<.55?2:1;
  const gap=.025, usableW=width*.88, usableD=depth*.86;
  const bw=(usableW-gap*(cols-1))/cols, bd=(usableD-gap*(rows-1))/rows;
  const bh=Math.max(.13,(loadHeight-palletH)/layers*.90);
  for(let l=0;l<layers;l++){
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        if(rand()<.08) continue;
        const material=mat(BOXES[Math.floor(rand()*BOXES.length)],.92);
        const px=-usableW/2+bw/2+c*(bw+gap), pz=-usableD/2+bd/2+r*(bd+gap);
        const carton=box(bw*.96,bh,bd*.96,material,px,palletH+bh/2+l*bh,pz);
        g.add(carton);
      }
    }
  }
  g.userData.empty=false;
  return g;
}

function createRackRow(config,rowIndex,rand){
  const g=new THREE.Group();
  const uprightMat=mat(BLUE,.62,.34), beamMat=mat(BEAM,.58,.30), footMat=mat(BLUE_DARK,.68,.28), braceMat=mat(STEEL,.65,.34);
  const { bays, levels, bayWidth, rackDepth, levelHeight, occupancy }=config;
  const totalW=bays*bayWidth;
  const uprightH=levels*levelHeight+.48;
  const post=.10;
  for(let b=0;b<=bays;b++){
    const x=-totalW/2+b*bayWidth;
    for(const z of[-rackDepth/2,rackDepth/2]){
      g.add(box(post,uprightH,post,uprightMat,x,uprightH/2,z));
      g.add(box(.26,.055,.26,footMat,x,.028,z));
    }
    if(b<bays){
      const nx=x+bayWidth;
      for(let l=0;l<levels;l++){
        const y=.34+(l+1)*levelHeight;
        for(const z of[-rackDepth/2,rackDepth/2]) g.add(box(bayWidth-.08,.10,.09,beamMat,(x+nx)/2,y,z));
      }
    }
    if(b<bays){
      const braceY=uprightH*.48;
      for(const z of[-rackDepth/2,rackDepth/2]){
        const brace=new THREE.Mesh(new THREE.BoxGeometry(.035,uprightH*.80,.035),braceMat);
        brace.position.set(x+bayWidth*.02,braceY,z);
        brace.rotation.z=Math.PI*.16;
        g.add(brace);
      }
    }
  }
  let palletCount=0, occupied=0;
  const palletW=bayWidth*.42, palletD=rackDepth*.80;
  for(let b=0;b<bays;b++){
    const bx=-totalW/2+(b+.5)*bayWidth;
    for(let l=0;l<levels;l++){
      const shelfY=.39+l*levelHeight;
      for(const slot of[-1,1]){
        const seed=(config.seed+rowIndex*7919+b*3571+l*1171+(slot+2)*97)>>>0;
        const r=mulberry32(seed);
        const pallet=createPallet(r,palletW,palletD,levelHeight*.76,occupancy);
        pallet.position.set(bx+slot*bayWidth*.235,shelfY,0);
        g.add(pallet); palletCount++; if(!pallet.userData.empty)occupied++;
      }
    }
  }
  g.userData={palletCount,occupied};
  return g;
}

function addFloorMarkings(root,width,depth,aisleWidth,rows){
  const floor=box(width,.08,depth,mat(FLOOR,.96),0,.02,0); root.add(floor);
  const lineMat=mat(SAFETY,.72), white=mat('#d9dde2',.74);
  const edgeX=width/2-.45;
  for(const x of[-edgeX,edgeX]) root.add(box(.055,.012,depth*.92,lineMat,x,.071,0));
  const pitch=depth/Math.max(1,rows);
  for(let r=0;r<rows-1;r++){
    const z=-depth/2+(r+1)*pitch;
    root.add(box(width*.94,.012,.045,white,0,.072,z));
  }
  const dockZ=depth/2-.55;
  for(let i=0;i<6;i++) root.add(box(.10,.013,.75,lineMat,-1.5+i*.6,.073,dockZ));
}

function createForklift(){
  const g=new THREE.Group();
  const yellow=mat('#d6a31c',.55,.18), black=mat('#171a1d',.86), steel=mat('#53606d',.50,.45);
  g.add(box(.64,.42,.86,yellow,0,.25,0));
  g.add(box(.46,.46,.48,yellow,0,.63,-.10));
  for(const sx of[-1,1]) for(const sz of[-1,1]){
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.10,16),black);
    wheel.rotation.z=Math.PI/2; wheel.position.set(sx*.35,.14,sz*.30); g.add(wheel);
  }
  for(const x of[-.24,.24]) g.add(box(.055,1.18,.055,steel,x,.72,.43));
  for(const x of[-.18,.18]) g.add(box(.075,.055,.88,steel,x,.18,.78));
  return g;
}

export function generateWarehouse(c){
  const root=new THREE.Group(); root.name='ProceduralWarehouse';
  const rand=mulberry32(c.seed??314159);
  const rows=Math.max(2,Math.round(c.rows??5)), bays=Math.max(2,Math.round(c.bays??7)), levels=Math.max(1,Math.round(c.levels??4));
  const bayWidth=c.bayWidth??1.55, rackDepth=c.rackDepth??1.08, levelHeight=c.levelHeight??1.05, aisleWidth=c.aisleWidth??2.45;
  const rowPitch=rackDepth+aisleWidth;
  const width=bays*bayWidth+2.2, depth=rows*rackDepth+(rows-1)*aisleWidth+3.0;
  addFloorMarkings(root,width,depth,aisleWidth,rows);
  let palletPositions=0, occupiedPositions=0;
  for(let r=0;r<rows;r++){
    const rack=createRackRow({ ...c,bays,levels,bayWidth,rackDepth,levelHeight,seed:c.seed??314159 },r,rand);
    rack.position.z=-(rows-1)*rowPitch/2+r*rowPitch;
    root.add(rack);
    palletPositions+=rack.userData.palletCount; occupiedPositions+=rack.userData.occupied;
    const id=box(.52,.24,.025,mat('#e9eef4',.72),-width/2+.36,levels*levelHeight+.10,rack.position.z-rackDepth/2-.03);
    id.userData.label=`R${String(r+1).padStart(2,'0')}`; root.add(id);
  }
  if(c.showForklifts!==false){
    const forklifts=Math.max(1,Math.round(c.forklifts??2));
    for(let i=0;i<forklifts;i++){
      const f=createForklift();
      const aisle=Math.min(rows-2,Math.floor(rand()*Math.max(1,rows-1)));
      f.position.set((rand()-.5)*width*.60,0,-(rows-1)*rowPitch/2+(aisle+.5)*rowPitch);
      f.rotation.y=rand()>.5?Math.PI/2:-Math.PI/2; root.add(f);
    }
  }
  root.userData.stats={
    mode:'procedural-warehouse-v1', rows,bays,levels,
    rackModules:rows*bays,
    palletPositions, occupiedPositions,
    occupancy:palletPositions?occupiedPositions/palletPositions:0,
    aisles:Math.max(1,rows-1), forklifts:c.showForklifts===false?0:Math.max(1,Math.round(c.forklifts??2)),
    width,depth
  };
  return root;
}
