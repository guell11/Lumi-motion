from __future__ import annotations

import mimetypes
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}
SVG_EXTENSIONS = {".svg"}
FONT_EXTENSIONS = {".ttf", ".otf", ".woff", ".woff2"}


def classify_file(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        return "image"
    if suffix in VIDEO_EXTENSIONS:
        return "video"
    if suffix in AUDIO_EXTENSIONS:
        return "audio"
    if suffix in SVG_EXTENSIONS:
        return "svg"
    if suffix in FONT_EXTENSIONS:
        return "font"
    return "file"


def file_to_media(path: Path) -> dict[str, Any]:
    path = path.resolve()
    stat = path.stat()
    media_type = classify_file(path)
    mime, _ = mimetypes.guess_type(str(path))
    item = {
        "id": f"media-{abs(hash(str(path)))}",
        "name": path.name,
        "path": str(path),
        "url": path.as_uri(),
        "type": media_type,
        "mime": mime or "application/octet-stream",
        "size": stat.st_size,
        "duration": None,
    }
    if media_type in {"video", "audio"}:
        item["duration"] = probe_duration(path)
    return item


def probe_duration(path: Path) -> float | None:
    ffprobe = find_ffprobe(path)
    if ffprobe:
        try:
            result = subprocess.run(
                [
                    ffprobe,
                    "-v",
                    "error",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "default=noprint_wrappers=1:nokey=1",
                    str(path),
                ],
                check=True,
                capture_output=True,
                text=True,
                timeout=15,
            )
            return round(float(result.stdout.strip()), 3)
        except Exception:
            pass
    return probe_duration_with_ffmpeg(path)


def find_ffprobe(anchor: Path) -> str | None:
    system = shutil.which("ffprobe")
    if system:
        return system
    root = Path.cwd()
    candidates = [
        root / "tools" / "ffmpeg" / "bin" / "ffprobe.exe",
        root / "tools" / "ffmpeg" / "ffprobe.exe",
        anchor.parent / "ffprobe.exe",
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return None


def probe_duration_with_ffmpeg(path: Path) -> float | None:
    ffmpeg = find_ffmpeg(path)
    if not ffmpeg:
        return None
    try:
        result = subprocess.run([ffmpeg, "-i", str(path)], capture_output=True, text=True, timeout=15)
        match = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", result.stderr or result.stdout or "")
        if not match:
            return None
        hours, minutes, seconds = match.groups()
        return round(int(hours) * 3600 + int(minutes) * 60 + float(seconds), 3)
    except Exception:
        return None


def find_ffmpeg(anchor: Path) -> str | None:
    system = shutil.which("ffmpeg")
    if system:
        return system
    root = Path.cwd()
    candidates = [
        root / "tools" / "ffmpeg" / "bin" / "ffmpeg.exe",
        root / "tools" / "ffmpeg" / "ffmpeg.exe",
        anchor.parent / "ffmpeg.exe",
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    try:
        import imageio_ffmpeg  # type: ignore

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None
