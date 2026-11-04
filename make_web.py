# Dijalankan setelah "npm run build": menambah ikon, manifest, cache offline (PWA) ke folder dist.
import os, json, hashlib, re
from PIL import Image, ImageDraw

D = 'dist'
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

def icon(px, zoom=0.72):
    # latar penuh navy (iOS membulatkan sendiri), gambar dibesarkan sedikit
    g = glyph(px * 2)
    c = int(px * 2 * (1 - zoom) / 2)
    g = g.crop((c, c, px * 2 - c, px * 2 - c)).resize((px, px), Image.LANCZOS)
    bg = Image.new('RGBA', (px, px), NAVY)
    bg.alpha_composite(g)
    return bg.convert('RGB')

icon(180).save(f'{D}/apple-touch-icon.png')
icon(192).save(f'{D}/icon-192.png')
icon(512).save(f'{D}/icon-512.png')
icon(512, 0.62).save(f'{D}/icon-maskable-512.png')
icon(32, 0.9).save(f'{D}/favicon.png')

json.dump({
    "name": "Kas Kita", "short_name": "Kas Kita", "lang": "id",
    "start_url": "./", "scope": "./", "display": "standalone",
    "background_color": "#1d3557", "theme_color": "#1d3557",
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
    ]
}, open(f'{D}/manifest.webmanifest', 'w'), indent=1)

# daftar file untuk disimpan offline
files = []
for root, _, fs in os.walk(D):
    for f in fs:
        p = os.path.relpath(os.path.join(root, f), D).replace(os.sep, '/')
        if p != 'sw.js':
            files.append(p)
files.sort()
h = hashlib.sha1()
for p in files:
    h.update(p.encode()); h.update(open(os.path.join(D, p), 'rb').read())
ver = h.hexdigest()[:10]
pre = ['./'] + files

sw = """const CACHE = 'kaskita-%s';
const PRE = %s;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith('kaskita-')).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => hit || fetch(r).catch(() => r.mode === 'navigate' ? caches.match('./') : Response.error())));
});
""" % (ver, json.dumps(pre))
open(f'{D}/sw.js', 'w').write(sw)

html = open(f'{D}/index.html').read()
tags = ('<link rel="manifest" href="manifest.webmanifest">\n'
        '<link rel="icon" type="image/png" href="favicon.png">\n'
        '<link rel="apple-touch-icon" href="apple-touch-icon.png">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n'
        '<meta name="mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-title" content="Kas Kita">\n'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n')
reg = ("<script>if('serviceWorker' in navigator&&window.isSecureContext){addEventListener('load',function(){"
       "navigator.serviceWorker.register('sw.js').catch(function(){})})}</script>\n")
assert '</head>' in html
html = html.replace('</head>', tags + reg + '</head>', 1)
open(f'{D}/index.html', 'w').write(html)
print('PWA siap, versi cache', ver, len(pre), 'file')
