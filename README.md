# Engine Person

Engine Person is a local-first procedural creation tool for generating editable 3D humans and cities.

## Product direction

This repository is intentionally structured as a product foundation rather than a disposable MVP. The application separates:

- **Viewport/runtime** — 3D scene, camera, lighting, selection and render loop.
- **Parametric geometry** — reusable topology-oriented surfaces for bodies, faces and future assets.
- **Human generator** — anatomy, facial parameters, hair, wardrobe and material assembly.
- **Urban planning** — roads, blocks, parcels, zoning, parks and skyline rules.
- **Catalogs** — modular hair, clothing, materials and presets.
- **State** — deterministic seeds and serializable/versioned project data.
- **UI** — immersive editing workspace with character/world modes.
- **Export** — future glTF/GLB, project bundle and game-engine targets.

## Current implementation

The current product foundation includes:

- parametric human surfaces for torso, pelvis, head, arms and legs;
- anatomy controls for proportions, silhouette, muscle, head and facial regions;
- procedural eyes, nose, mouth and material separation;
- procedural hair guides with short, bob and long families;
- conform-style upper garment shell and separate lower-body material;
- deterministic urban planning with road hierarchy, blocks, parcels and zoning;
- procedural parks, sidewalks, lane markings, podium/tower building grammar and facade windows;
- city controls for density, parcel subdivision, commercial mix, green ratio and skyline;
- material/environment controls, orbit camera and ACES tone mapping;
- deterministic project JSON export/import with schema migration defaults;
- GitHub Actions syntax gate, with no Codespaces required for code changes.

## Run locally

No backend is required. Any static HTTP server can run the application.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

The app currently imports Three.js from a CDN. A packaging stage can vendor dependencies and ship as a desktop app (Tauri/Electron) without changing generator contracts.

## Product roadmap

1. Evolve the generated anatomy surface toward a single topology-stable production base mesh and corrective morph graph.
2. Add eyebrows, eyelids, ears, teeth/tongue, eyelashes and facial expression controls.
3. Replace current hair tubes with guide curves + card/strand generation and scalp masks.
4. Add a garment catalog, body-conforming deformation, collision zones and cloth-ready export metadata.
5. Add shared skeleton, skin weights, IK anchors and animation retargeting.
6. Evolve city planning to spline roads, irregular blocks, terrain, parcel constraints and facade grammars.
7. Add asset library, vegetation/props, interiors, LOD generation and glTF/GLB export.
8. Package as a local desktop application with GPU capability detection and project browser.

See `docs/ARCHITECTURE.md` for the long-term architecture.
