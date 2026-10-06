# Writes web versions of every JPEG in assets/img, then run: node tools/build-data.mjs
#   name.webp     full size (long edge up to 2000 px), for large screens
#   name-sm.webp  1280 px, for phones and small screens
#   name-th.webp  360 px thumbnail, for the ImageNet mosaic and the rewind flicker
from PIL import Image
import glob, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'img')
for f in sorted(glob.glob(os.path.join(root, '*.jpg'))):
    base = f[:-4]
    im = Image.open(f).convert('RGB')
    for suffix, edge, q in (('', None, 78), ('-sm', 1280, 76), ('-th', 360, 70)):
        out = base + suffix + '.webp'
        if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(f):
            continue
        v = im.copy()
        if edge: v.thumbnail((edge, edge), Image.LANCZOS)
        v.save(out, 'WEBP', quality=q, method=6)
