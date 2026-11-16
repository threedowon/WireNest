"""Create original demonstration meshes in millimeters (Z-up)."""
from pathlib import Path
import struct

ROOT = Path(__file__).parent

def box(x, y, z, w, d, h):
    v = [(x,y,z),(x+w,y,z),(x+w,y+d,z),(x,y+d,z),
         (x,y,z+h),(x+w,y,z+h),(x+w,y+d,z+h),(x,y+d,z+h)]
    faces = [(0,2,1),(0,3,2),(4,5,6),(4,6,7),(0,1,5),(0,5,4),
             (1,2,6),(1,6,5),(2,3,7),(2,7,6),(3,0,4),(3,4,7)]
    return [[v[i] for i in f] for f in faces]

def save(name, triangles):
    data = bytearray(b'WireNest original demonstration mesh'.ljust(80,b'\0'))
    data += struct.pack('<I', len(triangles))
    for tri in triangles:
        data += struct.pack('<12fH',0,0,0,*(n for v in tri for n in v),0)
    (ROOT/name).write_bytes(data)

# Open tray, with four mounting pedestals. Separate closed solids form this visual sample.
housing = box(0,0,0,150,100,3)
for args in [(0,0,3,150,3,29),(0,97,3,150,3,29),(0,3,3,3,94,29),(147,3,3,3,94,29)]:
    housing += box(*args)
for x,y in [(15,15),(15,80),(130,15),(130,80)]:
    housing += box(x,y,3,6,6,4)
save('housing.stl',housing)
save('controller-pcb.stl',box(0,0,0,55,65,1.6))
save('io-pcb.stl',box(0,0,0,45,50,1.6))
