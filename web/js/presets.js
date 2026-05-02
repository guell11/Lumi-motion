(function () {
  const Editor = (window.Editor = window.Editor || {});

  const key = (time, value, ease = "easeOut") => ({ time, value, ease });

  const general = [
    { name: "Fade", icon: "◎", properties: { opacity: [key(0, 0), key(0.8, 1)] } },
    { name: "Flash", icon: "✦", properties: { opacity: [key(0, 1), key(0.08, 0.05), key(0.18, 1), key(0.32, 0.2), key(0.55, 1)] } },
    { name: "Glow", icon: "▣", effects: { glow: 24 }, properties: { opacity: [key(0, 0.1), key(0.6, 1)] } },
    { name: "Zoom", icon: "□", properties: { scale: [key(0, 0.45, "back"), key(0.8, 1, "elastic")] } },
    { name: "Shake", icon: "↔", properties: { x: [key(0, -18), key(0.08, 18), key(0.16, -14), key(0.24, 14), key(0.34, 0)] } },
    { name: "Rotate", icon: "↻", properties: { rotation: [key(0, -180), key(0.9, 0, "back")] } },
    { name: "Elevação", icon: "▰↑", properties: { y: [key(0, 120), key(0.8, 0, "easeOut")], opacity: [key(0, 0), key(0.5, 1)] } },
    { name: "Panorama", icon: "▰→", properties: { x: [key(0, -220), key(1.0, 0, "easeOut")], opacity: [key(0, 0), key(0.35, 1)] } },
    { name: "Surgir", icon: "▌", properties: { scaleX: [key(0, 0.05), key(0.6, 1)], opacity: [key(0, 0), key(0.25, 1)] } },
    { name: "Quicar", icon: "▣", properties: { y: [key(0, -140), key(0.55, 0, "bounce")] } },
    { name: "Correnteza", icon: "≈", properties: { x: [key(0, -100), key(1.2, 0)], rotation: [key(0, -8), key(1.2, 0)] } },
    { name: "Desfoque", icon: "blur", effects: { blur: 16 }, properties: { blur: [key(0, 18), key(0.8, 0)] } },
    { name: "Sequência", icon: "↗", properties: { x: [key(0, -90), key(0.5, 0)], y: [key(0, 80), key(0.5, 0)], opacity: [key(0, 0), key(0.5, 1)] } },
    { name: "Sopro", icon: "◎↗", properties: { scale: [key(0, 0.6), key(0.65, 1)], rotation: [key(0, -12), key(0.65, 0)] } },
    { name: "De baixo", icon: "▰", properties: { y: [key(0, 260), key(0.8, 0)], opacity: [key(0, 0), key(0.4, 1)] } },
    { name: "Deriva", icon: "→", properties: { x: [key(0, -80), key(1.4, 0, "easeInOut")], opacity: [key(0, 0.2), key(1.4, 1)] } },
    { name: "Skate", icon: "▰", properties: { x: [key(0, -260), key(0.9, 0, "back")], rotation: [key(0, -18), key(0.9, 0)] } },
    { name: "Cambalhota", icon: "⟳", properties: { x: [key(0, -260), key(1.1, 0)], rotation: [key(0, -360), key(1.1, 0, "easeOut")] } },
    { name: "Neon", icon: "▣", effects: { glow: 35, brightness: 1.2 }, properties: { opacity: [key(0, 0), key(0.16, 1), key(0.28, 0.35), key(0.45, 1)] } },
    { name: "Recorte", icon: "◧", properties: { clip: [key(0, 0), key(0.8, 1)] } },
    { name: "Pisada", icon: "▣", properties: { scale: [key(0, 1.4), key(0.35, 0.92), key(0.6, 1, "bounce")] } },
    { name: "Piscar", icon: "◐", properties: { opacity: [key(0, 0), key(0.08, 1), key(0.16, 0), key(0.26, 1), key(0.36, 0), key(0.5, 1)] } },
    { name: "Pulsar", icon: "◎", properties: { scale: [key(0, 1), key(0.25, 1.14), key(0.5, 1), key(0.75, 1.08), key(1, 1)] } },
    { name: "Sacudir", icon: "●", properties: { rotation: [key(0, -6), key(0.1, 6), key(0.2, -5), key(0.3, 5), key(0.42, 0)] } },
    { name: "Glitch", icon: "GL", effects: { glitch: 1 }, properties: { x: [key(0, -8), key(0.05, 7), key(0.1, -5), key(0.16, 0)], opacity: [key(0, 0.2), key(0.04, 1), key(0.08, 0.5), key(0.16, 1)] } },
    { name: "Tremor", icon: "≋", properties: { x: [key(0, -6), key(0.04, 6), key(0.08, -5), key(0.12, 5), key(0.18, 0)], y: [key(0, 3), key(0.04, -4), key(0.08, 5), key(0.12, -3), key(0.18, 0)] } },
  ];

  const text = [
    { name: "Teclado", icon: "ABC|", textMode: "typewriter", duration: 1.4 },
    { name: "Maquina de escrever", icon: "A|", textMode: "typewriter", duration: 1.7 },
    { name: "Letra por letra", icon: "A B C", textMode: "charFade", duration: 1.3 },
    { name: "Aparecer por letra", icon: "ABC", textMode: "charRise", duration: 1.2 },
    { name: "Sumir por letra", icon: "CBA", textMode: "charOut", duration: 1.2 },
    { name: "Pular letras", icon: "AᴮC", textMode: "charBounce", duration: 1.5 },
    { name: "Girar letras", icon: "A↻C", textMode: "charRotate", duration: 1.5 },
    { name: "Tremer letras", icon: "A≋C", textMode: "charShake", duration: 1.0 },
    { name: "Explodir letras", icon: "AB✦", textMode: "charExplode", duration: 1.3 },
    { name: "Letras embaralhadas", icon: "A?C", textMode: "scramble", duration: 1.4 },
    { name: "Palavra por palavra", icon: "ABC ABC", textMode: "wordFade", duration: 1.2 },
    { name: "Subir palavra", icon: "ABC↑", textMode: "wordRise", duration: 1.2 },
    { name: "Cair palavra", icon: "ABC↓", textMode: "wordFall", duration: 1.2 },
    { name: "Zoom por palavra", icon: "ABC+", textMode: "wordZoom", duration: 1.2 },
    { name: "Fade por palavra", icon: "ABC", textMode: "wordFade", duration: 1.2 },
    { name: "Reacao em sequencia", icon: "A→B→C", textMode: "sequence", duration: 1.5 },
    { name: "Bloco", icon: "▣ABC", textMode: "block", duration: 0.8 },
    { name: "Mesclar", icon: "ABC↔", textMode: "merge", duration: 1.0 },
    { name: "Desembaracar", icon: "ABC", textMode: "scramble", duration: 1.3 },
    { name: "Rolagem", icon: "ABC↑", textMode: "roll", duration: 1.4 },
    { name: "Neon texto", icon: "ABC", textMode: "neon", duration: 1.2, effects: { glow: 35 } },
    { name: "Ondulacao", icon: "A~C", textMode: "wave", duration: 1.8 },
    { name: "Distorcao", icon: "A∿C", textMode: "distort", duration: 1.4 },
    { name: "Texto elastico", icon: "ABC", textMode: "elastic", duration: 1.2 },
    { name: "Texto magnetico", icon: "A↔C", textMode: "magnetic", duration: 1.3 },
    { name: "Texto com bounce", icon: "ABC", textMode: "charBounce", duration: 1.4 },
    { name: "Texto com glitch", icon: "ABC", textMode: "glitch", duration: 1.1, effects: { glitch: 1 } },
    { name: "Texto com blur", icon: "ABC", textMode: "blur", duration: 1.0, properties: { blur: [key(0, 12), key(1, 0)] } },
  ];

  const filters = [
    { name: "4K", values: { sharpness: 0.8, contrast: 1.08, saturation: 1.05 } },
    { name: "8K", values: { sharpness: 1, contrast: 1.12, saturation: 1.08 } },
    { name: "Duna 1", values: { temperature: 16, saturation: 0.82, contrast: 1.12 } },
    { name: "Cor forte", values: { saturation: 1.45, contrast: 1.12 } },
    { name: "Alto contraste", values: { contrast: 1.6, saturation: 0.85 } },
    { name: "Anime P&B", values: { saturation: 0, contrast: 1.35, brightness: 1.05 } },
    { name: "HD Dark", values: { brightness: 0.82, contrast: 1.25 } },
    { name: "Bokeh", values: { blur: 2, brightness: 1.08 } },
    { name: "Prisma duplo", values: { chroma: 4, contrast: 1.1 } },
    { name: "Retrô", values: { saturation: 0.72, temperature: 12, grain: 0.25 } },
    { name: "Fade", values: { brightness: 1.08, contrast: 0.86, saturation: 0.9 } },
  ];

  const transitions = [
    "Luz de artificio", "Deslizante", "Selecao acima", "Varredura recorte", "Grunge rosa", "Ondulacao ardente",
    "Portal de fotons", "Giro de roda", "Vanda quente", "Brilho camera", "Rajada elegante", "Flashback",
    "Giro turbo", "Rolo de filme", "Refrator digital", "Transformar colmeia", "Descolar pilha", "Zoom instantaneo",
    "Album esferico", "Embaralhar cubo", "Erro de aula", "Chuva dinheiro", "Bomba abobora", "Pilha adesivos",
  ].map((name, index) => ({ name, icon: index % 3 === 0 ? "↗" : index % 3 === 1 ? "◧" : "✦" }));

  const effects = [
    "Danca em par", "Efeito tunel", "Entrar riscando", "Batida tremula", "Rolo queimado", "Brilho 360 2",
    "Explosao brilho", "Caos", "Cubo caixas", "Voo de entrada", "Exibicao dinamica", "Foco agitado",
    "Imagem feita", "Deck cintilante", "Movimento pelao", "Paineis ativos", "Fuligem negativa", "Copia tatanea",
    "Clarao solar", "Balanco lofote", "Descoloracao", "Conto fantasma", "Giro duplicacao", "Plano galeria",
    "Sequencia fluida", "Molduras gadas", "Aureola 2", "Corte dinamico", "Tela quebrada", "Borda chamas",
  ].map((name, index) => ({ name, icon: index % 4 === 0 ? "✦" : index % 4 === 1 ? "◉" : index % 4 === 2 ? "▤" : "↯" }));

  general.push(
    { name: "Entrada suave", icon: "in", properties: { opacity: [key(0, 0), key(0.7, 1)], scale: [key(0, 0.92), key(0.7, 1)] } },
    { name: "Saida suave", icon: "out", properties: { opacity: [key(0, 1), key(0.7, 0)], scale: [key(0, 1), key(0.7, 0.92)] } },
    { name: "Slide esquerda", icon: "<-", properties: { x: [key(0, -360), key(0.65, 0)] } },
    { name: "Slide direita", icon: "->", properties: { x: [key(0, 360), key(0.65, 0)] } },
    { name: "Slide cima", icon: "up", properties: { y: [key(0, -260), key(0.65, 0)] } },
    { name: "Slide baixo", icon: "dn", properties: { y: [key(0, 260), key(0.65, 0)] } },
    { name: "Pop rapido", icon: "pop", properties: { scale: [key(0, 0.2), key(0.28, 1.18), key(0.45, 1)] } },
    { name: "Respirar", icon: "↕", properties: { scale: [key(0, 1), key(0.6, 1.06), key(1.2, 1)] } },
    { name: "Flutuar", icon: "~", properties: { y: [key(0, 0), key(0.8, -28), key(1.6, 0)] } },
    { name: "Zoom cinematico", icon: "Z", properties: { scale: [key(0, 1), key(2.2, 1.18, "easeInOut")] } },
    { name: "Flip 3D", icon: "3D", properties: { rotateY: [key(0, -75), key(1, 0, "back")], opacity: [key(0, 0), key(0.25, 1)] } },
    { name: "Giro 3D", icon: "3D", properties: { rotateY: [key(0, -180), key(1.4, 0, "easeOut")], rotateX: [key(0, 18), key(1.4, 0)] } },
    { name: "Dolly texto 3D", icon: "Z3", properties: { z: [key(0, -180), key(1.2, 0, "easeOut")], scale: [key(0, 0.72), key(1.2, 1)] } }
  );

  text.push(
    { name: "Legenda karaoke", icon: "kara", textMode: "wordFade", duration: 1.8 },
    { name: "Titulo cinema", icon: "CIN", textMode: "blur", duration: 1.2, properties: { scale: [key(0, 1.12), key(1.2, 1)] } },
    { name: "Impacto curto", icon: "BAM", textMode: "charBounce", duration: 0.75 },
    { name: "Scanner", icon: "SCAN", textMode: "block", duration: 0.7 },
    { name: "Ondas por letra", icon: "A~B", textMode: "wave", duration: 2.2 },
    { name: "Glitch rapido", icon: "ERR", textMode: "glitch", duration: 0.75, effects: { glitch: 1 } }
  );

  filters.push(
    { name: "Noite azul", values: { brightness: 0.82, contrast: 1.18, saturation: 0.9, temperature: -18 } },
    { name: "Verão quente", values: { brightness: 1.08, contrast: 1.06, saturation: 1.25, temperature: 18 } },
    { name: "Preto e branco", values: { saturation: 0, contrast: 1.18 } },
    { name: "Filme antigo", values: { saturation: 0.7, contrast: 0.92, temperature: 20, grain: 0.35 } },
    { name: "Cyber neon", values: { brightness: 1.05, contrast: 1.25, saturation: 1.55, chroma: 5 } },
    { name: "Clean comercial", values: { brightness: 1.1, contrast: 1.04, saturation: 1.08 } }
  );

  transitions.push(
    ..."Corte seco,Flash branco,Push esquerda,Push direita,Zoom blur,Swipe diagonal,Spin blur,Camera shake,Glitch cut,Luma wipe,Mask reveal,Slide empilhado".split(",").map((name, index) => ({ name, icon: index % 2 ? "↔" : "▣" }))
  );

  effects.push(
    ..."Glow quente,Glow frio,Noise grain,RGB split,Vinheta,Blur radial,Shake camera,Flash hit,Freeze pop,Desfoque movimento,Pixel sort,Scanlines".split(",").map((name, index) => ({ name, icon: index % 3 === 0 ? "✦" : index % 3 === 1 ? "▥" : "↯" }))
  );

  const Presets = {
    general,
    text,
    filters,
    transitions,
    effects,
    byName(name) {
      return [...general, ...text].find((preset) => preset.name === name);
    },
    apply(layer, presetName) {
      const preset = Presets.byName(presetName);
      if (!preset) return layer;
      layer.animations = layer.animations || {};
      const baseTime = layer.start || 0;
      Object.entries(preset.properties || {}).forEach(([property, frames]) => {
        const relative = ["x", "y", "rotation"].includes(property);
        const baseValue = Number(layer.props?.[property] || 0);
        layer.animations[property] = frames.map((frame) => ({
          ...frame,
          time: baseTime + frame.time,
          value: relative ? baseValue + Number(frame.value || 0) : frame.value,
        }));
      });
      if (preset.effects) {
        layer.effects = { ...(layer.effects || {}), ...preset.effects };
      }
      if (preset.textMode) {
        layer.textAnimation = {
          enabled: true,
          inEnabled: true,
          outEnabled: layer.textAnimation?.outEnabled || false,
          mode: preset.textMode,
          inMode: preset.textMode,
          outMode: layer.textAnimation?.outMode || "charOut",
          duration: preset.duration || 1,
          inDuration: preset.duration || 1,
          outDuration: layer.textAnimation?.outDuration || 0.8,
          speed: layer.textAnimation?.speed || 1,
          target: preset.name,
        };
      }
      layer.lastPreset = presetName;
      return layer;
    },
  };

  Editor.Presets = Presets;
})();
