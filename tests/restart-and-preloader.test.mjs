import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

function setupNodeDOM() {
  globalThis.window = globalThis;
  globalThis.addEventListener = globalThis.addEventListener || ((evt, fn) => {});
  globalThis.removeEventListener = globalThis.removeEventListener || ((evt, fn) => {});
  globalThis.requestAnimationFrame = (fn) => 1;
  globalThis.cancelAnimationFrame = (id) => {};

  if (!globalThis.ImageData) {
    globalThis.ImageData = class ImageData {
      constructor(w, h) {
        this.width = w;
        this.height = h;
        this.data = new Uint8ClampedArray(w * h * 4);
      }
    };
  }
  if (!globalThis.Image) {
    globalThis.Image = class Image {
      constructor() {
        this._src = '';
        setTimeout(() => this.onload?.(), 2);
      }
      get src() { return this._src; }
      set src(v) { this._src = v; }
    };
  }
  if (!globalThis.Audio) {
    globalThis.Audio = class Audio {
      constructor() {
        this._src = '';
        this.paused = true;
      }
      load() {}
      play() { return Promise.resolve(); }
      pause() {}
      addEventListener(evt, fn) {
        if (evt === 'canplaythrough') setTimeout(fn, 2);
      }
      removeEventListener() {}
    };
  }

  if (!globalThis.document) {
    const mockContext = () => ({
      save: () => {},
      restore: () => {},
      clip: () => {},
      translate: () => {},
      scale: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      drawImage: () => {},
      clearRect: () => {},
      setTransform: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      closePath: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createImageData: (w, h) => new globalThis.ImageData(w, h),
      getImageData: (x, y, w, h) => new globalThis.ImageData(w, h),
      putImageData: () => {},
      fillText: () => {},
      measureText: () => ({ width: 40 })
    });

    const elementsById = new Map();
    const mockElement = (tag) => {
      const classes = new Set();
      const listeners = new Map();
      return {
        tagName: tag.toUpperCase(),
        style: {},
        classList: {
          add: (...cls) => cls.forEach(c => classes.add(c)),
          remove: (...cls) => cls.forEach(c => classes.delete(c)),
          toggle: (c) => classes.has(c) ? (classes.delete(c), false) : (classes.add(c), true),
          contains: (c) => classes.has(c)
        },
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: (c) => c,
        append: () => {},
        remove: () => {},
        addEventListener: (type, fn) => {
          if (!listeners.has(type)) listeners.set(type, []);
          listeners.get(type).push(fn);
        },
        removeEventListener: (type, fn) => {
          const arr = listeners.get(type);
          if (arr) {
            const idx = arr.indexOf(fn);
            if (idx >= 0) arr.splice(idx, 1);
          }
        },
        dispatchEvent: (evt) => {
          const arr = listeners.get(evt.type) || [];
          arr.forEach(fn => fn(evt));
        },
        querySelector: () => null,
        querySelectorAll: () => [],
        getContext: () => mockContext(),
        toDataURL: () => 'data:image/png;base64,AA==',
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 })
      };
    };

    globalThis.document = {
      createElement: mockElement,
      getElementById: (id) => {
        if (!elementsById.has(id)) elementsById.set(id, mockElement('div'));
        return elementsById.get(id);
      },
      querySelector: () => null,
      querySelectorAll: () => [],
      body: mockElement('body'),
      addEventListener: () => {},
      removeEventListener: () => {},
      readyState: 'complete'
    };
    globalThis.document.body.dataset = {};
  }
  if (globalThis.TruePixelEngine?.IrisTransition) {
    globalThis.TruePixelEngine.IrisTransition.active = false;
    globalThis.TruePixelEngine.IrisTransition.onDone = null;
  }
}

test('DialogueBox.close existe, sincroniza gemas primordiais e valida retratos das Guardiãs', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  const E = globalThis.TruePixelEngine;
  assert.ok(E, 'TruePixelEngine deve existir');
  const { DialogueBox, SpriteBank } = E;
  assert.ok(DialogueBox, 'DialogueBox deve existir');
  assert.equal(typeof DialogueBox.close, 'function', 'DialogueBox.close deve ser uma função');

  assert.ok(SpriteBank.araci && SpriteBank.irece && SpriteBank.jurema, 'Atores Hi-Bit das 3 Guardiãs devem existir');
  assert.ok(
    SpriteBank.portraits.portrait_araci && SpriteBank.portraits.portrait_irece && SpriteBank.portraits.portrait_jurema,
    'Retratos de rosto em losango das 3 Guardiãs devem existir'
  );

  DialogueBox.syncSocketsFromCompleted([5, 10, 15, 20]);
  assert.deepEqual(DialogueBox.sockets, {
    fairy: true,
    forest: true,
    river: true,
    caatinga: true
  });

  DialogueBox.open([{ speaker: 'Araci', portrait: 'portrait_araci', text: 'Bem-vindo à Floresta!' }]);
  assert.equal(DialogueBox.isOpen, true, 'DialogueBox deve estar aberta');
  assert.equal(DialogueBox.queue.length, 1, 'Fila deve ter 1 mensagem');

  DialogueBox.close();
  assert.equal(DialogueBox.isOpen, false, 'DialogueBox deve estar fechada após close()');
  assert.equal(DialogueBox.queue.length, 0, 'Fila deve estar vazia após close()');
  assert.equal(DialogueBox.charProgress, 0, 'charProgress deve ser 0');
});

test('CaveChapter1.restartCurrentPhase reinicia de forma robusta e limpa a fase', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  const Cave = globalThis.CaveChapter1;
  assert.ok(Cave, 'CaveChapter1 deve existir');
  assert.equal(typeof Cave.restartCurrentPhase, 'function', 'restartCurrentPhase deve ser função');

  Cave.currentLevel = 3;
  Cave.currentStep = 2;
  Cave.phase = 'step_transition';
  Cave.draggedPiece = { id: 'dummy' };
  Cave.waveActive = true;
  Cave.waveRadius = 50;

  Cave.restartCurrentPhase();
  Cave.running = false;

  assert.equal(Cave.currentLevel, 3, 'Deve manter o nível atual');
  assert.equal(Cave.currentStep, 1, 'Deve reiniciar para a Etapa 1 da fase');
  assert.equal(Cave.phase, 'gameplay', 'Fase deve retornar imediatamente para gameplay');
  assert.equal(Cave.draggedPiece, null, 'draggedPiece deve ser null');
  assert.equal(Cave.waveActive, false, 'waveActive deve ser false');
  assert.equal(Cave.protag.x, 42, 'Protagonista x deve ser 42');
  assert.equal(Cave.protag.y, 142, 'Protagonista y deve ser 142');
  assert.equal(Cave.protag.state, 'idle', 'Protagonista deve estar em idle');
  assert.ok(Cave.pieces.length > 0, 'Peças da Etapa 1 devem ser recriadas');
});

test('AssetPreloader gerencia apenas os 17 recursos ativos (8 PNGs de Menu/Mapa + 9 MP3s) existentes em disco', async () => {
  setupNodeDOM();
  await import('../js/preloader.js');
  const Preloader = globalThis.AssetPreloader;
  assert.ok(Preloader, 'AssetPreloader deve existir');
  assert.equal(Preloader.totalCount, 17, 'Deve gerenciar exatamente os 17 recursos ativos do boot');

  await new Promise((r) => setTimeout(r, 20));
  for (const src of Object.keys(Preloader.cache.images)) {
    assert.ok(existsSync(new URL(`../${src}`, import.meta.url)), `Imagem ativa deve existir em disco: ${src}`);
  }
  for (const src of Object.keys(Preloader.cache.audios)) {
    assert.ok(existsSync(new URL(`../${src}`, import.meta.url)), `Áudio ativo deve existir em disco: ${src}`);
  }
  assert.ok(Preloader.cache.images['assets/story/interface/btn-novo-jogo.png'], 'Deve pré-carregar btn-novo-jogo.png');
  assert.ok(Preloader.cache.images['assets/story/interface/btn-continuar.png'], 'Deve pré-carregar btn-continuar.png');

  const deletedSprites = [
    'assets/story/interface/btn-jogar.png',
    'assets/scenarios/pixel-cave.png',
    'assets/scenarios/pixel-worlds.png',
    'assets/sprites/pixel-gems.png',
    'assets/sprites/pixel-ecology.png',
    'assets/story/cenarios/F1-quatro-estados.png',
    'assets/story/personagens/fada-mapa-8-quadros.png',
    'assets/story/transicoes/floresta-20-quadros.png'
  ];
  for (const src of deletedSprites) {
    assert.equal(existsSync(new URL(`../${src}`, import.meta.url)), false, `Sprite não usado deve ter sido deletado: ${src}`);
  }

  assert.ok('CrystalAssetsReady' in globalThis, 'CrystalAssetsReady deve estar exposto globalmente');
});

test('enterJourneyMapWithIrisIn sincroniza progresso com CrystalApp e não prende níveis >= 5 na Fase 4', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  const Cave = globalThis.CaveChapter1;
  const E = globalThis.TruePixelEngine;

  let syncedIds = null;
  let syncedCurrent = null;
  let gotoCalledWith = null;
  let startedLevel = null;

  globalThis.CrystalApp = {
    syncProgress(ids, nextCurrent) {
      syncedIds = ids;
      syncedCurrent = nextCurrent;
    },
    goto(screen) {
      gotoCalledWith = screen;
      globalThis.document.body.dataset.screen = screen;
    },
    startLevel(id) {
      Cave.deactivateCanvas();
      startedLevel = id;
    }
  };

  Cave.init();
  Cave.currentLevel = 4;
  Cave.enterJourneyMapWithIrisIn(true);

  assert.deepEqual(syncedIds, [1, 2, 3, 4, 5], 'Deve sincronizar as fases 1..5 ao concluir a Caverna');
  assert.equal(syncedCurrent, 5, 'Deve posicionar o foco atual no nível 5');
  assert.equal(gotoCalledWith, 'map', 'Deve transicionar para a tela #map via CrystalApp');
  assert.equal(Cave.isActiveGame(), false, 'CaveChapter1 não deve permanecer marcado como jogo ativo sobre o mapa');

  E.IrisTransition.update(2.0);
  assert.equal(Cave.running, false, 'Loop da caverna deve encerrar após o Iris In do mapa');
  assert.equal(Cave.canvas.hidden, true, 'Canvas da caverna deve ficar oculto após abrir o mapa');

  let renderedJourneyOpts = null;
  delete globalThis.CrystalApp.goto;
  globalThis.CrystalJourney = {
    render(opts) {
      renderedJourneyOpts = opts;
    }
  };

  Cave.enterJourneyMapWithIrisIn(true);
  assert.ok(renderedJourneyOpts, 'CrystalJourney.render deve receber opções no fallback');
  assert.equal(renderedJourneyOpts.unlocked, 6, 'Nível 6 (Floresta) deve estar desbloqueado');

  renderedJourneyOpts.start(6);
  assert.equal(startedLevel, 6, 'Clicar no nível 6 deve abrir startLevel(6) em vez de prender na Fase 4');
  assert.equal(Cave.running, false, 'Canvas da caverna deve continuar desativado ao iniciar nível 6');
});

test('TruePixelWorlds unifica Floresta (6-10), Rio (11-15), Caatinga (16-20) e Santuário Final (21) em True Pixel Art', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');
  const Worlds = globalThis.TruePixelWorlds;
  const E = globalThis.TruePixelEngine;
  assert.ok(Worlds, 'TruePixelWorlds deve existir');

  // 1. Floresta Fase 1 (Nó 6): Altar de Esmeralda dobra o valor do cristal uma única vez por aproximação
  Worlds.startByCampaignNode(6);
  Worlds.running = false;
  E.DialogueBox.close();
  E.TutorialModal.close();
  Worlds.phase = 'gameplay';
  assert.equal(Worlds.worldKey, 'forest');
  assert.equal(Worlds.currentLevel, 1);
  assert.equal(E.GameHUD.worldLabel, 'Floresta');
  assert.ok(Worlds.emeraldAltar, 'Floresta Fase 1 Etapa 1 deve ter o Altar de Esmeralda');

  const pureQ = Worlds.pieces.find((p) => !p.shadow && p.type === 'white');
  const altar = Worlds.emeraldAltar;
  assert.equal(pureQ.value, 2);
  Worlds.moveDraggedPieceWithCollision(pureQ, altar.x, altar.y);
  assert.equal(pureQ.value, 4, 'Altar de Esmeralda deve dobrar Quartzo de 2 para 4 por aproximação');
  assert.equal(pureQ.boosted, true);
  Worlds.moveDraggedPieceWithCollision(pureQ, altar.x + 2, altar.y);
  assert.equal(pureQ.value, 4, 'Altar de Esmeralda não deve dobrar o mesmo cristal uma segunda vez');

  // Anulação imediata por contato com a sombra de valor 4
  const shadowQ = Worlds.pieces.find((p) => p.shadow && p.value === 4);
  const res = Worlds.moveDraggedPieceWithCollision(pureQ, shadowQ.x, shadowQ.y);
  assert.equal(res.annulled, true, 'Deve anular imediatamente ao encostar na sombra compatível');

  // 2. Floresta Fase 2 (Nó 7): Citrino Solar divide ao meio com toque simples
  Worlds.startByCampaignNode(7);
  Worlds.running = false;
  E.DialogueBox.close();
  E.TutorialModal.close();
  Worlds.phase = 'gameplay';
  const citrine = Worlds.pieces.find((p) => !p.shadow && p.type === 'citrine');
  assert.equal(citrine.value, 4);
  const didSplit = Worlds.trySplitCrystalOnTap(citrine);
  assert.equal(didSplit, true, 'Citrino par deve dividir em dois cristais iguais');
  const halves = Worlds.pieces.filter((p) => !p.broken && !p.shadow && p.type === 'citrine');
  assert.equal(halves.length, 2);
  assert.deepEqual(halves.map((h) => h.value), [2, 2]);

  // 3. Rio (Nós 11..15), Caatinga (Nós 16..20, Fases 1..5) e Santuário Final (Nó 21) carregam e renderizam sem erros
  for (const [nodeId, expectedWorld, expectedLevel] of [
    [10, 'forest', 5],
    [11, 'river', 1],
    [15, 'river', 5],
    [16, 'caatinga', 1],
    [17, 'caatinga', 2],
    [18, 'caatinga', 3],
    [19, 'caatinga', 4],
    [20, 'caatinga', 5],
    [21, 'sanctuary', 1]
  ]) {
    Worlds.startByCampaignNode(nodeId);
    Worlds.running = false;
    assert.equal(Worlds.worldKey, expectedWorld, `Nó ${nodeId} deve carregar o mundo ${expectedWorld}`);
    assert.equal(Worlds.currentLevel, expectedLevel, `Nó ${nodeId} deve carregar a fase ${expectedLevel}`);
    assert.ok(Worlds.pieces.length >= 2, `Nó ${nodeId} deve possuir cristais ativos`);
    Worlds.render();
  }

  // 4. Restart limpa e retorna direto para gameplay na Etapa 1
  Worlds.currentStep = 2;
  Worlds.restartCurrentPhase();
  Worlds.running = false;
  assert.equal(Worlds.currentStep, 1);
  assert.equal(Worlds.phase, 'gameplay');

  // 5. Mundo 4: Caatinga — Roteiro Cinemático (6 falas), Formas Geométricas Elétricas, Ordem dos Fatores, Tesselação e Shell Game
  const caatingaSpec = Worlds.WORLD_SPECS.caatinga;
  assert.equal(caatingaSpec.introDialogues[1].length, 6, 'Fase 1 da Caatinga deve conter exatamente as 6 falas do roteiro cinemático');
  assert.equal(caatingaSpec.introDialogues[1][2].text, 'QUE CALOR!!!');
  assert.equal(caatingaSpec.introDialogues[1][2].shake, true, 'Balão "QUE CALOR!!!" deve vibrar com efeito shake');

  // Fase 1 (Nó 16): Círculo Elétrico aceita 1 cristal unitário e o cristaliza em 'circle'
  Worlds.startByCampaignNode(16);
  Worlds.running = false;
  E.DialogueBox.close();
  E.TutorialModal.close();
  Worlds.phase = 'gameplay';
  assert.equal(Worlds.electricShapes.length, 1);
  assert.equal(Worlds.electricShapes[0].shape, 'circle');
  const cPiece = Worlds.pieces.find((p) => !p.shadow);
  const enteredCircle = Worlds.tryEnterElectricShapeNode(Worlds.electricShapes[0], [cPiece]);
  assert.equal(enteredCircle, true, 'Círculo Elétrico deve aceitar 1 cristal unitário');
  assert.equal(cPiece.shape, 'circle');
  assert.equal(Worlds.floatingBanners[Worlds.floatingBanners.length - 1].text, 'CÍRCULO!');
  Worlds.update(0.05);
  Worlds.render();

  // Fase 2 (Nó 17) Etapa 1: Quadrado Elétrico rejeita 1 cristal isolado, mas aceita 2 cristais iguais com sensibilidade à ordem (borda vs. núcleo)
  Worlds.startByCampaignNode(17);
  Worlds.running = false;
  E.DialogueBox.close();
  E.TutorialModal.close();
  Worlds.phase = 'gameplay';
  const sqNode = Worlds.electricShapes[0];
  assert.equal(sqNode.shape, 'square');
  const whiteP = Worlds.pieces.find((p) => !p.shadow && p.type === 'white');
  const roseP = Worlds.pieces.find((p) => !p.shadow && p.type === 'rose');
  const rejectedSingle = Worlds.tryEnterElectricShapeNode(sqNode, [whiteP]);
  assert.equal(rejectedSingle, false, 'Quadrado Elétrico deve rejeitar 1 cristal isolado com barreira elétrica');
  assert.ok(sqNode.barrierUntil > Worlds.t, 'Barreira elétrica amarela deve ativar na rejeição');

  // Conecta Quartzo Rosa à esquerda (x menor -> 1º elemento = borda) e Quartzo Branco à direita (x maior -> 2º elemento = núcleo)
  roseP.x = 100;
  whiteP.x = 120;
  roseP.inEquation = 'pure';
  whiteP.inEquation = 'pure';
  const acceptedPair = Worlds.tryEnterElectricShapeNode(sqNode, [roseP, whiteP]);
  assert.equal(acceptedPair, true, 'Quadrado Elétrico deve aceitar 2 cristais conectados de valores iguais');
  assert.equal(roseP.shape, 'square');
  assert.equal(roseP.borderType, 'rose', '1º elemento deve definir a cor da borda externa');
  assert.equal(roseP.coreType, 'white', '2º elemento deve definir a cor do núcleo interno');
  assert.equal(roseP.value, 4);

  // Desmontagem intuitiva por toque simples restaura os cristais originais e reativa o portal elétrico
  const disassembled = Worlds.tryDisassembleShapeOnTap(roseP);
  assert.equal(disassembled, true, 'Toque simples em forma materializada deve desmontá-la');
  assert.equal(sqNode.used, false, 'Portal elétrico deve voltar a ficar ativo após desmontagem');

  // Fase 3 (Nó 18): Tesselação de 2 Quadrados idênticos em 1 Retângulo ('RETÂNGULO!') + Giro suave de encaixe
  Worlds.startByCampaignNode(18);
  Worlds.running = false;
  E.DialogueBox.close();
  E.TutorialModal.close();
  Worlds.phase = 'gameplay';
  const sqs = Worlds.pieces.filter((p) => !p.shadow && p.shape === 'square');
  assert.equal(sqs.length, 2);
  // Ao segurar sqs[1] e aproximar de sqs[0], deve ativar preview de encaixe e girar suavemente sqs[1]
  Worlds.draggedPiece = sqs[1];
  sqs[1].dragging = true;
  sqs[1].x = sqs[0].x;
  sqs[1].y = sqs[0].y + 20;
  Worlds.update(0.1);
  assert.ok(Worlds.tessellationPreview, 'Deve ativar preview de encaixe ao aproximar 2 Quadrados compatíveis');
  assert.equal(Worlds.tessellationPreview.resultShape, 'rectangle');
  assert.ok(sqs[1].rotAngle > 0, 'Forma segurada deve girar suavemente em direção ao ângulo de encaixe');
  Worlds.render();
  sqs[1].dragging = false;
  Worlds.draggedPiece = null;
  const tessRect = Worlds.tryTessellateShapes(sqs[0], sqs[1]);
  assert.equal(tessRect, true, '2 Quadrados idênticos devem se encaixar em um Retângulo');
  assert.equal(sqs[0].shape, 'rectangle');
  assert.equal(sqs[0].joinedSquares, true, 'Retângulo formado por 2 Quadrados deve preservar costura de junção');
  assert.equal(sqs[0].value, 8);

  // Fase 3 (Nó 18) Etapa 2: Síntese de Triângulo + Tesselação de 1 Trapézio + 1 Triângulo em 1 Pentágono ('PENTÁGONO!')
  Worlds.setupStep(2);
  E.TutorialModal.close();
  Worlds.phase = 'gameplay';
  const triNode = Worlds.electricShapes[0];
  const qTri = Worlds.pieces.find((p) => !p.shadow && p.type === 'white');
  const rTri = Worlds.pieces.find((p) => !p.shadow && p.type === 'rose');
  qTri.x = 80;
  rTri.x = 100;
  qTri.inEquation = 'pure';
  rTri.inEquation = 'pure';
  assert.equal(Worlds.tryEnterElectricShapeNode(triNode, [qTri, rTri]), true);
  assert.equal(qTri.shape, 'triangle');
  const trap = Worlds.pieces.find((p) => !p.shadow && p.shape === 'trapezoid');
  const tessPent = Worlds.tryTessellateShapes(trap, qTri);
  assert.equal(tessPent, true, '1 Trapézio + 1 Triângulo devem formar 1 Pentágono');
  assert.equal(trap.shape, 'pentagon');
  assert.equal(trap.triBorder, 'white', 'Pentágono deve preservar a borda exata do Triângulo no topo');
  assert.equal(trap.triCore, 'rose', 'Pentágono deve preservar o núcleo exato do Triângulo no topo');
  assert.equal(trap.trapBorder, 'citrine', 'Pentágono deve preservar a borda exata do Trapézio na base');
  assert.equal(trap.trapCore, 'aqua', 'Pentágono deve preservar o núcleo exato do Trapézio na base');
  assert.equal(trap.value, 9);
  const shadowPent = Worlds.pieces.find((p) => p.shadow && p.shape === 'pentagon');
  assert.equal(Worlds.arePiecesEquivalent(trap, shadowPent), true, 'Pentágono formado deve corresponder exatamente ao Pentágono Sombrio');

  // Fase 4 (Nó 19): Tesselação de 2 Triângulos em Losango ('LOSANGO!' com giro de 180°) e 6 Triângulos em Hexágono ('HEXÁGONO!')
  Worlds.startByCampaignNode(19);
  Worlds.running = false;
  E.DialogueBox.close();
  E.TutorialModal.close();
  Worlds.phase = 'gameplay';
  const tris = Worlds.pieces.filter((p) => !p.shadow && p.shape === 'triangle' && p.type === 'white');
  Worlds.draggedPiece = tris[1];
  tris[1].dragging = true;
  tris[1].x = tris[0].x + 18;
  tris[1].y = tris[0].y;
  Worlds.update(0.15);
  assert.equal(Worlds.tessellationPreview?.resultShape, 'rhombus');
  assert.equal(Worlds.tessellationPreview?.targetRotAngle, Math.PI, 'Segundo Triângulo deve girar 180° (Math.PI) para formar o Losango');
  assert.ok(tris[1].rotAngle > 0.5, 'Triângulo segurado deve interpolar suavemente a rotação de 180°');
  tris[1].dragging = false;
  Worlds.draggedPiece = null;
  assert.equal(Worlds.tryTessellateShapes(tris[0], tris[1]), true, '2 Triângulos congruentes devem formar 1 Losango');
  assert.equal(tris[0].shape, 'rhombus');
  Worlds.setupStep(2);
  E.TutorialModal.close();
  Worlds.phase = 'gameplay';
  const hexTris = Worlds.pieces.filter((p) => !p.shadow && p.shape === 'triangle');
  assert.equal(hexTris.length, 6);
  for (let i = 1; i < 6; i++) {
    assert.equal(Worlds.tryTessellateShapes(hexTris[0], hexTris[i]), true);
  }
  assert.equal(hexTris[0].shape, 'hexagon', '6 Triângulos equiláteros devem formar 1 Hexágono');
  assert.equal(hexTris[0].value, 12);

  // Fase 5 (Nó 20): Clímax do Desafio das Areias (Shell Game de 6 rodadas)
  Worlds.startByCampaignNode(20);
  Worlds.running = false;
  Worlds.startShellGame();
  E.TutorialModal.close();
  Worlds.phase = 'shell_game_pick';
  assert.equal(Worlds.shellGame.round, 1);
  assert.equal(Worlds.shellGame.totalRounds, 6);
  assert.equal(Worlds.shellGame.cups.length, 2, 'Rodada 1 deve ter 2 copos de arenito');

  // Erro não gera penalidade e repete a rodada
  const wrongIdx = Worlds.shellGame.opalCupIdx === 0 ? 1 : 0;
  Worlds.pickShellCup(wrongIdx);
  assert.equal(Worlds.shellGame.roundResult, 'miss');
  Worlds.updateShellGame(1.2);
  assert.equal(Worlds.shellGame.round, 1, 'Erro no Shell Game deve repetir a mesma rodada sem penalidade');

  // Acerto avança até a Rodada 6
  for (let r = 1; r <= 6; r++) {
    Worlds.phase = 'shell_game_pick';
    assert.equal(Worlds.shellGame.round, r);
    Worlds.pickShellCup(Worlds.shellGame.opalCupIdx);
    assert.equal(Worlds.shellGame.roundResult, 'hit');
    Worlds.updateShellGame(1.2);
  }
  assert.equal(Worlds.phase, 'shell_game_victory', 'Vencer as 6 rodadas do Shell Game deve iniciar a celebração solar da Caatinga');
  Worlds.render();
});

test('Menu Principal: Novo Jogo zera o progresso e inicia a Fase 1; Continuar preserva o save e abre o Mapa', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const storage = new Map();
  globalThis.localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k)
  };

  const elements = new Map();
  const getEl = (id) => {
    if (!elements.has(id)) {
      const el = globalThis.document.createElement('button');
      el.id = id;
      el.hidden = id !== 'home';
      el.focus = () => { globalThis.document.activeElement = el; };
      elements.set(id, el);
    }
    return elements.get(id);
  };
  const origGetById = globalThis.document.getElementById;
  globalThis.document.getElementById = (id) => getEl(id);

  let caveFase1Started = 0;
  const origStartCutscene = globalThis.CaveChapter1.startCutsceneAndFase1;
  globalThis.CaveChapter1.startCutsceneAndFase1 = () => {
    caveFase1Started++;
  };

  let journeyRenderedOpts = null;
  globalThis.CrystalJourney = {
    render(opts) {
      journeyRenderedOpts = opts;
    },
    close() {}
  };

  globalThis.CrystalAssetsReady = true;

  // Simula um save pré-existente com progresso até a Fase 10
  storage.set('crystal-campaign-v4', JSON.stringify({
    version: 4,
    settings: { music: 0.5, fx: 0.7 },
    completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    current: 11,
    records: { 1: { stars: 3, points: 300 }, 10: { stars: 3, points: 300 } },
    hasSave: true
  }));

  await import('../js/app.js');
  const App = globalThis.CrystalApp;
  const E = globalThis.TruePixelEngine;
  assert.ok(App, 'CrystalApp deve ser inicializado');
  assert.equal(typeof App.startNewGame, 'function', 'startNewGame deve existir em CrystalApp');
  assert.equal(typeof App.continueGame, 'function', 'continueGame deve existir em CrystalApp');

  // 1. Estado inicial carregado do save válido
  assert.deepEqual(App.state.completed, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'Deve carregar fases concluídas do save');
  assert.equal(App.state.current, 11, 'Deve carregar fase atual 11 do save');
  assert.equal(App.state.hasSave, true, 'Deve marcar hasSave = true');
  assert.equal(E.DialogueBox.sockets.forest, true, 'Gema da Floresta deve estar acesa quando fase 10 está concluída');

  // 2. Clicar em "Continuar" (#continueButton) preserva o progresso salvo e navega para #map
  getEl('continueButton').onclick();
  assert.equal(App.state.screen, 'map', 'Continuar deve levar para a tela do mapa (#map)');
  assert.deepEqual(App.state.completed, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'Continuar deve preservar o progresso salvo');
  assert.equal(App.state.current, 11, 'Continuar deve preservar a fase atual 11');
  assert.equal(journeyRenderedOpts?.current, 11, 'Mapa deve posicionar a Fada no nó 11 ao continuar');

  // 3. Clicar em "Novo Jogo" (#newGameButton) reseta todo o progresso, persiste no localStorage e inicia a Fase 1
  E.GameHUD.diamonds = 5;
  getEl('newGameButton').onclick();
  assert.deepEqual(App.state.completed, [], 'Novo Jogo deve zerar a lista de fases concluídas');
  assert.deepEqual(App.state.records, {}, 'Novo Jogo deve zerar os recordes de estrelas/pontos');
  assert.equal(App.state.current, 1, 'Novo Jogo deve definir a fase atual como 1');
  assert.equal(App.state.screen, 'game', 'Novo Jogo deve entrar na tela de jogo (#game)');
  assert.equal(caveFase1Started, 1, 'Novo Jogo deve iniciar a cutscene e Fase 1 da Caverna');
  assert.equal(E.GameHUD.diamonds, 0, 'Novo Jogo deve zerar o estoque de diamantes do HUD');
  assert.equal(E.DialogueBox.sockets.forest, false, 'Novo Jogo deve apagar os engastes de gemas primordiais dos mundos 2..4');

  const persistedAfterNew = JSON.parse(storage.get('crystal-campaign-v4'));
  assert.deepEqual(persistedAfterNew.completed, [], 'localStorage deve refletir o progresso zerado após Novo Jogo');
  assert.equal(persistedAfterNew.current, 1, 'localStorage deve salvar current = 1 após Novo Jogo');
  assert.equal(persistedAfterNew.hasSave, true, 'localStorage deve salvar hasSave = true após Novo Jogo');

  // 4. Simular avanço na campanha após Novo Jogo e usar "Continuar" novamente
  App.syncProgress([1, 2], 3);
  App.goto('home');
  getEl('continueButton').onclick();
  assert.equal(App.state.screen, 'map', 'Continuar após avançar no novo jogo deve abrir o mapa');
  assert.deepEqual(App.state.completed, [1, 2], 'Continuar deve manter as fases [1, 2] recém-concluídas');
  assert.equal(App.state.current, 3, 'Continuar deve manter a fase atual 3');
  assert.equal(journeyRenderedOpts?.unlocked, 3, 'Nó 3 deve ser o próximo desbloqueado no mapa');

  globalThis.CaveChapter1.startCutsceneAndFase1 = origStartCutscene;
  globalThis.document.getElementById = origGetById;
});

test('Mundo do Rio: Plataforma de Fração (Nós 11-14) e Simon-Says Melódico de 5 Cristais (Nó 15)', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');
  const Worlds = globalThis.TruePixelWorlds;
  const E = globalThis.TruePixelEngine;
  assert.ok(Worlds, 'TruePixelWorlds deve existir');

  // ============================================================================
  // 1. Plataforma de Fração (Nó 11 / Fase 1 do Rio):
  //    - Cristais inseridos não podem ser removidos (inFraction travado)
  //    - Igualação de termos no topo e no fundo ativa o brilho rosa
  //    - Clique quebra a plataforma e produz cristal unitário purificado (N/N = 1)
  // ============================================================================
  Worlds.startByCampaignNode(11);
  Worlds.running = false;
  E.DialogueBox.close();
  E.TutorialModal.close();
  Worlds.phase = 'gameplay';

  assert.equal(Worlds.worldKey, 'river');
  assert.equal(Worlds.currentLevel, 1);
  assert.ok(Worlds.fractionPlatform, 'Fase 1 do Rio deve possuir a Plataforma de Frações');

  const fp = Worlds.fractionPlatform;
  assert.equal(fp.w, 64);
  assert.equal(fp.h, 52);
  assert.equal(fp.glowing, false, 'Plataforma não deve brilhar enquanto termos não forem iguais');

  // Peça pré-inserida no topo está travada
  const topPiece = Worlds.pieces.find((p) => p.inFraction === 'top');
  assert.ok(topPiece, 'Deve haver peça no topo da fração');
  assert.equal(topPiece.value, 2);

  // Tentativa de arraste ou divisão não surte efeito em peças travadas na fração
  const initialX = topPiece.x;
  const initialY = topPiece.y;
  const dragRes = Worlds.moveDraggedPieceWithCollision(topPiece, initialX + 50, initialY + 50);
  assert.equal(dragRes.annulled, false);
  assert.equal(topPiece.x, initialX, 'Peça na fração não deve mover de posição por arraste');
  assert.equal(Worlds.trySplitCrystalOnTap(topPiece), false, 'Peça na fração não pode ser dividida por toque');

  // Peça livre de valor 2 inserida na parte inferior da fração
  const freePiece = Worlds.pieces.find((p) => !p.shadow && !p.inFraction);
  assert.ok(freePiece, 'Deve haver peça livre');
  assert.equal(freePiece.value, 2);

  // Arrastar peça livre para a parte inferior da plataforma
  freePiece.x = fp.x;
  freePiece.y = fp.bottomY;
  Worlds.checkPieceDrop(freePiece);

  assert.equal(freePiece.inFraction, 'bottom', 'Peça solta no fundo deve ser capturada pela fração');
  assert.equal(fp.topSum, 2);
  assert.equal(fp.bottomSum, 2);
  assert.equal(fp.glowing, true, 'Plataforma deve brilhar em rosa forte com termos iguais (2/2)');

  // Acionar divisão clicando na plataforma brilhante
  let audioDividePlayed = false;
  globalThis.CrystalAudio = globalThis.CrystalAudio || {};
  globalThis.CrystalAudio.fractionDivide = () => { audioDividePlayed = true; };

  Worlds.triggerFractionDivide();
  assert.equal(audioDividePlayed, true, 'Deve tocar som de divisão cristalina');
  assert.equal(Worlds.fractionPlatform, null, 'Plataforma deve quebrar e sumir do tabuleiro');

  // Deve ter gerado 1 cristal unitário purificado de valor 1
  const purifiedUnit = Worlds.pieces.find((p) => !p.shadow && !p.broken && p.value === 1);
  assert.ok(purifiedUnit, 'Divisão N/N deve gerar cristal unitário purificado de valor 1');
  assert.equal(purifiedUnit.type, 'aqua');

  // O cristal unitário deve anular a sombra de valor 1
  const shadowUnit = Worlds.pieces.find((p) => p.shadow && !p.broken && p.value === 1);
  assert.ok(shadowUnit, 'Deve haver sombra de valor 1');
  const annulRes = Worlds.moveDraggedPieceWithCollision(purifiedUnit, shadowUnit.x, shadowUnit.y);
  assert.equal(annulRes.annulled, true, 'Cristal unitário purificado deve anular a sombra');

  // ============================================================================
  // 2. Igualação com quantidades diferentes de peças (Nó 12 / Fase 2 do Rio):
  //    - Topo: 1 peça de valor 4
  //    - Fundo: 2 peças de valor 2 + 2 = 4
  //    - Total top (4) === Total bottom (4) -> Brilho rosa -> 4/4 = 1
  // ============================================================================
  Worlds.startByCampaignNode(12);
  Worlds.running = false;
  E.DialogueBox.close();
  E.TutorialModal.close();
  Worlds.phase = 'gameplay';

  const fp2 = Worlds.fractionPlatform;
  assert.ok(fp2, 'Fase 2 do Rio deve ter plataforma de fração');

  const p4 = Worlds.pieces.find((p) => !p.shadow && p.value === 4);
  const p2a = Worlds.pieces.find((p) => !p.shadow && p.id === 'ri2_1_a2a');
  const p2b = Worlds.pieces.find((p) => !p.shadow && p.id === 'ri2_1_a2b');

  // Inserir p4 no topo
  p4.x = fp2.x;
  p4.y = fp2.topY;
  Worlds.checkPieceDrop(p4);
  assert.equal(fp2.glowing, false, 'Topo tem 4 e fundo tem 0 -> não deve brilhar');

  // Inserir p2a no fundo
  p2a.x = fp2.x;
  p2a.y = fp2.bottomY;
  Worlds.checkPieceDrop(p2a);
  assert.equal(fp2.glowing, false, 'Topo tem 4 e fundo tem 2 -> não deve brilhar');

  // Inserir p2b no fundo (totalizando 2 + 2 = 4)
  p2b.x = fp2.x;
  p2b.y = fp2.bottomY;
  Worlds.checkPieceDrop(p2b);
  assert.equal(fp2.topSum, 4);
  assert.equal(fp2.bottomSum, 4);
  assert.equal(fp2.glowing, true, 'Valores totais iguais (4 / (2+2) = 4/4) ativam o brilho mesmo com números desiguais de peças');

  Worlds.triggerFractionDivide();
  const unitFrom4 = Worlds.pieces.find((p) => !p.shadow && !p.broken && p.value === 1);
  assert.ok(unitFrom4, '4/4 deve produzir cristal purificado de valor 1');

  // ============================================================================
  // 3. Minigame Melódico Simon-Says (Nó 15 / Fase 5 do Rio):
  //    - 5 cristais musicais flutuando na água
  //    - Melodia gradual em 5 rodadas (1 a 5 notas)
  //    - Demonstração visual e sonora
  //    - Erro toca som dissonante, vibra cristal e exibe diálogo da Guardiã Irecê
  //    - Sucesso avança rodadas e conclui a restauração do Mundo do Rio
  // ============================================================================
  Worlds.startByCampaignNode(15);
  Worlds.running = false;
  E.DialogueBox.close();
  E.TutorialModal.close();

  assert.equal(Worlds.worldKey, 'river');
  assert.equal(Worlds.currentLevel, 5);
  assert.ok(Worlds.riverMelody, 'Fase 5 do Rio deve inicializar o minigame melódico');

  const rm = Worlds.riverMelody;
  assert.equal(rm.crystals.length, 5, 'Devem existir 5 cristais sonoros');
  assert.deepEqual(rm.crystals.map((c) => c.type), ['aqua', 'emerald', 'citrine', 'opal', 'rose']);
  assert.equal(rm.roundIndex, 0, 'Inicia na rodada 1 (índice 0, 1 nota)');

  // Simular fim da demonstração da rodada 1
  Worlds.phase = 'river_melody_game';
  rm.phase = 'demo';
  rm.demoTimer = 0;
  Worlds.update(0.1);
  assert.equal(rm.crystals[0].liftY, 14, 'Nota da demonstração deve elevar o cristal');
  assert.equal(rm.crystals[0].glowing, true);

  rm.demoTimer = 0;
  Worlds.update(0.1);
  assert.equal(rm.phase, 'player_input', 'Após a demonstração, deve passar a vez para a entrada do jogador');

  // Testar clique errado: na Rodada 1 a nota correta é 0. Clicar em 3 deve disparar erro
  let fairyDiscordPlayed = false;
  globalThis.CrystalAudio.errorFairy = () => { fairyDiscordPlayed = true; };
  const wrongClick = Worlds.clickRiverMelodyCrystal(3);
  assert.equal(wrongClick, false, 'Clique incorreto deve retornar false');
  assert.equal(fairyDiscordPlayed, true, 'Deve tocar acorde dissonante de erro');
  assert.ok(rm.crystals[3].shakeTimer > 0, 'Cristal clicado errado deve tremer');
  assert.equal(E.DialogueBox.isOpen, true, 'Deve abrir diálogo de Irecê ao errar');
  assert.equal(E.DialogueBox.queue[0].speaker, 'Irecê');
  assert.equal(E.DialogueBox.queue[0].text, 'Que pena... você errou dessa vez... mas não se preocupe, pode tentar de novo!');

  // Ao fechar diálogo de erro, o jogo reinicia a ordem daquela rodada
  while (E.DialogueBox.isOpen) {
    E.DialogueBox.advance();
  }
  assert.equal(rm.phase, 'demo', 'Reinicia para demonstração no início da ordem');
  assert.equal(rm.playerIndex, 0);

  // Simular acerto da Rodada 1 (sequência de 1 nota: [0])
  rm.phase = 'player_input';
  let notePlayed = -1;
  globalThis.CrystalAudio.playRiverNote = (idx) => { notePlayed = idx; };
  const correctClick = Worlds.clickRiverMelodyCrystal(0);
  assert.equal(correctClick, true, 'Clique correto deve retornar true');
  assert.equal(notePlayed, 0, 'Deve tocar a nota C5 (índice 0)');
  assert.equal(rm.phase, 'success_pause', 'Acertar a sequência deve concluir a rodada');

  // Modo Calmo: acessibilidade sem penalidade
  assert.equal(rm.calmMode, false);
  rm.calmMode = true;
  assert.equal(rm.calmMode, true, 'Modo Calmo pode ser ativado a qualquer momento');

  // Vitória completa das 5 rodadas
  Worlds.setupRiverMelodyRound(4); // Rodada 5 (5 notas)
  rm.phase = 'player_input';
  assert.equal(rm.roundIndex, 4);

  // Clicar as 5 notas da masterSequence: [0, 2, 1, 3, 4]
  for (const expectedNote of [0, 2, 1, 3, 4]) {
    assert.equal(Worlds.clickRiverMelodyCrystal(expectedNote), true);
  }

  // Finalizar vitória
  Worlds.finishRiverMelodyVictory();
  assert.equal(E.DialogueBox.sockets.river, true, 'Turmalina do Rio deve ser acesa na vitória');
  assert.equal(E.DialogueBox.isOpen, true, 'Diálogo de Irecê deve abrir na vitória');
  while (E.DialogueBox.isOpen) {
    E.DialogueBox.advance();
  }
  assert.equal(Worlds.phase, 'world_celebrate_complete', 'Deve entrar na celebração final do Mundo 3');

  // ============================================================================
  // 4. Verificação Estrita do Flutuar da Ordem e Descida ("enquanto os cristais
  //    estiverem tocando eles irão ficar flutuando criando a ordem e após isso eles descem"):
  // ============================================================================
  Worlds.setupRiverMelodyRound(1); // 2 notas: [0, 2]
  Worlds.phase = 'river_melody_game';
  rm.demoTimer = 0;
  // Nota 1 (índice 0): cristal 0 flutua e recebe badge 1
  Worlds.update(0.1);
  assert.equal(rm.crystals[0].floating, true);
  assert.equal(rm.crystals[0].liftY, 14);
  assert.equal(rm.crystals[0].orderStep, 1);

  // Nota 2 (índice 2): cristal 2 flutua com badge 2, e cristal 0 CONTINUA FLUTUANDO criando a ordem
  rm.demoTimer = 0;
  Worlds.update(0.1);
  assert.equal(rm.crystals[0].floating, true, 'Cristal 0 deve permanecer flutuando');
  assert.equal(rm.crystals[0].liftY, 14, 'Cristal 0 não deve ter caído prematuramente');
  assert.equal(rm.crystals[2].floating, true);
  assert.equal(rm.crystals[2].liftY, 14);
  assert.equal(rm.crystals[2].orderStep, 2);

  // Fim da demonstração da rodada: após isso eles descem!
  rm.demoTimer = 0;
  Worlds.update(0.1);
  assert.equal(rm.phase, 'player_input');
  assert.equal(rm.crystals[0].floating, false, 'Cristais devem parar de flutuar após o fim da demonstração');
  assert.equal(rm.crystals[2].floating, false);

  // Ao simular alguns frames de descida, a elevação deve cair em direção a 0
  Worlds.update(0.5);
  assert.ok(rm.crystals[0].liftY < 14, 'Cristais devem descer suavemente de volta à água');

  // ============================================================================
  // 4.1. Validação de Hitbox e Cliques (R1 e R2 - Sinfonia das Águas / Fase 15):
  //    - Detecção no topo, centro, corpo, base e extensões visuais (anel de brilho, indicador calmo)
  //    - Rejeição estrita em vãos, áreas vazias e fora dos limites
  //    - Robustez contra dados nulos, indefinidos ou NaN
  //    - Garantia de que cliques em áreas vazias não disparam som nem estado de erro
  // ============================================================================
  const c0 = rm.crystals[0]; // Aqua em x=76, baseY=110
  c0.liftY = 0;
  // Acertos em qualquer ponto visível do cristal:
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 110), true, 'Centro do cristal deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 95), true, 'Topo visível do cristal deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 90), true, 'Extremidade superior do cristal deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 88), true, 'Borda superior do anel de brilho/aura deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 105), true, 'Corpo do cristal deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 120), true, 'Base do cristal deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 125), true, 'Indicador visual do Modo Calmo abaixo do cristal deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 126), true, 'Extensão inferior do indicador de Modo Calmo deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76 + 12, 110), true, 'Lateral direita dentro do corpo deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76 - 12, 110), true, 'Lateral esquerda dentro do corpo deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76 + 13, 110), true, 'Limite exato da largura direita deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76 - 13, 110), true, 'Limite exato da largura esquerda deve registrar acerto');

  // Cristal suspenso/flutuando (liftY = 14):
  c0.liftY = 14;
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 96), true, 'Centro do cristal elevado deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 80), true, 'Topo do cristal elevado deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 75), true, 'Topo do distintivo numérico de ordem deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 74), true, 'Borda superior da aura elevada deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 110), true, 'Posição base do cristal elevado deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 120), true, 'Base física do cristal elevado deve registrar acerto');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 73), false, 'Acima do topo elevado deve retornar false');
  c0.liftY = 0;

  // Cliques fora do cristal / áreas vazias:
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76 + 14, 110), false, '1px além da largura direita não deve registrar');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76 - 14, 110), false, '1px além da largura esquerda não deve registrar');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76 + 15, 110), false, 'Fora da largura do cristal não deve registrar');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76 - 15, 110), false, 'Fora da largura do cristal não deve registrar');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 80), false, 'Muito acima do cristal em repouso não deve registrar');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 128), false, 'Na faixa do pergaminho inferior (y=128) não deve registrar como cristal');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 130), false, 'Abaixo da base (área vazia) não deve registrar');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 65), false, 'Clique bem acima do cristal deve retornar false');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, 140), false, 'Clique bem abaixo da água deve retornar false');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 97, 110), false, 'Clique no vão vazio entre c0 e c1 deve retornar false');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 20, 30), false, 'Clique no céu/cenário deve retornar false');

  // Robustez de tipos inválidos ou incompletos:
  assert.equal(Worlds.isInsideRiverMelodyCrystal(null, 76, 110), false, 'Cristal nulo deve retornar false');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(undefined, 76, 110), false, 'Cristal indefinido deve retornar false');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, NaN, 110), false, 'Coordenada X NaN deve retornar false');
  assert.equal(Worlds.isInsideRiverMelodyCrystal(c0, 76, NaN), false, 'Coordenada Y NaN deve retornar false');
  assert.equal(Worlds.isInsideRiverMelodyCrystal({}, 76, 110), false, 'Objeto sem coordenadas deve retornar false');

  // ============================================================================
  // 4.2. Neutralização de Cliques Vazios na Lógica de Entrada (R2):
  //    - Cliques fora dos cristais não chamam clickRiverMelodyCrystal nem tocam erro
  // ============================================================================
  Worlds.setupRiverMelodyRound(0);
  rm.phase = 'player_input';
  let accidentalErrorCount = 0;
  let playedNote = null;
  globalThis.CrystalAudio.errorFairy = () => { accidentalErrorCount++; };
  globalThis.CrystalAudio.playRiverNote = (idx) => { playedNote = idx; };

  // Cliques vazios em diferentes posições (vão, água, céu, pergaminho):
  const emptyCoords = [
    { x: 97, y: 110, desc: 'vão entre cristais' },
    { x: 139, y: 110, desc: 'vão entre c1 e c2' },
    { x: 20, y: 30, desc: 'céu/cenário' },
    { x: 160, y: 135, desc: 'pergaminho inferior' },
    { x: 76, y: 50, desc: 'muito acima do cristal 0' },
    { x: 280, y: 110, desc: 'à direita do último cristal' }
  ];

  for (const pt of emptyCoords) {
    let hitCrystal = false;
    for (let i = 0; i < rm.crystals.length; i++) {
      if (Worlds.isInsideRiverMelodyCrystal(rm.crystals[i], pt.x, pt.y)) {
        hitCrystal = true;
        Worlds.clickRiverMelodyCrystal(i);
        break;
      }
    }
    assert.equal(hitCrystal, false, `Clique em ${pt.desc} não deve atingir nenhum cristal`);
  }

  assert.equal(accidentalErrorCount, 0, 'Cliques em áreas vazias NUNCA devem tocar som ou registrar erro');
  assert.equal(rm.phase, 'player_input', 'A fase deve continuar aguardando a entrada do jogador');
  assert.equal(rm.playerIndex, 0, 'O índice do jogador não deve ser alterado por cliques vazios');
  assert.equal(E.DialogueBox.isOpen, false, 'Nenhum diálogo de erro deve abrir com cliques vazios');

  // ============================================================================
  // 5. Robustez matemática em CrystalRules.Board.fractionDivide:
  // ============================================================================
  await import('../js/rules.js');
  const rulesBoard = new globalThis.CrystalRules.Board();
  const rp1 = rulesBoard.add({ kind: 'aqua', value: 2 });
  const rp2 = rulesBoard.add({ kind: 'aqua', value: 2 });
  const rp3 = rulesBoard.add({ kind: 'aqua', value: 1, dark: true });

  assert.equal(rulesBoard.fractionDivide([], []).type, 'invalid');
  assert.equal(rulesBoard.fractionDivide(['non_existent'], ['another']).type, 'invalid');
  assert.equal(rulesBoard.fractionDivide([rp1.id], [rp3.id]).type, 'invalid', 'Peça sombria não pode ser dividida na fração pura');
  assert.equal(rulesBoard.fractionDivide([rp1.id], [rp2.id]).type, 'divided', '2/2 deve dividir perfeitamente');
});

test('Fase Especial da Floresta (Nó 10): Mecânica Fruit Ninja em 4 Etapas, Vinhetas Card 1 e 2, Combos X2/X3/X4 e Cristais Sombrios', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');
  await import('../js/audio.js');
  await import('../js/test-harness.js');

  const Worlds = globalThis.TruePixelWorlds;
  const E = globalThis.TruePixelEngine;
  assert.ok(Worlds, 'TruePixelWorlds deve existir');

  // 1. Inicia Fase Especial da Floresta pelo Nó 10
  Worlds.startByCampaignNode(10);
  Worlds.running = false;
  E.DialogueBox.close();
  E.TutorialModal.close();

  assert.equal(Worlds.worldKey, 'forest');
  assert.equal(Worlds.currentLevel, 5, 'Nó 10 deve carregar a Fase 5 (Fase Especial da Floresta)');
  assert.equal(Worlds.phase, 'forest_ninja_vignette', 'Deve abrir na vinheta preparatória da mecânica');
  assert.ok(Worlds.forestNinja, 'forestNinja deve estar inicializado');

  const fn = Worlds.forestNinja;
  assert.equal(fn.vignetteCard, 1, 'Card 1 deve ser a apresentação/vídeo explicativo');
  assert.equal(fn.currentStage, 1);
  assert.equal(fn.totalStages, 4, 'Devem existir 4 etapas');
  assert.equal(fn.stageDuration, 30.0, 'Cada etapa deve ter em torno de 30 segundos');
  assert.equal(fn.maxStrikes, 3, 'Tolerância máxima de 3 cortes em cristais sombrios');

  // 2. Card 1 (Vídeo demonstrativo): avança o tempo de demonstração sem erros
  Worlds.update(0.2);
  assert.ok(fn.vignettePracticeTime > 0, 'Tempo de animação do vídeo deve avançar');

  // Clica no botão "Praticar Corte >" (x: 240, y: 155) para avançar para o Card 2
  const card1BtnClicked = Worlds.handleForestNinjaVignetteClick(240, 155);
  assert.equal(card1BtnClicked, true, 'Clique em Praticar Corte deve ser aceito');
  assert.equal(fn.vignetteCard, 2, 'Deve avançar para Card 2 (Treino Livre)');

  // 3. Card 2 (Oportunidade de testar / Treino Livre):
  Worlds.spawnForestNinjaWave(true);
  assert.ok(fn.practiceCrystals.length >= 1, 'Treino deve ter cristais no ar');

  // Pratica corte de um cristal puro
  const testPure = fn.practiceCrystals.find(c => !c.shadow);
  assert.ok(testPure, 'Deve haver cristal puro no treino');
  const sliceRes = Worlds.sliceForestCrystal(testPure, true);
  assert.equal(sliceRes, true, 'Corte de cristal puro no treino deve ter sucesso');
  assert.equal(fn.practiceHalves.length, 2, 'Cristal puro cortado deve se dividir em 2 metades');

  // Pratica combo cortando outro cristal no mesmo golpe
  const testPure2 = { x: 160, y: 80, vx: 0, vy: 0, rot: 0, vrot: 0, type: 'emerald', shadow: false, radius: 13, value: 2, sliced: false };
  Worlds.sliceForestCrystal(testPure2, true);
  assert.equal(fn.activeComboBanner?.text, 'COMBO X2!', 'Deve exibir COMBO X2! ao cortar 2 cristais');

  // Botão "< Vídeo" volta para Card 1 e "Praticar Corte >" retorna para Card 2
  Worlds.handleForestNinjaVignetteClick(50, 155);
  assert.equal(fn.vignetteCard, 1);
  Worlds.handleForestNinjaVignetteClick(240, 155);
  assert.equal(fn.vignetteCard, 2);

  // Iniciar Desafio ao vivo a partir do Card 2 (botão "Iniciar Desafio! ⚔" em x: 240, y: 155)
  Worlds.handleForestNinjaVignetteClick(240, 155);
  assert.equal(Worlds.phase, 'forest_ninja_game', 'Deve entrar no jogo oficial de corte');
  assert.equal(fn.currentStage, 1, 'Inicia na Etapa 1');
  assert.equal(fn.stageTimeRemaining, 30.0, 'Tempo inicial deve ser 30 segundos');
  assert.equal(fn.strikes, 0);

  // ============================================================================
  // 4. Etapa 1: Focada na mecânica normal de cortar (APENAS cristais puros)
  // ============================================================================
  Worlds.spawnForestNinjaWave(false);
  assert.ok(fn.flyingCrystals.length >= 1, 'Devem surgir cristais no ar');
  assert.ok(fn.flyingCrystals.every(c => !c.shadow), 'Etapa 1 NÃO deve conter cristais sombrios');

  // Validação física: nenhum cristal ultrapassa o topo da tela
  for (const c of fn.flyingCrystals) {
    const apexH = c.y - (c.vy * c.vy) / (2 * 135);
    assert.ok(apexH >= 20, 'Cristal arremessado NUNCA deve ultrapassar o topo da tela');
  }

  // Corta 3 cristais em sequência num mesmo golpe para testar combos
  fn.strokePureCuts = 0;
  fn.strokeCrystals = [];
  const c1 = { x: 100, y: 80, vx: 10, vy: -50, rot: 0, vrot: 0, type: 'white', shadow: false, radius: 13, value: 2, sliced: false };
  const c2 = { x: 140, y: 70, vx: 5, vy: -60, rot: 0, vrot: 0, type: 'emerald', shadow: false, radius: 13, value: 2, sliced: false };
  const c3 = { x: 180, y: 65, vx: -5, vy: -60, rot: 0, vrot: 0, type: 'citrine', shadow: false, radius: 13, value: 2, sliced: false };

  Worlds.sliceForestCrystal(c1, false);
  assert.equal(fn.pureCuts, 1);
  assert.equal(fn.activeComboBanner, null, '1 corte não ativa combo');

  Worlds.sliceForestCrystal(c2, false);
  assert.equal(fn.pureCuts, 2);
  assert.equal(fn.activeComboBanner?.text, 'COMBO X2!', '2 cortes devem exibir COMBO X2!');

  Worlds.sliceForestCrystal(c3, false);
  assert.equal(fn.pureCuts, 3);
  assert.equal(fn.activeComboBanner?.text, 'COMBO X3!', '3 cortes devem exibir COMBO X3!');
  assert.equal(fn.maxCombo, 3);

  // Avança o tempo da Etapa 1 até os 30s se esgotarem -> avança para Etapa 2
  fn.stageTimeRemaining = 0.1;
  Worlds.update(0.2);
  assert.equal(fn.currentStage, 2, 'Ao findar 30s da Etapa 1, deve avançar para Etapa 2');
  assert.equal(fn.stageTimeRemaining, 30.0, 'Etapa 2 reinicia o cronômetro em 30 segundos');
  assert.equal(fn.strikes, 0);

  // ============================================================================
  // 5. Etapa 2: Introduz cristais sombrios (penalidade de -2s ao cortar, sem reset)
  // ============================================================================
  Worlds.spawnForestNinjaWave(false);
  assert.ok(fn.flyingCrystals.some(c => c.shadow), 'Etapa 2 DEVE conter cristais sombrios');

  // Simula cortes em cristais sombrios: apenas penaliza subtraindo 2 segundos, sem resetar a etapa
  const shadow1 = { x: 120, y: 90, vx: 0, vy: -40, rot: 0, vrot: 0, type: 'shadow_bomb', shadow: true, radius: 13, value: 1, sliced: false };
  Worlds.sliceForestCrystal(shadow1, false);
  assert.equal(fn.strikes, 1, '1º corte em sombra contabiliza 1 strike');
  assert.equal(fn.stageTimeRemaining, 28.0, '1º corte em sombra desconta 2s do tempo restante');
  assert.equal(fn.currentStage, 2, 'Etapa 2 não reinicia');
  assert.ok(fn.floatingBanner?.text.includes('-2s'), 'Deve exibir aviso de penalidade de -2s');

  const shadow2 = { x: 150, y: 90, vx: 0, vy: -40, rot: 0, vrot: 0, type: 'shadow_bomb', shadow: true, radius: 13, value: 1, sliced: false };
  Worlds.sliceForestCrystal(shadow2, false);
  assert.equal(fn.strikes, 2, '2º corte em sombra contabiliza 2 strikes');
  assert.equal(fn.stageTimeRemaining, 26.0, '2º corte em sombra desconta mais 2s do tempo restante');

  const shadow3 = { x: 180, y: 90, vx: 0, vy: -40, rot: 0, vrot: 0, type: 'shadow_bomb', shadow: true, radius: 13, value: 1, sliced: false };
  Worlds.sliceForestCrystal(shadow3, false);
  assert.equal(fn.strikes, 3, '3º corte em sombra contabiliza 3 strikes sem reiniciar a partida');
  assert.equal(fn.stageTimeRemaining, 24.0, '3º corte em sombra desconta mais 2s (24s restantes) sem resetar para 30s');
  assert.equal(fn.currentStage, 2, 'Continua na Etapa 2 sem reset');

  // Avança Etapa 2 com sucesso após os 30s
  fn.stageTimeRemaining = 0.1;
  Worlds.update(0.2);
  assert.equal(fn.currentStage, 3, 'Deve avançar para Etapa 3');

  // ============================================================================
  // 6. Etapa 3 e Etapa 4: Adição de mais cristais sombrios a serem evitados
  // ============================================================================
  assert.equal(fn.currentStage, 3);
  assert.equal(fn.stageTimeRemaining, 30.0);
  Worlds.spawnForestNinjaWave(false);
  const stage3Shadows = fn.flyingCrystals.filter(c => c.shadow).length;
  assert.ok(stage3Shadows >= 1, 'Etapa 3 contém múltiplos cristais sombrios');

  // Avança Etapa 3 após os 30s
  fn.stageTimeRemaining = 0.1;
  Worlds.update(0.2);
  assert.equal(fn.currentStage, 4, 'Deve avançar para Etapa 4');
  assert.equal(fn.stageTimeRemaining, 30.0);

  // Etapa 4 com densidade máxima de sombras
  Worlds.spawnForestNinjaWave(false);
  const stage4Shadows = fn.flyingCrystals.filter(c => c.shadow).length;
  assert.ok(stage4Shadows >= 2, 'Etapa 4 contém densidade elevada de cristais sombrios');

  // ============================================================================
  // 7. Conclusão da Etapa 4 -> Vitória da Fase Especial e Libertação de Araci
  // ============================================================================
  fn.stageTimeRemaining = 0.1;
  Worlds.update(0.2);
  assert.equal(Worlds.phase, 'post_musical_dlg', 'Conclusão da Etapa 4 deve abrir diálogo final');
  assert.equal(E.DialogueBox.sockets.forest, true, 'Esmeralda Primordial da Floresta deve estar acesa');
  assert.equal(E.DialogueBox.isOpen, true, 'Diálogo de Araci deve estar aberto');

  // Avança diálogo até celebração final
  while (E.DialogueBox.isOpen) {
    E.DialogueBox.advance();
  }
  assert.equal(Worlds.phase, 'world_celebrate_complete', 'Deve entrar na celebração final do Mundo da Floresta');

  // Renderiza tela em True Pixel Art sem erros
  Worlds.render();
});

test('Correções de bugs: Conclusão da Caverna (botão e teclado), isolamento de áudio/música e nós visíveis no mapa', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/audio.js');
  await import('../js/true-pixel-worlds.js');
  const Cave = globalThis.CaveChapter1;
  const Worlds = globalThis.TruePixelWorlds;
  const CrystalAudio = globalThis.CrystalAudio;
  const CrystalMenuAudio = globalThis.CrystalMenuAudio;

  // 1. Verificação do Botão de Conclusão da Caverna e Teclado
  assert.ok(Cave, 'CaveChapter1 deve existir');
  Cave.init();
  Cave.phase = 'world_celebrate_complete';
  Cave.currentLevel = 5;
  Cave.running = true;

  let exitCalled = 0;
  const origForestExit = Cave.startForestExitTransition.bind(Cave);
  Cave.startForestExitTransition = () => {
    exitCalled++;
    origForestExit();
  };

  // Aciona transição de saída para a Floresta
  Cave.startForestExitTransition();
  assert.equal(Cave.phase, 'walk_to_forest_exit', 'Fase deve transicionar para walk_to_forest_exit');
  assert.equal(Cave.protag.state, 'walk', 'Protagonista deve assumir estado de caminhada');

  // Avança tempo da transição walk_to_forest_exit -> inicia Iris Out
  Cave.update(0.5);
  assert.equal(Cave._forestExitIrisStarted, true, 'Iris Out de transição para Floresta deve ter sido iniciado');

  // 2. Isolamento de Áudio e Prevenção de Músicas Sobrepostas
  assert.ok(CrystalAudio, 'CrystalAudio deve existir');
  assert.equal(typeof CrystalAudio.stopAllMusic, 'function', 'CrystalAudio.stopAllMusic deve ser uma função');

  let stoppedTracks = [];
  const track1 = { pause() { stoppedTracks.push('caveMusic'); } };
  const track2 = { pause() { stoppedTracks.push('worldsRegular'); } };
  const track3 = { pause() { stoppedTracks.push('worldsSpecial'); } };

  Cave.musicAudio = track1;
  Worlds.regularAudio = track2;
  Worlds.musicAudio = track3;

  CrystalAudio.stopAllMusic(track2);
  assert.deepEqual(stoppedTracks, ['caveMusic', 'worldsSpecial'], 'stopAllMusic deve parar todas as faixas exceto a exceção');

  // Verifica que CrystalMenuAudio não toca fora da tela inicial
  globalThis.document.body.dataset.screen = 'game';
  let menuPlayed = false;
  if (CrystalMenuAudio.audio) {
    CrystalMenuAudio.audio.play = () => { menuPlayed = true; return Promise.resolve(); };
  }
  CrystalMenuAudio.play();
  assert.equal(menuPlayed, false, 'CrystalMenuAudio não deve tocar quando tela !== home');

  // Verifica exclusividade mútua no TruePixelWorlds
  Worlds.worldKey = 'forest';
  let specialPaused = false;
  let regularPaused = false;

  Worlds.regularAudio = new Audio('assets/audio/musica-floresta-fases.mp3');
  Worlds.regularAudio._src = 'assets/audio/musica-floresta-fases.mp3';
  Worlds.regularAudio.pause = () => { regularPaused = true; };

  Worlds.playSpecialBgm();
  assert.equal(regularPaused, true, 'playSpecialBgm deve pausar regularAudio');

  // Worlds.musicAudio agora é a faixa especial ativa
  assert.ok(Worlds.musicAudio, 'musicAudio especial deve estar instanciado');
  Worlds.musicAudio.pause = () => { specialPaused = true; };

  Worlds.playRegularBgm();
  assert.equal(specialPaused, true, 'playRegularBgm deve pausar musicAudio especial');

  // 3. Verificação de Visibilidade dos Nós do Mapa (.journey-node)
  const { readFileSync } = await import('node:fs');
  const css = readFileSync('css/journey.css', 'utf8');
  assert.ok(!css.includes('border: 2px solid transparent; background: transparent;'), 'Nós do mapa não podem ter estilos invisíveis transparentes');
  assert.ok(css.includes('.journey-node{position:absolute;') && css.includes('radial-gradient'), 'Nós do mapa devem ter gradiente visível');
  assert.ok(css.includes('#a87ffb'), 'Nós do mapa devem usar borda roxa luminosa');
  assert.ok(css.includes('.journey-node:before'), 'Nós do mapa devem exibir número da fase');
  assert.ok(css.includes('.journey-node.done:after'), 'Fases concluídas devem exibir marcador de check');
});

test('Revisão Geral: Mobile/Touch, Volume 50%, Fases 9/10, Círculo Fases 13/14, Fase 15 (1s ref) e Caatinga (Nó 19 vs 20 + 1s Opala)', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/audio.js');
  await import('../js/journey-map.js');
  await import('../js/true-pixel-worlds.js');

  const E = globalThis.TruePixelEngine;
  const Worlds = globalThis.TruePixelWorlds;
  const CrystalAudio = globalThis.CrystalAudio;
  const CrystalMenuAudio = globalThis.CrystalMenuAudio;

  // 1. Volume padrão 50% (0.5) e correção do bug de mudo ao mover slider na tela inicial
  assert.equal(CrystalAudio.getVolume(), 0.5, 'Volume inicial do CrystalAudio deve ser 50% (0.5)');
  assert.equal(E.GameHUD.musicVol, 50, 'Volume inicial de música do HUD deve ser 50%');
  globalThis.document.body.dataset.screen = 'home';
  CrystalMenuAudio.setVolume(0);
  CrystalMenuAudio.setVolume(0.5);
  assert.equal(CrystalAudio.isMuted(), false, 'Ajustar o volume acima de 0 deve retirar o estado de mudo');

  // 2. Floresta: Fase 9 (level 4) é puzzle padrão; Fase 10 (level 5) tem o clímax da fada e minigame de corte
  Worlds.startByCampaignNode(9);
  Worlds.running = false;
  assert.equal(Worlds.worldKey, 'forest');
  assert.equal(Worlds.currentLevel, 4);
  assert.equal(Worlds.isWorldFinale(), false, 'Fase 9 (Floresta 4) deve ser uma fase normal sem resgate da fada');

  Worlds.startByCampaignNode(10);
  Worlds.running = false;
  assert.equal(Worlds.worldKey, 'forest');
  assert.equal(Worlds.currentLevel, 5);
  assert.equal(Worlds.isWorldFinale(), true, 'Fase 10 (Floresta 5) deve concentrar o resgate da fada e minigame de corte');
  assert.ok(Worlds.forestNinja, 'Fase 10 deve inicializar o minigame de corte');

  // 3. Rio Fases 13 (etapa 2) e 14 (etapa 2): criação do círculo/parênteses (pureEquation)
  for (const [nodeId, levelNum] of [[13, 3], [14, 4]]) {
    Worlds.startByCampaignNode(nodeId);
    Worlds.running = false;
    E.DialogueBox.close();
    E.TutorialModal.close();
    Worlds.phase = 'gameplay';
    Worlds.setupStep(2);
    assert.equal(Worlds.currentLevel, levelNum);
    assert.ok(Worlds.pureEquation, `Fase ${nodeId} (etapa 2) deve disponibilizar pureEquation`);

    // Mesmo se pureEquation for recriado ao arrastar dois cristais puros de cores distintas, deve agrupar
    Worlds.pureEquation = null;
    const pWhite = Worlds.pieces.find((p) => !p.shadow && p.type === 'white');
    const pAqua = Worlds.pieces.find((p) => !p.shadow && p.type === 'aqua' && !p.inFraction);
    assert.ok(pWhite && pAqua, `Fase ${nodeId} (etapa 2) deve ter cristais white e aqua puros`);
    pWhite.x = pAqua.x + 8;
    pWhite.y = pAqua.y;
    Worlds.checkPieceDrop(pWhite);
    assert.ok(Worlds.pureEquation && !Worlds.pureEquation.broken, `Fase ${nodeId} (etapa 2) deve formar o agrupador pureEquation`);
    assert.equal(pWhite.inEquation, 'pure');
    assert.equal(pAqua.inEquation, 'pure');
  }

  // 4. Fase 15 (Minigame do Rio): Tutorial antes da interação + pausa de 1 segundo no cristal de referência
  Worlds.startByCampaignNode(15);
  Worlds.running = false;
  assert.equal(E.TutorialModal.isOpen, true, 'Fase 15 deve exibir janela de tutorial antes da interação');
  while (E.TutorialModal.isOpen) E.TutorialModal.nextStep();
  assert.equal(Worlds.phase, 'river_melody_game');
  assert.equal(Worlds.riverMelody.demoTimer, 1.0, 'Fase 15 deve ter pausa inicial de 1 segundo antes das ações');
  assert.equal(Worlds.riverMelody.crystals[0].isReference, true, 'Cristal de referência deve estar destacado na pausa inicial');

  // 5. Caatinga: Nó 19 (quebra de parede) separado do Nó 20 (sala do minigame final) + 1s revelando Opala
  Worlds.startByCampaignNode(19);
  Worlds.running = false;
  assert.equal(Worlds.worldKey, 'caatinga');
  assert.equal(Worlds.currentLevel, 4);
  assert.equal(Worlds.isWorldFinale(), false, 'Nó 19 deve ser fase normal de quebra de parede');

  Worlds.startByCampaignNode(20);
  Worlds.running = false;
  assert.equal(Worlds.worldKey, 'caatinga');
  assert.equal(Worlds.currentLevel, 5);
  assert.equal(Worlds.isWorldFinale(), true, 'Nó 20 deve ser a sala exclusiva do minigame final da Caatinga');
  assert.equal(E.TutorialModal.isOpen, true, 'Minigame das Cúpulas deve abrir tutorial claro antes da rodada');
  while (E.TutorialModal.isOpen) E.TutorialModal.nextStep();
  assert.equal(Worlds.phase, 'shell_game_show');
  Worlds.updateShellGame(0.9);
  assert.equal(Worlds.shellGame.cups[0].liftY, 18, 'Durante o 1º segundo (0.9s), a cúpula deve permanecer erguida revelando a Opala');
  Worlds.updateShellGame(0.65);
  assert.equal(Worlds.phase, 'shell_game_shuffle', 'Após 1.5s, as cúpulas abaixam e iniciam o embaralhamento');
});

test('Transição em Círculo em Reverso ao concluir fase especial e retornar para o mapa', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');

  const Cave = globalThis.CaveChapter1;
  const Worlds = globalThis.TruePixelWorlds;
  const E = globalThis.TruePixelEngine;

  let currentScreen = 'game';
  let syncedIds = null;
  globalThis.CrystalApp = {
    syncProgress(ids, cur) { syncedIds = ids; },
    goto(screen) {
      currentScreen = screen;
      globalThis.document.body.dataset.screen = screen;
      if (screen !== 'game') {
        Cave.deactivateCanvas();
        Worlds.deactivateCanvas();
      }
      const homeSec = globalThis.document.getElementById('home');
      const gameSec = globalThis.document.getElementById('game');
      const mapSec = globalThis.document.getElementById('map');
      if (homeSec) homeSec.hidden = screen !== 'home';
      if (gameSec) gameSec.hidden = screen !== 'game';
      if (mapSec) mapSec.hidden = screen !== 'map';
    }
  };

  // 1. Validação da Caverna (Fase 5 Especial):
  Cave.init();
  Cave.currentLevel = 5;
  Cave.phase = 'world_celebrate_complete';
  Cave.running = true;

  // Inicia saída da Caverna
  Cave.startForestExitTransition();
  assert.equal(Cave.phase, 'walk_to_forest_exit');
  assert.equal(Cave.protag.state, 'walk');

  // Avança até início do Iris Out
  Cave.update(0.5);
  assert.equal(Cave._forestExitIrisStarted, true);
  assert.equal(E.IrisTransition.active, true);
  assert.equal(E.IrisTransition.mode, 'out');

  // Conclui o Iris Out fechando a tela (0.85s de duração)
  Cave.update(0.9);
  assert.equal(currentScreen, 'map', 'Deve transicionar a tela para map');
  assert.equal(Cave.phase, 'map_iris_in', 'Deve engajar a fase map_iris_in');
  assert.equal(Cave.running, true, 'Loop deve permanecer ativo renderizando a transição sobre o mapa');
  assert.equal(E.IrisTransition.active, true, 'IrisTransition deve estar ativa');
  assert.equal(E.IrisTransition.mode, 'in', 'Deve executar o efeito em reverso (mode in) revelando o mapa suavemente');
  assert.equal(E.IrisTransition.duration, 0.95, 'Duração padrão suave de 0.95s');

  const mapEl = globalThis.document.getElementById('map');
  assert.equal(mapEl.classList.contains('iris-entering'), true, 'Elemento #map deve conter a classe iris-entering');

  // Executa renderização durante map_iris_in para garantir zero erros de render
  let drawnSpans = [];
  const fakeCtx = {
    fillStyle: '',
    setTransform() {},
    clearRect() {},
    fillRect(x, y, w, h) {
      drawnSpans.push({ color: this.fillStyle, x, y, w, h });
    }
  };
  Cave.ctx = fakeCtx;
  Cave.render();
  assert.ok(drawnSpans.length > 0, 'Deve desenhar spans horizontais de transição True Pixel');
  assert.ok(drawnSpans.every(s => s.color === '#05030f' || s.color === '#3fc6f0'), 'Cores da transição devem ser a máscara escura e o dithering azul ciano');

  // Avança até a conclusão do Iris In
  Cave.update(1.0);
  assert.equal(Cave.running, false, 'Canvas da Caverna deve ser desativado após concluir');
  assert.equal(Cave.phase, 'map_active');
  assert.equal(Cave._inLoop, false, '_inLoop deve ser false ao desativar');
  assert.equal(E.IrisTransition.onDone, null, 'IrisTransition.onDone deve ser limpo');
  assert.equal(mapEl.classList.contains('iris-entering'), false, 'Classe iris-entering deve ser removida ao finalizar');
  assert.equal(Cave.canvas.hidden, true);

  // 1.1 Validação de prevenção de loop duplicado (single RAF lifecycle):
  let rafCalls = 0;
  let cancelledRafs = [];
  const origRAF = globalThis.requestAnimationFrame;
  const origCAF = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = (fn) => { rafCalls++; return rafCalls; };
  globalThis.cancelAnimationFrame = (id) => { cancelledRafs.push(id); };
  Cave.running = true;
  Cave._inLoop = true;
  Cave.enterJourneyMapWithIrisIn(true);
  assert.equal(rafCalls, 0, 'enterJourneyMapWithIrisIn NÃO deve agendar RAF duplicado se já estiver dentro do loop ativo');
  assert.equal(Cave._inLoop, true, '_inLoop deve ser preservado mesmo após goto("map") chamar deactivateCanvas');
  Cave.deactivateCanvas();
  assert.equal(Cave._inLoop, false, '_inLoop deve ser false ao desativar');
  globalThis.requestAnimationFrame = origRAF;
  globalThis.cancelAnimationFrame = origCAF;

  // 2. Validação dos Mundos TruePixelWorlds (Fase 10 - Floresta Especial):
  Worlds.init();
  Worlds.currentLevel = 5; // Level 5 de Floresta = Fase 10
  Worlds.worldKey = 'forest';
  Worlds.phase = 'world_celebrate_complete';
  Worlds.running = true;

  // Atalho de teclado Space/Enter para avançar celebração do mundo
  Worlds.bindInput();
  const onKeyDown = Worlds._bound ? null : null; // já foi vinculado
  // Aciona startWorldExitTransition
  Worlds.startWorldExitTransition();
  assert.equal(Worlds.phase, 'walk_to_world_exit');
  assert.equal(Worlds.protag.state, 'walk');

  // Avança até início do Iris Out
  Worlds.update(0.5);
  assert.equal(Worlds._exitIrisStarted, true);
  assert.equal(E.IrisTransition.active, true);
  assert.equal(E.IrisTransition.mode, 'out');

  // Conclui o Iris Out (0.85s)
  Worlds.update(0.9);
  assert.equal(Worlds.phase, 'map_iris_in', 'Deve engajar map_iris_in em TruePixelWorlds');
  assert.equal(Worlds.running, true);
  assert.equal(E.IrisTransition.active, true);
  assert.equal(E.IrisTransition.mode, 'in', 'Efeito em reverso abrindo suavemente sobre o mapa');
  assert.equal(mapEl.classList.contains('iris-entering'), true);

  Worlds.ctx = fakeCtx;
  drawnSpans = [];
  Worlds.render();
  assert.ok(drawnSpans.length > 0);

  // Finaliza Iris In
  Worlds.update(1.0);
  assert.equal(Worlds.running, false);
  assert.equal(Worlds.phase, 'map_active');
  assert.equal(Worlds._inLoop, false);
  assert.equal(E.IrisTransition.onDone, null);
  assert.equal(mapEl.classList.contains('iris-entering'), false);
  assert.equal(Worlds.canvas.hidden, true);

  // 2.1 Validação de prevenção de loop duplicado em Worlds:
  rafCalls = 0;
  globalThis.requestAnimationFrame = (fn) => { rafCalls++; return rafCalls; };
  globalThis.cancelAnimationFrame = (id) => { cancelledRafs.push(id); };
  Worlds.running = true;
  Worlds._inLoop = true;
  Worlds.enterJourneyMapWithIrisIn(true);
  assert.equal(rafCalls, 0, 'Worlds.enterJourneyMapWithIrisIn NÃO deve agendar RAF duplicado se estiver dentro do loop ativo');
  assert.equal(Worlds._inLoop, true, 'Worlds._inLoop deve ser preservado mesmo após goto("map") chamar deactivateCanvas');
  Worlds.deactivateCanvas();
  assert.equal(Worlds._inLoop, false);
  globalThis.requestAnimationFrame = origRAF;
  globalThis.cancelAnimationFrame = origCAF;

  // 3. Validação de robustez contra timestamps indefinidos/NaN em Cave.loop e Worlds.loop:
  Cave.running = true;
  Cave.lastNow = undefined;
  Cave.loop(undefined);
  assert.ok(typeof Cave.lastNow === 'number' && Number.isFinite(Cave.lastNow), 'Cave.lastNow deve permanecer finito mesmo com loop(undefined)');
  Cave.deactivateCanvas();

  Worlds.running = true;
  Worlds.lastNow = undefined;
  Worlds.loop(undefined);
  assert.ok(typeof Worlds.lastNow === 'number' && Number.isFinite(Worlds.lastNow), 'Worlds.lastNow deve permanecer finito mesmo com loop(undefined)');
  Worlds.deactivateCanvas();

  // 4. Validação de bloqueio de entrada (input guards) durante map_iris_in na Caverna:
  Cave.init();
  Cave.bindInput();
  Cave.running = true;
  Cave.phase = 'map_iris_in';
  let hudClickTriggered = false;
  const origHandleClick = E.GameHUD.handleClick;
  E.GameHUD.handleClick = () => { hudClickTriggered = true; return true; };
  Cave.canvas.dispatchEvent({ type: 'pointerdown', clientX: 160, clientY: 10 });
  assert.equal(hudClickTriggered, false, 'Clicks no canvas durante map_iris_in devem ser estritamente ignorados');
  E.GameHUD.handleClick = origHandleClick;
  Cave.deactivateCanvas();

  // 5. Validação de hook de redimensionamento de janela em Worlds.ensureCanvas:
  const worldsCv = Worlds.ensureCanvas();
  assert.equal(worldsCv._resizeHooked, true, 'Worlds.ensureCanvas deve marcar _resizeHooked = true para redimensionamento de janela');
});
