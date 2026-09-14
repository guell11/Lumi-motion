# Formato de projeto `.lumi.json`

## Princípios

O projeto é JSON legível e atualmente usa `version: 1`. O frontend mantém o documento em memória e o backend normaliza campos básicos ao abrir/salvar. Caminhos de mídia são locais e absolutos.

## Estrutura raiz

```json
{
  "version": 1,
  "name": "Projeto sem titulo",
  "createdAt": "2026-08-14T12:00:00",
  "updatedAt": "2026-08-14T12:05:00",
  "settings": {},
  "media": [],
  "layers": [],
  "timeline": {},
  "presets": [],
  "markers": [],
  "camera": {}
}
```

### `settings`

| Campo | Tipo | Default | Uso |
| --- | --- | --- | --- |
| `width` | number | 1920 | largura lógica do canvas |
| `height` | number | 1080 | altura lógica do canvas |
| `fps` | number | 30 | navegação por frame e export |
| `duration` | number | 15 | duração mínima/nominal |
| `background` | string | `#111214` | fundo da composição |
| `aspect` | string | `16:9` | metadata de proporção |

### `media[]`

Um item de mídia identifica um arquivo importado. Campos variam conforme o tipo:

```json
{
  "id": "media-...",
  "name": "intro.mp4",
  "type": "video",
  "path": "C:/projeto/intro.mp4",
  "url": "file:///C:/projeto/intro.mp4",
  "duration": 8.42,
  "hasAudio": true
}
```

Tipos reconhecidos: `video`, `image`, `audio`, `gif`, `svg` e `font`. A deduplicação usa `path`, `url` ou `name`.

### `timeline`

```json
{
  "zoom": 72,
  "tracks": [
    { "id": "track-video", "name": "Video", "type": "video", "height": 54 },
    { "id": "track-text", "name": "Texto", "type": "text", "height": 54 },
    { "id": "track-shape", "name": "Shapes", "type": "shape", "height": 54 },
    { "id": "track-audio", "name": "Audio", "type": "audio", "height": 48 }
  ]
}
```

Famílias compatíveis: imagem/vídeo → `video`; texto/texto 3D → `text`; shape/SVG → `shape`; áudio → `audio`.

## Camada

```json
{
  "id": "layer-...",
  "type": "video",
  "name": "Intro",
  "trackId": "track-video",
  "start": 1.5,
  "duration": 4,
  "sourceIn": 2,
  "mediaId": "media-...",
  "props": {},
  "animations": {},
  "effects": {},
  "color": {},
  "audio": {},
  "transitionIn": null,
  "transitionOut": null,
  "textAnimation": null,
  "motionPath": { "type": "linear", "points": [] },
  "animationSpeed": 1,
  "locked": false,
  "hidden": false,
  "parentId": null,
  "groupId": null
}
```

`start` e `duration` posicionam a instância na timeline. `sourceIn` é o offset dentro da mídia original; trim esquerdo e split precisam atualizá-lo.

### `props`

Categorias principais:

- Transform: `x`, `y`, `z`, `width`, `height`, `scale`, `scaleX`, `scaleY`, `rotation`, `rotateX`, `rotateY`.
- Aparência: `opacity`, `blur`, `fill`, `stroke`, `strokeWidth`, `shadow`, `shadowColor`, `blendMode`, `mask`, `radius`.
- Texto: `text`, `fontFamily`, `fontSize`, `fontWeight`, `align`, `letterSpacing`.
- 3D: `perspective`, `depth`, `bevel`, `metalness`, `roughness`, `lightX/Y/Z`.
- SVG: `svgColorMode`, `svgPrimary`, `svgSecondary`, `svgStroke`, `svgStrokeWidth`.

Todos os tipos recebem defaults de `createLayer()` para permitir migração tolerante de arquivos antigos.

### `animations`

Mapa de propriedade para array ordenado de keyframes:

```json
{
  "x": [
    { "time": 0, "value": 200, "ease": "easeInOut" },
    { "time": 2, "value": 960, "ease": "easeOut" }
  ],
  "opacity": [
    { "time": 0, "value": 0, "ease": "linear" },
    { "time": 0.5, "value": 1, "ease": "easeOut" }
  ]
}
```

Tempos são absolutos na composição. O motor aplica `animationSpeed` e resolve valores no tempo atual.

### `color`

Defaults: `exposure`, `highlights`, `shadows`, `vibrance`, `temperature`, `tint`, `grain` e `chroma` em zero; `brightness`, `contrast` e `saturation` em um.

### `audio`

Inclui `volume`, `fadeIn`, `fadeOut`, `speed`, `pitch`, `pan`, bandas `low/mid/high`, `reverb` e flags `compressor`, `limiter`, `normalize`, `enhance`, `reduceNoise`.

### `motionPath`

`type` pode ser `linear` ou um modo suavizado/Bezier. Cada ponto guarda posição e, quando aplicável, handles. O editor do caminho interpreta esses dados no canvas.

## Câmera

```json
{
  "props": {
    "x": 0, "y": 0, "z": 900, "zoom": 1,
    "rotation": 0, "tiltX": 0, "tiltY": 0, "fov": 45
  },
  "animations": {}
}
```

Keyframes de câmera usam o mesmo formato de `layer.animations`.

## Normalização e migração

- `editor/project.py` faz merge dos campos raiz, settings e timeline.
- `state.js::normalizeProject` completa câmera e transforma cada layer via `createLayer`.
- Arrays inválidos viram arrays vazios.
- Tracks ausentes recebem as tracks padrão.

Para uma mudança incompatível:

1. incremente `PROJECT_VERSION` no Python e o default JS;
2. implemente migração explícita antes do merge;
3. mantenha leitura de pelo menos uma versão anterior;
4. adicione fixtures de projeto antigo/novo;
5. documente o impacto em exportação e relink.

## Portabilidade e segurança

O formato ainda não empacota assets. Mover um `.lumi.json` para outra máquina quebra referências absolutas. Não confie em paths vindos de um arquivo desconhecido sem validação. Uma evolução recomendada é guardar caminho absoluto, caminho relativo ao projeto e hash/metadata para relink.

