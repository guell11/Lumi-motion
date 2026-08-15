(function () {
  const Editor = (window.Editor = window.Editor || {});
  const { $, $$, toast, formatTime } = Editor.Utils;

  class App {
    constructor() {
      this.store = new Editor.Store();
      this.animation = new Editor.AnimationEngine(this.store);
      this.canvas = new Editor.CanvasController(this.store, this.animation);
      this.audio = new Editor.AudioEngine(this.store);
      this.effects = new Editor.EffectsPanel(this.store);
      this.templates = new Editor.Templates(this.store);
      this.media = new Editor.MediaLibrary(this.store, this.effects, this.templates);
      this.timeline = new Editor.TimelineController(this.store);
      this.properties = new Editor.PropertiesPanel(this.store, this.audio);
      this.graph = new Editor.GraphEditor(this.store);
      this.exporter = new Editor.ExportController(this.store, this.canvas);
      this.panelDock = new Editor.PanelDockManager(this);
      this.playing = false;
      this.lastFrame = 0;
      this.projectPath = "";
      this.focusRegion = "canvas";
      this.language = localStorage.getItem("lumi-language") || "pt-BR";
      this.projectActive = false;
      this.shuttleRate = 1;
      Editor.t = (key) => this.t(key);
      this.bind();
      this.store.subscribe((store, reason) => this.render(reason));
      this.render("init");
      this.applyLanguage();
      this.loadRecentProjects();
      this.autosaveLoop();
      Editor.Bridge.ready.then(() => Editor.Bridge.call("getAppInfo").then((info) => {
        if (info.ok && !info.ffmpeg) toast("FFmpeg nao foi encontrado. Exportacao final e separar audio precisam dele no PATH.", "error");
      }));
    }

    bind() {
      $("#playBtn").addEventListener("click", () => this.togglePlay());
      $("#goStartBtn").addEventListener("click", () => this.store.setTime(0));
      $("#goEndBtn").addEventListener("click", () => this.store.setTime(this.store.effectiveDuration()));
      $("#gridToggleBtn").addEventListener("click", () => {
        this.store.grid = !this.store.grid;
        $("#gridToggleBtn").classList.toggle("active", this.store.grid);
        this.store.emit("grid");
      });
      $("#snapToggleBtn").addEventListener("click", () => {
        this.store.snap = !this.store.snap;
        $("#snapToggleBtn").classList.toggle("active", this.store.snap);
      });
      $("#motionToggleBtn").addEventListener("click", () => {
        this.store.motionPath = !this.store.motionPath;
        $("#motionToggleBtn").classList.toggle("active", this.store.motionPath);
        this.store.emit("motion:toggle");
      });
      $("#recordMotionBtn").addEventListener("click", () => {
        this.store.recordMotion = !this.store.recordMotion;
        // Auto Key follows the After Effects workflow: move the playhead first,
        // then change a property to create/update a keyframe at that exact time.
        if (this.store.recordMotion) {
          this.store.motionPath = true;
          $("#motionToggleBtn").classList.add("active");
        }
        $("#recordMotionBtn").classList.toggle("active", this.store.recordMotion);
        this.store.emit("record:motion");
        toast(this.store.recordMotion
          ? "Auto Key ativo: mova o playhead e altere uma propriedade para criar o keyframe."
          : "Auto Key desativado."
        );
      });
      $("#saveProjectBtn").addEventListener("click", () => this.saveProject());
      $("#openProjectBtn").addEventListener("click", () => this.openProject());
      $("#undoBtn")?.addEventListener("click", () => this.store.undo());
      $("#redoBtn")?.addEventListener("click", () => this.store.redo());
      $("#canvasZoom")?.addEventListener("input", (event) => {
        const output = event.target.closest("label")?.querySelector("output");
        if (output) output.value = `${event.target.value}%`;
      });
      $("#projectAspectPreset").addEventListener("change", (event) => {
        const [width, height] = event.target.value.split("x").map(Number);
        this.store.beginTransaction("project:aspect");
        this.store.project.settings.width = width;
        this.store.project.settings.height = height;
        this.store.project.settings.aspect = width === height ? "1:1" : width < height ? (height / width > 1.5 ? "9:16" : "4:5") : "16:9";
        this.store.endTransaction("project:aspect");
        this.canvas.resize();
        toast(`Canvas alterado para ${width} × ${height}.`);
      });
      $("#platformPreviewSelect").addEventListener("change", (event) => {
        const platform = event.target.value;
        const overlay = $("#platformPreviewOverlay");
        overlay.hidden = platform === "clean";
        overlay.dataset.platform = platform;
        if (platform !== "clean" && `${this.store.project.settings.width}x${this.store.project.settings.height}` !== "1080x1920") {
          this.store.beginTransaction("project:social-preview");
          this.store.project.settings.width = 1080;
          this.store.project.settings.height = 1920;
          this.store.project.settings.aspect = "9:16";
          this.store.endTransaction("project:social-preview");
        }
        this.canvas.resize();
      });
      $("#collapseInspectorBtn")?.addEventListener("click", () => this.toggleInspector());
      this.bindPaneResize($("#leftResizeHandle"), "--left-size", 220, 520, false);
      this.bindPaneResize($("#rightResizeHandle"), "--right-size", 260, 520, true);
      this.bindPaneResize($("#timelineResizeHandle"), "--timeline-size", 170, Math.max(360, window.innerHeight * .68), true, true);
      $("#projectName").addEventListener("input", (event) => this.store.setName(event.target.textContent.trim()));
      $("#hubNewProjectBtn").addEventListener("click", () => this.newProject());
      $("#hubOpenProjectBtn").addEventListener("click", async () => {
        const opened = await this.openProject();
        if (opened) this.closeHub();
      });
      $("#hubRefreshBtn").addEventListener("click", () => this.loadRecentProjects());
      $("#languageSelect").value = this.language;
      $("#languageSelect").addEventListener("change", (event) => {
        this.language = event.target.value;
        localStorage.setItem("lumi-language", this.language);
        this.applyLanguage();
      });
      document.querySelector(".track-canvas").addEventListener("pointerenter", () => (this.focusRegion = "timeline"));
      document.querySelector(".timeline-toolbar").addEventListener("pointerenter", () => (this.focusRegion = "timeline"));
      document.querySelector("#stageShell").addEventListener("pointerenter", () => (this.focusRegion = "canvas"));
      document.addEventListener("selectstart", (event) => {
        if (!this.isTypingTarget(event.target)) event.preventDefault();
      });
      window.addEventListener("keydown", (event) => this.shortcuts(event));
    }

    newProject() {
      this.projectPath = "";
      this.store.load(Editor.defaultProject());
      this.projectActive = true;
      this.closeHub();
      toast(this.t("newProjectReady"));
    }

    closeHub() {
      $("#projectHub").classList.add("hidden");
    }

    async loadRecentProjects() {
      const node = $("#recentProjects");
      node.innerHTML = `<div class="empty">${this.t("loadingRecent")}</div>`;
      const result = await Editor.Bridge.call("listRecentProjects");
      if (!result.ok || !(result.projects || []).length) {
        node.innerHTML = `<div class="empty">${this.t("noRecent")}</div>`;
        return;
      }
      node.innerHTML = result.projects
        .map((project) => `
          <div class="recent-card" data-path="${escapeAttr(project.path)}">
            <div><strong>${escapeHtml(project.name)}</strong><span>${escapeHtml(project.path)} - ${escapeHtml(project.modified || "")}</span></div>
            <button>${this.t("open")}</button>
          </div>`)
        .join("");
      node.querySelectorAll(".recent-card").forEach((card) => {
        card.addEventListener("click", async () => {
          const opened = await this.openProjectPath(card.dataset.path);
          if (opened) this.closeHub();
        });
      });
    }

    render(reason) {
      const projectNameNode = $("#projectName");
      if (projectNameNode.ownerDocument.activeElement !== projectNameNode) projectNameNode.textContent = this.store.project.name;
      $("#currentTimeLabel").textContent = formatTime(this.store.currentTime);
      $("#durationLabel").textContent = formatTime(this.store.effectiveDuration());
      $("#fpsSelect").value = String(this.store.project.settings.fps);
      $("#projectFormat").textContent = `${this.store.project.settings.width} × ${this.store.project.settings.height}`;
      const aspectValue = `${this.store.project.settings.width}x${this.store.project.settings.height}`;
      if ([...$("#projectAspectPreset").options].some((option) => option.value === aspectValue)) $("#projectAspectPreset").value = aspectValue;
      $("#recordMotionBtn").classList.toggle("active", this.store.recordMotion);
      $("#snapToggleBtn").classList.toggle("active", this.store.snap);
      $("#motionToggleBtn").classList.toggle("active", this.store.motionPath);
      $("#undoBtn")?.toggleAttribute("disabled", !this.store.history.length);
      $("#redoBtn")?.toggleAttribute("disabled", !this.store.future.length);
      if (reason === "time") {
        this.canvas.render();
        this.timeline.renderPlayhead();
        this.audio.syncToTime(this.store.currentTime);
        return;
      }
      if (reason === "timeline:drag-live" || reason === "canvas:drag-live") {
        this.canvas.render();
        this.timeline.renderPlayhead();
        return;
      }
      if (["settings", "load", "init", "duration"].includes(reason)) this.canvas.resize();
      else this.canvas.render();
      const livePropertyEdit = String(reason).startsWith("prop:");
      const quietPanelReason = livePropertyEdit || String(reason).startsWith("motion:") || String(reason).startsWith("text:") || reason === "record:sample";
      if (String(reason).startsWith("prop:audio:")) this.audio.syncToTime(this.store.currentTime, true);
      if (!quietPanelReason) this.media.render();
      if (reason === "record:sample" || livePropertyEdit) this.timeline.renderPlayhead();
      else this.timeline.render();
      if (!livePropertyEdit && reason !== "timeline:drag" && reason !== "timeline:drag-live" && reason !== "record:sample" && reason !== "text:animation") this.properties.render();
      this.graph.render();
    }

    togglePlay() {
      this.playing = !this.playing;
      this.store.playing = this.playing;
      $("#playBtn").textContent = this.playing ? "❚❚" : "▶";
      this.lastFrame = performance.now();
      this.canvas.render();
      if (this.playing) this.audio.start(this.store.currentTime);
      else this.audio.pause();
      if (this.playing) requestAnimationFrame((time) => this.tick(time));
    }

    tick(now) {
      if (!this.playing) return;
      const delta = (now - this.lastFrame) / 1000;
      this.lastFrame = now;
      let next = this.store.currentTime + delta;
      if (next >= this.store.effectiveDuration()) {
        next = 0;
        this.playing = false;
        this.store.playing = false;
        $("#playBtn").textContent = "▶";
      }
      if (!this.playing) $("#playBtn").textContent = "Play";
      if (!this.playing) this.audio.stop();
      this.store.setTime(next);
      requestAnimationFrame((time) => this.tick(time));
    }

    async saveProject() {
      const result = await Editor.Bridge.call("saveProject", JSON.stringify(this.store.serialize()), this.projectPath || "");
      if (!result.ok) return toast(result.error || "Nao foi possivel salvar.", "error");
      this.projectPath = result.path;
      toast(`Projeto salvo: ${result.path}`);
    }

    async openProject() {
      const result = await Editor.Bridge.call("openProjectDialog");
      if (!result.ok) {
        toast(result.error || this.t("openCanceled"));
        return false;
      }
      this.projectPath = result.path;
      this.projectActive = true;
      this.store.load(result.project);
      toast(`${this.t("projectOpened")}: ${result.path}`);
      return true;
    }

    async openProjectPath(path) {
      const result = await Editor.Bridge.call("openProjectPath", path);
      if (!result.ok) {
        toast(result.error || this.t("openCanceled"), "error");
        return false;
      }
      this.projectPath = result.path;
      this.projectActive = true;
      this.store.load(result.project);
      toast(`${this.t("projectOpened")}: ${result.path}`);
      return true;
    }

    autosaveLoop() {
      setInterval(async () => {
        if (!this.projectActive) return;
        const result = await Editor.Bridge.call("autosaveProject", JSON.stringify(this.store.serialize()), this.projectPath || "");
        if (result.ok && result.path && !this.projectPath) this.projectPath = result.path;
        const label = $("#autosaveStatus");
        if (result.ok) {
          label.textContent = `Autosave ${new Date().toLocaleTimeString()}`;
        } else {
          label.textContent = "Autosave falhou";
        }
      }, 10000);
    }

    shortcuts(event) {
      const key = event.key.toLowerCase();
      if (this.isTypingTarget(event.target)) return;
      if (event.ctrlKey && key === "s") {
        event.preventDefault();
        this.saveProject();
      } else if (event.ctrlKey && key === "k") {
        event.preventDefault();
        $("#panelSearch")?.focus();
      } else if (event.ctrlKey && key === "d") {
        event.preventDefault();
        this.store.duplicateSelected();
      } else if (event.ctrlKey && key === "a") {
        event.preventDefault();
        if (this.focusRegion === "timeline") {
          this.store.selectAllTimeline();
          toast(this.t("selectedTimeline"));
        } else {
          this.store.selectAllVisible();
          toast(this.t("selectedScene"));
        }
      } else if (event.ctrlKey && key === "z") {
        event.preventDefault();
        this.store.undo();
      } else if (event.ctrlKey && key === "y") {
        event.preventDefault();
        this.store.redo();
      } else if (key === " ") {
        event.preventDefault();
        this.togglePlay();
      } else if (key === "delete" || key === "backspace") {
        this.store.deleteSelected();
      } else if (key === "s" && !event.ctrlKey) {
        this.store.splitSelected();
      } else if (key === "arrowleft" || key === "arrowright") {
        event.preventDefault();
        const frames = event.shiftKey ? 10 : 1;
        const direction = key === "arrowleft" ? -1 : 1;
        this.store.setTime(this.store.currentTime + direction * frames / (this.store.project.settings.fps || 30));
      } else if (key === "home") {
        event.preventDefault();
        this.store.setTime(0);
      } else if (key === "end") {
        event.preventDefault();
        this.store.setTime(this.store.effectiveDuration());
      } else if (key === "v") {
        this.timeline.setTool("select");
      } else if (key === "b") {
        this.timeline.setTool("blade");
      } else if (key === "j") {
        this.store.setTime(Math.max(0, this.store.currentTime - 1));
      } else if (key === "k") {
        if (this.playing) this.togglePlay();
      } else if (key === "l") {
        if (!this.playing) this.togglePlay();
      }
    }

    bindPaneResize(handle, property, min, max, invert = false, vertical = false) {
      if (!handle) return;
      let start = 0;
      let initial = 0;
      const move = (event) => {
        if (!handle.classList.contains("resizing")) return;
        const pointer = vertical ? event.clientY : event.clientX;
        const delta = (pointer - start) * (invert ? -1 : 1);
        const next = Math.max(min, Math.min(max, initial + delta));
        document.documentElement.style.setProperty(property, `${next}px`);
        this.canvas.resize();
      };
      const end = () => {
        if (!handle.classList.contains("resizing")) return;
        handle.classList.remove("resizing");
        document.body.style.cursor = "";
        document.body.style.pointerEvents = "";
      };
      handle.addEventListener("pointerdown", (event) => {
        start = vertical ? event.clientY : event.clientX;
        initial = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(property)) || min;
        handle.classList.add("resizing");
        handle.setPointerCapture?.(event.pointerId);
        document.body.style.cursor = vertical ? "row-resize" : "col-resize";
      });
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      handle.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        const current = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(property)) || min;
        const positive = event.key === "ArrowRight" || event.key === "ArrowDown";
        const next = Math.max(min, Math.min(max, current + (positive ? 16 : -16) * (invert ? -1 : 1)));
        document.documentElement.style.setProperty(property, `${next}px`);
        this.canvas.resize();
      });
    }

    toggleInspector() {
      const root = document.documentElement;
      const current = parseFloat(getComputedStyle(root).getPropertyValue("--right-size")) || 340;
      if (current > 80) {
        root.dataset.inspectorPrevious = String(current);
        root.style.setProperty("--right-size", "54px");
        $(".right-panel")?.classList.add("collapsed");
        $("#collapseInspectorBtn").textContent = "‹";
      } else {
        root.style.setProperty("--right-size", `${Number(root.dataset.inspectorPrevious || 340)}px`);
        $(".right-panel")?.classList.remove("collapsed");
        $("#collapseInspectorBtn").textContent = "›";
      }
      this.canvas.resize();
    }

    isTypingTarget(target) {
      const node = target || document.activeElement;
      if (!node) return false;
      const tag = node.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || node.isContentEditable || node.classList?.contains("canvas-text-editor");
    }

    applyLanguage() {
      document.documentElement.lang = this.language;
      $("#languageSelect").value = this.language;
      $$("[data-i18n]").forEach((node) => {
        const label = this.t(node.dataset.i18n);
        const textNode = Array.from(node.childNodes).find((child) => child.nodeType === Node.TEXT_NODE && child.textContent.trim());
        if (node.matches("button") && node.querySelector(":scope > span")) {
          if (textNode) textNode.textContent = label;
          else node.append(document.createTextNode(label));
        } else {
          node.textContent = label;
        }
      });
      $("#panelSearch").placeholder = this.t("search");
      this.media?.render();
      this.properties?.render();
    }

    t(key) {
      return I18N[this.language]?.[key] || I18N["pt-BR"][key] || key;
    }
  }

  const I18N = {
    "pt-BR": {
      hubTitle: "Lumi Motion",
      hubSubtitle: "Motion design e edição de vídeo, sem interromper seu fluxo.",
      newProject: "Novo projeto",
      openProject: "Abrir projeto",
      language: "Idioma",
      recentProjects: "Projetos recentes",
      refresh: "Atualizar",
      media: "Mídia",
      audio: "Áudio",
      text: "Texto",
      stickers: "Elementos",
      animations: "Animação",
      effects: "Efeitos",
      transitions: "Transições",
      filters: "Filtros",
      adjust: "Ajuste",
      templates: "Modelos",
      open: "Abrir",
      save: "Salvar",
      export: "Exportar",
      search: "Pesquisar",
      loadingRecent: "Carregando projetos recentes...",
      noRecent: "Nenhum projeto recente ainda",
      newProjectReady: "Projeto novo criado.",
      openCanceled: "Abertura cancelada.",
      projectOpened: "Projeto aberto",
      selectedTimeline: "Tudo da timeline selecionado.",
      selectedScene: "Tudo visivel no frame atual selecionado.",
      import: "Importar",
      record: "Gravar",
      library: "Biblioteca",
      importHint: "Importe videos, imagens, audio, GIF, SVG ou fontes",
      addText: "Adicionar texto",
      text3d: "Texto 3D",
      caption: "Legenda",
      textPresets: "Presets de texto",
    },
    "en-US": {
      hubTitle: "Lumi Motion",
      hubSubtitle: "Create motion graphics, videos, and 3D text with timeline and keyframes.",
      newProject: "New project",
      openProject: "Open project",
      language: "Language",
      recentProjects: "Recent projects",
      refresh: "Refresh",
      media: "Media",
      audio: "Audio",
      text: "Text",
      stickers: "Stickers",
      animations: "Animations",
      effects: "Effects",
      transitions: "Transitions",
      filters: "Filters",
      adjust: "Adjust",
      templates: "Templates",
      open: "Open",
      save: "Save",
      export: "Export",
      search: "Search",
      loadingRecent: "Loading recent projects...",
      noRecent: "No recent projects yet",
      newProjectReady: "New project created.",
      openCanceled: "Open canceled.",
      projectOpened: "Project opened",
      selectedTimeline: "Selected everything in the timeline.",
      selectedScene: "Selected everything visible in the current frame.",
      import: "Import",
      record: "Record",
      library: "Library",
      importHint: "Import videos, images, audio, GIF, SVG, or fonts",
      addText: "Add text",
      text3d: "3D text",
      caption: "Caption",
      textPresets: "Text presets",
    },
  };

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]);
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  window.addEventListener("DOMContentLoaded", () => {
    window.lumiApp = new App();
  });
})();
