import * as THREE from 'three';
import { mulberry32 } from '../core/state.js';
import { generateUrbanPlan } from './urban-plan.js';

function buildingMaterial(rand, hueBase, zone) {
  const zoneShift = zone === 'commercial' ? .05 : zone === 'residential' ? -.035 : 0;
  const hue = (hueBase + zoneShift + (rand() - .5) * .10 + 1) % 1;
  const sat = .07 + rand() * .12;
  const light = zone === 'commercial' ? .31 + rand()*.18 : .24 + rand()*.18;
  return new THREE.MeshStandardMaterial({ color:new THREE.Color().setHSL(hue,sat,light), roughness:.72, metalness:.04 });
}

function glassMaterial(zone) {
  return new THREE.MeshStandardMaterial({
    color:zone === 'commercial' ? '#7297ad' : '#607888',
    roughness:.22,
    metalness:.18,
    emissive:'#071018',
    emissiveIntensity:zone === 'commercial' ? .38 : .20
  });
}

function addFacadeWindows(group, width, depth, height, floors, zone) {
  const rows = Math.max(1, Math.min(28, floors));
  const colsFront = Math.max(2, Math.min(12, Math.round(width * 2.8)));
  const colsSide = Math.max(2, Math.min(12, Math.round(depth * 2.8)));
  const glass = glassMaterial(zone);
  const winW = Math.min(.18, width / Math.max(3, colsFront) * .50);
  const winH = Math.min(.22, height / Math.max(2, rows) * .45);
  const planeFront = new THREE.PlaneGeometry(winW, winH);
  const planeSide = new THREE.PlaneGeometry(winW, winH);

  for (let r=0;r<rows;r++) {
    const y = .20 + (r + .52) * (height / rows);
    for (let c=0;c<colsFront;c++) {
      const x = -width*.40 + (c / Math.max(1, colsFront-1))*width*.80;
      const front = new THREE.Mesh(planeFront, glass);
      front.position.set(x,y,depth/2+.008);
      group.add(front);
      const back = front.clone();
      back.position.z = -depth/2-.008;
      back.rotation.y = Math.PI;
      group.add(back);
    }
    for (let c=0;c<colsSide;c++) {
      const z = -depth*.40 + (c / Math.max(1, colsSide-1))*depth*.80;
      const right = new THREE.Mesh(planeSide, glass);
      right.position.set(width/2+.008,y,z);
      right.rotation.y = Math.PI/2;
      group.add(right);
      const left = right.clone();
      left.position.x = -width/2-.008;
      left.rotation.y = -Math.PI/2;
      group.add(left);
    }
  }
}

function createBuilding(parcel, c) {
  const rand = mulberry32(parcel.seed);
  const group = new THREE.Group();
  group.position.set(parcel.x,.10,parcel.z);
  const shouldBuild = rand() < parcel.occupancy;
  if (!shouldBuild) return null;

  const floors = Math.max(parcel.minFloors, Math.floor(parcel.minFloors + rand()*(parcel.maxFloors-parcel.minFloors+1)));
  const floorH = .24;
  const height = floors * floorH;
  const setback = .08 + rand()*.10 + c.variation*.06;
  const width = Math.max(.34, parcel.w * (.86 - setback));
  const depth = Math.max(.34, parcel.d * (.86 - setback));
  const mat = buildingMaterial(rand,c.facadeHue,parcel.zone);

  const podiumChance = parcel.zone !== 'residential' && floors > 6 && rand() < .56;
  if (podiumChance) {
    const podiumFloors = Math.min(3, Math.max(1, Math.round(floors*.16)));
    const podiumH = podiumFloors*floorH;
    const podium = new THREE.Mesh(new THREE.BoxGeometry(width, podiumH, depth), mat);
    podium.position.y = podiumH/2;
    podium.castShadow = true;
    podium.receiveShadow = true;
    group.add(podium);

    const towerScale = .58 + rand()*.20;
    const towerW = width*towerScale;
    const towerD = depth*(.58+rand()*.20);
    const towerH = height-podiumH;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(towerW,towerH,towerD),mat.clone());
    tower.position.set((rand()-.5)*width*.12,podiumH+towerH/2,(rand()-.5)*depth*.12);
    tower.castShadow = true;
    tower.receiveShadow = true;
    group.add(tower);
    if (towerH > .5) addFacadeWindows(group,towerW,towerD,towerH,Math.max(1,floors-podiumFloors),parcel.zone);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),mat);
    body.position.y = height/2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    if (floors <= 24) addFacadeWindows(group,width,depth,height,floors,parcel.zone);
  }

  if (rand() < .62) {
    const roofMat = buildingMaterial(rand,c.facadeHue,parcel.zone);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width*(.28+rand()*.30),.05,depth*(.24+rand()*.30)),roofMat);
    roof.position.set((rand()-.5)*width*.18,height+.025,(rand()-.5)*depth*.18);
    group.add(roof);
  }

  group.userData = { floors, zone:parcel.zone, parcelId:parcel.id };
  return group;
}

function createPark(block) {
  const group = new THREE.Group();
  const green = new THREE.MeshStandardMaterial({ color:'#1e4734', roughness:1 });
  const pathMat = new THREE.MeshStandardMaterial({ color:'#857c6a', roughness:.95 });
  const trunkMat = new THREE.MeshStandardMaterial({ color:'#5c4632', roughness:1 });
  const leafMat = new THREE.MeshStandardMaterial({ color:'#316f4d', roughness:1 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(block.size*.96,.07,block.size*.96),green);
  base.position.set(block.x,.11,block.z);
  base.receiveShadow = true;
  group.add(base);

  const path1 = new THREE.Mesh(new THREE.BoxGeometry(block.size*.86,.015,block.size*.09),pathMat);
  path1.position.set(block.x,.153,block.z);
  const path2 = new THREE.Mesh(new THREE.BoxGeometry(block.size*.09,.015,block.size*.86),pathMat);
  path2.position.set(block.x,.153,block.z);
  group.add(path1,path2);

  const rand = mulberry32((block.gx+11)*73856093 ^ (block.gz+17)*19349663);
  const trees = 5 + Math.floor(rand()*6);
  for (let i=0;i<trees;i++) {
    const tx = block.x + (rand()-.5)*block.size*.72;
    const tz = block.z + (rand()-.5)*block.size*.72;
    if (Math.abs(tx-block.x)<block.size*.08 || Math.abs(tz-block.z)<block.size*.08) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.028,.042,.30,8),trunkMat);
    trunk.position.set(tx,.31,tz);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(.16+rand()*.08,1),leafMat);
    crown.position.set(tx,.50+rand()*.06,tz);
    crown.castShadow = true;
    group.add(trunk,crown);
  }
  return group;
}

function createRoad(road) {
  const roadMat = new THREE.MeshStandardMaterial({ color:'#0c1118', roughness:.97 });
  const lineMat = new THREE.MeshStandardMaterial({ color:'#d0bd72', roughness:.82 });
  const w = road.axis === 'x' ? road.length : road.width;
  const d = road.axis === 'x' ? road.width : road.length;
  const group = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w,.025,d),roadMat);
  slab.position.set(road.x,.012,road.z);
  slab.receiveShadow = true;
  group.add(slab);

  if (road.hierarchy !== 'local') {
    const lineW = road.axis === 'x' ? road.length*.96 : .018;
    const lineD = road.axis === 'x' ? .018 : road.length*.96;
    const line = new THREE.Mesh(new THREE.BoxGeometry(lineW,.008,lineD),lineMat);
    line.position.set(road.x,.030,road.z);
    group.add(line);
  }
  return group;
}

export function generateCity(c) {
  const root = new THREE.Group();
  root.name = 'ProceduralCity';
  const plan = generateUrbanPlan(c);
  const sidewalkMat = new THREE.MeshStandardMaterial({ color:'#343b45', roughness:.94 });

  plan.roads.forEach(road => root.add(createRoad(road)));
  plan.blocks.forEach(block => {
    if (block.isPark) {
      root.add(createPark(block));
      return;
    }
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(block.size,.08,block.size),sidewalkMat);
    sidewalk.position.set(block.x,.07,block.z);
    sidewalk.receiveShadow = true;
    root.add(sidewalk);
  });

  let buildingCount = 0;
  const zones = { residential:0, mixed:0, commercial:0 };
  plan.parcels.forEach(parcel => {
    const building = createBuilding(parcel,c);
    if (!building) return;
    buildingCount++;
    zones[parcel.zone]++;
    root.add(building);
  });

  root.userData.stats = {
    mode:'procedural-city-v2',
    buildings:buildingCount,
    parks:plan.blocks.filter(b=>b.isPark).length,
    blocks:plan.blocks.length,
    parcels:plan.parcels.length,
    roads:plan.roads.length,
    zones
  };
  return root;
}
