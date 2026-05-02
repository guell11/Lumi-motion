from __future__ import annotations

import json
import base64
from datetime import datetime
from pathlib import Path
from typing import Any

from PyQt6.QtCore import QObject, pyqtSignal, pyqtSlot
from PyQt6.QtWidgets import QFileDialog

from .exporter import ExportError, FFmpegExporter, json_error, json_ok
from .media import file_to_media
from .paths import AppPaths
from .project import load_project, save_project


class EditorBridge(QObject):
    notify = pyqtSignal(str)
    exportProgress = pyqtSignal(str)

    def __init__(self, paths: AppPaths, parent: QObject | None = None):
        super().__init__(parent)
        self.paths = paths
        self.exporter = FFmpegExporter(paths.temp, paths.exports)
        self.current_project_path: Path | None = None

    @pyqtSlot(result=str)
    def getAppInfo(self) -> str:
        return json_ok(
            root=str(self.paths.root),
            web=str(self.paths.web),
            ffmpeg=self.exporter.available,
            autosaves=str(self.paths.autosaves),
            exports=str(self.paths.exports),
        )

    @pyqtSlot(result=str)
    def openMediaDialog(self) -> str:
        filters = (
            "Midia (*.mp4 *.mov *.mkv *.webm *.avi *.mp3 *.wav *.m4a *.aac *.png *.jpg *.jpeg *.webp *.gif *.svg *.ttf *.otf);;"
            "Videos (*.mp4 *.mov *.mkv *.webm *.avi);;"
            "Audio (*.mp3 *.wav *.m4a *.aac *.ogg *.flac);;"
            "Imagens (*.png *.jpg *.jpeg *.webp *.gif *.svg);;"
            "Fontes (*.ttf *.otf *.woff *.woff2);;"
            "Todos (*.*)"
        )
        files, _ = QFileDialog.getOpenFileNames(None, "Importar midia", str(Path.home()), filters)
        try:
            return json_ok(media=[file_to_media(Path(file)) for file in files])
        except Exception as exc:
            return json_error(str(exc))

    @pyqtSlot(result=str)
    def openProjectDialog(self) -> str:
        file, _ = QFileDialog.getOpenFileName(None, "Abrir projeto", str(self.paths.projects), "Projeto Lumi (*.lumi.json *.json)")
        if not file:
            return json_error("Abertura cancelada.")
        try:
            path = Path(file)
            self.current_project_path = path
            return json_ok(project=load_project(path), path=str(path))
        except Exception as exc:
            return json_error(str(exc))

    @pyqtSlot(result=str)
    def listRecentProjects(self) -> str:
        try:
            candidates = list(self.paths.projects.glob("*.lumi.json")) + list(self.paths.autosaves.glob("*.lumi.json"))
            items = []
            seen: set[str] = set()
            for path in sorted(candidates, key=lambda item: item.stat().st_mtime, reverse=True):
                resolved = str(path.resolve())
                if resolved in seen:
                    continue
                seen.add(resolved)
                try:
                    data = load_project(path)
                    name = data.get("name") or path.stem
                except Exception:
                    name = path.stem
                stat = path.stat()
                items.append(
                    {
                        "name": name,
                        "path": resolved,
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
                        "size": stat.st_size,
                    }
                )
                if len(items) >= 12:
                    break
            return json_ok(projects=items)
        except Exception as exc:
            return json_error(str(exc))

    @pyqtSlot(str, result=str)
    def openProjectPath(self, path_text: str) -> str:
        try:
            path = Path(path_text)
            if not path.exists():
                return json_error("Projeto nao encontrado.")
            self.current_project_path = path
            return json_ok(project=load_project(path), path=str(path.resolve()))
        except Exception as exc:
            return json_error(str(exc))

    @pyqtSlot(str, str, result=str)
    def saveProject(self, project_json: str, path_text: str) -> str:
        try:
            project = json.loads(project_json)
            path = Path(path_text) if path_text else self.current_project_path
            if path is None:
                suggested = self.paths.default_project_path(project.get("name") or "projeto")
                selected, _ = QFileDialog.getSaveFileName(None, "Salvar projeto", str(suggested), "Projeto Lumi (*.lumi.json)")
                if not selected:
                    return json_error("Salvamento cancelado.")
                path = Path(selected)
            self.current_project_path = save_project(path, project)
            return json_ok(path=str(self.current_project_path))
        except Exception as exc:
            return json_error(str(exc))

    @pyqtSlot(str, str, result=str)
    def autosaveProject(self, project_json: str, path_text: str) -> str:
        try:
            project = json.loads(project_json)
            safe_name = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in project.get("name", "autosave"))
            path = Path(path_text) if path_text else (self.current_project_path or self.paths.autosaves / f"{safe_name}.lumi.json")
            save_project(path, project)
            if self.current_project_path is None:
                self.current_project_path = path
            return json_ok(path=str(path))
        except Exception as exc:
            return json_error(str(exc))

    @pyqtSlot(str, result=str)
    def chooseExportPath(self, options_json: str) -> str:
        try:
            options = json.loads(options_json or "{}")
            suffix = ".gif" if options.get("format") == "gif" else ".mp4"
            suggested = self.paths.export_path(options.get("name") or "export", suffix)
            selected, _ = QFileDialog.getSaveFileName(None, "Exportar video", str(suggested), "Video (*.mp4);;GIF (*.gif);;Todos (*.*)")
            if not selected:
                return json_error("Exportacao cancelada.")
            return json_ok(path=selected)
        except Exception as exc:
            return json_error(str(exc))

    @pyqtSlot(str, result=str)
    def beginFrameExport(self, options_json: str) -> str:
        try:
            session = self.exporter.begin(json.loads(options_json or "{}"))
            return json_ok(sessionId=session.id)
        except Exception as exc:
            return json_error(str(exc))

    @pyqtSlot(str, int, str, result=str)
    def saveExportFrame(self, session_id: str, index: int, data_url: str) -> str:
        try:
            path = self.exporter.save_frame(session_id, index, data_url)
            if index % 10 == 0:
                self.exportProgress.emit(json.dumps({"frame": index}, ensure_ascii=False))
            return json_ok(path=str(path))
        except Exception as exc:
            return json_error(str(exc))

    @pyqtSlot(str, str, str, result=str)
    def finishFrameExport(self, session_id: str, project_json: str, options_json: str) -> str:
        try:
            path = self.exporter.finish(session_id, json.loads(project_json), json.loads(options_json or "{}"))
            return json_ok(path=str(path))
        except ExportError as exc:
            return json_error(str(exc))
        except Exception as exc:
            return json_error(str(exc))

    @pyqtSlot(str, str, result=str)
    def quickProxyExport(self, project_json: str, options_json: str) -> str:
        try:
            path = self.exporter.quick_proxy_export(json.loads(project_json), json.loads(options_json or "{}"))
            return json_ok(path=str(path))
        except Exception as exc:
            return json_error(str(exc))

    @pyqtSlot(str, result=str)
    def separateAudio(self, media_path: str) -> str:
        try:
            output = self.exporter.extract_audio(Path(media_path), self.paths.exports)
            return json_ok(media=file_to_media(output))
        except Exception as exc:
            return json_error(str(exc))

    @pyqtSlot(str, str, result=str)
    def videoFrame(self, media_path: str, time_text: str) -> str:
        try:
            if not media_path:
                return json_error("Caminho do video ausente.")
            output = self.exporter.extract_video_frame(Path(media_path), float(time_text or 0), self.paths.temp / "preview_frames")
            payload = base64.b64encode(output.read_bytes()).decode("ascii")
            return json_ok(dataUrl=f"data:image/png;base64,{payload}", path=str(output))
        except Exception as exc:
            return json_error(str(exc))

    @pyqtSlot(str, result=str)
    def previewAudio(self, media_path: str) -> str:
        try:
            if not media_path:
                return json_error("Caminho da midia ausente.")
            output = self.exporter.extract_preview_audio(Path(media_path), self.paths.temp / "preview_audio")
            return json_ok(media=file_to_media(output))
        except Exception as exc:
            return json_error(str(exc))
