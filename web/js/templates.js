(function () {
  const Editor = (window.Editor = window.Editor || {});

  class Templates {
    constructor(store) {
      this.store = store;
      this.items = [
        { name: "Intro forte", action: () => this.intro() },
        { name: "Lower third", action: () => this.lowerThird() },
        { name: "Titulo animado", action: () => this.animatedTitle() },
        { name: "Legenda pop", action: () => this.caption() },
        { name: "Transicao flash", action: () => this.flashTransition() },
        { name: "Pack shapes", action: () => this.shapePack() },
        { name: "Kinetic words", action: () => this.kineticWords() },
        { name: "Beat cards", action: () => this.beatCards() },
        { name: "Moldura vertical", action: () => this.verticalFrame() },
        { name: "Cartela final", action: () => this.endCard() },
      ];
    }

    intro() {
      const bg = this.store.addLayer("shape", { name: "Fundo intro", duration: 4, props: { x: 960, y: 540, width: 1920, height: 1080, fill: "#08090d", shape: "rect", z: -10 } });
      const title = this.store.addLayer("text", { name: "Titulo intro", duration: 4, props: { text: "Domine o Caos.", x: 960, y: 430, fontSize: 120, fill: "#ffffff", shadow: 22 } });
      const sub = this.store.addLayer("text", { name: "Subtitulo intro", duration: 4, props: { text: "Maximize o Lucro.", x: 960, y: 555, fontSize: 105, fill: "#ff9f0a", shadow: 28 } });
      Editor.Presets.apply(title, "Texto com bounce");
      Editor.Presets.apply(sub, "Neon texto");
      Editor.Presets.apply(bg, "Fade");
      this.store.emit("template:intro");
    }

    lowerThird() {
      const box = this.store.addLayer("shape", { name: "Lower third caixa", duration: 5, props: { x: 500, y: 830, width: 760, height: 130, fill: "#111214", stroke: "#00c8d7", strokeWidth: 3, radius: 18 } });
      const text = this.store.addLayer("text", { name: "Lower third texto", duration: 5, props: { text: "Nome do convidado", x: 500, y: 805, width: 680, fontSize: 56, fill: "#ffffff" } });
      const role = this.store.addLayer("text", { name: "Lower third cargo", duration: 5, props: { text: "Cargo / contexto", x: 500, y: 865, width: 680, fontSize: 34, fill: "#00c8d7", fontWeight: 600 } });
      [box, text, role].forEach((layer) => Editor.Presets.apply(layer, "Panorama"));
      this.store.emit("template:lower");
    }

    animatedTitle() {
      const title = this.store.addLayer("text", { name: "Titulo animado", duration: 4, props: { text: "TITULO ANIMADO", x: 960, y: 540, fontSize: 116, fill: "#ffffff", stroke: "#8b48ff", strokeWidth: 5, shadow: 18 } });
      Editor.Presets.apply(title, "Letras embaralhadas");
      this.store.emit("template:title");
    }

    caption() {
      const text = this.store.addLayer("text", { name: "Legenda animada", duration: 5, props: { text: "legenda animada palavra por palavra", x: 960, y: 890, width: 1200, fontSize: 64, fill: "#ffffff", stroke: "#000000", strokeWidth: 8 } });
      Editor.Presets.apply(text, "Palavra por palavra");
      this.store.emit("template:caption");
    }

    flashTransition() {
      const flash = this.store.addLayer("shape", { name: "Flash branco", duration: 0.45, props: { x: 960, y: 540, width: 1920, height: 1080, fill: "#ffffff", opacity: 0, z: 999 } });
      flash.animations.opacity = [
        { time: flash.start, value: 0, ease: "easeOut" },
        { time: flash.start + 0.12, value: 1, ease: "easeOut" },
        { time: flash.start + 0.45, value: 0, ease: "easeIn" },
      ];
      this.store.emit("template:flash");
    }

    shapePack() {
      ["circle", "star", "arrow", "polygon"].forEach((shape, index) => {
        this.store.addLayer("shape", {
          name: `Shape ${shape}`,
          duration: 5,
          props: { shape, x: 640 + index * 220, y: 540, width: 150, height: 150, fill: index % 2 ? "#00c8d7" : "#8b48ff", stroke: "#ffffff", strokeWidth: 3 },
        });
      });
      this.store.emit("template:shapes");
    }

    kineticWords() {
      ["RAPIDO", "BONITO", "PRECISO"].forEach((word, index) => {
        const layer = this.store.addLayer("text", {
          name: `Kinetic ${word}`,
          start: this.store.currentTime + index * 0.18,
          duration: 3.2,
          props: { text: word, x: 960, y: 420 + index * 115, fontSize: 104, fill: index === 1 ? "#00c8d7" : "#ffffff", stroke: "#111111", strokeWidth: 5 },
        });
        Editor.Presets.apply(layer, index === 1 ? "Zoom por palavra" : "Impacto curto");
      });
      this.store.emit("template:kinetic");
    }

    beatCards() {
      for (let i = 0; i < 4; i += 1) {
        const card = this.store.addLayer("shape", {
          name: `Beat card ${i + 1}`,
          start: this.store.currentTime + i * 0.5,
          duration: 2.2,
          props: { x: 520 + i * 290, y: 540, width: 230, height: 310, fill: i % 2 ? "#00c8d7" : "#8b48ff", radius: 16, shadow: 18 },
        });
        Editor.Presets.apply(card, "Pop rapido");
      }
      this.store.emit("template:beat-cards");
    }

    verticalFrame() {
      const bg = this.store.addLayer("shape", { name: "Fundo vertical", duration: 6, props: { x: 960, y: 540, width: 720, height: 1080, fill: "#101010", stroke: "#00c8d7", strokeWidth: 4, radius: 22 } });
      const text = this.store.addLayer("text", { name: "Titulo vertical", duration: 6, props: { text: "REELS / SHORTS", x: 960, y: 880, width: 640, fontSize: 58, fill: "#ffffff", stroke: "#000000", strokeWidth: 4 } });
      Editor.Presets.apply(bg, "Entrada suave");
      Editor.Presets.apply(text, "Legenda karaoke");
      this.store.emit("template:vertical");
    }

    endCard() {
      const box = this.store.addLayer("shape", { name: "Cartela final fundo", duration: 4, props: { x: 960, y: 540, width: 1920, height: 1080, fill: "#0b0d12", z: -20 } });
      const title = this.store.addLayer("text", { name: "Cartela final titulo", duration: 4, props: { text: "OBRIGADO POR ASSISTIR", x: 960, y: 475, fontSize: 82, fill: "#ffffff" } });
      const sub = this.store.addLayer("text", { name: "Cartela final CTA", duration: 4, props: { text: "inscreva-se / siga para mais", x: 960, y: 590, fontSize: 44, fill: "#00c8d7" } });
      [box, title, sub].forEach((layer) => Editor.Presets.apply(layer, "Fade"));
      this.store.emit("template:end-card");
    }
  }

  Editor.Templates = Templates;
})();
