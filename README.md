# MBG Games – website (mbggames.com)

The public website of MBG – Merkur Beqiri Games, built from this repository by GitHub Actions and
published on GitHub Pages at **https://mbggames.com**.

| Address | What |
|---|---|
| `/` | **MBG Games** home page: MBG Puzzles and Who Am I?; `/sq/` `/bs/` … `/ko/` the same in the other ten languages (texts: `content/home.json`) |
| `/puzzles/` | **MBG Puzzles** in English; `/puzzles/sq/` `/bs/` `/de/` `/es/` `/fr/` `/tr/` `/pl/` `/pt/` `/ar/` `/ko/` in the other ten languages (texts: `content/<language>.json`) |
| `/puzzles/play/` | the web preview of the game (folder `play/`, app version 1.11.0) |
| `/whoami/` | **Who Am I?** – the folder `whoami/` as it is; while that folder does not exist, a "coming soon" page in all eleven languages (`/whoami/sq/` …) |
| `/privacy.html` | the privacy policy of MBG Puzzles in all eleven languages – the address Google Play knows (`#delete` = deleting an account) |
| `/play/` | old address of the web preview: sends visitors on to `/puzzles/play/` |

## Putting Who Am I? online

Make a folder `whoami` at the top of this repository with the game in it (its start page must be
`whoami/index.html`) and commit. The next build publishes it at `mbggames.com/whoami/`, adds it to
the sitemap, and the home page card says "Play now" instead of "Coming soon".

## Settings (`site.json`) – no programming

| What | Where |
|---|---|
| Now (November 2026): approved and live on Google Play | `"playStatus": "live"` – every page has a Google Play download button; the Google-approved launch message and the roughly one-month free-access offer appear in all 11 languages, while the iOS version is being prepared. Who Am I? still has its separate **Become a tester** box. The web preview also uses `playStatus: 'live'` in `play/js/app/edition.js`. |
| Google Play direct link | `"playUrl": "https://play.google.com/store/apps/details?id=com.mbggames.puzzles"` – used by the live download buttons across all 11 languages. |
| Become a tester of MBG Puzzles (closed test – over) | `"testUrl"` = Google Play's opt-in page of the test (now `""`). If set and the app is not live, every page has a **Become a tester** box: 1. send your Gmail address (WhatsApp / e-mail), 2. once added, register on Google Play. `""` = no box. |
| Play in your browser | `"webPreview": true / false` |
| Phone / WhatsApp, e-mail | `"phone"`, `"whatsapp"`, `"email"` |
| Any text | `content/home.json` (home page and Who Am I? page, all eleven languages), `content/en.json` … `content/ko.json` (MBG Puzzles) |
| Colours, fonts, layout | `assets/site.css` |

To edit on GitHub: open the file › pencil icon › change the text between the quotes › **Commit changes**.
Every commit to `main` is published by itself within 1–2 minutes (Actions › "Publish website").

## Pictures

`assets/img/og-<language>.png` are the share pictures (WhatsApp, Facebook, X …). Files ending in
`.b64` are the same pictures as text (base64) – they exist because some upload tools only take
text. The build turns them back into pictures and **prefers them**, so after changing a headline run
`python3 tools/make_images.py` (it writes both; needs `pip install pillow fonttools brotli` and,
for Korean, the Noto Sans CJK font). If you replace a picture by hand, delete its `.b64` file.

## Updating the web preview to a new app version

See `play/README-preview.txt`: replace `play/` with the app's `www` folder and put back the preview
files and the three small hooks.

## What makes it easy to find

Plain HTML (readable without JavaScript), one page per language with `hreflang` links, structured
data (schema.org: Organization, MobileApplication, FAQPage, ItemList), `robots.txt` welcoming search
engines and AI crawlers by name, `sitemap.xml`, `llms.txt` and `llms-full.txt`, and IndexNow (Bing,
the index behind ChatGPT search and Copilot) after every publish. Google Search Console and Bing
Webmaster Tools: submit `https://mbggames.com/sitemap.xml` again after this move.

## Build it on your own computer (optional)

```
python3 tools/build.py --site-url https://mbggames.com
```

writes the finished site into `_site/` (Python 3 only). `--preview` makes links point at
`index.html` files, so the pages also open straight from the folder.

## Files

```
.github/workflows/pages.yml   builds and publishes the site (copy in tools/pages.yml)
site.json                     settings
content/                      texts: home.json + one file per language of MBG Puzzles
assets/                       site.css, fonts (SIL OFL), pictures
play/                         web preview of MBG Puzzles (the app's www + preview files)
privacy.html                  privacy policy of MBG Puzzles (the app's www/privacy.html)
extra/                        verification files for Google / Bing, published at the top
tools/build.py                makes all pages, redirects, robots.txt, sitemap.xml, llms.txt, 404.html
tools/examples.json           example games (checked with the app's clue rules)
tools/make_images.py          share pictures and icons
tools/indexnow.py             tells Bing and others about changes
mbg-puzzles-site/             OLD copy from October 2026 – not used by the build, can be deleted
```

© 2026 MBG · Merkur Beqiri Games. Wordle is a trademark of The New York Times Company and
Mastermind a trademark of its owner; the site names them only to compare.
