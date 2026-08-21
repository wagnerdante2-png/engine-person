import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

export function meshFromRings(rings, radialSegments = 48, material) {
  const positions = [];
  const uvs = [];
  const indices = [];

  rings.forEach((ring, yi) => {
    for (let i = 0; i < radialSegments; i++) {
      const a = (i / radialSegments) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const frontBias = Math.max(0, sa) * (ring.front ?? 0);
      const backBias = Math.max(0, -sa) * (ring.back ?? 0);
      const x = ring.cx + ca * ring.rx;
      const y = ring.y;
      const z = ring.cz + sa * ring.rz + frontBias - backBias;
      positions.push(x, y, z);
      uvs.push(i / radialSegments, yi / Math.max(1, rings.length - 1));
    }
  });

  for (let y = 0; y < rings.length - 1; y++) {
    const row = y * radialSegments;
    const next = (y + 1) * radialSegments;
    for (let i = 0; i < radialSegments; i++) {
      const n = (i + 1) % radialSegments;
      indices.push(row + i, next + i, next + n);
      indices.push(row + i, next + n, row + n);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createTorsoMesh(profile, material, radialSegments = 56) {
  const { hipY, shoulderY, H } = profile;
  const span = shoulderY - hipY;
  const rings = [];
  const count = 30;

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const y = lerp(hipY - H * .015, shoulderY + H * .012, t);
    const pelvis = Math.exp(-Math.pow((t - .12) / .20, 2));
    const waist = Math.exp(-Math.pow((t - .43) / .18, 2));
    const chest = Math.exp(-Math.pow((t - .70) / .24, 2));
    const shoulders = Math.exp(-Math.pow((t - .95) / .16, 2));

    const rx = H * (
      .070 * profile.bodyMass +
      .028 * profile.hipWidth * pelvis -
      .012 * (2 - profile.waistWidth) * waist +
      .024 * profile.chestWidth * chest +
      .038 * profile.shoulderWidth * shoulders
    ) * profile.sexWidth;

    const rz = H * (
      .050 * profile.bodyMass +
      .014 * pelvis +
      .018 * profile.chestDepth * chest +
      .010 * profile.muscle * shoulders
    );

    rings.push({
      y,
      rx: Math.max(H * .050, rx),
      rz: Math.max(H * .038, rz),
      cx: 0,
      cz: H * (.004 * pelvis - .002 * shoulders),
      front: H * (.007 * chest + .004 * pelvis),
      back: H * (.005 * pelvis)
    });
  }

  return meshFromRings(rings, radialSegments, material);
}

export function createPelvisMesh(profile, material, radialSegments = 52) {
  const H = profile.H;
  const rings = [];
  const bottom = profile.hipY - H * .055;
  const top = profile.hipY + H * .085;
  const count = 16;
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const bulge = Math.sin(Math.PI * t);
    const rx = H * (.064 * profile.bodyMass + .035 * profile.hipWidth * bulge) * profile.sexHip;
    const rz = H * (.046 * profile.bodyMass + .026 * profile.glute * bulge);
    rings.push({ y: lerp(bottom, top, t), rx, rz, cx: 0, cz: -H * .004 + H * .010 * bulge, front: H * .003, back: H * .012 * profile.glute * bulge });
  }
  return meshFromRings(rings, radialSegments, material);
}

export function createHeadMesh(profile, material, radialSegments = 64, verticalSegments = 44) {
  const { headR, headY, faceWidth, jawWidth, cheekbones, headDepth, chinSize } = profile;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let y = 0; y <= verticalSegments; y++) {
    const v = y / verticalSegments;
    const phi = v * Math.PI;
    const py = Math.cos(phi);
    const equator = Math.sin(phi);
    const lower = clamp((v - .48) / .52, 0, 1);
    const jawBlend = lerp(1, jawWidth, Math.pow(lower, 1.8));
    const cheek = 1 + (cheekbones - 1) * Math.exp(-Math.pow((v - .48) / .16, 2));
    const chin = Math.exp(-Math.pow((v - .92) / .10, 2));

    for (let x = 0; x < radialSegments; x++) {
      const u = x / radialSegments;
      const theta = u * Math.PI * 2;
      const cx = Math.cos(theta);
      const sz = Math.sin(theta);
      const frontal = Math.max(0, sz);
      const occipital = Math.max(0, -sz);
      const rx = headR * faceWidth * equator * jawBlend * cheek;
      const rz = headR * .92 * headDepth * equator;
      let px = cx * rx;
      let pz = sz * rz;
      let yy = headY + py * headR * 1.13;

      pz += frontal * headR * (.045 * cheek + .025 * (1 - lower));
      pz -= occipital * headR * .025;
      yy -= chin * headR * .07 * chinSize;
      px *= 1 - chin * .20;
      pz += chin * headR * .055 * chinSize;

      positions.push(px, yy, pz);
      uvs.push(u, 1 - v);
    }
  }

  for (let y = 0; y < verticalSegments; y++) {
    const row = y * radialSegments;
    const next = (y + 1) * radialSegments;
    for (let i = 0; i < radialSegments; i++) {
      const n = (i + 1) % radialSegments;
      indices.push(row + i, next + i, next + n);
      indices.push(row + i, next + n, row + n);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createTaperedLimb({ start, end, radii, material, radialSegments = 28, segments = 14, ellipticity = .92 }) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const axis = new THREE.Vector3().subVectors(b, a);
  const length = axis.length();
  const dir = axis.clone().normalize();
  const up = Math.abs(dir.y) > .92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3().crossVectors(dir, up).normalize();
  const bitangent = new THREE.Vector3().crossVectors(dir, tangent).normalize();
  const rings = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let r;
    if (t < .5) r = lerp(radii[0], radii[1], t * 2);
    else r = lerp(radii[1], radii[2], (t - .5) * 2);
    const center = a.clone().addScaledVector(dir, length * t);
    rings.push({ center, r });
  }

  const positions = [];
  const uvs = [];
  const indices = [];
  rings.forEach((ring, ri) => {
    for (let j = 0; j < radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const p = ring.center.clone()
        .addScaledVector(tangent, Math.cos(theta) * ring.r)
        .addScaledVector(bitangent, Math.sin(theta) * ring.r * ellipticity);
      positions.push(p.x, p.y, p.z);
      uvs.push(j / radialSegments, ri / segments);
    }
  });

  for (let r = 0; r < rings.length - 1; r++) {
    const row = r * radialSegments;
    const next = (r + 1) * radialSegments;
    for (let j = 0; j < radialSegments; j++) {
      const n = (j + 1) % radialSegments;
      indices.push(row + j, next + j, next + n);
      indices.push(row + j, next + n, row + n);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createFoot(H, width, length, material) {
  const g = new THREE.SphereGeometry(1, 36, 20);
  g.scale(width, H * .030, length);
  g.translate(0, H * .028, length * .18);
  const mesh = new THREE.Mesh(g, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createHand(H, width, material) {
  const g = new THREE.SphereGeometry(1, 28, 18);
  g.scale(width, H * .045, H * .020);
  const mesh = new THREE.Mesh(g, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
