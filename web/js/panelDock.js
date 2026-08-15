(function () {
  const Editor = (window.Editor = window.Editor || {});

  class PanelDockManager {
    constructor(app) {
      this.app = app;
      this.detached = new Map();
      this.dragStart = null;
      this.config = {
        preview:{ selector:".preview-area", title:"Lumi · Player", width:1040, height:700 },
        timeline:{ selector:".timeline-section", title:"Lumi · Timeline", width:1320, height:520 },
        inspector:{ selector:".right-panel", title:"Lumi · Inspetor", width:430, height:820 },
      };
      this.bind();
    }

    bind() {
      document.querySelectorAll("[data-panel-popout]").forEach((button) => {
        button.addEventListener("click", () => this.detach(button.dataset.panelPopout));
      });
      document.querySelectorAll("[data-panel-drag]").forEach((handle) => {
        handle.addEventListener("dragstart", (event) => {
          this.dragStart = { type:handle.dataset.panelDrag, x:event.screenX, y:event.screenY };
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", `lumi-panel:${handle.dataset.panelDrag}`);
          handle.classList.add("dragging-panel");
        });
        handle.addEventListener("dragend", (event) => {
          handle.classList.remove("dragging-panel");
          const start = this.dragStart;
          this.dragStart = null;
          if (!start || start.type !== handle.dataset.panelDrag) return;
          if (Math.hypot(event.screenX - start.x, event.screenY - start.y) < 70) return;
          this.detach(start.type, { x:event.screenX, y:event.screenY });
        });
      });
    }

    detach(type, position = {}) {
      const config = this.config[type];
      if (!config) return;
      const existing = this.detached.get(type);
      if (existing && !existing.popup.closed) {
        existing.popup.focus();
        return;
      }
      const node = document.querySelector(config.selector);
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const left = Number.isFinite(position.x) && position.x > 0 ? Math.round(position.x - 60) : Math.round(window.screenX + 90);
      const top = Number.isFinite(position.y) && position.y > 0 ? Math.round(position.y - 35) : Math.round(window.screenY + 70);
      const width = Math.max(340, Math.round(rect.width || config.width));
      const height = Math.max(260, Math.round(rect.height || config.height));
      const features = `popup=yes,width=${Math.max(width, config.width)},height=${Math.max(height, config.height)},left=${left},top=${top}`;
      const popup = window.open("about:blank", `lumi-${type}`, features);
      if (!popup) {
        Editor.Utils.toast("O sistema bloqueou a janela destacável.", "error");
        return;
      }

      const placeholder = document.createElement("div");
      placeholder.className = `panel-detached-placeholder ${type}-placeholder`;
      placeholder.innerHTML = `<strong>${config.title.replace("Lumi · ", "")}</strong><span>Aberto em outra janela</span><button type="button">Trazer de volta</button>`;
      placeholder.querySelector("button").addEventListener("click", () => this.attach(type));
      node.parentNode.insertBefore(placeholder, node);

      let adopted;
      try {
        popup.document.open();
        popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${config.title}</title><link rel="stylesheet" href="${new URL("./styles.css", location.href).href}"></head><body class="detached-panel-body detached-${type}"><main id="detachedHost"></main><button id="dockBackBtn" class="dock-back-button" type="button" title="Voltar ao editor">↙ Acoplar</button></body></html>`);
        popup.document.close();
        Editor.Utils.registerPanelDocument(popup.document);
        adopted = popup.document.adoptNode(node);
        adopted.classList.add("is-detached");
        popup.document.querySelector("#detachedHost").appendChild(adopted);
        popup.document.querySelector("#dockBackBtn").addEventListener("click", () => this.attach(type));
      } catch (error) {
        try { Editor.Utils.unregisterPanelDocument(popup.document); } catch {}
        placeholder.remove();
        popup.close();
        Editor.Utils.toast(`Não foi possível destacar o painel: ${error.message}`, "error");
        return;
      }

      const record = { popup, node:adopted, placeholder, poll:null, attaching:false };
      record.poll = window.setInterval(() => {
        if (popup.closed) this.attach(type, false);
      }, 450);
      this.detached.set(type, record);
      popup.addEventListener("beforeunload", () => this.attach(type, false), { once:true });
      popup.addEventListener("resize", () => this.refresh(type));
      popup.focus();
      this.refresh(type);
      Editor.Utils.toast(`${config.title.replace("Lumi · ", "")} destacado. Arraste a janela para outro monitor.`);
    }

    attach(type, closePopup = true) {
      const record = this.detached.get(type);
      if (!record || record.attaching) return;
      record.attaching = true;
      window.clearInterval(record.poll);
      const node = document.adoptNode(record.node);
      try { Editor.Utils.unregisterPanelDocument(record.popup.document); } catch {}
      node.classList.remove("is-detached");
      if (record.placeholder.isConnected) {
        record.placeholder.parentNode.insertBefore(node, record.placeholder);
        record.placeholder.remove();
      }
      this.detached.delete(type);
      if (closePopup && !record.popup.closed) record.popup.close();
      this.refresh(type);
      Editor.Utils.toast(`${this.config[type].title.replace("Lumi · ", "")} acoplado novamente.`);
    }

    refresh(type) {
      requestAnimationFrame(() => {
        if (type === "preview") this.app.canvas.resize();
        if (type === "timeline") this.app.timeline.render();
        if (type === "inspector") {
          this.app.properties.render();
          this.app.graph.render();
        }
      });
    }
  }

  Editor.PanelDockManager = PanelDockManager;
})();
