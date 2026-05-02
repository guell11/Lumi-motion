(function () {
  const Editor = (window.Editor = window.Editor || {});
  const { clamp } = Editor.Utils;

  class TextAnimator {
    draw(ctx, layer, props, time) {
      const text = String(props.text || "");
      const animation = this.normalizedAnimation(layer);
      const localTime = Math.max(0, time - layer.start);
      const remaining = Math.max(0, layer.start + layer.duration - time);

      this.setupText(ctx, props);
      if (!animation.enabled) return this.drawPlain(ctx, text, props);

      if (animation.inEnabled && localTime < animation.inDuration) {
        const progress = clamp(localTime / Math.max(0.001, animation.inDuration), 0, 1);
        return this.drawMode(ctx, text, props, progress, animation.inMode, false);
      }

      if (animation.outEnabled && remaining < animation.outDuration) {
        const progress = clamp(1 - remaining / Math.max(0.001, animation.outDuration), 0, 1);
        return this.drawMode(ctx, text, props, progress, animation.outMode, true);
      }

      return this.drawPlain(ctx, text, props);
    }

    normalizedAnimation(layer) {
      const raw = layer.textAnimation || {};
      const speed = clamp(Number(raw.speed ?? 1), 0.1, 8);
      const baseMode = raw.mode || raw.inMode || "plain";
      return {
        enabled: raw.enabled !== false && baseMode !== "plain",
        inEnabled: raw.inEnabled !== false,
        outEnabled: Boolean(raw.outEnabled),
        inMode: raw.inMode || raw.mode || "typewriter",
        outMode: raw.outMode || "charOut",
        inDuration: Math.max(0.05, Number(raw.inDuration ?? raw.duration ?? 1) / speed),
        outDuration: Math.max(0.05, Number(raw.outDuration ?? raw.duration ?? 1) / speed),
      };
    }

    drawMode(ctx, text, props, progress, mode, exiting) {
      const actualProgress = exiting && !["charOut"].includes(mode) ? 1 - progress : progress;
      if (mode === "plain" || mode === "none") return this.drawPlain(ctx, text, props);
      if (mode === "typewriter") return this.drawTypewriter(ctx, text, props, actualProgress);
      if (mode.startsWith("word") || mode === "sequence") return this.drawWords(ctx, text, props, actualProgress, mode);
      if (mode === "block") return this.drawBlock(ctx, text, props, actualProgress);
      if (mode === "merge") return this.drawMerge(ctx, text, props, actualProgress);
      if (mode === "roll") return this.drawRoll(ctx, text, props, actualProgress);
      if (mode === "neon") return this.drawNeon(ctx, text, props, actualProgress);
      if (mode === "wave") return this.drawChars(ctx, text, props, actualProgress, "wave");
      if (mode === "distort") return this.drawChars(ctx, text, props, actualProgress, "distort");
      if (mode === "elastic") return this.drawChars(ctx, text, props, actualProgress, "elastic");
      if (mode === "magnetic") return this.drawChars(ctx, text, props, actualProgress, "magnetic");
      if (mode === "glitch") return this.drawGlitch(ctx, text, props, actualProgress);
      if (mode === "blur") return this.drawBlur(ctx, text, props, actualProgress);
      if (mode === "scramble") return this.drawScramble(ctx, text, props, actualProgress);
      if (mode.startsWith("char")) return this.drawChars(ctx, text, props, actualProgress, mode);
      return this.drawPlain(ctx, text, props);
    }

    setupText(ctx, props) {
      ctx.font = `${props.fontWeight || 700} ${props.fontSize || 72}px ${props.fontFamily || "Segoe UI"}`;
      ctx.textAlign = props.align || "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.fillStyle = props.fill || "#fff";
      ctx.strokeStyle = props.stroke || "#000";
      ctx.lineWidth = props.strokeWidth || 0;
      ctx.shadowBlur = props.shadow || 0;
      ctx.shadowColor = props.shadowColor || "#000";
    }

    drawPlain(ctx, text, props) {
      this.paintText(ctx, text, 0, 0, props);
    }

    drawTypewriter(ctx, text, props, progress) {
      const visible = text.slice(0, Math.ceil(text.length * progress));
      this.paintText(ctx, visible, 0, 0, props);
      if (progress < 1) {
        const width = this.measure(ctx, visible, props.letterSpacing || 0);
        ctx.fillRect(width / 2 + 8, -props.fontSize / 2, 3, props.fontSize);
      }
    }

    drawChars(ctx, text, props, progress, mode) {
      const chars = Array.from(text);
      const total = this.measure(ctx, text, props.letterSpacing || 0);
      let x = -total / 2;
      chars.forEach((char, index) => {
        const width = ctx.measureText(char).width + (props.letterSpacing || 0);
        const local = clamp((progress * chars.length - index) / 1.4, 0, 1);
        let y = 0;
        let alpha = local;
        let rotate = 0;
        let scale = 1;
        if (mode === "charRise") y = (1 - Editor.Easing.easeOut(local)) * 55;
        if (mode === "charOut") alpha = 1 - local;
        if (mode === "charBounce") y = -Math.sin(local * Math.PI) * 36;
        if (mode === "charRotate") rotate = (1 - local) * -Math.PI;
        if (mode === "charShake") {
          y = Math.sin((index + progress * 20) * 2.5) * (1 - local) * 18;
          rotate = Math.sin(index * 3 + progress * 18) * 0.08;
        }
        if (mode === "charExplode") {
          const angle = index * 1.7;
          x += Math.cos(angle) * (1 - local) * 45;
          y += Math.sin(angle) * (1 - local) * 45;
          rotate = (1 - local) * angle;
        }
        if (mode === "wave") y = Math.sin(index * 0.8 + progress * Math.PI * 4) * 22;
        if (mode === "distort") scale = 1 + Math.sin(index + progress * 10) * 0.12;
        if (mode === "elastic") scale = 1 + Math.sin(local * Math.PI) * 0.25;
        if (mode === "magnetic") {
          y = (index % 2 ? -1 : 1) * (1 - local) * 34;
          scale = 0.65 + local * 0.35;
        }
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.translate(x + width / 2, y);
        ctx.rotate(rotate);
        ctx.scale(scale, scale);
        this.paintText(ctx, char, 0, 0, props);
        ctx.restore();
        x += width;
      });
    }

    drawWords(ctx, text, props, progress, mode) {
      const words = text.split(/(\s+)/);
      const total = this.measure(ctx, text, props.letterSpacing || 0);
      let x = -total / 2;
      words.forEach((word, index) => {
        const width = this.measure(ctx, word, props.letterSpacing || 0);
        const visibleIndex = Math.floor(index / 2);
        const local = clamp((progress * Math.ceil(words.length / 2) - visibleIndex) / 1.1, 0, 1);
        let y = 0;
        let scale = 1;
        let alpha = local;
        if (!word.trim()) alpha = 1;
        if (mode === "wordRise") y = (1 - local) * 60;
        if (mode === "wordFall") y = -(1 - local) * 60;
        if (mode === "wordZoom") scale = 0.35 + local * 0.65;
        if (mode === "sequence") y = Math.sin(local * Math.PI) * -22;
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.translate(x + width / 2, y);
        ctx.scale(scale, scale);
        this.paintText(ctx, word, 0, 0, props);
        ctx.restore();
        x += width;
      });
    }

    drawBlock(ctx, text, props, progress) {
      const width = this.measure(ctx, text, props.letterSpacing || 0) + 34;
      const height = props.fontSize * 1.3;
      ctx.save();
      ctx.globalAlpha *= progress;
      ctx.fillStyle = props.stroke || "#8b48ff";
      ctx.fillRect(-width / 2, -height / 2, width * progress, height);
      ctx.restore();
      this.paintText(ctx, text, 0, 0, props);
    }

    drawMerge(ctx, text, props, progress) {
      const offset = (1 - progress) * 120;
      ctx.save();
      ctx.globalAlpha *= progress;
      this.paintText(ctx, text, -offset, 0, props);
      this.paintText(ctx, text, offset, 0, props);
      ctx.restore();
    }

    drawRoll(ctx, text, props, progress) {
      ctx.save();
      ctx.translate(0, (1 - progress) * props.fontSize);
      ctx.rotate((1 - progress) * -0.35);
      ctx.globalAlpha *= progress;
      this.paintText(ctx, text, 0, 0, props);
      ctx.restore();
    }

    drawNeon(ctx, text, props, progress) {
      ctx.save();
      ctx.shadowBlur = 18 + progress * 28;
      ctx.shadowColor = props.fill || "#8b48ff";
      ctx.globalAlpha *= Math.max(0.2, progress);
      this.paintText(ctx, text, 0, 0, props);
      ctx.restore();
    }

    drawGlitch(ctx, text, props, progress) {
      const jitter = (1 - progress * 0.4) * 8;
      ctx.save();
      ctx.fillStyle = "#00f0ff";
      this.paintText(ctx, text, -jitter, 0, { ...props, strokeWidth: 0 });
      ctx.fillStyle = "#ff2b90";
      this.paintText(ctx, text, jitter, 0, { ...props, strokeWidth: 0 });
      ctx.fillStyle = props.fill;
      this.paintText(ctx, text, 0, Math.sin(progress * 40) * 4, props);
      ctx.restore();
    }

    drawBlur(ctx, text, props, progress) {
      ctx.save();
      ctx.filter = `blur(${(1 - progress) * 16}px)`;
      ctx.globalAlpha *= progress;
      this.paintText(ctx, text, 0, 0, props);
      ctx.restore();
    }

    drawScramble(ctx, text, props, progress) {
      const chars = "!<>-_\\/[]{}—=+*^?#________";
      const shown = Array.from(text)
        .map((char, index) => {
          if (char === " ") return " ";
          const local = clamp(progress * text.length - index, 0, 1);
          if (local >= 1) return char;
          const pick = Math.floor((index * 17 + progress * 90) % chars.length);
          return chars[pick];
        })
        .join("");
      this.paintText(ctx, shown, 0, 0, props);
    }

    paintText(ctx, text, x, y, props) {
      if (props.strokeWidth > 0) ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }

    measure(ctx, text, letterSpacing = 0) {
      return Array.from(text).reduce((sum, char) => sum + ctx.measureText(char).width + letterSpacing, 0);
    }
  }

  Editor.TextAnimator = TextAnimator;
})();
