#!/usr/bin/env python3
"""
DMM 月間 DVD ranking scraper (top 20) via Camoufox.
Bypasses Cloudflare + age gate. Requires JP IP.
"""
import json, sys, time
from camoufox.sync_api import Camoufox

RANKING_URL = "https://www.dmm.co.jp/mono/dvd/-/ranking/=/term=monthly/"


def scrape():
    with Camoufox(headless=True, os="windows", humanize=True) as browser:
        page = browser.new_page()
        print(f"[fetch] {RANKING_URL}", file=sys.stderr)
        page.goto(RANKING_URL, wait_until="domcontentloaded", timeout=60000)

        # Age gate
        try:
            page.click("text=はい", timeout=5000)
            time.sleep(2)
            print("[age] passed", file=sys.stderr)
        except Exception:
            pass

        # Wait past Cloudflare
        for i in range(15):
            title = page.title()
            if "ranking" in page.url.lower() or "DVD" in title or "ランキング" in title:
                break
            time.sleep(1)
            print(f"[wait] title={title!r}", file=sys.stderr)

        # Close popup if any
        try:
            page.click(".fn-close", timeout=3000)
            time.sleep(1)
        except Exception:
            pass

        # Extract ranking items — DMM uses <li class="d-item">
        items = page.evaluate(
            """() => {
                const nodes = document.querySelectorAll('li.d-item, li[data-anchor="ranking"], ul.d-boxcapsule li');
                const results = [];
                nodes.forEach((el, idx) => {
                    const a = el.querySelector('a[href*="/cid="]');
                    const img = el.querySelector('img');
                    const rankEl = el.querySelector('.rank, .rank-num, [class*="rank"]');
                    if (!a) return;
                    const cidMatch = a.href.match(/cid=([^/]+)/);
                    if (!cidMatch) return;
                    // Extract title from various places
                    const title =
                        (img?.alt || '').trim() ||
                        (el.querySelector('.d-boxcaptside, .txt, .tmb')?.textContent || '').trim() ||
                        a.title || '';
                    results.push({
                        rank: results.length + 1,
                        video_code: cidMatch[1],
                        title: title.replace(/\\s+/g, ' ').trim(),
                        cover_url: img?.src || '',
                        detail_url: a.href,
                    });
                });
                return results.slice(0, 20);
            }"""
        )
        print(f"[items] {len(items)}", file=sys.stderr)
        if not items:
            # Fallback: dump HTML snippet for debug
            html = page.content()
            with open("/tmp/dmm-dbg.html", "w") as f:
                f.write(html)
            print(f"[debug] saved /tmp/dmm-dbg.html size={len(html)}", file=sys.stderr)
        return items


if __name__ == "__main__":
    items = scrape()
    print(json.dumps(items, ensure_ascii=False))
