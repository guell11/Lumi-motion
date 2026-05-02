(function () {
  const Editor = (window.Editor = window.Editor || {});
  const { parseJSON, toast } = Editor.Utils;

  class BridgeClient {
    constructor() {
      this.bridge = null;
      this.ready = this.init();
    }

    init() {
      return new Promise((resolve) => {
        if (window.qt && window.QWebChannel) {
          new QWebChannel(window.qt.webChannelTransport, (channel) => {
            this.bridge = channel.objects.pyBridge;
            if (this.bridge.notify) {
              this.bridge.notify.connect((payload) => toast(payload));
            }
            if (this.bridge.exportProgress) {
              this.bridge.exportProgress.connect((payload) => {
                document.dispatchEvent(new CustomEvent("lumi:export-progress", { detail: parseJSON(payload, {}) }));
              });
            }
            resolve(this.bridge);
          });
          return;
        }
        this.bridge = this.localFallback();
        resolve(this.bridge);
      });
    }

    async call(method, ...args) {
      await this.ready;
      return new Promise((resolve) => {
        const fn = this.bridge && this.bridge[method];
        if (!fn) {
          resolve({ ok: false, error: `Metodo indisponivel: ${method}` });
          return;
        }
        try {
          fn.apply(this.bridge, [...args, (result) => resolve(parseJSON(result, result))]);
        } catch (error) {
          resolve({ ok: false, error: error.message });
        }
      });
    }

    localFallback() {
      return {
        getAppInfo(callback) {
          callback(JSON.stringify({ ok: true, ffmpeg: false, root: "browser" }));
        },
        openMediaDialog(callback) {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = "video/*,audio/*,image/*,.svg,.ttf,.otf";
          input.onchange = () => {
            const media = Array.from(input.files || []).map((file) => {
              const type = file.type.startsWith("video/")
                ? "video"
                : file.type.startsWith("audio/")
                  ? "audio"
                  : file.name.toLowerCase().endsWith(".svg")
                    ? "svg"
                    : file.type.startsWith("image/")
                      ? "image"
                      : "file";
              return {
                id: Editor.Utils.uid("media"),
                name: file.name,
                path: "",
                url: URL.createObjectURL(file),
                type,
                mime: file.type,
                size: file.size,
                duration: null,
              };
            });
            callback(JSON.stringify({ ok: true, media }));
          };
          input.click();
        },
        saveProject(projectJson, path, callback) {
          localStorage.setItem("lumi-project", projectJson);
          callback(JSON.stringify({ ok: true, path: path || "localStorage" }));
        },
        autosaveProject(projectJson, path, callback) {
          localStorage.setItem("lumi-autosave", projectJson);
          callback(JSON.stringify({ ok: true, path: path || "localStorage" }));
        },
        openProjectDialog(callback) {
          const saved = localStorage.getItem("lumi-project");
          callback(saved ? JSON.stringify({ ok: true, project: JSON.parse(saved), path: "localStorage" }) : JSON.stringify({ ok: false, error: "Nenhum projeto salvo." }));
        },
        listRecentProjects(callback) {
          const saved = localStorage.getItem("lumi-project");
          callback(JSON.stringify({ ok: true, projects: saved ? [{ name: "Projeto local", path: "localStorage", modified: new Date().toISOString(), size: saved.length }] : [] }));
        },
        openProjectPath(path, callback) {
          const saved = localStorage.getItem("lumi-project");
          callback(saved ? JSON.stringify({ ok: true, project: JSON.parse(saved), path }) : JSON.stringify({ ok: false, error: "Nenhum projeto salvo." }));
        },
        chooseExportPath(options, callback) {
          callback(JSON.stringify({ ok: true, path: "" }));
        },
        beginFrameExport(options, callback) {
          callback(JSON.stringify({ ok: false, error: "Exportacao FFmpeg so funciona no app PyQt6." }));
        },
        saveExportFrame(session, index, data, callback) {
          callback(JSON.stringify({ ok: true }));
        },
        finishFrameExport(session, project, options, callback) {
          callback(JSON.stringify({ ok: false, error: "Exportacao FFmpeg so funciona no app PyQt6." }));
        },
        quickProxyExport(project, options, callback) {
          callback(JSON.stringify({ ok: false, error: "Exportacao FFmpeg so funciona no app PyQt6." }));
        },
        separateAudio(path, callback) {
          callback(JSON.stringify({ ok: false, error: "Separar audio precisa do backend Python/FFmpeg." }));
        },
        videoFrame(path, time, callback) {
          callback(JSON.stringify({ ok: false, error: "Preview por FFmpeg precisa do app PyQt6." }));
        },
        previewAudio(path, callback) {
          callback(JSON.stringify({ ok: false, error: "Audio de preview precisa do app PyQt6." }));
        },
      };
    }
  }

  Editor.Bridge = new BridgeClient();
})();
