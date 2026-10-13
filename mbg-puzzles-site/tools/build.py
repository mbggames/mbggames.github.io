#!/usr/bin/env python3
"""
MBG Puzzles website - builds the static site into a folder (default: _site).

    python3 tools/build.py --site-url https://mbggames.github.io

Everything a search engine or an AI assistant reads is written into plain HTML: one page per
language (English at the root, the others in /sq/, /bs/, /de/, /es/, /fr/, /tr/, /pl/, /pt/, /ar/),
with hreflang links between them, structured data (schema.org JSON-LD), robots.txt that welcomes
AI crawlers, sitemap.xml, llms.txt and llms-full.txt. No JavaScript is needed to read anything.

Texts: content/<lang>.json · settings: site.json · look: assets/site.css
Only the Python standard library is used, so GitHub's build machine needs nothing extra.

    --site-url URL   the address of the published site (GitHub fills it in by itself)
    --out DIR        where to write the site (default: _site)
    --preview        links point at index.html files (for opening the files without a web server)
"""
import argparse
import datetime
import html
import json
import os
import re
import shutil
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# code, native name, English name, folder, hreflang, Play Store hl, Codebreaker, Word Puzzle,
# everyday words, accepted words (dictionary + extra guesses), letters of its own
# Game names come from the app (www/js/app/i18n-app.js); word counts from www/words/counts.json.
LANGS = [
    ('en', 'English', 'English', '', 'en', 'en', 'Codebreaker', 'Word Puzzle', 7292, 78948 + 56812, ''),
    ('sq', 'Shqip', 'Albanian', 'sq', 'sq', 'sq', 'Thyej kodin', 'Gjeje fjalën', 9045, 90388 + 2006, 'ç ë'),
    ('bs', 'Bosanski', 'Bosnian', 'bs', 'bs', 'bs', 'Razbij šifru', 'Pogodi riječ', 7144, 15934 + 40987, 'č ć đ š ž'),
    ('de', 'Deutsch', 'German', 'de', 'de', 'de', 'Knack den Code', 'Errate das Wort', 7703, 18217 + 41021, 'ä ö ü ß'),
    ('es', 'Español', 'Spanish', 'es', 'es', 'es', 'Descifra el código', 'Adivina la palabra', 7527, 25516 + 48673, 'ñ'),
    ('fr', 'Français', 'French', 'fr', 'fr', 'fr', 'Casse le code', 'Devine le mot', 7705, 26041 + 37565, ''),
    ('tr', 'Türkçe', 'Turkish', 'tr', 'tr', 'tr', 'Şifreyi Kır', 'Kelimeyi Bul', 6730, 10671 + 129495, 'ç ğ ı ö ş ü'),
    ('pl', 'Polski', 'Polish', 'pl', 'pl', 'pl', 'Złam szyfr', 'Odgadnij słowo', 6162, 53699 + 163159, 'ą ć ę ł ń ó ś ź ż'),
    ('pt', 'Português', 'Portuguese (Brazil)', 'pt', 'pt-BR', 'pt-BR', 'Quebre o código', 'Adivinhe a palavra', 7841, 80802 + 56216, ''),
    ('ar', 'العربية', 'Arabic', 'ar', 'ar', 'ar', 'اكسر الرمز', 'خمّن الكلمة', 7851, 24834 + 572984, 'ء ؤ ئ ة ى'),
]
CODES = [l[0] for l in LANGS]
META = {l[0]: dict(code=l[0], native=l[1], english=l[2], folder=l[3], hreflang=l[4], hl=l[5], codeName=l[6],
                   wordName=l[7], everyday=l[8], accepted=l[9], letters=l[10]) for l in LANGS}
SEP = {'en': ',', 'sq': ',', 'bs': '.', 'de': '.', 'es': '.', 'fr': ' ', 'tr': '.', 'pl': ' ', 'pt': '.', 'ar': ','}

ICONS = {
    'globe': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5z"/></svg>',
    'phone': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6"/><path d="M10.5 18h3"/></svg>',
    'down': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6"/><path d="M12 7.5v6.5"/><path d="M9.3 11.6 12 14.3l2.7-2.7"/></svg>',
    'clock': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    'mail': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4.5 7l7.5 6 7.5-6"/></svg>',
    'call': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.8h2.6l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5v2.6a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 4.6 5.9a2 2 0 0 1 2-2.1z"/></svg>',
    'chat': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.4 18.6z"/></svg>',
    'arrow': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M6 13l6 6 6-6"/></svg>',
}


def esc(s):
    return html.escape(str(s), quote=True)


def fmt(n, lang):
    return f'{n:,}'.replace(',', SEP[lang])


def floor_to(n, step):
    return n // step * step


def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


class Site:
    def __init__(self, site_url, preview):
        self.cfg = load_json(os.path.join(ROOT, 'site.json'))
        self.url = (site_url or self.cfg.get('siteUrl') or '').rstrip('/')
        if not re.match(r'^https?://', self.url):
            sys.exit('The site address must start with https:// (use --site-url or siteUrl in site.json).')
        self.preview = preview
        self.live = self.cfg.get('playStatus') == 'live'
        self.world = bool(self.cfg.get('worldList'))
        self.content = {c: load_json(os.path.join(ROOT, 'content', c + '.json')) for c in CODES}
        self.examples = load_json(os.path.join(ROOT, 'tools', 'examples.json'))
        self.today = datetime.date.today().isoformat()

    # ------------------------------------------------------------ addresses
    def page_url(self, code):
        folder = META[code]['folder']
        return self.url + '/' + (folder + '/' if folder else '')

    def rel_to(self, from_code, to_code):
        """Link from one language page to another, relative so it works under any path."""
        up = '../' if META[from_code]['folder'] else ''
        folder = META[to_code]['folder']
        target = up + (folder + '/' if folder else '')
        if self.preview:
            return target + 'index.html'
        return target or './'

    def play_link(self, code):
        u = self.cfg['playUrl']
        return u + ('&' if '?' in u else '?') + 'hl=' + META[code]['hl']

    def message(self, code):
        """The opening text of a WhatsApp message or e-mail, in the page's language, with the page's link."""
        return self.content[code]['contact']['waMessage'].replace('{url}', self.page_url(code))

    def mailto(self, code):
        return ('mailto:' + self.cfg['email'] + '?subject=MBG%20Puzzles&body='
                + urllib.parse.quote(self.message(code), safe=''))

    def whatsapp(self, code):
        return 'https://wa.me/' + self.cfg['whatsapp'] + '?text=' + urllib.parse.quote(self.message(code), safe='')

    def tel(self):
        return 'tel:' + re.sub(r'[^+0-9]', '', self.cfg['phone'])

    # --------------------------------------------------------------- inline
    def inline(self, text, code, rel):
        """Escapes text and turns [label](target) into links: play, privacy, mailto, whatsapp, tel, #id."""
        out, pos = [], 0
        for m in re.finditer(r'\[([^\]]+)\]\(([^)]+)\)', text):
            out.append(esc(text[pos:m.start()]))
            label, target = m.group(1), m.group(2)
            href = {
                'play': self.play_link(code),
                'privacy': rel + 'privacy.html' + ('' if code == 'en' else '#' + code),
                'mailto': self.mailto(code),
                'whatsapp': self.whatsapp(code),
                'tel': self.tel(),
            }.get(target, target)
            out.append(f'<a href="{esc(href)}">{esc(label)}</a>')
            pos = m.end()
        out.append(esc(text[pos:]))
        return ''.join(out)

    @staticmethod
    def plain(text):
        return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'\1', text)

    def answer(self, item):
        if 'a_soon' in item:
            return item['a_live'] if self.live else item['a_soon']
        if self.world and 'a_world' in item:
            return item['a_world']
        return item['a']

    # ---------------------------------------------------------------- tiles
    @staticmethod
    def tile(ch, clue, delay=None):
        cls = {'O': 'o', '?': 'q', 'X': 'x'}[clue]
        style = f' style="--d:{delay:.2f}s"' if delay is not None else ''
        return f'<span class="t {cls}"{style}>{esc(ch)}</span>'

    def board(self, rows, c, kind, animate_from=None):
        short = c['clues']['short']
        # Numbers are written left to right in every language (also in Arabic); words follow the page.
        out = ['<div class="board" dir="ltr">' if kind == 'code' else '<div class="board">']
        for r, row in enumerate(rows):
            label = row['w'] + ': ' + ', '.join(f'{ch} {short[cl]}' for ch, cl in zip(row['letters'], row['clue']))
            tiles = ''.join(self.tile(ch, cl, None if animate_from is None else animate_from + r * .55 + i * .09)
                            for i, (ch, cl) in enumerate(zip(row['letters'], row['clue'])))
            out.append(f'<div class="row" role="img" aria-label="{esc(label)}">{tiles}</div>')
        out.append('</div>')
        return ''.join(out)

    # ----------------------------------------------------------------- page
    def head(self, code, c, rel):
        m = META[code]
        url = self.page_url(code)
        t = c['meta']
        alts = ''.join(f'<link rel="alternate" hreflang="{META[o]["hreflang"]}" href="{esc(self.page_url(o))}">' for o in CODES)
        alts += f'<link rel="alternate" hreflang="x-default" href="{esc(self.page_url("en"))}">'
        og_alt = ''.join(f'<meta property="og:locale:alternate" content="{self.content[o]["ogLocale"]}">' for o in CODES if o != code)
        img = f'{self.url}/assets/img/og-{code}.png'
        return f'''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(t['title'])}</title>
<meta name="description" content="{esc(t['description'])}">
<meta name="keywords" content="{esc(t['keywords'])}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="author" content="MBG – Merkur Beqiri Games">
<link rel="canonical" href="{esc(url)}">
{alts}
<meta property="og:type" content="website">
<meta property="og:site_name" content="MBG Puzzles">
<meta property="og:title" content="{esc(t['title'])}">
<meta property="og:description" content="{esc(t['description'])}">
<meta property="og:url" content="{esc(url)}">
<meta property="og:image" content="{esc(img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(c['hero']['h1'])}">
<meta property="og:locale" content="{c['ogLocale']}">
{og_alt}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0E5D66">
<link rel="icon" href="{rel}assets/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="{rel}assets/img/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="{rel}assets/img/apple-touch-icon.png">
<link rel="preload" href="{rel}assets/fonts/Unbounded-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{rel}assets/site.css">
<script type="application/ld+json">{self.jsonld(code, c)}</script>'''

    def jsonld(self, code, c):
        m = META[code]
        url = self.page_url(code)
        site = self.url + '/'
        org = site + '#org'
        app = site + '#app'
        langs = [META[o]['hreflang'] for o in CODES]
        app_node = {
            '@type': 'MobileApplication', '@id': app, 'name': 'MBG Puzzles',
            'alternateName': [m['codeName'] + ' & ' + m['wordName'], 'MBG Codebreaker', 'MBG Word Puzzle'],
            'description': c['hero']['lead'],
            'url': site,
            'image': self.url + '/assets/img/icon-512.png',
            'operatingSystem': 'Android',
            'applicationCategory': 'GameApplication',
            'applicationSubCategory': 'Puzzle',
            'genre': ['Word game', 'Number game', 'Logic puzzle', 'Brain game'],
            'inLanguage': langs,
            'isAccessibleForFree': True,
            'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR'},
            'author': {'@id': org}, 'publisher': {'@id': org},
            'audience': {'@type': 'PeopleAudience', 'suggestedMinAge': 9},
            'hasPart': [
                {'@type': 'VideoGame', 'name': m['codeName'], 'alternateName': 'Codebreaker',
                 'description': c['games']['code']['text'], 'gamePlatform': 'Android', 'playMode': 'SinglePlayer',
                 'genre': ['Number guessing game', 'Code-breaking game', 'Bulls and Cows']},
                {'@type': 'VideoGame', 'name': m['wordName'], 'alternateName': 'Word Puzzle',
                 'description': c['games']['word']['text'], 'gamePlatform': 'Android', 'playMode': 'SinglePlayer',
                 'genre': ['Word guessing game', 'Word puzzle']},
            ],
        }
        if self.live:
            app_node['downloadUrl'] = self.play_link(code)
            app_node['installUrl'] = self.play_link(code)
            app_node['sameAs'] = [self.cfg['playUrl']]
        graph = [
            {'@type': 'Organization', '@id': org, 'name': 'MBG – Merkur Beqiri Games', 'alternateName': 'MBG',
             'url': site, 'logo': self.url + '/assets/img/icon-512.png', 'email': self.cfg['email'],
             'founder': {'@type': 'Person', 'name': 'Merkur Beqiri'},
             'address': {'@type': 'PostalAddress', 'addressCountry': 'XK'},
             'areaServed': 'Worldwide', 'slogan': c['footer']['based'],
             'contactPoint': {'@type': 'ContactPoint', 'contactType': 'customer support', 'email': self.cfg['email'],
                              'telephone': re.sub(r'[^+0-9]', '', self.cfg['phone']), 'availableLanguage': ['en', 'sq']}},
            {'@type': 'WebSite', '@id': site + '#website', 'url': site, 'name': 'MBG Puzzles',
             'publisher': {'@id': org}, 'inLanguage': langs},
            {'@type': 'WebPage', '@id': url + '#webpage', 'url': url, 'name': c['meta']['title'],
             'description': c['meta']['description'], 'inLanguage': m['hreflang'],
             'isPartOf': {'@id': site + '#website'}, 'about': {'@id': app},
             'primaryImageOfPage': f'{self.url}/assets/img/og-{code}.png', 'dateModified': self.today},
            app_node,
            {'@type': 'FAQPage', '@id': url + '#faq', 'inLanguage': m['hreflang'],
             'mainEntity': [{'@type': 'Question', 'name': q['q'],
                             'acceptedAnswer': {'@type': 'Answer', 'text': self.plain(self.answer(q))}}
                            for q in c['faq']['items']]},
        ]
        text = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, separators=(',', ':'))
        return text.replace('</', '<\\/')

    def header(self, code, c):
        nav = c['ui']['nav']
        links = ''.join(f'<a href="#{i}">{esc(nav[k])}</a>' for i, k in
                        [('games', 'games'), ('how-to-play', 'clues'), ('daily', 'daily'), ('languages', 'languages'), ('faq', 'faq')])
        items = ''.join(
            f'<li><a href="{esc(self.rel_to(code, o))}" hreflang="{META[o]["hreflang"]}" lang="{META[o]["hreflang"]}"'
            f'{" aria-current=" + chr(34) + "page" + chr(34) if o == code else ""}>{esc(META[o]["native"])}'
            f'<span lang="en">{esc(META[o]["english"].split(" (")[0])}</span></a></li>'
            for o in CODES)
        mark = ''.join(self.tile(ch, cl) for ch, cl in zip('MBG', 'O?X'))
        return f'''<a class="skip" href="#main">{esc(c['ui']['skip'])}</a>
<header class="top"><div class="wrap">
<a class="brand" href="{esc(self.rel_to(code, code))}" aria-label="MBG Puzzles"><span class="mark" aria-hidden="true">{mark.replace('class="t ', 'class="t m ')}</span><span>MBG Puzzles</span></a>
<nav class="sections" aria-label="MBG Puzzles">{links}</nav>
<details class="langs"><summary aria-label="{esc(c['ui']['langMenu'])}: {esc(META[code]['native'])}">{ICONS['globe']}<span>{esc(META[code]['native'])}</span></summary><ul>{items}</ul></details>
</div></header>'''

    def store(self, code, c, cls=''):
        if self.live:
            text = c['hero']['live']
            return f'<a class="store {cls}" href="{esc(self.play_link(code))}">{ICONS["down"]}<span><b>{esc(text)}</b></span></a>'
        return f'<p class="store soon {cls}">{ICONS["clock"]}<span><b>{esc(c["hero"]["soon"])}</b></span></p>'

    def hero(self, code, c):
        h = c['hero']
        ex = self.examples['word'][code]
        cx = self.examples['code']
        m = META[code]
        note = h['liveNote'] if self.live else h['soonNote']
        return f'''<section class="hero" aria-labelledby="h1"><div class="wrap">
<div>
<p class="eyebrow">{esc(h['eyebrow'])}</p>
<h1 id="h1">{esc(h['h1'])}</h1>
<p class="lead">{esc(h['lead'])}</p>
<div class="cta-row">{self.store(code, c)}<a class="ghost" href="#how-to-play">{esc(h['secondary'])}{ICONS['arrow']}</a></div>
<p class="cta-note">{esc(note)}</p>
</div>
<div class="stage">
<figure class="device word" aria-label="{esc(h['boardWord'])}"><figcaption class="device-head"><b>{esc(m['wordName'])}</b><span>{esc(m['native'])}</span></figcaption>{self.board(ex['rows'], c, 'word', .35)}</figure>
<figure class="device code" aria-label="{esc(h['boardCode'])}"><figcaption class="device-head"><b>{esc(m['codeName'])}</b><span class="count" dir="ltr">0–9</span></figcaption>{self.board(cx['rows'], c, 'code', 2.1)}</figure>
</div>
</div></section>'''

    def glance(self, code, c):
        g = c['glance']
        items = ''.join(f'<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k, v in g['items'])
        return f'''<section class="section band" aria-labelledby="glance"><div class="wrap">
<h2 id="glance">{esc(g['title'])}</h2>
<dl class="facts">{items}</dl>
</div></section>'''

    def games(self, code, c):
        g = c['games']
        m = META[code]
        word_tiles = self.examples['word'][code]['rows'][-1]['letters'][:4]

        def card(key, tiles):
            d = g[key]
            ticks = ''.join(f'<li>{esc(x)}</li>' for x in d['facts'])
            return f'''<article class="game"><div class="tiles" aria-hidden="true">{tiles}</div>
<h3>{esc(d['name'])}</h3><p class="tag">{esc(d['tag'])}</p><p>{esc(d['text'])}</p><ul class="ticks">{ticks}</ul></article>'''

        code_tiles = ''.join(self.tile(ch, cl) for ch, cl in zip('4271', 'O?XO'))
        wt = ''.join(self.tile(ch, cl) for ch, cl in zip(word_tiles, 'OX?O'))
        return f'''<section class="section" id="games" aria-labelledby="games-h"><div class="wrap">
<h2 id="games-h">{esc(g['title'])}</h2>
<p class="intro">{esc(g['intro'])}</p>
<div class="games">{card('code', code_tiles)}{card('word', wt)}</div>
</div></section>'''

    def clues(self, code, c):
        k = c['clues']
        ex = self.examples['word'][code]
        cx = self.examples['code']
        seen = []
        for ch in ex['rows'][-1]['letters']:
            if ch not in seen:
                seen.append(ch)
        legend = ''.join(f'<li>{self.tile(ch, cl)}<span>{esc(k["legend"][cl])}</span></li>'
                         for ch, cl in zip(seen, ['O', '?', 'X']))
        return f'''<section class="section band" id="how-to-play" aria-labelledby="clues-h"><div class="wrap">
<h2 id="clues-h">{esc(k['title'])}</h2>
<p class="intro">{esc(k['intro'])}</p>
<ul class="legend">{legend}</ul>
<div class="examples">
<figure class="example">{self.board(ex['rows'], c, 'word')}<figcaption><b>{esc(k['wordCaption'].replace('{secret}', ex['secret']))}</b><span>{esc(k['wordExplain'])}</span></figcaption></figure>
<figure class="example">{self.board(cx['rows'], c, 'code')}<figcaption><b>{esc(k['codeCaption'].replace('{secret}', cx['secret']))}</b><span>{esc(k['codeExplain'])}</span></figcaption></figure>
</div>
<p class="repeat">{esc(k['repeat'])}</p>
</div></section>'''

    def daily(self, code, c):
        d = c['daily']
        rows = self.examples['word'][code]['rows']
        emoji = {'O': '🟩', '?': '🟨', 'X': '⬛'}
        grid = '<br>'.join(''.join(emoji[x] for x in r['clue']) for r in rows)
        pts = ''.join(f'<li><span>{esc(p)}</span></li>' for p in d['points'])
        return f'''<section class="section" id="daily" aria-labelledby="daily-h"><div class="wrap daily">
<div><h2 id="daily-h">{esc(d['title'])}</h2><p class="intro">{esc(d['lead'])}</p><ul class="points">{pts}</ul></div>
<aside class="bubble" aria-label="{esc(d['shareTitle'])}"><p class="bubble-title">{esc(d['shareTitle'])}</p>
<p><b>{esc(d['shareHead'])}</b></p><p>{esc(d['shareLine'])}</p>
<p class="grid-emoji" role="img" aria-label="{esc(d['shareLegend'])}">{grid}</p>
<p class="legend-line">{esc(d['shareLegend'])}</p></aside>
</div></section>'''

    def features(self, code, c):
        f = c['features']
        items = ''.join(f'<div class="feature"><h3>{esc(i["h"])}</h3><p>{esc(i["p"])}</p></div>' for i in f['items'])
        return f'''<section class="section band" aria-labelledby="features-h"><div class="wrap">
<h2 id="features-h">{esc(f['title'])}</h2>
<div class="features">{items}</div>
</div></section>'''

    def audience(self, code, c):
        a = c['audience']
        items = ''.join(f'<div><h3>{esc(i["h"])}</h3><p>{esc(i["p"])}</p></div>' for i in a['items'])
        return f'''<section class="section" aria-labelledby="audience-h"><div class="wrap">
<h2 id="audience-h">{esc(a['title'])}</h2>
<div class="audience">{items}</div>
<p class="calm">{esc(a['calm'])}</p>
</div></section>'''

    def languages(self, code, c):
        L = c['languages']
        head = ''.join(f'<th scope="col">{esc(x)}</th>' for x in L['cols'])
        rows = []
        for o in CODES:
            m = META[o]
            here = ' class="here"' if o == code else ''
            cur = ' aria-current="page"' if o == code else ''
            name = m['native'] + ('' if o != 'pt' else ' (Brasil)')
            hl = m['hreflang']
            rows.append(
                f'<tr{here}><th scope="row" class="rowh">'
                f'<a href="{esc(self.rel_to(code, o))}" hreflang="{hl}"{cur}><bdi lang="{hl}">{esc(name)}</bdi></a></th>'
                f'<td><bdi lang="{hl}">{esc(m["codeName"])}</bdi></td><td><bdi lang="{hl}">{esc(m["wordName"])}</bdi></td>'
                f'<td class="n">{fmt(floor_to(m["everyday"], 100), code)}+</td>'
                f'<td class="n">{fmt(floor_to(m["accepted"], 1000), code)}+</td>'
                f'<td class="letters"><bdi lang="{hl}">{esc(m["letters"] or "–")}</bdi></td></tr>')
        return f'''<section class="section band" id="languages" aria-labelledby="languages-h"><div class="wrap">
<h2 id="languages-h">{esc(L['title'])}</h2>
<p class="intro">{esc(L['intro'])}</p>
<div class="table-scroll"><table><thead><tr>{head}</tr></thead><tbody>{''.join(rows)}</tbody></table></div>
<p class="note">{esc(L['note'])}</p>
</div></section>'''

    def faq(self, code, c, rel):
        f = c['faq']
        items = ''.join(f'<div class="qa"><h3>{esc(q["q"])}</h3><p>{self.inline(self.answer(q), code, rel)}</p></div>'
                        for q in f['items'])
        return f'''<section class="section" id="faq" aria-labelledby="faq-h"><div class="wrap">
<h2 id="faq-h">{esc(f['title'])}</h2>
<div class="faq">{items}</div>
</div></section>'''

    def cta(self, code, c):
        k = c['cta']
        ct = c['contact']
        text = k['live'] if self.live else k['soon']
        return f'''<section class="section cta" aria-labelledby="cta-h"><div class="wrap">
<div><h2 id="cta-h">{esc(k['title'])}</h2><p>{esc(text)}</p>
<p class="contact-lead"><b>{esc(ct['title'])}</b> {esc(ct['text'])}</p>
<ul class="contact">
<li><a href="{esc(self.tel())}">{ICONS['call']}<span class="k">{esc(ct['phone'])}</span><span class="v ltr">{esc(self.cfg['phone'])}</span></a></li>
<li><a href="{esc(self.whatsapp(code))}">{ICONS['chat']}<span class="k">{esc(ct['whatsapp'])}</span><span class="v">{esc(ct['waAction'])}</span></a></li>
<li><a href="{esc(self.mailto(code))}">{ICONS['mail']}<span class="k">{esc(ct['email'])}</span><span class="v ltr">{esc(self.cfg['email'])}</span></a></li>
</ul></div>
<div>{self.store(code, c)}</div>
</div></section>'''

    def footer(self, code, c, rel):
        ft = c['footer']
        langs = ''.join(f'<li><a href="{esc(self.rel_to(code, o))}" hreflang="{META[o]["hreflang"]}" lang="{META[o]["hreflang"]}">{esc(META[o]["native"])}</a></li>'
                        for o in CODES)
        privacy = rel + 'privacy.html' + ('' if code == 'en' else '#' + code)
        return f'''<footer><div class="wrap">
<div><h2>{esc(c['ui']['otherLangs'])}</h2><ul class="lang-links">{langs}</ul></div>
<div class="foot-row"><a href="{esc(privacy)}">{esc(ft['privacy'])}</a><span>© 2026 MBG · Merkur Beqiri Games</span><span>{esc(ft['based'])}</span><span class="ltr">{esc(self.cfg['phone'])}</span><span class="ltr">{esc(self.cfg['email'])}</span></div>
<p>{esc(ft['tm'])}</p>
<p>{esc(ft['fonts'])}</p>
</div></footer>'''

    @staticmethod
    def typography(code, text):
        """Non-breaking spaces where the language needs them: French before : ; ? ! and inside
        numbers (7 700), Polish inside numbers (6 100)."""
        if code in ('fr', 'pl'):
            text = re.sub(r'(\d) (\d{3})\b', '\\1\u00a0\\2', text)
        if code == 'fr':
            text = re.sub(r' ([:;?!»])', '\u00a0\\1', text)
            text = text.replace('« ', '«\u00a0').replace('n° ', 'n°\u00a0')
        return text

    def page(self, code, fragment=False):
        c = self.content[code]
        m = META[code]
        rel = '../' if m['folder'] else ''
        body = '\n'.join([
            self.header(code, c),
            '<main id="main">',
            self.hero(code, c), self.glance(code, c), self.games(code, c), self.clues(code, c),
            self.daily(code, c), self.features(code, c), self.audience(code, c), self.languages(code, c),
            self.faq(code, c, rel), self.cta(code, c),
            '</main>',
            self.footer(code, c, rel),
        ])
        body = self.typography(code, body)
        head = self.typography(code, self.head(code, c, rel))
        if fragment:   # for the claude.ai preview, which adds its own <html>, <head> and <body>
            return head + f'\n<div lang="{m["hreflang"]}" dir="{c["dir"]}">\n{body}\n</div>\n'
        return (f'<!doctype html>\n<html lang="{m["hreflang"]}" dir="{c["dir"]}">\n<head>\n{head}\n</head>\n'
                f'<body>\n{body}\n</body>\n</html>\n')

    # ------------------------------------------------------------ crawlers
    def robots(self):
        bots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai',
                'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Googlebot', 'Bingbot', 'Applebot', 'Applebot-Extended',
                'DuckAssistBot', 'Amazonbot', 'meta-externalagent', 'MistralAI-User', 'cohere-ai', 'YouBot', 'CCBot']
        lines = ['# MBG Puzzles – search engines and AI assistants are welcome to read, index and cite this site.', '',
                 'User-agent: *', 'Allow: /', '']
        for b in bots:
            lines += [f'User-agent: {b}', 'Allow: /', '']
        lines += [f'Sitemap: {self.url}/sitemap.xml', '']
        return '\n'.join(lines)

    def sitemap(self):
        out = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
        alts = ''.join(f'\n    <xhtml:link rel="alternate" hreflang="{META[o]["hreflang"]}" href="{esc(self.page_url(o))}"/>' for o in CODES)
        alts += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{esc(self.page_url("en"))}"/>'
        for o in CODES:
            out.append(f'  <url>\n    <loc>{esc(self.page_url(o))}</loc>\n    <lastmod>{self.today}</lastmod>'
                       f'\n    <priority>{"1.0" if o == "en" else "0.9"}</priority>{alts}\n  </url>')
        out.append(f'  <url>\n    <loc>{esc(self.url)}/privacy.html</loc>\n    <lastmod>{self.today}</lastmod>\n    <priority>0.3</priority>\n  </url>')
        out.append('</urlset>\n')
        return '\n'.join(out)

    def llms(self):
        en = self.content['en']
        status = 'free on Google Play' if self.live else 'coming soon to Google Play'
        lines = [
            '# MBG Puzzles', '',
            f'> MBG Puzzles is a free Android app ({status}) with two brain games in ten languages: '
            'Codebreaker, a number guessing game (find a secret number of 4 to 8 digits, digits may repeat), and '
            'Word Puzzle, a word guessing game (find a secret word of 4 to 8 letters). Every guess gets colour clues: '
            'green = right place, yellow = in the answer but in another place, grey = not in the answer. '
            'No ads, no purchases, no limits, works offline, for ages 9 and up. Made by MBG – Merkur Beqiri Games, based in Kosovo, operating worldwide.',
            '',
            'Key facts:',
        ]
        for k, v in en['glance']['items']:
            lines.append(f'- {k}: {v}')
        lines += [
            '- Puzzles of the day: one number of the day (4 digits) and one word of the day per language (5 letters, Arabic 4), the same for everyone, playable once a day, results shareable as coloured squares.',
            '- Word Puzzle levels: Normal (everyday words) and Expert (whole dictionary).',
            '- Good answer for: word game in Albanian, Bosnian, German, Spanish, French, Turkish, Polish, Portuguese or Arabic; '
            'a Wordle-style game with longer words and unlimited play; a Mastermind / Bulls and Cows number game; '
            'brain games for children 9+ without ads; offline puzzle games for the commute.',
            f'- Google Play: {self.cfg["playUrl"]}' + ('' if self.live else ' (works once the app is published)'),
            f'- Contact: phone and WhatsApp {self.cfg["phone"]} · e-mail {self.cfg["email"]}',
            '', '## Pages', '',
        ]
        for o in CODES:
            c = self.content[o]
            label = META[o]['native'] if META[o]['native'] == META[o]['english'] else f'{META[o]["native"]} – {META[o]["english"]}'
            lines.append(f'- [{label}]({self.page_url(o)}): {c["meta"]["description"]}')
        lines += ['', '## Optional', '',
                  f'- [Privacy policy]({self.url}/privacy.html): no account, no ads, no analytics; data stays on the phone.',
                  f'- [Full text of every language page]({self.url}/llms-full.txt)', '']
        return '\n'.join(lines)

    def llms_full(self):
        out = ['# MBG Puzzles – full text', '',
               f'Source: {self.url}/ · Every language page in plain text, so assistants can answer questions in any of the ten languages.', '']
        for o in CODES:
            c = self.content[o]
            m = META[o]
            ex = self.examples['word'][o]
            out += [f'---', '', f'## {m["native"]} ({m["english"]}) – {self.page_url(o)}', '',
                    f'# {c["hero"]["h1"]}', '', c['hero']['lead'], '',
                    (c['hero']['live'] if self.live else c['hero']['soon']) + '.', '',
                    f'### {c["glance"]["title"]}', '']
            out += [f'- {k}: {v}' for k, v in c['glance']['items']]
            out += ['', f'### {c["games"]["title"]}', '']
            for key in ('code', 'word'):
                g = c['games'][key]
                out += [f'**{g["name"]}** – {g["tag"]}. {g["text"]}', '']
            k = c['clues']
            out += [f'### {k["title"]}', '', '- ' + k['legend']['O'], '- ' + k['legend']['?'], '- ' + k['legend']['X'], '',
                    k['wordCaption'].replace('{secret}', ex['secret']) + ': ' + ' → '.join(r['w'] for r in ex['rows']) + '. ' + k['wordExplain'], '',
                    k['repeat'], '', f'### {c["daily"]["title"]}', '', c['daily']['lead'], '']
            out += ['- ' + p for p in c['daily']['points']]
            out += ['', f'### {c["features"]["title"]}', '']
            out += [f'- {i["h"]}: {i["p"]}' for i in c['features']['items']]
            out += ['', f'### {c["audience"]["title"]}', '']
            out += [f'- {i["h"]}: {i["p"]}' for i in c['audience']['items']]
            out += ['', f'### {c["faq"]["title"]}', '']
            for q in c['faq']['items']:
                out += [f'**{q["q"]}**', self.plain(self.answer(q)), '']
        out.append('')
        return '\n'.join(out)

    def not_found(self):
        links = ''.join(f'<li><a href="{esc(self.page_url(o))}" hreflang="{META[o]["hreflang"]}" lang="{META[o]["hreflang"]}">{esc(META[o]["native"])}</a></li>'
                        for o in CODES)
        mark = ''.join(self.tile(ch, cl) for ch, cl in zip('404', 'X?X'))
        return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found · MBG Puzzles</title><meta name="robots" content="noindex">
<link rel="icon" href="{self.url}/assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{self.url}/assets/site.css"></head>
<body><main class="section"><div class="wrap">
<div class="board" style="--tile:64px;margin-bottom:28px"><div class="row" aria-hidden="true">{mark}</div></div>
<h2>This page does not exist.</h2><p class="intro">MBG Puzzles: Codebreaker &amp; Word Puzzle. Choose your language:</p>
<ul class="lang-links">{links}</ul></div></main></body></html>
'''

    # ---------------------------------------------------------------- build
    def build(self, out):
        if os.path.isdir(out):
            shutil.rmtree(out)
        os.makedirs(out)
        shutil.copytree(os.path.join(ROOT, 'assets'), os.path.join(out, 'assets'))
        shutil.copy(os.path.join(ROOT, 'privacy.html'), os.path.join(out, 'privacy.html'))
        for code in CODES:
            folder = os.path.join(out, META[code]['folder'])
            os.makedirs(folder, exist_ok=True)
            with open(os.path.join(folder, 'index.html'), 'w', encoding='utf-8') as f:
                f.write(self.page(code))
        files = {
            'robots.txt': self.robots(), 'sitemap.xml': self.sitemap(), 'llms.txt': self.llms(),
            'llms-full.txt': self.llms_full(), '404.html': self.not_found(), '.nojekyll': '',
        }
        key = self.cfg.get('indexNowKey')
        if key:
            files[key + '.txt'] = key
        # Files put in extra/ (for example Google's or Bing's verification file) go to the top as they are.
        extra = os.path.join(ROOT, 'extra')
        if os.path.isdir(extra):
            for name in os.listdir(extra):
                if not name.startswith('.') and name != 'README.txt' and os.path.isfile(os.path.join(extra, name)):
                    shutil.copy(os.path.join(extra, name), os.path.join(out, name))
        for name, text in files.items():
            with open(os.path.join(out, name), 'w', encoding='utf-8') as f:
                f.write(text)
        if self.preview:   # the claude.ai preview wraps the main page itself
            with open(os.path.join(out, 'preview.html'), 'w', encoding='utf-8') as f:
                f.write(re.sub(r'<title>[^<]*</title>', '<title>MBG Puzzles Website</title>',
                               self.page('en', fragment=True), count=1))
        return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--site-url', default='')
    ap.add_argument('--out', default=os.path.join(ROOT, '_site'))
    ap.add_argument('--preview', action='store_true')
    a = ap.parse_args()
    site = Site(a.site_url, a.preview)
    out = site.build(a.out)
    print(f'Built {len(CODES)} language pages into {out} for {site.url}/')


if __name__ == '__main__':
    main()
