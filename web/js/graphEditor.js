(function () {
  const Editor = (window.Editor = window.Editor || {});
  const { $, clamp } = Editor.Utils;

  class GraphEditor {
    constructor(store) {
      this.store = store;
      this.canvas = $("#graphCanvas");
      this.ctx = this.canvas.getContext("2d");
      this.property = "x";
      this.bind();
    }

    bind() {
      this.canvas.addEventListener("dblclick", () => {
        const layer = this.store.selectedLayer();
        if (!layer) return;
        const names = Object.keys(layer.animations || {});
        if (!names.length) return;
        const index = Math.max(0, names.indexOf(this.property));
        this.property = names[(index + 1) % names.length];
        this.render();
      });
      this.canvas.addEventListener("pointerdown", (event) => this.pointer(event));
    }

    pointer(event) {
      const layer = this.store.selectedLayer();
      const frames = layer?.animations?.[this.property];
      if (!frames?.length) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const frameIndex = Math.round((x / rect.width) * (frames.length - 1));
      const frame = frames[frameIndex];
      if (!frame) return;
      const eases = Editor.Easing.names;
      const next = eases[(eases.indexOf(frame.ease) + 1) % eases.length] || "linear";
      frame.ease = next;
      this.store.emit("graph:ease");
    }

    render() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#191919";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += 45) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 45) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      const layer = this.store.selectedLayer();
      const animations = layer?.animations || {};
      const names = Object.keys(animations);
      if (!layer || !names.length) {
        ctx.fillStyle = "#777";
        ctx.font = "13px Segoe UI";
        ctx.fillText("Sem keyframes", 18, 28);
        return;
      }
      if (!animations[this.property]) this.property = names[0];
      const frames = animations[this.property] || [];
      const values = frames.map((frame) => Number(frame.value)).filter(Number.isFinite);
      const min = Math.min(...values, 0);
      const max = Math.max(...values, 1);
      const span = Math.max(0.0001, max - min);
      const timeStart = frames[0]?.time || 0;
      const timeEnd = frames[frames.length - 1]?.time || timeStart + 1;
      const timeSpan = Math.max(0.0001, timeEnd - timeStart);

      ctx.strokeStyle = "#00c8d7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      frames.forEach((frame, index) => {
        const x = ((frame.time - timeStart) / timeSpan) * (w - 40) + 20;
        const y = h - 24 - ((Number(frame.value) - min) / span) * (h - 50);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      frames.forEach((frame) => {
        const x = ((frame.time - timeStart) / timeSpan) * (w - 40) + 20;
        const y = h - 24 - ((Number(frame.value) - min) / span) * (h - 50);
        ctx.fillStyle = "#8b48ff";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#aaa";
        ctx.font = "10px Segoe UI";
        ctx.fillText(frame.ease || "linear", clamp(x - 16, 4, w - 52), y - 9);
      });

      ctx.fillStyle = "#e8e8e8";
      ctx.font = "12px Segoe UI";
      ctx.fillText(`Curva: ${this.property}`, 12, 18);
    }
  }

  Editor.GraphEditor = GraphEditor;
})();
