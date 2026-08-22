import * as THREE from 'three';
import { generateSupermarket as generateBase } from './supermarket.js';

const material=(color,roughness=.82,metalness=.04,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
const box=(w,h,d,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.01,w),Math.max(.01,h),Math.max(.01,d)),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o;};

function wallObject(e){
  const g=new THREE.Group(),m=material(e.color||'#d9dfe6',.9,.01),len=Math.max(.12,Number(e.length||1)),h=Math.max(.6,Number(e.height||2.8)),th=Math.max(.05,Number(e.thickness||.14));
  g.add(box(len,h,th,m,0,h/2,0));return g;
}
function columnObject(e){const w=Math.max(.12,Number(e.width||.35)),d=Math.max(.12,Number(e.depth||w)),h=Math.max(1,Number(e.height||2.8));const g=new THREE.Group();g.add(box(w,h,d,material('#aeb6bf',.88,.03),0,h/2,0));return g;}
function doorObject(e){
  const w=Math.max(.6,Number(e.width||1.1)),h=Math.max(1.7,Number(e.height||2.2)),th=.08,g=new THREE.Group(),frame=material('#3a414a',.62,.18),panel=material('#d8dde3',.6,.04,{transparent:true,opacity:.28});
  g.add(box(.07,h,.07,frame,-w/2,h/2,0),box(.07,h,.07,frame,w/2,h/2,0),box(w+.07,.07,.07,frame,0,h,0));
  if(e.kind==='rolling')g.add(box(w,h*.92,th,material('#8d959f',.72,.18),0,h*.46,0));
  else if(e.kind==='glass')g.add(box(w*.95,h*.9,.025,panel,0,h*.48,0));
  else {const leaf=box(w*.92,h*.92,.045,material('#c6ccd2',.72,.06),w*.46,h*.46,0);leaf.geometry.translate(-w*.46,0,0);leaf.rotation.y=-Math.PI*.28;g.add(leaf);}return g;
}
function windowObject(e){const w=Math.max(.7,Number(e.width||1.8)),h=Math.max(.5,Number(e.height||1.2)),g=new THREE.Group(),glass=material('#a9d8ef',.22,.08,{transparent:true,opacity:.35}),frame=material('#303943',.5,.2);g.add(box(w,h,.035,glass,0,1.05,0));g.add(box(w+.05,.04,.05,frame,0,1.05-h/2,0),box(w+.05,.04,.05,frame,0,1.05+h/2,0),box(.04,h,.05,frame,-w/2,1.05,0),box(.04,h,.05,frame,w/2,1.05,0));return g;}
function counterObject(e){const w=Math.max(.6,Number(e.width||1.5)),d=Math.max(.4,Number(e.depth||.65)),h=Math.max(.65,Number(e.height||.95)),g=new THREE.Group();g.add(box(w,h,d,material('#59626d',.74,.08),0,h/2,0),box(w+.04,.06,d+.04,material('#d8dde3',.55,.05),0,h+.03,0));return g;}
function tableObject(e){const w=Math.max(.7,Number(e.width||1.8)),d=Math.max(.55,Number(e.depth||.8)),g=new THREE.Group(),top=material('#8c6a49',.7,.03),leg=material('#343a42',.72,.13);g.add(box(w,.06,d,top,0,.76,0));for(const x of[-1,1])for(const z of[-1,1])g.add(box(.06,.74,.06,leg,x*w*.42,.37,z*d*.38));return g;}
function chairObject(){const g=new THREE.Group(),m=material('#555e68',.76,.05);g.add(box(.42,.05,.42,m,0,.46,0),box(.42,.5,.05,m,0,.72,.18));for(const x of[-.17,.17])for(const z of[-.17,.17])g.add(box(.04,.45,.04,m,x,.225,z));return g;}
function rackObject(e){const w=Math.max(.45,Number(e.width||.7)),d=Math.max(.35,Number(e.depth||.65)),h=Math.max(1,Number(e.height||2.05)),g=new THREE.Group(),m=material('#252b33',.58,.2);g.add(box(w,h,d,m,0,h/2,0));for(let i=1;i<5;i++)g.add(box(w*.88,.025,d*.88,material('#66717d',.66,.12),0,h*i/5,0));return g;}
function cartObject(){const g=new THREE.Group(),metal=material('#7c8792',.48,.32),basket=material('#b4bdc5',.55,.18);g.add(box(.75,.45,.45,basket,0,.58,0),box(.78,.04,.48,metal,0,.31,0),box(.04,.8,.04,metal,-.38,.68,-.18));for(const x of[-.28,.28])for(const z of[-.16,.16]){const wh=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.035,12),material('#171b20',.8));wh.rotation.z=Math.PI/2;wh.position.set(x,.16,z);g.add(wh);}return g;}
function stairsObject(e){const w=Math.max(.8,Number(e.width||1.2)),d=Math.max(1.2,Number(e.depth||2.5)),h=Math.max(.8,Number(e.height||1.7)),g=new THREE.Group(),n=8,m=material('#b9c1c9',.88,.02);for(let i=0;i<n;i++){const sd=d/n,sh=h/n;g.add(box(w,sh,sd,m,0,sh*(i+1)/2,-d/2+sd*(i+.5)));}return g;}
function zoneObject(e){const w=Math.max(.5,Number(e.width||4)),d=Math.max(.5,Number(e.depth||3)),color=e.kind==='grass'?'#7b9d71':e.kind==='parking'?'#555c64':'#777f87';const g=new THREE.Group();g.add(box(w,.025,d,material(color,.95,0),0,.013,0));if(e.kind==='parking'){const line=material('#e8e8df',.7,0);const spaces=Math.max(1,Math.round(e.spaces||Math.floor(w/2.6)));for(let i=0;i<=spaces;i++){const x=-w/2+i*w/spaces;g.add(box(.035,.012,d*.9,line,x,.035,0));}}return g;}

function makeExtra(e){switch(e.type){case'architecturalWall':return wallObject(e);case'column':return columnObject(e);case'door':return doorObject(e);case'window':return windowObject(e);case'counter':return counterObject(e);case'table':return tableObject(e);case'chair':return chairObject(e);case'rack':return rackObject(e);case'cart':return cartObject(e);case'stairs':return stairsObject(e);case'externalZone':return zoneObject(e);default:return null;}}

export function generateSupermarket(c){
  const imported=!!c?.plan?.importedV4;
  const baseConfig=imported?{...c,plan:{...c.plan,showWalls:false}}:c;
  const root=generateBase(baseConfig);
  const extras=Array.isArray(c?.plan?.importedExtras)?c.plan.importedExtras:[];
  const showWalls=c?.plan?.showWalls!==false;
  let extraCount=0;
  for(const e of extras){if(e.type==='architecturalWall'&&!showWalls)continue;const obj=makeExtra(e);if(!obj)continue;obj.position.set(Number(e.x||0),Number(e.y||0),Number(e.z||0));obj.rotation.y=Number(e.rotation||0);obj.userData.importedExtra=e.type;root.add(obj);extraCount++;}
  root.userData.stats={...(root.userData.stats||{}),importedExtras:extraCount,importedV4:imported};
  return root;
}
