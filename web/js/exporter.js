(function () {
  const Editor = (window.Editor = window.Editor || {});
  const { $, toast } = Editor.Utils;

  class ExportController {
    constructor(store, canvas) {
      this.store = store;
      this.canvas = canvas;
      this.dialog = $("#exportDialog");
      this.progress = $("#exportProgress");
      this.cancelled = false;
      this.bind();
    }

    bind() {
      $("#exportBtn").addEventListener("click", () => this.open());
      $("#cancelExportBtn").addEventListener("click", () => this.close());
      $("#startExportBtn").addEventListener("click", () => this.exportFrames());
      document.addEventListener("lumi:export-progress", (event) => {
        if (event.detail?.frame != null) this.progress.value = Math.min(99, this.progress.value + 1);
      });
    }

    open() {
      $("#exportDuration").value = Math.max(0.1, this.store.contentEnd() || this.store.project.settings.duration).toFixed(2);
      $("#exportFps").value = this.store.project.settings.fps;
      this.progress.value = 0;
      this.dialog.classList.remove("hidden");
    }

    close() {
      this.cancelled = true;
      this.dialog.classList.add("hidden");
    }

    async exportFrames() {
      this.cancelled = false;
      const [width, height] = $("#exportResolution").value.split("x").map(Number);
      const fps = Number($("#exportFps").value || 30);
      const duration = Number($("#exportDuration").value || this.store.contentEnd() || this.store.project.settings.duration);
      const bitrate = $("#exportBitrate").value || "12M";
      const format = $("#exportFormat").value || "mp4";
      const options = { name: this.store.project.name || "export", width, height, fps, duration, bitrate, format };

      const pathResult = await Editor.Bridge.call("chooseExportPath", JSON.stringify(options));
      if (!pathResult.ok) return toast(pathResult.error || "Exportacao cancelada.");
      options.outputPath = pathResult.path;

      const begin = await Editor.Bridge.call("beginFrameExport", JSON.stringify(options));
      if (!begin.ok) {
        toast(begin.error || "Exportacao por frames indisponivel.", "error");
        return;
      }

      const total = Math.max(1, Math.ceil(duration * fps));
      this.progress.max = total + 1;
      this.progress.value = 0;
      toast(`Renderizando ${total} frames...`);

      const oldTime = this.store.currentTime;
      for (let i = 0; i < total; i += 1) {
        if (this.cancelled) return;
        const time = i / fps;
        this.store.currentTime = time;
        this.canvas.render(time);
        const frame = this.canvas.renderFrame(time);
        const saved = await Editor.Bridge.call("saveExportFrame", begin.sessionId, i, frame);
        if (!saved.ok) {
          toast(saved.error || "Falha ao salvar frame.", "error");
          return;
        }
        this.progress.value = i + 1;
        if (i % 4 === 0) await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      this.store.setTime(oldTime);

      const result = await Editor.Bridge.call("finishFrameExport", begin.sessionId, JSON.stringify(this.store.serialize()), JSON.stringify(options));
      if (!result.ok) {
        toast(result.error || "FFmpeg falhou.", "error");
        return;
      }
      this.progress.value = this.progress.max;
      this.close();
      toast(`Exportado: ${result.path}`);
    }
  }

  Editor.ExportController = ExportController;
})();
