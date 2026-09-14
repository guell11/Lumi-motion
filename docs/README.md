# Documentação técnica do Lumi Motion

Este diretório descreve o estado atual da implementação. Ele é voltado a tech leads, mantenedores e desenvolvedores que precisam modificar o editor sem depender de conhecimento tribal.

## Ordem de leitura recomendada

1. [Arquitetura e fluxo de dados](ARCHITECTURE.md): limites dos subsistemas e inicialização.
2. [Formato do projeto](PROJECT_FORMAT.md): contrato persistido em `.lumi.json`.
3. [Estado e comandos](STATE_AND_COMMANDS.md): mutações, eventos, transações e Undo.
4. [Timeline](TIMELINE.md): tracks, clips, trim, snapping e seleção.
5. [Renderização e animação](RENDERING_AND_ANIMATION.md): Canvas 2D, Three.js, keyframes e playback.
6. [Mídia, SVG, cor e áudio](MEDIA_SVG_AUDIO.md): importação e pipelines de propriedades.
7. [Templates e presets](TEMPLATES_AND_PRESETS.md): catálogo e criação de packs.
8. [Exportação](EXPORT_PIPELINE.md): sequência de frames e FFmpeg.
9. [PyQt e painéis](PYQT_AND_PANELS.md): bridge nativa, drop e múltiplos monitores.
10. [Performance](PERFORMANCE.md): hotspots, decisões e diagnóstico.
11. [Testes](TESTING.md): checks atuais e estratégia recomendada.
12. [Contribuição](CONTRIBUTING.md): recipes para estender o editor.

## Mapa de responsabilidades

| Área | Fonte de verdade | Entrada principal |
| --- | --- | --- |
| Aplicação desktop | `editor/main_window.py` | `app.py` |
| API nativa | `editor/bridge.py` | objeto `bridge` no QWebChannel |
| Projeto persistido | `editor/project.py` | `.lumi.json` |
| Estado em runtime | `web/js/state.js` | `Editor.Store` |
| Orquestração da UI | `web/js/app.js` | `Editor.App` |
| Preview | `web/js/canvas.js` | `CanvasController` |
| Animação | `animationEngine.js` | `AnimationEngine` |
| Timeline | `web/js/timeline.js` | `TimelineController` |
| Inspetor | `web/js/properties.js` | `PropertiesPanel` |
| Mídia e catálogo | `web/js/mediaLibrary.js` | `MediaLibrary` |
| SVGs | `web/js/svgLibrary.js` | `Editor.SvgLibrary` |
| Templates | `web/js/templates.js` | `Templates` |
| Áudio de preview | `web/js/audioEngine.js` | `AudioEngine` |
| Exportação web | `web/js/exporter.js` | `ExportController` |
| FFmpeg | `editor/exporter.py` | `FFmpegExporter` |
| Janelas destacadas | `web/js/panelDock.js` | `PanelDockManager` |

## Regras que preservam a arquitetura

- Toda mudança persistente passa pelo `Store`; DOM não é fonte de verdade.
- Use transações para operações que alteram várias camadas.
- Eventos live não devem criar checkpoints nem reconstruir painéis inteiros.
- JS nunca acessa filesystem diretamente; use `Editor.Bridge`.
- Python não conhece detalhes de DOM; recebe e devolve JSON.
- Preview e exportação devem interpretar o mesmo modelo de camada.
- Novos tipos precisam de track, defaults, renderer, propriedades e export parity.
- Scripts novos precisam ser carregados antes de `app.js` em `web/index.html`.

## Vocabulário

- **Mídia:** arquivo importado, armazenado em `project.media`.
- **Camada/clip:** instância editável em `project.layers`; pode referenciar uma mídia.
- **Track/pista:** faixa visual/semântica da timeline.
- **Property:** valor base de uma camada em `layer.props`.
- **Keyframe:** valor de uma property em um instante.
- **Reason:** string emitida pelo Store para orientar renderização incremental.
- **Controller:** módulo que conecta Store, DOM e comportamento de uma região.
- **Template:** composição de várias camadas criada em uma transação.
- **Preset:** conjunto reutilizável aplicado a uma camada existente.

