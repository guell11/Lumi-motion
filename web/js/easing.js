(function () {
  const Editor = (window.Editor = window.Editor || {});

  const Easing = {
    linear(t) {
      return t;
    },
    easeIn(t) {
      return t * t;
    },
    easeOut(t) {
      return 1 - Math.pow(1 - t, 2);
    },
    easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    },
    bounce(t) {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
    elastic(t) {
      if (t === 0 || t === 1) return t;
      const c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    back(t) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    bezier(t, p = [0.25, 0.1, 0.25, 1]) {
      const [x1, y1, x2, y2] = p;
      const u = 1 - t;
      const y = 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
      const x = 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t;
      return Number.isFinite(y) ? y : x;
    },
    names: ["linear", "easeIn", "easeOut", "easeInOut", "bounce", "elastic", "back"],
    apply(name, t, curve) {
      if (name === "custom") return Easing.bezier(t, curve);
      return (Easing[name] || Easing.linear)(Math.min(1, Math.max(0, t)));
    },
  };

  Editor.Easing = Easing;
})();
