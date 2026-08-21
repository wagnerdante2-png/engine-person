import * as THREE from 'three';
import { mulberry32 } from '../core/state.js';

function buildingMaterial(rand, hueBase) {
  const hue = (hueBase + (rand() - .5) * .12 + 1) % 1;
  const sat = 0.08 + rand() * .10;
  const light = 0.25 + rand() * .20;
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(hue, sat, light),
    roughness: .76,
    metalness: .03
  });
}

function addWindows(group, width, depth, height, floors, material) {
  const rows = Math.max(1, Math.min(16, floors));
  const cols = Math.max(2, Math.min(8, Math.round(width * 2.2)));
  const glass = material ?? new THREE.MeshStandardMaterial({ color:'#6f9db8', roughness:.24, metalness:.15, emissive:'#071018', emissiveIntensity:.25 });
  const plane = new THREE.PlaneGeometry(.16, .20);
  for (let r = 0; r < rows; r++) {
    const y = .28 + r * (height / rows);
    for (let c = 0; c < cols; c++) {
      const x = -width * .42 + (c / Math.max(1, cols - 1)) * width * .84;
      const win = new THREE.Mesh(plane, glass);
      win.position.set(x, y, depth / 2 + .006);
      group.add(win);
    }
  }
}

export function generateCity(c) {
  const root = new THREE.Group();
  root.name = 'ProceduralCity';
  const rand = mulberry32(c.seed);
  const blockSize = 2.4;
  const street = blockSize * c.streetWidth;
  const parcel = blockSize - street;
  const roadMat = new THREE.MeshStandardMaterial({ color:'#0e131a', roughness:.94 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color:'#323944', roughness:.92 });
  const parkMat = new THREE.MeshStandardMaterial({ color:'#1c3f2f', roughness:1 });
  const trunkMat = new THREE.MeshStandardMaterial({ color:'#5c4632', roughness:1 });
  const leafMat = new THREE.MeshStandardMaterial({ color:'#2f6849', roughness:1 });

  const totalW = c.blocksX * blockSize;
  const totalD = c.blocksZ * blockSize;
  const roadBase = new THREE.Mesh(new THREE.BoxGeometry(totalW + blockSize, .03, totalD + blockSize), roadMat);
  roadBase.position.y = .005;
  roadBase.receiveShadow = true;
  root.add(roadBase);

  let buildingCount = 0;
  let parkCount = 0;

  for (let x = 0; x < c.blocksX; x++) {
    for (let z = 0; z < c.blocksZ; z++) {
      const px = (x - (c.blocksX - 1)/2) * blockSize;
      const pz = (z - (c.blocksZ - 1)/2) * blockSize;
      const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(parcel, .08, parcel), sidewalkMat);
      sidewalk.position.set(px, .045, pz);
      sidewalk.receiveShadow = true;
      root.add(sidewalk);

      const becomePark = rand() < c.greenRatio;
      if (becomePark) {
        parkCount++;
        const park = new THREE.Mesh(new THREE.BoxGeometry(parcel*.86, .09, parcel*.86), parkMat);
        park.position.set(px,.10,pz);
        park.receiveShadow = true;
        root.add(park);
        const trees = 2 + Math.floor(rand()*4);
        for (let t=0;t<trees;t++) {
          const tx = px + (rand()-.5)*parcel*.65;
          const tz = pz + (rand()-.5)*parcel*.65;
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.32,8),trunkMat);
          trunk.position.set(tx,.29,tz);
          const crown = new THREE.Mesh(new THREE.SphereGeometry(.18+rand()*.08,10,8),leafMat);
          crown.position.set(tx,.52,tz);
          crown.castShadow = true;
          root.add(trunk,crown);
        }
        continue;
      }

      if (rand() > c.density) continue;
      buildingCount++;
      const floors = Math.max(c.minFloors, Math.floor(c.minFloors + rand() * (c.maxFloors - c.minFloors + 1)));
      const floorH = .24;
      const h = floors * floorH;
      const footprintVariation = 1 - c.variation * rand() * .28;
      const w = parcel * (.62 + rand()*.24) * footprintVariation;
      const d = parcel * (.62 + rand()*.24) * footprintVariation;
      const body = new THREE.Group();
      body.position.set(px,.09,pz);

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),buildingMaterial(rand,c.facadeHue));
      mesh.position.y = h/2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      body.add(mesh);
      if (floors <= 16 && w > .7) addWindows(body,w,d,h,floors);

      if (rand() < .42) {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w*.48,.06,d*.36),buildingMaterial(rand,c.facadeHue));
        roof.position.y = h + .03;
        body.add(roof);
      }
      root.add(body);
    }
  }

  root.userData.stats = { mode:'procedural-city', buildings:buildingCount, parks:parkCount, blocks:c.blocksX*c.blocksZ };
  return root;
}