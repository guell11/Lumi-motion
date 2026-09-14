# Estado, eventos, transações e Undo

## Fonte de verdade

`Editor.Store`, em `web/js/state.js`, contém:

- `project`: documento persistível;
- `currentTime`: playhead, não persistido;
- `selectedLayerId` e `selectedLayerIds`: seleção de runtime;
- modos `mode`, `recordMotion`, `snap`, `grid`, `motionPath`;
- `history` e `future`;
- subscribers e profundidade de transação.

DOM, canvas e widgets apenas projetam esse estado.

## Comandos públicos

| Grupo | Métodos principais |
| --- | --- |
| Projeto | `load`, `serialize`, `setName`, `setSetting`, `setDuration` |
| Mídia | `addMedia`, `media` |
| Camadas | `addLayer`, `updateLayer`, `mutateLayer`, `deleteSelected`, `duplicateSelected` |
| Edição temporal | `splitSelected`, `joinSelectedWithNext`, `ensureDuration` |
| Seleção | `setSelected`, `selectLayers`, `selectAllVisible`, `selectAllTimeline` |
| Consulta | `layer`, `trackFor`, `visibleLayersAt`, `contentEnd`, `effectiveDuration` |
| Keyframes | `addKeyframe`, `addAutoKeyframe`, `updateKeyframe`, `removeKeyframe` |
| Presets | `applyPresetToSelected`, `saveSelectedAsPreset` |
| Câmera | `setCameraProp`, `addCameraKeyframe`, `applyCameraPreset` |
| Histórico | `checkpoint`, `beginTransaction`, `endTransaction`, `undo`, `redo` |

## Histórico

O histórico guarda snapshots JSON completos, limitado a 80 entradas. `checkpoint()` deve ocorrer antes de uma mutação persistente.

```js
store.checkpoint();
layer.props.opacity = 0.5;
store.emit("layer:opacity");
```

Para várias mudanças atômicas:

```js
store.beginTransaction("template:apply");
try {
  // adicionar/alterar várias camadas
} finally {
  store.endTransaction("template:apply");
}
```

Dentro de uma transação, chamadas a `checkpoint()` são ignoradas e `emit()` apenas atualiza a reason final. Isso dá um único Undo.

## Reasons e custo de render

Reasons são strings, não eventos DOM. `App.render(reason)` as classifica.

| Reason/família | Intenção |
| --- | --- |
| `time` | atualização de frame/playhead durante scrub/playback |
| `timeline:drag-live` | preview enquanto clip se move |
| `canvas:drag-live` | preview enquanto elemento se move |
| `prop:*` | input contínuo do inspetor |
| `prop:audio:*` | idem + ressincronização do player de áudio |
| `layer:*` | estrutura ou conteúdo de camada |
| `keyframe:*` | curva/animação |
| `camera:*` | câmera global |
| `load`, `undo`, `redo` | reconstrução ampla |

`emit()` não altera `updatedAt` para `time`, drags live e samples de gravação. Isso evita marcar o projeto como modificado a cada frame.

## Seleção múltipla

`selectedLayerIds` é o conjunto ordenado. `selectedLayerId` aponta para o primeiro item e mantém compatibilidade com painéis que editam uma camada primária.

- Exclusão usa toda a seleção.
- Drag da timeline movimenta o grupo.
- Marquee atualiza a coleção e emite no commit.
- O inspetor edita a camada primária, não todas as selecionadas.
- Duplicação atualmente duplica apenas a camada primária.

Ao adicionar um comando em massa, use `selectedLayerIds`, preserve offsets e crie uma única transação.

## Auto Key

Quando `recordMotion` está ativo, propriedades informadas a `updateLayer(..., keyframeProperties)` geram keyframe no tempo atual. `addAutoKeyframe` também cria um valor de origem em `layer.start` quando a animação ainda está vazia e o primeiro ajuste ocorre depois do início.

Evite criar keyframes em cada `pointermove` sem necessidade. O fluxo preferido é capturar o valor anterior no pointerdown, mostrar preview live e consolidar a alteração no commit.

## Padrão para uma nova mutação

1. Resolva a camada pelo Store.
2. Valide lock, tipo e limites.
3. Faça `checkpoint()` ou abra transação antes da primeira escrita.
4. Altere o modelo, não o DOM.
5. Emita uma reason específica.
6. Atualize `App.render` se a reason puder usar caminho incremental.
7. Teste Undo/Redo e serialização.

## Armadilhas

- Chamar `setSelected()` durante pointerdown em DOM reconstruído pode invalidar pointer capture; a timeline captura o ponteiro antes e preserva nodes.
- Emitir em cada pixel com reason genérica reconstrói a interface.
- Escrever `project.updatedAt` manualmente é desnecessário.
- Alterar arrays fora de transação em builders gera dezenas de passos de Undo.
- Criar estado paralelo no controller causa divergência depois de `load` ou `undo`.

