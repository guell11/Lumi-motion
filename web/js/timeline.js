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
      this.snapGuide = $("#timelineSnapGuide");
      this.trackCanvas = document.querySelector(".track-canvas");
      this.zoomInput = $("#timelineZoom");
      this.clipNodes = new Map();
      this.rowNodes = new Map();
      this.structureKey = "";
      this.drag = null;
      this.marquee = null;
      this.marqueeNode = null;
      this.scrubbing = false;
      this.pendingFrame = 0;
      this.tool = "select";
      this.bind();
    }

    bind() {
      this.zoomInput.addEventListener("input", () => this.setZoom(Number(this.zoomInput.value), this.viewportCenterX()));
      this.trackCanvas.addEventListener("wheel", (event) => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        const rect = this.trackCanvas.getBoundingClientRect();
        const anchor = event.clientX - rect.left;
        this.setZoom(this.zoom() * (event.deltaY > 0 ? 0.88 : 1.12), anchor);
      }, { passive: false });
      this.ruler.addEventListener("pointerdown", (event) => this.beginScrub(event));
      this.playhead.addEventListener("pointerdown", (event) => this.beginScrub(event));
      this.tracks.addEventListener("pointerdown", (event) => {
        if (event.target.classList.contains("track-row")) {
          if (this.tool === "select") this.beginMarquee(event);
          else this.beginScrub(event);
        }
      });
      this.trackCanvas.addEventListener("scroll", () => {
        this.labels.scrollTop = this.trackCanvas.scrollTop;
      });
      window.addEventListener("pointermove", (event) => this.pointerMove(event));
      window.addEventListener("pointerup", (event) => this.pointerUp(event));
      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && this.drag) this.cancelDrag();
        if (event.key === "Escape" && this.marquee) this.cancelMarquee();
      });

      $("#splitBtn").addEventListener("click", () => this.store.splitSelected());
      $("#joinBtn").addEventListener("click", () => this.store.joinSelectedWithNext());
      $("#duplicateBtn").addEventListener("click", () => this.store.duplicateSelected());
      $("#deleteBtn").addEventListener("click", () => this.store.deleteSelected());
      $("#beatBtn").addEventListener("click", () => this.store.addMarker());
      $("#addTextBtn").addEventListener("click", () => this.store.addLayer("text"));
      $("#addText3DBtn").addEventListener("click", () => this.store.addLayer("text3d"));
      $("#addShapeBtn").addEventListener("click", () => this.store.addLayer("shape"));
      $("#fpsSelect").addEventListener("change", (event) => this.store.setSetting("fps", Number(event.target.value)));
      $("#fitTimelineBtn")?.addEventListener("click", () => this.fitTimeline());
      $("#timelineSnapBtn")?.addEventListener("click", () => {
        this.store.snap = !this.store.snap;
        this.syncToolbar();
      });
      $("#selectToolBtn")?.addEventListener("click", () => this.setTool("select"));
      $("#bladeToolBtn")?.addEventListener("click", () => this.setTool("blade"));
      $("#collapseTimelineBtn")?.addEventListener("click", () => this.toggleCollapsed());
    }

    render(force = false) {
      const zoom = this.zoom();
      const duration = this.store.timelineDuration();
      const width = Math.max(this.trackCanvas.clientWidth || 1000, duration * zoom + 180);
      this.ruler.style.minWidth = `${width}px`;
      this.tracks.style.minWidth = `${width}px`;
      this.renderRuler(duration, zoom);
      this.renderTracks(zoom, force);
      this.renderPlayhead();
      this.syncToolbar();
    }

    renderRuler(duration, zoom) {
      const majorStep = zoom < 35 ? 5 : zoom < 70 ? 2 : zoom > 180 ? 0.5 : 1;
      const minorStep = zoom > 150 ? .1 : zoom > 80 ? .25 : zoom > 42 ? .5 : majorStep;
      const parts = [];
      for (let s = 0; s <= duration + .001; s += minorStep) {
        const isMajor = Math.abs((s / majorStep) - Math.round(s / majorStep)) < .001;
        parts.push(`<div class="tick ${isMajor ? "" : "minor"}" style="left:${xFromSeconds(s, zoom)}px">${isMajor ? this.shortTime(s, zoom) : ""}</div>`);
      }
      for (const marker of this.store.project.markers) {
        parts.push(`<div class="tick marker" style="left:${xFromSeconds(marker.time, zoom)}px" title="${escapeHtml(marker.label || "Marcador")}">${escapeHtml(marker.label || "Beat")}</div>`);
      }
      this.ruler.innerHTML = parts.join("");
    }

    renderTracks(zoom, force = false) {
      const nextKey = this.store.project.timeline.tracks.map((track) => track.id).join("|") + "::" +
        this.store.project.layers.map((layer) => `${layer.id}:${layer.trackId}`).sort().join("|");
      if (force || nextKey !== this.structureKey) {
        this.rebuildTracks();
        this.structureKey = nextKey;
      }
      for (const layer of this.store.project.layers) this.updateClipNode(layer, zoom);
      for (const [id, node] of this.clipNodes) {
        if (!this.store.layer(id)) {
          node.remove();
          this.clipNodes.delete(id);
        }
      }
      for (const track of this.store.project.timeline.tracks) this.updateTrackState(track);
    }

    rebuildTracks() {
      this.labels.innerHTML = "";
      this.tracks.innerHTML = "";
      this.clipNodes.clear();
      this.rowNodes.clear();
      for (const track of this.store.project.timeline.tracks) {
        const label = document.createElement("div");
        label.className = `track-label ${track.type === "audio" ? "audio" : ""}`;
        label.dataset.trackId = track.id;
        label.innerHTML = `
          <span class="track-icon" aria-hidden="true">${iconFor(track.type)}</span>
          <button data-track-action="visibility" aria-label="Mostrar ou ocultar ${escapeHtml(track.name)}" title="Mostrar/ocultar">◉</button>
          <button data-track-action="lock" aria-label="Bloquear ${escapeHtml(track.name)}" title="Bloquear/desbloquear">◇</button>
          <span class="track-name" title="${escapeHtml(track.name)}">${escapeHtml(track.name)}</span>`;
        label.addEventListener("click", (event) => this.handleTrackAction(track, event));
        this.labels.appendChild(label);

        const row = document.createElement("div");
        row.className = `track-row ${track.type === "audio" ? "audio" : ""}`;
        row.dataset.trackId = track.id;
        row.addEventListener("dragover", (event) => this.dragMediaOver(event, track, row));
        row.addEventListener("dragleave", (event) => {
          if (!row.contains(event.relatedTarget)) row.classList.remove("drop-target");
        });
        row.addEventListener("drop", (event) => this.dropMedia(event, track, row));
        this.tracks.appendChild(row);
        this.rowNodes.set(track.id, row);
      }
      for (const layer of this.store.project.layers) {
        const row = this.rowNodes.get(layer.trackId) || this.rowNodes.values().next().value;
        if (row) row.appendChild(this.createClipNode(layer));
      }
    }

    createClipNode(layer) {
      const clip = document.createElement("div");
      clip.className = `clip ${layer.type}`;
      clip.dataset.layerId = layer.id;
      clip.tabIndex = 0;
      clip.setAttribute("role", "button");
      clip.setAttribute("aria-label", `${layer.name}, início ${this.shortTime(layer.start)}, duração ${layer.duration.toFixed(2)} segundos`);
      clip.innerHTML = `
        <div class="trim left" data-trim="left"></div>
        <div class="clip-name"></div>
        <div class="clip-meta"></div>
        ${layer.type === "audio" ? '<div class="clip-wave"></div>' : ""}
        <div class="clip-badges"></div>
        <div class="trim right" data-trim="right"></div>`;
      clip.addEventListener("pointerdown", (event) => this.beginClipDrag(event, layer.id));
      clip.addEventListener("dblclick", () => {
        this.store.setTime(layer.start);
        this.store.setSelected(layer.id);
      });
      clip.addEventListener("keydown", (event) => {
        if (event.key === "Delete" || event.key === "Backspace") this.store.deleteSelected();
        if (event.key === "Enter") this.store.setTime(layer.start);
      });
      this.clipNodes.set(layer.id, clip);
      return clip;
    }

    updateClipNode(layer, zoom) {
      const clip = this.clipNodes.get(layer.id);
      if (!clip) return;
      clip.style.left = `${xFromSeconds(layer.start, zoom)}px`;
      clip.style.width = `${Math.max(12, xFromSeconds(layer.duration, zoom))}px`;
      clip.className = `clip ${layer.type} ${this.store.isSelected(layer.id) ? "selected" : ""} ${this.drag?.layerId === layer.id ? "dragging" : ""}`;
      clip.querySelector(".clip-name").textContent = layer.name;
      clip.querySelector(".clip-meta").textContent = `${layer.duration.toFixed(2)}s`;
      const badges = [];
      if (layer.transitionIn || layer.transitionOut) badges.push('<span class="clip-badge" title="Transição">◫</span>');
      if (Object.keys(layer.effects || {}).length) badges.push('<span class="clip-badge" title="Efeitos">fx</span>');
      if (Object.keys(layer.animations || {}).length) badges.push('<span class="clip-badge" title="Keyframes">◆</span>');
      if (layer.locked) badges.push('<span class="clip-badge" title="Bloqueado">⌑</span>');
      clip.querySelector(".clip-badges").innerHTML = badges.join("");
      clip.setAttribute("aria-pressed", this.store.isSelected(layer.id) ? "true" : "false");
      clip.setAttribute("aria-label", `${layer.name}, início ${this.shortTime(layer.start)}, duração ${layer.duration.toFixed(2)} segundos`);
    }

    updateTrackState(track) {
      const layers = this.store.project.layers.filter((layer) => layer.trackId === track.id);
      const row = this.rowNodes.get(track.id);
      const label = this.labels.querySelector(`[data-track-id="${track.id}"]`);
      row?.classList.toggle("is-empty", !layers.length);
      label?.classList.toggle("is-empty", !layers.length);
      const hidden = layers.length > 0 && layers.every((layer) => layer.hidden);
      const locked = layers.length > 0 && layers.every((layer) => layer.locked);
      label?.querySelector('[data-track-action="visibility"]')?.classList.toggle("active", !hidden);
      label?.querySelector('[data-track-action="lock"]')?.classList.toggle("active", locked);
    }

    handleTrackAction(track, event) {
      const action = event.target.dataset.trackAction;
      if (!action) return;
      const layers = this.store.project.layers.filter((layer) => layer.trackId === track.id);
      if (!layers.length) return;
      this.store.checkpoint();
      const next = !layers.every((layer) => Boolean(layer[action === "visibility" ? "hidden" : "locked"]));
      const property = action === "visibility" ? "hidden" : "locked";
      layers.forEach((layer) => { layer[property] = action === "visibility" ? !next : next; });
      this.store.emit(`track:${action}`);
    }

    beginClipDrag(event, layerId) {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const layer = this.store.layer(layerId);
      const clip = this.clipNodes.get(layerId);
      if (!layer || !clip || layer.locked) return;
      clip.setPointerCapture?.(event.pointerId);

      if (this.tool === "blade") {
        const rect = this.trackCanvas.getBoundingClientRect();
        const time = secondsFromX(event.clientX - rect.left + this.trackCanvas.scrollLeft, this.zoom());
        this.store.setSelected(layer.id);
        this.store.setTime(clamp(time, layer.start, layer.start + layer.duration));
        this.store.splitSelected();
        return;
      }

      if (event.shiftKey) {
        const ids = new Set(this.store.selectedLayerIds || []);
        if (ids.has(layer.id)) ids.delete(layer.id); else ids.add(layer.id);
        this.store.selectLayers(Array.from(ids));
      } else if (!this.store.isSelected(layer.id)) {
        this.store.setSelected(layer.id);
      }

      this.store.checkpoint();
      const trim = event.target.dataset.trim || null;
      this.drag = {
        pointerId: event.pointerId,
        layerId: layer.id,
        trim,
        clientX: event.clientX,
        clientY: event.clientY,
        start: Number(layer.start),
        duration: Number(layer.duration),
        sourceIn: Number(layer.sourceIn || 0),
        trackId: layer.trackId,
        origins: trim ? [] : (this.store.selectedLayerIds.length ? this.store.selectedLayerIds : [layer.id])
          .map((id) => this.store.layer(id)).filter(Boolean).map((item) => ({ id:item.id, start:Number(item.start), trackId:item.trackId })),
        changed: false,
      };
      clip.classList.add("dragging");
    }

    pointerMove(event) {
      if (this.marquee) {
        this.updateMarquee(event);
        return;
      }
      if (this.scrubbing) {
        this.setTimeFromEvent(event);
        return;
      }
      if (!this.drag) return;
      this.drag.lastEvent = event;
      if (this.pendingFrame) return;
      this.pendingFrame = requestAnimationFrame(() => {
        this.pendingFrame = 0;
        if (this.drag?.lastEvent) this.applyDrag(this.drag.lastEvent);
      });
    }

    applyDrag(event) {
      const drag = this.drag;
      const layer = drag && this.store.layer(drag.layerId);
      const clip = drag && this.clipNodes.get(drag.layerId);
      if (!drag || !layer || !clip) return;
      const delta = (event.clientX - drag.clientX) / this.zoom();
      if (drag.trim === "left") {
        const rawStart = clamp(drag.start + delta, 0, drag.start + drag.duration - .1);
        const nextStart = this.snapTime(rawStart, layer.id, "start");
        const consumed = nextStart - drag.start;
        layer.start = nextStart;
        layer.duration = Math.max(.1, drag.duration - consumed);
        layer.sourceIn = Math.max(0, drag.sourceIn + consumed);
        layer.durationUserEdited = true;
      } else if (drag.trim === "right") {
        const rawDuration = Math.max(.1, drag.duration + delta);
        const snappedEnd = this.snapTime(drag.start + rawDuration, layer.id, "end");
        layer.duration = Math.max(.1, snappedEnd - drag.start);
        layer.durationUserEdited = true;
      } else {
        const earliest = Math.min(...drag.origins.map((origin) => origin.start), drag.start);
        const boundedDelta = Math.max(-earliest, delta);
        const leaderStart = this.snapTime(Math.max(0, drag.start + boundedDelta), layer.id, "start");
        const appliedDelta = leaderStart - drag.start;
        drag.origins.forEach((origin) => {
          const item = this.store.layer(origin.id);
          if (item) item.start = Math.max(0, origin.start + appliedDelta);
        });
        this.moveToCompatibleTrack(layer, event.clientY, clip);
      }
      drag.changed = true;
      this.store.ensureDuration(layer.start + layer.duration + 1);
      if (drag.trim) this.updateClipNode(layer, this.zoom());
      else drag.origins.forEach((origin) => {
        const item = this.store.layer(origin.id);
        if (item) this.updateClipNode(item, this.zoom());
      });
      this.autoScroll(event.clientX, event.clientY);
      this.store.emit("timeline:drag-live");
    }

    moveToCompatibleTrack(layer, clientY, clip) {
      const element = document.elementFromPoint(clientY === undefined ? -1 : this.trackCanvas.getBoundingClientRect().left + 10, clientY);
      const row = element?.closest?.(".track-row");
      if (!row) return;
      const target = this.store.project.timeline.tracks.find((track) => track.id === row.dataset.trackId);
      if (!target || !this.compatible(layer.type, target.type) || target.id === layer.trackId) return;
      this.rowNodes.forEach((node) => node.classList.remove("drop-target"));
      row.classList.add("drop-target");
      layer.trackId = target.id;
      row.appendChild(clip);
    }

    compatible(layerType, trackType) {
      const family = { image:"video", video:"video", text:"text", text3d:"text", shape:"shape", svg:"shape", audio:"audio" }[layerType] || layerType;
      return family === trackType;
    }

    dragMediaOver(event, track, row) {
      const types = Array.from(event.dataTransfer.types || []);
      const typeToken = types.find((value) => value.startsWith("application/x-lumi-type-"));
      const type = types.includes("application/x-lumi-svg") ? "svg" : typeToken?.slice("application/x-lumi-type-".length);
      if (!type || !this.compatible(type, track.type)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      this.rowNodes.forEach((node) => node.classList.remove("drop-target"));
      row.classList.add("drop-target");
    }

    dropMedia(event, track, row) {
      event.preventDefault();
      row.classList.remove("drop-target");
      const plain = event.dataTransfer.getData("text/plain") || "";
      const svgId = event.dataTransfer.getData("application/x-lumi-svg") || (plain.startsWith("lumi-svg:") ? plain.slice(9) : "");
      const rect = this.trackCanvas.getBoundingClientRect();
      const start = Math.max(0, secondsFromX(event.clientX - rect.left + this.trackCanvas.scrollLeft, this.zoom()));
      if (svgId) {
        if (!this.compatible("svg", track.type)) return;
        Editor.SvgLibrary.add(this.store, svgId, { start });
        return;
      }
      const mediaId = event.dataTransfer.getData("application/x-lumi-media") || (plain.startsWith("lumi-media:") ? plain.slice(11) : "");
      const media = this.store.media(mediaId);
      if (!media || !this.compatible(media.type, track.type)) return;
      const type = media.type === "audio" ? "audio" : media.type === "video" ? "video" : media.type === "svg" ? "svg" : "image";
      const duration = type === "video" || type === "audio" ? Number(media.duration) || 5 : 5;
      this.store.addLayer(type, { media, mediaId:media.id, name:media.name, duration, start, trackId:track.id });
    }

    autoScroll(clientX, clientY) {
      const rect = this.trackCanvas.getBoundingClientRect();
      const margin = 36;
      if (clientX > rect.right - margin) this.trackCanvas.scrollLeft += 12;
      else if (clientX < rect.left + margin) this.trackCanvas.scrollLeft = Math.max(0, this.trackCanvas.scrollLeft - 12);
      if (clientY > rect.bottom - margin) this.trackCanvas.scrollTop += 8;
      else if (clientY < rect.top + margin) this.trackCanvas.scrollTop = Math.max(0, this.trackCanvas.scrollTop - 8);
    }

    pointerUp() {
      if (this.marquee) {
        this.finishMarquee();
        return;
      }
      if (this.scrubbing) this.scrubbing = false;
      if (!this.drag) return;
      const changed = this.drag.changed;
      const layer = this.store.layer(this.drag.layerId);
      this.clipNodes.get(this.drag.layerId)?.classList.remove("dragging");
      this.rowNodes.forEach((node) => node.classList.remove("drop-target"));
      this.drag = null;
      this.hideSnapGuide();
      if (!changed) this.store.history.pop();
      if (layer && changed) this.store.emit("timeline:drag-commit");
      else this.render();
    }

    cancelDrag() {
      if (!this.drag) return;
      const layer = this.store.layer(this.drag.layerId);
      if (layer) {
        layer.start = this.drag.start;
        layer.duration = this.drag.duration;
        layer.sourceIn = this.drag.sourceIn;
        layer.trackId = this.drag.trackId;
      }
      this.drag.origins?.forEach((origin) => {
        const item = this.store.layer(origin.id);
        if (item) {
          item.start = origin.start;
          item.trackId = origin.trackId;
        }
      });
      this.store.history.pop();
      this.drag = null;
      this.hideSnapGuide();
      this.store.emit("timeline:drag-cancel");
    }

    beginMarquee(event) {
      if (event.button !== 0) return;
      const point = this.timelinePoint(event);
      this.marquee = {
        start:point,
        current:point,
        startClient:{ x:event.clientX, y:event.clientY },
        currentClient:{ x:event.clientX, y:event.clientY },
        baseIds:event.shiftKey ? [...this.store.selectedLayerIds] : [],
        moved:false,
      };
      if (!event.shiftKey) {
        this.store.selectedLayerId = null;
        this.store.selectedLayerIds = [];
        this.refreshClipSelection();
      }
      this.marqueeNode = document.createElement("div");
      this.marqueeNode.className = "timeline-marquee";
      this.trackCanvas.appendChild(this.marqueeNode);
      this.trackCanvas.setPointerCapture?.(event.pointerId);
      this.updateMarqueeNode();
      event.preventDefault();
    }

    updateMarquee(event) {
      this.marquee.current = this.timelinePoint(event);
      this.marquee.currentClient = { x:event.clientX, y:event.clientY };
      this.marquee.moved = this.marquee.moved || Math.hypot(event.clientX - this.marquee.startClient.x, event.clientY - this.marquee.startClient.y) > 3;
      this.updateMarqueeNode();
      const screen = this.marqueeScreenRect();
      const hits = [];
      this.clipNodes.forEach((clip, id) => {
        const rect = clip.getBoundingClientRect();
        if (screen.left < rect.right && screen.right > rect.left && screen.top < rect.bottom && screen.bottom > rect.top) hits.push(id);
      });
      const ids = Array.from(new Set([...this.marquee.baseIds, ...hits]));
      this.store.selectedLayerIds = ids;
      this.store.selectedLayerId = ids[0] || null;
      this.refreshClipSelection();
      this.syncToolbar();
      this.autoScroll(event.clientX, event.clientY);
    }

    updateMarqueeNode() {
      if (!this.marqueeNode || !this.marquee) return;
      const left = Math.min(this.marquee.start.x, this.marquee.current.x);
      const top = Math.min(this.marquee.start.y, this.marquee.current.y);
      this.marqueeNode.style.left = `${left}px`;
      this.marqueeNode.style.top = `${top}px`;
      this.marqueeNode.style.width = `${Math.abs(this.marquee.current.x - this.marquee.start.x)}px`;
      this.marqueeNode.style.height = `${Math.abs(this.marquee.current.y - this.marquee.start.y)}px`;
    }

    marqueeScreenRect() {
      const a = this.marquee.startClient;
      const b = this.marquee.currentClient;
      return { left:Math.min(a.x,b.x), right:Math.max(a.x,b.x), top:Math.min(a.y,b.y), bottom:Math.max(a.y,b.y) };
    }

    timelinePoint(event) {
      const rect = this.trackCanvas.getBoundingClientRect();
      return { x:event.clientX - rect.left + this.trackCanvas.scrollLeft, y:event.clientY - rect.top + this.trackCanvas.scrollTop };
    }

    refreshClipSelection() {
      this.clipNodes.forEach((clip, id) => {
        const selected = this.store.isSelected(id);
        clip.classList.toggle("selected", selected);
        clip.setAttribute("aria-pressed", String(selected));
      });
    }

    finishMarquee() {
      const selection = [...this.store.selectedLayerIds];
      const moved = this.marquee.moved;
      const click = this.marquee.currentClient;
      this.marqueeNode?.remove();
      this.marqueeNode = null;
      this.marquee = null;
      if (!moved) {
        const rect = this.trackCanvas.getBoundingClientRect();
        this.store.setTime(secondsFromX(click.x - rect.left + this.trackCanvas.scrollLeft, this.zoom()));
      }
      this.store.selectLayers(selection);
    }

    cancelMarquee() {
      const base = [...this.marquee.baseIds];
      this.marqueeNode?.remove();
      this.marqueeNode = null;
      this.marquee = null;
      this.store.selectLayers(base);
    }

    beginScrub(event) {
      if (event.button !== 0) return;
      this.scrubbing = true;
      this.playhead.setPointerCapture?.(event.pointerId);
      this.setTimeFromEvent(event);
      event.preventDefault();
    }

    setTimeFromEvent(event) {
      const rect = this.trackCanvas.getBoundingClientRect();
      const x = event.clientX - rect.left + this.trackCanvas.scrollLeft;
      this.store.setTime(secondsFromX(x, this.zoom()));
    }

    renderPlayhead() {
      this.playhead.style.left = `${xFromSeconds(this.store.currentTime, this.zoom())}px`;
    }

    snapTime(time, excludeLayerId, edge) {
      const fps = this.store.project.settings.fps || 30;
      const frameTime = Math.round(time * fps) / fps;
      if (!this.store.snap) {
        this.hideSnapGuide();
        return frameTime;
      }
      const threshold = 9 / this.zoom();
      const candidates = [0, this.store.currentTime, ...this.store.project.markers.map((marker) => Number(marker.time || 0))];
      this.store.project.layers.forEach((layer) => {
        if (layer.id === excludeLayerId || layer.hidden) return;
        candidates.push(Number(layer.start || 0), Number(layer.start || 0) + Number(layer.duration || 0));
      });
      let best = null;
      let distance = threshold;
      for (const candidate of candidates) {
        const nextDistance = Math.abs(candidate - time);
        if (nextDistance <= distance) { best = candidate; distance = nextDistance; }
      }
      const snapped = best == null ? frameTime : best;
      if (best == null) this.hideSnapGuide(); else this.showSnapGuide(best, edge);
      return snapped;
    }

    showSnapGuide(time) {
      if (!this.snapGuide) return;
      this.snapGuide.hidden = false;
      this.snapGuide.style.left = `${xFromSeconds(time, this.zoom())}px`;
    }

    hideSnapGuide() {
      if (this.snapGuide) this.snapGuide.hidden = true;
    }

    setZoom(value, anchorX) {
      const oldZoom = this.zoom();
      const zoom = clamp(Math.round(value), Number(this.zoomInput.min || 24), Number(this.zoomInput.max || 260));
      const anchor = Number.isFinite(anchorX) ? anchorX : this.viewportCenterX();
      const timeAtAnchor = (this.trackCanvas.scrollLeft + anchor) / oldZoom;
      this.store.project.timeline.zoom = zoom;
      this.zoomInput.value = String(zoom);
      this.render();
      this.trackCanvas.scrollLeft = Math.max(0, timeAtAnchor * zoom - anchor);
    }

    fitTimeline() {
      const duration = Math.max(.1, this.store.contentEnd() || this.store.project.settings.duration || 15);
      const available = Math.max(280, this.trackCanvas.clientWidth - 80);
      this.setZoom(clamp(available / duration, 24, 260), 0);
      this.trackCanvas.scrollLeft = 0;
    }

    viewportCenterX() {
      return (this.trackCanvas?.clientWidth || 800) / 2;
    }

    setTool(tool) {
      this.tool = tool;
      $("#selectToolBtn")?.classList.toggle("active", tool === "select");
      $("#bladeToolBtn")?.classList.toggle("active", tool === "blade");
      this.tracks.dataset.tool = tool;
    }

    toggleCollapsed() {
      const section = $(".timeline-section");
      const app = section.ownerDocument.documentElement;
      const current = parseFloat(getComputedStyle(app).getPropertyValue("--timeline-size")) || 340;
      const collapsed = current > 100;
      if (collapsed) {
        app.dataset.timelinePrevious = String(current);
        app.style.setProperty("--timeline-size", "74px");
      } else {
        app.style.setProperty("--timeline-size", `${Number(app.dataset.timelinePrevious || 340)}px`);
      }
      section.classList.toggle("collapsed", collapsed);
      $("#collapseTimelineBtn").textContent = collapsed ? "⌃" : "⌄";
    }

    syncToolbar() {
      $("#timelineSnapBtn")?.classList.toggle("active", this.store.snap);
      const selected = this.store.selectedLayerIds?.length || (this.store.selectedLayerId ? 1 : 0);
      const layer = this.store.selectedLayer();
      const info = $("#timelineSelectionInfo");
      if (info) info.textContent = selected > 1 ? `${selected} clipes selecionados` : layer ? `${layer.name} • ${layer.duration.toFixed(2)}s` : "Nenhum clipe selecionado";
      const duration = $("#timelineDurationStatus");
      if (duration) duration.textContent = `${this.shortTime(this.store.effectiveDuration())} • ${this.store.project.settings.fps} fps`;
    }

    zoom() {
      return Number(this.store.project.timeline.zoom || this.zoomInput.value || 72);
    }

    shortTime(seconds, zoom = this.zoom()) {
      const total = Math.max(0, Number(seconds) || 0);
      const m = Math.floor(total / 60);
      const s = Math.floor(total % 60);
      if (zoom > 180) {
        const frames = Math.floor((total % 1) * (this.store.project.settings.fps || 30));
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
      }
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
  }

  function iconFor(type) {
    return { video:"V", image:"I", svg:"S", text:"T", text3d:"3D", shape:"G", audio:"A" }[type] || "L";
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" })[char]);
  }

  Editor.TimelineController = TimelineController;
})();
