#!/usr/bin/env python3
"""
MBG Puzzles website - makes the pictures: the share picture of every language page
(assets/img/og-<lang>.png, 1200 x 630, shown when a link is posted in WhatsApp, Facebook, X ...),
the browser icons (favicon.svg, favicon-32.png) and the iPhone home-screen icon (apple-touch-icon.png).

Run it again after changing a headline in content/*.json:

    pip install pillow fonttools brotli
    python3 tools/make_images.py

The app icon itself (assets/img/icon-512.png, icon-192.png) is the one from the app.
"""
import io
import json
import os
import sys

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from build import CODES, META  # noqa: E402

IMG = os.path.join(ROOT, 'assets', 'img')
FONTS = os.path.join(ROOT, 'assets', 'fonts')
W, H = 1200, 630
INK, TEXT, MUTED, ACCENT = '#15202B', '#E6ECF1', '#9EABB8', '#5CC9BB'
CLUE = {'O': ('#1E7B4E', '#FFFFFF'), '?': ('#D69512', '#1B1406'), 'X': ('#677381', '#FFFFFF')}

_cache = {}


def font(name, size):
    """Loads a woff2 font from assets/fonts (converted in memory) at a size."""
    if name not in _cache:
        t = TTFont(os.path.join(FONTS, name + '.woff2'))
        t.flavor = None
        buf = io.BytesIO()
        t.save(buf)
        _cache[name] = buf.getvalue()
    return ImageFont.truetype(io.BytesIO(_cache[name]), size)


def text_font(lang, size, display=True):
    if lang == 'ar':
        return font('NotoKufiArabic-Bold' if display else 'NotoSansArabic-Bold', size)
    return font('Unbounded-Bold' if display else 'AtkinsonHyperlegible-Bold', size)


def draw_text(d, xy, text, f, fill, lang, anchor='la'):
    kw = {'direction': 'rtl', 'language': 'ar'} if lang == 'ar' else {}
    d.text(xy, text, font=f, fill=fill, anchor=anchor, **kw)


def is_arabic(t):
    return any('\u0600' <= ch <= '\u06ff' for ch in t)


def draw_runs(d, x, y, parts, size, fill, rtl):
    """Draws 'a · b · c' piece by piece, so Arabic and Latin pieces each get a font that has them."""
    sep = ' · '
    lat = font('AtkinsonHyperlegible-Bold', size)
    ara = font('NotoSansArabic-Bold', size)
    pieces = []
    for i, p in enumerate(parts):
        if i:
            pieces.append((sep, lat, {}))
        pieces.append((p, ara, {'direction': 'rtl', 'language': 'ar'}) if is_arabic(p) else (p, lat, {}))
    for text, f, kw in pieces:
        w = d.textlength(text, font=f, **kw)
        if rtl:
            d.text((x, y), text, font=f, fill=fill, anchor='ra', **kw)
            x -= w
        else:
            d.text((x, y), text, font=f, fill=fill, anchor='la', **kw)
            x += w


def wrap(d, text, f, width, lang):
    kw = {'direction': 'rtl', 'language': 'ar'} if lang == 'ar' else {}
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f, **kw) <= width or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    lines.append(cur)
    return lines


def tile(d, x, y, s, ch, clue, f):
    bg, fg = CLUE[clue]
    d.rounded_rectangle((x, y, x + s, y + s * 1.06), radius=s * .2, fill=bg)
    d.rounded_rectangle((x, y + s * 1.06 - 6, x + s, y + s * 1.06), radius=s * .2, fill=bg)
    kw = {'direction': 'rtl', 'language': 'ar'} if ('؀' <= ch <= 'ۿ') else {}
    d.text((x + s / 2, y + s * .53), ch, font=f, fill=fg, anchor='mm', **kw)


def og(lang, content, examples):
    c = content
    rtl = lang == 'ar'
    im = Image.new('RGB', (W, H), INK)
    d = ImageDraw.Draw(im)
    # the example game of this language, as on the page
    rows = examples['word'][lang]['rows']
    s, gap = 86, 11
    n = len(rows[0]['letters'])
    bw = n * s + (n - 1) * gap
    bx = (W - 70 - bw) if rtl else 70
    by = (H - (3 * s * 1.06 + 2 * gap)) / 2
    tf = font('NotoSansArabic-Bold', 44) if rtl else font('AtkinsonHyperlegibleMono-Bold', 44)
    for r, row in enumerate(rows):
        letters, clues = row['letters'], row['clue']
        if rtl:
            letters, clues = letters[::-1], clues[::-1]
        for i, (ch, cl) in enumerate(zip(letters, clues)):
            tile(d, bx + i * (s + gap), by + r * (s * 1.06 + gap), s, ch, cl, tf)
    # text column
    left = 70 + bw + 60 if not rtl else 70
    right = W - 70 if not rtl else W - 70 - bw - 60
    width = right - left
    x = right if rtl else left
    anchor = 'ra' if rtl else 'la'
    # brand
    mf = font('Unbounded-Bold', 20)
    bxx = (right - 3 * 36 + 4) if rtl else left
    for i, (ch, cl) in enumerate(zip('MBG', 'O?X')):
        tile(d, bxx + i * 36, 70, 32, ch, cl, mf)
    bn = font('Unbounded-Bold', 30)
    if rtl:
        d.text((bxx - 14, 70 + 17), 'MBG Puzzles', font=bn, fill=TEXT, anchor='rm')
    else:
        d.text((bxx + 3 * 36 + 10, 70 + 17), 'MBG Puzzles', font=bn, fill=TEXT, anchor='lm')
    # headline, as large as fits in 4 lines
    for size in (58, 54, 50, 46, 42, 38, 34):
        hf = text_font(lang, size)
        lines = wrap(d, c['hero']['h1'], hf, width, lang)
        if len(lines) <= 4:
            break
    lh = size * (1.45 if rtl else 1.16)
    total = lh * len(lines)
    y = max(150, (H - total) / 2 - 10)
    for i, line in enumerate(lines):
        draw_text(d, (x, y + i * lh), line, hf, TEXT, lang, anchor)
    # footer line: free · no ads · no limits
    draw_runs(d, x, H - 104, [p.strip() for p in c['hero']['eyebrow'].split('·')], 26, ACCENT, rtl)
    draw_runs(d, x, H - 66, [META[lang]['codeName'], META[lang]['wordName'], 'Android'], 22, MUTED, rtl)
    im.save(os.path.join(IMG, f'og-{lang}.png'), optimize=True)


def icons():
    icon = Image.open(os.path.join(IMG, 'icon-512.png')).convert('RGBA')
    icon.resize((180, 180), Image.LANCZOS).save(os.path.join(IMG, 'apple-touch-icon.png'), optimize=True)
    icon.resize((32, 32), Image.LANCZOS).save(os.path.join(IMG, 'favicon-32.png'), optimize=True)
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
           '<rect width="64" height="64" rx="14" fill="#15202B"/>'
           '<rect x="8" y="8" width="22" height="22" rx="5" fill="#1E7B4E"/>'
           '<rect x="34" y="8" width="22" height="22" rx="5" fill="#D69512"/>'
           '<rect x="8" y="34" width="22" height="22" rx="5" fill="#677381"/>'
           '<rect x="34" y="34" width="22" height="22" rx="5" fill="#1E7B4E"/></svg>\n')
    with open(os.path.join(IMG, 'favicon.svg'), 'w', encoding='utf-8') as f:
        f.write(svg)


def main():
    with open(os.path.join(ROOT, 'tools', 'examples.json'), encoding='utf-8') as f:
        examples = json.load(f)
    icons()
    for lang in CODES:
        with open(os.path.join(ROOT, 'content', lang + '.json'), encoding='utf-8') as f:
            og(lang, json.load(f), examples)
    print('Made', len(CODES), 'share pictures and the icons in', IMG)


if __name__ == '__main__':
    main()
