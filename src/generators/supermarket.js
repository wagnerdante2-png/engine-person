import * as THREE from 'three';
import { mulberry32 } from '../core/state.js';

const mat=(color,roughness=.82,metalness=.04,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
const WHITE='#d8dde3', DARK='#171b22', BASE='#262d36', FLOOR='#d9dde2';
const PRODUCT_COLORS=['#e23d3d','#f2b632','#2d8bd7','#41a85f','#f06c35','#8b5fc7','#df4f9a','#2eb3a8','#e8e8e8','#5d6672'];
const SECTOR_COLORS={sales:'#cfe6ff',checkout:'#ffd9a8',stock:'#d8d1ff',parking:'#c9d0d6',service:'#cfead8',office:'#ffe7b8',receiving:'#d6e1c3',custom:'#d9dde2'};
function box(w,h,d,m,x=0,y=0,z=0){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o;}

function addProducts(g,rand,width,depth,y,side,fill=.78){const count=Math.max(2,Math.floor(width/.17)),z=side*(depth*.50+.035);for(let i=0;i<count;i++){if(rand()>fill)continue;const w=Math.min(.14,width/count*.72),h=.18+rand()*.18,d=.10+rand()*.05,x=-width/2+(i+.5)*(width/count),m=mat(PRODUCT_COLORS[Math.floor(rand()*PRODUCT_COLORS.length)],.72);let p;if(rand()<.18){p=new THREE.Mesh(new THREE.CylinderGeometry(w*.35,w*.35,h,10),m);p.position.set(x,y+h/2,z);}else p=box(w,h,d,m,x,y+h/2,z);g.add(p);}}
function createModule(c,rand){const g=new THREE.Group(),w=c.moduleWidth,d=c.depth,h=c.height,shelves=c.shelves,frame=mat(DARK,.66,.20),shelf=mat(WHITE,.76,.06),back=mat('#b9c1ca',.88),base=mat(BASE,.86);g.add(box(w,.12,d,base,0,.06,0),box(w,.035,.035,frame,0,h-.04,0));for(const sx of[-1,1])g.add(box(.045,h,.045,frame,sx*(w/2-.025),h/2,0));if(c.backPanel)g.add(box(w*.98,h*.92,.035,back,0,h*.49,0));const step=(h-.28)/Math.max(1,shelves);for(let s=0;s<shelves;s++){const y=.18+s*step;g.add(box(w*.96,.035,d*.92,shelf,0,y,0));addProducts(g,rand,w*.90,d*.42,y+.025,1,c.productFill);if(c.doubleSided)addProducts(g,rand,w*.90,d*.42,y+.025,-1,c.productFill);}return g;}
function createGondola(c,rowIndex){const g=new THREE.Group(),rand=mulberry32((c.seed??246810)+rowIndex*104729),total=c.modules*c.moduleWidth;for(let m=0;m<c.modules;m++){const mod=createModule(c,rand);mod.position.x=-total/2+(m+.5)*c.moduleWidth;g.add(mod);}if(c.endcaps)for(const side of[-1,1]){const end=createModule({...c,moduleWidth:c.depth*1.25,depth:c.moduleWidth*.72,doubleSided:false,backPanel:true},rand);end.rotation.y=Math.PI/2;end.position.x=side*(total/2+c.depth*.34);g.add(end);}g.userData={modules:c.modules,endcaps:c.endcaps?2:0};return g;}
function createWallRun(c,side){const g=new THREE.Group(),rand=mulberry32((c.seed??246810)+(side>0?7717:9917)),total=c.modules*c.moduleWidth;for(let m=0;m<c.modules;m++){const mod=createModule({...c,doubleSided:false,depth:c.depth*.82},rand);mod.position.x=-total/2+(m+.5)*c.moduleWidth;mod.position.z=side*c.storeDepth*.44;mod.rotation.y=side>0?Math.PI:0;g.add(mod);}return g;}
function createPromoTable(rand){const g=new THREE.Group(),base=mat('#b8bdc5',.78,.08),trim=mat(DARK,.7,.16);g.add(box(1.25,.65,.75,base,0,.34,0),box(1.31,.06,.81,trim,0,.69,0));for(let i=0;i<10;i++)g.add(box(.15,.18+rand()*.13,.12,mat(PRODUCT_COLORS[Math.floor(rand()*PRODUCT_COLORS.length)],.76),(rand()-.5)*1.0,.82,(rand()-.5)*.56));return g;}
function createCheckout(index){const g=new THREE.Group(),body=mat('#2c333c',.74,.15),top=mat('#d9dde2',.55,.08),screen=mat('#101820',.28,.25);g.add(box(1.75,.78,.62,body,0,.39,0),box(1.86,.08,.68,top,0,.82,0),box(.30,.32,.08,screen,.42,1.05,-.15),box(.42,.08,.28,top,-.52,.91,.10));g.add(box(2.5,.018,.05,mat('#e64545',.72),.25,.02,.50));g.userData.checkout=index+1;return g;}

function normalizePlan(c,totalW,storeDepth){
  const p=c.plan??{};
  const cellSize=Math.max(.4,Math.min(10,Number(p.cellSize??1.5)));
  const cols=Math.max(4,Math.min(120,Math.round(p.cols??Math.ceil(totalW/cellSize))));
  const rows=Math.max(4,Math.min(120,Math.round(p.rows??Math.ceil(storeDepth/cellSize))));
  const activeSet=new Set(Array.isArray(p.activeCells)?p.activeCells:[]),custom=activeSet.size>0;
  const sectors=Array.isArray(p.sectors)?p.sectors:[];
  const sectorByCell=new Map();
  for(const sector of sectors)for(const key of sector.cells??[])sectorByCell.set(key,sector);
  return {cellSize,cols,rows,isActive:(r,col)=>custom?activeSet.has(`${r},${col}`):true,dividers:new Set(Array.isArray(p.dividers)?p.dividers:[]),showWalls:p.showWalls===true,wallHeight:Math.max(.8,Math.min(5,Number(p.wallHeight??2.8))),wallThickness:Math.max(.05,Math.min(.35,Number(p.wallThickness??.12))),sectors,sectorByCell};
}

function buildPlan(root,plan){
  const wallMat=mat('#dfe5ea',.88,.02),dividerMat=mat('#cbd3da',.84,.03),floorCache=new Map();
  const {cellSize,cols,rows,isActive,dividers,showWalls,wallHeight,wallThickness,sectorByCell}=plan;
  const originX=-cols*cellSize/2,originZ=-rows*cellSize/2;
  let floorCells=0,wallSegments=0,dividerSegments=0;
  const active=(r,c)=>r>=0&&r<rows&&c>=0&&c<cols&&isActive(r,c);
  const getFloorMat=key=>{const s=sectorByCell.get(key),color=s?.color||SECTOR_COLORS[s?.type]||FLOOR;if(!floorCache.has(color))floorCache.set(color,mat(color,.94,0));return floorCache.get(color);};
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    if(!active(r,c))continue;
    floorCells++;
    const key=`${r},${c}`,x=originX+(c+.5)*cellSize,z=originZ+(r+.5)*cellSize;
    root.add(box(cellSize*.995,.06,cellSize*.995,getFloorMat(key),x,.02,z));
    if(showWalls){
      if(!active(r-1,c)){root.add(box(cellSize+wallThickness,wallHeight,wallThickness,wallMat,x,wallHeight/2,z-cellSize/2));wallSegments++;}
      if(!active(r+1,c)){root.add(box(cellSize+wallThickness,wallHeight,wallThickness,wallMat,x,wallHeight/2,z+cellSize/2));wallSegments++;}
      if(!active(r,c-1)){root.add(box(wallThickness,wallHeight,cellSize+wallThickness,wallMat,x-cellSize/2,wallHeight/2,z));wallSegments++;}
      if(!active(r,c+1)){root.add(box(wallThickness,wallHeight,cellSize+wallThickness,wallMat,x+cellSize/2,wallHeight/2,z));wallSegments++;}
    }
    if(showWalls&&dividers.has(`${r},${c},h`)){root.add(box(cellSize*.92,wallHeight,wallThickness,dividerMat,x,wallHeight/2,z));dividerSegments++;}
    if(showWalls&&dividers.has(`${r},${c},v`)){root.add(box(wallThickness,wallHeight,cellSize*.92,dividerMat,x,wallHeight/2,z));dividerSegments++;}
  }
  return {floorCells,wallSegments,dividerSegments,width:cols*cellSize,depth:rows*cellSize};
}

function pointInsidePlan(x,z,plan,margin=.05){
  const ox=-plan.cols*plan.cellSize/2,oz=-plan.rows*plan.cellSize/2;
  const c=Math.floor((x-ox)/plan.cellSize),r=Math.floor((z-oz)/plan.cellSize);
  if(c<0||c>=plan.cols||r<0||r>=plan.rows||!plan.isActive(r,c))return false;
  const lx=x-(ox+c*plan.cellSize),lz=z-(oz+r*plan.cellSize);
  return lx>margin&&lx<plan.cellSize-margin&&lz>margin&&lz<plan.cellSize-margin;
}
function footprintInside(x,z,w,d,plan){const pts=[[-w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2],[0,0]];return pts.every(([dx,dz])=>pointInsidePlan(x+dx,z+dz,plan,.02));}
function findNearestValid(originX,originZ,w,d,plan){if(footprintInside(originX,originZ,w,d,plan))return[originX,originZ];const step=plan.cellSize*.5,max=Math.max(plan.cols,plan.rows)*2;for(let ring=1;ring<max;ring++){for(let a=-ring;a<=ring;a++)for(const b of[-ring,ring]){for(const [dx,dz] of [[a,b],[b,a]]){const x=originX+dx*step,z=originZ+dz*step;if(footprintInside(x,z,w,d,plan))return[x,z];}}}return null;}

export function generateSupermarket(c){
  const root=new THREE.Group();root.name='ProceduralSupermarket';
  const rows=Math.max(1,Math.round(c.gondolaRows??5)),modules=Math.max(1,Math.round(c.modules??8)),shelves=Math.max(1,Math.round(c.shelves??5));
  const moduleWidth=c.moduleWidth??1,depth=c.depth??.78,height=c.height??1.8,aisleWidth=c.aisleWidth??1.75;
  const naturalW=modules*moduleWidth+4.2,naturalDepth=Math.max(8,rows*depth+(rows-1)*aisleWidth+5.6);
  const plan=normalizePlan(c,naturalW,naturalDepth),planStats=buildPlan(root,plan),totalW=planStats.width,storeDepth=planStats.depth;
  const cfg={...c,rows,modules,shelves,moduleWidth,depth,height,aisleWidth,storeDepth};
  const rowPitch=depth+aisleWidth,rowStart=-(rows-1)*rowPitch/2+.65;let endcaps=0,placedRows=0;
  for(let r=0;r<rows;r++){
    let mods=modules,placed=null;
    while(mods>=1&&!placed){const w=mods*moduleWidth+(c.endcaps===false?0:depth*.85),d=depth*1.08;placed=findNearestValid(0,rowStart+r*rowPitch,w,d,plan);if(!placed)mods--;}
    if(!placed)continue;
    const gon=createGondola({...cfg,modules:mods},r);gon.position.set(placed[0],0,placed[1]);root.add(gon);endcaps+=gon.userData.endcaps;placedRows++;
  }
  if(c.wallGondolas!==false){for(const side of[-1,1]){let mods=modules,placed=null;while(mods>=1&&!placed){const w=mods*moduleWidth,d=depth*.9;placed=findNearestValid(0,side*storeDepth*.40,w,d,plan);if(!placed)mods--;}if(placed){const run=createWallRun({...cfg,modules:mods},side);run.position.z=placed[1]-side*storeDepth*.44;run.position.x=placed[0];root.add(run);}}}
  const rand=mulberry32(c.seed??246810),promo=Math.max(0,Math.min(8,Math.round(c.promoTables??2)));
  for(let i=0;i<promo;i++){const desiredX=-totalW*.28+i*(totalW*.56/Math.max(1,promo-1)),desiredZ=-storeDepth*.36,placed=findNearestValid(desiredX,desiredZ,1.35,.85,plan);if(!placed)continue;const t=createPromoTable(rand);t.position.set(placed[0],0,placed[1]);root.add(t);}
  const checkouts=Math.max(0,Math.min(12,Math.round(c.checkouts??4)));
  for(let i=0;i<checkouts;i++){const desiredX=-totalW*.33+i*(totalW*.66/Math.max(1,checkouts-1)),desiredZ=storeDepth*.39,placed=findNearestValid(desiredX,desiredZ,.72,1.95,plan);if(!placed)continue;const co=createCheckout(i);co.position.set(placed[0],0,placed[1]);co.rotation.y=Math.PI/2;root.add(co);}
  const parkingSpaces=plan.sectors.filter(s=>s.type==='parking').reduce((sum,s)=>sum+Math.max(0,Number(s.parkingSpaces??0)),0);
  root.userData.stats={mode:'procedural-supermarket-v4',rows:placedRows,modules,shelves,gondolaModules:placedRows*modules,endcaps,wallRuns:c.wallGondolas===false?0:2,promoTables:promo,checkouts,width:totalW,depth:storeDepth,aisles:Math.max(1,placedRows-1),floorCells:planStats.floorCells,wallSegments:planStats.wallSegments,dividerSegments:planStats.dividerSegments,wallsVisible:plan.showWalls,sectors:plan.sectors.length,parkingSpaces,areaM2:planStats.floorCells*plan.cellSize*plan.cellSize};
  return root;
}
