import * as THREE from 'three';
import { mulberry32 } from '../core/state.js';

const mat=(color,roughness=.82,metalness=.04,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
const WHITE='#d8dde3', DARK='#171b22', BASE='#262d36', FLOOR='#d9dde2';
const PRODUCT_COLORS=['#e23d3d','#f2b632','#2d8bd7','#41a85f','#f06c35','#8b5fc7','#df4f9a','#2eb3a8','#e8e8e8','#5d6672'];
function box(w,h,d,m,x=0,y=0,z=0){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o;}

function addProducts(g,rand,width,depth,y,side,fill=.78){const count=Math.max(2,Math.floor(width/.17)),z=side*(depth*.50+.035);for(let i=0;i<count;i++){if(rand()>fill)continue;const w=Math.min(.14,width/count*.72),h=.18+rand()*.18,d=.10+rand()*.05,x=-width/2+(i+.5)*(width/count),m=mat(PRODUCT_COLORS[Math.floor(rand()*PRODUCT_COLORS.length)],.72);let p;if(rand()<.18){p=new THREE.Mesh(new THREE.CylinderGeometry(w*.35,w*.35,h,10),m);p.position.set(x,y+h/2,z);}else p=box(w,h,d,m,x,y+h/2,z);g.add(p);}}
function createModule(c,rand){const g=new THREE.Group(),w=c.moduleWidth,d=c.depth,h=c.height,shelves=c.shelves,frame=mat(DARK,.66,.20),shelf=mat(WHITE,.76,.06),back=mat('#b9c1ca',.88),base=mat(BASE,.86);g.add(box(w,.12,d,base,0,.06,0),box(w,.035,.035,frame,0,h-.04,0));for(const sx of[-1,1])g.add(box(.045,h,.045,frame,sx*(w/2-.025),h/2,0));if(c.backPanel)g.add(box(w*.98,h*.92,.035,back,0,h*.49,0));const step=(h-.28)/Math.max(1,shelves);for(let s=0;s<shelves;s++){const y=.18+s*step;g.add(box(w*.96,.035,d*.92,shelf,0,y,0));addProducts(g,rand,w*.90,d*.42,y+.025,1,c.productFill);if(c.doubleSided)addProducts(g,rand,w*.90,d*.42,y+.025,-1,c.productFill);}return g;}
function createGondola(c,rowIndex){const g=new THREE.Group(),rand=mulberry32((c.seed??246810)+rowIndex*104729),total=c.modules*c.moduleWidth;for(let m=0;m<c.modules;m++){const mod=createModule(c,rand);mod.position.x=-total/2+(m+.5)*c.moduleWidth;g.add(mod);}if(c.endcaps)for(const side of[-1,1]){const end=createModule({...c,moduleWidth:c.depth*1.25,depth:c.moduleWidth*.72,doubleSided:false,backPanel:true},rand);end.rotation.y=Math.PI/2;end.position.x=side*(total/2+c.depth*.34);g.add(end);}g.userData={modules:c.modules,endcaps:c.endcaps?2:0};return g;}
function createWallRun(c,side){const g=new THREE.Group(),rand=mulberry32((c.seed??246810)+(side>0?7717:9917)),total=c.modules*c.moduleWidth;for(let m=0;m<c.modules;m++){const mod=createModule({...c,doubleSided:false,depth:c.depth*.82},rand);mod.position.x=-total/2+(m+.5)*c.moduleWidth;mod.rotation.y=side>0?Math.PI:0;g.add(mod);}g.userData={modules:c.modules};return g;}
function createPromoTable(rand){const g=new THREE.Group(),base=mat('#b8bdc5',.78,.08),trim=mat(DARK,.7,.16);g.add(box(1.25,.65,.75,base,0,.34,0),box(1.31,.06,.81,trim,0,.69,0));for(let i=0;i<10;i++)g.add(box(.15,.18+rand()*.13,.12,mat(PRODUCT_COLORS[Math.floor(rand()*PRODUCT_COLORS.length)],.76),(rand()-.5)*1.0,.82,(rand()-.5)*.56));return g;}
function createCheckout(index){const g=new THREE.Group(),body=mat('#2c333c',.74,.15),top=mat('#d9dde2',.55,.08),screen=mat('#101820',.28,.25);g.add(box(1.75,.78,.62,body,0,.39,0),box(1.86,.08,.68,top,0,.82,0),box(.30,.32,.08,screen,.42,1.05,-.15),box(.42,.08,.28,top,-.52,.91,.10));g.add(box(2.5,.018,.05,mat('#e64545',.72),.25,.02,.50));g.userData.checkout=index+1;return g;}

function normalizePlan(c,totalW,storeDepth){
  const p=c.plan??{};
  const cellSize=Math.max(.4,Math.min(2.5,Number(p.cellSize??1)));
  const cols=Math.max(4,Math.min(40,Math.round(p.cols??Math.ceil(totalW/cellSize))));
  const rows=Math.max(4,Math.min(40,Math.round(p.rows??Math.ceil(storeDepth/cellSize))));
  const activeSet=new Set(Array.isArray(p.activeCells)?p.activeCells:[]);
  const custom=activeSet.size>0;
  const isActive=(r,col)=>custom?activeSet.has(`${r},${col}`):true;
  return {cellSize,cols,rows,isActive,dividers:new Set(Array.isArray(p.dividers)?p.dividers:[]),showWalls:p.showWalls===true,wallHeight:Math.max(.8,Math.min(5,Number(p.wallHeight??2.8))),wallThickness:Math.max(.05,Math.min(.35,Number(p.wallThickness??.12)))};
}

function planHelpers(plan){
  const {cellSize,cols,rows,isActive}=plan;
  const originX=-cols*cellSize/2,originZ=-rows*cellSize/2;
  const worldToCell=(x,z)=>({c:Math.floor((x-originX)/cellSize),r:Math.floor((z-originZ)/cellSize)});
  const pointActive=(x,z)=>{const {r,c}=worldToCell(x,z);return r>=0&&r<rows&&c>=0&&c<cols&&isActive(r,c);};
  const rectFits=(x,z,w,d,margin=.08)=>{
    const hw=w/2+margin,hd=d/2+margin;
    const stepsX=Math.max(2,Math.ceil(w/(cellSize*.42))),stepsZ=Math.max(2,Math.ceil(d/(cellSize*.42)));
    for(let iz=0;iz<=stepsZ;iz++)for(let ix=0;ix<=stepsX;ix++){
      const px=x-hw+(ix/stepsX)*(hw*2),pz=z-hd+(iz/stepsZ)*(hd*2);
      if(!pointActive(px,pz))return false;
    }
    return true;
  };
  const xCenters=[];for(let c=0;c<cols;c++)xCenters.push(originX+(c+.5)*cellSize);
  const zCenters=[];for(let r=0;r<rows;r++)zCenters.push(originZ+(r+.5)*cellSize);
  return {originX,originZ,pointActive,rectFits,xCenters,zCenters};
}

function findBestPlacement(planTools,desiredX,desiredZ,w,d,used=[],minGap=.12){
  const candidates=[];
  const xs=[desiredX,...planTools.xCenters].filter((v,i,a)=>a.indexOf(v)===i);
  const zs=[desiredZ,...planTools.zCenters].filter((v,i,a)=>a.indexOf(v)===i);
  for(const z of zs)for(const x of xs){
    if(!planTools.rectFits(x,z,w,d))continue;
    const overlap=used.some(u=>Math.abs(x-u.x)<(w+u.w)/2+minGap&&Math.abs(z-u.z)<(d+u.d)/2+minGap);
    if(overlap)continue;
    candidates.push({x,z,score:Math.hypot(x-desiredX,z-desiredZ)});
  }
  candidates.sort((a,b)=>a.score-b.score);
  return candidates[0]??null;
}

function buildPlan(root,plan){
  const floorMat=mat(FLOOR,.94),wallMat=mat('#dfe5ea',.88,.02),dividerMat=mat('#cbd3da',.84,.03);
  const {cellSize,cols,rows,isActive,dividers,showWalls,wallHeight,wallThickness}=plan;
  const originX=-cols*cellSize/2,originZ=-rows*cellSize/2;
  let floorCells=0,wallSegments=0,dividerSegments=0;
  const active=(r,c)=>r>=0&&r<rows&&c>=0&&c<cols&&isActive(r,c);
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    if(!active(r,c))continue;
    floorCells++;
    const x=originX+(c+.5)*cellSize,z=originZ+(r+.5)*cellSize;
    root.add(box(cellSize*.995,.06,cellSize*.995,floorMat,x,.02,z));
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

export function generateSupermarket(c){
  const root=new THREE.Group();root.name='ProceduralSupermarket';
  const requestedRows=Math.max(1,Math.round(c.gondolaRows??5)),requestedModules=Math.max(1,Math.round(c.modules??8)),shelves=Math.max(1,Math.round(c.shelves??5));
  const moduleWidth=c.moduleWidth??1,depth=c.depth??.78,height=c.height??1.8,aisleWidth=c.aisleWidth??1.75;
  const naturalW=requestedModules*moduleWidth+4.2,naturalDepth=Math.max(8,requestedRows*depth+(requestedRows-1)*aisleWidth+5.6);
  const plan=normalizePlan(c,naturalW,naturalDepth),planStats=buildPlan(root,plan),tools=planHelpers(plan);
  const totalW=planStats.width,storeDepth=planStats.depth;
  const rowPitch=depth+aisleWidth,rowStart=-(requestedRows-1)*rowPitch/2+.65;
  const used=[];let endcaps=0,placedRows=0,placedModules=0,autoAdjustedRows=0;

  for(let r=0;r<requestedRows;r++){
    const desiredZ=rowStart+r*rowPitch;
    let fit=null,modules=requestedModules;
    while(modules>=1&&!fit){
      const baseLength=modules*moduleWidth;
      const endExtra=c.endcaps===false?0:2*(depth*.34+moduleWidth*.36);
      const footprintW=baseLength+endExtra+.12,footprintD=depth+.18;
      fit=findBestPlacement(tools,0,desiredZ,footprintW,footprintD,used,Math.max(.16,aisleWidth*.22));
      if(!fit)modules--;
      else{
        const cfg={...c,rows:requestedRows,modules,shelves,moduleWidth,depth,height,aisleWidth,storeDepth};
        const gon=createGondola(cfg,r);gon.position.set(fit.x,0,fit.z);root.add(gon);
        used.push({x:fit.x,z:fit.z,w:footprintW,d:footprintD});
        endcaps+=gon.userData.endcaps;placedRows++;placedModules+=modules;if(modules!==requestedModules||Math.abs(fit.x)>.01||Math.abs(fit.z-desiredZ)>.01)autoAdjustedRows++;
      }
    }
  }

  let wallRuns=0;
  if(c.wallGondolas!==false){
    for(const side of[-1,1]){
      let modules=requestedModules,fit=null;
      const desiredZ=side*(storeDepth/2-depth*.7);
      while(modules>=1&&!fit){
        const footprintW=modules*moduleWidth+.12,footprintD=depth*.82+.18;
        fit=findBestPlacement(tools,0,desiredZ,footprintW,footprintD,used,.14);
        if(!fit)modules--;
        else{
          const cfg={...c,modules,shelves,moduleWidth,depth,height,aisleWidth,storeDepth};
          const run=createWallRun(cfg,side);run.position.set(fit.x,0,fit.z);root.add(run);used.push({x:fit.x,z:fit.z,w:footprintW,d:footprintD});wallRuns++;
        }
      }
    }
  }

  const rand=mulberry32(c.seed??246810),promo=Math.max(0,Math.min(8,Math.round(c.promoTables??2)));let placedPromo=0;
  for(let i=0;i<promo;i++){const desiredX=-totalW*.28+i*(totalW*.56/Math.max(1,promo-1)),fit=findBestPlacement(tools,desiredX,-storeDepth*.30,1.35,.90,used,.12);if(!fit)continue;const t=createPromoTable(rand);t.position.set(fit.x,0,fit.z);root.add(t);used.push({x:fit.x,z:fit.z,w:1.35,d:.90});placedPromo++;}
  const checkouts=Math.max(0,Math.min(12,Math.round(c.checkouts??4)));let placedCheckouts=0;
  for(let i=0;i<checkouts;i++){const desiredX=-totalW*.33+i*(totalW*.66/Math.max(1,checkouts-1)),fit=findBestPlacement(tools,desiredX,storeDepth*.32,.82,2.0,used,.10);if(!fit)continue;const co=createCheckout(i);co.position.set(fit.x,0,fit.z);co.rotation.y=Math.PI/2;root.add(co);used.push({x:fit.x,z:fit.z,w:.82,d:2.0});placedCheckouts++;}

  root.userData.stats={mode:'procedural-supermarket-v3',rows:placedRows,requestedRows,modules:requestedModules,placedModules,shelves,gondolaModules:placedModules,endcaps,wallRuns,promoTables:placedPromo,checkouts:placedCheckouts,width:totalW,depth:storeDepth,aisles:Math.max(0,placedRows-1),floorCells:planStats.floorCells,wallSegments:planStats.wallSegments,dividerSegments:planStats.dividerSegments,wallsVisible:plan.showWalls,autoAdjustedRows};
  return root;
}
