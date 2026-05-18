#!/usr/bin/env python3
"""Generate Chinese audio for all chars and words using Edge-TTS.

Filenames are derived from Unicode codepoints (hex), e.g.:
  你    -> public/audio/chars/4f60.mp3
  你好  -> public/audio/words/4f60-597d.mp3

Resumable: skips files that already exist.
"""

import asyncio
import json
import os
import sys
import time
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
CHARS_JSON = ROOT / "src" / "data" / "characters.json"
WORDS_JSON = ROOT / "src" / "data" / "words.json"
OUT_CHARS = ROOT / "public" / "audio" / "chars"
OUT_WORDS = ROOT / "public" / "audio" / "words"

VOICE = "zh-CN-XiaoxiaoNeural"
CONCURRENCY = 16
MAX_RETRIES = 4


def codepoint_name(text: str) -> str:
    return "-".join(f"{ord(c):x}" for c in text)


async def synth_one(sem: asyncio.Semaphore, text: str, out_path: Path) -> tuple[str, bool, str]:
    if out_path.exists() and out_path.stat().st_size > 0:
        return text, True, "skip"
    async with sem:
        last_err = ""
        for attempt in range(MAX_RETRIES):
            try:
                tmp = out_path.with_suffix(".mp3.part")
                communicate = edge_tts.Communicate(text, VOICE)
                await communicate.save(str(tmp))
                if tmp.stat().st_size < 500:
                    last_err = f"too small ({tmp.stat().st_size}B)"
                    tmp.unlink(missing_ok=True)
                    await asyncio.sleep(0.5 + attempt)
                    continue
                tmp.rename(out_path)
                return text, True, "ok"
            except Exception as exc:  # noqa: BLE001
                last_err = repr(exc)
                await asyncio.sleep(0.5 + attempt * 1.5)
        return text, False, last_err


async def run(targets: list[tuple[str, Path]]) -> None:
    sem = asyncio.Semaphore(CONCURRENCY)
    tasks = [asyncio.create_task(synth_one(sem, text, path)) for text, path in targets]

    done_count = 0
    fail_count = 0
    skip_count = 0
    started = time.time()
    total = len(tasks)

    for fut in asyncio.as_completed(tasks):
        text, ok, status = await fut
        if status == "skip":
            skip_count += 1
        elif ok:
            done_count += 1
        else:
            fail_count += 1
            print(f"  FAIL  {text!r}: {status}", file=sys.stderr)

        processed = done_count + fail_count + skip_count
        if processed % 100 == 0 or processed == total:
            elapsed = time.time() - started
            rate = processed / elapsed if elapsed > 0 else 0
            remain = (total - processed) / rate if rate > 0 else 0
            print(
                f"[{processed}/{total}] ok={done_count} skip={skip_count} fail={fail_count} "
                f"{rate:.1f}/s eta={remain:.0f}s",
                flush=True,
            )


def load_targets() -> list[tuple[str, Path]]:
    OUT_CHARS.mkdir(parents=True, exist_ok=True)
    OUT_WORDS.mkdir(parents=True, exist_ok=True)

    targets: list[tuple[str, Path]] = []

    chars = json.loads(CHARS_JSON.read_text(encoding="utf-8"))
    for c in chars:
        h = c.get("hanzi")
        if not h:
            continue
        # Skip non-CJK like spaces or punctuation accidentally in dataset
        if not any("\u3400" <= ch <= "\u9fff" for ch in h):
            continue
        targets.append((h, OUT_CHARS / f"{codepoint_name(h)}.mp3"))

    words = json.loads(WORDS_JSON.read_text(encoding="utf-8"))
    for w in words:
        s = w.get("word") or w.get("simplified")
        if not s or len(s) < 1:
            continue
        if not any("\u3400" <= ch <= "\u9fff" for ch in s):
            continue
        targets.append((s, OUT_WORDS / f"{codepoint_name(s)}.mp3"))

    # Deduplicate by output path
    seen: set[Path] = set()
    unique: list[tuple[str, Path]] = []
    for text, path in targets:
        if path in seen:
            continue
        seen.add(path)
        unique.append((text, path))
    return unique


async def main() -> None:
    targets = load_targets()
    pending = [(t, p) for t, p in targets if not (p.exists() and p.stat().st_size > 0)]
    print(f"total={len(targets)} pending={len(pending)} concurrency={CONCURRENCY} voice={VOICE}")
    if not pending:
        print("nothing to do")
        return
    await run(pending)


if __name__ == "__main__":
    asyncio.run(main())
