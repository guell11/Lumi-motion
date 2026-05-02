(function () {
  const Editor = (window.Editor = window.Editor || {});
  const { uid, clone, clamp } = Editor.Utils;

  function defaultProject() {
    return {
      version: 1,
      name: "Projeto sem titulo",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 15,
        background: "#111214",
        aspect: "16:9",
      },
      media: [],
      layers: [],
      timeline: {
        zoom: 72,
        tracks: [
          { id: "track-video", name: "Video", type: "video", height: 54 },
          { id: "track-text", name: "Texto", type: "text", height: 54 },
          { id: "track-shape", name: "Shapes", type: "shape", height: 54 },
          { id: "track-audio", name: "Audio", type: "audio", height: 48 },
        ],
      },
      presets: [],
      markers: [],
      camera: {
        props: {
          x: 0,
          y: 0,
          z: 900,
          zoom: 1,
          rotation: 0,
          tiltX: 0,
          tiltY: 0,
          fov: 45,
        },
        animations: {},
      },
    };
  }

  class Store {
    constructor() {
      this.project = defaultProject();
      this.currentTime = 0;
      this.selectedLayerId = null;
      this.selectedLayerIds = [];
      this.mode = "select";
      this.recordMotion = false;
      this.snap = true;
      this.grid = false;
      this.motionPath = true;
      this.history = [];
      this.future = [];
      this.listeners = new Set();
    }

    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    emit(reason = "change") {
      this.project.updatedAt = new Date().toISOString();
      this.listeners.forEach((listener) => listener(this, reason));
    }

    checkpoint() {
      this.history.push(JSON.stringify(this.project));
      if (this.history.length > 80) this.history.shift();
      this.future.length = 0;
    }

    undo() {
      const previous = this.history.pop();
      if (!previous) return;
      this.future.push(JSON.stringify(this.project));
      this.project = JSON.parse(previous);
      this.emit("undo");
    }

    redo() {
      const next = this.future.pop();
      if (!next) return;
      this.history.push(JSON.stringify(this.project));
      this.project = JSON.parse(next);
      this.emit("redo");
    }

    serialize() {
      return clone(this.project);
    }

    load(project) {
      this.project = normalizeProject(project);
      this.currentTime = 0;
      this.selectedLayerId = null;
      this.selectedLayerIds = [];
      this.history.length = 0;
      this.future.length = 0;
      this.emit("load");
    }

    setName(name) {
      this.project.name = name || "Projeto sem titulo";
      this.emit("name");
    }

    setSetting(key, value) {
      this.project.settings[key] = value;
      this.emit("settings");
    }

    setTime(time) {
      this.currentTime = clamp(time, 0, this.timelineDuration());
      this.emit("time");
    }

    setDuration(duration) {
      this.project.settings.duration = Math.max(0.1, Number(duration) || 15);
      this.currentTime = clamp(this.currentTime, 0, this.project.settings.duration);
      this.emit("duration");
    }

    addMedia(items) {
      this.checkpoint();
      const existing = new Set(this.project.media.map((item) => item.path || item.url || item.name));
      items.forEach((item) => {
        const key = item.path || item.url || item.name;
        if (!existing.has(key)) {
          this.project.media.push({ ...item, id: item.id || uid("media") });
          existing.add(key);
        }
      });
      this.emit("media");
    }

    addLayer(type, options = {}) {
      this.checkpoint();
      const track = this.trackFor(type);
      const layer = createLayer(type, {
        id: uid("layer"),
        start: options.start ?? this.currentTime,
        duration: options.duration ?? defaultDuration(type, options.media),
        trackId: track.id,
        ...options,
      });
      this.project.layers.push(layer);
      this.selectedLayerId = layer.id;
      this.selectedLayerIds = [layer.id];
      this.ensureDuration(layer.start + layer.duration + 1);
      this.emit("layer:add");
      return layer;
    }

    updateLayer(id, patch, keyframeProperties = []) {
      const layer = this.layer(id);
      if (!layer) return;
      const previousProps = clone(layer.props || {});
      Object.assign(layer, patch);
      if (patch.props) layer.props = { ...previousProps, ...patch.props };
      if (this.recordMotion && keyframeProperties.length) {
        keyframeProperties.forEach((property) => this.addKeyframe(id, property, this.currentTime, layer.props[property], true));
      }
      this.emit("layer:update");
    }

    mutateLayer(id, mutator, reason = "layer:mutate") {
      const layer = this.layer(id);
      if (!layer) return null;
      this.checkpoint();
      mutator(layer);
      this.emit(reason);
      return layer;
    }

    deleteSelected() {
      const ids = this.selectedLayerIds.length ? this.selectedLayerIds : (this.selectedLayerId ? [this.selectedLayerId] : []);
      if (!ids.length) return;
      this.checkpoint();
      const selected = new Set(ids);
      this.project.layers = this.project.layers.filter((layer) => !selected.has(layer.id) && !selected.has(layer.parentId));
      this.selectedLayerId = null;
      this.selectedLayerIds = [];
      this.emit("layer:delete");
    }

    duplicateSelected() {
      const layer = this.selectedLayer();
      if (!layer) return;
      this.checkpoint();
      const copy = clone(layer);
      copy.id = uid("layer");
      copy.name = `${layer.name} copia`;
      copy.start += 0.25;
      copy.props.x += 42;
      copy.props.y += 42;
      this.project.layers.push(copy);
      this.selectedLayerId = copy.id;
      this.selectedLayerIds = [copy.id];
      this.emit("layer:duplicate");
    }

    splitSelected() {
      const layer = this.selectedLayer();
      if (!layer || this.currentTime <= layer.start || this.currentTime >= layer.start + layer.duration) return;
      this.checkpoint();
      const leftDuration = this.currentTime - layer.start;
      const rightDuration = layer.duration - leftDuration;
      const right = clone(layer);
      right.id = uid("layer");
      right.name = `${layer.name} corte`;
      right.start = this.currentTime;
      right.duration = rightDuration;
      layer.duration = leftDuration;
      this.project.layers.push(right);
      this.selectedLayerId = right.id;
      this.selectedLayerIds = [right.id];
      this.emit("layer:split");
    }

    joinSelectedWithNext() {
      const layer = this.selectedLayer();
      if (!layer) return;
      const next = this.project.layers
        .filter((item) => item.trackId === layer.trackId && item.id !== layer.id && item.start >= layer.start)
        .sort((a, b) => a.start - b.start)[0];
      if (!next) return;
      this.checkpoint();
      layer.duration = Math.max(layer.duration, next.start + next.duration - layer.start);
      this.project.layers = this.project.layers.filter((item) => item.id !== next.id);
      this.emit("layer:join");
    }

    setSelected(id) {
      this.selectedLayerId = id;
      this.selectedLayerIds = id ? [id] : [];
      this.emit("select");
    }

    selectLayers(ids) {
      const unique = Array.from(new Set((ids || []).filter(Boolean)));
      this.selectedLayerIds = unique;
      this.selectedLayerId = unique[0] || null;
      this.emit("select:multi");
    }

    isSelected(id) {
      return this.selectedLayerIds.includes(id) || this.selectedLayerId === id;
    }

    selectAllVisible() {
      this.selectLayers(this.visibleLayersAt(this.currentTime).map((layer) => layer.id));
    }

    selectAllTimeline() {
      this.selectLayers(this.project.layers.map((layer) => layer.id));
    }

    selectedLayer() {
      return this.layer(this.selectedLayerId);
    }

    layer(id) {
      return this.project.layers.find((layer) => layer.id === id);
    }

    media(id) {
      return this.project.media.find((item) => item.id === id);
    }

    trackFor(type) {
      const map = {
        image: "video",
        video: "video",
        svg: "shape",
        text: "text",
        text3d: "text",
        shape: "shape",
        audio: "audio",
      };
      return this.project.timeline.tracks.find((track) => track.type === (map[type] || type)) || this.project.timeline.tracks[0];
    }

    visibleLayersAt(time = this.currentTime) {
      return this.project.layers
        .filter((layer) => !layer.hidden && layer.type !== "audio" && time >= layer.start && time <= layer.start + layer.duration)
        .sort((a, b) => (a.props?.z || 0) - (b.props?.z || 0));
    }

    contentEnd(includeHidden = false) {
      const layers = this.project.layers.filter((layer) => includeHidden || !layer.hidden);
      if (!layers.length) return 0;
      return Math.max(...layers.map((layer) => Number(layer.start || 0) + Number(layer.duration || 0)));
    }

    effectiveDuration() {
      return Math.max(0.1, this.contentEnd() || this.project.settings.duration || 15);
    }

    timelineDuration() {
      return Math.max(15, this.project.settings.duration || 0, this.contentEnd() + 2);
    }

    audioLayers() {
      return this.project.layers.filter((layer) => layer.type === "audio");
    }

    addKeyframe(layerId, property, time, value, silent = false) {
      const layer = this.layer(layerId);
      if (!layer) return;
      layer.animations = layer.animations || {};
      const frames = (layer.animations[property] = layer.animations[property] || []);
      const existing = frames.find((frame) => Math.abs(frame.time - time) < 0.015);
      if (existing) {
        existing.value = value;
      } else {
        frames.push({ time, value, ease: "easeInOut" });
      }
      frames.sort((a, b) => a.time - b.time);
      if (!silent) this.emit("keyframe:add");
    }

    updateKeyframe(layerId, property, index, patch) {
      const layer = this.layer(layerId);
      const frame = layer?.animations?.[property]?.[index];
      if (!frame) return;
      Object.assign(frame, patch);
      layer.animations[property].sort((a, b) => a.time - b.time);
      this.emit("keyframe:update");
    }

    removeKeyframe(layerId, property, index) {
      const layer = this.layer(layerId);
      if (!layer?.animations?.[property]) return;
      layer.animations[property].splice(index, 1);
      this.emit("keyframe:remove");
    }

    applyPresetToSelected(name) {
      const layer = this.selectedLayer();
      if (!layer) return;
      this.checkpoint();
      Editor.Presets.apply(layer, name);
      this.emit("preset");
    }

    saveSelectedAsPreset(name) {
      const layer = this.selectedLayer();
      if (!layer) return;
      const preset = {
        id: uid("preset"),
        name,
        target: layer.type,
        duration: layer.duration,
        properties: clone(layer.animations || {}),
        effects: clone(layer.effects || {}),
        textAnimation: clone(layer.textAnimation || null),
      };
      this.project.presets.push(preset);
      this.emit("preset:save");
    }

    addMarker(time = this.currentTime, label = "Beat") {
      this.project.markers.push({ id: uid("marker"), time, label });
      this.emit("marker:add");
    }

    setCameraProp(property, value, keyframe = false) {
      this.project.camera = this.project.camera || defaultProject().camera;
      this.project.camera.props[property] = value;
      if (keyframe || this.recordMotion) this.addCameraKeyframe(property, this.currentTime, value, true);
      this.emit("camera");
    }

    addCameraKeyframe(property, time, value, silent = false) {
      this.project.camera = this.project.camera || defaultProject().camera;
      const frames = (this.project.camera.animations[property] = this.project.camera.animations[property] || []);
      const existing = frames.find((frame) => Math.abs(frame.time - time) < 0.015);
      if (existing) existing.value = value;
      else frames.push({ time, value, ease: "easeInOut" });
      frames.sort((a, b) => a.time - b.time);
      if (!silent) this.emit("camera:keyframe");
    }

    applyCameraPreset(name) {
      this.project.camera = this.project.camera || defaultProject().camera;
      const camera = this.project.camera;
      const start = this.currentTime;
      const presets = {
        "Dolly in": { zoom: [[0, camera.props.zoom], [2, camera.props.zoom * 1.35]], z: [[0, camera.props.z], [2, camera.props.z - 180]] },
        "Dolly out": { zoom: [[0, camera.props.zoom], [2, Math.max(0.25, camera.props.zoom * 0.72)]], z: [[0, camera.props.z], [2, camera.props.z + 240]] },
        "Pan esquerda": { x: [[0, camera.props.x + 220], [2.2, camera.props.x - 220]] },
        "Pan direita": { x: [[0, camera.props.x - 220], [2.2, camera.props.x + 220]] },
        "Tilt dramatico": { tiltX: [[0, -8], [1.8, 8]], rotation: [[0, -2], [1.8, 2]] },
        "Orbit 3D": { tiltY: [[0, -18], [2.5, 18]], rotation: [[0, -4], [2.5, 4]] },
        "Camera shake": { x: [[0, -18], [0.06, 18], [0.12, -12], [0.18, 12], [0.26, 0]], y: [[0, 10], [0.06, -8], [0.12, 7], [0.18, -5], [0.26, 0]] },
      };
      const preset = presets[name];
      if (!preset) return;
      Object.entries(preset).forEach(([property, frames]) => {
        camera.animations[property] = frames.map(([offset, value]) => ({ time: start + offset, value, ease: "easeInOut" }));
      });
      this.emit("camera:preset");
    }

    toggleLayerFlag(id, flag) {
      const layer = this.layer(id);
      if (!layer) return;
      layer[flag] = !layer[flag];
      this.emit("layer:flag");
    }

    ensureDuration(minDuration) {
      if (minDuration > this.project.settings.duration) {
        this.project.settings.duration = Math.ceil(minDuration);
      }
    }
  }

  function normalizeProject(project) {
    const base = defaultProject();
    const data = project && typeof project === "object" ? project : {};
    const merged = { ...base, ...data };
    merged.settings = { ...base.settings, ...(data.settings || {}) };
    merged.timeline = { ...base.timeline, ...(data.timeline || {}) };
    merged.camera = { ...base.camera, ...(data.camera || {}) };
    merged.camera.props = { ...base.camera.props, ...((data.camera || {}).props || {}) };
    merged.camera.animations = { ...((data.camera || {}).animations || {}) };
    if (!Array.isArray(merged.timeline.tracks) || !merged.timeline.tracks.length) merged.timeline.tracks = base.timeline.tracks;
    ["media", "layers", "presets", "markers"].forEach((key) => {
      if (!Array.isArray(merged[key])) merged[key] = [];
    });
    merged.layers = merged.layers.map((layer) => createLayer(layer.type, layer));
    return merged;
  }

  function defaultDuration(type, media) {
    if (type === "audio" || type === "video") return Number(media?.duration) || 5;
    if (type === "image" || type === "svg") return 5;
    return 4;
  }

  function createLayer(type, options = {}) {
    const id = options.id || uid("layer");
    const isMedia = ["image", "video", "audio", "svg"].includes(type);
    const media = options.media || null;
    const name = options.name || media?.name || (type === "text" ? "Texto" : type === "text3d" ? "Texto 3D" : type === "shape" ? "Shape" : "Clip");
    const props = {
      x: 960,
      y: 540,
      z: 0,
      width: type === "text" || type === "text3d" ? 620 : 420,
      height: type === "text" || type === "text3d" ? 160 : 260,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      rotateX: 0,
      rotateY: 0,
      opacity: 1,
      blur: 0,
      fill: type === "text" || type === "text3d" ? "#ffffff" : "#8b48ff",
      stroke: "#000000",
      strokeWidth: 0,
      shadow: 0,
      shadowColor: "#000000",
      fontFamily: "Segoe UI",
      fontSize: 96,
      fontWeight: 800,
      align: "center",
      letterSpacing: 0,
      text: type === "text3d" ? "Texto 3D" : "Novo texto",
      shape: "rect",
      radius: type === "shape" ? 18 : 0,
      mask: "none",
      blendMode: "source-over",
      perspective: 700,
      userSized: false,
      depth: 72,
      bevel: 0.18,
      metalness: 0.35,
      roughness: 0.38,
      lightX: -180,
      lightY: -260,
      lightZ: 520,
      ...options.props,
    };
    const layer = {
      id,
      type,
      name,
      trackId: options.trackId || "track-video",
      start: Number(options.start ?? 0),
      duration: Number(options.duration ?? defaultDuration(type, media)),
      durationUserEdited: Boolean(options.durationUserEdited),
      mediaId: options.mediaId || media?.id || null,
      props,
      animations: options.animations || {},
      effects: options.effects || {},
      color: options.color || { brightness: 1, contrast: 1, saturation: 1, temperature: 0, grain: 0, chroma: 0 },
      audio: options.audio || {
        volume: 1,
        fadeIn: 0,
        fadeOut: 0,
        speed: 1,
        pitch: 0,
        pan: 0,
        low: 0,
        mid: 0,
        high: 0,
        reverb: 0,
        compressor: false,
        limiter: false,
        normalize: false,
        enhance: false,
        reduceNoise: false,
      },
      transitionIn: options.transitionIn || null,
      transitionOut: options.transitionOut || null,
      textAnimation: options.textAnimation || null,
      motionPath: options.motionPath || { type: "linear", points: [] },
      animationSpeed: Number(options.animationSpeed || 1),
      locked: Boolean(options.locked),
      hidden: Boolean(options.hidden),
      parentId: options.parentId || null,
      groupId: options.groupId || null,
    };
    if (isMedia && media) layer.mediaId = media.id;
    if (type === "audio") {
      layer.props.width = 0;
      layer.props.height = 0;
      layer.trackId = options.trackId || "track-audio";
    }
    if (type === "text" || type === "text3d") layer.trackId = options.trackId || "track-text";
    if (type === "shape" || type === "svg") layer.trackId = options.trackId || "track-shape";
    return layer;
  }

  Editor.Store = Store;
  Editor.createLayer = createLayer;
  Editor.defaultProject = defaultProject;
})();
