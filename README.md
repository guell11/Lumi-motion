# Lumi Motion Video Editor

Lumi Motion e um editor desktop de video/motion graphics feito com PyQt6 + QWebEngineView. A interface roda em HTML/CSS/JS e conversa com Python por `QWebChannel`. O backend salva projetos, importa arquivos locais e exporta via FFmpeg.

## Como rodar

```powershell
cd "C:\Users\guell\Documents\video editor"
python -m pip install -r requirements.txt
python app.py
```

Tambem existe o atalho:

```powershell
.\run_editor.bat
```

## FFmpeg

Para exportar MP4/GIF e separar audio, coloque `ffmpeg.exe` no PATH ou em uma destas pastas:

- `tools/ffmpeg/bin/ffmpeg.exe`
- `tools/ffmpeg/ffmpeg.exe`
- `ffmpeg.exe` na raiz do projeto

Se `ffprobe.exe` estiver junto, o app tambem detecta duracao de audio/video importados.

## Hub inicial

Antes do editor abrir, aparece o hub:

- `Novo projeto`: cria uma timeline vazia.
- `Abrir projeto`: abre um arquivo `.lumi.json`.
- `Projetos recentes`: lista projetos em `projects/` e autosaves em `autosaves/`.
- `Idioma`: alterna Portugues e Ingles.

O autosave so comeca depois de criar ou abrir um projeto.

## Interface

- Barra superior: paineis de Midia, Audio, Texto, Stickers, Animacoes, Efeitos, Transicoes, Filtros, Ajuste e Modelos.
- Painel esquerdo: biblioteca, presets e templates.
- Preview central: canvas de composicao.
- Painel direito: propriedades, animacao, audio, cor, curva e camera.
- Timeline inferior: lanes por camada, clips, playhead, zoom e ferramentas de corte.

## Funcoes principais

### Projetos

- Salvar projeto em `.lumi.json`.
- Abrir projeto.
- Autosave a cada 10 segundos em `autosaves/`.
- Projetos recentes no hub.

### Midia

- Importar video, imagem, audio, GIF, SVG e fontes.
- Adicionar midia na timeline clicando no card.
- Imagens e videos entram mantendo proporcao natural.
- Handles no canvas redimensionam mantendo proporcao para midia.

### Canvas / Preview

- Selecionar elementos com clique.
- Mover elementos arrastando.
- Redimensionar pelos quadrados de canto.
- Para texto, redimensionar tambem altera o tamanho da fonte.
- Grid, snap e caminho de movimento podem ser ligados/desligados.
- Zoom do canvas no controle inferior.

### Texto

- Criar texto 2D.
- Criar texto 3D.
- Duplo clique no texto edita diretamente no local.
- `Enter` confirma a edicao.
- `Esc` cancela a edicao.
- Espaco funciona normalmente durante a digitacao.
- Propriedades: conteudo, fonte, tamanho, cor, stroke, sombra, alinhamento e espacamento.

### Texto 3D

- Renderizado com Three.js local em `web/vendor/three.module.js`.
- Propriedades: profundidade, bevel, metalness, roughness, luz X/Y/Z, rotacao X/Y/Z e escala.
- Aceita keyframes e presets como qualquer camada.

### Timeline

- Cada camada aparece em uma lane propria.
- Permite varias camadas no mesmo frame.
- Arrastar clip move no tempo.
- Handles laterais cortam duracao.
- Playhead pode ser clicado ou arrastado para voltar/avancar.
- `Cortar`, `Unir`, `Duplicar`, `Excluir` e `Beat`.
- Zoom da timeline.

### Animacoes

- Keyframes por propriedade.
- REC mov: grava movimento somente quando ligado.
- Sem REC, arrastar so move o elemento.
- Caminho de movimento com pontos.
- Duplo clique no canvas adiciona ponto de caminho.
- Shift + duplo clique cria handles Bezier.
- Alt + duplo clique remove ponto.
- Velocidade de animacao por camada.
- Presets: fade, flash, glow, zoom, shake, rotate, slide, pop, 3D flip, giro 3D e mais.

### Texto animado

- Typewriter.
- Letra por letra.
- Palavra por palavra.
- Bounce, glitch, neon, blur, scramble, wave e outros.

### Camera

A aba `Camera` controla a camera global da cena:

- Pan X/Y.
- Dolly Z.
- Zoom.
- Roll.
- Tilt X/Y.
- FOV para texto 3D.

Presets:

- Dolly in.
- Dolly out.
- Pan esquerda.
- Pan direita.
- Tilt dramatico.
- Orbit 3D.
- Camera shake.

### Audio

- Importar audio.
- Separar audio de video usando FFmpeg.
- Volume.
- Fade-in/fade-out.
- Velocidade.
- Pitch.
- Pan stereo.
- EQ de graves, medios e agudos.
- Reverb.
- Compressor.
- Limiter.
- Normalizar.
- Reduzir ruido.
- Marcadores de beat.

### Efeitos, filtros e ajustes

- Blur.
- Glow.
- Glitch.
- RGB split/chromatic aberration.
- Grain/noise.
- Vinheta.
- Brilho, contraste, saturacao e temperatura.
- Filtros prontos como preto e branco, filme antigo, cyber neon e clean comercial.

### Templates

- Intro forte.
- Lower third.
- Titulo animado.
- Legenda pop.
- Transicao flash.
- Pack de shapes.
- Kinetic words.
- Beat cards.
- Moldura vertical.
- Cartela final.

### Exportacao

- MP4.
- GIF.
- Resolucao 720p, 1080p e 4K.
- FPS 24, 30 e 60.
- Bitrate customizavel.
- Duracao padrao usa o fim real do ultimo item visivel na timeline.
- Audio e mix basico entram pelo pipeline FFmpeg.

## Atalhos

- `Espaco`: play/pause, exceto quando estiver digitando.
- `Ctrl+S`: salvar projeto.
- `Ctrl+Z`: desfazer.
- `Ctrl+Y`: refazer.
- `Ctrl+A` com mouse na cena: seleciona tudo visivel no frame atual.
- `Ctrl+A` com mouse na timeline: seleciona tudo da timeline.
- `Delete` ou `Backspace`: apaga a selecao.
- `S`: corta o clip selecionado no playhead.

Durante edicao de texto, os atalhos globais nao interceptam a digitacao.

## Estrutura do app

```text
PyQt6 App
├── editor/
│   ├── main_window.py      Janela PyQt6, QWebEngineView e QWebChannel
│   ├── bridge.py           Bridge Python <-> JS
│   ├── exporter.py         Exportacao por FFmpeg
│   ├── media.py            Metadata e classificacao de arquivos
│   ├── paths.py            Pastas do app
│   └── project.py          Normalizacao/salvamento de projeto
├── web/
│   ├── index.html          Layout principal e hub
│   ├── styles.css          Visual do editor
│   ├── vendor/
│   │   └── three.module.js Three.js local
│   └── js/
│       ├── app.js          Inicializacao, hub, atalhos e idioma
│       ├── state.js        Projeto, camadas, timeline, selecao e camera
│       ├── canvas.js       Preview, selecao, resize e edicao de texto
│       ├── threeText3D.js  Texto 3D
│       ├── timeline.js     Timeline e clips
│       ├── properties.js   Painel de propriedades
│       ├── mediaLibrary.js Paineis da esquerda
│       ├── animationEngine.js Keyframes, easing e camera
│       ├── motionPathEditor.js Caminho de movimento
│       ├── graphEditor.js  Curvas
│       ├── textAnimator.js Animacoes de texto
│       ├── audioEngine.js  Audio e separar audio
│       ├── effects.js      Efeitos/filtros
│       ├── templates.js    Templates
│       └── exporter.js     Render frame-a-frame para Python
├── projects/               Projetos salvos
├── autosaves/              Autosaves
└── exports/                Videos exportados
```

## Formato do projeto

Projetos sao JSON `.lumi.json`. Cada projeto guarda:

- Configuracoes de resolucao, FPS, duracao e fundo.
- Biblioteca de midia.
- Camadas.
- Clips/timeline.
- Keyframes por camada.
- Camera global e keyframes de camera.
- Presets personalizados.
- Marcadores de beat.

## Observacoes

- A UI nao depende de internet.
- Three.js fica local em `web/vendor/`.
- FFmpeg precisa estar instalado/localizado para exportar video final e separar audio.
