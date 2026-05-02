from __future__ import annotations

from pathlib import Path


class AppPaths:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.web = self.root / "web"
        self.projects = self.root / "projects"
        self.exports = self.root / "exports"
        self.autosaves = self.root / "autosaves"
        self.temp = self.root / ".tmp"

        for path in (self.projects, self.exports, self.autosaves, self.temp):
            path.mkdir(parents=True, exist_ok=True)

    def default_project_path(self, name: str = "projeto") -> Path:
        safe = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in name).strip("_") or "projeto"
        return self.projects / f"{safe}.lumi.json"

    def export_path(self, name: str, suffix: str = ".mp4") -> Path:
        safe = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in name).strip("_") or "export"
        return self.exports / f"{safe}{suffix}"
