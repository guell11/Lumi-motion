(function () {
  const Editor = (window.Editor = window.Editor || {});

  class EffectsPanel {
    constructor(store) {
      this.store = store;
    }

    applyVisualEffect(effect) {
      const layer = this.store.selectedLayer();
      if (!layer) return Editor.Utils.toast("Selecione uma camada.", "error");
      layer.effects = layer.effects || {};
      const name = effect.name.toLowerCase();
      if (name.includes("glitch") || name.includes("erro") || name.includes("falha")) layer.effects.glitch = 1;
      else if (name.includes("brilho") || name.includes("clarao") || name.includes("aureola")) layer.effects.glow = 28;
      else if (name.includes("glow")) layer.effects.glow = 34;
      else if (name.includes("vinheta")) layer.effects.vignette = 0.45;
      else if (name.includes("grain") || name.includes("noise")) layer.color.grain = 0.25;
      else if (name.includes("rgb")) layer.color.chroma = 5;
      else if (name.includes("blur") || name.includes("desfoque")) layer.props.blur = Math.min(40, (layer.props.blur || 0) + 5);
      else if (name.includes("descolor")) layer.color.saturation = 0.2;
      else if (name.includes("trem") || name.includes("agitado")) Editor.Presets.apply(layer, "Tremor");
      else layer.effects.blur = Math.min(8, (layer.effects.blur || 0) + 2);
      this.store.emit("effect");
    }

    applyFilter(filter) {
      const layer = this.store.selectedLayer();
      if (!layer) return Editor.Utils.toast("Selecione uma camada.", "error");
      layer.color = { ...(layer.color || {}), ...(filter.values || {}) };
      this.store.emit("filter");
    }

    applyTransition(transition) {
      const layer = this.store.selectedLayer();
      if (!layer) return Editor.Utils.toast("Selecione uma camada.", "error");
      layer.transitionIn = { name: transition.name, duration: 0.45, ease: "easeOut" };
      layer.transitionOut = { name: transition.name, duration: 0.45, ease: "easeIn" };
      this.store.emit("transition");
    }
  }

  Editor.EffectsPanel = EffectsPanel;
})();
