# MBG Puzzles – website

The promotional website of **MBG Puzzles** (Codebreaker & Word Puzzle) by MBG – Merkur Beqiri Games.
One page in each of the app's ten languages, written so that Google, Bing and AI assistants
(ChatGPT, Claude, Gemini, Perplexity, Copilot …) can read it, understand it and recommend it
when people ask for a word game, a number game or brain games in their language.

| Address | Language |
|---|---|
| `/` | English (also the default for every other language) |
| `/sq/` `/bs/` `/de/` `/es/` `/fr/` `/tr/` `/pl/` `/pt/` `/ar/` | Shqip, Bosanski, Deutsch, Español, Français, Türkçe, Polski, Português (Brasil), العربية |
| `/privacy.html` | the app's privacy policy in all ten languages – the link Google Play asks for |

---

## What makes it easy to find

- **Plain HTML.** Every word is in the page itself; no JavaScript is needed to read it. Many AI crawlers do not run JavaScript, so this matters.
- **One page per language**, linked to each other with `hreflang`, so Google shows Albanians the Albanian page and Germans the German one.
- **Structured data** (schema.org JSON-LD) on every page: the app (MobileApplication, free, Android, ten languages, age 9+), the two games, the developer, and all questions and answers (FAQPage).
- **Short, factual answers** to the questions people actually ask: "Is there a word game in Albanian?", "Is it like Wordle?", "Is it like Mastermind?", "Is it free?", "Can children play?".
- **`robots.txt`** welcomes search engines and AI crawlers by name (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot …).
- **`sitemap.xml`** lists all pages with their language versions.
- **`llms.txt` and `llms-full.txt`**: a short summary and the full text of every language page, in the format AI tools look for.
- **IndexNow**: after every publish, Bing (the index behind ChatGPT search and Copilot), Yandex and others are told that the pages changed.
- **Share pictures** for every language (WhatsApp, Facebook, X, LinkedIn show them when the link is posted).

Honest limit: no website can make an AI assistant recommend an app. Assistants repeat what many independent sources say, so the site is the base; reviews on Google Play and mentions on other sites do the rest (see "After publishing").

---

## 1. Publish it on GitHub Pages (free, about 15 minutes)

### Choose the address

The address should be the **root** of a github.io address, because only there do `robots.txt`, `sitemap.xml` and `llms.txt` count. Best:

1. On github.com: your picture (top right) › **Your organizations** › **New organization** › plan **Free** › name it `mbggames` (or `mbg-games` if taken). This gives the brand its own address.
2. In that organization: **New repository**, name it **exactly** `mbggames.github.io` (the organization name + `.github.io`) › **Public** › leave "Add a README" unticked › **Create repository**.

The site will be at **https://mbggames.github.io/**. (Using your personal account works the same way: a repository named `yourname.github.io` gives `https://yourname.github.io/`.)

> A repository with any other name (for example `mbg-puzzles-site`) gives `https://…github.io/mbg-puzzles-site/`. The pages still work and can be found, but robots.txt and llms.txt are not read there.

### Upload the files

1. Unzip `MBG-Puzzles-Website-GitHub.zip`. You get a folder `mbg-puzzles-site`.
2. On the empty repository page click **uploading an existing file**. Select **everything inside** `mbg-puzzles-site` and drag it into the window. Wait until all files are listed (about 48). **Commit changes**.
3. Check that the repository shows a folder **`.github`**. On a Mac, Finder hides folders whose names start with a dot: press **Cmd + Shift + .** in Finder before dragging. If it is still missing: **Add file › Create new file**, type the name `.github/workflows/pages.yml`, paste the contents of `tools/pages.yml`, **Commit changes**.

### Switch on GitHub Pages

1. **Settings › Pages** › under *Build and deployment*, set **Source** to **GitHub Actions**.
2. **Actions** tab › **Publish website** › **Run workflow**. After about a minute the run turns green and shows the address.

From now on, every change you commit is published by itself within a minute or two. The address is filled into the pages automatically, also if you later add your own domain (Settings › Pages › Custom domain).

---

## 2. Tell Google and Bing (once, about 10 minutes)

**Google Search Console** – search.google.com/search-console
1. **Add property** › **URL prefix** › `https://mbggames.github.io/`.
2. Choose **HTML file** verification and download the file (`google….html`). In the repository open the folder **`extra`**, **Add file › Upload files**, upload it, **Commit changes**. Wait a minute, then click **Verify**.
3. **Sitemaps** › enter `sitemap.xml` › **Submit**.

**Bing Webmaster Tools** – bing.com/webmasters
1. Sign in › **Import from Google Search Console** (fastest) – or add the site and verify with `BingSiteAuth.xml` in the `extra` folder, as above.
2. **Sitemaps** › `https://mbggames.github.io/sitemap.xml`.
Bing's index is used by ChatGPT search, Microsoft Copilot and DuckDuckGo.

---

## 3. Launch day and other changes (no programming)

| What | Where |
|---|---|
| The app is live on Google Play | `site.json`: change `"playStatus": "soon"` to `"playStatus": "live"`. Every page then shows a download button with the Play link in the page's language, and the structured data gets the download address. |
| The world top 20 is online | `site.json`: `"worldList": true` (the privacy answer then mentions it) |
| Phone / WhatsApp number, e-mail, Play link | `site.json` |
| The opening text of WhatsApp messages and e-mails ("Hello, I found you on the MBG Puzzles website …") | `waMessage` in each `content/*.json`; `{url}` becomes the address of that language page |
| Any text, in any language | `content/en.json`, `content/sq.json` … `content/ar.json` |
| Colours, fonts, layout | `assets/site.css` |
| Share pictures and icons | `tools/make_images.py` (after changing a headline; needs `pip install pillow fonttools brotli`) |

To edit on GitHub: open the file › pencil icon › change the text between the quotes › **Commit changes**. Keep the quotes and commas as they are.

**Before switching the app to the paid edition**, change the texts that say "free · no ads · no limits", "no purchases" and "10 free hint credits a day" in all ten `content` files – they describe the free edition.

The example games on the pages (ANGEL, FJALA, HVALA, VÖGEL …) were checked with the app’s own clue rules, and none of the secret words is a word of the day.

---

## 4. After publishing – what helps AI assistants find it

1. **The Google Play listing** with the same facts and words as the site (the store texts already match).
2. **Reviews and ratings** on Google Play – ask testers, friends and students.
3. **Mentions on other sites** with a link to the site: AlternativeTo (as an alternative to Wordle and Mastermind), Product Hunt, Reddit (r/WordGames, r/AndroidGaming, r/albania, r/kosovo, r/bih, r/languagelearning), language-learning forums, school and teacher groups, local news in Kosovo, Albania and Bosnia.
4. **Keep the facts the same everywhere**: name, "free, no ads", "ten languages", the two game names. Assistants trust what several sources repeat.

---

## 5. Build it on your own computer (optional)

```
python3 tools/build.py --site-url https://mbggames.github.io
```

writes the finished site into `_site/` (Python 3, nothing to install). `--preview` makes links point at `index.html` files, so the pages also open straight from the folder.

---

## 6. Files

```
mbg-puzzles-site/
├── .github/workflows/pages.yml   builds and publishes the site (also as tools/pages.yml)
├── site.json                     settings: Google Play status, contact, IndexNow key
├── content/                      all texts, one file per language (en, sq, bs, de, es, fr, tr, pl, pt, ar)
├── assets/site.css               the look (same colours and fonts as the app)
├── assets/fonts/                 Atkinson Hyperlegible, Unbounded, Noto Kufi Arabic, Noto Sans Arabic (SIL OFL)
├── assets/img/                   app icon, browser icons, share pictures og-<language>.png
├── privacy.html                  the app's privacy policy (ten languages)
├── extra/                        verification files for Google / Bing go here
└── tools/
    ├── build.py                  makes the pages, robots.txt, sitemap.xml, llms.txt, llms-full.txt, 404.html
    ├── examples.json             the example games (checked with the app's clue rules)
    ├── make_images.py            share pictures and icons
    └── indexnow.py               tells Bing and others about changes
```

---

© 2026 MBG · Merkur Beqiri Games. Fonts under the SIL Open Font License 1.1 (see `assets/fonts/`).
Wordle is a trademark of The New York Times Company and Mastermind a trademark of its owner; the site names them only to compare, and MBG Puzzles is not connected with them.
