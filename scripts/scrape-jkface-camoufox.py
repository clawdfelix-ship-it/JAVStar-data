#!/usr/bin/env python3
"""
jkface.net 台灣 AV 女優活動 scraper（2026-09-11）

站方係 Vue SPA + gRPC-web（face-front-api.hare200.com），唔逆向 protobuf，
用 camoufox 行 UI：自訂時間（2026-08-01 起）＋標籤「AV女優」→ 無限滾動載齊
→ 逐個詳情頁取標題／ISO 日期區間／場地／陣容女優名。

輸出 JSON 到 stdout（畀 ingest-jkface.ts 入庫）：
{
  "scraped_at": "...", "count": N,
  "events": [{id, title, start_date, end_date, venue, url, cast: [名...], tags: [...]}]
}

用法：.venv-scrape/bin/python scripts/scrape-jkface-camoufox.py [輸出檔]
"""
import json
import re
import sys
import time
from datetime import date

from camoufox.sync_api import Camoufox

BASE = "https://jkface.net"
LIST = f"{BASE}/find-event"
# Felix 指示：2026-08 以前唔爬。range 開放式落到下年中（夠滾到未來半年）。
RANGE_START = (2026, 8)
RANGE_END = (2027, 6, 30)


def log(msg: str) -> None:
    print(f"[jkf] {msg}", file=sys.stderr, flush=True)


def month_labels(page):
    return page.evaluate(
        "() => [...document.querySelectorAll('.dp__month_year_wrap')]"
        ".slice(0,2).map(e=>e.innerText.replace('\\n',''))"
    )


_LABEL_RE = re.compile(r"^(\d{1,2})月\s*(\d{4})$")


def _label_pair(s: str):
    m = _LABEL_RE.match(s or "")
    return (int(m.group(2)), int(m.group(1))) if m else None


def nav_to_month(page, target_year: int, target_month: int, timeout_s: int = 30):
    """range picker 兩個日曆一齊行，用第一個月曆 label 做目標。"""
    deadline = time.time() + timeout_s
    target = (target_year, target_month)
    while time.time() < deadline:
        labels = month_labels(page)
        cur = _label_pair(labels[0]) if labels else None
        if cur == target:
            return True
        direction = "prev" if cur and (cur[0], cur[1]) > target else "next"
        page.evaluate(
            f"() => document.querySelector('[data-dp-element=action-{direction}]')?.click()"
        )
        time.sleep(0.22)
    return False


def open_custom_range(page):
    page.evaluate(
        "() => [...document.querySelectorAll('*')]"
        ".find(e => e.children.length === 0 && (e.innerText||'').trim() === '時間區間')?.click()"
    )
    time.sleep(0.6)
    page.evaluate(
        "() => [...document.querySelectorAll('li,div,span,button')]"
        ".find(e => (e.innerText||'').trim() === '自訂' && e.children.length<=2)?.click()"
    )
    time.sleep(0.8)


def pick_day(page, cal_index: int, day: int) -> bool:
    return bool(page.evaluate(
        """([idx, day]) => {
          const cals = document.querySelectorAll('.dp__calendar');
          if (!cals[idx]) return false;
          const cells = [...cals[idx].querySelectorAll('.dp__cell_inner')];
          const cell = cells.find(c => (c.innerText||'').trim() === String(day)
                                       && !c.className.includes('offset'));
          if (!cell) return false;
          cell.click();
          return true;
        }""",
        [cal_index, day],
    ))


def set_date_range(page):
    """設 start=RANGE_START 1號、end=RANGE_END。range picker 揀完 start 通常自動跳 end 揀取。"""
    open_custom_range(page)
    page.evaluate("() => document.querySelector('#start-date-input')?.click()")
    time.sleep(0.8)

    if not nav_to_month(page, RANGE_START[0], RANGE_START[1]):
        raise RuntimeError("start month nav failed: " + str(month_labels(page)))
    if not pick_day(page, 0, 1):
        raise RuntimeError("start day click failed")
    time.sleep(0.8)
    sv = page.evaluate("() => document.querySelector('#start-date-input')?.value || ''")
    log(f"start input = {sv!r}")

    # 揀完 start，picker 一般等揀 end；若關咗就重開 end input
    if not page.evaluate("() => document.querySelectorAll('.dp__calendar').length"):
        page.evaluate("() => document.querySelector('#end-date-input')?.click()")
        time.sleep(0.8)
    if not nav_to_month(page, RANGE_END[0], RANGE_END[1]):
        raise RuntimeError("end month nav failed: " + str(month_labels(page)))
    if not pick_day(page, 0, RANGE_END[2]):
        raise RuntimeError("end day click failed")
    time.sleep(0.8)
    ev = page.evaluate("() => document.querySelector('#end-date-input')?.value || ''")
    log(f"end input = {ev!r}")
    page.keyboard.press("Escape")
    time.sleep(0.4)


def apply_av_tag(page):
    page.evaluate(
        "() => [...document.querySelectorAll('*')]"
        ".find(e => e.children.length === 0 && (e.innerText||'').trim() === '標籤')?.click()"
    )
    time.sleep(0.7)
    page.evaluate(
        "() => [...document.querySelectorAll('li')]"
        ".find(l => (l.innerText||'').trim() === 'AV女優')?.click()"
    )
    time.sleep(3)


def collect_list(page) -> list[str]:
    last, stable = -1, 0
    for i in range(80):
        page.mouse.wheel(0, 5000)
        time.sleep(1.0)
        n = page.evaluate("() => document.querySelectorAll('a[href*=\"/events/\"]').length")
        if n == last:
            stable += 1
            if stable >= 5:
                break
        else:
            stable, last = 0, n
    hrefs = page.evaluate(
        "() => [...document.querySelectorAll('a[href*=\"/events/\"]')]"
        ".map(a => a.getAttribute('href'))"
    )
    ids = sorted({int(m.group(1)) for h in hrefs if (m := re.search(r"/events/(\d+)", h))})
    return ids


# 詳情頁 header block class（2026-09 探測）：.mr-5.flex.min-h-33 一次過含 標題/日期/場地
HEADER_JS = r"""() => {
  const block = document.querySelector('.mr-5.flex.min-h-33');
  const lines = block
    ? block.innerText.split('\n').map(s => s.trim()).filter(Boolean)
    : [];
  const dm = document.body.innerText.match(/(\d{4}-\d{2}-\d{2}) \d{2}:\d{2} ~ (\d{4}-\d{2}-\d{2}) \d{2}:\d{2}/);
  return {lines, start: dm ? dm[1] : null, end: dm ? dm[2] : null,
          url: location.href};
}"""

# 陣容 tab：細 cast card = 「名 / AV女優」個粒 text-[10px] label
CAST_JS = r"""() => {
  const labels = [...document.querySelectorAll('div,span,p')].filter(
    e => (e.innerText||'').trim() === 'AV女優'
      && (e.className||'').toString().includes('text-[10px]')
  );
  const names = [];
  for (const l of labels) {
    let card = l;
    for (let i = 0; i < 6; i++) card = card?.parentElement;
    if (!card) continue;
    const first = (card.innerText||'').split('\n').map(s=>s.trim()).filter(Boolean)[0];
    if (first && first !== 'AV女優' && !names.includes(first)) names.push(first);
  }
  return names;
}"""

# header chip tags（HOT/名額有限/TRE合作廠商…）— 由 block lines 取，入庫只做參考
SKIP_HEADER_LINES = {"實體活動", "線上活動", "HOT", "AV女優", "名額有限", "額滿為止"}


def parse_detail(page, eid: int) -> dict | None:
    page.goto(f"{BASE}/events/{eid}", wait_until="domcontentloaded", timeout=60000)
    time.sleep(2.2)
    hdr = page.evaluate(HEADER_JS)
    if not hdr.get("start"):
        log(f"  ! {eid}: 無日期，跳過")
        return None

    lines = hdr["lines"]
    title = lines[0] if lines else ""
    # 場地＝日期行之後、chip tag 之後嗰段；用已知排除法攞最後一段非 tag 長文字
    venue = ""
    for ln in lines[1:]:
        if re.match(r"\d{4}-\d{2}-\d{2}", ln):
            continue
        if ln in SKIP_HEADER_LINES or len(ln) > 60:
            # 場地可能含地址偏長；只有含地名關鍵字先收
            if re.search(r"(台北|臺北|新北|桃園|臺中|台中|臺南|台南|高雄|基隆|新竹|STUDIO|Studio|展覽館|區|市|路|街|樓|號)", ln):
                venue = ln
            continue
        venue = ln  # 短場地名（如「南港 紅區」）
    # 若上面邏輯被短 chip 覆蓋，再向尾段掃一次取含地名嘅行
    if not re.search(r"(台北|臺北|新北|桃園|臺中|台中|臺南|台南|高雄|南港|STUDIO|Studio|展覽)", venue):
        for ln in reversed(lines[1:]):
            if re.search(r"(台北|臺北|新北|桃園|臺中|台中|南港|STUDIO|Studio|展覽館|中山路|民生|區)", ln) and not re.match(r"\d{4}-", ln):
                venue = ln
                break

    # 陣容
    page.evaluate(
        "() => [...document.querySelectorAll('*')]"
        ".find(e => e.children.length===0 && (e.innerText||'').trim()==='陣容')?.click()"
    )
    time.sleep(1.2)
    cast = page.evaluate(CAST_JS)

    tags = [ln for ln in lines[1:] if ln in SKIP_HEADER_LINES and ln not in ("實體活動", "線上活動", "AV女優")]
    return {
        "id": str(eid),
        "title": title,
        "start_date": hdr["start"],
        "end_date": hdr["end"],
        "venue": venue,
        "url": f"{BASE}/events/{eid}",
        "cast": cast,
        "tags": tags,
    }


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else f"/tmp/jkface-{date.today():%Y%m%d}.json"
    with Camoufox(headless=True, os="macos", humanize=True) as browser:
        page = browser.new_page()
        page.goto(LIST, wait_until="domcontentloaded", timeout=60000)
        time.sleep(4)
        set_date_range(page)
        apply_av_tag(page)
        ids = collect_list(page)
        log(f"列表 {len(ids)} 場: {ids}")

        events = []
        for i, eid in enumerate(ids, 1):
            try:
                ev = parse_detail(page, eid)
                if ev:
                    events.append(ev)
                    log(f"[{i}/{len(ids)}] {eid} {ev['start_date']}~{ev['end_date']} "
                        f"cast={ev['cast']} {ev['title'][:36]}")
            except Exception as e:  # 單場失敗唔阻成個 run
                log(f"[{i}/{len(ids)}] {eid} FAILED: {e}")
            time.sleep(0.8)

    payload = {"scraped_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "count": len(events), "events": events}
    with open(out_path, "w") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)
    log(f"寫出 {len(events)} 場 → {out_path}")
    print(out_path)


if __name__ == "__main__":
    main()
