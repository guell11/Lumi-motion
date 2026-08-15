from __future__ import annotations

from pathlib import Path

from PyQt6.QtCore import QTimer, Qt, QUrl, pyqtSignal
from PyQt6.QtGui import QColor
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineSettings
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWidgets import QMainWindow

from .bridge import EditorBridge
from .paths import AppPaths


class ConsolePage(QWebEnginePage):
    def __init__(self, *args, popup_factory=None):
        super().__init__(*args)
        self.popup_factory = popup_factory

    def javaScriptConsoleMessage(self, level, message, line_number, source_id):  # noqa: N802 - Qt override
        print(f"[web:{line_number}] {message}")

    def createWindow(self, window_type):  # noqa: N802 - Qt override
        if self.popup_factory:
            return self.popup_factory(window_type)
        return super().createWindow(window_type)


class DropWebEngineView(QWebEngineView):
    filesDropped = pyqtSignal(list)

    def dragEnterEvent(self, event):  # noqa: N802 - Qt override
        if event.mimeData().hasUrls() and any(url.isLocalFile() for url in event.mimeData().urls()):
            event.acceptProposedAction()
            return
        super().dragEnterEvent(event)

    def dragMoveEvent(self, event):  # noqa: N802 - Qt override
        if event.mimeData().hasUrls() and any(url.isLocalFile() for url in event.mimeData().urls()):
            event.acceptProposedAction()
            return
        super().dragMoveEvent(event)

    def dropEvent(self, event):  # noqa: N802 - Qt override
        paths = [url.toLocalFile() for url in event.mimeData().urls() if url.isLocalFile()]
        if paths:
            self.filesDropped.emit(paths)
            event.acceptProposedAction()
            return
        super().dropEvent(event)


class VideoEditorWindow(QMainWindow):
    def __init__(self, root: Path):
        super().__init__()
        self.paths = AppPaths(root)
        self.detached_windows: list[QMainWindow] = []
        self.setWindowTitle("Lumi Motion Video Editor")
        self.resize(1500, 900)

        self.view = DropWebEngineView(self)
        self.view.setAcceptDrops(True)
        self.page = ConsolePage(self.view, popup_factory=self._create_popup)
        self.page.setBackgroundColor(QColor("#151515"))
        self.view.setPage(self.page)
        self.setCentralWidget(self.view)

        settings = self.view.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.PlaybackRequiresUserGesture, False)
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptCanAccessClipboard, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.FullScreenSupportEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.WebGLEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.Accelerated2dCanvasEnabled, True)

        self.channel = QWebChannel(self.page)
        self.bridge = EditorBridge(self.paths, self)
        self.view.filesDropped.connect(self.bridge.importDroppedPaths)
        self.channel.registerObject("pyBridge", self.bridge)
        self.page.setWebChannel(self.channel)

        index = self.paths.web / "index.html"
        self.page.renderProcessTerminated.connect(self._recover_renderer)
        self.view.loadFinished.connect(lambda _ok: self.view.update())
        self.view.load(QUrl.fromLocalFile(str(index)))

    def _recover_renderer(self, _status, _exit_code):
        # Chromium may terminate its render process after a driver reset. Reload
        # instead of leaving the central widget as an unexplained black panel.
        QTimer.singleShot(350, self.view.reload)

    def _create_popup(self, _window_type):
        """Create a real top-level WebEngine window for draggable editor panels."""
        popup = QMainWindow(self, Qt.WindowType.Window)
        popup.setAttribute(Qt.WidgetAttribute.WA_DeleteOnClose, True)
        popup.setWindowTitle("Lumi Motion · Painel")
        popup.resize(980, 620)

        view = QWebEngineView(popup)
        page = ConsolePage(self.page.profile(), view, popup_factory=self._create_popup)
        page.setBackgroundColor(QColor("#151515"))
        view.setPage(page)
        popup.setCentralWidget(view)

        settings = view.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.PlaybackRequiresUserGesture, False)
        settings.setAttribute(QWebEngineSettings.WebAttribute.WebGLEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.Accelerated2dCanvasEnabled, True)
        page.geometryChangeRequested.connect(popup.setGeometry)

        self.detached_windows.append(popup)
        popup.destroyed.connect(lambda: self._forget_popup(popup))
        popup.show()
        return page

    def _forget_popup(self, popup: QMainWindow) -> None:
        if popup in self.detached_windows:
            self.detached_windows.remove(popup)
