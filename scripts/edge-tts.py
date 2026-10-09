#!/usr/bin/env python3
"""Batch text-to-speech via edge-tts (free Microsoft neural voices).

Reads a JSON manifest: [{"text": "...", "voice": "...", "out": "/path.mp3"}, ...]
and writes one MP3 per entry, plus a sidecar `<out>.words.json` with the
per-word boundaries (used for progressive, phrase-by-phrase captions).

Usage:
    python3 scripts/edge-tts.py manifest.json [+0%]

Requires `edge-tts` to be importable. Install it on demand, e.g.:
    pip install --target .tts edge-tts
    TTS_PYTHONPATH=.tts python3 scripts/edge-tts.py manifest.json
"""

import asyncio
import json
import sys

import edge_tts


async def synth(entry: dict, rate: str) -> None:
    communicate = edge_tts.Communicate(
        entry["text"],
        entry["voice"],
        rate=rate,
        boundary="WordBoundary",
    )
    words: list[dict] = []
    with open(entry["out"], "wb") as handle:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                handle.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # offset/duration are in 100-nanosecond ticks.
                words.append(
                    {
                        "t": chunk["text"],
                        "s": round(chunk["offset"] / 1e7, 4),
                        "d": round(chunk["duration"] / 1e7, 4),
                    }
                )
    with open(f"{entry['out']}.words.json", "w", encoding="utf-8") as handle:
        json.dump(words, handle, ensure_ascii=False)


async def main() -> None:
    manifest_path = sys.argv[1]
    rate = sys.argv[2] if len(sys.argv) > 2 else "+0%"
    with open(manifest_path, encoding="utf-8") as handle:
        entries = json.load(handle)
    for index, entry in enumerate(entries, start=1):
        await synth(entry, rate)
        print(f"  tts {index}/{len(entries)} -> {entry['out']}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
