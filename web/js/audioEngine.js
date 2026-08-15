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
      this.context = null;
      this.reverbBuffer = null;
      this.lastSyncAt = 0;
    }

    start(time = this.store.currentTime) {
      this.playing = true;
      this.ensureContext();
      this.context?.resume?.().catch?.(() => {});
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
      const now = performance.now();
      if (this.playing && !force && now - this.lastSyncAt < 100) return;
      this.lastSyncAt = now;
      const active = new Set();
      const layers = this.audibleLayersAt(time);
      layers.forEach((layer) => {
        const media = this.store.media(layer.mediaId);
        if (!media?.url) return;
        const entry = this.ensurePlayer(layer, media);
        if (!entry) return;
        active.add(layer.id);
        this.configurePlayer(entry.node, layer, time, force, entry);
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
      this.attachAudioGraph(entry);
      node.addEventListener("error", () => this.requestFallbackAudio(layer, media, entry));
      document.body.appendChild(node);
      this.players.set(layer.id, entry);
      return entry;
    }

    configurePlayer(node, layer, time, force, entry = this.players.get(layer.id)) {
      const sourceIn = Math.max(0, Number(layer.sourceIn || 0));
      const localTime = sourceIn + clamp(Number(time || 0) - Number(layer.start || 0), 0, Math.max(0, Number(layer.duration || 0)));
      const audio = layer.audio || {};
      const speed = clamp(Number(audio.speed ?? 1), 0.25, 4);
      const targetVolume = this.volumeAt(layer, Math.max(0, localTime - sourceIn));
      const pitchFactor = Math.pow(2, clamp(Number(audio.pitch || 0), -12, 12) / 12);
      node.playbackRate = clamp(speed * pitchFactor, 0.25, 4);
      node.preservesPitch = !Number(audio.pitch || 0);
      node.volume = entry?.graph ? 1 : clamp(targetVolume, 0, 1);
      this.configureAudioGraph(entry, audio, targetVolume);
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

    ensureContext() {
      if (this.context) return this.context;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      try {
        this.context = new AudioContext();
      } catch {
        this.context = null;
      }
      return this.context;
    }

    attachAudioGraph(entry) {
      const context = this.ensureContext();
      if (!context || entry.graph) return;
      try {
        const source = context.createMediaElementSource(entry.node);
        const low = context.createBiquadFilter();
        low.type = "lowshelf";
        low.frequency.value = 180;
        const mid = context.createBiquadFilter();
        mid.type = "peaking";
        mid.frequency.value = 1200;
        mid.Q.value = 0.75;
        const high = context.createBiquadFilter();
        high.type = "highshelf";
        high.frequency.value = 5200;
        const pan = context.createStereoPanner ? context.createStereoPanner() : context.createGain();
        const dry = context.createGain();
        const wet = context.createGain();
        const convolver = context.createConvolver();
        convolver.buffer = this.createReverbBuffer(context);
        const compressor = context.createDynamicsCompressor();
        const limiter = context.createDynamicsCompressor();
        const output = context.createGain();
        source.connect(low).connect(mid).connect(high).connect(pan);
        pan.connect(dry).connect(compressor);
        pan.connect(convolver).connect(wet).connect(compressor);
        compressor.connect(limiter).connect(output).connect(context.destination);
        entry.graph = { source, low, mid, high, pan, dry, wet, convolver, compressor, limiter, output };
      } catch {
        entry.graph = null;
      }
    }

    createReverbBuffer(context) {
      if (this.reverbBuffer) return this.reverbBuffer;
      const length = Math.floor(context.sampleRate * 1.8);
      const buffer = context.createBuffer(2, length, context.sampleRate);
      for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < length; i += 1) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
        }
      }
      this.reverbBuffer = buffer;
      return buffer;
    }

    configureAudioGraph(entry, audio, volume) {
      const graph = entry?.graph;
      if (!graph) return;
      const now = this.context?.currentTime || 0;
      const set = (param, value) => {
        if (param?.setTargetAtTime) param.setTargetAtTime(value, now, 0.012);
        else if (param) param.value = value;
      };
      set(graph.low.gain, clamp(Number(audio.low || 0), -18, 18));
      set(graph.mid.gain, clamp(Number(audio.mid || 0), -18, 18));
      set(graph.high.gain, clamp(Number(audio.high || 0), -18, 18));
      if (graph.pan.pan) set(graph.pan.pan, clamp(Number(audio.pan || 0), -1, 1));
      const reverb = clamp(Number(audio.reverb || 0), 0, 1);
      set(graph.dry.gain, 1 - reverb * 0.38);
      set(graph.wet.gain, reverb * 0.72);
      set(graph.output.gain, clamp(Number(volume || 0), 0, 2));
      graph.compressor.threshold.value = audio.compressor ? -22 : 0;
      graph.compressor.knee.value = audio.compressor ? 18 : 0;
      graph.compressor.ratio.value = audio.compressor ? 4 : 1;
      graph.compressor.attack.value = audio.compressor ? 0.012 : 0;
      graph.compressor.release.value = audio.compressor ? 0.24 : 0.05;
      graph.limiter.threshold.value = audio.limiter ? -1 : 0;
      graph.limiter.knee.value = 0;
      graph.limiter.ratio.value = audio.limiter ? 20 : 1;
      graph.limiter.attack.value = 0.002;
      graph.limiter.release.value = 0.08;
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
