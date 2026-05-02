(function () {
  const Editor = (window.Editor = window.Editor || {});
  const { clone, lerp } = Editor.Utils;

  class AnimationEngine {
    constructor(store) {
      this.store = store;
    }

    propsAt(layer, time) {
      const props = clone(layer.props || {});
      const animations = layer.animations || {};
      const animationTime = layer.start + Math.max(0, time - layer.start) * Number(layer.animationSpeed || 1);
      Object.keys(animations).forEach((property) => {
        props[property] = this.valueAt(layer, property, animationTime);
      });

      const pathPoint = this.motionPathAt(layer, animationTime);
      if (pathPoint) {
        props.x = pathPoint.x;
        props.y = pathPoint.y;
      }

      props.opacity = this.transitionOpacity(layer, time, props.opacity ?? 1);
      props.localTime = Math.max(0, time - layer.start);
      props.progress = layer.duration ? Math.min(1, props.localTime / layer.duration) : 1;
      return props;
    }

    valueAt(layer, property, time) {
      const frames = [...((layer.animations || {})[property] || [])].sort((a, b) => a.time - b.time);
      const base = layer.props ? layer.props[property] : 0;
      return this.valueFromFrames(frames, base, time);
    }

    valueFromFrames(framesInput, base, time) {
      const frames = [...(framesInput || [])].sort((a, b) => a.time - b.time);
      if (!frames.length) return base;
      if (time <= frames[0].time) return frames[0].value;
      if (time >= frames[frames.length - 1].time) return frames[frames.length - 1].value;

      for (let i = 0; i < frames.length - 1; i += 1) {
        const a = frames[i];
        const b = frames[i + 1];
        if (time >= a.time && time <= b.time) {
          const span = Math.max(0.0001, b.time - a.time);
          const raw = (time - a.time) / span;
          const eased = Editor.Easing.apply(a.ease || "linear", raw, a.curve);
          return interpolate(a.value, b.value, eased);
        }
      }
      return base;
    }

    cameraAt(time) {
      const camera = this.store.project.camera || {};
      const props = clone(camera.props || {});
      const animations = camera.animations || {};
      Object.keys(animations).forEach((property) => {
        props[property] = this.valueFromFrames(animations[property], props[property], time);
      });
      return props;
    }

    transitionOpacity(layer, time, opacity) {
      // Visual transitions (including opacity) are now handled in CanvasController.transitionState
      return opacity;
    }

    motionPathAt(layer, time) {
      const points = layer.motionPath?.points || [];
      if (points.length < 2) return null;
      const sorted = [...points].sort((a, b) => a.time - b.time);
      if (time <= sorted[0].time) return sorted[0];
      if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1];

      for (let i = 0; i < sorted.length - 1; i += 1) {
        const a = sorted[i];
        const b = sorted[i + 1];
        if (time >= a.time && time <= b.time) {
          const raw = (time - a.time) / Math.max(0.0001, b.time - a.time);
          const t = Editor.Easing.apply(a.ease || "linear", raw, a.curve);
          if (a.handleOut || b.handleIn) {
            const p0 = a;
            const p1 = a.handleOut ? { x: a.x + a.handleOut.x, y: a.y + a.handleOut.y } : a;
            const p2 = b.handleIn ? { x: b.x + b.handleIn.x, y: b.y + b.handleIn.y } : b;
            const p3 = b;
            return cubicBezier(p0, p1, p2, p3, t);
          }
          return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), time };
        }
      }
      return null;
    }

    ensureMotionPoint(layer, time, props) {
      layer.motionPath = layer.motionPath || { type: "linear", points: [] };
      const points = layer.motionPath.points;
      // Auto-seed the origin point so path works immediately (needs >= 2 points)
      if (!points.length) {
        const originX = layer.props.x;
        const originY = layer.props.y;
        const originTime = Math.max(0, time - 0.5);
        points.push({ time: originTime, x: originX, y: originY, ease: "easeInOut" });
        this.store.addKeyframe(layer.id, "x", originTime, originX, true);
        this.store.addKeyframe(layer.id, "y", originTime, originY, true);
      }
      const existing = points.find((point) => Math.abs(point.time - time) < 0.015);
      if (existing) {
        existing.x = props.x;
        existing.y = props.y;
      } else {
        points.push({ time, x: props.x, y: props.y, ease: "easeInOut" });
      }
      points.sort((a, b) => a.time - b.time);
      this.store.addKeyframe(layer.id, "x", time, props.x, true);
      this.store.addKeyframe(layer.id, "y", time, props.y, true);
    }
  }

  function interpolate(a, b, t) {
    if (typeof a === "number" && typeof b === "number") return lerp(a, b, t);
    if (isColor(a) && isColor(b)) return interpolateColor(a, b, t);
    return t < 0.5 ? a : b;
  }

  function isColor(value) {
    return typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value);
  }

  function interpolateColor(a, b, t) {
    const ca = expandHex(a);
    const cb = expandHex(b);
    const av = parseInt(ca, 16);
    const bv = parseInt(cb, 16);
    const ar = (av >> 16) & 255;
    const ag = (av >> 8) & 255;
    const ab = av & 255;
    const br = (bv >> 16) & 255;
    const bg = (bv >> 8) & 255;
    const bb = bv & 255;
    const out = [lerp(ar, br, t), lerp(ag, bg, t), lerp(ab, bb, t)]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("");
    return `#${out}`;
  }

  function expandHex(hex) {
    const clean = hex.slice(1);
    if (clean.length === 3) return clean.split("").map((char) => char + char).join("");
    return clean.slice(0, 6).padEnd(6, "0");
  }

  function cubicBezier(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return {
      x: u ** 3 * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * p3.x,
      y: u ** 3 * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * p3.y,
    };
  }

  Editor.AnimationEngine = AnimationEngine;
})();
