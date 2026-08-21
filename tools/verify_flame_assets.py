#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'src' / 'assets' / 'flame2023-open'

EXPECTED = {
    'template.f32': 5023 * 3 * 4,
    'faces.u32': 9976 * 3 * 4,
    'joints.f32': 5 * 3 * 4,
    'weights.f32': 5023 * 5 * 4,
    'j_regressor.f32': 5 * 5023 * 4,
    'kintree.u32': 2 * 5 * 4,
    'posedirs.f32': 5023 * 3 * 36 * 4,
}

errors=[]
for name,size in EXPECTED.items():
    path=BASE/name
    if not path.exists(): errors.append(f'missing {name}')
    elif path.stat().st_size != size: errors.append(f'{name}: {path.stat().st_size} bytes, expected {size}')

for start in range(0,400,10):
    end=start+9
    name=f'shapedirs-{start:03d}-{end:03d}.f32'
    path=BASE/name
    expected=5023*3*10*4
    if not path.exists(): errors.append(f'missing {name}')
    elif path.stat().st_size != expected: errors.append(f'{name}: {path.stat().st_size} bytes, expected {expected}')

meta=BASE/'metadata.json'
if not meta.exists(): errors.append('missing metadata.json')
else:
    data=json.loads(meta.read_text(encoding='utf-8'))
    for key,value in {'vertexCount':5023,'faceCount':9976,'shapeComponents':400,'posedirsComponents':36,'jointCount':5}.items():
        if data.get(key) != value: errors.append(f'metadata {key}: {data.get(key)!r}, expected {value!r}')

if errors:
    raise SystemExit('FLAME asset verification failed:\n- ' + '\n- '.join(errors))
print('FLAME2023_Open assets verified: 5023 vertices, 9976 faces, 400 shape/expression components, 36 pose correctives.')
