(function () {
  const Editor = (window.Editor = window.Editor || {});
  const { $, toast } = Editor.Utils;

  class MediaLibrary {
    constructor(store, effects, templates) {
      this.store = store;
      this.effects = effects;
      this.templates = templates;
      this.panel = $("#panelContent");
      this.title = $("#panelTitle");
      this.searchInput = $("#panelSearch");
      this.searchQuery = "";
      this.active = "media";
      this.bind();
      document.addEventListener("lumi:media-imported", (event) => this.receiveImportedMedia(event.detail));
    }

    bind() {
      $("#toolTabs").querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => this.activatePanel(button.dataset.panel));
      });
      this.searchInput.setAttribute("aria-label", "Pesquisar no painel atual");
      this.searchInput.setAttribute("aria-controls", "panelContent");
      this.searchInput.addEventListener("input", () => {
        this.searchQuery = normalizeSearch(this.searchInput.value);
        this.applySearchFilter();
      });
      this.searchInput.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !this.searchInput.value) return;
        event.preventDefault();
        this.searchInput.value = "";
        this.searchQuery = "";
        this.applySearchFilter();
      });
    }

    activatePanel(panel) {
      this.active = panel || "media";
      $("#toolTabs").querySelectorAll("button").forEach((item) => {
        item.classList.toggle("active", item.dataset.panel === this.active);
      });
      this.render();
    }

    render() {
      const names = {
        media: tr("media"),
        audio: tr("audio"),
        text: tr("text"),
        shapes: tr("stickers"),
        animations: tr("animations"),
        effects: tr("effects"),
        transitions: tr("transitions"),
        filters: tr("filters"),
        adjust: tr("adjust"),
        templates: tr("templates"),
      };
      this.title.textContent = names[this.active] || "Painel";
      if (this.active === "media") this.renderMedia();
      else if (this.active === "audio") this.renderAudio();
      else if (this.active === "text") this.renderText();
      else if (this.active === "shapes") this.renderShapes();
      else if (this.active === "animations") this.renderAnimations();
      else if (this.active === "effects") this.renderEffects();
      else if (this.active === "transitions") this.renderTransitions();
      else if (this.active === "filters") this.renderFilters();
      else if (this.active === "templates") this.renderTemplates();
      else if (this.active === "adjust") this.renderAdjust();
      else this.renderMedia();
      this.bindSelectionContext();
      this.applySearchFilter();
    }

    applySearchFilter() {
      const previousStatus = this.panel.querySelector("#panelSearchStatus");
      previousStatus?.remove();

      const query = this.searchQuery;
      const items = Array.from(this.panel.querySelectorAll(".media-card, .preset-card, .template-card, .chip"));
      let matches = 0;
      items.forEach((item) => {
        const searchableText = normalizeSearch(`${item.dataset.search || ""} ${item.textContent || ""}`);
        const visible = !query || searchableText.includes(query);
        item.hidden = !visible;
        item.setAttribute("aria-hidden", String(!visible));
        if (visible) matches += 1;
      });

      this.panel.querySelectorAll(".empty:not([data-search-empty])").forEach((emptyState) => {
        emptyState.hidden = Boolean(query);
      });
      if (!query) return;

      const status = document.createElement("div");
      status.id = "panelSearchStatus";
      status.dataset.searchEmpty = "true";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      if (!matches) {
        status.className = "empty";
        status.textContent = `Nenhum resultado para “${this.searchInput.value.trim()}”.`;
      } else {
        status.textContent = `${matches} resultado${matches === 1 ? "" : "s"}.`;
        Object.assign(status.style, {
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: "0",
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: "0",
        });
      }
      this.panel.appendChild(status);
    }

    renderMedia() {
      this.panel.innerHTML = `
        <div class="button-row"><button id="importMediaBtn" class="primary">${tr("import")}</button><button id="recordBtn">${tr("record")}</button></div>
        ${this.selectionContext()}
        <div class="section-title">${tr("library")}</div>
        <div class="media-grid">${this.store.project.media.map((item) => this.mediaCard(item)).join("")}</div>
        ${this.store.project.media.length ? "" : `<div class="empty">${tr("importHint")}</div>`}`;
      $("#importMediaBtn").addEventListener("click", () => this.importMedia());
      $("#recordBtn").addEventListener("click", () => toast("Gravador preparado para integrar captura de tela/camera."));
      this.bindMediaCards();
    }

    renderAudio() {
      const audio = this.store.project.media.filter((item) => item.type === "audio");
      this.panel.innerHTML = `
        <div class="button-row"><button id="importAudioBtn" class="primary">Importar audio</button><button id="beatBtnPanel">Beat manual</button></div>
        ${this.selectionContext()}
        <div class="section-title">Audios</div>
        <div class="media-grid">${audio.map((item) => this.mediaCard(item)).join("")}</div>
        <div class="section-title">Ferramentas integradas</div>
        <div class="chip-list">
          <span class="chip" data-audio-tool="fade">Fade in/out</span>
          <span class="chip" data-audio-tool="normalize">Normalizar</span>
          <span class="chip" data-audio-tool="noise">Reduzir ruido</span>
          <span class="chip" data-audio-tool="voice">Aprimorar voz</span>
          <span class="chip" data-audio-tool="beat">Marcador beat</span>
          <span class="chip" data-audio-tool="separate">Separar audio</span>
        </div>`;
      $("#importAudioBtn").addEventListener("click", () => this.importMedia());
      $("#beatBtnPanel").addEventListener("click", () => this.store.addMarker());
      this.panel.querySelectorAll("[data-audio-tool]").forEach((node) => {
        node.addEventListener("click", () => this.applyAudioTool(node.dataset.audioTool));
      });
      this.bindMediaCards();
    }

    renderText() {
      this.panel.innerHTML = `
        <div class="button-row"><button id="newTextBtn" class="primary">${tr("addText")}</button><button id="newText3DBtn">${tr("text3d")}</button><button id="captionBtn">${tr("caption")}</button></div>
        ${this.selectionContext()}
        <div class="section-title">${tr("textPresets")}</div>
        <div class="preset-grid">${Editor.Presets.text.map((preset) => this.presetCard(preset)).join("")}</div>`;
      $("#newTextBtn").addEventListener("click", () => this.store.addLayer("text"));
      $("#newText3DBtn").addEventListener("click", () => this.store.addLayer("text3d"));
      $("#captionBtn").addEventListener("click", () => this.store.addLayer("text", { name: "Legenda", props: { text: "legenda animada", y: 890, fontSize: 64, strokeWidth: 8 } }));
      this.bindPresetCards();
    }

    renderShapes() {
      const shapes = ["rect", "circle", "line", "arrow", "star", "polygon"];
      const svgs = Editor.SvgLibrary?.items || [];
      this.panel.innerHTML = `
        ${this.selectionContext()}
        <div class="section-title">Shapes vetoriais</div>
        <div class="preset-grid">${shapes.map((shape) => `<div class="preset-card" data-shape="${shape}"><div class="preset-thumb">${shapeIcon(shape)}</div><div class="preset-name">${shape}</div></div>`).join("")}</div>
        <div class="section-title">Biblioteca SVG · ${svgs.length} vetores</div>
        <div class="svg-grid">${svgs.map((asset) => `<div class="svg-card" draggable="true" data-svg-asset="${asset.id}" data-search="${asset.category}"><div class="svg-thumb">${Editor.SvgLibrary.colorizeSvg(asset.svg, { svgColorMode:"duotone", svgPrimary:"#8b48ff", svgSecondary:"#f3f3f3", svgStroke:"#171717", svgStrokeWidth:3 })}</div><span>${asset.name}</span></div>`).join("")}</div>
        <div class="button-row svg-import-row"><button id="importSvgBtn">Importar meus SVGs</button></div>`;
      this.panel.querySelectorAll("[data-shape]").forEach((node) => {
        node.addEventListener("click", () => this.store.addLayer("shape", { props: { shape: node.dataset.shape } }));
      });
      this.panel.querySelectorAll("[data-svg-asset]").forEach((node) => {
        node.addEventListener("click", () => Editor.SvgLibrary.add(this.store, node.dataset.svgAsset));
        node.addEventListener("dragstart", (event) => {
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("application/x-lumi-svg", node.dataset.svgAsset);
          event.dataTransfer.setData("text/plain", `lumi-svg:${node.dataset.svgAsset}`);
        });
      });
      $("#importSvgBtn").addEventListener("click", () => this.importMedia());
    }

    renderAnimations() {
      this.panel.innerHTML = `
        <div class="button-row"><button id="recordMotionLibraryBtn" class="${this.store.recordMotion ? "primary" : ""}">${this.store.recordMotion ? "Desativar Auto Key" : "Ativar Auto Key"}</button><button id="smoothCursorBtn">Cursor suave + clique</button><button id="clearMotionBtn">Limpar path</button></div>
        ${this.selectionContext()}
        <div class="section-title">Camera</div>
        <div class="chip-list">${["Dolly in", "Dolly out", "Pan esquerda", "Pan direita", "Tilt dramatico", "Orbit 3D", "Camera shake"].map((name) => `<span class="chip" data-camera-preset="${name}">${name}</span>`).join("")}</div>
        <div class="section-title">Geral</div>
        <div class="preset-grid">${Editor.Presets.general.map((preset) => this.presetCard(preset)).join("")}</div>
        <div class="section-title">Texto</div>
        <div class="preset-grid">${Editor.Presets.text.map((preset) => this.presetCard(preset)).join("")}</div>`;
      $("#recordMotionLibraryBtn").addEventListener("click", () => this.toggleRecording());
      $("#smoothCursorBtn").addEventListener("click", () => {
        Editor.SvgLibrary.createSmoothCursor(this.store);
        toast("Cursor suave criado: caminho Auto Bezier e clique continuam editáveis.");
      });
      $("#clearMotionBtn").addEventListener("click", () => {
        const layer = this.store.selectedLayer();
        if (!layer) return toast("Selecione uma camada.", "error");
        layer.motionPath = { type: "linear", points: [] };
        delete layer.animations.x;
        delete layer.animations.y;
        this.store.emit("motion:clear");
      });
      this.panel.querySelectorAll("[data-camera-preset]").forEach((node) => node.addEventListener("click", () => this.store.applyCameraPreset(node.dataset.cameraPreset)));
      this.bindPresetCards();
    }

    renderEffects() {
      this.panel.innerHTML = `
        ${this.selectionContext()}
        <div class="section-title">Populares</div>
        <div class="preset-grid">${Editor.Presets.effects.map((effect) => `<div class="preset-card" data-effect="${escapeAttr(effect.name)}"><div class="preset-thumb">${effect.icon}</div><div class="preset-name">${escapeHtml(effect.name)}</div></div>`).join("")}</div>`;
      this.panel.querySelectorAll("[data-effect]").forEach((node) => node.addEventListener("click", () => this.effects.applyVisualEffect(Editor.Presets.effects.find((effect) => effect.name === node.dataset.effect))));
    }

    renderTransitions() {
      this.panel.innerHTML = `
        ${this.selectionContext()}
        <div class="section-title">Populares</div>
        <div class="preset-grid">${Editor.Presets.transitions.map((transition) => `<div class="preset-card" data-transition="${escapeAttr(transition.name)}"><div class="preset-thumb">${transition.icon}</div><div class="preset-name">${escapeHtml(transition.name)}</div></div>`).join("")}</div>`;
      this.panel.querySelectorAll("[data-transition]").forEach((node) => node.addEventListener("click", () => this.effects.applyTransition(Editor.Presets.transitions.find((transition) => transition.name === node.dataset.transition))));
    }

    renderFilters() {
      this.panel.innerHTML = `
        ${this.selectionContext()}
        <div class="section-title">Em destaque</div>
        <div class="preset-grid">${Editor.Presets.filters.map((filter) => `<div class="preset-card" data-filter="${escapeAttr(filter.name)}"><div class="preset-thumb">Filtro</div><div class="preset-name">${escapeHtml(filter.name)}</div></div>`).join("")}</div>`;
      this.panel.querySelectorAll("[data-filter]").forEach((node) => node.addEventListener("click", () => this.effects.applyFilter(Editor.Presets.filters.find((filter) => filter.name === node.dataset.filter))));
    }

    renderAdjust() {
      this.panel.innerHTML = `
        ${this.selectionContext()}
        <div class="section-title">Ajustes rapidos</div>
        <div class="chip-list">
          <span class="chip" data-adjust="brightness">Brilho</span>
          <span class="chip" data-adjust="contrast">Contraste</span>
          <span class="chip" data-adjust="saturation">Saturacao</span>
          <span class="chip" data-adjust="blur">Blur</span>
          <span class="chip" data-adjust="radius">Borda redonda</span>
          <span class="chip" data-adjust="glow">Glow</span>
          <span class="chip" data-adjust="mask">Mascara</span>
          <span class="chip" data-adjust="shadow">Sombra</span>
          <span class="chip" data-adjust="stroke">Contorno</span>
          <span class="chip" data-adjust="grain">Grao</span>
          <span class="chip" data-adjust="chroma">Aberracao cromatica</span>
          <span class="chip" data-adjust="vignette">Vinheta</span>
        </div>`;
      this.panel.querySelectorAll("[data-adjust]").forEach((node) => node.addEventListener("click", () => this.applyQuickAdjust(node.dataset.adjust)));
    }

    renderTemplates() {
      this.panel.innerHTML = `
        ${this.selectionContext()}
        <div class="section-title">Templates</div>
        <div class="template-grid">${this.templates.items.map((item, index) => `<div class="template-card" data-template="${index}"><div class="preset-thumb">Template</div><div class="preset-name">${escapeHtml(item.name)}</div></div>`).join("")}</div>`;
      this.panel.querySelectorAll("[data-template]").forEach((node) => node.addEventListener("click", () => this.templates.items[Number(node.dataset.template)].action()));
    }

    applyQuickAdjust(name) {
      const layer = this.store.selectedLayer();
      if (!layer) return toast("Selecione uma camada.", "error");
      layer.color = layer.color || {};
      layer.effects = layer.effects || {};
      if (name === "brightness") layer.color.brightness = Math.min(2, (layer.color.brightness || 1) + 0.1);
      if (name === "contrast") layer.color.contrast = Math.min(2.5, (layer.color.contrast || 1) + 0.12);
      if (name === "saturation") layer.color.saturation = Math.min(2.5, (layer.color.saturation || 1) + 0.15);
      if (name === "blur") layer.props.blur = Math.min(40, (layer.props.blur || 0) + 3);
      if (name === "radius") layer.props.radius = Math.min(500, (layer.props.radius || 0) + 18);
      if (name === "glow") layer.effects.glow = Math.min(60, (layer.effects.glow || 0) + 10);
      if (name === "mask") layer.props.mask = layer.props.mask === "circle" ? "none" : "circle";
      if (name === "shadow") layer.props.shadow = Math.min(60, (layer.props.shadow || 0) + 8);
      if (name === "stroke") layer.props.strokeWidth = Math.min(24, (layer.props.strokeWidth || 0) + 2);
      if (name === "grain") layer.color.grain = Math.min(1, (layer.color.grain || 0) + 0.1);
      if (name === "chroma") layer.color.chroma = Math.min(12, (layer.color.chroma || 0) + 1);
      if (name === "vignette") layer.effects.vignette = Math.min(1, (layer.effects.vignette || 0) + 0.2);
      this.store.emit("adjust");
    }

    applyAudioTool(name) {
      const layer = this.store.selectedLayer();
      if (!layer) return toast("Selecione uma camada.", "error");
      layer.audio = layer.audio || {};
      if (name === "fade") {
        layer.audio.fadeIn = 0.45;
        layer.audio.fadeOut = 0.45;
      } else if (name === "normalize") {
        layer.audio.normalize = !layer.audio.normalize;
      } else if (name === "noise") {
        layer.audio.reduceNoise = !layer.audio.reduceNoise;
      } else if (name === "voice") {
        layer.audio.enhance = !layer.audio.enhance;
      } else if (name === "beat") {
        this.store.addMarker();
        return;
      } else if (name === "separate") {
        toast("Use Separar audio no painel Audio da direita para criar o arquivo extraido.");
      }
      this.store.emit("audio:tool");
    }

    mediaCard(item) {
      const thumb = item.type === "image" || item.type === "svg"
        ? `<img src="${escapeAttr(item.url)}" alt="">`
        : item.type === "audio"
          ? "Audio"
          : item.type === "video"
            ? `<video src="${escapeAttr(item.url)}" muted preload="metadata" playsinline></video><span class="video-badge">Video</span>`
            : "Arquivo";
      return `<div class="media-card" draggable="true" data-media="${escapeAttr(item.id)}" data-search="${escapeAttr(mediaSearchTerms(item.type))}"><div class="media-thumb">${thumb}</div><div class="media-name">${escapeHtml(item.name)}</div></div>`;
    }

    presetCard(preset) {
      return `<div class="preset-card" data-preset="${escapeAttr(preset.name)}"><div class="preset-thumb">${preset.icon || "ABC"}</div><div class="preset-name">${escapeHtml(preset.name)}</div></div>`;
    }

    bindMediaCards() {
      this.panel.querySelectorAll("[data-media]").forEach((node) => {
        node.addEventListener("click", () => {
          const media = this.store.media(node.dataset.media);
          if (!media) return;
          this.addMediaAsLayer(media);
        });
        node.addEventListener("dragstart", (event) => {
          const media = this.store.media(node.dataset.media);
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("application/x-lumi-media", node.dataset.media);
          if (media?.type) event.dataTransfer.setData(`application/x-lumi-type-${media.type}`, "1");
          event.dataTransfer.setData("text/plain", `lumi-media:${node.dataset.media}`);
        });
      });
    }

    addMediaAsLayer(media, start = this.store.currentTime, trackId = null) {
      const type = media.type === "audio" ? "audio" : media.type === "video" ? "video" : media.type === "svg" ? "svg" : "image";
      const duration = type === "video" || type === "audio" ? Number(media.duration) || 5 : 5;
      const layer = this.store.addLayer(type, { media, mediaId:media.id, name:media.name, duration, start, ...(trackId ? { trackId } : {}) });
      if ((type === "video" || type === "audio") && Number(media.duration) > 0) {
        layer.props.mediaDurationSynced = true;
        this.store.ensureDuration(layer.start + layer.duration + 1);
        this.store.emit("media:duration");
      }
      return layer;
    }

    receiveImportedMedia(result) {
      if (!result?.ok) return toast(result?.error || "Não foi possível importar os arquivos.", "error");
      const items = result.media || [];
      this.store.addMedia(items);
      if (this.active !== "media") this.activatePanel("media");
      toast(`${items.length} arquivo(s) importado(s). Arraste-os para a timeline.`);
    }

    bindPresetCards() {
      this.panel.querySelectorAll("[data-preset]").forEach((node) => node.addEventListener("click", () => this.store.applyPresetToSelected(node.dataset.preset)));
    }

    selectionContext() {
      const layer = this.store.selectedLayer();
      if (!layer) {
        return `<div class="selection-context muted">Selecione algo no canvas ou na timeline para aplicar presets, efeitos e ajustes aqui.</div>`;
      }
      const end = Number(layer.start || 0) + Number(layer.duration || 0);
      const kind = { text: "Texto", text3d: "Texto 3D", image: "Imagem", video: "Video", svg: "SVG", shape: "Shape", audio: "Audio" }[layer.type] || "Camada";
      return `
        <div class="selection-context has-layer">
          <div>
            <strong>${escapeHtml(layer.name)}</strong>
            <span>${kind} - ${Number(layer.start || 0).toFixed(2)}s ate ${end.toFixed(2)}s</span>
          </div>
          <div class="context-actions">
            <button data-context-action="animation">Animar</button>
            <button data-context-action="rec">${this.store.recordMotion ? "Auto Key on" : "Auto Key"}</button>
            <button data-context-action="round">Arredondar</button>
            <button data-context-action="fade">Fade</button>
            <button data-context-action="reset">Reset FX</button>
          </div>
        </div>`;
    }

    bindSelectionContext() {
      this.panel.querySelectorAll("[data-context-action]").forEach((button) => {
        button.addEventListener("click", () => {
          const layer = this.store.selectedLayer();
          const action = button.dataset.contextAction;
          if (action === "animation") return this.activatePanel("animations");
          if (!layer) return toast("Selecione uma camada.", "error");
          if (action === "rec") {
            this.toggleRecording();
          } else if (action === "round") {
            layer.props.radius = Math.min(500, (layer.props.radius || 0) + 18);
            this.store.emit("radius");
          } else if (action === "fade") {
            layer.transitionIn = { name: "Fade", duration: 0.45, ease: "easeOut" };
            layer.transitionOut = { name: "Fade", duration: 0.45, ease: "easeIn" };
            this.store.emit("transition");
          } else if (action === "reset") {
            layer.effects = {};
            layer.color = { brightness: 1, contrast: 1, saturation: 1, temperature: 0, grain: 0, chroma: 0 };
            layer.props.blur = 0;
            this.store.emit("effect:reset");
          }
        });
      });
    }

    toggleRecording() {
      this.store.recordMotion = !this.store.recordMotion;
      if (this.store.recordMotion) this.store.motionPath = true;
      this.store.emit("record:motion");
      toast(this.store.recordMotion ? "Auto Key ativo: altere a propriedade no tempo atual." : "Auto Key desativado.");
    }

    async importMedia() {
      const result = await Editor.Bridge.call("openMediaDialog");
      if (!result.ok) return toast(result.error || "Importacao cancelada.", "error");
      this.store.addMedia(result.media || []);
      toast(`${(result.media || []).length} arquivo(s) importado(s).`);
    }
  }

  function shapeIcon(shape) {
    return { rect: "Rect", circle: "Circ", line: "Line", arrow: "Arrow", star: "Star", polygon: "Poly" }[shape] || "Shape";
  }

  function tr(key) {
    return (Editor.t && Editor.t(key)) || key;
  }

  function normalizeSearch(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase();
  }

  function mediaSearchTerms(type) {
    return {
      image: "imagem image foto photo",
      video: "video filme movie clip",
      audio: "audio som sound musica music",
      svg: "svg vetor vector",
      font: "fonte font tipografia typography",
    }[type] || "arquivo file";
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]);
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  Editor.MediaLibrary = MediaLibrary;
})();
