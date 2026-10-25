#!/usr/bin/env python3
"""Sella una versión nueva en la copia que se publica.

Cambia todos los ?v= de index.html y de los módulos de la raíz, el
<meta name="guagua-version"> y version.json por la misma cadena. Así cada
publicación pide archivos nuevos, y quien tenga el juego abierto con la
versión anterior se recarga sola (ver vigilarVersion en guagua.js).

Uso: python3 tools/sella.py <carpeta> <versión>
"""
import json
import pathlib
import re
import sys

carpeta, version = pathlib.Path(sys.argv[1]), sys.argv[2]
if not re.fullmatch(r'[0-9A-Za-z.\-]+', version):
    sys.exit(f'versión rara: {version!r}')

QUERY = re.compile(r'\?v=[0-9A-Za-z.\-]+')
META = re.compile(r'(<meta name="guagua-version" content=")[^"]*(")')

archivos = [carpeta / 'index.html', *sorted(carpeta.glob('*.js'))]
for f in archivos:
    viejo = f.read_text(encoding='utf-8')
    nuevo = QUERY.sub('?v=' + version, viejo)
    if f.name == 'index.html':
        nuevo, n = META.subn(r'\g<1>' + version + r'\g<2>', nuevo)
        if n != 1:
            sys.exit('index.html: falta el <meta name="guagua-version">')
    if nuevo != viejo:
        f.write_text(nuevo, encoding='utf-8')
        print(f'{f.name}: {len(QUERY.findall(viejo))} ?v= sellados')

(carpeta / 'version.json').write_text(json.dumps({'v': version}) + '\n', encoding='utf-8')
print('versión', version)
