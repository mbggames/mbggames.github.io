#!/usr/bin/env python3
"""
Tells search engines that use IndexNow (Bing, Yandex, Seznam, Naver ...) that the language
pages changed, so they read them again soon. Bing's index is also what ChatGPT search and
Microsoft Copilot look in.

    python3 tools/indexnow.py --site-url https://mbggames.github.io

The key is indexNowKey in site.json; the build publishes it as <key>.txt next to the pages.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from build import CODES, META  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--site-url', required=True)
    a = ap.parse_args()
    with open(os.path.join(ROOT, 'site.json'), encoding='utf-8') as f:
        cfg = json.load(f)
    key = cfg.get('indexNowKey')
    if not key:
        print('No indexNowKey in site.json - nothing to do.')
        return
    base = a.site_url.rstrip('/')
    urls = [base + '/' + (META[c]['folder'] + '/' if META[c]['folder'] else '') for c in CODES]
    urls += [base + '/privacy.html']
    body = json.dumps({
        'host': urllib.parse.urlparse(base).netloc,
        'key': key,
        'keyLocation': f'{base}/{key}.txt',
        'urlList': urls,
    }).encode('utf-8')
    req = urllib.request.Request('https://api.indexnow.org/indexnow', data=body,
                                 headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print('IndexNow answered', r.status, 'for', len(urls), 'pages')
    except urllib.error.HTTPError as e:
        print('IndexNow answered', e.code, e.read()[:200])


if __name__ == '__main__':
    main()
