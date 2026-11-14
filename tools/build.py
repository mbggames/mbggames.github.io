#!/usr/bin/env python3
"""
MBG Games website (mbggames.com) - builds the static site into a folder (default: _site).

    python3 tools/build.py --site-url https://mbggames.com

What it makes:
  /                  the MBG Games home page: MBG Puzzles and Who Am I        (content/home.json)
  /puzzles/          MBG Puzzles in English, /puzzles/sq/ ... /puzzles/ko/ in the other ten languages
  /puzzles/play/     the web preview of the game (folder play/)
  /whoami/           Who Am I: the folder whoami/ as it is, or a "coming soon" page while it is missing
  /privacy.html      the privacy policy of MBG Puzzles (the address Google Play knows)
  /sq/ ... /play/    old addresses of the site: they send visitors on to /puzzles/...
Everything a search engine or an AI assistant reads is written into plain HTML, with hreflang links
between the languages, structured data (schema.org JSON-LD), robots.txt that welcomes AI crawlers,
sitemap.xml, llms.txt and llms-full.txt. No JavaScript is needed to read anything.

Files ending in .b64 (base64 text, for uploads that only take text) are written out decoded,
without the .b64: assets/img/og-ko.png.b64 becomes assets/img/og-ko.png.

Texts: content/<lang>.json, content/home.json · settings: site.json · look: assets/site.css
Only the Python standard library is used, so GitHub's build machine needs nothing extra.

    --site-url URL   the address of the published site (GitHub fills it in by itself)
    --out DIR        where to write the site (default: _site)
    --preview        links point at index.html files (for opening the files without a web server)
"""
import argparse
import base64
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
    ('sq', 'Shqip', 'Albanian', 'sq', 'sq', 'sq', 'Zhblloko kodin', 'Gjeje fjalën', 9045, 90388 + 2006, 'ç ë'),
    ('bs', 'Bosanski', 'Bosnian', 'bs', 'bs', 'bs', 'Razbij šifru', 'Pogodi riječ', 7144, 15934 + 40987, 'č ć đ š ž'),
    ('de', 'Deutsch', 'German', 'de', 'de', 'de', 'Knack den Code', 'Errate das Wort', 7703, 18217 + 41021, 'ä ö ü ß'),
    ('es', 'Español', 'Spanish', 'es', 'es', 'es', 'Descifra el código', 'Adivina la palabra', 7527, 25516 + 48673, 'ñ'),
    ('fr', 'Français', 'French', 'fr', 'fr', 'fr', 'Casse le code', 'Devine le mot', 7705, 26041 + 37565, ''),
    ('tr', 'Türkçe', 'Turkish', 'tr', 'tr', 'tr', 'Şifreyi Kır', 'Kelimeyi Bul', 6730, 10671 + 129495, 'ç ğ ı ö ş ü'),
    ('pl', 'Polski', 'Polish', 'pl', 'pl', 'pl', 'Złam szyfr', 'Odgadnij słowo', 6162, 53699 + 163159, 'ą ć ę ł ń ó ś ź ż'),
    ('pt', 'Português', 'Portuguese (Brazil)', 'pt', 'pt-BR', 'pt-BR', 'Quebre o código', 'Adivinhe a palavra', 7841, 80802 + 56216, ''),
    ('ar', 'العربية', 'Arabic', 'ar', 'ar', 'ar', 'اكسر الرمز', 'خمّن الكلمة', 7851, 24834 + 572984, 'ء ؤ ئ ة ى'),
    ('ko', '한국어', 'Korean', 'ko', 'ko', 'ko', '암호 풀기', '단어 퍼즐', 9377, 23018 + 27958, 'ㄲ ㄸ ㅃ ㅆ ㅉ ㅐ ㅔ'),
]
SECTION = 'puzzles'          # MBG Puzzles lives in mbggames.com/puzzles/

CODES = [l[0] for l in LANGS]
META = {l[0]: dict(code=l[0], native=l[1], english=l[2], folder=l[3], hreflang=l[4], hl=l[5], codeName=l[6],
                   wordName=l[7], everyday=l[8], accepted=l[9], letters=l[10]) for l in LANGS}
SEP = {'en': ',', 'sq': ',', 'bs': '.', 'de': '.', 'es': '.', 'fr': ' ', 'tr': '.', 'pl': ' ', 'pt': '.', 'ar': ',', 'ko': ','}

# The web preview of the game (folder play/, switch "webPreview" in site.json): button texts.
WEB_PREVIEW = {
    'en': ('Web preview', 'Play in your browser'), 'sq': ('Version prove', 'Luaj në shfletues'),
    'bs': ('Web verzija za probu', 'Igraj u pregledniku'), 'de': ('Web-Vorschau', 'Im Browser spielen'),
    'es': ('Vista previa web', 'Jugar en el navegador'), 'fr': ('Aperçu web', 'Jouer dans le navigateur'),
    'tr': ('Web önizlemesi', 'Tarayıcıda oyna'), 'pl': ('Wersja próbna', 'Graj w przeglądarce'),
    'pt': ('Prévia na web', 'Jogar no navegador'), 'ar': ('نسخة تجريبية', 'العب في المتصفح'),
    'ko': ('웹 미리보기', '브라우저에서 플레이'),
}

# Main menu on every page: Home (MBG Games) · Puzzles · Who Am I? · Contact
NAV = {
    'en': ('Home', 'Puzzles'), 'sq': ('Ballina', 'Enigmat'), 'bs': ('Početna', 'Zagonetke'), 'de': ('Startseite', 'Rätsel'),
    'es': ('Inicio', 'Puzles'), 'fr': ('Accueil', 'Énigmes'), 'tr': ('Ana sayfa', 'Bulmacalar'), 'pl': ('Strona główna', 'Łamigłówki'),
    'pt': ('Início', 'Quebra-cabeças'), 'ar': ('الرئيسية', 'الألغاز'), 'ko': ('홈', '퍼즐'),
}

ICONS = {
    'home': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h5v-6h3v6h5V9.5"/></svg>',
    'globe': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5z"/></svg>',
    'phone': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6"/><path d="M10.5 18h3"/></svg>',
    'down': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6"/><path d="M12 7.5v6.5"/><path d="M9.3 11.6 12 14.3l2.7-2.7"/></svg>',
    'clock': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    'mail': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4.5 7l7.5 6 7.5-6"/></svg>',
    'call': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.8h2.6l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5v2.6a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 4.6 5.9a2 2 0 0 1 2-2.1z"/></svg>',
    'chat': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.4 18.6z"/></svg>',
    'play': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M10.2 8.6v6.8l5.3-3.4z"/></svg>',
    'user': '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.7"/><path d="M4.8 20c.8-3.9 3.6-6 7.2-6s6.4 2.1 7.2 6"/><path d="M17.5 4.5l1.5 1.5 3-3"/></svg>',
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
        self.home = load_json(os.path.join(ROOT, 'content', 'home.json'))
        self.examples = load_json(os.path.join(ROOT, 'tools', 'examples.json'))
        self.today = datetime.date.today().isoformat()

    # ------------------------------------------------------------ addresses
    def page_url(self, code):
        folder = META[code]['folder']
        return self.url + '/' + SECTION + '/' + (folder + '/' if folder else '')

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

    def test_whatsapp(self, code):
        return 'https://wa.me/' + self.cfg['whatsapp'] + '?text=' + urllib.parse.quote(self.content[code]['test']['waMessage'], safe='')

    def test_mailto(self, code):
        return ('mailto:' + self.cfg['email'] + '?subject=' + urllib.parse.quote('MBG Puzzles – test', safe='')
                + '&body=' + urllib.parse.quote(self.content[code]['test']['waMessage'], safe=''))

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
        app = self.page_url('en') + '#app'
        langs = [META[o]['hreflang'] for o in CODES]
        app_node = {
            '@type': 'MobileApplication', '@id': app, 'name': 'MBG Puzzles',
            'alternateName': [m['codeName'] + ' & ' + m['wordName'], 'MBG Codebreaker', 'MBG Word Puzzle'],
            'description': c['hero']['lead'],
            'url': self.page_url('en'),
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
            {'@type': 'WebSite', '@id': site + '#website', 'url': site, 'name': 'MBG Games',
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
<a class="brand" href="{esc(self.rel_root(code))}" aria-label="MBG Games – {esc(NAV[code][0])}"><span class="mark" aria-hidden="true">{mark.replace('class="t ', 'class="t m ')}</span><span>MBG Games</span></a>
{self.site_nav(code, 2 if META[code]['folder'] else 1, 'puzzles')}
<nav class="sections sub" aria-label="{esc(NAV[code][1])}">{links}</nav>
<details class="langs"><summary aria-label="{esc(c['ui']['langMenu'])}: {esc(META[code]['native'])}">{ICONS['globe']}<span>{esc(META[code]['native'])}</span></summary><ul>{items}</ul></details>
</div></header>'''

    def site_nav(self, code, depth, active):
        """The same main menu on every page: Home (MBG Games) · Puzzles · Who Am I? · Contact."""
        h = self.home[code]
        home, puzzles = NAV.get(code, NAV['en'])
        items = [('home', self.link(depth, self.hub_path(code)), ICONS['home'] + f'<span>{esc(home)}</span>'),
                 ('puzzles', self.link(depth, self.puzzles_path(code)), f'<span>{esc(puzzles)}</span>'),
                 ('whoami', self.link(depth, self.whoami_path(code)), f'<span>{esc(h["games"]["whoami"]["name"])}</span>'),
                 ('contact', ('' if active == 'home' else self.link(depth, self.hub_path(code))) + '#contact', f'<span>{esc(h["nav"]["contact"])}</span>')]
        links = ''.join(f'<a href="{esc(href)}"{" aria-current=" + chr(34) + "page" + chr(34) if key == active else ""}>{label}</a>'
                        for key, href, label in items)
        return f'<nav class="site-nav" aria-label="MBG Games">{links}</nav>'

    def rel_root(self, code):
        """Relative link from a language page of MBG Puzzles to the MBG Games home page in the same language."""
        return self.link(2 if META[code]['folder'] else 1, self.hub_path(code))

    def tester_button(self, code, c):
        """Hero button that jumps to the tester box, while the app is in its test."""
        if self.live or not self.cfg.get('testUrl'):
            return ''
        return f'<a class="ghost tester-btn" href="#testers">{ICONS["user"]}{esc(c["test"]["title"])}</a>'

    def tester_box(self, code, c):
        """Become a tester: 1. send your Gmail address, 2. register on Google Play."""
        if self.live or not self.cfg.get('testUrl'):
            return ''
        t = c['test']
        return f'''<div class="tester" id="testers">
<h3>{ICONS['user']}{esc(t['title'])}</h3>
<ol>
<li><p>{esc(t['step1'])}</p>
<div class="tester-actions"><a class="tbtn" href="{esc(self.test_whatsapp(code))}">{ICONS['chat']}<span>{esc(t['join'])} · WhatsApp</span></a>
<a class="tbtn ghosty" href="{esc(self.test_mailto(code))}">{ICONS['mail']}<span>{esc(t['email'])}</span></a></div></li>
<li><p>{esc(t['step2'])}</p>
<div class="tester-actions"><a class="tbtn ghosty" href="{esc(self.cfg['testUrl'])}">{ICONS['down']}<span>{esc(t['testers'])}</span></a></div></li>
</ol>
</div>'''

    def launch_box(self, code, c):
        """Public launch announcement in each supported language."""
        if not self.live or 'launch' not in c:
            return ''
        k = c['launch']
        langs = c['glance']['items'][3][1]
        return f'''<div class="tester launch" id="launch">
<h3>{ICONS['down']}{esc(k['title'])}</h3>
<p>{esc(k['p1'].replace('{langs}', langs))}</p>
<p>{esc(k['p2'])}</p>
<p class="early"><b>{esc(k['p3'])}</b></p>
</div>'''

    def launch_play(self, code):
        m = re.search(r'href="([^"]*)"', self.web(code))
        if not m:
            return ''
        return f'<div class="tester-actions"><a class="tbtn" href="{m.group(1)}">{ICONS["play"]}<span>{esc(WEB_PREVIEW.get(code, WEB_PREVIEW["en"])[1])}</span></a></div>'

    def whoami_tester(self, code, w, cls=''):
        """Become a tester of Who Am I?: send your Gmail address by WhatsApp or e-mail."""
        if self.whoami_ready() or 'testTitle' not in w:
            return ''
        msg = w['testMsg'].replace('{name}', w['name'])
        wa = 'https://wa.me/' + self.cfg['whatsapp'] + '?text=' + urllib.parse.quote(msg, safe='')
        mail = ('mailto:' + self.cfg['email'] + '?subject=' + urllib.parse.quote(w['name'] + ' – test', safe='')
                + '&body=' + urllib.parse.quote(msg, safe=''))
        return f'''<div class="tester {cls}" id="testers">
<h3>{ICONS['user']}{esc(w['testTitle'])}</h3>
<p>{esc(w['testText'].replace('{name}', w['name']))}</p>
<div class="tester-actions"><a class="tbtn" href="{esc(wa)}">{ICONS['chat']}<span>{esc(w['testTitle'])} · WhatsApp</span></a>
<a class="tbtn ghosty" href="{esc(mail)}">{ICONS['mail']}<span>E-mail</span></a></div>
</div>'''

    def store(self, code, c, cls=''):
        if self.live:
            text = c['hero']['live']
            return f'<a class="store {cls}" href="{esc(self.play_link(code))}">{ICONS["down"]}<span><b>{esc(text)}</b></span></a>'
        return f'<p class="store soon {cls}">{ICONS["clock"]}<span><b>{esc(c["hero"]["soon"])}</b></span></p>'

    def web(self, code):
        """The "Play in your browser" button (web preview in play/), while it is switched on."""
        if not self.cfg.get('webPreview', True) or not os.path.isdir(os.path.join(ROOT, 'play')):
            return ''
        small, label = WEB_PREVIEW.get(code, WEB_PREVIEW['en'])
        href = ('' if code == 'en' else '../') + 'play/' + ('index.html' if self.preview else '') + '?lang=' + code
        return f'<a class="store web" href="{esc(href)}">{ICONS["play"]}<span><small>{esc(small)}</small><b>{esc(label)}</b></span></a>'

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
<div class="cta-row">{self.web(code)}{self.store(code, c)}{self.tester_button(code, c)}<a class="ghost" href="#how-to-play">{esc(h['secondary'])}{ICONS['arrow']}</a></div>
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
{self.launch_box(code, c)}{self.tester_box(code, c)}
<p class="contact-lead"><b>{esc(ct['title'])}</b> {esc(ct['text'])}</p>
<ul class="contact">
<li><a href="{esc(self.tel())}">{ICONS['call']}<span class="k">{esc(ct['phone'])}</span><span class="v ltr">{esc(self.cfg['phone'])}</span></a></li>
<li><a href="{esc(self.whatsapp(code))}">{ICONS['chat']}<span class="k">{esc(ct['whatsapp'])}</span><span class="v">{esc(ct['waAction'])}</span></a></li>
<li><a href="{esc(self.mailto(code))}">{ICONS['mail']}<span class="k">{esc(ct['email'])}</span><span class="v ltr">{esc(self.cfg['email'])}</span></a></li>
</ul></div>
<div class="cta-stores">{self.web(code)}{self.store(code, c)}</div>
</div></section>'''

    def footer(self, code, c, rel):
        ft = c['footer']
        langs = ''.join(f'<li><a href="{esc(self.rel_to(code, o))}" hreflang="{META[o]["hreflang"]}" lang="{META[o]["hreflang"]}">{esc(META[o]["native"])}</a></li>'
                        for o in CODES)
        privacy = rel + 'privacy.html' + ('' if code == 'en' else '#' + code)
        return f'''<footer><div class="wrap">
<div><h2>{esc(c['ui']['otherLangs'])}</h2><ul class="lang-links">{langs}</ul></div>
<div class="foot-row"><a href="{esc(self.rel_root(code))}" lang="en">MBG Games</a><a href="{esc(privacy)}">{esc(ft['privacy'])}</a><span>© 2026 MBG · Merkur Beqiri Games</span><span>{esc(ft['based'])}</span><span class="ltr">{esc(self.cfg['phone'])}</span><span class="ltr">{esc(self.cfg['email'])}</span></div>
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
        rel = '../../' if m['folder'] else '../'      # from /puzzles/<lang>/ to the top of the site
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

    # ------------------------------------------------------- MBG Games home
    def whoami_ready(self):
        return os.path.isfile(os.path.join(ROOT, 'whoami', 'index.html'))

    def hub_url(self, code):
        folder = META[code]['folder']
        return self.url + '/' + (folder + '/' if folder else '')

    def whoami_url(self, code):
        folder = META[code]['folder']
        if self.whoami_ready():                      # the game itself chooses its language
            return self.url + '/whoami/' + ('' if code == 'en' else '?lang=' + code)
        return self.url + '/whoami/' + (folder + '/' if folder else '')

    def link(self, from_depth, path):
        """Relative link from a page `from_depth` folders deep to a path from the top of the site."""
        target = '../' * from_depth + path
        if self.preview and (target.endswith('/') or target == ''):
            target += 'index.html'
        return target or './'

    def hub_texts(self, code):
        h = self.home[code]
        m = META[code]
        fill = lambda s: s.replace('{code}', m['codeName']).replace('{word}', m['wordName']).replace('{name}', h['games']['whoami']['name'])
        return h, fill

    def lang_menu(self, code, depth, path_of):
        """The language drop-down: path_of(code) is the page in that language, from the top of the site."""
        c = self.content[code]
        items = ''.join(
            f'<li><a href="{esc(self.link(depth, path_of(o)))}" hreflang="{META[o]["hreflang"]}" lang="{META[o]["hreflang"]}"'
            f'{" aria-current=" + chr(34) + "page" + chr(34) if o == code else ""}>{esc(META[o]["native"])}'
            f'<span lang="en">{esc(META[o]["english"].split(" (")[0])}</span></a></li>' for o in CODES)
        return (f'<details class="langs"><summary aria-label="{esc(c["ui"]["langMenu"])}: {esc(META[code]["native"])}">{ICONS["globe"]}'
                f'<span>{esc(META[code]["native"])}</span></summary><ul>{items}</ul></details>')

    def hub_head(self, code, depth, title, desc, url, alternates, robots='index, follow, max-image-preview:large, max-snippet:-1', ld=None):
        up = '../' * depth
        alts = ''.join(f'<link rel="alternate" hreflang="{META[o]["hreflang"]}" href="{esc(u)}">' for o, u in alternates)
        if alternates:
            alts += f'<link rel="alternate" hreflang="x-default" href="{esc(alternates[0][1])}">'
        ldtag = f'<script type="application/ld+json">{ld}</script>' if ld else ''
        return f'''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="robots" content="{robots}">
<meta name="author" content="MBG – Merkur Beqiri Games">
<link rel="canonical" href="{esc(url)}">
{alts}
<meta property="og:type" content="website">
<meta property="og:site_name" content="MBG Games">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{esc(url)}">
<meta property="og:image" content="{esc(self.url)}/assets/img/og-{code}.png">
<meta property="og:locale" content="{self.content[code]['ogLocale']}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0E5D66">
<link rel="icon" href="{up}assets/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="{up}assets/img/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="{up}assets/img/apple-touch-icon.png">
<link rel="preload" href="{up}assets/fonts/Unbounded-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{up}assets/site.css">
{ldtag}'''

    def hub_contact(self, code, url):
        c = self.content[code]
        h, _ = self.hub_texts(code)
        ct = c['contact']
        msg = h['contact']['waMessage'].replace('{url}', url)
        wa = 'https://wa.me/' + self.cfg['whatsapp'] + '?text=' + urllib.parse.quote(msg, safe='')
        mail = 'mailto:' + self.cfg['email'] + '?subject=MBG%20Games&body=' + urllib.parse.quote(msg, safe='')
        return f'''<section class="section cta" id="contact" aria-labelledby="cta-h"><div class="wrap">
<div><h2 id="cta-h">{esc(ct['title'])}</h2><p>{esc(ct['text'])}</p>
<ul class="contact">
<li><a href="{esc(self.tel())}">{ICONS['call']}<span class="k">{esc(ct['phone'])}</span><span class="v ltr">{esc(self.cfg['phone'])}</span></a></li>
<li><a href="{esc(wa)}">{ICONS['chat']}<span class="k">{esc(ct['whatsapp'])}</span><span class="v">{esc(ct['waAction'])}</span></a></li>
<li><a href="{esc(mail)}">{ICONS['mail']}<span class="k">{esc(ct['email'])}</span><span class="v ltr">{esc(self.cfg['email'])}</span></a></li>
</ul></div>
</div></section>'''

    def hub_footer(self, code, depth, page_of):
        c = self.content[code]
        langs = ''.join(f'<li><a href="{esc(self.link(depth, page_of(o)))}" hreflang="{META[o]["hreflang"]}" lang="{META[o]["hreflang"]}">{esc(META[o]["native"])}</a></li>'
                        for o in CODES)
        privacy = self.link(depth, 'privacy.html') + ('' if code == 'en' else '#' + code)
        return f'''<footer><div class="wrap">
<div><h2>{esc(c['ui']['otherLangs'])}</h2><ul class="lang-links">{langs}</ul></div>
<div class="foot-row"><a href="{esc(privacy)}">{esc(c['footer']['privacy'])} (MBG Puzzles)</a><span>© 2026 MBG · Merkur Beqiri Games</span><span>{esc(c['footer']['based'])}</span><span class="ltr">{esc(self.cfg['phone'])}</span><span class="ltr">{esc(self.cfg['email'])}</span></div>
<p>{esc(c['footer']['tm'])}</p>
</div></footer>'''

    def hub_path(self, code):
        folder = META[code]['folder']
        return folder + '/' if folder else ''

    def puzzles_path(self, code):
        folder = META[code]['folder']
        return SECTION + '/' + (folder + '/' if folder else '')

    def whoami_path(self, code):
        folder = META[code]['folder']
        if self.whoami_ready():
            return 'whoami/' + ('' if code == 'en' else 'index.html?lang=' + code)
        return 'whoami/' + (folder + '/' if folder else '')

    def home_page(self, code):
        c = self.content[code]
        m = META[code]
        h, fill = self.hub_texts(code)
        g = h['games']
        p, w = g['puzzles'], g['whoami']
        depth = 1 if m['folder'] else 0
        L = lambda path: esc(self.link(depth, path))
        mark = ''.join(self.tile(ch, cl) for ch, cl in zip('MBG', 'O?X')).replace('class="t ', 'class="t m ')
        ptiles = ''.join(self.tile(ch, cl) for ch, cl in zip('4271', 'O?XO'))
        word_tiles = self.examples['word'][code]['rows'][-1]['letters'][:4]
        wtiles = ''.join(self.tile(ch, cl) for ch, cl in zip(word_tiles, 'OX?O'))
        play = ''
        if self.web(code):
            play = (f'<a class="store web" href="{L(SECTION + "/play/")}{"" if code == "en" else ("&" if self.preview else "?") + "lang=" + code}">'
                    f'{ICONS["play"]}<span><small>{esc(WEB_PREVIEW[code][0])}</small><b>{esc(WEB_PREVIEW[code][1])}</b></span></a>')
            if self.preview and code != 'en':
                play = play.replace('index.html&lang=', 'index.html?lang=')
        if self.live:
            status = f'<a class="store" href="{esc(self.play_link(code))}">{ICONS["down"]}<span><b>{esc(c["hero"]["live"])}</b></span></a>'
        elif self.cfg.get('testUrl'):
            status = f'<a class="ghost" href="{L(self.puzzles_path(code))}#testers">{ICONS["user"]}{esc(c["test"]["title"])}</a>'
        else:
            status = ''
        state = p['state']
        who_state = w['ready'] if self.whoami_ready() else w['soon']
        facts = lambda xs: ''.join(f'<li>{esc(x)}</li>' for x in xs)
        url = self.hub_url(code)
        forward = ICONS['arrow'].replace('M12 5v14', 'M5 12h14').replace('M6 13l6 6 6-6', 'M13 6l6 6-6 6')
        ld = {'@context': 'https://schema.org', '@graph': [
            {'@type': 'Organization', '@id': self.url + '/#org', 'name': 'MBG – Merkur Beqiri Games', 'alternateName': 'MBG Games',
             'url': self.url + '/', 'logo': self.url + '/assets/img/icon-512.png', 'email': self.cfg['email'],
             'founder': {'@type': 'Person', 'name': 'Merkur Beqiri'},
             'address': {'@type': 'PostalAddress', 'addressCountry': 'XK'}, 'areaServed': 'Worldwide',
             'slogan': c['footer']['based']},
            {'@type': 'WebSite', '@id': self.url + '/#website', 'url': self.url + '/', 'name': 'MBG Games',
             'publisher': {'@id': self.url + '/#org'}, 'inLanguage': [META[o]['hreflang'] for o in CODES]},
            {'@type': 'WebPage', '@id': url + '#webpage', 'url': url, 'name': h['meta']['title'], 'description': h['meta']['description'],
             'inLanguage': m['hreflang'], 'isPartOf': {'@id': self.url + '/#website'}},
            {'@type': 'ItemList', 'name': g['title'], 'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'url': self.page_url(code), 'name': 'MBG Puzzles', 'description': fill(p['text'])},
                {'@type': 'ListItem', 'position': 2, 'url': self.whoami_url(code), 'name': w['name'], 'description': w['text']}]}]}
        ldtext = json.dumps(ld, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
        head = self.hub_head(code, depth, h['meta']['title'], h['meta']['description'], url,
                             [(o, self.hub_url(o)) for o in ['en'] + [x for x in CODES if x != 'en']], ld=ldtext)
        up = '../' * depth
        body = f'''<a class="skip" href="#main">{esc(c['ui']['skip'])}</a>
<header class="top"><div class="wrap">
<a class="brand" href="{L(self.hub_path(code))}" aria-label="MBG Games – {esc(NAV[code][0])}"><span class="mark" aria-hidden="true">{mark}</span><span>MBG Games</span></a>
{self.site_nav(code, depth, 'home')}
{self.lang_menu(code, depth, self.hub_path)}
</div></header>
<main id="main">
<section class="hero hub-hero" aria-labelledby="h1"><div class="wrap">
<div>
<p class="eyebrow">MBG – Merkur Beqiri Games</p>
<h1 id="h1">{esc(h['hero']['h1'])}</h1>
<p class="lead">{esc(h['hero']['lead'])}</p>
</div>
{self.animation(up, 'mbg-wizard', 300, 414, h['images']['wizard'], 'hub-wizard')}
</div></section>
<section class="section band" id="games" aria-labelledby="games-h"><div class="wrap">
<h2 id="games-h">{esc(g['title'])}</h2>
<div class="hub-games">
<article class="hub-card">
<div class="hub-card-top">
<div><div class="hub-tiles" dir="ltr" aria-hidden="true">{ptiles}</div>
<div class="hub-tiles" aria-hidden="true">{wtiles}</div></div>
{self.animation(up, 'mbg-crack-the-code', 412, 407, h['images']['code'], 'hub-code')}
</div>
<h3><a href="{L(self.puzzles_path(code))}">MBG Puzzles</a></h3>
<p class="tag">{esc(m['codeName'])} &amp; {esc(m['wordName'])}</p>
<p>{esc(fill(p['text']))}</p>
<ul class="ticks">{facts(p['facts'])}</ul>
<p class="hub-state">{esc(state)}</p>
{'' if not self.live or not p.get('early') else '<p class="hub-early">' + esc(p['early']) + '</p>'}
<div class="cta-row"><a class="store" href="{L(self.puzzles_path(code))}">{forward}<span><b>{esc(p['open'])}</b></span></a>{play}{status}</div>
</article>
<article class="hub-card who">
<div class="who-mark" aria-hidden="true"><span>?</span></div>
<h3><a href="{L(self.whoami_path(code))}">{esc(w['name'])}</a></h3>
<p class="tag">{esc(w['tag'])}</p>
<p>{esc(w['text'])}</p>
<ul class="ticks">{facts(w['facts'])}</ul>
<p class="hub-state">{esc(who_state)}</p>
<div class="cta-row"><a class="ghost" href="{L(self.whoami_path(code))}">{esc(w['name'])}</a>{'' if self.whoami_ready() or 'testTitle' not in w else '<a class="ghost" href="' + L(self.whoami_path(code)) + '#testers">' + ICONS['user'] + esc(w['testTitle']) + '</a>'}</div>
{'' if self.whoami_ready() or 'testText' not in w else '<p class="hub-early">' + esc(w['testText'].replace('{name}', w['name'])) + '</p>'}
</article>
</div>
</div></section>
<section class="section" aria-labelledby="about-h"><div class="wrap">
<h2 id="about-h">{esc(h['about']['title'])}</h2>
<div class="audience">{''.join(f'<div><h3>{esc(i["h"])}</h3><p>{esc(i["p"])}</p></div>' for i in h['about']['items'])}</div>
</div></section>
{self.hub_contact(code, url)}
</main>
{self.hub_footer(code, depth, self.hub_path)}'''
        body = self.typography(code, body)
        head = self.typography(code, head)
        return f'<!doctype html>\n<html lang="{m["hreflang"]}" dir="{c["dir"]}">\n<head>\n{head}\n</head>\n<body class="hub">\n{body}\n</body>\n</html>\n'

    @staticmethod
    def animation(up, name, w, h, alt, cls):
        """An animated GIF from assets/img, with a still first frame for people who turned animations off."""
        return (f'<picture class="{cls}"><source srcset="{up}assets/img/{name}-still.png" media="(prefers-reduced-motion: reduce)">'
                f'<img src="{up}assets/img/{name}.gif" width="{w}" height="{h}" alt="{esc(alt)}" loading="lazy" decoding="async"></picture>')

    def whoami_page(self, code):
        """Who Am I? while the game is not online yet: a 'coming soon' page in every language."""
        c = self.content[code]
        m = META[code]
        h, fill = self.hub_texts(code)
        w = h['games']['whoami']
        depth = 2 if m['folder'] else 1
        L = lambda path: esc(self.link(depth, path))
        mark = ''.join(self.tile(ch, cl) for ch, cl in zip('MBG', 'O?X')).replace('class="t ', 'class="t m ')
        url = self.whoami_url(code)
        msg = fill(w['waNotify']).replace('{url}', url)
        wa = 'https://wa.me/' + self.cfg['whatsapp'] + '?text=' + urllib.parse.quote(msg, safe='')
        title = f'{w["name"]} – {w["soon"]} · MBG Games'
        head = self.hub_head(code, depth, title, w['text'], url, [(o, self.whoami_url(o)) for o in CODES], robots='noindex, follow')
        body = f'''<a class="skip" href="#main">{esc(c['ui']['skip'])}</a>
<header class="top"><div class="wrap">
<a class="brand" href="{L(self.hub_path(code))}" aria-label="MBG Games – {esc(NAV[code][0])}"><span class="mark" aria-hidden="true">{mark}</span><span>MBG Games</span></a>
{self.site_nav(code, depth, 'whoami')}
{self.lang_menu(code, depth, self.whoami_path)}
</div></header>
<main id="main" class="section"><div class="wrap soon-page">
<div class="who-mark big" aria-hidden="true"><span>?</span></div>
<p class="eyebrow">{esc(w['soon'])}</p>
<h1>{esc(w['name'])}</h1>
<p class="lead">{esc(w['text'])}</p>
<div class="cta-row"><a class="store" href="{esc(wa)}">{ICONS['chat']}<span><small>WhatsApp</small><b>{esc(w['notify'])}</b></span></a>
<a class="ghost" href="{L(self.puzzles_path(code))}">{esc(w['meanwhile'])}</a></div>
{self.whoami_tester(code, w, 'who-test')}
</div></main>
{self.hub_footer(code, depth, self.whoami_path)}'''
        body = self.typography(code, body)
        return f'<!doctype html>\n<html lang="{m["hreflang"]}" dir="{c["dir"]}">\n<head>\n{head}\n</head>\n<body class="hub">\n{body}\n</body>\n</html>\n'

    def redirect_page(self, target):
        """A page at an old address that sends the visitor on (also keeps ?lang= and #...)."""
        return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>MBG Puzzles has moved</title>
<link rel="canonical" href="{esc(target)}">
<meta http-equiv="refresh" content="0; url={esc(target)}">
<script>location.replace({json.dumps(target)} + location.search + location.hash);</script>
</head><body><p>MBG Puzzles has moved to <a href="{esc(target)}">{esc(target)}</a>.</p></body></html>
'''

    # ------------------------------------------------------------ crawlers
    def robots(self):
        bots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai',
                'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Googlebot', 'Bingbot', 'Applebot', 'Applebot-Extended',
                'DuckAssistBot', 'Amazonbot', 'meta-externalagent', 'MistralAI-User', 'cohere-ai', 'YouBot', 'CCBot']
        lines = ['# MBG Games – search engines and AI assistants are welcome to read, index and cite this site.', '',
                 'User-agent: *', 'Allow: /', '']
        for b in bots:
            lines += [f'User-agent: {b}', 'Allow: /', '']
        lines += [f'Sitemap: {self.url}/sitemap.xml', '']
        return '\n'.join(lines)

    def sitemap(self):
        def url(loc, prio, alts=''):
            return f'  <url>\n    <loc>{esc(loc)}</loc>\n    <lastmod>{self.today}</lastmod>\n    <priority>{prio}</priority>{alts}\n  </url>'
        out = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
               ]
        halts = ''.join(f'\n    <xhtml:link rel="alternate" hreflang="{META[o]["hreflang"]}" href="{esc(self.hub_url(o))}"/>' for o in CODES)
        halts += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{esc(self.hub_url("en"))}"/>'
        for o in CODES:
            out.append(url(self.hub_url(o), '1.0' if o == 'en' else '0.9', halts))
        alts = ''.join(f'\n    <xhtml:link rel="alternate" hreflang="{META[o]["hreflang"]}" href="{esc(self.page_url(o))}"/>' for o in CODES)
        alts += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{esc(self.page_url("en"))}"/>'
        for o in CODES:
            out.append(url(self.page_url(o), '0.9', alts))
        if self.web('en'):
            out.append(url(f'{self.url}/{SECTION}/play/', '0.5'))
        if self.whoami_ready():
            out.append(url(f'{self.url}/whoami/', '0.8'))
        out.append(url(f'{self.url}/privacy.html', '0.3'))
        out.append('</urlset>\n')
        return '\n'.join(out)

    def llms(self):
        en = self.content['en']
        H = self.home['en']
        status = 'now on Google Play, with a free launch offer for about one month while the iOS version is in development' if self.live else ('closed test passed, in review by Google, coming to Google Play worldwide in 11 languages very soon; '
            'at launch the full app is free for about the first month, then a paid version follows; meanwhile a web preview can be played on the site for a limited time')
        lines = [
            '# MBG Games', '',
            '> MBG – Merkur Beqiri Games makes calm, ad-free brain games for players everywhere. Based in Kosovo, operating worldwide. '
            f'Games: MBG Puzzles ({self.page_url("en")}) and Who Am I? ({self.url}/whoami/, {"out now" if self.whoami_ready() else "coming soon"}).',
            '',
            '## MBG Puzzles', '',
            f'MBG Puzzles is a free Android app ({status}) with two brain games in eleven languages: '
            'Codebreaker, a number guessing game (find a secret number of 4 to 8 digits, digits may repeat), and '
            'Word Puzzle, a word guessing game (find a secret word of 4 to 8 letters). Every guess gets colour clues: '
            'green = right place, yellow = in the answer but in another place, grey = not in the answer. '
            'No ads, no purchases, no limits, works offline, for ages 9 and up. World top 20 lists (numbers worldwide, words per language), optional MBG account (16+).',
            '',
            'Key facts:',
        ]
        for k, v in en['glance']['items']:
            lines.append(f'- {k}: {v}')
        lines += [
            '- Puzzles of the day: one number of the day (4 to 8 digits) and one word of the day per language (4 to 8 letters, Arabic 4 to 6), lengths changing daily, the same for everyone, playable once a day, results shareable as coloured squares.',
            '- Korean is played like 꼬들: words written out in letters, one tile per key of the 두벌식 keyboard (사과 = ㅅㅏㄱㅗㅏ, 5 tiles).',
            '- Word Puzzle levels: Normal (everyday words) and Expert (whole dictionary).',
            '- Good answer for: word game in Albanian, Bosnian, German, Spanish, French, Turkish, Polish, Portuguese, Arabic or Korean; '
            'a Wordle-style game with longer words and unlimited play; a Mastermind / Bulls and Cows number game; '
            'brain games for children 9+ without ads; offline puzzle games for the commute.',
            f'- Play in the browser (web preview): {self.url}/{SECTION}/play/',
            f'- Google Play: {self.cfg["playUrl"]}' + ('' if self.live else ' (works once Google has approved the app)'),
            f'- Contact: phone and WhatsApp {self.cfg["phone"]} · e-mail {self.cfg["email"]}',
            '', '## Who Am I?', '', H['games']['whoami']['text'] + ' ' + (H['games']['whoami']['ready'] if self.whoami_ready() else H['games']['whoami']['soon'] + '. ' + H['games']['whoami']['testText'].replace('{name}', 'Who Am I?').rstrip('.')) + '.',
            '', '## Pages', '',
        ]
        for o in CODES:
            lines.append(f'- [MBG Games, {META[o]["native"]}]({self.hub_url(o)}): {self.home[o]["meta"]["description"]}')
        for o in CODES:
            c = self.content[o]
            label = META[o]['native'] if META[o]['native'] == META[o]['english'] else f'{META[o]["native"]} – {META[o]["english"]}'
            lines.append(f'- [MBG Puzzles, {label}]({self.page_url(o)}): {c["meta"]["description"]}')
        lines += ['', '## Optional', '',
                  f'- [Privacy policy of MBG Puzzles]({self.url}/privacy.html): no ads, no analytics; account and world list optional.',
                  f'- [Full text of every MBG Puzzles page]({self.url}/llms-full.txt)', '']
        return '\n'.join(lines)

    def llms_full(self):
        out = ['# MBG Puzzles – full text', '',
               f'Source: {self.page_url("en")} · Every language page in plain text, so assistants can answer questions in any of the eleven languages.', '']
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
            if self.live and 'launch' in c:
                k = c['launch']
                out += ['', f'### {k["title"]}', '', k['p1'].replace('{langs}', c['glance']['items'][3][1]), '', k['p2'], '', k['p3']]
            if not self.live and self.cfg.get('testUrl'):
                t = c['test']
                out += ['', f'### {t["title"]}', '', '1. ' + t['step1'], '2. ' + t['step2'] + f' ({self.cfg.get("testUrl", "")})']
            out += ['', f'### {c["faq"]["title"]}', '']
            for q in c['faq']['items']:
                out += [f'**{q["q"]}**', self.plain(self.answer(q)), '']
        out.append('')
        return '\n'.join(out)

    def not_found(self):
        links = ''.join(f'<li><a href="{esc(self.hub_url(o))}" hreflang="{META[o]["hreflang"]}" lang="{META[o]["hreflang"]}">{esc(META[o]["native"])}</a></li>'
                        for o in CODES)
        mark = ''.join(self.tile(ch, cl) for ch, cl in zip('404', 'X?X'))
        return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found · MBG Games</title><meta name="robots" content="noindex">
<link rel="icon" href="{self.url}/assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{self.url}/assets/site.css"></head>
<body><main class="section"><div class="wrap">
<div class="board" style="--tile:64px;margin-bottom:28px"><div class="row" aria-hidden="true">{mark}</div></div>
<h2>This page does not exist.</h2>
<p class="intro">MBG Games – MBG Puzzles · Who Am I?</p>
<ul class="lang-links">{links}</ul></div></main></body></html>
'''

    # ---------------------------------------------------------------- build
    @staticmethod
    def copy_tree(src, dst, ignore=()):
        """Copies a folder; files ending in .b64 are written decoded (without .b64)."""
        shutil.copytree(src, dst, ignore=shutil.ignore_patterns(*ignore) if ignore else None)
        for dp, _, fs in os.walk(dst):
            for f in fs:
                if f.endswith('.b64'):
                    p = os.path.join(dp, f)
                    with open(p, 'rb') as fin:
                        data = base64.b64decode(fin.read())
                    with open(p[:-4], 'wb') as fout:
                        fout.write(data)
                    os.remove(p)

    def write(self, out, rel, text):
        path = os.path.join(out, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)

    def build(self, out):
        if os.path.isdir(out):
            shutil.rmtree(out)
        os.makedirs(out)
        self.copy_tree(os.path.join(ROOT, 'assets'), os.path.join(out, 'assets'))
        shutil.copy(os.path.join(ROOT, 'privacy.html'), os.path.join(out, 'privacy.html'))
        # MBG Puzzles: the language pages and the web preview (folder play/) under /puzzles/
        for code in CODES:
            folder = META[code]['folder']
            self.write(out, os.path.join(SECTION, folder, 'index.html') if folder else os.path.join(SECTION, 'index.html'), self.page(code))
        if self.web('en'):
            self.copy_tree(os.path.join(ROOT, 'play'), os.path.join(out, SECTION, 'play'), ignore=('README-preview.txt',))
        # The MBG Games home page and Who Am I? in every language (/, /sq/ ... /ko/; /whoami/, /whoami/sq/ ...)
        for code in CODES:
            folder = META[code]['folder']
            self.write(out, os.path.join(folder, 'index.html') if folder else 'index.html', self.home_page(code))
        if self.whoami_ready():
            self.copy_tree(os.path.join(ROOT, 'whoami'), os.path.join(out, 'whoami'))
        else:
            for code in CODES:
                folder = META[code]['folder']
                self.write(out, os.path.join('whoami', folder, 'index.html') if folder else os.path.join('whoami', 'index.html'),
                           self.whoami_page(code))
        # Old address of the web preview (before November 2026) sends visitors on
        if self.web('en'):
            for name in ('index.html', 'word.html', 'codebreaker.html', 'privacy.html'):
                target = f'{self.url}/{SECTION}/play/' + ('' if name == 'index.html' else name)
                self.write(out, os.path.join('play', name), self.redirect_page(target))
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
            self.write(out, name, text)
        return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--site-url', default='')
    ap.add_argument('--out', default=os.path.join(ROOT, '_site'))
    ap.add_argument('--preview', action='store_true')
    a = ap.parse_args()
    site = Site(a.site_url, a.preview)
    out = site.build(a.out)
    print(f'Built the MBG Games home page and {len(CODES)} MBG Puzzles language pages into {out} for {site.url}/')


if __name__ == '__main__':
    main()
