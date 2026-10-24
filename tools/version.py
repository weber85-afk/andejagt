# Giver alle spillets filer et versionsnummer i index.html (fx main.js?v=1a2b3c4d),
# så browseren altid henter den nyeste udgave efter en opdatering.
# Kør den før hver commit, der skal online:  python3 tools/version.py
import hashlib
import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent
index = root / 'index.html'
html = index.read_text(encoding='utf-8')


def version(path):
    return hashlib.md5(path.read_bytes()).hexdigest()[:8]


imports = {
    'three': 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
    'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/',
}
for file in sorted((root / 'src').glob('*.js')):
    imports[f'./src/{file.name}'] = f'./src/{file.name}?v={version(file)}'

block = json.dumps({'imports': imports}, indent=2, ensure_ascii=False)
block = '\n'.join('    ' + line for line in block.split('\n'))
html = re.sub(r'(<script type="importmap">\n).*?(\n  </script>)', lambda m: m.group(1) + block + m.group(2), html, flags=re.S)
html = re.sub(r'href="style\.css(\?v=[0-9a-f]+)?"', f'href="style.css?v={version(root / "style.css")}"', html)
index.write_text(html, encoding='utf-8')
print(f'Versioner opdateret for {len(imports) - 2} filer')
