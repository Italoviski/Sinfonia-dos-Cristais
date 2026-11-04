import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

function setupNodeDOM() {
  globalThis.window = globalThis;
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

    const mockElement = (tag) => ({
      tagName: tag.toUpperCase(),
      style: {},
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => false,
        contains: () => false
      },
      setAttribute: () => {},
      getAttribute: () => null,
      appendChild: (c) => c,
      append: () => {},
      remove: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      getContext: () => mockContext(),
      toDataURL: () => 'data:image/png;base64,AA==',
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 })
    });

    globalThis.document = {
      createElement: mockElement,
      getElementById: (id) => mockElement('div'),
      querySelector: () => null,
      querySelectorAll: () => [],
      body: mockElement('body'),
      addEventListener: () => {},
      removeEventListener: () => {},
      readyState: 'complete'
    };
    globalThis.document.body.dataset = {};
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

test('AssetPreloader gerencia apenas os 11 recursos ativos (8 PNGs de Menu/Mapa + 3 MP3s) existentes em disco', async () => {
  setupNodeDOM();
  await import('../js/preloader.js');
  const Preloader = globalThis.AssetPreloader;
  assert.ok(Preloader, 'AssetPreloader deve existir');
  assert.equal(Preloader.totalCount, 11, 'Deve gerenciar exatamente os 11 recursos ativos do boot');

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
    [10, 'forest', 4],
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



