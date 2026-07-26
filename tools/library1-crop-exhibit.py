#!/usr/bin/env python3
"""CoupleMed - Library 1: recorta a midia da janela "Exhibit Display" dos prints.

Ver LIBRARY1_ADD_CONTENT.md 12.1. Os prints EN chegam com a janela do visualizador
em volta (header cinza "Exhibit Display" + barra de icones embaixo); as PT costumam
vir ja recortadas. Este script tira a moldura sem reduzir resolucao (7.5):

  1. acha a BANDA de cinza uniforme do header (>=12 linhas, run > 45% da largura)
  2. corpo = abaixo do header, dentro dos x da banda, ate a linha divisoria fina
     que separa o conteudo da barra de icones
  3. bbox do conteudo nao-branco por PROJECAO (linha/coluna so conta com massa,
     senao a sombra da janela faz o bbox virar a janela inteira)

Uso:
    python3 tools/library1-crop-exhibit.py <pasta-dos-prints> <pasta-saida> <N>...
    # N = o numero do print ("Imagem N.png")

SEMPRE conferir o resultado numa folha de contato antes de publicar: prints com
notificacao do sistema sobreposta, ou com a janela em posicao atipica, falham ou
saem torto e precisam de recorte manual.
"""
import sys, os
from PIL import Image

def is_gray(c, lo, hi, tol=10):
    r, g, b = c
    return lo <= r <= hi and abs(r-g) <= tol and abs(g-b) <= tol

def gray_run(px, y, w, lo, hi, step=2):
    best = (0, 0, 0); cur = 0; start = 0
    for x in range(0, w, step):
        if is_gray(px[x, y], lo, hi):
            if cur == 0: start = x
            cur += step
            if cur > best[0]: best = (cur, start, x)
        else:
            cur = 0
    return best

def find_header(px, w, h):
    """primeira banda vertical de >=12 linhas com run de cinza > 45% da largura"""
    band = None
    y = 0
    while y < int(h * 0.5):
        ln, x0, x1 = gray_run(px, y, w, 200, 236)
        if ln > w * 0.45:
            ys = y; xs, xe = x0, x1; n = 0
            while y < h:
                ln2, a, b = gray_run(px, y, w, 200, 236)
                if ln2 < w * 0.40: break
                xs = min(xs, a); xe = max(xe, b); n += 1; y += 1
            if n >= 12:
                band = (xs, xe, ys, ys + n)
                break
        y += 1
    return band

def nonwhite_count(px, y, x0, x1, step=3, thr=242):
    n = 0
    for x in range(x0, x1, step):
        if min(px[x, y]) < thr: n += 1
    return n

def is_divider(px, y, x0, x1, step=3):
    """linha horizontal fina, cinza clara, atravessando a janela"""
    tot = 0; g = 0
    for x in range(x0, x1, step):
        tot += 1
        if is_gray(px[x, y], 200, 246, 8): g += 1
    return g > tot * 0.80

def crop(path, out):
    im = Image.open(path).convert('RGB'); w, h = im.size; px = im.load()
    band = find_header(px, w, h)
    if not band: return None, 'sem header'
    x0, x1, _, yh = band
    x0, x1 = x0 + 4, x1 - 4

    # topo do corpo: primeira linha branca depois do header
    ytop = None
    for y in range(yh, h):
        if nonwhite_count(px, y, x0, x1) < (x1 - x0) / 3 * 0.05:
            ytop = y; break
    if ytop is None: return None, 'sem corpo'

    # base: primeira divisoria fina na metade inferior da janela
    ybot = h - 1
    for y in range(ytop + int((h - ytop) * 0.45), h):
        if is_divider(px, y, x0, x1):
            ybot = y - 3; break

    # bbox do conteudo por PROJECAO: uma linha/coluna so conta se tiver massa
    ax0, ax1 = x0 + 12, x1 - 12
    THR = 236          # nao-branco de verdade
    MIN_ROW = 10       # pixels por linha para valer como conteudo
    rows = []
    for y in range(ytop, ybot):
        c = sum(1 for x in range(ax0, ax1) if min(px[x, y]) < THR)
        rows.append(c)
    ys = ye = None
    for i, c in enumerate(rows):
        if c >= MIN_ROW:
            if ys is None: ys = ytop + i
            ye = ytop + i
    if ys is None: return None, 'conteudo vazio'
    cols = []
    for x in range(ax0, ax1):
        c = sum(1 for y in range(ys, ye + 1) if min(px[x, y]) < THR)
        cols.append(c)
    xs = xe = None
    for i, c in enumerate(cols):
        if c >= 8:
            if xs is None: xs = ax0 + i
            xe = ax0 + i
    if xs is None: return None, 'conteudo vazio'
    m = 6
    box = (max(x0, xs - m), max(ytop, ys - m), min(x1, xe + m + 1), min(ybot, ye + m + 1))
    img = im.crop(box)
    img.save(out)
    return img, f'{img.width}x{img.height}'

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    src, outdir = sys.argv[1], sys.argv[2]
    os.makedirs(outdir, exist_ok=True)
    for n in sys.argv[3:]:
        p = os.path.join(src, f'Imagem {n}.png')
        try:
            img, info = crop(p, os.path.join(outdir, f'{n}.png'))
        except Exception as e:
            print(f'{n}: ERRO {e}'); continue
        print(f'{n}: {info}' if img else f'{n}: FALHOU ({info})')
