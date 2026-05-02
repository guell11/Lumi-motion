(function () {
  const Editor = (window.Editor = window.Editor || {});
  const { $, clamp, rectContains, lerp } = Editor.Utils;

  class CanvasController {
    constructor(store, animationEngine) {
      this.store = store;
      this.engine = animationEngine;
      this.textAnimator = new Editor.TextAnimator();
      this.canvas = $("#sceneCanvas");
      this.overlay = $("#overlayCanvas");
      this.ctx = this.canvas.getContext("2d");
      this.octx = this.overlay.getContext("2d");
      this.shell = $("#stageShell");
      this.scale = 1;
      this.resources = new Map();
      this.videoFrameCache = new Map();
      this.videoFrameRequests = new Set();
      this.videoFrameMediaRequests = new Set();
      this.videoFrameLastRequestAt = new Map();
      this.videoFrameFailures = new Map();
      this.drag = null;
      this.recordDrag = null;
      this.threeText = new Editor.ThreeText3D(store);
      this.motion = new Editor.MotionPathEditor(store, this);
      this.textEditor = null;
      this.editingLayerId = null;
      this.bind();
      this.resize();
    }

    bind() {
      window.addEventListener("resize", () => this.resize());
      this.shell.addEventListener("wheel", (event) => {
        if (!event.ctrlKey) return;
        event.preventDefault();
        const input = $("#canvasZoom");
        input.value = clamp(Number(input.value) + (event.deltaY < 0 ? 8 : -8), 25, 160);
        this.resize();
      }, { passive: false });
      $("#canvasZoom").addEventListener("input", () => this.resize());
      this.overlay.addEventListener("pointerdown", (event) => this.pointerDown(event));
      window.addEventListener("pointermove", (event) => this.pointerMove(event));
      window.addEventListener("pointerup", () => this.pointerUp());
      this.overlay.addEventListener("dblclick", (event) => {
        const point = this.eventPoint(event);
        const hit = this.hitTest(point);
        if (hit && (hit.layer.type === "text" || hit.layer.type === "text3d")) {
          this.beginTextEdit(hit.layer, hit.props, event);
          event.preventDefault();
          return;
        }
        if (event.altKey) this.motion.removeNearest(point);
        else if (event.shiftKey) this.motion.curveNearest(point);
        else this.motion.addPoint(point, this.store.currentTime);
      });
    }

    resize() {
      const settings = this.store.project.settings;
      this.canvas.width = settings.width;
      this.canvas.height = settings.height;
      this.overlay.width = settings.width;
      this.overlay.height = settings.height;
      const zoom = Number($("#canvasZoom").value || 72) / 100;
      const maxW = this.shell.clientWidth - 28;
      const maxH = this.shell.clientHeight - 28;
      const fit = Math.min(maxW / settings.width, maxH / settings.height);
      this.scale = Math.max(0.05, fit * zoom);
      for (const node of [this.canvas, this.overlay]) {
        node.style.width = `${settings.width * this.scale}px`;
        node.style.height = `${settings.height * this.scale}px`;
      }
      this.render();
    }

    render(time = this.store.currentTime) {
      const settings = this.store.project.settings;
      const ctx = this.ctx;
      ctx.save();
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = settings.background || "#111214";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      if (this.store.grid) this.drawGrid(ctx);
      this.applyCamera2D(ctx, this.engine.cameraAt(time));
      for (const layer of this.store.visibleLayersAt(time)) {
        this.drawLayer(ctx, layer, time);
      }
      ctx.restore();
      this.drawOverlay(time);
    }

    renderFrame(time) {
      this.render(time);
      return this.canvas.toDataURL("image/png");
    }

    drawGrid(ctx) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,.08)";
      ctx.lineWidth = 1;
      const step = 80;
      for (let x = 0; x < this.canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < this.canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.canvas.width, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    applyCamera2D(ctx, camera) {
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const zoom = Number(camera.zoom || 1);
      ctx.translate(cx, cy);
      ctx.rotate(((camera.rotation || 0) * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.transform(1, Math.sin(((camera.tiltX || 0) * Math.PI) / 180) * 0.12, Math.sin(((camera.tiltY || 0) * Math.PI) / 180) * 0.12, 1, 0, 0);
      ctx.translate(-cx + Number(camera.x || 0), -cy + Number(camera.y || 0));
    }

    drawLayer(ctx, layer, time) {
      if (this.editingLayerId === layer.id && (layer.type === "text" || layer.type === "text3d")) return;
      const props = this.engine.propsAt(layer, time);
      ctx.save();
      ctx.globalAlpha *= clamp(props.opacity ?? 1, 0, 1);

      // --- visual transition transforms ---
      const tState = this.transitionState(layer, time);
      if (tState) {
        ctx.globalAlpha *= clamp(tState.opacity, 0, 1);
      }

      ctx.translate(props.x, props.y);

      if (tState) {
        ctx.translate(tState.tx, tState.ty);
        ctx.scale(tState.scaleX, tState.scaleY);
        ctx.rotate((tState.rotation * Math.PI) / 180);
      }

      if (layer.type === "text3d") {
        ctx.globalCompositeOperation = props.blendMode || "source-over";
        ctx.filter = this.filterFor(layer, props);
        this.applyMask(ctx, props);
        this.applyRadiusClip(ctx, props);
        this.threeText.draw(ctx, layer, props, time, this.engine.cameraAt(time));
        ctx.restore();
        return;
      }
      this.applyPseudo3D(ctx, props);
      ctx.rotate(((props.rotation || 0) * Math.PI) / 180);
      ctx.scale((props.scale || 1) * (props.scaleX || 1), (props.scale || 1) * (props.scaleY || 1));
      ctx.globalCompositeOperation = props.blendMode || "source-over";
      ctx.filter = this.filterFor(layer, props);
      this.applyShadow(ctx, props, layer);
      this.applyMask(ctx, props);
      this.applyRadiusClip(ctx, props);

      // --- transition clip (wipe) ---
      if (tState && tState.clip < 1) {
        ctx.beginPath();
        ctx.rect(-props.width / 2, -props.height / 2, props.width * tState.clip, props.height);
        ctx.clip();
      }

      if (layer.type === "text") this.textAnimator.draw(ctx, layer, props, time);
      else if (layer.type === "shape") this.drawShape(ctx, layer, props);
      else if (layer.type === "image" || layer.type === "svg") this.drawImage(ctx, layer, props);
      else if (layer.type === "video") this.drawVideo(ctx, layer, props, time);

      if (layer.effects?.glitch || layer.color?.chroma) this.drawGlitchEcho(ctx, layer, props);
      if (layer.color?.grain) this.drawGrain(ctx, props, layer.color.grain);
      if (layer.effects?.vignette) this.drawVignette(ctx, props, layer.effects.vignette);
      ctx.restore();
    }

    transitionState(layer, time) {
      const local = time - layer.start;
      const untilEnd = layer.start + layer.duration - time;
      let opacity = 1, tx = 0, ty = 0, scaleX = 1, scaleY = 1, rotation = 0, clip = 1;
      const tIn = layer.transitionIn;
      const tOut = layer.transitionOut;
      if (tIn && local < tIn.duration) {
        const raw = clamp(local / tIn.duration, 0, 1);
        const t = Editor.Easing.apply(tIn.ease || "easeOut", raw);
        const fx = this.transitionFx(tIn.name);
        opacity *= fx.opacity ? lerp(0, 1, t) : 1;
        tx += lerp(fx.tx || 0, 0, t);
        ty += lerp(fx.ty || 0, 0, t);
        scaleX *= lerp(fx.scaleX ?? 1, 1, t);
        scaleY *= lerp(fx.scaleY ?? 1, 1, t);
        rotation += lerp(fx.rotation || 0, 0, t);
        clip *= fx.clip ? t : 1;
      }
      if (tOut && untilEnd < tOut.duration) {
        const raw = clamp(untilEnd / tOut.duration, 0, 1);
        const t = Editor.Easing.apply(tOut.ease || "easeIn", raw);
        const fx = this.transitionFx(tOut.name);
        opacity *= fx.opacity ? lerp(0, 1, t) : 1;
        tx += lerp(fx.tx || 0, 0, t);
        ty += lerp(fx.ty || 0, 0, t);
        scaleX *= lerp(fx.scaleX ?? 1, 1, t);
        scaleY *= lerp(fx.scaleY ?? 1, 1, t);
        rotation += lerp(fx.rotation || 0, 0, t);
        clip *= fx.clip ? t : 1;
      }
      if (!tIn && !tOut) return null;
      return { opacity, tx, ty, scaleX, scaleY, rotation, clip };
    }

    transitionFx(name) {
      if (!name) return { opacity: true };
      const n = name.toLowerCase();
      if (n.includes("flash") || n.includes("clarao") || n.includes("brilho")) return { opacity: true };
      if (n.includes("desliz") || n.includes("push esq") || n.includes("slide emp")) return { opacity: true, tx: -420 };
      if (n.includes("push dir")) return { opacity: true, tx: 420 };
      if (n.includes("selecao acima") || n.includes("swipe")) return { opacity: true, ty: -320 };
      if (n.includes("zoom") || n.includes("instantaneo")) return { opacity: true, scaleX: 0.3, scaleY: 0.3 };
      if (n.includes("giro") || n.includes("spin") || n.includes("roda") || n.includes("turbo") || n.includes("rolo")) return { opacity: true, rotation: 180 };
      if (n.includes("wipe") || n.includes("varredura") || n.includes("recorte") || n.includes("mask") || n.includes("luma")) return { clip: true };
      if (n.includes("glitch") || n.includes("erro")) return { opacity: true, tx: 30 };
      if (n.includes("shake") || n.includes("agitado") || n.includes("tremula")) return { opacity: true, tx: 20, ty: -10 };
      if (n.includes("cubo") || n.includes("3d") || n.includes("flip")) return { opacity: true, rotation: 90, scaleX: 0.5, scaleY: 0.5 };
      if (n.includes("portal") || n.includes("esferic")) return { opacity: true, scaleX: 0.01, scaleY: 0.01, rotation: 360 };
      if (n.includes("corte seco")) return {};
      return { opacity: true };
    }

    applyRadiusClip(ctx, props) {
      const radius = Number(props.radius) || 0;
      if (radius <= 0) return;
      roundRect(ctx, -props.width / 2, -props.height / 2, props.width, props.height, radius);
      ctx.clip();
    }

    applyPseudo3D(ctx, props) {
      const rx = ((props.rotateX || 0) * Math.PI) / 180;
      const ry = ((props.rotateY || 0) * Math.PI) / 180;
      const zScale = 1 + (Number(props.z) || 0) / Math.max(1, props.perspective || 700);
      ctx.transform(Math.cos(ry) * zScale, Math.sin(rx) * 0.16, Math.sin(ry) * 0.16, Math.cos(rx) * zScale, 0, 0);
    }

    filterFor(layer, props) {
      const color = layer.color || {};
      const blur = Number(props.blur || layer.effects?.blur || color.blur || 0);
      const brightness = Number(color.brightness || layer.effects?.brightness || 1);
      const contrast = Number(color.contrast || 1);
      const saturation = Number(color.saturation || 1);
      return `blur(${blur}px) brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
    }

    applyShadow(ctx, props, layer) {
      ctx.shadowBlur = Number(props.shadow || 0) + Number(layer.effects?.glow || 0);
      ctx.shadowColor = layer.effects?.glow ? (props.fill || "#8b48ff") : (props.shadowColor || "#000");
      ctx.shadowOffsetX = ctx.shadowBlur ? 8 : 0;
      ctx.shadowOffsetY = ctx.shadowBlur ? 8 : 0;
    }

    applyMask(ctx, props) {
      if (!props.mask || props.mask === "none") return;
      ctx.beginPath();
      if (props.mask === "circle") ctx.ellipse(0, 0, props.width / 2, props.height / 2, 0, 0, Math.PI * 2);
      else if (props.mask === "vertical") ctx.rect(-props.width / 4, -props.height / 2, props.width / 2, props.height);
      else ctx.rect(-props.width / 2, -props.height / 2, props.width, props.height);
      ctx.clip();
    }

    drawShape(ctx, layer, props) {
      const w = props.width;
      const h = props.height;
      ctx.fillStyle = props.fill || "#8b48ff";
      ctx.strokeStyle = props.stroke || "#000";
      ctx.lineWidth = props.strokeWidth || 0;
      const shape = props.shape || "rect";
      ctx.beginPath();
      if (shape === "circle") ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      else if (shape === "line") {
        ctx.moveTo(-w / 2, 0);
        ctx.lineTo(w / 2, 0);
      } else if (shape === "arrow") {
        ctx.moveTo(-w / 2, 0);
        ctx.lineTo(w / 2 - 28, 0);
        ctx.moveTo(w / 2 - 28, -20);
        ctx.lineTo(w / 2, 0);
        ctx.lineTo(w / 2 - 28, 20);
      } else if (shape === "star") this.starPath(ctx, 0, 0, Math.min(w, h) / 2, 5);
      else if (shape === "polygon") this.polygonPath(ctx, 0, 0, Math.min(w, h) / 2, 6);
      else roundRect(ctx, -w / 2, -h / 2, w, h, props.radius || 0);
      if (!["line", "arrow"].includes(shape)) ctx.fill();
      if (props.strokeWidth > 0 || ["line", "arrow"].includes(shape)) ctx.stroke();
    }

    starPath(ctx, x, y, radius, points) {
      for (let i = 0; i < points * 2; i += 1) {
        const r = i % 2 ? radius * 0.42 : radius;
        const a = (Math.PI / points) * i - Math.PI / 2;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    polygonPath(ctx, x, y, radius, sides) {
      for (let i = 0; i < sides; i += 1) {
        const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
        const px = x + Math.cos(a) * radius;
        const py = y + Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    drawImage(ctx, layer, props) {
      const media = this.store.media(layer.mediaId);
      if (!media) return this.placeholder(ctx, props, "Imagem");
      const image = this.resource(media, "image");
      if (!image.complete) {
        image.onload = () => this.render();
        return this.placeholder(ctx, props, "Carregando");
      }
      this.applyNaturalSize(layer, image.naturalWidth, image.naturalHeight);
      props.width = layer.props.width;
      props.height = layer.props.height;
      ctx.drawImage(image, -props.width / 2, -props.height / 2, props.width, props.height);
    }

    drawVideo(ctx, layer, props, time) {
      const media = this.store.media(layer.mediaId);
      if (!media) return this.placeholder(ctx, props, "Video");
      const video = this.resource(media, "video");
      const local = Math.max(0, time - layer.start);

      if (Number.isFinite(video.duration) && video.duration > 0 && !layer.durationUserEdited && !layer.props.mediaDurationSynced) {
        layer.duration = Math.max(0.1, video.duration);
        layer.props.mediaDurationSynced = true;
        this.store.ensureDuration(layer.start + layer.duration + 1);
        this.store.emit("media:duration");
      }

      if (video.error) {
        return this.drawVideoFallback(ctx, media, layer, props, local);
      }

      if (video.readyState >= HTMLMediaElement.HAVE_METADATA && Number.isFinite(video.duration)) {
        const target = clamp(local, 0, Math.max(0, video.duration - 0.025));
        const delta = Math.abs((video.currentTime || 0) - target);
        const previousTarget = Number(video.dataset.targetTime || -1);
        const tolerance = this.store.playing ? 0.28 : 0.055;
        if (delta > tolerance && Math.abs(previousTarget - target) > 0.025 && !video.seeking) {
          video.dataset.targetTime = String(target);
          try {
            video.currentTime = target;
          } catch {
            // Some codecs need another metadata/data event before accepting seek.
          }
        }
      }

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        if (this.store.playing && video.paused) {
          video.play?.().catch?.(() => {});
        } else if (!this.store.playing && !video.paused) {
          video.pause();
        }
        this.applyNaturalSize(layer, video.videoWidth, video.videoHeight);
        props.width = layer.props.width;
        props.height = layer.props.height;
        ctx.drawImage(video, -props.width / 2, -props.height / 2, props.width, props.height);
      } else {
        const label = video.readyState >= HTMLMediaElement.HAVE_METADATA ? "Carregando frame" : "Carregando video";
        this.placeholder(ctx, props, label);
        video.addEventListener("loadeddata", () => this.render(), { once: true });
        video.addEventListener("canplay", () => this.render(), { once: true });
      }
    }

    drawVideoFallback(ctx, media, layer, props, localTime) {
      const step = this.store.playing ? 1 : 0.25;
      const quantized = Math.max(0, Math.round(localTime / step) * step);
      const key = `${media.id}:${quantized.toFixed(2)}`;
      const cached = this.videoFrameCache.get(key);
      if (cached?.complete && cached.naturalWidth) {
        this.applyNaturalSize(layer, cached.naturalWidth, cached.naturalHeight);
        props.width = layer.props.width;
        props.height = layer.props.height;
        ctx.drawImage(cached, -props.width / 2, -props.height / 2, props.width, props.height);
        return;
      }
      const nearby = this.nearestVideoFrame(media.id, quantized);
      if (nearby?.complete && nearby.naturalWidth) {
        this.applyNaturalSize(layer, nearby.naturalWidth, nearby.naturalHeight);
        props.width = layer.props.width;
        props.height = layer.props.height;
        ctx.drawImage(nearby, -props.width / 2, -props.height / 2, props.width, props.height);
      } else {
        const failed = this.videoFrameFailures.get(key);
        this.placeholder(ctx, props, failed || "Gerando preview");
      }
      this.requestVideoFrame(media, key, quantized);
    }

    nearestVideoFrame(mediaId, time) {
      let best = null;
      let bestDelta = Infinity;
      for (const [key, image] of this.videoFrameCache.entries()) {
        if (!key.startsWith(`${mediaId}:`)) continue;
        const frameTime = Number(key.split(":")[1]);
        const delta = Math.abs(frameTime - time);
        const maxDelta = this.store.playing ? 3 : 1.5;
        if (delta < bestDelta && delta <= maxDelta) {
          best = image;
          bestDelta = delta;
        }
      }
      return best;
    }

    requestVideoFrame(media, key, time) {
      if (this.videoFrameRequests.has(key) || this.videoFrameCache.has(key) || this.videoFrameFailures.has(key)) return;
      if (!media.path) {
        this.videoFrameFailures.set(key, "Video sem caminho");
        return;
      }
      const now = performance.now();
      const lastRequest = this.videoFrameLastRequestAt.get(media.id) || 0;
      const cooldown = this.store.playing ? 850 : 160;
      if (this.videoFrameMediaRequests.has(media.id) || now - lastRequest < cooldown) return;
      this.videoFrameMediaRequests.add(media.id);
      this.videoFrameLastRequestAt.set(media.id, now);
      this.videoFrameRequests.add(key);
      Editor.Bridge.call("videoFrame", media.path, String(time)).then((result) => {
        this.videoFrameRequests.delete(key);
        this.videoFrameMediaRequests.delete(media.id);
        if (!result.ok || !result.dataUrl) {
          this.videoFrameFailures.set(key, result.error || "Preview indisponivel");
          this.render();
          return;
        }
        const image = new Image();
        image.onload = () => {
          this.videoFrameCache.set(key, image);
          if (this.videoFrameCache.size > 36) this.videoFrameCache.delete(this.videoFrameCache.keys().next().value);
          this.render();
        };
        image.onerror = () => {
          this.videoFrameFailures.set(key, "Frame invalido");
          this.render();
        };
        image.src = result.dataUrl;
      }).catch(() => {
        this.videoFrameRequests.delete(key);
        this.videoFrameMediaRequests.delete(media.id);
        this.videoFrameFailures.set(key, "Preview indisponivel");
      });
    }

    applyNaturalSize(layer, naturalWidth, naturalHeight) {
      if (!naturalWidth || !naturalHeight || layer.props.mediaNatural || layer.props.userSized) return;
      const maxW = this.canvas.width * 0.72;
      const maxH = this.canvas.height * 0.72;
      const scale = Math.min(1, maxW / naturalWidth, maxH / naturalHeight);
      layer.props.width = naturalWidth * scale;
      layer.props.height = naturalHeight * scale;
      layer.props.mediaNatural = { width: naturalWidth, height: naturalHeight };
    }

    drawGlitchEcho(ctx, layer, props) {
      ctx.save();
      ctx.globalAlpha *= 0.28;
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "#00f0ff";
      ctx.fillRect(-props.width / 2 - 7, -props.height / 2, props.width, props.height);
      ctx.fillStyle = "#ff2b90";
      ctx.fillRect(-props.width / 2 + 7, -props.height / 2, props.width, props.height);
      ctx.restore();
    }

    drawGrain(ctx, props, amount) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.2, amount);
      ctx.fillStyle = "rgba(255,255,255,.5)";
      for (let i = 0; i < 80; i += 1) {
        const x = (Math.random() - 0.5) * props.width;
        const y = (Math.random() - 0.5) * props.height;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
      ctx.restore();
    }

    drawVignette(ctx, props, amount) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.55, amount);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(props.width, props.height) * 0.7);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = gradient;
      ctx.fillRect(-props.width / 2, -props.height / 2, props.width, props.height);
      ctx.restore();
    }

    placeholder(ctx, props, text) {
      ctx.save();
      ctx.fillStyle = "#303030";
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 2;
      roundRect(ctx, -props.width / 2, -props.height / 2, props.width, props.height, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#bbb";
      ctx.font = "32px Segoe UI";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }

    resource(media, type) {
      if (this.resources.has(media.id)) return this.resources.get(media.id);
      let node;
      if (type === "video") {
        node = document.createElement("video");
        if (/^https?:/i.test(media.url)) node.crossOrigin = "anonymous";
        node.muted = true;
        node.preload = "auto";
        node.playsInline = true;
        node.setAttribute("playsinline", "");
        node.setAttribute("webkit-playsinline", "");
        const wake = () => {
          if (node.readyState >= HTMLMediaElement.HAVE_METADATA && !node.dataset.wokeFrame) {
            node.dataset.wokeFrame = "1";
            try {
              node.currentTime = Math.min(0.001, Math.max(0, (node.duration || 1) - 0.025));
            } catch {
              // The next media event will try again.
            }
          }
          this.render();
        };
        ["loadedmetadata", "loadeddata", "canplay", "seeked", "timeupdate"].forEach((eventName) => {
          node.addEventListener(eventName, wake);
        });
        node.addEventListener("error", () => this.render());
        node.src = media.url;
        node.load();
      } else {
        node = new Image();
        if (/^https?:/i.test(media.url)) node.crossOrigin = "anonymous";
        node.src = media.url;
      }
      this.resources.set(media.id, node);
      return node;
    }

    drawOverlay(time = this.store.currentTime) {
      const ctx = this.octx;
      ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
      ctx.save();
      this.applyCamera2D(ctx, this.engine.cameraAt(time));
      const selected = this.store.project.layers.filter((layer) => this.store.isSelected(layer.id) && layer.type !== "audio");
      selected.forEach((layer) => {
        const props = this.engine.propsAt(layer, time);
        this.drawSelection(ctx, props);
      });
      this.motion.draw(ctx, this.scale);
      ctx.restore();
    }

    drawSelection(ctx, props) {
      const scale = this.scale;
      ctx.save();
      ctx.translate(props.x, props.y);
      ctx.rotate(((props.rotation || 0) * Math.PI) / 180);
      ctx.strokeStyle = "#00c8d7";
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([8 / scale, 4 / scale]);
      ctx.strokeRect(-props.width / 2, -props.height / 2, props.width, props.height);
      ctx.setLineDash([]);
      const handles = this.handles(props);
      ctx.fillStyle = "#00c8d7";
      handles.forEach((handle) => ctx.fillRect(handle.x - 6 / scale, handle.y - 6 / scale, 12 / scale, 12 / scale));
      ctx.restore();
    }

    handles(props) {
      return [
        { name: "nw", x: -props.width / 2, y: -props.height / 2 },
        { name: "ne", x: props.width / 2, y: -props.height / 2 },
        { name: "sw", x: -props.width / 2, y: props.height / 2 },
        { name: "se", x: props.width / 2, y: props.height / 2 },
      ];
    }

    pointerDown(event) {
      if (this.textEditor && event.target === this.textEditor) return;
      const point = this.eventPoint(event);
      if (this.motion.start(point, event)) return;
      const hit = this.hitTest(point);
      if (hit) {
        this.store.setSelected(hit.layer.id);
        if (hit.layer.locked) return;
        this.drag = { type: hit.handle || "move", start: point, layerId: hit.layer.id, props: { ...hit.props } };
        if (this.store.recordMotion) this.beginRecordDrag(hit.layer, point);
      } else {
        this.store.setSelected(null);
      }
    }

    pointerMove(event) {
      const point = this.eventPoint(event);
      if (this.motion.move(point)) return;
      if (!this.drag) return;
      const layer = this.store.layer(this.drag.layerId);
      if (!layer) return;
      const dx = point.x - this.drag.start.x;
      const dy = point.y - this.drag.start.y;
      if (this.store.recordMotion) this.advanceRecordingClock(point);
      const patch = { props: {} };
      if (this.drag.type === "move") {
        patch.props.x = this.snap(this.drag.props.x + dx);
        patch.props.y = this.snap(this.drag.props.y + dy);
        this.store.updateLayer(layer.id, patch);
        this.recordLayerProps(layer, patch.props, ["x", "y"], point);
      } else {
        const next = this.resizeFromHandle(this.drag.type, this.drag.props, dx, dy, layer);
        patch.props = next;
        this.store.updateLayer(layer.id, patch);
        const keys = ["width", "height"];
        if (layer.type === "text" || layer.type === "text3d") keys.push("fontSize");
        this.recordLayerProps(layer, patch.props, keys, point);
      }
      this.render();
    }

    pointerUp() {
      this.motion.end();
      this.finishRecordDrag();
      this.drag = null;
    }

    beginRecordDrag(layer, point) {
      this.recordDrag = {
        layerId: layer.id,
        startedAt: performance.now(),
        timeStart: this.store.currentTime,
        startPoint: { ...point },
        lastRecorded: null,
        moved: false,
      };
      this.store.motionPath = true;
    }

    advanceRecordingClock(point) {
      if (!this.recordDrag) return;
      const moved = Math.hypot(point.x - this.recordDrag.startPoint.x, point.y - this.recordDrag.startPoint.y);
      if (moved < 2) return;
      const elapsed = Math.max(0, (performance.now() - this.recordDrag.startedAt) / 1000);
      const fps = this.store.project.settings.fps || 30;
      const nextTime = this.recordDrag.timeStart + elapsed;
      if (Math.abs(nextTime - this.store.currentTime) >= 1 / Math.max(12, fps * 2)) {
        this.store.setTime(nextTime);
      }
    }

    recordLayerProps(layer, patchProps, properties, point) {
      if (!this.store.recordMotion || !this.recordDrag || this.recordDrag.layerId !== layer.id) return;
      const moved = Math.hypot(point.x - this.recordDrag.startPoint.x, point.y - this.recordDrag.startPoint.y);
      if (moved < 2 && !this.recordDrag.moved) return;
      const time = this.store.currentTime;
      const last = this.recordDrag.lastRecorded;
      const enoughTime = !last || Math.abs(time - last.time) >= 1 / Math.max(12, this.store.project.settings.fps || 30);
      const changed = !last || properties.some((key) => Math.abs(Number(layer.props[key] || 0) - Number(last.props[key] || 0)) >= this.recordThreshold(key));
      if (!enoughTime && !changed) return;
      this.recordDrag.moved = true;
      if (properties.includes("x") && properties.includes("y")) {
        this.engine.ensureMotionPoint(layer, time, { ...layer.props, ...patchProps });
      } else {
        properties.forEach((property) => this.store.addKeyframe(layer.id, property, time, layer.props[property], true));
      }
      this.recordDrag.lastRecorded = {
        time,
        props: properties.reduce((acc, key) => ({ ...acc, [key]: layer.props[key] }), {}),
      };
      this.store.emit("record:sample");
    }

    recordThreshold(property) {
      if (property === "opacity" || property === "scale") return 0.01;
      if (property === "rotation" || property === "fontSize") return 0.25;
      return 0.5;
    }

    finishRecordDrag() {
      if (this.recordDrag?.moved) {
        this.store.emit("record:finish");
      }
      this.recordDrag = null;
    }

    snap(value) {
      if (!this.store.snap) return value;
      const step = 10;
      return Math.round(value / step) * step;
    }

    hitTest(point) {
      const layers = this.store.visibleLayersAt(this.store.currentTime).slice().reverse();
      const selected = this.store.selectedLayer();
      if (selected && selected.type !== "audio") {
        const props = this.engine.propsAt(selected, this.store.currentTime);
        const handle = this.hitHandle(point, props);
        if (handle) return { layer: selected, props, handle };
      }
      for (const layer of layers) {
        const props = this.engine.propsAt(layer, this.store.currentTime);
        const rect = { x: props.x - props.width / 2, y: props.y - props.height / 2, width: props.width, height: props.height };
        if (rectContains(rect, point)) return { layer, props };
      }
      return null;
    }

    hitHandle(point, props) {
      const size = 14 / this.scale;
      const handles = [
        { name: "nw", x: props.x - props.width / 2, y: props.y - props.height / 2 },
        { name: "ne", x: props.x + props.width / 2, y: props.y - props.height / 2 },
        { name: "sw", x: props.x - props.width / 2, y: props.y + props.height / 2 },
        { name: "se", x: props.x + props.width / 2, y: props.y + props.height / 2 },
      ];
      const hit = handles.find((handle) => Math.abs(point.x - handle.x) <= size && Math.abs(point.y - handle.y) <= size);
      return hit?.name || null;
    }

    resizeFromHandle(handle, start, dx, dy, layer) {
      let width = start.width;
      let height = start.height;
      if (handle.includes("e")) width = start.width + dx * 2;
      if (handle.includes("w")) width = start.width - dx * 2;
      if (handle.includes("s")) height = start.height + dy * 2;
      if (handle.includes("n")) height = start.height - dy * 2;
      width = Math.max(12, width);
      height = Math.max(12, height);
      if (["image", "video", "svg"].includes(layer.type)) {
        const ratio = Math.max(0.001, start.width / Math.max(1, start.height));
        if (Math.abs(dx) > Math.abs(dy)) height = width / ratio;
        else width = height * ratio;
      }
      const patch = { width, height, userSized: true };
      if (layer.type === "text" || layer.type === "text3d") {
        const fontScale = Math.max(0.08, height / Math.max(1, start.height));
        patch.fontSize = Math.max(4, (start.fontSize || layer.props.fontSize || 96) * fontScale);
      }
      return patch;
    }

    eventPoint(event) {
      const rect = this.overlay.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * this.overlay.width,
        y: ((event.clientY - rect.top) / rect.height) * this.overlay.height,
      };
    }

    beginTextEdit(layer, props, event) {
      this.finishTextEdit(false);
      this.store.setSelected(layer.id);
      const box = this.layerBoxOnShell(props, this.store.currentTime);
      const width = Math.max(80, box.width);
      const height = Math.max(24, box.height);
      const editor = document.createElement("textarea");
      editor.className = "canvas-text-editor";
      editor.value = props.text || "";
      editor.dataset.original = props.text || "";
      editor.style.left = `${box.left}px`;
      editor.style.top = `${box.top}px`;
      editor.style.width = `${width}px`;
      editor.style.height = `${height}px`;
      editor.style.font = `${props.fontWeight || 800} ${Math.max(10, props.fontSize * box.fontScale)}px ${props.fontFamily || "Segoe UI"}`;
      editor.style.color = props.fill || "#ffffff";
      editor.style.textAlign = props.align || "center";
      editor.style.textShadow = props.shadow ? `0 0 ${Math.max(2, props.shadow * box.fontScale)}px ${props.shadowColor || "#000"}` : "none";
      this.shell.appendChild(editor);
      this.textEditor = editor;
      this.editingLayerId = layer.id;
      this.render();
      editor.focus();
      editor.select();

      editor.addEventListener("input", () => {
        layer.props.text = editor.value;
        this.store.emit("text:edit");
      });
      editor.addEventListener("keydown", (keyEvent) => {
        if (keyEvent.key === "Escape") {
          keyEvent.preventDefault();
          this.finishTextEdit(true);
        }
        if (keyEvent.key === "Enter" && !keyEvent.shiftKey) {
          keyEvent.preventDefault();
          this.finishTextEdit(false);
        }
      });
      editor.addEventListener("blur", () => this.finishTextEdit(false), { once: true });
    }

    finishTextEdit(cancel) {
      if (!this.textEditor) return;
      const editor = this.textEditor;
      if (cancel) {
        const layer = this.store.selectedLayer();
        if (layer && (layer.type === "text" || layer.type === "text3d")) layer.props.text = editor.dataset.original || "";
      }
      this.textEditor = null;
      this.editingLayerId = null;
      editor.remove();
      this.render();
    }

    layerBoxOnShell(props, time) {
      const canvasRect = this.canvas.getBoundingClientRect();
      const shellRect = this.shell.getBoundingClientRect();
      const camera = this.engine.cameraAt(time);
      const corners = [
        { x: props.x - props.width / 2, y: props.y - props.height / 2 },
        { x: props.x + props.width / 2, y: props.y - props.height / 2 },
        { x: props.x + props.width / 2, y: props.y + props.height / 2 },
        { x: props.x - props.width / 2, y: props.y + props.height / 2 },
      ].map((point) => this.cameraTransformPoint(point, camera));
      const xs = corners.map((point) => point.x);
      const ys = corners.map((point) => point.y);
      const leftCanvas = Math.min(...xs);
      const topCanvas = Math.min(...ys);
      const rightCanvas = Math.max(...xs);
      const bottomCanvas = Math.max(...ys);
      const sx = canvasRect.width / this.canvas.width;
      const sy = canvasRect.height / this.canvas.height;
      return {
        left: canvasRect.left - shellRect.left + leftCanvas * sx,
        top: canvasRect.top - shellRect.top + topCanvas * sy,
        width: Math.max(24, (rightCanvas - leftCanvas) * sx),
        height: Math.max(18, (bottomCanvas - topCanvas) * sy),
        fontScale: Math.max(0.05, sx * Number(camera.zoom || 1) * Number(props.scale || 1)),
      };
    }

    cameraTransformPoint(point, camera) {
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const skewX = Math.sin(((camera.tiltY || 0) * Math.PI) / 180) * 0.12;
      const skewY = Math.sin(((camera.tiltX || 0) * Math.PI) / 180) * 0.12;
      const matrix = new DOMMatrix()
        .translate(cx, cy)
        .rotate(Number(camera.rotation || 0))
        .scale(Number(camera.zoom || 1))
        .multiply(new DOMMatrix([1, skewY, skewX, 1, 0, 0]))
        .translate(-cx + Number(camera.x || 0), -cy + Number(camera.y || 0));
      const out = new DOMPoint(point.x, point.y).matrixTransform(matrix);
      return { x: out.x, y: out.y };
    }
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  Editor.CanvasController = CanvasController;
})();
