(function () {
  const Editor = (window.Editor = window.Editor || {});

  class ThreeText3D {
    constructor(store) {
      this.store = store;
      this.THREE = null;
      this.ready = false;
      this.canvas = document.createElement("canvas");
      this.canvas.width = 1024;
      this.canvas.height = 512;
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this.group = null;
      this.textureCache = new Map();
      const scriptSrc = document.querySelector('script[src$="threeText3D.js"]')?.src || "";
      const base = scriptSrc || window.location.href;
      const moduleUrl = scriptSrc ? new URL("../vendor/three.module.js", base).href : new URL("vendor/three.module.js", window.location.href).href;
      import(moduleUrl)
        .then((mod) => {
          this.THREE = mod;
          this.init();
          this.ready = true;
        })
        .catch((error) => {
          console.warn("Three.js nao carregou", error);
        });
    }

    init() {
      const THREE = this.THREE;
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
      this.renderer.setClearColor(0x000000, 0);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, 2, 0.1, 5000);
      this.group = new THREE.Group();
      this.scene.add(this.group);
      this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      this.key = new THREE.DirectionalLight(0xffffff, 1.15);
      this.scene.add(this.key);
      this.rim = new THREE.DirectionalLight(0x7fdfff, 0.65);
      this.rim.position.set(220, 180, 360);
      this.scene.add(this.rim);
    }

    draw(ctx, layer, props, time, cameraProps) {
      if (!this.ready || !this.renderer) {
        this.placeholder(ctx, props);
        return;
      }
      const width = Math.max(256, Math.round(props.width));
      const height = Math.max(128, Math.round(props.height));
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
      }

      this.buildLayer(layer, props, width, height);
      this.applyCamera(props, cameraProps, width, height);
      this.renderer.render(this.scene, this.camera);
      ctx.drawImage(this.canvas, -props.width / 2, -props.height / 2, props.width, props.height);
    }

    buildLayer(layer, props, width, height) {
      const THREE = this.THREE;
      this.group.clear();
      const textCanvas = this.textTextureCanvas(layer, props, width, height);
      const texture = new THREE.CanvasTexture(textCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const depth = Number(props.depth || 72);
      const steps = Math.max(6, Math.min(28, Math.round(depth / 5)));
      const front = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: props.opacity ?? 1 });
      const side = new THREE.MeshStandardMaterial({
        color: new THREE.Color(props.stroke || props.fill || "#8b48ff"),
        metalness: Number(props.metalness ?? 0.35),
        roughness: Number(props.roughness ?? 0.38),
        transparent: true,
        opacity: Math.max(0.18, props.opacity ?? 1),
      });
      const plane = new THREE.PlaneGeometry(width, height);
      for (let i = steps; i >= 0; i -= 1) {
        const material = i === 0 ? front : side;
        const mesh = new THREE.Mesh(plane, material);
        mesh.position.z = -i * (depth / steps);
        mesh.position.x = i * Number(props.bevel || 0.18) * 2.2;
        mesh.position.y = -i * Number(props.bevel || 0.18) * 2.2;
        this.group.add(mesh);
      }
      this.group.rotation.x = ((props.rotateX || 0) * Math.PI) / 180;
      this.group.rotation.y = ((props.rotateY || 0) * Math.PI) / 180;
      this.group.rotation.z = ((props.rotation || 0) * Math.PI) / 180;
      const scale = Number(props.scale || 1);
      this.group.scale.set(scale, scale, scale);
      this.key.position.set(Number(props.lightX || -180), Number(props.lightY || -260), Number(props.lightZ || 520));
    }

    applyCamera(props, cameraProps, width, height) {
      const zoom = Number(cameraProps.zoom || 1);
      this.camera.fov = Number(cameraProps.fov || 45);
      this.camera.position.set(
        Number(cameraProps.x || 0) * 0.35,
        -Number(cameraProps.y || 0) * 0.35,
        Math.max(120, Number(cameraProps.z || 900) / zoom)
      );
      this.camera.rotation.set(
        ((cameraProps.tiltX || 0) * Math.PI) / 180,
        ((cameraProps.tiltY || 0) * Math.PI) / 180,
        ((cameraProps.rotation || 0) * Math.PI) / 180
      );
      this.camera.lookAt(0, 0, 0);
      this.camera.updateProjectionMatrix();
      this.group.position.set(0, 0, 0);
    }

    textTextureCanvas(layer, props, width, height) {
      const key = [
        props.text,
        props.fontFamily,
        props.fontSize,
        props.fontWeight,
        props.fill,
        props.stroke,
        props.strokeWidth,
        props.shadow,
        width,
        height,
      ].join("|");
      if (this.textureCache.has(key)) return this.textureCache.get(key);
      if (this.textureCache.size > 24) this.textureCache.clear();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, width, height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const fontSize = Math.min(Number(props.fontSize || 96), height * 0.74);
      ctx.font = `${props.fontWeight || 800} ${fontSize}px ${props.fontFamily || "Segoe UI"}`;
      ctx.lineJoin = "round";
      ctx.shadowBlur = Number(props.shadow || 0);
      ctx.shadowColor = props.shadowColor || "#000";
      ctx.fillStyle = props.fill || "#ffffff";
      ctx.strokeStyle = props.stroke || "#000000";
      ctx.lineWidth = Number(props.strokeWidth || 0);
      const text = String(props.text || "Texto 3D");
      if (ctx.lineWidth > 0) ctx.strokeText(text, width / 2, height / 2);
      ctx.fillText(text, width / 2, height / 2);
      this.textureCache.set(key, canvas);
      return canvas;
    }

    placeholder(ctx, props) {
      ctx.save();
      ctx.fillStyle = "rgba(139,72,255,.22)";
      ctx.strokeStyle = "#8b48ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(-props.width / 2, -props.height / 2, props.width, props.height);
      ctx.font = "700 38px Segoe UI";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(props.text || "Texto 3D", 0, 0);
      ctx.restore();
    }
  }

  Editor.ThreeText3D = ThreeText3D;
})();
