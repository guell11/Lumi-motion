from __future__ import annotations

import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def main() -> int:
    chromium_flags = os.environ.get("QTWEBENGINE_CHROMIUM_FLAGS", "")
    required_flags = ["--allow-file-access-from-files", "--autoplay-policy=no-user-gesture-required"]
    # Hardware acceleration is the normal path. Software rendering remains an
    # explicit recovery mode for problematic drivers instead of penalizing every
    # editor session (especially canvas/video playback) by default.
    if sys.platform.startswith("win") and os.environ.get("LUMI_SOFTWARE_RENDERING") == "1":
        required_flags.append("--disable-gpu")
    for flag in required_flags:
        if flag not in chromium_flags:
            chromium_flags = f"{chromium_flags} {flag}".strip()
    os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = chromium_flags
    os.environ.setdefault("QT_LOGGING_RULES", "qt.webenginecontext.debug=false")

    try:
        from PyQt6.QtWidgets import QApplication, QMessageBox
        from editor.main_window import VideoEditorWindow
    except Exception as exc:  # pragma: no cover - used before Qt is fully available
        print("Nao foi possivel iniciar o editor.")
        print("Instale as dependencias com:")
        print("  python -m pip install PyQt6 PyQt6-WebEngine")
        print(f"Erro: {exc}")
        return 1

    app = QApplication(sys.argv)
    app.setApplicationName("Lumi Motion Video Editor")
    app.setOrganizationName("Lumi")

    try:
        window = VideoEditorWindow(ROOT)
        window.show()
    except Exception as exc:
        QMessageBox.critical(None, "Erro ao iniciar", str(exc))
        return 1

    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
