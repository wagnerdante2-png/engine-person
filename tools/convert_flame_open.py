#!/usr/bin/env python3
"""Convert the official FLAME2023_Open pickle into browser-runtime binary assets.

Usage:
  python tools/convert_flame_open.py /path/to/flame2023_Open.pkl

The converter never invents geometry. It serializes the arrays from the official
FLAME2023_Open package into little-endian binary files and a manifest consumed by
src/assets/flame2023-open/loader.js.
"""
from __future__ import annotations
import argparse, json, pickle
from pathlib import Path
import numpy as np

VERTICES=5023
FACES=9976
SHAPE_COMPONENTS=400
POSE_COMPONENTS=36
JOINTS=5
CHUNK_COMPONENTS=50


def write_array(path: Path, value, dtype):
    a=np.asarray(value,dtype=dtype)
    a=np.ascontiguousarray(a)
    a.tofile(path)
    return {"bytes": path.stat().st_size, "shape": list(a.shape), "dtype": str(a.dtype)}


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("model", type=Path)
    ap.add_argument("--out", type=Path, default=Path("src/assets/flame2023-open/data"))
    args=ap.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)

    with args.model.open("rb") as fh:
        model=pickle.load(fh,encoding="latin1")

    v=np.asarray(model["v_template"])
    f=np.asarray(model["f"])
    shapedirs=np.asarray(model["shapedirs"])
    posedirs=np.asarray(model["posedirs"])
    weights=np.asarray(model["weights"])
    joints=np.asarray(model["J"])
    jreg=model["J_regressor"].toarray() if hasattr(model["J_regressor"],"toarray") else np.asarray(model["J_regressor"])
    kintree=np.asarray(model["kintree_table"],dtype=np.int64)
    kintree[kintree>2**31-1]=-1

    assert v.shape==(VERTICES,3),v.shape
    assert f.shape==(FACES,3),f.shape
    assert shapedirs.shape==(VERTICES,3,SHAPE_COMPONENTS),shapedirs.shape
    assert posedirs.shape==(VERTICES,3,POSE_COMPONENTS),posedirs.shape
    assert weights.shape==(VERTICES,JOINTS),weights.shape
    assert joints.shape==(JOINTS,3),joints.shape

    files={}
    files["v_template"]=write_array(args.out/"v_template.f32",v,"<f4")
    files["faces"]=write_array(args.out/"faces.u16",f,"<u2")
    files["weights"]=write_array(args.out/"weights.f32",weights,"<f4")
    files["joints"]=write_array(args.out/"joints.f32",joints,"<f4")
    files["j_regressor"]=write_array(args.out/"j_regressor.f32",jreg,"<f4")
    files["kintree"]=write_array(args.out/"kintree.i32",kintree,"<i4")
    files["posedirs"]=write_array(args.out/"posedirs.f32",posedirs,"<f4")

    shape_chunks=[]
    for start in range(0,SHAPE_COMPONENTS,CHUNK_COMPONENTS):
        stop=min(start+CHUNK_COMPONENTS,SHAPE_COMPONENTS)
        name=f"shapedirs_{start:03d}_{stop-1:03d}.f32"
        info=write_array(args.out/name,shapedirs[:,:,start:stop],"<f4")
        shape_chunks.append({"start":start,"count":stop-start,"file":name,**info})

    manifest={
        "source":"FLAME2023_Open",
        "license":"CC BY 4.0",
        "vertexCount":VERTICES,
        "faceCount":FACES,
        "jointCount":JOINTS,
        "shapeComponents":300,
        "expressionComponents":100,
        "allShapeComponents":SHAPE_COMPONENTS,
        "poseComponents":POSE_COMPONENTS,
        "expressionLayout":"last_100",
        "bounds":{"min":v.min(axis=0).tolist(),"max":v.max(axis=0).tolist()},
        "files":files,
        "shapeChunks":shape_chunks,
    }
    (args.out/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
    print(f"FLAME runtime assets written to {args.out}")
    print(f"vertices={VERTICES} faces={FACES} shapes={SHAPE_COMPONENTS} pose={POSE_COMPONENTS}")

if __name__=="__main__":
    main()
