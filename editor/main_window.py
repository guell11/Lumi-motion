from __future__ import annotations

from pathlib import Path

from PyQt6.QtCore import QUrl
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineSettings
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWidgets import QMainWindow

from .bridge import EditorBridge
from .paths import AppPaths


class ConsolePage(QWebEnginePage):
    def javaScriptConsoleMessage(self, level, message, line_number, source_id):  # noqa: N802 - Qt override
        print(f"[web:{line_number}] {message}")


class VideoEditorWindow(QMainWindow):
    def __init__(self, root: Path):
        super().__init__()
        self.paths = AppPaths(root)
        self.setWindowTitle("Lumi Motion Video Editor")
        self.resize(1500, 900)

        self.view = QWebEngineView(self)
        self.page = ConsolePage(self.view)
        self.view.setPage(self.page)
        self.setCentralWidget(self.view)

        settings = self.view.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.PlaybackRequiresUserGesture, False)
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptCanAccessClipboard, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.FullScreenSupportEnabled, True)

        self.channel = QWebChannel(self.page)
        self.bridge = EditorBridge(self.paths, self)
        self.channel.registerObject("pyBridge", self.bridge)
        self.page.setWebChannel(self.channel)

        index = self.paths.web / "index.html"
        self.view.load(QUrl.fromLocalFile(str(index)))
