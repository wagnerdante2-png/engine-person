# Engine Person

Engine Person is a local-first procedural creation tool for generating editable 3D humans and cities.

## Product direction

This repository is intentionally structured as a product foundation rather than a disposable MVP. The application separates:

- **Viewport/runtime** — 3D scene, camera, lighting, selection and render loop.
- **Parametric generators** — humans, buildings, streets and future vegetation/props.
- **Catalogs** — modular hair, clothing, materials and presets.
- **State** — deterministic seeds and serializable project data.
- **UI** — immersive editing workspace with character/world modes.
- **Export** — future glTF/GLB, project bundle and game-engine targets.

## Current implementation

The first committed version already includes a working browser-based 3D workspace with:

- procedural human generation from body parameters;
- procedural city generation from seed, density and block parameters;
- material and wardrobe controls;
- orbit camera and environment lighting;
- deterministic randomization;
- project JSON export/import;
- modular architecture designed for progressively higher-fidelity geometry.

## Run locally

No backend is required. Any static HTTP server can run the application.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

The app currently imports Three.js from a CDN. A later packaging stage can vendor dependencies and ship as a desktop app (Tauri/Electron) without changing the generator architecture.

## Roadmap

1. Replace primitive anatomical volumes with a topology-stable base mesh and morph target system.
2. Add facial landmark/morph model, teeth, eyes and eyelashes.
3. Add modular hairstyles based on curve guides and cards.
4. Add modular clothing with body-conforming deformation.
5. Add shared skeleton, skin weights and animation retargeting.
6. Add procedural road graph, zoning, parcels and facade grammar.
7. Add asset library, LOD generation and glTF/GLB export.
8. Package as local desktop software.

See `docs/ARCHITECTURE.md` for the long-term architecture.