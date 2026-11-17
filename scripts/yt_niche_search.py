#!/usr/bin/env python3
"""Find YouTube lessons with yt-dlp without downloading any media.

Output: one JSON document on stdout. No iframe HTML is returned.
Usage: python scripts/yt_niche_search.py --query "NCERT Class 10 ..." --limit 4
"""
import argparse
import json
import re
import sys

VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


def find_lectures(query: str, limit: int = 4) -> list[dict]:
    from yt_dlp import YoutubeDL

    limit = max(1, min(6, limit))
    opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": "in_playlist",
        "skip_download": True,
        "ignoreerrors": True,
        "noplaylist": True,
        "socket_timeout": 4,
        "retries": 0,
        "extractor_retries": 0,
        "playlistend": limit,
    }
    results = []
    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info(f"ytsearch{limit}:{query}", download=False) or {}
        for entry in info.get("entries") or []:
            if not isinstance(entry, dict):
                continue
            video_id = entry.get("id")
            if not isinstance(video_id, str) or not VIDEO_ID.fullmatch(video_id):
                continue
            # Only metadata: never download video, subtitles, audio, or thumbnails.
            title = str(entry.get("title") or "YouTube lesson")[:130]
            channel = str(entry.get("channel") or entry.get("uploader") or "YouTube creator")[:90]
            duration = entry.get("duration")
            if isinstance(duration, (int, float)) and (duration < 45 or duration > 5400):
                continue
            results.append({
                "id": video_id,
                "title": title,
                "channel": channel,
                "description": str(entry.get("description") or "")[:240],
                "durationSeconds": int(duration) if isinstance(duration, (int, float)) else None,
            })
    return results


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", required=True, type=str)
    parser.add_argument("--limit", default=4, type=int)
    args = parser.parse_args()
    query = " ".join(args.query.split())[:180]
    if not query:
        print(json.dumps({"videos": [], "error": "empty query"}))
        return 2
    try:
        print(json.dumps({"videos": find_lectures(query, args.limit)}, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({"videos": [], "error": type(exc).__name__}), file=sys.stdout)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
