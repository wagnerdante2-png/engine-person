#!/usr/bin/env python3
"""Convert the official FLAME2023_Open pickle into browser-friendly split assets.

Usage:
  python tools/import_flame2023_open.py /path/to/FLAME2023Open.zip
  python tools/import_flame2023_open.py /path/to/flame2023_Open.pkl

The converter does not reconstruct geometry. It serializes the exact model arrays
from the supplied FLAME2023_Open package into typed little-endian binary files.
`shapedirs` is split into 10-component chunks so Git/runtime transport stays sane.
"""
from __future__ import annotations

import json
import pickle
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

try:
    import numpy as np
    import scipy.sparse
except ImportError as exc:
    raise SystemExit(
        "Missing converter dependencies. Run: python -m pip install numpy scipy"
    ) from exc

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "assets" / "flame2023-open"
CHUNK = 10


def locate_pickle(source: Path) -> tuple[Path, tempfile.TemporaryDirectory | None]:
    if source.suffix.lower() == ".pkl":
        return source, None
    if source.suffix.lower() != ".zip":
        raise SystemExit("Input must be FLAME2023Open.zip or flame2023_Open.pkl")
    tmp = tempfile.TemporaryDirectory(prefix="engine-person-flame-")
    with zipfile.ZipFile(source) as archive:
        archive.extractall(tmp.name)
    candidates = list(Path(tmp.name).rglob("flame2023_Open.pkl"))
    if not candidates:
        tmp.cleanup()
        raise SystemExit("flame2023_Open.pkl was not found inside the ZIP")
    return candidates[0], tmp


def as_f32(value):
    return np.asarray(value, dtype="<f4")


def as_u32(value):
    return np.asarray(value, dtype="<u4")


def write_array(name: str, arr: np.ndarray) -> dict:
    path = OUT / name
    arr.tofile(path)
    return {"file": name, "shape": list(arr.shape), "bytes": path.stat().st_size}


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python tools/import_flame2023_open.py <FLAME2023Open.zip|flame2023_Open.pkl>")

    source = Path(sys.argv[1]).expanduser().resolve()
    model_path, tmp = locate_pickle(source)
    try:
        with model_path.open("rb") as fh:
            model = pickle.load(fh, encoding="latin1")

        required = {"v_template", "f", "J", "J_regressor", "kintree_table", "weights", "posedirs", "shapedirs"}
        missing = sorted(required.difference(model))
        if missing:
            raise SystemExit(f"FLAME model is missing required keys: {missing}")

        OUT.mkdir(parents=True, exist_ok=True)
        for old in OUT.glob("*.f32"):
            old.unlink()
        for old in OUT.glob("*.u32"):
            old.unlink()

        template = as_f32(model["v_template"])
        faces = as_u32(model["f"])
        joints = as_f32(model["J"])
        weights = as_f32(model["weights"])
        posedirs = as_f32(model["posedirs"])
        shapedirs = as_f32(model["shapedirs"])
        j_regressor = as_f32(model["J_regressor"].toarray() if scipy.sparse.issparse(model["J_regressor"]) else model["J_regressor"])
        kintree = as_u32(model["kintree_table"])

        assert template.shape == (5023, 3), template.shape
        assert faces.shape == (9976, 3), faces.shape
        assert shapedirs.shape == (5023, 3, 400), shapedirs.shape
        assert posedirs.shape == (5023, 3, 36), posedirs.shape
        assert weights.shape == (5023, 5), weights.shape

        files = []
        files.append(write_array("template.f32", template))
        files.append(write_array("faces.u32", faces))
        files.append(write_array("joints.f32", joints))
        files.append(write_array("weights.f32", weights))
        files.append(write_array("j_regressor.f32", j_regressor))
        files.append(write_array("kintree.u32", kintree))
        files.append(write_array("posedirs.f32", posedirs))

        shape_files = []
        for start in range(0, shapedirs.shape[2], CHUNK):
            end = min(start + CHUNK, shapedirs.shape[2])
            name = f"shapedirs-{start:03d}-{end-1:03d}.f32"
            payload = shapedirs[:, :, start:end]
            files.append(write_array(name, payload))
            shape_files.append({"file": name, "start": start, "end": end, "shape": list(payload.shape)})

        expr_meta = model.get("supr_expression_metadata", {})
        metadata = {
            "source": "FLAME2023_Open",
            "sourceFile": "flame2023_Open.pkl",
            "license": "CC BY 4.0",
            "vertexCount": int(template.shape[0]),
            "faceCount": int(faces.shape[0]),
            "shapeComponents": int(shapedirs.shape[2]),
            "identityComponents": 300,
            "expressionComponents": int(expr_meta.get("n_expr", 100)),
            "expressionRange": [300, 399],
            "posedirsComponents": int(posedirs.shape[2]),
            "jointCount": int(joints.shape[0]),
            "weightsShape": list(weights.shape),
            "jRegressorShape": list(j_regressor.shape),
            "kintreeShape": list(kintree.shape),
            "shapeChunkSize": CHUNK,
            "shapeFiles": shape_files,
            "bounds": {"min": template.min(axis=0).tolist(), "max": template.max(axis=0).tolist()},
            "expressionMetadata": expr_meta,
            "binaryEncoding": {"floats": "little-endian float32", "indices": "little-endian uint32"},
            "files": files,
        }
        (OUT / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
        print(f"FLAME2023_Open imported: {template.shape[0]} vertices, {faces.shape[0]} faces")
        print(f"Wrote {len(files)} binary files to {OUT}")
    finally:
        if tmp is not None:
            tmp.cleanup()


if __name__ == "__main__":
    main()
