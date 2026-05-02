(function () {
  const Editor = (window.Editor = window.Editor || {});
  const { pointDistance } = Editor.Utils;

  class MotionPathEditor {
    constructor(store, canvasController) {
      this.store = store;
      this.canvas = canvasController;
      this.drag = null;
    }

    draw(ctx, scale) {
      if (!this.store.motionPath) return;
      const layer = this.store.selectedLayer();
      const points = layer?.motionPath?.points || [];
      if (!layer || points.length < 1) return;

      ctx.save();
      ctx.lineWidth = 2 / scale;
      ctx.strokeStyle = "#00c8d7";
      ctx.fillStyle = "#00c8d7";
      ctx.setLineDash([8 / scale, 6 / scale]);
      ctx.beginPath();
      points
        .slice()
        .sort((a, b) => a.time - b.time)
        .forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else {
            const previous = points[index - 1];
            if (previous.handleOut || point.handleIn) {
              const h1 = previous.handleOut ? { x: previous.x + previous.handleOut.x, y: previous.y + previous.handleOut.y } : previous;
              const h2 = point.handleIn ? { x: point.x + point.handleIn.x, y: point.y + point.handleIn.y } : point;
              ctx.bezierCurveTo(h1.x, h1.y, h2.x, h2.y, point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          }
        });
      ctx.stroke();
      ctx.setLineDash([]);

      points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 7 / scale, 0, Math.PI * 2);
        ctx.fillStyle = index === 0 ? "#5ee384" : "#00c8d7";
        ctx.fill();
        ctx.lineWidth = 2 / scale;
        ctx.strokeStyle = "#101010";
        ctx.stroke();
        ctx.fillStyle = "#e8e8e8";
        ctx.font = `${11 / scale}px Segoe UI`;
        ctx.fillText(`${point.time.toFixed(2)}s`, point.x + 10 / scale, point.y - 10 / scale);

        drawHandle(ctx, point, "handleIn", scale);
        drawHandle(ctx, point, "handleOut", scale);
      });
      ctx.restore();
    }

    hitTest(point) {
      const layer = this.store.selectedLayer();
      const points = layer?.motionPath?.points || [];
      for (let i = points.length - 1; i >= 0; i -= 1) {
        const p = points[i];
        if (pointDistance(point, p) <= 14 / this.canvas.scale) return { type: "point", index: i };
        for (const handle of ["handleIn", "handleOut"]) {
          if (p[handle]) {
            const hp = { x: p.x + p[handle].x, y: p.y + p[handle].y };
            if (pointDistance(point, hp) <= 12 / this.canvas.scale) return { type: handle, index: i };
          }
        }
      }
      return null;
    }

    start(point, event) {
      const hit = this.hitTest(point);
      if (!hit) return false;
      this.drag = hit;
      event.preventDefault();
      return true;
    }

    move(point) {
      if (!this.drag) return false;
      const layer = this.store.selectedLayer();
      const pathPoint = layer?.motionPath?.points?.[this.drag.index];
      if (!pathPoint) return false;
      if (this.drag.type === "point") {
        pathPoint.x = point.x;
        pathPoint.y = point.y;
        this.store.addKeyframe(layer.id, "x", pathPoint.time, pathPoint.x, true);
        this.store.addKeyframe(layer.id, "y", pathPoint.time, pathPoint.y, true);
      } else {
        pathPoint[this.drag.type] = { x: point.x - pathPoint.x, y: point.y - pathPoint.y };
      }
      this.store.emit("motion:path");
      return true;
    }

    end() {
      this.drag = null;
    }

    addPoint(point, time) {
      const layer = this.store.selectedLayer();
      if (!layer) return;
      layer.motionPath = layer.motionPath || { type: "linear", points: [] };
      layer.motionPath.points.push({ time, x: point.x, y: point.y, ease: "easeInOut" });
      layer.motionPath.points.sort((a, b) => a.time - b.time);
      this.store.addKeyframe(layer.id, "x", time, point.x, true);
      this.store.addKeyframe(layer.id, "y", time, point.y, true);
      this.store.emit("motion:add-point");
    }

    removeNearest(point) {
      const layer = this.store.selectedLayer();
      const points = layer?.motionPath?.points || [];
      const index = points.findIndex((p) => pointDistance(point, p) <= 16 / this.canvas.scale);
      if (index >= 0) {
        points.splice(index, 1);
        this.store.emit("motion:remove-point");
      }
    }

    curveNearest(point) {
      const layer = this.store.selectedLayer();
      const points = layer?.motionPath?.points || [];
      const hit = points.find((p) => pointDistance(point, p) <= 18 / this.canvas.scale);
      if (!hit) return;
      hit.handleIn = hit.handleIn || { x: -80, y: 0 };
      hit.handleOut = hit.handleOut || { x: 80, y: 0 };
      this.store.emit("motion:curve");
    }
  }

  function drawHandle(ctx, point, key, scale) {
    if (!point[key]) return;
    const handle = { x: point.x + point[key].x, y: point.y + point[key].y };
    ctx.strokeStyle = "rgba(139, 72, 255, .85)";
    ctx.lineWidth = 1.5 / scale;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(handle.x, handle.y);
    ctx.stroke();
    ctx.fillStyle = "#8b48ff";
    ctx.beginPath();
    ctx.rect(handle.x - 5 / scale, handle.y - 5 / scale, 10 / scale, 10 / scale);
    ctx.fill();
  }

  Editor.MotionPathEditor = MotionPathEditor;
})();
