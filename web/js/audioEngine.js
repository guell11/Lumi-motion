(function () {
  const Editor = (window.Editor = window.Editor || {});
  const { clamp } = Editor.Utils;

  class AudioEngine {
    constructor(store) {
      this.store = store;
      this.players = new Map();
      this.playing = false;
      this.lastToastAt = 0;
      this.failedMedia = new Set();
    }

    start(time = this.store.currentTime) {
      this.playing = true;
      this.sync(time, true);
    }

    pause() {
      this.playing = false;
      this.players.forEach((entry) => {
        try {
          entry.node.pause();
        } catch {}
      });
    }

    stop() {
      this.pause();
      this.players.forEach((entry) => {
        try {
          entry.node.currentTime = 0;
        } catch {}
      });
    }

    syncToTime(time = this.store.currentTime, force = false) {
      this.sync(time, force);
    }

    sync(time = this.store.currentTime, force = false) {
      const active = new Set();
      const layers = this.audibleLayersAt(time);
      layers.forEach((layer) => {
        const media = this.store.media(layer.mediaId);
        if (!media?.url) return;
        const entry = this.ensurePlayer(layer, media);
        if (!entry) return;
        active.add(layer.id);
        this.configurePlayer(entry.node, layer, time, force);
      });

      this.players.forEach((entry, layerId) => {
        if (!active.has(layerId) || !this.playing) {
          try {
            entry.node.pause();
          } catch {}
        }
      });
    }

    audibleLayersAt(time) {
      return this.store.project.layers
        .filter((layer) => {
          if (layer.hidden) return false;
          if (layer.type !== "audio" && layer.type !== "video") return false;
          return time >= Number(layer.start || 0) && time < Number(layer.start || 0) + Number(layer.duration || 0);
        })
        .sort((a, b) => Number(a.start || 0) - Number(b.start || 0));
    }

    ensurePlayer(layer, media) {
      const existing = this.players.get(layer.id);
      if (existing && existing.mediaId === media.id) return existing;
      if (existing) {
        try {
          existing.node.pause();
          existing.node.removeAttribute("src");
          existing.node.load();
        } catch {}
      }

      const node = document.createElement("audio");
      node.src = media.url;
      node.preload = "auto";
      node.crossOrigin = /^https?:/i.test(media.url) ? "anonymous" : null;
      node.muted = false;
      node.playsInline = true;
      node.setAttribute("playsinline", "");
      node.style.display = "none";
      const entry = { node, mediaId: media.id };
      node.addEventListener("error", () => this.requestFallbackAudio(layer, media, entry));
      document.body.appendChild(node);
      this.players.set(layer.id, entry);
      return entry;
    }

    configurePlayer(node, layer, time, force) {
      const localTime = clamp(Number(time || 0) - Number(layer.start || 0), 0, Math.max(0, Number(layer.duration || 0)));
      const audio = layer.audio || {};
      const speed = clamp(Number(audio.speed ?? 1), 0.25, 4);
      const targetVolume = this.volumeAt(layer, localTime);
      node.playbackRate = speed;
      node.volume = clamp(targetVolume, 0, 1);
      const tolerance = this.playing ? 0.22 : 0.03;
      if (force || Math.abs((node.currentTime || 0) - localTime) > tolerance) {
        try {
          node.currentTime = localTime;
        } catch {}
      }
      if (this.playing && node.paused) {
        const promise = node.play();
        if (promise?.catch) promise.catch(() => {
          const media = this.store.media(layer.mediaId);
          const entry = this.players.get(layer.id);
          if (media && entry) this.requestFallbackAudio(layer, media, entry);
        });
      }
    }

    async requestFallbackAudio(layer, media, entry) {
      if (this.failedMedia.has(media.id)) return;
      if (entry.fallbackRequested || entry.usingFallback) {
        return;
      }
      if (!media.path) {
        this.toastPlaybackProblem(media.name || layer.name);
        return;
      }
      entry.fallbackRequested = true;
      const result = await Editor.Bridge.call("previewAudio", media.path);
      entry.fallbackRequested = false;
      if (!result.ok || !result.media?.url) {
        this.failedMedia.add(media.id);
        this.toastPlaybackProblem(media.name || layer.name);
        return;
      }
      entry.usingFallback = true;
      entry.node.pause();
      entry.node.src = result.media.url;
      entry.node.load();
      this.configurePlayer(entry.node, layer, this.store.currentTime, true);
    }

    volumeAt(layer, localTime) {
      const audio = layer.audio || {};
      let volume = Number(audio.volume ?? 1);
      const duration = Math.max(0.001, Number(layer.duration || 0));
      const fadeIn = Math.max(0, Number(audio.fadeIn || 0));
      const fadeOut = Math.max(0, Number(audio.fadeOut || 0));
      if (fadeIn > 0) volume *= clamp(localTime / fadeIn, 0, 1);
      if (fadeOut > 0) volume *= clamp((duration - localTime) / fadeOut, 0, 1);
      if (audio.normalize) volume *= 1.05;
      if (audio.enhance) volume *= 1.03;
      return volume;
    }

    toastPlaybackProblem(name) {
      const now = performance.now();
      if (now - this.lastToastAt < 3500) return;
      this.lastToastAt = now;
      Editor.Utils.toast(`Nao foi possivel tocar audio de ${name || "midia"}. Verifique codec/arquivo.`, "error");
    }

    async separateSelectedAudio() {
      const layer = this.store.selectedLayer();
      const media = layer && this.store.media(layer.mediaId);
      if (!media?.path) {
        Editor.Utils.toast("Selecione um video importado do disco para separar audio.", "error");
        return;
      }
      const result = await Editor.Bridge.call("separateAudio", media.path);
      if (!result.ok) {
        Editor.Utils.toast(result.error || "Nao foi possivel separar audio.", "error");
        return;
      }
      this.store.addMedia([result.media]);
      this.store.addLayer("audio", {
        name: `${media.name} audio`,
        mediaId: result.media.id,
        media: result.media,
        start: layer.start,
        duration: layer.duration,
      });
      Editor.Utils.toast("Audio separado e colocado na timeline.");
    }

    beatMarker() {
      this.store.addMarker(this.store.currentTime, "Beat");
    }
  }

  Editor.AudioEngine = AudioEngine;
})();
