# Dev helper: full-page screenshot slices for review. Usage: python3 qa/slices.py <png> [slice-height]
import sys
from PIL import Image
p = sys.argv[1]; H = int(sys.argv[2]) if len(sys.argv) > 2 else 1400
im = Image.open(p); w, h = im.size
for k, y in enumerate(range(0, h, H)): im.crop((0, y, w, min(h, y + H))).save(p.replace('.png', f'-{k}.png'))
print((h + H - 1) // H, 'slices', h)
