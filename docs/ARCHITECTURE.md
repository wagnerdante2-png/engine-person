# Engine Person — Product Architecture

## 1. Architectural principle

Engine Person is a **local-first procedural content creation application**. The product should remain useful without accounts, servers or generative AI. A project is a deterministic set of parameters, catalogs and seeds that can be regenerated on the user's machine.

The current browser renderer is an implementation layer, not the product boundary. The generator contracts are intentionally isolated so a future desktop shell (Tauri/Electron) or native renderer can replace the UI/runtime without rewriting procedural rules.

## 2. Product domains

### Human Studio

Long-term stack:

1. **Topology-stable base meshes** — male/female/neutral archetypes with consistent vertex order.
2. **Morph graph** — macro body proportions, facial regions and corrective morphs.
3. **Anatomy constraints** — dependent ranges prevent implausible combinations and preserve joints.
4. **Material graph** — skin, eyes, teeth, nails and makeup as independent parameter sets.
5. **Hair system** — style definitions built from guide curves/cards with material presets.
6. **Wardrobe system** — garments mapped to body regions, sizes and conform rules.
7. **Rig layer** — shared skeleton, skin weights, retarget profile, IK anchors and facial controls.
8. **LOD pipeline** — cinematic, gameplay, crowd and proxy representations.
9. **Export assembly** — glTF/GLB first; target-specific adapters later.

This mirrors the useful product separation seen in high-end character creators: presets, head/body shaping, material editing, hair/clothing and assembly/export, without coupling Engine Person to any one external engine.

### World Studio

Long-term stack:

1. **Terrain graph** — height fields, erosion approximation, water and biomes.
2. **Road graph** — primary/secondary/local roads represented as splines.
3. **Zoning** — land-use regions and density rules.
4. **Parcelization** — blocks split into buildable lots.
5. **Building grammar** — footprint → massing → floors → facade → roof → props.
6. **Infrastructure** — sidewalks, poles, signage, parking and street furniture.
7. **Vegetation/scatter** — seeded distribution with exclusion/attraction constraints.
8. **Population layer** — generated humans can be instanced into generated cities.
9. **Streaming/LOD** — chunks, instancing and distance-based detail.

## 3. Procedural graph model

The final product should evolve toward a graph of reusable operators, inspired by procedural node systems but stored in our own serializable schema.

Example:

```text
HumanPreset
  -> BodyMorphs
  -> FaceMorphs
  -> SkinMaterial
  -> HairStyle
  -> Wardrobe
  -> RigAssembly
  -> LODBuilder
  -> Export
```

and:

```text
WorldSeed
  -> RoadGraph
  -> Blocks
  -> Parcels
  -> Zoning
  -> BuildingGrammar
  -> Facades
  -> Scatter
  -> LODBuilder
  -> Export
```

Every operator must be deterministic for the same inputs and seed.

## 4. Data contracts

Project files must be versioned JSON and reference catalog assets by stable IDs rather than file-system positions. Binary geometry/assets will later live in an asset library with metadata.

Suggested future folders:

```text
assets/
  humans/base-meshes/
  humans/morphs/
  humans/hair/
  humans/wardrobe/
  materials/
  city/facades/
  city/props/
  vegetation/

src/
  core/
  generators/
  geometry/
  materials/
  rig/
  catalogs/
  exporters/
  ui/
```

## 5. UI principles

The editor must not expose implementation complexity unless requested. Primary interaction is contextual:

- central immersive viewport;
- small mode switcher (Person / City / Project);
- compact tool rail;
- contextual inspector;
- direct manipulation in the viewport when possible;
- presets for speed, parameters for precision;
- progressive disclosure for advanced controls;
- consistent Save/Open/Export workflow.

A future node editor is an **advanced workspace**, not the default user experience.

## 6. No-AI baseline

No feature in the core architecture requires AI. AI can later exist as an optional assistant that chooses parameters, derives presets or interprets references. The generated result must remain reproducible from explicit project data after AI is removed.

## 7. Fidelity roadmap without architectural replacement

The current human uses generated primitive volumes. These are deliberately behind `generateHuman()` so fidelity can increase without changing project files or UI contracts.

Evolution path:

- Level 0: primitive anatomical proxy (current).
- Level 1: authored topology-stable base mesh.
- Level 2: morph targets and corrective shapes.
- Level 3: rig and skinning.
- Level 4: modular garments/hair.
- Level 5: high-resolution materials and facial system.
- Level 6: optimized LOD/export pipeline.

The city follows the same progression:

- blocks → roads/parcels → grammar facades → interiors/props → terrain/biomes → streaming/LOD.

This is refinement of modules, not a rewrite of the product.