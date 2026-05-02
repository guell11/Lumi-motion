(function () {
  const Editor = (window.Editor = window.Editor || {});
  const { $, toast, formatTime } = Editor.Utils;

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
      this.playing = false;
      this.lastFrame = 0;
      this.projectPath = "";
      this.focusRegion = "canvas";
      this.language = localStorage.getItem("lumi-language") || "pt-BR";
      this.projectActive = false;
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
        // Also enable motion path display when recording
        if (this.store.recordMotion) {
          this.store.motionPath = true;
          $("#motionToggleBtn").classList.add("active");
        }
        $("#recordMotionBtn").classList.toggle("active", this.store.recordMotion);
        this.store.emit("record:motion");
        toast(this.store.recordMotion
          ? "REC ativado! Mova o tempo na timeline e arraste o elemento para gravar keyframes."
          : "REC desativado."
        );
      });
      $("#saveProjectBtn").addEventListener("click", () => this.saveProject());
      $("#openProjectBtn").addEventListener("click", () => this.openProject());
      $("#projectName").addEventListener("input", (event) => this.store.setName(event.target.textContent.trim()));
      $("#fpsSelect").addEventListener("change", (event) => this.store.setSetting("fps", Number(event.target.value)));
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
      if (document.activeElement !== $("#projectName")) $("#projectName").textContent = this.store.project.name;
      $("#currentTimeLabel").textContent = formatTime(this.store.currentTime);
      $("#durationLabel").textContent = formatTime(this.store.effectiveDuration());
      $("#fpsSelect").value = String(this.store.project.settings.fps);
      $("#recordMotionBtn").classList.toggle("active", this.store.recordMotion);
      $("#snapToggleBtn").classList.toggle("active", this.store.snap);
      $("#motionToggleBtn").classList.toggle("active", this.store.motionPath);
      if (reason === "time") {
        this.canvas.render();
        this.timeline.renderPlayhead();
        this.audio.syncToTime(this.store.currentTime);
        return;
      }
      if (["settings", "load", "init", "duration"].includes(reason)) this.canvas.resize();
      else this.canvas.render();
      const quietPanelReason = String(reason).startsWith("prop:") || String(reason).startsWith("motion:") || String(reason).startsWith("text:") || reason === "record:sample";
      if (!quietPanelReason) this.media.render();
      if (reason === "record:sample") this.timeline.renderPlayhead();
      else this.timeline.render();
      if (reason !== "timeline:drag" && reason !== "record:sample" && reason !== "text:animation") this.properties.render();
      this.graph.render();
    }

    togglePlay() {
      this.playing = !this.playing;
      this.store.playing = this.playing;
      $("#playBtn").textContent = this.playing ? "Pause" : "Play";
      $("#playBtn").textContent = this.playing ? "❚❚" : "▶";
      this.lastFrame = performance.now();
      $("#playBtn").textContent = this.playing ? "Pause" : "Play";
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
      }
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
      document.querySelectorAll("[data-i18n]").forEach((node) => {
        node.textContent = this.t(node.dataset.i18n);
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
      hubSubtitle: "Crie motion graphics, videos e textos 3D com timeline e keyframes.",
      newProject: "Novo projeto",
      openProject: "Abrir projeto",
      language: "Idioma",
      recentProjects: "Projetos recentes",
      refresh: "Atualizar",
      media: "Midia",
      audio: "Audio",
      text: "Texto",
      stickers: "Stickers",
      animations: "Animacoes",
      effects: "Efeitos",
      transitions: "Transicoes",
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
