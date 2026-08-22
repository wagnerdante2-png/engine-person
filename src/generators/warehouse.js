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

function roundedRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

function createPositionLabel(text,occupied=true){
  const canvas=document.createElement('canvas');
  canvas.width=320; canvas.height=112;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const glow=occupied?'rgba(90,229,255,.36)':'rgba(130,155,175,.20)';
  const edge=occupied?'rgba(93,225,255,.82)':'rgba(124,151,171,.58)';
  const textColor=occupied?'#c9f7ff':'#b8c7d4';

  ctx.shadowColor=glow; ctx.shadowBlur=14;
  roundedRect(ctx,10,10,300,92,14);
  ctx.fillStyle='rgba(6,16,25,.94)'; ctx.fill();
  ctx.shadowBlur=0;
  ctx.lineWidth=2; ctx.strokeStyle=edge; ctx.stroke();

  ctx.fillStyle='rgba(255,255,255,.03)';
  roundedRect(ctx,18,18,284,76,10); ctx.fill();

  ctx.lineWidth=1.4; ctx.strokeStyle=occupied?'rgba(89,221,255,.34)':'rgba(135,160,179,.18)';
  ctx.beginPath();
  ctx.moveTo(26,76); ctx.lineTo(54,76); ctx.lineTo(71,57); ctx.lineTo(92,57);
  ctx.moveTo(228,56); ctx.lineTo(247,56); ctx.lineTo(262,38); ctx.lineTo(292,38);
  ctx.moveTo(228,77); ctx.lineTo(260,77); ctx.lineTo(275,63); ctx.lineTo(294,63);
  ctx.stroke();

  const nodes=[[54,76],[71,57],[247,56],[262,38],[260,77],[275,63]];
  ctx.fillStyle=occupied?'rgba(112,235,255,.88)':'rgba(150,171,188,.45)';
  for(const [x,y] of nodes){ctx.beginPath();ctx.arc(x,y,2.7,0,Math.PI*2);ctx.fill();}

  ctx.font='600 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillStyle=occupied?'rgba(117,231,250,.66)':'rgba(158,177,191,.50)';
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText('NODE',26,34);
  ctx.textAlign='right'; ctx.fillText(occupied?'LIVE':'IDLE',294,88);

  ctx.shadowColor=occupied?'rgba(87,231,255,.55)':'transparent'; ctx.shadowBlur=8;
  ctx.fillStyle=textColor;
  ctx.font='700 42px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(text,160,58);
  ctx.shadowBlur=0;

  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace; texture.generateMipmaps=false; texture.minFilter=THREE.LinearFilter;
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false,opacity:.92});
  const sprite=new THREE.Sprite(material);
  sprite.scale.set(.66,.235,1); sprite.renderOrder=4;
  sprite.userData.positionCode=text;
  sprite.userData.baseOpacity=occupied?.92:.78;
  sprite.userData.phase=(parseInt(text.replace(/\D/g,''),10)||0)*.37;
  sprite.userData.isPositionLabel=true;
  return sprite;
}

function createPallet(rand,width,depth,loadHeight,fill){const g=new THREE.Group();const wood=mat(WOOD,.96),darkWood=mat('#654326',.98);const deckH=.07,palletH=.15;for(let i=-1;i<=1;i++)g.add(box(width*.94,deckH,depth*.16,wood,0,.11,i*depth*.31));for(let i=-1;i<=1;i++)g.add(box(width*.15,.09,depth*.88,darkWood,i*width*.33,.045,0));if(rand()>fill){g.userData.empty=true;return g;}const layers=Math.max(1,Math.floor(2+rand()*4));const cols=rand()<.6?3:2,rows=rand()<.55?2:1;const gap=.025,usableW=width*.88,usableD=depth*.86;const bw=(usableW-gap*(cols-1))/cols,bd=(usableD-gap*(rows-1))/rows;const bh=Math.max(.13,(loadHeight-palletH)/layers*.90);for(let l=0;l<layers;l++)for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){if(rand()<.08)continue;const material=mat(BOXES[Math.floor(rand()*BOXES.length)],.92);const px=-usableW/2+bw/2+c*(bw+gap),pz=-usableD/2+bd/2+r*(bd+gap);g.add(box(bw*.96,bh,bd*.96,material,px,palletH+bh/2+l*bh,pz));}g.userData.empty=false;return g;}

function createRackRow(config,rowIndex,positionStart=1){
  const g=new THREE.Group();
  const uprightMat=mat(BLUE,.62,.34),beamMat=mat(BEAM,.58,.30),footMat=mat(BLUE_DARK,.68,.28),braceMat=mat(STEEL,.65,.34);
  const{bays,levels,bayWidth,rackDepth,levelHeight,occupancy}=config;
  const totalW=bays*bayWidth,uprightH=levels*levelHeight+.48,post=.10;
  for(let b=0;b<=bays;b++){
    const x=-totalW/2+b*bayWidth;
    for(const z of[-rackDepth/2,rackDepth/2]){g.add(box(post,uprightH,post,uprightMat,x,uprightH/2,z));g.add(box(.26,.055,.26,footMat,x,.028,z));}
    if(b<bays){
      const nx=x+bayWidth;
      for(let l=0;l<levels;l++){const y=.34+(l+1)*levelHeight;for(const z of[-rackDepth/2,rackDepth/2])g.add(box(bayWidth-.08,.10,.09,beamMat,(x+nx)/2,y,z));}
      const braceY=uprightH*.48;
      for(const z of[-rackDepth/2,rackDepth/2]){const brace=new THREE.Mesh(new THREE.BoxGeometry(.035,uprightH*.80,.035),braceMat);brace.position.set(x+bayWidth*.02,braceY,z);brace.rotation.z=Math.PI*.16;g.add(brace);}
    }
  }

  let palletCount=0,occupied=0,positionNumber=positionStart;
  const palletW=bayWidth*.42,palletD=rackDepth*.80;
  const positionCodes=[];
  for(let b=0;b<bays;b++){
    const bx=-totalW/2+(b+.5)*bayWidth;
    for(let l=0;l<levels;l++){
      const shelfY=.39+l*levelHeight;
      for(const slot of[-1,1]){
        const seed=(config.seed+rowIndex*7919+b*3571+l*1171+(slot+2)*97)>>>0;
        const r=mulberry32(seed);
        const pallet=createPallet(r,palletW,palletD,levelHeight*.76,occupancy);
        const px=bx+slot*bayWidth*.235;
        pallet.position.set(px,shelfY,0);
        const code=`P${String(positionNumber).padStart(4,'0')}`;
        pallet.userData.positionCode=code;
        pallet.userData.address={rack:rowIndex+1,bay:b+1,level:l+1,slot:slot<0?1:2};
        g.add(pallet);
        if(config.showPositionLabels!==false){
          const label=createPositionLabel(code,!pallet.userData.empty);
          label.position.set(px,shelfY+.28,rackDepth/2+.085);
          label.userData.address=pallet.userData.address;
          g.add(label);
        }
        positionCodes.push(code);
        palletCount++; if(!pallet.userData.empty)occupied++;
        positionNumber++;
      }
    }
  }
  g.userData={palletCount,occupied,positionCodes,nextPositionNumber:positionNumber};
  return g;
}

function addFloorMarkings(root,width,depth,rows){const floor=box(width,.08,depth,mat(FLOOR,.96),0,.02,0);root.add(floor);const lineMat=mat(SAFETY,.72),white=mat('#d9dde2',.74);const edgeX=width/2-.45;for(const x of[-edgeX,edgeX])root.add(box(.055,.012,depth*.92,lineMat,x,.071,0));const pitch=depth/Math.max(1,rows);for(let r=0;r<rows-1;r++){const z=-depth/2+(r+1)*pitch;root.add(box(width*.94,.012,.045,white,0,.072,z));}const dockZ=depth/2-.55;for(let i=0;i<6;i++)root.add(box(.10,.013,.75,lineMat,-1.5+i*.6,.073,dockZ));}

function createForklift(){const g=new THREE.Group();const yellow=mat('#d6a31c',.55,.18),black=mat('#171a1d',.86),steel=mat('#53606d',.50,.45);g.add(box(.64,.42,.86,yellow,0,.25,0));g.add(box(.46,.46,.48,yellow,0,.63,-.10));for(const sx of[-1,1])for(const sz of[-1,1]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.10,16),black);wheel.rotation.z=Math.PI/2;wheel.position.set(sx*.35,.14,sz*.30);g.add(wheel);}for(const x of[-.24,.24])g.add(box(.055,1.18,.055,steel,x,.72,.43));for(const x of[-.18,.18])g.add(box(.075,.055,.88,steel,x,.18,.78));return g;}

function getAisleCenters(rackCenters,rackDepth){const sorted=[...rackCenters].sort((a,b)=>a-b),centers=[];for(let i=0;i<sorted.length-1;i++){const clearGap=sorted[i+1]-sorted[i]-rackDepth;if(clearGap>rackDepth*.35)centers.push((sorted[i]+sorted[i+1])/2);}return centers;}

export function generateWarehouse(c){
  const root=new THREE.Group();root.name='ProceduralWarehouse';
  const requestedRows=Math.max(1,Math.round(c.rows??5));
  const rows=Math.max(2,requestedRows),bays=Math.max(1,Math.round(c.bays??7)),levels=Math.max(1,Math.round(c.levels??4));
  const rackType=c.rackType==='double'?'double':'unitary';
  const bayWidth=c.bayWidth??1.55,rackDepth=c.rackDepth??1.08,levelHeight=c.levelHeight??1.05,aisleWidth=c.aisleWidth??2.45;
  const rowPitch=rackDepth+aisleWidth,doubleOffset=rackDepth*.98,width=bays*bayWidth+2.2,baseDepth=rows*rackDepth+(rows-1)*aisleWidth+3.0,depth=baseDepth+(rackType==='double'?rackDepth*2:0);
  addFloorMarkings(root,width,depth,rows);
  let palletPositions=0,occupiedPositions=0,physicalRackRows=0,nextPositionNumber=1;
  const rackCenters=[];
  const addRack=(z,rowIndex,labelIndex)=>{
    const rack=createRackRow({...c,bays,levels,bayWidth,rackDepth,levelHeight,seed:c.seed??314159},rowIndex,nextPositionNumber);
    nextPositionNumber=rack.userData.nextPositionNumber;
    rack.position.z=z; root.add(rack); rackCenters.push(z); physicalRackRows++;
    palletPositions+=rack.userData.palletCount; occupiedPositions+=rack.userData.occupied;
    const id=box(.52,.24,.025,mat('#e9eef4',.72),-width/2+.36,levels*levelHeight+.10,z-rackDepth/2-.03); id.userData.label=`R${String(labelIndex).padStart(2,'0')}`; root.add(id);
  };
  for(let r=0;r<rows;r++){
    const z=-(rows-1)*rowPitch/2+r*rowPitch;
    addRack(z,r*2+1,r+1);
    if(rackType==='double'){
      const direction=z<0?-1:z>0?1:(r<rows/2?-1:1);
      addRack(z+direction*doubleOffset,r*2+2,`${r+1}B`);
    }
  }
  const aisleCenters=getAisleCenters(rackCenters,rackDepth);
  const requestedForklifts=Math.max(0,Math.min(6,Math.round(c.forklifts??0)));
  const forkliftCount=c.showForklifts===false?0:requestedForklifts;
  for(let i=0;i<forkliftCount;i++){
    const f=createForklift();
    const aisleZ=aisleCenters.length?aisleCenters[i%aisleCenters.length]:0;
    const sameAisleIndex=Math.floor(i/Math.max(1,aisleCenters.length));
    const sameAisleCount=Math.ceil(forkliftCount/Math.max(1,aisleCenters.length));
    const usableLength=Math.max(1.2,width-2.2);
    const x=sameAisleCount===1?0:-usableLength*.30+(sameAisleIndex/Math.max(1,sameAisleCount-1))*usableLength*.60;
    f.position.set(x,0,aisleZ); f.rotation.y=Math.PI/2; root.add(f);
  }

  const animatedLabels=[];
  if(c.showPositionLabels!==false){
    root.traverse(obj=>{if(obj.userData?.isPositionLabel)animatedLabels.push(obj);});
  }
  root.userData.update=(elapsed)=>{
    for(const label of animatedLabels){
      const base=label.userData.baseOpacity??.88;
      label.material.opacity=THREE.MathUtils.clamp(base+Math.sin(elapsed*1.35+(label.userData.phase??0))*.035,.62,.98);
    }
  };
  root.userData.stats={mode:'procedural-warehouse-v5',rackType,requestedRows,rows,physicalRackRows,bays,levels,rackModules:physicalRackRows*bays,palletPositions,occupiedPositions,numberedPositions:palletPositions,positionLabelsVisible:c.showPositionLabels!==false,occupancy:palletPositions?occupiedPositions/palletPositions:0,aisles:Math.max(1,aisleCenters.length),forklifts:forkliftCount,width,depth};
  return root;
}
