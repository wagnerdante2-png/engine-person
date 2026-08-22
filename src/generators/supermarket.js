import * as THREE from 'three';
import { mulberry32 } from '../core/state.js';

const mat=(color,roughness=.82,metalness=.04)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const WHITE='#d8dde3', DARK='#171b22', EDGE='#303844', BASE='#262d36', FLOOR='#d9dde2';
const PRODUCT_COLORS=['#e23d3d','#f2b632','#2d8bd7','#41a85f','#f06c35','#8b5fc7','#df4f9a','#2eb3a8','#e8e8e8','#5d6672'];
function box(w,h,d,m,x=0,y=0,z=0){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o;}

function addProducts(g,rand,width,depth,y,side,fill=.78){
  const count=Math.max(2,Math.floor(width/.17));
  const z=side*(depth*.50+.035);
  for(let i=0;i<count;i++){
    if(rand()>fill)continue;
    const w=Math.min(.14,width/count*.72),h=.18+rand()*.18,d=.10+rand()*.05;
    const x=-width/2+(i+.5)*(width/count);
    const shape=rand();let p;
    const m=mat(PRODUCT_COLORS[Math.floor(rand()*PRODUCT_COLORS.length)],.72);
    if(shape<.18){p=new THREE.Mesh(new THREE.CylinderGeometry(w*.35,w*.35,h,10),m);p.position.set(x,y+h/2,z);}
    else{p=box(w,h,d,m,x,y+h/2,z);}
    g.add(p);
  }
}

function createModule(c,rand){
  const g=new THREE.Group();
  const w=c.moduleWidth,d=c.depth,h=c.height,shelves=c.shelves;
  const frame=mat(DARK,.66,.20),shelf=mat(WHITE,.76,.06),back=mat('#b9c1ca',.88),base=mat(BASE,.86);
  g.add(box(w,.12,d,base,0,.06,0));
  g.add(box(w,.035,.035,frame,0,h-.04,0));
  for(const sx of[-1,1])g.add(box(.045,h,.045,frame,sx*(w/2-.025),h/2,0));
  if(c.backPanel)g.add(box(w*.98,h*.92,.035,back,0,h*.49,0));
  const step=(h-.28)/Math.max(1,shelves);
  for(let s=0;s<shelves;s++){
    const y=.18+s*step;
    g.add(box(w*.96,.035,d*.92,shelf,0,y,0));
    addProducts(g,rand,w*.90,d*.42,y+.025,1,c.productFill);
    if(c.doubleSided)addProducts(g,rand,w*.90,d*.42,y+.025,-1,c.productFill);
  }
  return g;
}

function createGondola(c,rowIndex){
  const g=new THREE.Group();const rand=mulberry32((c.seed??246810)+rowIndex*104729);
  const total=c.modules*c.moduleWidth;
  for(let m=0;m<c.modules;m++){const mod=createModule(c,rand);mod.position.x=-total/2+(m+.5)*c.moduleWidth;g.add(mod);}
  if(c.endcaps){
    for(const side of[-1,1]){
      const end=createModule({...c,moduleWidth:c.depth*1.25,depth:c.moduleWidth*.72,doubleSided:false,backPanel:true},rand);
      end.rotation.y=Math.PI/2;end.position.x=side*(total/2+c.depth*.34);g.add(end);
    }
  }
  g.userData={modules:c.modules,endcaps:c.endcaps?2:0};return g;
}

function createWallRun(c,side){
  const g=new THREE.Group();const rand=mulberry32((c.seed??246810)+(side>0?7717:9917));
  const total=c.modules*c.moduleWidth;
  for(let m=0;m<c.modules;m++){const mod=createModule({...c,doubleSided:false,depth:c.depth*.82},rand);mod.position.x=-total/2+(m+.5)*c.moduleWidth;mod.position.z=side*c.storeDepth*.44;mod.rotation.y=side>0?Math.PI:0;g.add(mod);}
  return g;
}

function createPromoTable(rand){
  const g=new THREE.Group();const base=mat('#b8bdc5',.78,.08),trim=mat(DARK,.7,.16);
  g.add(box(1.25,.65,.75,base,0,.34,0));g.add(box(1.31,.06,.81,trim,0,.69,0));
  for(let i=0;i<10;i++){const x=(rand()-.5)*1.0,z=(rand()-.5)*.56;g.add(box(.15,.18+rand()*.13,.12,mat(PRODUCT_COLORS[Math.floor(rand()*PRODUCT_COLORS.length)],.76),x,.82,z));}
  return g;
}

function createCheckout(index){
  const g=new THREE.Group();const body=mat('#2c333c',.74,.15),top=mat('#d9dde2',.55,.08),screen=mat('#101820',.28,.25);
  g.add(box(1.75,.78,.62,body,0,.39,0));g.add(box(1.86,.08,.68,top,0,.82,0));
  g.add(box(.30,.32,.08,screen,.42,1.05,-.15));g.add(box(.42,.08,.28,top,-.52,.91,.10));
  const lane=box(2.5,.018,.05,mat('#e64545',.72),.25,.02,.50);g.add(lane);g.userData.checkout=index+1;return g;
}

export function generateSupermarket(c){
  const root=new THREE.Group();root.name='ProceduralSupermarket';
  const rows=Math.max(1,Math.round(c.gondolaRows??5)),modules=Math.max(1,Math.round(c.modules??8)),shelves=Math.max(1,Math.round(c.shelves??5));
  const moduleWidth=c.moduleWidth??1,depth=c.depth??.78,height=c.height??1.8,aisleWidth=c.aisleWidth??1.75;
  const totalW=modules*moduleWidth+4.2,storeDepth=Math.max(8,rows*depth+(rows-1)*aisleWidth+5.6);
  const cfg={...c,rows,modules,shelves,moduleWidth,depth,height,aisleWidth,storeDepth};
  root.add(box(totalW,.08,storeDepth,mat(FLOOR,.94),0,.02,0));
  const rowPitch=depth+aisleWidth;const rowStart=-(rows-1)*rowPitch/2+.65;
  let endcaps=0;
  for(let r=0;r<rows;r++){const gon=createGondola(cfg,r);gon.position.z=rowStart+r*rowPitch;root.add(gon);endcaps+=gon.userData.endcaps;}
  if(c.wallGondolas!==false){root.add(createWallRun(cfg,-1),createWallRun(cfg,1));}
  const rand=mulberry32(c.seed??246810);
  const promo=Math.max(0,Math.min(8,Math.round(c.promoTables??2)));
  for(let i=0;i<promo;i++){const t=createPromoTable(rand);t.position.set(-totalW*.28+i*(totalW*.56/Math.max(1,promo-1)),0,-storeDepth*.36);root.add(t);}
  const checkouts=Math.max(0,Math.min(12,Math.round(c.checkouts??4)));
  for(let i=0;i<checkouts;i++){const co=createCheckout(i);co.position.set(-totalW*.33+i*(totalW*.66/Math.max(1,checkouts-1)),0,storeDepth*.39);co.rotation.y=Math.PI/2;root.add(co);}
  root.userData.stats={mode:'procedural-supermarket-v1',rows,modules,shelves,gondolaModules:rows*modules,endcaps,wallRuns:c.wallGondolas===false?0:2,promoTables:promo,checkouts,width:totalW,depth:storeDepth,aisles:Math.max(1,rows-1)};
  return root;
}
