(function () {
  const Editor = (window.Editor = window.Editor || {});
  const { $, xFromSeconds, secondsFromX, clamp } = Editor.Utils;

  class TimelineController {
    constructor(store) {
      this.store = store;
      this.labels = $("#trackLabels");
      this.tracks = $("#tracks");
      this.ruler = $("#ruler");
      this.playhead = $("#timelinePlayhead");
      this.trackCanvas = document.querySelector(".track-canvas");
      this.zoomInput = $("#timelineZoom");
      this.drag = null;
      this.scrubbing = false;
      this.bind();
    }

    bind() {
      this.zoomInput.addEventListener("input", () => {
        this.store.project.timeline.zoom = Number(this.zoomInput.value);
        this.render();
      });
      this.ruler.addEventListener("pointerdown", (event) => this.beginScrub(event));
      this.playhead.addEventListener("pointerdown", (event) => this.beginScrub(event));
      this.tracks.addEventListener("pointerdown", (event) => {
        if (event.target.classList.contains("track-row")) this.beginScrub(event);
      });
      this.trackCanvas.addEventListener("scroll", () => {
        this.labels.scrollTop = this.trackCanvas.scrollTop;
      });
      window.addEventListener("pointermove", (event) => this.pointerMove(event));
      window.addEventListener("pointerup", () => this.pointerUp());

      $("#splitBtn").addEventListener("click", () => this.store.splitSelected());
      $("#joinBtn").addEventListener("click", () => this.store.joinSelectedWithNext());
      $("#duplicateBtn").addEventListener("click", () => this.store.duplicateSelected());
      $("#deleteBtn").addEventListener("click", () => this.store.deleteSelected());
      $("#beatBtn").addEventListener("click", () => this.store.addMarker());
      $("#addTextBtn").addEventListener("click", () => this.store.addLayer("text"));
      $("#addText3DBtn").addEventListener("click", () => this.store.addLayer("text3d"));
      $("#addShapeBtn").addEventListener("click", () => this.store.addLayer("shape"));
      $("#fpsSelect").addEventListener("change", (event) => this.store.setSetting("fps", Number(event.target.value)));
    }

    render() {
      const zoom = this.zoom();
      const duration = this.store.timelineDuration();
      const width = Math.max(1400, duration * zoom + 240);
      this.ruler.style.minWidth = `${width}px`;
      this.tracks.style.minWidth = `${width}px`;
      this.renderRuler(duration, zoom);
      this.renderTracks(zoom);
      this.renderPlayhead();
    }

    renderRuler(duration, zoom) {
      this.ruler.innerHTML = "";
      const step = zoom < 50 ? 2 : 1;
      for (let s = 0; s <= duration; s += step) {
        const tick = document.createElement("div");
        tick.className = "tick";
        tick.style.left = `${xFromSeconds(s, zoom)}px`;
        tick.textContent = this.shortTime(s);
        this.ruler.appendChild(tick);
      }
      for (const marker of this.store.project.markers) {
        const tick = document.createElement("div");
        tick.className = "tick marker";
        tick.style.left = `${xFromSeconds(marker.time, zoom)}px`;
        tick.style.borderLeftColor = "#ffcf4a";
        tick.textContent = marker.label || "Beat";
        this.ruler.appendChild(tick);
      }
    }

    renderTracks(zoom) {
      this.labels.innerHTML = "";
      this.tracks.innerHTML = "";
      this.store.project.timeline.tracks.forEach((track) => {
        const layers = this.store.project.layers
          .filter((layer) => layer.trackId === track.id)
          .sort((a, b) => (a.props?.z || 0) - (b.props?.z || 0) || a.start - b.start);

        if (!layers.length) {
          this.addLane(track, null, zoom);
          return;
        }
        layers.forEach((layer) => this.addLane(track, layer, zoom));
      });
    }

    addLane(track, layer, zoom) {
      const label = document.createElement("div");
      label.className = `track-label ${track.type === "audio" ? "audio" : ""} ${layer ? "" : "is-empty"}`;
      if (layer) {
        label.innerHTML = `
          <span class="track-icon">${iconFor(layer.type)}</span>
          <button title="ocultar/mostrar" data-action="visibility">${layer.hidden ? "H" : "V"}</button>
          <button title="bloquear/desbloquear" data-action="lock">${layer.locked ? "L" : "U"}</button>
          <span title="${escapeHtml(layer.name)}">${escapeHtml(layer.name)}</span>`;
        label.addEventListener("click", (event) => {
          const action = event.target.dataset.action;
          if (action === "visibility") this.store.toggleLayerFlag(layer.id, "hidden");
          else if (action === "lock") this.store.toggleLayerFlag(layer.id, "locked");
          else this.store.setSelected(layer.id);
        });
      } else {
        label.innerHTML = `<span class="track-icon">${iconFor(track.type)}</span><span>${track.name}</span>`;
      }
      this.labels.appendChild(label);

      const row = document.createElement("div");
      row.className = `track-row ${track.type === "audio" ? "audio" : ""} ${layer ? "" : "is-empty"}`;
      row.dataset.trackId = track.id;
      if (layer) row.dataset.layerId = layer.id;
      row.style.backgroundSize = `${zoom}px 100%`;
      this.tracks.appendChild(row);
      if (layer) row.appendChild(this.clipNode(layer, zoom));
    }

    clipNode(layer, zoom) {
      const clip = document.createElement("div");
      clip.className = `clip ${layer.type} ${this.store.isSelected(layer.id) ? "selected" : ""}`;
      clip.dataset.layerId = layer.id;
      clip.style.left = `${xFromSeconds(layer.start, zoom)}px`;
      clip.style.width = `${Math.max(18, xFromSeconds(layer.duration, zoom))}px`;
      clip.innerHTML = `<div class="trim left"></div><div class="clip-name">${escapeHtml(layer.name)}</div>${layer.type === "audio" ? "<div class=\"clip-wave\"></div>" : ""}<div class="trim right"></div>`;
      clip.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        this.store.setSelected(layer.id);
        if (layer.locked) return;
        const trim = event.target.classList.contains("trim") ? (event.target.classList.contains("left") ? "left" : "right") : null;
        this.drag = {
          layerId: layer.id,
          trim,
          x: event.clientX,
          start: layer.start,
          duration: layer.duration,
        };
        clip.setPointerCapture?.(event.pointerId);
      });
      clip.addEventListener("dblclick", () => {
        this.store.setTime(layer.start);
        this.store.setSelected(layer.id);
      });
      return clip;
    }

    beginScrub(event) {
      this.scrubbing = true;
      this.setTimeFromEvent(event);
      event.preventDefault();
    }

    pointerMove(event) {
      if (this.scrubbing) {
        this.setTimeFromEvent(event);
        return;
      }
      if (!this.drag) return;
      const layer = this.store.layer(this.drag.layerId);
      if (!layer || layer.locked) return;
      const delta = (event.clientX - this.drag.x) / this.zoom();
      if (this.drag.trim === "left") {
        const nextStart = clamp(this.snapTime(this.drag.start + delta), 0, this.drag.start + this.drag.duration - 0.1);
        layer.duration = this.drag.duration + (this.drag.start - nextStart);
        layer.start = nextStart;
        layer.durationUserEdited = true;
      } else if (this.drag.trim === "right") {
        layer.duration = Math.max(0.1, this.snapTime(this.drag.duration + delta));
        layer.durationUserEdited = true;
      } else {
        layer.start = this.snapTime(Math.max(0, this.drag.start + delta));
      }
      this.store.ensureDuration(layer.start + layer.duration + 1);
      this.store.emit("timeline:drag");
    }

    pointerUp() {
      this.drag = null;
      this.scrubbing = false;
    }

    setTimeFromEvent(event) {
      const rect = this.trackCanvas.getBoundingClientRect();
      const x = event.clientX - rect.left + this.trackCanvas.scrollLeft;
      this.store.setTime(secondsFromX(x, this.zoom()));
    }

    renderPlayhead() {
      this.playhead.style.left = `${xFromSeconds(this.store.currentTime, this.zoom())}px`;
    }

    snapTime(time) {
      if (!this.store.snap) return time;
      const fps = this.store.project.settings.fps || 30;
      return Math.round(time * fps) / fps;
    }

    zoom() {
      return Number(this.store.project.timeline.zoom || this.zoomInput.value || 72);
    }

    shortTime(seconds) {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
  }

  function iconFor(type) {
    return { video: "V", image: "I", svg: "S", text: "T", text3d: "3D", shape: "Sh", audio: "A" }[type] || "L";
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]);
  }

  Editor.TimelineController = TimelineController;
})();
