# Engine Person

Engine Person is a local-first procedural creation tool for generating editable 3D humans and worlds.

## Product direction

This repository is intentionally structured as a product foundation rather than a disposable MVP. The application separates:

- **Viewport/runtime** — 3D scene, camera, lighting, selection and render loop.
- **Parametric geometry** — reusable topology-oriented surfaces for bodies, faces and future assets.
- **Human generator** — anatomy, facial parameters, hair, wardrobe and material assembly.
- **Rig/deformation** — humanoid skeleton, automatic skin weights, IK, procedural motion and retarget metadata.
- **Facial system** — specialized eye/oral materials, blinking and expression controls.
- **World generation** — modern, medieval and hybrid urban grammars.
- **State** — deterministic seeds and serializable/versioned project data.
- **UI** — immersive editing workspace with character/world modes.
- **Export** — future glTF/GLB, project bundle and game-engine targets.

## Current implementation

The current product foundation includes:

- autonomous deterministic human profiles with editable anatomy;
- parametric surfaces for torso, pelvis, head, arms and legs;
- specialized skin, cornea, eye-occlusion, tearline, teeth, tongue, hair and clothing materials;
- humanoid rig with spine, limbs, jaw, fingers/toes anchors and canonical bone naming;
- automatic four-influence skin weighting using geometric proximity plus semantic body-region constraints;
- two-bone IK foundation for hands and feet;
- procedural idle, breathing, walk and run motion;
- T-Pose, A-Pose, relaxed, hero and contrapposto poses;
- humanoid retarget profile and external-pose adapter contract;
- procedural facial expressions, blinking, jaw opening, brow control, smile and squint;
- modern, medieval and hybrid world generation with roads, parcels, zoning, markets, fortifications and varied architecture;
- deterministic project JSON export/import with schema migration defaults;
- GitHub Actions syntax gate, with no Codespaces required for code changes.

## Run locally

No backend is required. Any static HTTP server can run the application.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

The app currently imports Three.js from a CDN. A packaging stage can vendor dependencies and ship as a desktop app without changing generator contracts.

## Product roadmap

1. Refine automatic weights with joint-specific corrective deformation and production topology.
2. Add full finger chains, eyelid geometry, eyelashes and expression morph targets.
3. Replace current hair tubes with guide curves + card/strand generation and scalp masks.
4. Add garment catalog, collision zones, cloth-ready metadata and body-conforming deformation.
5. Add foot planting, look-at, hand targets and configurable IK manipulators in the viewport.
6. Add animation clip import/retarget adapters and glTF/GLB humanoid export.
7. Evolve worlds to spline roads, terrain, irregular parcels, interiors, props, vegetation and streaming LOD.
8. Package as a local desktop application with GPU capability detection and project browser.

See `docs/ARCHITECTURE.md` for the long-term architecture.
