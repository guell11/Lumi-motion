(function () {
  const Editor = (window.Editor = window.Editor || {});
  const { $, clamp } = Editor.Utils;

  class PropertiesPanel {
    constructor(store, audioEngine) {
      this.store = store;
      this.audioEngine = audioEngine;
      this.panel = $("#propertiesPanel");
      this.activeTab = "basic";
      this.bind();
    }

    bind() {
      document.querySelectorAll(".right-tabs button").forEach((button) => {
        button.addEventListener("click", () => {
          document.querySelectorAll(".right-tabs button").forEach((item) => item.classList.remove("active"));
          button.classList.add("active");
          this.activeTab = button.dataset.right;
          this.render();
        });
      });
    }

    render() {
      if (this.activeTab === "camera") return this.renderCamera();
      const layer = this.store.selectedLayer();
      if (!layer) {
        this.panel.innerHTML = `<div class="empty">Selecione uma camada para editar</div>`;
        return;
      }
      if (this.activeTab === "animation") return this.renderAnimation(layer);
      if (this.activeTab === "audio") return this.renderAudio(layer);
      if (this.activeTab === "color") return this.renderColor(layer);
      if (this.activeTab === "graph") return this.renderGraph(layer);
      this.renderBasic(layer);
    }

    renderBasic(layer) {
      const props = layer.props;
      this.panel.innerHTML = "";
      this.group("Camada", [
        this.textInput("Nome", layer.name, (value) => (layer.name = value)),
        this.selectInput("Blend", props.blendMode, ["source-over", "multiply", "screen", "overlay", "lighter"], (value) => (props.blendMode = value)),
        this.buttonRow([
          ["Bloquear", () => this.store.toggleLayerFlag(layer.id, "locked")],
          ["Ocultar", () => this.store.toggleLayerFlag(layer.id, "hidden")],
          ["Duplicar", () => this.store.duplicateSelected()],
        ]),
      ]);
      this.group("Transformacao", [
        this.numberInput("X", props.x, (value) => this.setProp(layer, "x", value), "x"),
        this.numberInput("Y", props.y, (value) => this.setProp(layer, "y", value), "y"),
        this.numberInput("Z", props.z, (value) => this.setProp(layer, "z", value), "z"),
        this.numberInput("Largura", props.width, (value) => this.setProp(layer, "width", value), "width"),
        this.numberInput("Altura", props.height, (value) => this.setProp(layer, "height", value), "height"),
        this.rangeInput("Escala", props.scale, 0.05, 5, 0.01, (value) => this.setProp(layer, "scale", value), "scale"),
        this.rangeInput("Rotacao", props.rotation, -180, 180, 1, (value) => this.setProp(layer, "rotation", value), "rotation"),
        this.rangeInput("Opacidade", props.opacity, 0, 1, 0.01, (value) => this.setProp(layer, "opacity", value), "opacity"),
        this.rangeInput("Blur", props.blur, 0, 40, 0.1, (value) => this.setProp(layer, "blur", value), "blur"),
        this.rangeInput("Arredondar", props.radius || 0, 0, 500, 1, (value) => this.setProp(layer, "radius", value), "radius"),
      ]);
      this.group("2.5D", [
        this.rangeInput("Rotacao X", props.rotateX, -75, 75, 1, (value) => this.setProp(layer, "rotateX", value), "rotateX"),
        this.rangeInput("Rotacao Y", props.rotateY, -75, 75, 1, (value) => this.setProp(layer, "rotateY", value), "rotateY"),
        this.rangeInput("Perspectiva", props.perspective, 150, 1600, 10, (value) => this.setProp(layer, "perspective", value), "perspective"),
      ]);
      if (layer.type === "text" || layer.type === "text3d") {
        const rows = [
          this.textArea("Conteudo", props.text, (value) => this.setProp(layer, "text", value), "text"),
          this.textInput("Fonte", props.fontFamily, (value) => this.setProp(layer, "fontFamily", value), "fontFamily"),
          this.rangeInput("Tamanho", props.fontSize, 8, 260, 1, (value) => this.setProp(layer, "fontSize", value), "fontSize"),
          this.rangeInput("Espacamento", props.letterSpacing, -10, 60, 1, (value) => this.setProp(layer, "letterSpacing", value), "letterSpacing"),
          this.colorInput("Cor", props.fill, (value) => this.setProp(layer, "fill", value), "fill"),
          this.colorInput("Stroke", props.stroke, (value) => this.setProp(layer, "stroke", value), "stroke"),
          this.rangeInput("Contorno", props.strokeWidth, 0, 24, 1, (value) => this.setProp(layer, "strokeWidth", value), "strokeWidth"),
          this.rangeInput("Sombra", props.shadow, 0, 60, 1, (value) => this.setProp(layer, "shadow", value), "shadow"),
          this.selectInput("Alinhar", props.align, ["left", "center", "right"], (value) => this.setProp(layer, "align", value), "align"),
        ];
        if (layer.type === "text3d") {
          rows.push(
            this.rangeInput("Profundidade", props.depth, 1, 260, 1, (value) => this.setProp(layer, "depth", value), "depth"),
            this.rangeInput("Bevel", props.bevel, 0, 1.5, 0.01, (value) => this.setProp(layer, "bevel", value), "bevel"),
            this.rangeInput("Metal", props.metalness, 0, 1, 0.01, (value) => this.setProp(layer, "metalness", value), "metalness"),
            this.rangeInput("Rugosidade", props.roughness, 0, 1, 0.01, (value) => this.setProp(layer, "roughness", value), "roughness"),
            this.rangeInput("Luz X", props.lightX, -900, 900, 10, (value) => this.setProp(layer, "lightX", value), "lightX"),
            this.rangeInput("Luz Y", props.lightY, -900, 900, 10, (value) => this.setProp(layer, "lightY", value), "lightY"),
            this.rangeInput("Luz Z", props.lightZ, 50, 1600, 10, (value) => this.setProp(layer, "lightZ", value), "lightZ")
          );
        }
        this.group(layer.type === "text3d" ? "Texto 3D" : "Texto", rows);
      }
      if (layer.type === "shape") {
        this.group("Shape", [
          this.selectInput("Forma", props.shape, ["rect", "circle", "line", "arrow", "star", "polygon"], (value) => this.setProp(layer, "shape", value), "shape"),
          this.colorInput("Fill", props.fill, (value) => this.setProp(layer, "fill", value), "fill"),
          this.colorInput("Stroke", props.stroke, (value) => this.setProp(layer, "stroke", value), "stroke"),
          this.rangeInput("Stroke", props.strokeWidth, 0, 32, 1, (value) => this.setProp(layer, "strokeWidth", value), "strokeWidth"),
        ]);
      }
      this.mountGroups();
    }

    renderAnimation(layer) {
      const custom = this.store.project.presets.filter((preset) => preset.target === layer.type);
      const animations = layer.animations || {};
      const recOn = this.store.recordMotion;
      const pathPoints = layer.motionPath?.points?.length || 0;
      const tIn = layer.transitionIn;
      const tOut = layer.transitionOut;
      const transNames = Editor.Presets.transitions.map((t) => t.name);
      const isTextLayer = layer.type === "text";
      this.panel.innerHTML = `
        <div class="prop-group rec-group ${recOn ? "rec-active" : ""}">
          <h3>⏺ Gravacao de animacao</h3>
          <button id="recordMotionPanelBtn" class="rec-btn ${recOn ? "recording" : ""}">
            <span class="rec-dot"></span>
            ${recOn ? "⏹ PARAR GRAVACAO" : "⏺ INICIAR GRAVACAO"}
          </button>
          <p class="muted">${recOn
            ? "✅ Gravando! Mova o tempo na timeline, depois arraste o elemento ou altere propriedades. Cada mudanca cria um keyframe automaticamente."
            : "Ative para gravar keyframes. Mova o tempo → mude posicao/escala/rotacao → keyframes sao criados no tempo atual."
          }</p>
          ${recOn ? `<div class="button-row">
            <button id="recAddPosBtn">+ Pos X/Y</button>
            <button id="recAddScaleBtn">+ Escala</button>
            <button id="recAddOpBtn">+ Opacidade</button>
            <button id="recAddRotBtn">+ Rotacao</button>
          </div>` : ""}
        </div>
        ${isTextLayer ? `<div class="prop-group text-motion-card">
          <h3>Animacao do texto</h3>
          <div id="textAnimationMount"></div>
        </div>` : ""}
        <div class="prop-group">
          <h3>Transicao de Entrada</h3>
          <div id="transInMount"></div>
        </div>
        <div class="prop-group">
          <h3>Transicao de Saida</h3>
          <div id="transOutMount"></div>
        </div>
        <div class="prop-group">
          <h3>Velocidade</h3>
          <div id="animationSpeedMount"></div>
        </div>
        <div class="prop-group">
          <h3>Presets de animacao</h3>
          <div class="chip-list">${[...Editor.Presets.general, ...(layer.type === "text" ? Editor.Presets.text : []), ...custom].map((preset) => `<span class="chip" data-preset="${preset.name}">${preset.name}</span>`).join("")}</div>
        </div>
        <div class="prop-group">
          <h3>Keyframes (${Object.keys(animations).length} props)</h3>
          ${Object.keys(animations).length ? Object.entries(animations).map(([prop, frames]) => `<div class="keyline"><strong>${prop}</strong> ${frames.map((frame, idx) => `<button data-ease="${prop}:${idx}">${frame.time.toFixed(2)}s <span class="ease-label">${frame.ease || "linear"}</span></button>`).join(" ")}</div>`).join("") : "<p class=\"muted\">Nenhum keyframe ainda. Ative REC e mova elementos.</p>"}
          ${Object.keys(animations).length ? `<div class="button-row"><button id="clearAllKeysBtn">Limpar todos keyframes</button></div>` : ""}
        </div>
        <div class="prop-group">
          <h3>Caminho de Movimento (${pathPoints} pontos)</h3>
          <div class="button-row">
            <button id="linearPathBtn">Linear</button>
            <button id="curvePathBtn">Bezier</button>
            <button id="freePathBtn">Livre</button>
            <button id="clearMotionPanelBtn">Limpar</button>
          </div>
          <p class="muted">Dica: duplo-clique no canvas = novo ponto. Shift+duplo = bezier. Alt+duplo = remove.</p>
        </div>
        <div class="prop-group">
          <h3>Presets personalizados</h3>
          <div class="button-row"><button id="savePresetBtn">Salvar preset</button><button id="copyCurveBtn">Copiar curva</button><button id="pasteCurveBtn">Colar curva</button></div>
        </div>`;
      this.panel.querySelectorAll("[data-preset]").forEach((node) => node.addEventListener("click", () => this.store.applyPresetToSelected(node.dataset.preset)));
      this.panel.querySelector("#recordMotionPanelBtn").addEventListener("click", () => {
        this.store.recordMotion = !this.store.recordMotion;
        this.store.emit("record:motion");
      });
      if (isTextLayer) this.mountTextAnimationControls(layer);

      // Quick keyframe buttons while recording
      if (recOn) {
        const time = this.store.currentTime;
        this.panel.querySelector("#recAddPosBtn")?.addEventListener("click", () => {
          this.store.addKeyframe(layer.id, "x", time, layer.props.x);
          this.store.addKeyframe(layer.id, "y", time, layer.props.y);
          Editor.Utils.toast(`Keyframe X/Y em ${time.toFixed(2)}s`);
        });
        this.panel.querySelector("#recAddScaleBtn")?.addEventListener("click", () => {
          this.store.addKeyframe(layer.id, "scale", time, layer.props.scale);
          Editor.Utils.toast(`Keyframe Escala em ${time.toFixed(2)}s`);
        });
        this.panel.querySelector("#recAddOpBtn")?.addEventListener("click", () => {
          this.store.addKeyframe(layer.id, "opacity", time, layer.props.opacity);
          Editor.Utils.toast(`Keyframe Opacidade em ${time.toFixed(2)}s`);
        });
        this.panel.querySelector("#recAddRotBtn")?.addEventListener("click", () => {
          this.store.addKeyframe(layer.id, "rotation", time, layer.props.rotation);
          Editor.Utils.toast(`Keyframe Rotacao em ${time.toFixed(2)}s`);
        });
      }

      // Transition in controls
      const transInMount = this.panel.querySelector("#transInMount");
      transInMount.appendChild(this.selectInput("Efeito", tIn?.name || "Nenhum", ["Nenhum", ...transNames], (value) => {
        if (value === "Nenhum") layer.transitionIn = null;
        else layer.transitionIn = { name: value, duration: layer.transitionIn?.duration || 0.5, ease: "easeOut" };
        this.store.emit("transition");
      }));
      transInMount.appendChild(this.rangeInput("Duracao", tIn?.duration || 0.5, 0.1, 3, 0.05, (value) => {
        if (layer.transitionIn) layer.transitionIn.duration = value;
        this.store.emit("transition");
      }));

      // Transition out controls
      const transOutMount = this.panel.querySelector("#transOutMount");
      transOutMount.appendChild(this.selectInput("Efeito", tOut?.name || "Nenhum", ["Nenhum", ...transNames], (value) => {
        if (value === "Nenhum") layer.transitionOut = null;
        else layer.transitionOut = { name: value, duration: layer.transitionOut?.duration || 0.5, ease: "easeIn" };
        this.store.emit("transition");
      }));
      transOutMount.appendChild(this.rangeInput("Duracao", tOut?.duration || 0.5, 0.1, 3, 0.05, (value) => {
        if (layer.transitionOut) layer.transitionOut.duration = value;
        this.store.emit("transition");
      }));

      this.panel.querySelector("#animationSpeedMount").appendChild(
        this.rangeInput("Velocidade", layer.animationSpeed || 1, 0.1, 5, 0.05, (value) => {
          layer.animationSpeed = value;
          this.store.emit("animation:speed");
        })
      );

      // Easing cycle on keyframe button click
      this.panel.querySelectorAll("[data-ease]").forEach((node) => {
        node.addEventListener("click", () => {
          const [prop, idxStr] = node.dataset.ease.split(":");
          const idx = Number(idxStr);
          const frame = layer.animations?.[prop]?.[idx];
          if (!frame) return;
          const eases = Editor.Easing.names;
          const current = eases.indexOf(frame.ease || "linear");
          frame.ease = eases[(current + 1) % eases.length];
          this.store.emit("keyframe:update");
        });
      });

      this.panel.querySelector("#clearAllKeysBtn")?.addEventListener("click", () => {
        this.store.checkpoint();
        layer.animations = {};
        this.store.emit("keyframe:clear");
      });
      this.panel.querySelector("#savePresetBtn").addEventListener("click", () => {
        const name = prompt("Nome do preset", "Animacao personalizada");
        if (name) this.store.saveSelectedAsPreset(name);
      });
      this.panel.querySelector("#linearPathBtn").addEventListener("click", () => this.setPathType(layer, "linear"));
      this.panel.querySelector("#curvePathBtn").addEventListener("click", () => this.setPathType(layer, "bezier"));
      this.panel.querySelector("#freePathBtn").addEventListener("click", () => this.setPathType(layer, "free"));
      this.panel.querySelector("#clearMotionPanelBtn").addEventListener("click", () => {
        layer.motionPath = { type: "linear", points: [] };
        delete layer.animations.x;
        delete layer.animations.y;
        this.store.emit("motion:clear");
      });
      this.panel.querySelector("#copyCurveBtn").addEventListener("click", () => {
        localStorage.setItem("lumi-curve", JSON.stringify(layer.animations || {}));
        Editor.Utils.toast("Curva copiada.");
      });
      this.panel.querySelector("#pasteCurveBtn").addEventListener("click", () => {
        layer.animations = Editor.Utils.parseJSON(localStorage.getItem("lumi-curve"), layer.animations || {});
        this.store.emit("curve:paste");
      });
    }

    mountTextAnimationControls(layer) {
      const mount = this.panel.querySelector("#textAnimationMount");
      if (!mount) return;
      const anim = this.ensureTextAnimation(layer);
      mount.innerHTML = "";
      mount.appendChild(this.plainCheckbox("Ativar texto animado", anim.enabled !== false, (value) => {
        anim.enabled = value;
        this.store.emit("text:animation");
      }));
      mount.appendChild(this.plainCheckbox("Entrada", anim.inEnabled !== false, (value) => {
        anim.inEnabled = value;
        this.store.emit("text:animation");
      }));
      mount.appendChild(this.modeSelect("Modo entrada", anim.inMode || anim.mode || "typewriter", (value) => {
        anim.inMode = value;
        anim.mode = value;
        anim.enabled = value !== "plain";
        this.store.emit("text:animation");
      }));
      mount.appendChild(this.plainRange("Duracao entrada", anim.inDuration ?? anim.duration ?? 1, 0.1, 6, 0.05, (value) => {
        anim.inDuration = value;
        anim.duration = value;
        this.store.emit("text:animation");
      }));
      mount.appendChild(this.plainRange("Velocidade", anim.speed ?? 1, 0.1, 5, 0.05, (value) => {
        anim.speed = value;
        this.store.emit("text:animation");
      }));
      mount.appendChild(this.plainCheckbox("Saida", Boolean(anim.outEnabled), (value) => {
        anim.outEnabled = value;
        this.store.emit("text:animation");
      }));
      mount.appendChild(this.modeSelect("Modo saida", anim.outMode || "charOut", (value) => {
        anim.outMode = value;
        anim.outEnabled = value !== "plain";
        this.store.emit("text:animation");
      }));
      mount.appendChild(this.plainRange("Duracao saida", anim.outDuration ?? 0.8, 0.1, 6, 0.05, (value) => {
        anim.outDuration = value;
        this.store.emit("text:animation");
      }));
      mount.appendChild(this.buttonRow([
        ["Ver entrada", () => this.store.setTime(layer.start)],
        ["Ver saida", () => this.store.setTime(Math.max(layer.start, layer.start + layer.duration - (anim.outDuration || 0.8)))],
        ["Sem animacao", () => {
          anim.enabled = false;
          anim.inEnabled = false;
          anim.outEnabled = false;
          this.store.emit("text:animation");
        }],
      ]));
    }

    ensureTextAnimation(layer) {
      layer.textAnimation = layer.textAnimation || {};
      const anim = layer.textAnimation;
      anim.enabled = anim.enabled !== false;
      anim.inEnabled = anim.inEnabled !== false;
      anim.inMode = anim.inMode || anim.mode || "typewriter";
      anim.mode = anim.mode || anim.inMode;
      anim.outMode = anim.outMode || "charOut";
      anim.inDuration = Number(anim.inDuration ?? anim.duration ?? 1);
      anim.duration = Number(anim.duration ?? anim.inDuration);
      anim.outDuration = Number(anim.outDuration ?? 0.8);
      anim.speed = Number(anim.speed ?? 1);
      return anim;
    }

    textModes() {
      return [
        ["plain", "Sem efeito"],
        ["typewriter", "Teclado"],
        ["charFade", "Letra por letra"],
        ["charRise", "Letras subindo"],
        ["charOut", "Sumir letras"],
        ["charBounce", "Bounce"],
        ["charRotate", "Girar letras"],
        ["charShake", "Tremer letras"],
        ["charExplode", "Explodir"],
        ["scramble", "Embaralhar"],
        ["wordFade", "Palavra por palavra"],
        ["wordRise", "Palavras subindo"],
        ["wordFall", "Palavras caindo"],
        ["wordZoom", "Zoom por palavra"],
        ["block", "Bloco"],
        ["merge", "Mesclar"],
        ["roll", "Rolagem"],
        ["neon", "Neon"],
        ["wave", "Ondulacao"],
        ["glitch", "Glitch"],
        ["blur", "Blur"],
      ];
    }

    modeSelect(label, value, setter) {
      const row = this.plainRow(label);
      const select = document.createElement("select");
      this.textModes().forEach(([mode, name]) => {
        const option = document.createElement("option");
        option.value = mode;
        option.textContent = name;
        if (mode === value) option.selected = true;
        select.appendChild(option);
      });
      select.addEventListener("change", () => setter(select.value));
      row.children[1].appendChild(select);
      return row;
    }

    plainRange(label, value, min, max, step, setter) {
      const row = this.plainRow(label);
      const input = document.createElement("input");
      input.type = "range";
      input.min = min;
      input.max = max;
      input.step = step;
      input.value = value ?? 0;
      const numeric = document.createElement("input");
      numeric.type = "number";
      numeric.step = step;
      numeric.value = value ?? 0;
      input.addEventListener("input", () => {
        numeric.value = input.value;
        setter(Number(input.value));
      });
      numeric.addEventListener("input", () => {
        input.value = numeric.value;
        setter(Number(numeric.value));
      });
      row.children[1].appendChild(input);
      row.children[1].appendChild(numeric);
      return row;
    }

    plainCheckbox(label, value, setter) {
      const row = document.createElement("div");
      row.className = "prop-row two";
      row.innerHTML = `<label>${label}</label>`;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(value);
      input.addEventListener("change", () => setter(input.checked));
      row.appendChild(input);
      return row;
    }

    plainRow(label) {
      const row = document.createElement("div");
      row.className = "prop-row";
      row.innerHTML = `<label>${label}</label><div class="prop-control"></div><span></span>`;
      return row;
    }

    renderAudio(layer) {
      this.panel.innerHTML = "";
      this.group("Audio", [
        this.rangeInput("Volume", layer.audio.volume, 0, 2, 0.01, (value) => (layer.audio.volume = value)),
        this.rangeInput("Fade-in", layer.audio.fadeIn, 0, 8, 0.1, (value) => (layer.audio.fadeIn = value)),
        this.rangeInput("Fade-out", layer.audio.fadeOut, 0, 8, 0.1, (value) => (layer.audio.fadeOut = value)),
        this.rangeInput("Velocidade", layer.audio.speed ?? 1, 0.5, 2, 0.01, (value) => (layer.audio.speed = value)),
        this.rangeInput("Pitch", layer.audio.pitch ?? 0, -12, 12, 1, (value) => (layer.audio.pitch = value)),
        this.rangeInput("Pan", layer.audio.pan ?? 0, -1, 1, 0.01, (value) => (layer.audio.pan = value)),
        this.rangeInput("Graves", layer.audio.low ?? 0, -18, 18, 1, (value) => (layer.audio.low = value)),
        this.rangeInput("Medios", layer.audio.mid ?? 0, -18, 18, 1, (value) => (layer.audio.mid = value)),
        this.rangeInput("Agudos", layer.audio.high ?? 0, -18, 18, 1, (value) => (layer.audio.high = value)),
        this.rangeInput("Reverb", layer.audio.reverb ?? 0, 0, 1, 0.01, (value) => (layer.audio.reverb = value)),
        this.checkboxInput("Normalizar", layer.audio.normalize, (value) => (layer.audio.normalize = value)),
        this.checkboxInput("Aprimorar voz", layer.audio.enhance, (value) => (layer.audio.enhance = value)),
        this.checkboxInput("Reduzir ruido", layer.audio.reduceNoise, (value) => (layer.audio.reduceNoise = value)),
        this.checkboxInput("Compressor", layer.audio.compressor, (value) => (layer.audio.compressor = value)),
        this.checkboxInput("Limiter", layer.audio.limiter, (value) => (layer.audio.limiter = value)),
        this.buttonRow(layer.type === "video" ? [["Separar audio", () => this.audioEngine.separateSelectedAudio()]] : [["Marcador de beat", () => this.store.addMarker()]]),
      ]);
      this.mountGroups();
    }

    renderColor(layer) {
      layer.color = layer.color || {};
      this.panel.innerHTML = "";
      this.group("Color grading", [
        this.rangeInput("Brilho", layer.color.brightness ?? 1, 0.2, 2, 0.01, (value) => (layer.color.brightness = value)),
        this.rangeInput("Contraste", layer.color.contrast ?? 1, 0.2, 2.5, 0.01, (value) => (layer.color.contrast = value)),
        this.rangeInput("Saturacao", layer.color.saturation ?? 1, 0, 2.5, 0.01, (value) => (layer.color.saturation = value)),
        this.rangeInput("Temperatura", layer.color.temperature ?? 0, -50, 50, 1, (value) => (layer.color.temperature = value)),
        this.rangeInput("Grao", layer.color.grain ?? 0, 0, 1, 0.01, (value) => (layer.color.grain = value)),
        this.rangeInput("Aberracao", layer.color.chroma ?? 0, 0, 12, 0.1, (value) => (layer.color.chroma = value)),
      ]);
      this.mountGroups();
    }

    renderGraph(layer) {
      const entries = Object.entries(layer.animations || {});
      this.panel.innerHTML = `
        <div class="prop-group">
          <h3>Graph editor</h3>
          <p class="muted">O grafico abaixo mostra os keyframes. Duplo clique no grafico alterna a propriedade; clique em um ponto alterna o easing.</p>
        </div>
        <div class="prop-group">
          <h3>Propriedades animadas</h3>
          ${entries.map(([name, frames]) => `<div class="keyline"><strong>${name}</strong> ${frames.length} keyframes</div>`).join("") || "<p class=\"muted\">Sem curvas ainda.</p>"}
        </div>`;
    }

    renderCamera() {
      const camera = this.store.project.camera || { props: {}, animations: {} };
      const props = camera.props;
      this.panel.innerHTML = "";
      this.group("Camera global", [
        this.rangeInput("Pan X", props.x ?? 0, -1600, 1600, 1, (value) => this.store.setCameraProp("x", value), "camera:x"),
        this.rangeInput("Pan Y", props.y ?? 0, -900, 900, 1, (value) => this.store.setCameraProp("y", value), "camera:y"),
        this.rangeInput("Dolly Z", props.z ?? 900, 120, 2400, 1, (value) => this.store.setCameraProp("z", value), "camera:z"),
        this.rangeInput("Zoom", props.zoom ?? 1, 0.2, 4, 0.01, (value) => this.store.setCameraProp("zoom", value), "camera:zoom"),
        this.rangeInput("Roll", props.rotation ?? 0, -45, 45, 0.1, (value) => this.store.setCameraProp("rotation", value), "camera:rotation"),
        this.rangeInput("Tilt X", props.tiltX ?? 0, -35, 35, 0.1, (value) => this.store.setCameraProp("tiltX", value), "camera:tiltX"),
        this.rangeInput("Tilt Y", props.tiltY ?? 0, -35, 35, 0.1, (value) => this.store.setCameraProp("tiltY", value), "camera:tiltY"),
        this.rangeInput("FOV 3D", props.fov ?? 45, 20, 90, 1, (value) => this.store.setCameraProp("fov", value), "camera:fov"),
      ]);
      this.group("Movimentos prontos", [
        this.buttonRow([
          ["Dolly in", () => this.store.applyCameraPreset("Dolly in")],
          ["Dolly out", () => this.store.applyCameraPreset("Dolly out")],
          ["Pan esq.", () => this.store.applyCameraPreset("Pan esquerda")],
          ["Pan dir.", () => this.store.applyCameraPreset("Pan direita")],
          ["Orbit 3D", () => this.store.applyCameraPreset("Orbit 3D")],
          ["Shake", () => this.store.applyCameraPreset("Camera shake")],
        ]),
      ]);
      this.group("Keyframes da camera", [
        this.buttonRow([
          ["Key X/Y", () => {
            this.store.addCameraKeyframe("x", this.store.currentTime, props.x ?? 0);
            this.store.addCameraKeyframe("y", this.store.currentTime, props.y ?? 0);
          }],
          ["Key Zoom", () => this.store.addCameraKeyframe("zoom", this.store.currentTime, props.zoom ?? 1)],
          ["Key 3D", () => {
            ["z", "tiltX", "tiltY", "rotation", "fov"].forEach((key) => this.store.addCameraKeyframe(key, this.store.currentTime, props[key] ?? 0, true));
            this.store.emit("camera:keyframe");
          }],
        ]),
      ]);
      this.mountGroups();
    }

    setProp(layer, property, value) {
      layer.props[property] = value;
      if (this.store.recordMotion) {
        this.store.addKeyframe(layer.id, property, this.store.currentTime, value, true);
        if (property === "x" || property === "y") this.addMotionPoint(layer);
      }
      this.store.emit(`prop:${property}`);
    }

    addMotionPoint(layer) {
      layer.motionPath = layer.motionPath || { type: "linear", points: [] };
      const time = this.store.currentTime;
      const point = layer.motionPath.points.find((item) => Math.abs(item.time - time) < 0.015);
      if (point) {
        point.x = layer.props.x;
        point.y = layer.props.y;
      } else {
        layer.motionPath.points.push({ time, x: layer.props.x, y: layer.props.y, ease: "easeInOut" });
      }
      layer.motionPath.points.sort((a, b) => a.time - b.time);
    }

    setPathType(layer, type) {
      layer.motionPath = layer.motionPath || { points: [] };
      layer.motionPath.type = type;
      if (type === "bezier") {
        layer.motionPath.points.forEach((point) => {
          point.handleIn = point.handleIn || { x: -80, y: 0 };
          point.handleOut = point.handleOut || { x: 80, y: 0 };
        });
      }
      this.store.emit("motion:type");
    }

    group(title, rows) {
      this.pendingGroups = this.pendingGroups || [];
      this.pendingGroups.push({ title, rows });
    }

    mountGroups() {
      const groups = this.pendingGroups || [];
      this.pendingGroups = [];
      this.panel.innerHTML = groups
        .map((group, index) => `<div class="prop-group"><h3>${group.title}</h3><div data-group="${index}"></div></div>`)
        .join("");
      groups.forEach((group, index) => {
        const root = this.panel.querySelector(`[data-group="${index}"]`);
        group.rows.forEach((row) => root.appendChild(row));
      });
    }

    numberInput(label, value, setter, property) {
      const row = this.row(label, property);
      const input = document.createElement("input");
      input.type = "number";
      input.step = "1";
      input.value = Math.round(Number(value) || 0);
      input.addEventListener("input", () => setter(Number(input.value)));
      row.children[1].appendChild(input);
      return row;
    }

    rangeInput(label, value, min, max, step, setter, property) {
      const row = this.row(label, property);
      const input = document.createElement("input");
      input.type = "range";
      input.min = min;
      input.max = max;
      input.step = step;
      input.value = value ?? 0;
      const numeric = document.createElement("input");
      numeric.type = "number";
      numeric.step = step;
      numeric.value = value ?? 0;
      input.addEventListener("input", () => {
        numeric.value = input.value;
        setter(Number(input.value));
      });
      numeric.addEventListener("input", () => {
        input.value = numeric.value;
        setter(Number(numeric.value));
      });
      row.children[1].appendChild(input);
      row.children[1].appendChild(numeric);
      return row;
    }

    colorInput(label, value, setter, property) {
      const row = this.row(label, property);
      const input = document.createElement("input");
      input.type = "color";
      input.value = value || "#ffffff";
      input.addEventListener("input", () => setter(input.value));
      row.children[1].appendChild(input);
      return row;
    }

    textInput(label, value, setter, property) {
      const row = this.row(label, property);
      const input = document.createElement("input");
      input.value = value || "";
      input.addEventListener("input", () => {
        setter(input.value);
        this.store.emit("text");
      });
      row.children[1].appendChild(input);
      return row;
    }

    textArea(label, value, setter, property) {
      const row = this.row(label, property);
      const input = document.createElement("input");
      input.value = value || "";
      input.addEventListener("input", () => setter(input.value));
      row.children[1].appendChild(input);
      return row;
    }

    selectInput(label, value, options, setter, property) {
      const row = this.row(label, property);
      const select = document.createElement("select");
      options.forEach((option) => {
        const node = document.createElement("option");
        node.value = option;
        node.textContent = option;
        if (option === value) node.selected = true;
        select.appendChild(node);
      });
      select.addEventListener("change", () => {
        setter(select.value);
        this.store.emit("select-input");
      });
      row.children[1].appendChild(select);
      return row;
    }

    checkboxInput(label, value, setter) {
      const row = document.createElement("div");
      row.className = "prop-row two";
      row.innerHTML = `<label>${label}</label>`;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(value);
      input.addEventListener("change", () => {
        setter(input.checked);
        this.store.emit("checkbox");
      });
      row.appendChild(input);
      return row;
    }

    buttonRow(items) {
      const row = document.createElement("div");
      row.className = "button-row";
      items.forEach(([label, handler]) => {
        const button = document.createElement("button");
        button.textContent = label;
        button.addEventListener("click", handler);
        row.appendChild(button);
      });
      return row;
    }

    row(label, property) {
      const row = document.createElement("div");
      row.className = "prop-row";
      row.innerHTML = `<label>${label}</label><div class="prop-control"></div>`;
      const key = document.createElement("button");
      key.textContent = "◇";
      key.title = `Adicionar keyframe de ${property || label}`;
      key.addEventListener("click", () => {
        if (!property) return;
        if (String(property).startsWith("camera:")) {
          const prop = property.split(":")[1];
          const camera = this.store.project.camera || { props: {} };
          this.store.addCameraKeyframe(prop, this.store.currentTime, camera.props[prop]);
          return;
        }
        const layer = this.store.selectedLayer();
        if (!layer) return;
        this.store.addKeyframe(layer.id, property, this.store.currentTime, layer.props[property]);
      });
      row.appendChild(key);
      return row;
    }
  }

  Editor.PropertiesPanel = PropertiesPanel;
})();
