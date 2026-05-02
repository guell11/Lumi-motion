(function () {
  const Editor = (window.Editor = window.Editor || {});

  const Utils = {
    $(selector, root = document) {
      return root.querySelector(selector);
    },
    $$(selector, root = document) {
      return Array.from(root.querySelectorAll(selector));
    },
    on(target, event, handler, options) {
      target.addEventListener(event, handler, options);
      return () => target.removeEventListener(event, handler, options);
    },
    uid(prefix = "id") {
      return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    },
    clone(value) {
      return JSON.parse(JSON.stringify(value));
    },
    clamp(value, min, max) {
      return Math.min(max, Math.max(min, Number(value) || 0));
    },
    lerp(a, b, t) {
      return a + (b - a) * t;
    },
    parseJSON(text, fallback = {}) {
      try {
        return typeof text === "string" ? JSON.parse(text) : text;
      } catch {
        return fallback;
      }
    },
    formatTime(seconds) {
      seconds = Math.max(0, Number(seconds) || 0);
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const f = Math.floor((seconds - Math.floor(seconds)) * 100);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(f).padStart(2, "0")}`;
    },
    secondsFromX(x, zoom) {
      return Math.max(0, x / zoom);
    },
    xFromSeconds(seconds, zoom) {
      return Math.max(0, seconds * zoom);
    },
    toast(message, kind = "info") {
      const node = Utils.$("#toast");
      node.textContent = message;
      node.dataset.kind = kind;
      node.classList.add("show");
      clearTimeout(Utils.toastTimer);
      Utils.toastTimer = setTimeout(() => node.classList.remove("show"), 3200);
    },
    downloadJSON(filename, data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    colorWithAlpha(hex, alpha) {
      if (!hex || !hex.startsWith("#")) return hex || "#ffffff";
      const clean = hex.slice(1);
      const bigint = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    pointDistance(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    },
    rectContains(rect, point) {
      return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
    },
    safeName(name) {
      return String(name || "item").replace(/[^\w.-]+/g, "_");
    },
  };

  Editor.Utils = Utils;
})();
