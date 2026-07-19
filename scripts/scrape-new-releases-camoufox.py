#!/usr/bin/env python3
"""
Scrape javlibrary.com/tw/vl_newrelease.php using Camoufox (bypasses Cloudflare).
Outputs JSON to stdout for downstream ingestion.
"""
import json
import re
import sys
import time
from camoufox.sync_api import Camoufox

BASE = "https://www.javlibrary.com"
LIST = f"{BASE}/tw/vl_newrelease.php"


def scrape_page(page, page_num: int):
    url = LIST if page_num == 1 else f"{LIST}?mode=&page={page_num}"
    print(f"[fetch] {url}", file=sys.stderr)
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    # Wait for Cloudflare challenge to resolve
    for i in range(20):
        title = page.title()
        if "javlibrary" in title.lower() or "video" in page.content().lower()[:2000]:
            break
        time.sleep(1)
        print(f"[wait] challenge... title={title!r}", file=sys.stderr)
    time.sleep(2)

    items = page.evaluate(
        """() => {
            const out = [];
            document.querySelectorAll('.video').forEach(el => {
                const a = el.querySelector('a');
                const img = el.querySelector('img');
                const idDiv = el.querySelector('.id');
                const titleDiv = el.querySelector('.title');
                if (!a || !img || !idDiv) return;
                out.push({
                    video_code: (idDiv.textContent || '').trim(),
                    title: (titleDiv?.textContent || a.title || '').trim(),
                    cover_url: img.src || '',
                    detail_url: a.href || '',
                });
            });
            return out;
        }"""
    )
    print(f"[page {page_num}] {len(items)} items", file=sys.stderr)
    return items


def main():
    total_pages = int(sys.argv[1] if len(sys.argv) > 1 else 3)
    all_items = []
    with Camoufox(
        headless=True,
        os="macos",
        humanize=True,
    ) as browser:
        page = browser.new_page()
        # Set cookies for over18 gate
        browser.contexts[0].add_cookies(
            [{"name": "over18", "value": "18", "domain": ".javlibrary.com", "path": "/"}]
        )
        for p in range(1, total_pages + 1):
            all_items.extend(scrape_page(page, p))

    # Dedupe
    uniq = {}
    for r in all_items:
        uniq[r["video_code"]] = r
    result = list(uniq.values())
    print(f"[total] {len(result)} unique items", file=sys.stderr)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
