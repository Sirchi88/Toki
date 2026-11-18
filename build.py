"""Baut aus src/ eine einzige, eigenständige index.html (alles inline)."""
import base64
import pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'

html = (SRC / 'index.html').read_text(encoding='utf-8')
for marker, name in [('/*CSS*/', 'style.css'), ('/*CORE*/', 'core.js'), ('/*FX*/', 'fx.js'), ('/*QR*/', 'qr.js'), ('/*SYNC*/', 'sync.js'), ('/*REPORT*/', 'report.js'), ('/*PDF*/', 'pdf.js'), ('/*APP*/', 'app.js')]:
    html = html.replace(marker, (SRC / name).read_text(encoding='utf-8').replace('</script', '<\\/script'))
logo = 'data:image/svg+xml;base64,' + base64.b64encode((SRC / 'logo-icon.svg').read_bytes()).decode()
html = html.replace('__LOGO__', logo)
(ROOT / 'index.html').write_text(html, encoding='utf-8')
print(f'index.html gebaut ({len(html) // 1024} KB)')
