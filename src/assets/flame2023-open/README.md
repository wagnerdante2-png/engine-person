# FLAME2023 Open runtime assets

Source: `flame2023_Open.pkl` from the FLAME2023_Open package supplied for Engine Person.
License: CC BY 4.0. See `docs/THIRD_PARTY.md`.

The original model data is preserved as typed binary arrays and split only for transport/runtime loading. No procedural reconstruction is performed.

Core files:
- `template.f32`: exact `v_template` (5023 x 3, float32)
- `faces.u32`: exact `f` (9976 x 3, uint32)
- `joints.f32`: exact `J` (5 x 3, float32)
- `weights.f32`: exact `weights` (5023 x 5, float32)
- `j_regressor.f32`: dense form of exact `J_regressor` (5 x 5023, float32)
- `kintree.u32`: exact `kintree_table` (2 x 5, uint32)
- `posedirs.f32`: exact `posedirs` (5023 x 3 x 36, float32)
- `shapedirs-XXX-YYY.f32`: exact `shapedirs`, split into 10-component chunks. Components 0-299 are identity/shape; 300-399 are expression, per FLAME2023_Open metadata.

All numeric data is little-endian.