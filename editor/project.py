from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any


PROJECT_VERSION = 1


def default_project() -> dict[str, Any]:
    now = datetime.now().isoformat(timespec="seconds")
    return {
        "version": PROJECT_VERSION,
        "name": "Projeto sem titulo",
        "createdAt": now,
        "updatedAt": now,
        "settings": {
            "width": 1920,
            "height": 1080,
            "fps": 30,
            "duration": 15,
            "background": "#111214",
            "aspect": "16:9",
        },
        "media": [],
        "layers": [],
        "timeline": {
            "zoom": 72,
            "tracks": [
                {"id": "track-video", "name": "Video", "type": "video", "height": 54},
                {"id": "track-text", "name": "Texto", "type": "text", "height": 54},
                {"id": "track-shape", "name": "Shapes", "type": "shape", "height": 54},
                {"id": "track-audio", "name": "Audio", "type": "audio", "height": 48},
            ],
        },
        "presets": [],
        "markers": [],
    }


def load_project(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    return normalize_project(data)


def save_project(path: Path, data: dict[str, Any]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    normalized = normalize_project(data)
    normalized["updatedAt"] = datetime.now().isoformat(timespec="seconds")
    with path.open("w", encoding="utf-8") as handle:
        json.dump(normalized, handle, ensure_ascii=False, indent=2)
    return path


def normalize_project(data: dict[str, Any] | None) -> dict[str, Any]:
    base = default_project()
    if not isinstance(data, dict):
        return base

    merged = base | data
    merged["settings"] = base["settings"] | dict(data.get("settings") or {})
    merged["timeline"] = base["timeline"] | dict(data.get("timeline") or {})
    if not merged["timeline"].get("tracks"):
        merged["timeline"]["tracks"] = base["timeline"]["tracks"]

    for key in ("media", "layers", "presets", "markers"):
        if not isinstance(merged.get(key), list):
            merged[key] = []

    merged["version"] = PROJECT_VERSION
    return merged
