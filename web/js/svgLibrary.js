(function () {
  const Editor = (window.Editor = window.Editor || {});
  const { uid } = Editor.Utils;

  const icon = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${body}</svg>`;
  const ASSETS = [
    { id:"cursor", name:"Cursor", category:"Interface", svg:icon('<path fill="{{primary}}" stroke="{{stroke}}" stroke-width="{{strokeWidth}}" stroke-linejoin="round" d="M25 12v83l20-19 15 35 17-8-16-34h29z"/>') },
    { id:"hand", name:"Mão clicando", category:"Interface", svg:icon('<path fill="{{primary}}" stroke="{{stroke}}" stroke-width="{{strokeWidth}}" stroke-linejoin="round" d="M50 62V23c0-10 16-10 16 0v28-11c0-10 16-10 16 0v13-8c0-9 15-9 15 1v11-5c0-9 14-8 14 1v27c0 24-15 36-39 36H59c-14 0-22-9-28-20L17 72c-5-10 10-18 17-9l16 20z"/>') },
    { id:"play", name:"Play", category:"Mídia", svg:icon('<circle cx="64" cy="64" r="52" fill="{{primary}}"/><path fill="{{secondary}}" d="m53 41 34 23-34 23z"/>') },
    { id:"pause", name:"Pause", category:"Mídia", svg:icon('<rect x="16" y="16" width="96" height="96" rx="48" fill="{{primary}}"/><path fill="{{secondary}}" d="M45 40h14v48H45zm25 0h14v48H70z"/>') },
    { id:"heart", name:"Coração", category:"Social", svg:icon('<path fill="{{primary}}" stroke="{{stroke}}" stroke-width="{{strokeWidth}}" d="M64 109 18 64C-8 35 34 5 64 36 94 5 136 35 110 64z"/>') },
    { id:"star", name:"Estrela", category:"Destaque", svg:icon('<path fill="{{primary}}" stroke="{{stroke}}" stroke-width="{{strokeWidth}}" stroke-linejoin="round" d="m64 9 16 34 38 5-28 26 7 38-33-18-34 18 7-38L10 48l37-5z"/>') },
    { id:"sparkles", name:"Brilhos", category:"Destaque", svg:icon('<path fill="{{primary}}" d="M45 8c2 24 12 34 36 36-24 2-34 12-36 36-2-24-12-34-36-36 24-2 34-12 36-36z"/><path fill="{{secondary}}" d="M93 61c1 16 8 23 24 24-16 1-23 8-24 24-1-16-8-23-24-24 16-1 23-8 24-24zM94 12c1 8 5 12 13 13-8 1-12 5-13 13-1-8-5-12-13-13 8-1 12-5 13-13z"/>') },
    { id:"bolt", name:"Raio", category:"Destaque", svg:icon('<path fill="{{primary}}" stroke="{{stroke}}" stroke-width="{{strokeWidth}}" stroke-linejoin="round" d="M75 7 22 72h37l-7 49 54-69H69z"/>') },
    { id:"check", name:"Check", category:"Interface", svg:icon('<circle cx="64" cy="64" r="52" fill="{{primary}}"/><path fill="none" stroke="{{secondary}}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" d="m36 65 18 18 38-41"/>') },
    { id:"chat", name:"Mensagem", category:"Social", svg:icon('<path fill="{{primary}}" stroke="{{stroke}}" stroke-width="{{strokeWidth}}" d="M15 18h98v73H56l-28 22 6-22H15z"/><circle cx="43" cy="55" r="6" fill="{{secondary}}"/><circle cx="64" cy="55" r="6" fill="{{secondary}}"/><circle cx="85" cy="55" r="6" fill="{{secondary}}"/>') },
    { id:"bell", name:"Sino", category:"Social", svg:icon('<path fill="{{primary}}" d="M20 92h88l-12-17V52c0-19-12-34-32-34S32 33 32 52v23z"/><path fill="{{secondary}}" d="M49 99h30c-2 14-28 14-30 0z"/>') },
    { id:"camera", name:"Câmera", category:"Mídia", svg:icon('<rect x="10" y="30" width="108" height="76" rx="14" fill="{{primary}}"/><path fill="{{secondary}}" d="m47 30 8-14h27l9 14z"/><circle cx="64" cy="68" r="23" fill="none" stroke="{{secondary}}" stroke-width="10"/>') },
    { id:"globe", name:"Globo", category:"Tech", svg:icon('<circle cx="64" cy="64" r="53" fill="none" stroke="{{primary}}" stroke-width="9"/><path fill="none" stroke="{{primary}}" stroke-width="7" d="M12 64h104M64 11c30 27 30 79 0 106M64 11c-30 27-30 79 0 106"/>') },
    { id:"arrow", name:"Seta curva", category:"Setas", svg:icon('<path fill="none" stroke="{{primary}}" stroke-width="12" stroke-linecap="round" d="M18 98c3-54 34-70 83-55"/><path fill="{{primary}}" d="m86 16 30 30-40 13z"/>') },
    { id:"rocket", name:"Foguete", category:"Tech", svg:icon('<path fill="{{primary}}" d="M49 79C27 58 42 33 61 20 78 8 98 7 112 9c2 14 1 34-11 51-13 19-38 34-59 12z"/><circle cx="83" cy="36" r="11" fill="{{secondary}}"/><path fill="{{secondary}}" d="M44 78 24 104l28-11 11-16z"/><path fill="#ff8a4c" d="M32 90c-13 3-21 13-22 28 15-1 25-9 29-22z"/>') },
    { id:"bag", name:"Sacola", category:"Comércio", svg:icon('<path fill="{{primary}}" stroke="{{stroke}}" stroke-width="{{strokeWidth}}" d="M20 43h88l-8 73H28z"/><path fill="none" stroke="{{secondary}}" stroke-width="9" stroke-linecap="round" d="M44 50V33c0-27 40-27 40 0v17"/>') },
  ];

  function sanitizeSvg(source) {
    return String(source || "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
      .replace(/\s(?:href|xlink:href)\s*=\s*(["'])\s*(?:https?:|javascript:).*?\1/gi, "");
  }

  function colorizeSvg(source, props = {}) {
    let svg = sanitizeSvg(source);
    const primary = props.svgPrimary || props.fill || "#8b48ff";
    const secondary = props.svgSecondary || "#ffffff";
    const stroke = props.svgStroke || props.stroke || "#151515";
    const strokeWidth = Number(props.svgStrokeWidth ?? props.strokeWidth ?? 3);
    svg = svg.replaceAll("{{primary}}", primary).replaceAll("{{secondary}}", secondary)
      .replaceAll("{{stroke}}", stroke).replaceAll("{{strokeWidth}}", String(strokeWidth));
    const mode = props.svgColorMode || "original";
    if (mode === "mono") {
      svg = svg.replace(/fill=(['"])(?!none|url\()[^'"]+\1/gi, `fill="${primary}"`)
        .replace(/stroke=(['"])(?!none|url\()[^'"]+\1/gi, `stroke="${primary}"`);
    } else if (mode === "duotone") {
      let fillIndex = 0;
      svg = svg.replace(/fill=(['"])(?!none|url\()[^'"]+\1/gi, () => `fill="${fillIndex++ % 2 ? secondary : primary}"`);
    }
    return svg;
  }

  function dataUrl(svg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function mediaFor(store, asset) {
    const id = `builtin-svg-${asset.id}`;
    let media = store.media(id);
    if (!media) {
      media = { id, name:`${asset.name}.svg`, path:"", type:"svg", mime:"image/svg+xml", size:asset.svg.length, duration:null, builtin:true, svgText:asset.svg };
      media.url = dataUrl(colorizeSvg(asset.svg, { svgColorMode:"original" }));
      store.project.media.push(media);
    }
    return media;
  }

  function add(store, assetId, options = {}) {
    const asset = ASSETS.find((item) => item.id === assetId);
    if (!asset) return null;
    store.beginTransaction("svg:add");
    const media = mediaFor(store, asset);
    const layer = store.addLayer("svg", {
      media, mediaId:media.id, name:asset.name, duration:options.duration || 4,
      start:options.start ?? store.currentTime,
      props:{ width:options.width || 260, height:options.height || 260, svgAssetId:asset.id, svgColorMode:"duotone", svgPrimary:"#8b48ff", svgSecondary:"#ffffff", svgStroke:"#171717", svgStrokeWidth:3, ...(options.props || {}) },
    });
    store.endTransaction("svg:add");
    return layer;
  }

  function autoSmooth(points) {
    const sorted = [...points].sort((a, b) => a.time - b.time);
    sorted.forEach((point, index) => {
      const previous = sorted[Math.max(0, index - 1)];
      const next = sorted[Math.min(sorted.length - 1, index + 1)];
      const tension = .22;
      point.handleIn = { x:-(next.x - previous.x) * tension, y:-(next.y - previous.y) * tension };
      point.handleOut = { x:(next.x - previous.x) * tension, y:(next.y - previous.y) * tension };
      point.ease = "easeInOut";
    });
    return sorted;
  }

  function createSmoothCursor(store) {
    const start = store.currentTime;
    store.beginTransaction("cursor:motion-template");
    const cursor = add(store, "cursor", { start, duration:2.8, width:112, height:132, props:{ x:560, y:760, shadow:16, svgPrimary:"#f4f4f4", svgSecondary:"#ffffff", svgStroke:"#171717", svgStrokeWidth:6 } });
    cursor.motionPath = { type:"autoBezier", points:autoSmooth([
      { time:start, x:560, y:760 },
      { time:start + 1.05, x:1010, y:555 },
      { time:start + 1.9, x:1275, y:390 },
    ]) };
    cursor.animations.scale = [
      { time:start, value:1, ease:"easeInOut" },
      { time:start + 1.9, value:1, ease:"easeInOut" },
      { time:start + 2.04, value:.78, ease:"easeOut" },
      { time:start + 2.22, value:1, ease:"back" },
    ];
    const ripple = store.addLayer("shape", { name:"Clique · onda", start:start + 1.9, duration:.75, props:{ shape:"circle", x:1275, y:390, width:82, height:82, fill:"#8b48ff", opacity:.62, stroke:"#ffffff", strokeWidth:3 } });
    ripple.animations.scale = [{ time:start + 1.9, value:.18, ease:"easeOut" }, { time:start + 2.55, value:2.2, ease:"easeOut" }];
    ripple.animations.opacity = [{ time:start + 1.9, value:.68, ease:"easeOut" }, { time:start + 2.55, value:0, ease:"easeOut" }];
    store.selectedLayerId = cursor.id;
    store.selectedLayerIds = [cursor.id];
    store.endTransaction("cursor:motion-template");
    return cursor;
  }

  Editor.SvgLibrary = { items:ASSETS, sanitizeSvg, colorizeSvg, dataUrl, add, autoSmooth, createSmoothCursor };
})();
