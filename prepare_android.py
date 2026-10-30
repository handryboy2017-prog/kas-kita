# Dijalankan otomatis oleh GitHub Actions setelah folder android dibuat.
# 1) Menambah izin kamera di AndroidManifest  2) Membuat ikon aplikasi Kas Kita.
import os, re
from PIL import Image, ImageDraw

RES = 'android/app/src/main/res'
MANIFEST = 'android/app/src/main/AndroidManifest.xml'

m = open(MANIFEST).read()
if 'android.permission.CAMERA' not in m:
    m = m.replace('    <uses-permission android:name="android.permission.INTERNET" />',
        '    <uses-permission android:name="android.permission.INTERNET" />\n'
        '    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\n'
        '    <uses-permission android:name="android.permission.CAMERA" />\n'
        '    <uses-feature android:name="android.hardware.camera" android:required="false" />')
    assert 'android.permission.CAMERA' in m, 'manifest tidak cocok'
    open(MANIFEST, 'w').write(m)

NAVY = (29, 53, 87, 255); WHITE = (255, 255, 255, 255); GREEN = (79, 207, 146, 255); PALE = (214, 228, 245, 255)

def glyph(S):
    k = 4; W = S * k
    im = Image.new('RGBA', (W, W), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    u = W / 108.0
    d.rounded_rectangle([27*u, 38*u, 81*u, 76*u], radius=7*u, fill=WHITE)
    d.rounded_rectangle([27*u, 38*u, 81*u, 48*u], radius=5*u, fill=PALE)
    d.rounded_rectangle([60*u, 54*u, 84*u, 68*u], radius=5*u, fill=NAVY)
    d.ellipse([66*u, 58.5*u, 74*u, 66.5*u], fill=GREEN)
    d.ellipse([39*u, 24*u, 63*u, 48*u], fill=GREEN)
    d.ellipse([44*u, 29*u, 58*u, 43*u], outline=(255, 255, 255, 230), width=int(2.2*u))
    return im.resize((S, S), Image.LANCZOS)

for name, px in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    out = os.path.join(RES, 'mipmap-' + name)
    glyph(round(px * 108 / 48)).save(os.path.join(out, 'ic_launcher_foreground.png'))
    g = glyph(px * 2)
    g = g.crop((int(px*2*0.14), int(px*2*0.14), int(px*2*0.86), int(px*2*0.86))).resize((px, px), Image.LANCZOS)
    for fn, rad in (('ic_launcher.png', 0.22), ('ic_launcher_round.png', 0.5)):
        bg = Image.new('RGBA', (px*4, px*4), (0, 0, 0, 0)); dd = ImageDraw.Draw(bg)
        dd.rounded_rectangle([0, 0, px*4-1, px*4-1], radius=int(px*4*rad), fill=NAVY)
        bg = bg.resize((px, px), Image.LANCZOS)
        bg.alpha_composite(g)
        bg.save(os.path.join(out, fn))
open(os.path.join(RES, 'values', 'ic_launcher_background.xml'), 'w').write(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1D3557</color>\n</resources>\n')
print('Android siap')
