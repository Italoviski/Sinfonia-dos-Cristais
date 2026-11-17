import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

function setupNodeDOM() {
  globalThis.window = globalThis;
  if (!globalThis._winListeners) {
    const winListeners = new Map();
    globalThis._winListeners = winListeners;
    globalThis.addEventListener = (evt, fn) => {
      if (!winListeners.has(evt)) winListeners.set(evt, []);
      winListeners.get(evt).push(fn);
    };
    globalThis.removeEventListener = (evt, fn) => {
      const arr = winListeners.get(evt);
      if (arr) {
        const idx = arr.indexOf(fn);
        if (idx >= 0) arr.splice(idx, 1);
      }
    };
    globalThis.dispatchEvent = (evt) => {
      const arr = winListeners.get(evt.type) || [];
      arr.forEach(fn => fn(evt));
    };
  }
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
      rotate: () => {},
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
        hidden: false,
        value: '',
        style: {
          setProperty(k, v) { this[k] = v; }
        },
        classList: {
          add: (...cls) => cls.forEach(c => classes.add(c)),
          remove: (...cls) => cls.forEach(c => classes.delete(c)),
          toggle: (c, force) => {
            if (force !== undefined) {
              if (force) { classes.add(c); return true; }
              classes.delete(c); return false;
            }
            return classes.has(c) ? (classes.delete(c), false) : (classes.add(c), true);
          },
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
      documentElement: mockElement('html'),
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
  const { DialogueBox, SpriteBank, ActorAnimator } = E;
  assert.ok(DialogueBox, 'DialogueBox deve existir');
  assert.equal(typeof DialogueBox.close, 'function', 'DialogueBox.close deve ser uma função');

  assert.ok(SpriteBank.araci && SpriteBank.irece && SpriteBank.jurema, 'Atores Hi-Bit das 3 Guardiãs devem existir');
  assert.ok(
    SpriteBank.portraits.portrait_araci && SpriteBank.portraits.portrait_irece && SpriteBank.portraits.portrait_jurema,
    'Retratos de rosto em losango das 3 Guardiãs devem existir'
  );

  for (const actorKey of ['protagonist', 'ordem', 'araci', 'irece', 'jurema']) {
    const actor = SpriteBank[actorKey];
    assert.ok(actor, `Ator ${actorKey} deve existir no SpriteBank`);
    assert.equal(actor.idle.length, 4, `${actorKey}.idle deve ter 4 quadros`);
    assert.equal(actor.walk.length, 8, `${actorKey}.walk deve ter 8 quadros`);
    assert.equal(actor.talk.length, 4, `${actorKey}.talk deve ter 4 quadros`);
    assert.equal(actor.celebrate.length, 4, `${actorKey}.celebrate deve ter 4 quadros`);
    assert.notEqual(actor.talk[0], actor.talk[1], `${actorKey}.talk deve alternar quadros de boca`);
    assert.notEqual(actor.talk[1], actor.talk[2], `${actorKey}.talk deve distinguir quadros de fala`);
    for (const st of ['idle', 'walk', 'talk', 'celebrate']) {
      for (const spr of actor[st]) {
        assert.equal(spr.width, 64, `${actorKey}.${st} deve ter largura 64`);
        assert.equal(spr.height, 64, `${actorKey}.${st} deve ter altura 64`);
        assert.equal(spr.hib, true, `${actorKey}.${st} deve ser sprite Hi-Bit`);
      }
    }
    const pSet = SpriteBank.portraits[`portrait_${actorKey}`];
    assert.ok(pSet, `portrait_${actorKey} deve existir`);
    assert.equal(pSet.idle.length, 4, `portrait_${actorKey}.idle deve ter 4 quadros`);
    assert.equal(pSet.talk.length, 4, `portrait_${actorKey}.talk deve ter 4 quadros`);
    assert.notEqual(pSet.idle[0], pSet.idle[3], `portrait_${actorKey}.idle deve conter quadro de piscar`);
    assert.notEqual(pSet.talk[0], pSet.talk[1], `portrait_${actorKey}.talk deve animar boca (quadro 1)`);
    assert.notEqual(pSet.talk[1], pSet.talk[2], `portrait_${actorKey}.talk deve animar boca (quadro 2)`);
    for (const pSt of ['idle', 'talk']) {
      for (const frame of pSet[pSt]) {
        assert.equal(frame.width, 28, `portrait_${actorKey}.${pSt} deve ter largura 28`);
        assert.equal(frame.height, 28, `portrait_${actorKey}.${pSt} deve ter altura 28`);
        assert.equal(frame._isDiamondBust, true, `portrait_${actorKey}.${pSt} deve ser busto em losango`);
      }
    }
  }

  assert.equal(SpriteBank.protagonist.fall.length, 4, 'protagonist.fall deve ter 4 quadros');
  assert.equal(SpriteBank.protagonist.recover_stand.length, 4, 'protagonist.recover_stand deve ter 4 quadros');

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

  // Enquanto a fala de Araci está sendo digitada, ActorAnimator deve sincronizar o sprite em cena com `talk`
  let drawnSpr = null;
  const spyCtx = {
    fillStyle: '#000',
    fillRect: () => {},
    drawImage: (img) => { drawnSpr = img; }
  };
  DialogueBox.charProgress = 3;
  ActorAnimator.drawActor(spyCtx, 'araci', 'idle', 100, 142, 0.25);
  assert.equal(drawnSpr, SpriteBank.araci.talk[2], 'Araci deve usar o quadro de fala enquanto DialogueBox digita sua fala');

  ActorAnimator.drawActor(spyCtx, 'protagonist', 'idle', 60, 142, 0.25);
  assert.equal(drawnSpr, SpriteBank.protagonist.idle[3], 'Protagonista deve permanecer em idle enquanto Araci fala');

  DialogueBox.charProgress = 999;
  ActorAnimator.drawActor(spyCtx, 'araci', 'idle', 100, 142, 0.25);
  assert.equal(drawnSpr, SpriteBank.araci.idle[3], 'Araci deve retornar para idle após concluir a digitação da fala');

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

  // Fase 2 (Nó 17) Etapa 1: Quadrado Elétrico aceita preenchimento direto (1º = borda, 2º = núcleo) e rejeita valores diferentes
  Worlds.startByCampaignNode(17);
  Worlds.running = false;
  E.DialogueBox.close();
  E.TutorialModal.close();
  Worlds.phase = 'gameplay';
  const sqNode = Worlds.electricShapes[0];
  assert.equal(sqNode.shape, 'square');
  const whiteP = Worlds.pieces.find((p) => !p.shadow && p.type === 'white');
  const roseP = Worlds.pieces.find((p) => !p.shadow && p.type === 'rose');
  const acceptedFirst = Worlds.tryEnterElectricShapeNode(sqNode, [roseP]);
  assert.equal(acceptedFirst, true, 'Quadrado Elétrico deve aceitar 1º cristal definindo a BORDA');
  assert.equal(sqNode.borderType, 'rose');
  assert.equal(sqNode.used, false);

  whiteP.value = 3;
  const rejectedMismatch = Worlds.tryEnterElectricShapeNode(sqNode, [whiteP]);
  assert.equal(rejectedMismatch, false, 'Quadrado Elétrico deve rejeitar 2º cristal de valor diferente do 1º');
  assert.ok(sqNode.barrierUntil > Worlds.t, 'Barreira elétrica amarela deve ativar na rejeição');

  whiteP.value = 2;
  const acceptedSecond = Worlds.tryEnterElectricShapeNode(sqNode, [whiteP]);
  assert.equal(acceptedSecond, true, 'Quadrado Elétrico deve aceitar 2º cristal de valor igual definindo o núcleo');
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
  assert.ok(fp.w >= 64, 'Largura da plataforma deve ser >= 64');
  assert.ok(fp.h >= 68, 'Altura da plataforma deve ser expandida para >= 68');
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
  assert.equal(fn.stageDuration, 20.0, 'Cada etapa deve ter 20 segundos');
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
  assert.equal(fn.stageTimeRemaining, 20.0, 'Tempo inicial deve ser 20 segundos');
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

  // Avança o tempo da Etapa 1 até os 20s se esgotarem -> avança para Etapa 2
  fn.stageTimeRemaining = 0.1;
  Worlds.update(0.2);
  assert.equal(fn.currentStage, 2, 'Ao findar 20s da Etapa 1, deve avançar para Etapa 2');
  assert.equal(fn.stageTimeRemaining, 20.0, 'Etapa 2 reinicia o cronômetro em 20 segundos');
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
  assert.equal(fn.stageTimeRemaining, 18.0, '1º corte em sombra desconta 2s do tempo restante');
  assert.equal(fn.currentStage, 2, 'Etapa 2 não reinicia');
  assert.ok(fn.floatingBanner?.text.includes('-2s'), 'Deve exibir aviso de penalidade de -2s');

  const shadow2 = { x: 150, y: 90, vx: 0, vy: -40, rot: 0, vrot: 0, type: 'shadow_bomb', shadow: true, radius: 13, value: 1, sliced: false };
  Worlds.sliceForestCrystal(shadow2, false);
  assert.equal(fn.strikes, 2, '2º corte em sombra contabiliza 2 strikes');
  assert.equal(fn.stageTimeRemaining, 16.0, '2º corte em sombra desconta mais 2s do tempo restante');

  const shadow3 = { x: 180, y: 90, vx: 0, vy: -40, rot: 0, vrot: 0, type: 'shadow_bomb', shadow: true, radius: 13, value: 1, sliced: false };
  Worlds.sliceForestCrystal(shadow3, false);
  assert.equal(fn.strikes, 3, '3º corte em sombra contabiliza 3 strikes sem reiniciar a partida');
  assert.equal(fn.stageTimeRemaining, 14.0, '3º corte em sombra desconta mais 2s (14s restantes) sem resetar para 20s');
  assert.equal(fn.currentStage, 2, 'Continua na Etapa 2 sem reset');

  // Avança Etapa 2 com sucesso após os 20s
  fn.stageTimeRemaining = 0.1;
  Worlds.update(0.2);
  assert.equal(fn.currentStage, 3, 'Deve avançar para Etapa 3');

  // ============================================================================
  // 6. Etapa 3 e Etapa 4: Adição de mais cristais sombrios a serem evitados
  // ============================================================================
  assert.equal(fn.currentStage, 3);
  assert.equal(fn.stageTimeRemaining, 20.0);
  Worlds.spawnForestNinjaWave(false);
  const stage3Shadows = fn.flyingCrystals.filter(c => c.shadow).length;
  assert.ok(stage3Shadows >= 1, 'Etapa 3 contém múltiplos cristais sombrios');

  // Avança Etapa 3 após os 20s
  fn.stageTimeRemaining = 0.1;
  Worlds.update(0.2);
  assert.equal(fn.currentStage, 4, 'Deve avançar para Etapa 4');
  assert.equal(fn.stageTimeRemaining, 20.0);

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

test('Progressão Normal, God Mode (Ctrl+Shift+G / F9), Bloqueio do Mapa na Caverna e Visibilidade do Botão Pular >>', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');
  await import('../js/campaign.js');
  await import('../js/campaign-current.js');
  await import('../js/journey-map.js');

  const E = globalThis.TruePixelEngine;
  const Cave = globalThis.CaveChapter1;
  const Worlds = globalThis.TruePixelWorlds;
  const Journey = globalThis.CrystalJourney;

  // 1. Estado inicial: God Mode desativado por padrão
  E.GameHUD.setGodMode(false);
  assert.equal(E.GameHUD.godMode, false, 'God Mode deve iniciar desativado');
  assert.equal(E.GameHUD.hasInfiniteAbilities(), false, 'Habilidades infinitas devem estar falsas fora do God Mode');

  // 2. Bloqueio do botão "Mapa" na HUD durante a Caverna (antes de concluir a Caverna)
  E.GameHUD.worldLabel = 'Caverna';
  E.DialogueBox.sockets.fairy = false;
  let mapWent = 0;
  E.GameHUD.onGoMap = () => { mapWent++; };
  assert.equal(E.GameHUD.isMapLocked(), true, 'Botão Mapa deve estar bloqueado na Caverna antes de concluí-la');

  // Clique no botão Mapa da barra superior (x: 160, y: 10) não deve abrir o mapa
  const handledTopMap = E.GameHUD.handleClick(160, 10);
  assert.equal(handledTopMap, true, 'Clique no botão Mapa bloqueado deve ser consumido pelo HUD');
  assert.equal(mapWent, 0, 'Não deve navegar para o Mapa quando bloqueado na Caverna');

  // Clique no botão "Voltar ao Mapa" dentro do menu de Pause também deve ser bloqueado
  E.GameHUD.paused = true;
  E.GameHUD.handleClick(150, 134);
  assert.equal(mapWent, 0, 'Botão Voltar ao Mapa no menu de Pause também deve respeitar o bloqueio na Caverna');
  E.GameHUD.paused = false;

  // 3. Ao ativar o God Mode, o botão "Mapa" fica desbloqueado mesmo dentro da Caverna
  E.GameHUD.toggleGodMode();
  assert.equal(E.GameHUD.godMode, true, 'toggleGodMode deve ativar o God Mode');
  assert.equal(E.GameHUD.hasInfiniteAbilities(), true, 'God Mode deve conceder cargas infinitas de habilidades');
  assert.equal(E.GameHUD.isMapLocked(), false, 'No God Mode o botão Mapa deve ficar desbloqueado na Caverna');

  E.GameHUD.handleClick(160, 10);
  assert.equal(mapWent, 1, 'No God Mode clicar em Mapa dentro da Caverna deve navegar para o Mapa');

  // Em outros mundos (ex: Floresta), o botão Mapa é desbloqueado mesmo sem God Mode
  E.GameHUD.setGodMode(false);
  E.GameHUD.worldLabel = 'Floresta';
  assert.equal(E.GameHUD.isMapLocked(), false, 'Fora da Caverna o botão Mapa deve estar desbloqueado');
  E.GameHUD.worldLabel = 'Caverna';

  // 4. Botão "Pular >>" nas fases musicais só aparece e funciona no God Mode
  Cave.init();
  Cave.currentLevel = 5;
  Cave.phase = 'musical_part1_shadows';
  Cave.running = true;

  let drawnTexts = [];
  const origFillText = Cave.ctx.fillText;
  Cave.ctx.fillText = (txt) => { drawnTexts.push(String(txt)); };

  // Com God Mode = false: não desenha "Pular >>" e clique em skipMusicalBtnRect não pula o show
  E.GameHUD.setGodMode(false);
  drawnTexts = [];
  Cave.render();
  assert.equal(drawnTexts.some(t => t.includes('Pular')), false, 'Botão Pular >> NÃO deve ser renderizado fora do God Mode na Caverna');

  let finishCalled = 0;
  const origFinish = Cave.finishMusicalShow.bind(Cave);
  Cave.finishMusicalShow = () => { finishCalled++; };
  Cave.canvas.dispatchEvent({ type: 'pointerdown', clientX: 220, clientY: 20 }); // Lógico ~(110, 10) dentro de skipMusicalBtnRect (92..150, 2..18)
  assert.equal(finishCalled, 0, 'Clique na região do botão Pular >> NÃO deve pular o show fora do God Mode');

  // Com God Mode = true: desenha "Pular >>" e clique em skipMusicalBtnRect pula o show
  E.GameHUD.setGodMode(true);
  drawnTexts = [];
  Cave.render();
  assert.equal(drawnTexts.some(t => t.includes('Pular')), true, 'Botão Pular >> DEVE ser renderizado quando God Mode está ativo');

  Cave.canvas.dispatchEvent({ type: 'pointerdown', clientX: 220, clientY: 20 });
  assert.equal(finishCalled, 1, 'Clique em Pular >> DEVE concluir o show musical quando God Mode está ativo');

  Cave.finishMusicalShow = origFinish;
  Cave.ctx.fillText = origFillText;
  Cave.deactivateCanvas();

  // Verifica também em TruePixelWorlds
  Worlds.init();
  Worlds.worldKey = 'caatinga';
  Worlds.currentLevel = 5;
  Worlds.phase = 'musical_part1_shadows';
  Worlds.running = true;

  E.GameHUD.setGodMode(false);
  let worldsFinishCalled = 0;
  const origWorldsFinish = Worlds.finishMusicalShow.bind(Worlds);
  Worlds.finishMusicalShow = () => { worldsFinishCalled++; };
  Worlds.canvas.dispatchEvent({ type: 'pointerdown', clientX: 220, clientY: 20 });
  assert.equal(worldsFinishCalled, 0, 'TruePixelWorlds não deve permitir Pular >> fora do God Mode');

  E.GameHUD.setGodMode(true);
  Worlds.canvas.dispatchEvent({ type: 'pointerdown', clientX: 220, clientY: 20 });
  assert.equal(worldsFinishCalled, 1, 'TruePixelWorlds deve permitir Pular >> no God Mode');
  Worlds.finishMusicalShow = origWorldsFinish;
  Worlds.deactivateCanvas();

  // 5. Mapa da Jornada (CrystalJourney): bloqueio real de fases fora do God Mode e desbloqueio total no God Mode
  let createdNodes = [];
  const origCreateElement = globalThis.document.createElement;
  globalThis.document.createElement = (tag) => {
    const el = origCreateElement(tag);
    if (tag === 'button') createdNodes.push(el);
    return el;
  };

  E.GameHUD.setGodMode(false);
  let startedFromMap = null;
  let lastNotified = '';
  Journey.render({
    completed: [1, 2],
    current: 3,
    unlocked: 3,
    records: {},
    reduced: true,
    godMode: false,
    start: (id) => { startedFromMap = id; },
    notify: (msg) => { lastNotified = msg; }
  });

  const node3 = createdNodes.find(b => Number(b.dataset?.level) === 3);
  const node4 = createdNodes.find(b => Number(b.dataset?.level) === 4);
  const node21 = createdNodes.find(b => Number(b.dataset?.level) === 21);
  assert.ok(node3 && node4 && node21, 'Nós 3, 4 e 21 devem ser criados no mapa');
  assert.equal(node3.classList.contains('locked'), false, 'Fase 3 (unlocked=3) deve estar desbloqueada');
  assert.equal(node4.classList.contains('locked'), true, 'Fase 4 (> unlocked) deve estar bloqueada fora do God Mode');
  assert.equal(node21.classList.contains('locked'), true, 'Fase 21 deve estar bloqueada antes de reunir as 4 gemas');

  // Clicar no nó 4 bloqueado não deve mover nem iniciar a fase, apenas notificar
  node4.onclick();
  assert.ok(lastNotified.includes('Siga as luzes'), 'Clicar em fase bloqueada deve exibir aviso pedagógico');
  assert.equal(startedFromMap, null, 'Clicar em fase bloqueada não deve iniciar nenhuma fase');

  // Com God Mode ativo, todos os nós 1..21 ficam desbloqueados
  createdNodes = [];
  E.GameHUD.setGodMode(true);
  Journey.render({
    completed: [],
    current: 1,
    unlocked: 1,
    records: {},
    reduced: true,
    godMode: true,
    start: (id) => { startedFromMap = id; },
    notify: (msg) => { lastNotified = msg; }
  });
  const gmNode15 = createdNodes.find(b => Number(b.dataset?.level) === 15);
  const gmNode21 = createdNodes.find(b => Number(b.dataset?.level) === 21);
  assert.equal(gmNode15.classList.contains('locked'), false, 'No God Mode a Fase 15 deve estar desbloqueada mesmo sem progresso');
  assert.equal(gmNode21.classList.contains('locked'), false, 'No God Mode a Fase 21 deve estar desbloqueada');

  E.GameHUD.setGodMode(false);
  globalThis.document.createElement = origCreateElement;
});

test('Prompt #02: Remoção do Botão Sair, Suporte a Fullscreen na HUD e nas Opções, e Nitidez de Renderização', async () => {
  const dom = setupNodeDOM();
  const fs = await import('fs');
  const indexHtml = fs.readFileSync('index.html', 'utf8');

  // 1. Menu Inicial: Botão Sair e Dialog Exit removidos
  assert.equal(indexHtml.includes('id="exitButton"'), false, 'Botão Sair (#exitButton) não deve existir no index.html');
  assert.equal(indexHtml.includes('id="exitDialog"'), false, 'Diálogo de saída (#exitDialog) não deve existir no index.html');

  // 2. HUD Superior: Botão de Tela Cheia posicionado ao lado do botão Mudo
  const E = globalThis.TruePixelEngine;
  assert.ok(E?.GameHUD?.buttons?.fullscreen, 'GameHUD deve exportar o botão fullscreen em buttons');
  const bFull = E.GameHUD.buttons.fullscreen;
  const bMute = E.GameHUD.buttons.mute;
  assert.ok(Math.abs(bFull.x - (bMute.x + bMute.w)) <= 6 || Math.abs(bMute.x - (bFull.x + bFull.w)) <= 6, 'Botão Fullscreen deve estar posicionado ao lado do botão de Mudo');

  // 3. Fullscreen API no GameHUD
  let requested = false;
  let exited = false;
  globalThis.document.documentElement.requestFullscreen = async () => {
    requested = true;
    globalThis.document.fullscreenElement = globalThis.document.documentElement;
  };
  globalThis.document.exitFullscreen = async () => {
    exited = true;
    globalThis.document.fullscreenElement = null;
  };
  globalThis.document.fullscreenElement = null;

  assert.equal(E.GameHUD.isFullscreen(), false, 'Inicialmente não está em tela cheia');
  // Clica no botão de tela cheia na barra superior
  const handled = E.GameHUD.handleClick(bFull.x + 2, bFull.y + 2);
  assert.equal(handled, true, 'Clique nas coordenadas do botão fullscreen deve ser tratado');
  assert.equal(requested, true, 'Clique deve requisitar fullscreen via requestFullscreen()');

  // Clica novamente para sair da tela cheia
  E.GameHUD.handleClick(bFull.x + 2, bFull.y + 2);
  assert.equal(exited, true, 'Segundo clique deve sair da tela cheia via exitFullscreen()');

  // 4. Modal de Configurações in-game deve conter o botão de Fullscreen
  assert.ok(E.GameHUD.settingsBtns.fullscreenBtn, 'Modal in-game de Configurações deve possuir fullscreenBtn');

  // 5. Menu de Opções no index.html deve conter controle de Tela Cheia
  assert.ok(indexHtml.includes('id="fullscreenToggle"') || indexHtml.includes('id="fullscreenButton"'), 'index.html deve conter botão/toggle de Tela Cheia dentro de #settingsDialog');
});

test('Prompt #03: Splash Screen da UNEB e Wizard de Configurações Rápidas (Etapa A Acessibilidade -> Etapa B Áudio e Enquadramento)', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const fs = await import('fs');
  const indexHtml = fs.readFileSync('index.html', 'utf8');

  // 1. Verificar marcação da Splash Screen da UNEB no index.html
  assert.ok(indexHtml.includes('id="unebSplashScreen"'), 'index.html deve conter #unebSplashScreen');
  assert.ok(indexHtml.includes('assets/credits/uneb-logo.png'), 'Splash Screen da UNEB deve referenciar assets/credits/uneb-logo.png');
  assert.ok(
    indexHtml.includes('Esse jogo foi feito por estudantes do curso de graduação Engenharia de Software da UNEB'),
    'Splash Screen da UNEB deve conter o texto institucional exato'
  );

  const origStorage = globalThis.localStorage;
  const origGetById = globalThis.document.getElementById;
  const origApp = globalThis.CrystalApp;
  const origOnboarding = globalThis.CrystalOnboarding;

  const storage = new Map();
  globalThis.localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k)
  };

  const elements = new Map();
  const getEl = (id) => {
    if (!elements.has(id)) {
      const el = globalThis.document.createElement('div');
      el.id = id;
      el.hidden = id !== 'home';
      el.focus = () => { globalThis.document.activeElement = el; };
      elements.set(id, el);
    }
    return elements.get(id);
  };
  globalThis.document.getElementById = (id) => getEl(id);

  try {
    // Carrega instância limpa sem save (primeiro acesso)
    await import(`../js/app.js?prompt03=${Date.now()}`);
    const App = globalThis.CrystalApp;
    const Onb = globalThis.CrystalOnboarding;

    assert.ok(Onb, 'window.CrystalOnboarding deve existir');
    assert.equal(Onb.splashActive, true, 'Splash Screen deve iniciar ativa ao abrir o site');
    assert.ok(['fade-in', 'hold', 'fade-out'].includes(Onb.splashPhase), 'splashPhase inicial deve estar em fade-in/hold/fade-out');
    assert.equal(getEl('unebSplashScreen').hidden, false, 'Splash da UNEB deve iniciar visível');

    // Conclui fade-out da Splash no primeiro acesso -> abre Wizard na Etapa A (Acessibilidade)
    Onb.finishSplash();
    assert.equal(Onb.splashActive, false, 'splashActive deve ficar false após finishSplash()');
    assert.equal(Onb.splashPhase, 'done', 'splashPhase deve ser done após finishSplash()');
    assert.equal(getEl('unebSplashScreen').hidden, true, '#unebSplashScreen deve ficar hidden após fade-out');

    assert.equal(Onb.wizardActive, true, 'Wizard de Configurações Rápidas deve abrir no primeiro acesso');
    assert.equal(Onb.wizardStep, 'access', 'Wizard deve iniciar na Etapa A (access)');
    assert.equal(getEl('setupWizardScreen').hidden, false, '#setupWizardScreen deve estar visível');
    assert.equal(getEl('wizardStepAccess').hidden, false, '#wizardStepAccess deve estar visível na Etapa A');
    assert.equal(getEl('wizardStepAudio').hidden, true, '#wizardStepAudio deve estar oculto na Etapa A');

    // Etapa A: alternar Acessibilidade e avançar para Etapa B (Áudio e Tela)
    const wizContrast = getEl('wizContrastToggle');
    const wizMotion = getEl('wizMotionToggle');
    wizContrast.onchange({ target: { checked: true } });
    wizMotion.onchange({ target: { checked: true } });
    assert.equal(App.state.settings.contrast, true, 'Alto contraste deve atualizar App.state.settings.contrast');
    assert.equal(App.state.settings.motion, true, 'Reduzir movimentos deve atualizar App.state.settings.motion');

    assert.equal(typeof getEl('wizardNextToAudioBtn').onclick, 'function', '#wizardNextToAudioBtn deve possuir handler');
    getEl('wizardNextToAudioBtn').onclick();

    assert.equal(Onb.wizardStep, 'audio', 'Avançar na Etapa A deve ir para a Etapa B (audio)');
    assert.equal(getEl('wizardStepAccess').hidden, true, '#wizardStepAccess deve ocultar ao ir para Etapa B');
    assert.equal(getEl('wizardStepAudio').hidden, false, '#wizardStepAudio deve aparecer na Etapa B');

    // Etapa B: verificar controles de volume, botões de teste de som, Tela Cheia e slider de Enquadramento
    assert.ok(indexHtml.includes('id="wizMusicVolume"'), 'index.html deve ter #wizMusicVolume');
    assert.ok(indexHtml.includes('id="wizFxVolume"'), 'index.html deve ter #wizFxVolume');
    assert.ok(indexHtml.includes('id="wizTestMusicBtn"'), 'index.html deve ter #wizTestMusicBtn');
    assert.ok(indexHtml.includes('id="wizTestSfxBtn"'), 'index.html deve ter #wizTestSfxBtn');
    assert.ok(indexHtml.includes('id="wizFullscreenBtn"'), 'index.html deve ter #wizFullscreenBtn');
    assert.ok(indexHtml.includes('id="wizFrameScale"') && indexHtml.includes('min="80"') && indexHtml.includes('max="120"') && indexHtml.includes('value="100"'), 'index.html deve ter #wizFrameScale com min=80, max=120 e value=100 (meio)');

    // Testar alteração do Enquadramento da Tela (85 retraído, 115 afastado, 100 normal)
    const scaleSlider = getEl('wizFrameScale');
    scaleSlider.oninput({ target: { value: '85' } });
    assert.equal(App.state.settings.frameScale, 0.85, 'Enquadramento à esquerda (85) deve ajustar frameScale para 0.85');
    assert.ok(getEl('wizFrameScaleValue').textContent.includes('Retraído'), 'Label deve indicar modo Retraído');

    scaleSlider.oninput({ target: { value: '115' } });
    assert.equal(App.state.settings.frameScale, 1.15, 'Enquadramento à direita (115) deve ajustar frameScale para 1.15');
    assert.ok(getEl('wizFrameScaleValue').textContent.includes('Afastado'), 'Label deve indicar modo Afastado');

    scaleSlider.oninput({ target: { value: '100' } });
    assert.equal(App.state.settings.frameScale, 1, 'Enquadramento no meio (100) deve restaurar Normal = 1.0');
    assert.ok(getEl('wizFrameScaleValue').textContent.includes('Normal'), 'Label deve indicar Normal (100%)');

    // Concluir Wizard -> salva setupCompleted: true no localStorage e prepara etapa de personagem
    getEl('wizardFinishBtn').onclick();
    assert.equal(Onb.wizardActive, false, 'wizardActive deve ficar false após concluir Wizard');
    assert.equal(Onb.wizardStep, 'character', 'wizardStep deve avançar para character (próximo passo: criação de personagem)');
    assert.equal(getEl('setupWizardScreen').hidden, true, '#setupWizardScreen deve ser ocultado ao finalizar');

    const saved = JSON.parse(storage.get('crystal-campaign-v4'));
    assert.equal(saved.setupCompleted, true, 'localStorage deve salvar setupCompleted = true');
    assert.equal(saved.settings.frameScale, 1, 'localStorage deve persistir frameScale');
    assert.equal(saved.settings.contrast, true, 'localStorage deve persistir preferências da Etapa A');
  } finally {
    globalThis.CrystalOnboarding?.skipAll?.();
    globalThis.localStorage = origStorage;
    globalThis.document.getElementById = origGetById;
    globalThis.CrystalApp = origApp;
    globalThis.CrystalOnboarding = origOnboarding;
  }
});

test('Prompt #04: Tela de Identificação da Criança (Nome e Gênero), Substituição Dinâmica de Protagonista e Transição de Carregamento para o Jogo', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const fs = await import('fs');
  const indexHtml = fs.readFileSync('index.html', 'utf8');

  // 1. HTML contém os elementos da tela de criação de personagem
  for (const id of [
    'characterCreationScreen',
    'playerNameInput',
    'playerNameError',
    'genderBoyBtn',
    'genderGirlBtn',
    'previewBoyCanvas',
    'previewGirlCanvas',
    'characterConfirmBtn'
  ]) {
    assert.ok(indexHtml.includes(`id="${id}"`), `index.html deve conter #${id}`);
  }

  // 2. SpriteBank contém ambas variantes (masculino e feminina) e seus retratos
  const E = globalThis.TruePixelEngine;
  assert.ok(E.SpriteBank.protagonist_male, 'SpriteBank.protagonist_male deve existir');
  assert.ok(E.SpriteBank.protagonist_female, 'SpriteBank.protagonist_female deve existir');
  assert.ok(E.SpriteBank.portraits.portrait_protagonist_male, 'portrait_protagonist_male deve existir');
  assert.ok(E.SpriteBank.portraits.portrait_protagonist_female, 'portrait_protagonist_female deve existir');

  for (const key of ['protagonist_male', 'protagonist_female']) {
    const actor = E.SpriteBank[key];
    assert.equal(actor.idle.length, 4, `${key}.idle deve ter 4 quadros`);
    assert.equal(actor.walk.length, 8, `${key}.walk deve ter 8 quadros`);
    assert.equal(actor.talk.length, 4, `${key}.talk deve ter 4 quadros`);
    assert.equal(actor.celebrate.length, 4, `${key}.celebrate deve ter 4 quadros`);
    assert.equal(actor.fall.length, 4, `${key}.fall deve ter 4 quadros`);
    assert.equal(actor.recover_stand.length, 4, `${key}.recover_stand deve ter 4 quadros`);
    for (const spr of actor.idle) {
      assert.equal(spr.width, 64, `${key}.idle deve ter largura 64`);
      assert.equal(spr.height, 64, `${key}.idle deve ter altura 64`);
      assert.equal(spr.hib, true, `${key}.idle deve ter hib = true`);
    }
    const pKey = key === 'protagonist_male' ? 'portrait_protagonist_male' : 'portrait_protagonist_female';
    const pSet = E.SpriteBank.portraits[pKey];
    assert.equal(pSet.idle.length, 4, `${pKey}.idle deve ter 4 quadros`);
    assert.equal(pSet.talk.length, 4, `${pKey}.talk deve ter 4 quadros`);
    for (const pf of pSet.idle) {
      assert.equal(pf.width, 28, `${pKey} deve ter largura 28`);
      assert.equal(pf.height, 28, `${pKey} deve ter altura 28`);
      assert.equal(pf._isDiamondBust, true, `${pKey} deve ser _isDiamondBust`);
    }
  }

  const origStorage = globalThis.localStorage;
  const origGetById = globalThis.document.getElementById;
  const origApp = globalThis.CrystalApp;
  const origOnboarding = globalThis.CrystalOnboarding;
  const origStartCutscene = globalThis.CaveChapter1?.startCutsceneAndFase1;
  const origAssetsReady = globalThis.CrystalAssetsReady;

  const storage = new Map();
  globalThis.localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k)
  };

  const elements = new Map();
  const getEl = (id) => {
    if (!elements.has(id)) {
      const el = globalThis.document.createElement('div');
      el.id = id;
      el.hidden = id !== 'home';
      el.focus = () => { globalThis.document.activeElement = el; };
      elements.set(id, el);
    }
    return elements.get(id);
  };
  globalThis.document.getElementById = (id) => getEl(id);
  globalThis.CrystalAssetsReady = true;

  let startedCaveFase1 = 0;
  if (globalThis.CaveChapter1) {
    globalThis.CaveChapter1.startCutsceneAndFase1 = () => { startedCaveFase1++; };
  }

  try {
    await import(`../js/app.js?prompt04=${Date.now()}`);
    const App = globalThis.CrystalApp;
    const Onb = globalThis.CrystalOnboarding;

    Onb.finishSplash();
    getEl('wizardNextToAudioBtn').onclick();
    getEl('wizardFinishBtn').onclick();

    // 3. Tela de identificação abre automaticamente após Etapa B do Wizard
    assert.equal(Onb.characterScreenActive, true, 'characterScreenActive deve ficar true após concluir Wizard');
    assert.equal(getEl('characterCreationScreen').hidden, false, '#characterCreationScreen deve ficar visível');

    // 4. Validação de nome vazio
    const nameInput = getEl('playerNameInput');
    nameInput.value = '   ';
    getEl('characterConfirmBtn').onclick();
    assert.equal(Onb.characterScreenActive, true, 'Nome vazio não deve fechar a tela de criação');
    assert.equal(getEl('playerNameError').hidden, false, '#playerNameError deve aparecer para nome vazio');

    // 5. Seleção de gênero (Menina)
    getEl('genderGirlBtn').onclick();
    assert.equal(Onb.selectedGender, 'female', 'Clicar em #genderGirlBtn deve selecionar female');
    assert.equal(getEl('genderGirlBtn').classList.contains('selected'), true, '#genderGirlBtn deve receber classe selected');
    assert.equal(getEl('genderBoyBtn').classList.contains('selected'), false, '#genderBoyBtn deve perder classe selected');

    // 6. Confirmar nome 'Sofia' + gênero 'female'
    nameInput.value = 'Sofia';
    getEl('characterConfirmBtn').onclick();
    assert.equal(Onb.characterScreenActive, false, 'Tela de personagem deve fechar após confirmação válida');
    assert.equal(getEl('characterCreationScreen').hidden, true, '#characterCreationScreen deve ficar oculto');
    assert.equal(App.state.playerName, 'Sofia', 'CrystalApp.state.playerName deve ser Sofia');
    assert.equal(App.state.playerGender, 'female', 'CrystalApp.state.playerGender deve ser female');
    assert.equal(App.state.characterCreated, true, 'CrystalApp.state.characterCreated deve ser true');

    const saved = JSON.parse(storage.get('crystal-campaign-v4'));
    assert.equal(saved.playerName, 'Sofia', 'localStorage deve salvar playerName');
    assert.equal(saved.playerGender, 'female', 'localStorage deve salvar playerGender');
    assert.equal(saved.characterCreated, true, 'localStorage deve salvar characterCreated = true');

    // 7. Substituição dinâmica no SpriteBank e DialogueBox
    assert.equal(E.SpriteBank.protagonist, E.SpriteBank.protagonist_female, 'SpriteBank.protagonist deve apontar para protagonist_female');
    assert.equal(
      E.SpriteBank.portraits.portrait_protagonist,
      E.SpriteBank.portraits.portrait_protagonist_female,
      'portrait_protagonist deve apontar para portrait_protagonist_female'
    );

    E.DialogueBox.open([{ speaker: 'Protagonista', portrait: 'portrait_protagonist', text: 'Eu sou Protagonista e vou salvar os cristais!' }]);
    assert.equal(E.DialogueBox.queue[0].speaker, 'Sofia', 'DialogueBox deve substituir speaker Protagonista pelo nome escolhido');
    assert.equal(
      E.DialogueBox.queue[0].text,
      'Eu sou Sofia e vou salvar os cristais!',
      'DialogueBox deve substituir Protagonista dentro do texto pelo nome escolhido'
    );
    E.DialogueBox.close();

    // 8. Transição para tela de carregamento e depois início do jogo
    assert.equal(Onb.wizardStep, 'loading', 'Confirmar personagem deve entrar na etapa de carregamento (loading)');
    Onb.completeLoadingTransition();
    assert.equal(App.state.screen, 'game', 'Após concluir carregamento deve iniciar o jogo');
    assert.equal(startedCaveFase1, 1, 'Deve iniciar a Fase 1 após a tela de carregamento');
  } finally {
    globalThis.CrystalOnboarding?.skipAll?.();
    E.setPlayerProfile?.({ name: 'Protagonista', gender: 'male' });
    if (globalThis.CaveChapter1 && origStartCutscene) {
      globalThis.CaveChapter1.startCutsceneAndFase1 = origStartCutscene;
    }
    globalThis.CrystalAssetsReady = origAssetsReady;
    globalThis.localStorage = origStorage;
    globalThis.document.getElementById = origGetById;
    globalThis.CrystalApp = origApp;
    globalThis.CrystalOnboarding = origOnboarding;
  }
});

test('Prompt #05: Fade-in e Offset de Áudio (Menu/Caverna), Loop Contínuo na Floresta, Vozes 8-Bit por Personagem, Recorte Losangular do Portrait e Diálogo Expandido da Ordem', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');
  await import('../js/audio.js');

  const E = globalThis.TruePixelEngine;
  const Cave = globalThis.CaveChapter1;
  const Worlds = globalThis.TruePixelWorlds;
  const CrystalAudio = globalThis.CrystalAudio;
  const CrystalMenuAudio = globalThis.CrystalMenuAudio;

  // 1. Offset inicial e Fade-in nas músicas de Menu e Caverna
  assert.equal(typeof CrystalAudio.fadeInTrack, 'function', 'CrystalAudio.fadeInTrack deve existir');
  assert.ok(CrystalMenuAudio.START_OFFSET >= 2.5, 'CrystalMenuAudio.START_OFFSET deve pular trecho silencioso inicial (>= 2.5s)');

  globalThis.document.body.dataset.screen = 'home';
  const menuTrack = CrystalMenuAudio.track;
  assert.ok(menuTrack, 'CrystalMenuAudio.track deve existir');
  menuTrack.paused = true;
  menuTrack.currentTime = 0;
  CrystalMenuAudio.setVolume(0.6);
  CrystalMenuAudio.play();
  assert.ok(menuTrack.currentTime >= CrystalMenuAudio.START_OFFSET, 'Música do Menu deve começar diretamente após o atraso inicial (START_OFFSET)');
  assert.ok(menuTrack.volume > 0 && menuTrack.volume < 0.6, 'Música do Menu deve iniciar em fade-in suave antes de atingir o volume alvo');
  CrystalMenuAudio.pause();

  // Caverna Fases 1..4: música inicia imediatamente com playRegularBgm + offset + fade-in
  assert.equal(typeof Cave.playRegularBgm, 'function', 'CaveChapter1.playRegularBgm deve existir');
  E.GameHUD.muted = false;
  E.GameHUD.musicVol = 60;
  Cave.startFase2();
  Cave.running = false;
  assert.ok(Cave.regularAudio, 'Cave.regularAudio deve ser criada ao iniciar Fase 2 da Caverna');
  assert.ok(Cave.regularAudio.currentTime >= 2.5, 'Música da Caverna deve iniciar após offset sem demora silenciosa');
  assert.ok(Cave.regularAudio.volume > 0 && Cave.regularAudio.volume <= 0.6, 'Música da Caverna deve aplicar fade-in inicial');
  Cave.deactivateCanvas();

  // 2. Loop contínuo na Floresta (sem corte seco no fim da faixa)
  assert.equal(typeof CrystalAudio.setupSeamlessLoop, 'function', 'CrystalAudio.setupSeamlessLoop deve existir');
  assert.equal(typeof CrystalAudio.checkSeamlessLoop, 'function', 'CrystalAudio.checkSeamlessLoop deve existir');
  Worlds.startByCampaignNode(6); // Floresta Fase 1
  Worlds.running = false;
  E.DialogueBox.close();
  E.TutorialModal.close();
  assert.ok(Worlds.regularAudio, 'Worlds.regularAudio deve estar instanciada na Floresta');
  assert.ok(Worlds.regularAudio._seamlessLoopConfig, 'Música da Floresta deve ter _seamlessLoopConfig configurado');
  assert.ok(Worlds.regularAudio._seamlessLoopConfig.loopStart > 0, 'loopStart da Floresta deve ser > 0');
  assert.ok(Worlds.regularAudio._seamlessLoopConfig.loopEndOffset > 0, 'loopEndOffset da Floresta deve antecipar o fim');

  Worlds.regularAudio.duration = 53.368;
  Worlds.regularAudio.currentTime = 53.1;
  Worlds.regularAudio.paused = false;
  const jumped = CrystalAudio.checkSeamlessLoop(Worlds.regularAudio);
  assert.equal(jumped, true, 'checkSeamlessLoop deve antecipar o reinício antes do corte seco final');
  assert.equal(Worlds.regularAudio.currentTime, Worlds.regularAudio._seamlessLoopConfig.loopStart, 'Ao reiniciar no loop contínuo, currentTime deve voltar suavemente para loopStart');
  Worlds.deactivateCanvas();

  // 3. Vozes 8-bit exclusivas por personagem e gatilho no DialogueBox
  assert.ok(CrystalAudio.VOICE_PROFILES, 'CrystalAudio.VOICE_PROFILES deve existir');
  assert.equal(typeof CrystalAudio.playVoiceBlip, 'function', 'CrystalAudio.playVoiceBlip deve existir');

  const requiredVoices = ['protagonist_male', 'protagonist_female', 'ordem', 'araci', 'irece', 'jurema', 'mystery'];
  const baseFreqs = new Set();
  for (const key of requiredVoices) {
    assert.ok(CrystalAudio.VOICE_PROFILES[key], `Perfil de voz 8-bit deve existir para ${key}`);
    baseFreqs.add(CrystalAudio.VOICE_PROFILES[key].baseFreq);
  }
  assert.equal(baseFreqs.size, requiredVoices.length, 'Cada personagem deve possuir frequência base 8-bit distinta');

  E.GameHUD.muted = false;
  E.GameHUD.sfxVol = 70;
  let blipCount = 0;
  let lastBlip = null;
  const origPlayVoiceBlip = CrystalAudio.playVoiceBlip;
  CrystalAudio.playVoiceBlip = (speakerKey, ch, idx) => {
    blipCount++;
    lastBlip = origPlayVoiceBlip.call(CrystalAudio, speakerKey, ch, idx);
    return lastBlip;
  };

  E.DialogueBox.open([{ speaker: 'Ordem', portrait: 'portrait_ordem', text: 'Livre! Eu sou a Ordem!' }]);
  E.DialogueBox.update(0.15);
  assert.ok(blipCount >= 1, 'DialogueBox.update deve disparar blips de voz 8-bit conforme as letras aparecem');
  assert.equal(lastBlip?.profileKey, 'ordem', 'Fala da Ordem deve usar o perfil sonoro exclusivo de ordem');
  E.DialogueBox.close();
  CrystalAudio.playVoiceBlip = origPlayVoiceBlip;

  // 4. Recorte losangular exato no Portrait (sem cabelo/cabeça vazando fora do losango)
  const origCreateElement = globalThis.document.createElement;
  const origEngine = globalThis.TruePixelEngine;
  const canvasPixels = new Map();
  globalThis.document.createElement = (tag) => {
    const el = origCreateElement(tag);
    if (String(tag).toLowerCase() === 'canvas') {
      const origGetCtx = el.getContext;
      el.getContext = (mode) => {
        const ctx = origGetCtx.call(el, mode);
        const origFillRect = ctx.fillRect;
        ctx.fillRect = (x, y, w, h) => {
          if (el.width === 28 && el.height === 28) {
            if (!canvasPixels.has(el)) canvasPixels.set(el, []);
            canvasPixels.get(el).push({ x, y, w, h, color: ctx.fillStyle });
          }
          return origFillRect ? origFillRect.call(ctx, x, y, w, h) : undefined;
        };
        return ctx;
      };
    }
    return el;
  };

  try {
    await import(`../js/true-pixel-engine.js?prompt05_mask=${Date.now()}`);
    const E2 = globalThis.TruePixelEngine;
    for (const pKey of [
      'portrait_protagonist_male',
      'portrait_protagonist_female',
      'portrait_ordem',
      'portrait_araci',
      'portrait_irece',
      'portrait_jurema',
      'portrait_mystery_silhouette'
    ]) {
      const pSet = E2.SpriteBank.portraits[pKey];
      assert.ok(pSet && pSet.idle?.length > 0, `${pKey} deve existir`);
      for (const frame of pSet.idle) {
        const drawn = canvasPixels.get(frame) || [];
        assert.ok(drawn.length > 0, `${pKey} deve conter pixels desenhados`);
        for (const px of drawn) {
          const dist = Math.abs(px.x - 13.5) + Math.abs(px.y - 13.5);
          assert.ok(dist <= 13.5, `${pKey} não pode vazar pixel (${px.x}, ${px.y}) fora da área interna do losango (dist=${dist})`);
        }
      }
    }

    // Verifica também clip vetorial + borda protetora em DialogueBox.drawDiamondPortrait
    let clipped = false;
    let restored = false;
    const mockDlgCtx = {
      fillStyle: '#000',
      save() {},
      restore() { restored = true; },
      beginPath() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      clip() { clipped = true; },
      fillRect() {},
      drawImage() {}
    };
    E2.DialogueBox.drawDiamondPortrait(mockDlgCtx, 'portrait_protagonist_male', false, 34, 151, 25, 0, false);
    assert.equal(clipped, true, 'drawDiamondPortrait deve acionar ctx.clip() para recortar o busto no losango');
    assert.equal(restored, true, 'drawDiamondPortrait deve restaurar o contexto após o clip');
  } finally {
    globalThis.document.createElement = origCreateElement;
    globalThis.TruePixelEngine = origEngine;
  }

  // 5. Expansão do diálogo final da Caverna (Ordem)
  Cave.init();
  Cave.finishMusicalShow();
  assert.equal(E.DialogueBox.isOpen, true, 'Diálogo final da Ordem deve abrir após finishMusicalShow');
  assert.ok(E.DialogueBox.queue.length >= 4, 'Diálogo final da Ordem deve ser expandido para pelo menos 4 falas');
  assert.equal(
    E.DialogueBox.queue[0].text,
    'Livre! Eu sou a Ordem, e a Caverna voltou a brilhar!',
    'A primeira fala da Ordem deve permanecer fiel à celebração de libertação'
  );
  const fullOrdemSpeech = E.DialogueBox.queue.map(q => q.text).join(' ').toLowerCase();
  assert.ok(fullOrdemSpeech.includes('sinfonia') || fullOrdemSpeech.includes('música') || fullOrdemSpeech.includes('melodia'), 'Ordem deve contar a história da música no mundo');
  assert.ok(fullOrdemSpeech.includes('quatro gemas primordiais') || fullOrdemSpeech.includes('4 gemas primordiais'), 'Ordem deve explicar o objetivo de reunir as quatro Gemas Primordiais');
  assert.ok(fullOrdemSpeech.includes('floresta') && fullOrdemSpeech.includes('araci'), 'Ordem deve indicar a Floresta da Araci como próximo destino');
  E.DialogueBox.close();
  Cave.deactivateCanvas();
});

test('Prompt #06: Movimento Contínuo nos Cristais (Idle), Nova Identidade Visual do Cristal Sombrio (Cores Equivalentes + Aura Sombria Animada) e Efeito de Choque nas Equações', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');
  await import('../js/audio.js');

  const E = globalThis.TruePixelEngine;
  const Cave = globalThis.CaveChapter1;
  const Worlds = globalThis.TruePixelWorlds;

  // 1. Movimento Contínuo nos Cristais (Idle Animation)
  assert.equal(typeof E.ActorAnimator.getCrystalIdleAnim, 'function', 'ActorAnimator.getCrystalIdleAnim deve existir');

  const prevMotion = E.GameHUD.reducedMotion;
  E.GameHUD.reducedMotion = false;
  const p1 = { id: 'c_p1', type: 'white', value: 2, shadow: false, x: 90, y: 80, dragging: false };
  const p2 = { id: 'c_p2', type: 'rose', value: 3, shadow: false, x: 180, y: 110, dragging: false };

  const samples = [0, 0.25, 0.5, 0.75, 1.0, 1.25].map((t) => E.ActorAnimator.getCrystalIdleAnim(p1, t).bobY);
  assert.ok(new Set(samples).size >= 3, 'Animação ociosa (idle) deve mover continuamente o cristal em bobY ao longo do tempo');
  assert.ok(samples.every((v) => Math.abs(v) <= 2.5), 'Flutuação idle deve ser sutil (<= 2.5px)');

  const anim1 = E.ActorAnimator.getCrystalIdleAnim(p1, 0.3);
  const anim2 = E.ActorAnimator.getCrystalIdleAnim(p2, 0.3);
  assert.notEqual(anim1.phase, anim2.phase, 'Cristais diferentes devem possuir variação de fase na flutuação idle');

  // Em reducedMotion ou durante arrasto, bobY fica 0
  E.GameHUD.reducedMotion = true;
  assert.equal(E.ActorAnimator.getCrystalIdleAnim(p1, 0.3).bobY, 0, 'Com reducedMotion ativo, bobY deve ser 0');
  E.GameHUD.reducedMotion = false;
  p1.dragging = true;
  assert.equal(E.ActorAnimator.getCrystalIdleAnim(p1, 0.3).bobY, 0, 'Enquanto arrastado, bobY deve ser 0');
  p1.dragging = false;
  E.GameHUD.reducedMotion = prevMotion;

  // 2. Nova Identidade Visual do Cristal Sombrio (cores equivalentes + aura roxa sombria animada)
  assert.equal(typeof E.ActorAnimator.drawShadowCrystalAura, 'function', 'ActorAnimator.drawShadowCrystalAura deve existir');
  assert.ok(Cave.GEM_PALETTES, 'CaveChapter1.GEM_PALETTES deve ser exposto');
  assert.ok(Worlds.GEM_PALETTES, 'TruePixelWorlds.GEM_PALETTES deve ser exposto');

  const hexToRgb = (hex) => {
    const clean = hex.replace('#', '');
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16)
    ];
  };
  const lum = ([r, g, b]) => r + g + b;

  // white_shadow mantém família azul-gelo/ciano como white_pure (B > G >= R), mais denso
  for (const pals of [Cave.GEM_PALETTES, Worlds.GEM_PALETTES]) {
    const wp = hexToRgb(pals.white_pure.M);
    const ws = hexToRgb(pals.white_shadow.M);
    assert.ok(ws[2] > ws[1] && ws[1] >= ws[0], 'white_shadow deve manter matiz azul-ciano equivalente ao white_pure');
    assert.ok(lum(ws) < lum(wp), 'white_shadow deve ser mais denso/corrompido que white_pure');

    const rp = hexToRgb(pals.rose_pure.M);
    const rs = hexToRgb(pals.rose_shadow.M);
    assert.ok(rs[0] > rs[2] && rs[2] > rs[1], 'rose_shadow deve manter matiz rosa/magenta equivalente ao rose_pure');
    assert.ok(lum(rs) < lum(rp), 'rose_shadow deve ser mais denso/corrompido que rose_pure');

    const op = hexToRgb(pals.opal_pure.M);
    const os = hexToRgb(pals.opal_shadow.M);
    assert.ok(os[0] > os[1] && os[1] > os[2], 'opal_shadow deve manter matiz laranja/âmbar ígneo equivalente ao opal_pure');
    assert.ok(lum(os) < lum(op), 'opal_shadow deve ser mais denso/corrompido que opal_pure');
  }

  // Floresta/Rio/Caatinga: citrine_shadow e aqua_shadow também preservam suas famílias cromáticas
  const cs = hexToRgb(Worlds.GEM_PALETTES.citrine_shadow.M);
  const cp = hexToRgb(Worlds.GEM_PALETTES.citrine_pure.M);
  assert.ok(cs[0] > cs[1] && cs[1] > cs[2] * 2, 'citrine_shadow deve manter matiz dourado/amarelo solar equivalente ao citrine_pure');
  assert.ok(lum(cs) < lum(cp), 'citrine_shadow deve ser mais denso que citrine_pure');

  const as_ = hexToRgb(Worlds.GEM_PALETTES.aqua_shadow.M);
  const ap = hexToRgb(Worlds.GEM_PALETTES.aqua_pure.M);
  assert.ok(as_[2] >= as_[1] && as_[1] > as_[0] * 2, 'aqua_shadow deve manter matiz turquesa/água-marinha equivalente ao aqua_pure');
  assert.ok(lum(as_) < lum(ap), 'aqua_shadow deve ser mais denso que aqua_pure');

  // Verifica chamada de drawShadowCrystalAura em CaveChapter1 e TruePixelWorlds ao renderizar cristal sombrio
  let auraCalls = 0;
  const origDrawAura = E.ActorAnimator.drawShadowCrystalAura;
  E.ActorAnimator.drawShadowCrystalAura = (...args) => {
    auraCalls++;
    return origDrawAura.apply(E.ActorAnimator, args);
  };

  try {
    Cave.init();
    Cave.currentLevel = 2;
    Cave.setupLevelStep(2, 1);
    Cave.phase = 'gameplay';
    Cave.running = true;
    auraCalls = 0;
    Cave.render();
    assert.ok(auraCalls >= 1, 'CaveChapter1.render deve desenhar aura sombria animada em cristais sombrios');
    Cave.deactivateCanvas();

    Worlds.startByCampaignNode(6);
    Worlds.running = false;
    E.DialogueBox.close();
    E.TutorialModal.close();
    Worlds.phase = 'gameplay';
    auraCalls = 0;
    Worlds.render();
    assert.ok(auraCalls >= 1, 'TruePixelWorlds.render deve desenhar aura sombria animada em cristais sombrios');
    Worlds.deactivateCanvas();
  } finally {
    E.ActorAnimator.drawShadowCrystalAura = origDrawAura;
  }

  // 3. Efeito de Choque na Atração de Equações Cristalinas
  assert.equal(typeof E.ActorAnimator.computeEquationMagneticState, 'function', 'computeEquationMagneticState deve existir');
  assert.equal(typeof E.ActorAnimator.drawEquationMagneticShock, 'function', 'drawEquationMagneticShock deve existir');
  assert.equal(typeof E.ActorAnimator.drawEquationShockwave, 'function', 'drawEquationShockwave deve existir');

  E.GameHUD.reducedMotion = false;
  const mMock = { pStartX: 80, pStartY: 96, sStartX: 240, sStartY: 96, midX: 160, midY: 96 };
  const preImpact = E.ActorAnimator.computeEquationMagneticState(mMock, 0.25);
  assert.equal(preImpact.isImpactShock, false, 'Em 0.25s ainda está na fase de atração magnética antes do choque');
  assert.ok(preImpact.pureX < mMock.midX && preImpact.shadowX > mMock.midX, 'Equações devem convergir para o centro');

  const atShock = E.ActorAnimator.computeEquationMagneticState(mMock, 0.60);
  assert.equal(atShock.isImpactShock, true, 'Em 0.60s deve estar na janela de choque/impacto energético');
  assert.ok(atShock.flashRadius > 0, 'Choque deve emitir flash luminoso');
  assert.ok(atShock.shockwaveRadius > 0, 'Choque deve expandir anel de onda de choque');

  // Testar execução real do choque em CaveChapter1 (Fase 4 com equações)
  Cave.init();
  Cave.currentLevel = 4;
  Cave.setupLevelStep(4, 1);
  Cave.phase = 'gameplay';
  Cave.running = true;
  Cave.equationShockEffect = null;
  Cave.pureEquation = { x: 100, y: 94, expanded: false, shadow: false, broken: false };
  Cave.shadowEquation = { x: 220, y: 94, expanded: false, shadow: true, broken: false };
  Cave.pieces = [
    { id: 'eq_p', type: 'white', value: 2, shadow: false, x: 100, y: 94, inEquation: 'pure', broken: false },
    { id: 'eq_s', type: 'white', value: 2, shadow: true, x: 220, y: 94, inEquation: 'shadow', broken: false }
  ];
  Cave.checkEquationSolved();
  assert.equal(Cave.phase, 'equation_magnetic', 'CaveChapter1 deve entrar na fase equation_magnetic');
  Cave.update(0.55); // cruza impactTime = 0.50s
  assert.ok(Cave.equationShockEffect, 'CaveChapter1 deve disparar equationShockEffect no momento da colisão');
  Cave.render();
  Cave.update(0.30); // completa 0.85s -> quebra das equações, shockwave continua dissipando
  assert.equal(Cave.pureEquation.broken, true, 'Equação pura deve quebrar após o choque');
  assert.equal(Cave.shadowEquation.broken, true, 'Equação sombria deve quebrar após o choque');
  Cave.render();
  Cave.deactivateCanvas();

  // Testar execução real do choque em TruePixelWorlds
  Worlds.startByCampaignNode(6);
  Worlds.running = false;
  E.DialogueBox.close();
  E.TutorialModal.close();
  Worlds.phase = 'gameplay';
  Worlds.equationShockEffect = null;
  Worlds.pureEquation = { x: 100, y: 94, expanded: false, shadow: false, broken: false };
  Worlds.shadowEquation = { x: 220, y: 94, expanded: false, shadow: true, broken: false };
  Worlds.pieces = [
    { id: 'w_eq_p', type: 'white', value: 2, shadow: false, x: 100, y: 94, inEquation: 'pure', broken: false },
    { id: 'w_eq_s', type: 'white', value: 2, shadow: true, x: 220, y: 94, inEquation: 'shadow', broken: false }
  ];
  Worlds.checkEquationSolved();
  assert.equal(Worlds.phase, 'equation_magnetic', 'TruePixelWorlds deve entrar na fase equation_magnetic');
  Worlds.update(0.55);
  assert.ok(Worlds.equationShockEffect, 'TruePixelWorlds deve disparar equationShockEffect no momento da colisão');
  Worlds.render();
  Worlds.update(0.30);
  assert.equal(Worlds.pureEquation.broken, true);
  Worlds.render();
  Worlds.deactivateCanvas();
});

test('Prompt #07: Correção pós-tutorial (Rio 1 e Caatinga 1), soma/divisão da Citrina na Equação e detecção exata de Beco sem Saída', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');

  const E = globalThis.TruePixelEngine;
  const Worlds = globalThis.TruePixelWorlds;
  const Cave = globalThis.CaveChapter1;
  const { DialogueBox, TutorialModal } = E;

  const firePointer = (kind, lx, ly) => {
    const evt = {
      type: kind,
      clientX: lx * 2,
      clientY: ly * 2,
      pointerId: 1,
      cancelable: true,
      preventDefault() {}
    };
    if (kind === 'pointerdown') {
      Worlds.canvas.dispatchEvent(evt);
    } else {
      globalThis.dispatchEvent(evt);
    }
  };

  const fireKey = (code, key) => {
    globalThis.dispatchEvent({
      type: 'keydown',
      code,
      key,
      target: { tagName: 'BODY' },
      preventDefault() {}
    });
  };

  // ============================================================================
  // 1A. Caatinga Fase 1 após vencer Rio Fase 5: limpar riverMelody e manter cristais/formas
  // ============================================================================
  Worlds.init();
  TutorialModal.seenKeys.clear();
  Worlds.startWorldLevel('river', 5, 15);
  assert.ok(Worlds.riverMelody, 'Rio Fase 5 deve inicializar riverMelody');
  while (DialogueBox.isOpen) DialogueBox.advance();
  while (TutorialModal.isOpen) TutorialModal.nextStep();
  Worlds.finishRiverMelodyVictory();
  Worlds.startWorldExitTransition();
  assert.equal(Worlds.riverMelody, null, 'startWorldExitTransition deve limpar riverMelody para não bloquear o próximo mundo');

  // Entrar na Caatinga Fase 1
  Worlds.startWorldLevel('caatinga', 1, 16);
  Worlds.running = true;
  for (let i = 0; i < 15; i++) Worlds.update(0.1); // completa cutscene_enter -> intro_dialogue
  assert.equal(Worlds.phase, 'intro_dialogue', 'Caatinga Fase 1 deve abrir diálogo inicial');
  while (DialogueBox.isOpen) {
    fireKey('Enter', 'Enter');
  }
  assert.equal(Worlds.phase, 'tutorial', 'Após diálogo inicial da Caatinga Fase 1, deve abrir TutorialModal');
  assert.equal(TutorialModal.isOpen, true, 'TutorialModal deve estar aberto na Caatinga Fase 1');

  // Fechar TutorialModal por clique no botão ("Começar!") com pequena tolerância
  Worlds.render();
  const btn = TutorialModal.btnRect;
  firePointer('pointerdown', btn.x + btn.w / 2, btn.y + btn.h / 2);

  assert.equal(TutorialModal.isOpen, false, 'TutorialModal da Caatinga Fase 1 deve fechar ao clicar em Começar!');
  assert.equal(Worlds.phase, 'gameplay', 'Caatinga Fase 1 deve transicionar para gameplay após fechar tutorial');
  assert.equal(Worlds.riverMelody, null, 'Caatinga Fase 1 não deve herdar riverMelody');
  assert.equal(Worlds.forestNinja, null, 'Caatinga Fase 1 não deve herdar forestNinja');
  assert.equal(Worlds.pieces.length, 2, 'Caatinga Fase 1 Etapa 1 deve manter Opala (3) e Círculo Sombrio (3)');
  assert.equal(Worlds.electricShapes.length, 1, 'Caatinga Fase 1 Etapa 1 deve manter o Círculo Elétrico');

  // Testar guarda de desbloqueio automático caso TutorialModal tenha sido fechado sem callback
  Worlds.phase = 'tutorial';
  Worlds.pieces = [];
  TutorialModal.isOpen = false;
  Worlds.update(0.016);
  assert.equal(Worlds.phase, 'gameplay', 'Guarda em update deve destravar phase === tutorial quando modal não está aberto');
  assert.equal(Worlds.pieces.length, 2, 'Guarda em update deve restaurar as peças da etapa se estiverem vazias');
  Worlds.deactivateCanvas();

  // ============================================================================
  // 1B. Rio Fase 1 após vencer Floresta Fase 5: avançar 2 páginas via Enter/Space e testar Fração
  // ============================================================================
  TutorialModal.seenKeys.clear();
  Worlds.startWorldLevel('forest', 5, 10);
  assert.ok(Worlds.forestNinja, 'Floresta Fase 5 deve inicializar forestNinja');
  while (DialogueBox.isOpen) DialogueBox.advance();
  Worlds.finishForestNinjaVictory();
  Worlds.startWorldExitTransition();
  assert.equal(Worlds.forestNinja, null, 'startWorldExitTransition deve limpar forestNinja');

  Worlds.startWorldLevel('river', 1, 11);
  Worlds.running = true;
  for (let i = 0; i < 15; i++) Worlds.update(0.1);
  assert.equal(Worlds.phase, 'intro_dialogue');
  while (DialogueBox.isOpen) {
    fireKey('Space', ' ');
  }
  assert.equal(Worlds.phase, 'tutorial', 'Rio Fase 1 deve abrir tutorial de Plataforma de Frações');
  assert.equal(TutorialModal.isOpen, true);
  assert.equal(TutorialModal.cards.length, 2, 'Rio Fase 1 tem tutorial de 2 páginas');

  // Página 1 -> Página 2 via Enter, Página 2 -> Começar via Space
  fireKey('Enter', 'Enter');
  assert.equal(TutorialModal.isOpen, true, 'Após página 1 do tutorial do Rio Fase 1, deve ir à página 2');
  assert.equal(TutorialModal.currentIndex, 1);
  fireKey('Space', ' ');
  assert.equal(TutorialModal.isOpen, false, 'Após página 2, TutorialModal do Rio Fase 1 deve fechar');
  assert.equal(Worlds.phase, 'gameplay', 'Rio Fase 1 deve entrar em gameplay imediatamente após fechar tutorial');

  // Verificar que resolveFreeCrystalCollisions não desloca a peça presa inFraction === 'top'
  const topFracPiece = Worlds.pieces.find((p) => p.id === 'ri1_1_top');
  const freeFracPiece = Worlds.pieces.find((p) => p.id === 'ri1_1_free');
  assert.ok(topFracPiece && freeFracPiece && Worlds.fractionPlatform, 'Rio Fase 1 deve conter plataforma e peças');
  const origTopX = topFracPiece.x;
  const origTopY = topFracPiece.y;
  Worlds.resolveFreeCrystalCollisions();
  assert.equal(topFracPiece.x, origTopX, 'Peça inFraction no topo não pode ser deslocada por colisão livre');
  assert.equal(topFracPiece.y, origTopY, 'Peça inFraction no topo deve manter Y fixo na plataforma');

  // Arrastar cristal livre para a plataforma de fração pelo ponteiro após fechar o tutorial
  firePointer('pointerdown', freeFracPiece.x, freeFracPiece.y);
  firePointer('pointermove', Worlds.fractionPlatform.x, Worlds.fractionPlatform.bottomY);
  firePointer('pointerup', Worlds.fractionPlatform.x, Worlds.fractionPlatform.bottomY);
  assert.equal(freeFracPiece.inFraction, 'bottom', 'Rio Fase 1 deve permitir arrastar e encaixar o cristal livre na fração após o tutorial');
  assert.equal(Worlds.fractionPlatform.glowing, true, 'Plataforma de fração deve brilhar em rosa quando topo == baixo');
  Worlds.deactivateCanvas();

  // ============================================================================
  // 2. Soma e Divisão da Citrina dentro e fora da Equação Cristalina (Floresta)
  // ============================================================================
  Worlds.startWorldLevel('forest', 3, 8);
  Worlds.running = true;
  DialogueBox.close();
  TutorialModal.close();
  Worlds.setupStep(3);
  Worlds.phase = 'gameplay';

  const qBlue = Worlds.pieces.find((p) => p.id === 'fo3_3_q'); // white 2
  const cit4 = Worlds.pieces.find((p) => p.id === 'fo3_3_c');  // citrine 4
  assert.ok(qBlue && cit4 && Worlds.pureEquation, 'Floresta 3-3 deve carregar peças e pureEquation');

  // Dobra quartzo azul para 4 e coloca na equação
  qBlue.value = 4;
  qBlue.boosted = true;
  qBlue.inEquation = 'pure';
  Worlds.layoutEquationPieces(Worlds.pureEquation, 'pure');

  // Divide Citrina 4 -> 2 + 2
  assert.equal(Worlds.trySplitCrystalOnTap(cit4), true, 'Citrina 4 deve dividir em 2 + 2');
  const cit2List = Worlds.pieces.filter((p) => p.type === 'citrine' && !p.shadow && !p.broken);
  assert.equal(cit2List.length, 2, 'Devem existir duas Citrinas de valor 2');
  // Divide uma Citrina 2 -> 1 + 1
  assert.equal(Worlds.trySplitCrystalOnTap(cit2List[1]), true, 'Citrina 2 deve dividir em 1 + 1');
  const cit1List = Worlds.pieces.filter((p) => p.type === 'citrine' && !p.shadow && !p.broken && p.value === 1);
  assert.equal(cit1List.length, 2, 'Devem existir duas Citrinas de valor 1');

  // Coloca a primeira Citrina 1 na pureEquation e arrasta a segunda Citrina 1 (longe do Altar) para dentro da equação sobre ela
  cit1List[0].inEquation = 'pure';
  cit1List[1].x = 76;
  cit1List[1].y = 94;
  Worlds.layoutEquationPieces(Worlds.pureEquation, 'pure');
  firePointer('pointerdown', cit1List[1].x, cit1List[1].y);
  firePointer('pointermove', cit1List[0].x, cit1List[0].y);
  firePointer('pointerup', cit1List[0].x, cit1List[0].y);

  const citInsideEq = Worlds.pieces.filter((p) => p.type === 'citrine' && !p.shadow && !p.broken && p.inEquation === 'pure');
  assert.equal(citInsideEq.length, 1, 'Duas Citrinas de valor 1 dentro da Equação devem se somar em uma única Citrina!');
  assert.equal(citInsideEq[0].value, 2, 'A Citrina somada dentro da Equação deve ter valor 2!');
  assert.equal(Worlds.phase, 'equation_magnetic', 'Ao somar 1 + 1 = 2 junto ao azul 4 na Equação da Floresta 3-3, a Equação Sombria [4, 2] já deve atrair!');

  // Reinicia etapa 3 para testar divisão da Citrina DENTRO da Equação Cristalina (sem fechar equação antes)
  Worlds.setupStep(3);
  Worlds.phase = 'gameplay';
  const cInsideClosed = Worlds.pieces.find((p) => p.id === 'fo3_3_c'); // citrine 4
  cInsideClosed.inEquation = 'pure';
  Worlds.pureEquation.expanded = false;
  Worlds.layoutEquationPieces(Worlds.pureEquation, 'pure');
  // Clique rápido diretamente em cima da Citrina dentro da equação fechada
  firePointer('pointerdown', cInsideClosed.x, cInsideClosed.y);
  firePointer('pointerup', cInsideClosed.x, cInsideClosed.y);
  const splitInsideEq = Worlds.pieces.filter((p) => p.type === 'citrine' && !p.shadow && !p.broken && p.inEquation === 'pure' && p.value === 2);
  assert.equal(splitInsideEq.length, 2, 'Citrina par dentro da Equação Cristalina deve permitir divisão com toque rápido!');

  // Verifica que duas Citrinas de valor 1 já ambas dentro da equação aberta também somam ao soltar uma na outra
  Worlds.pureEquation.expanded = true;
  splitInsideEq[0].value = 1;
  splitInsideEq[1].value = 1;
  Worlds.layoutEquationPieces(Worlds.pureEquation, 'pure');
  firePointer('pointerdown', splitInsideEq[1].x, splitInsideEq[1].y);
  firePointer('pointermove', splitInsideEq[0].x, splitInsideEq[0].y);
  firePointer('pointerup', splitInsideEq[0].x, splitInsideEq[0].y);
  const summedInsideOpenEq = Worlds.pieces.filter((p) => p.type === 'citrine' && !p.shadow && !p.broken && p.inEquation === 'pure');
  assert.equal(summedInsideOpenEq.length, 1, 'Duas Citrinas 1 dentro da equação aberta também devem se somar');
  assert.equal(summedInsideOpenEq[0].value, 2, 'Soma dentro da equação aberta deve resultar em 2');

  // ============================================================================
  // 3. Detecção Exata de "Beco sem Saída" (Dead-End Detection)
  // ============================================================================
  // Caso A (Floresta 3-3): Citrina livre sombria (2) foi anulada, restou Citrina sombra (2) na equação,
  // e o jogador tem Citrina de valor ímpar 3 (boosted: true, não divide nem dobra para 2)!
  Worlds.setupStep(3);
  Worlds.phase = 'gameplay';
  const slFree = Worlds.pieces.find((p) => p.id === 'fo3_3_sl');
  slFree.broken = true;
  const cPiece = Worlds.pieces.find((p) => p.id === 'fo3_3_c');
  cPiece.value = 3; // soma 3 >= 2, mas é ímpar e não divide!
  cPiece.boosted = true;
  assert.equal(Worlds.isStepStillSolvable(), false, 'Citrina ímpar 3 sem Opala nunca pode formar Citrina 2 -> Beco sem Saída');
  Worlds.triggerDefeatIfImpossible();
  assert.equal(Worlds.phase, 'defeat_pause', 'Jogo deve sinalizar defeat_pause imediatamente no beco sem saída da Floresta 3-3');

  // Caso B (Floresta 4-3): Opala 1 foi gasta na Citrina (4 -> 3) em vez do Quartzo Branco (3 -> 2).
  // Quartzo Branco ficou 3 (não dobra em 2, não divide), Citrina ficou 3 -> impossível fazer Quartzo Branco 2!
  Worlds.startWorldLevel('forest', 4, 9);
  DialogueBox.close();
  TutorialModal.close();
  Worlds.setupStep(3);
  Worlds.phase = 'gameplay';
  const fo43Opal = Worlds.pieces.find((p) => p.id === 'fo4_3_o');
  const fo43Cit = Worlds.pieces.find((p) => p.id === 'fo4_3_c');
  fo43Opal.broken = true;
  fo43Opal.value = 0;
  fo43Cit.value = 3;
  assert.equal(Worlds.isStepStillSolvable(), false, 'Floresta 4-3 com Opala gasta e Quartzo 3 != 2 deve acusar Beco sem Saída');
  Worlds.triggerDefeatIfImpossible();
  assert.equal(Worlds.phase, 'defeat_pause', 'Floresta 4-3 deve disparar defeat_pause ao gastar a Opala no cristal errado');

  // Caso C: Citrina 4 foi duplicada para 2+2, mas jogador criou 3 + 1 e ainda precisa de 2 + 2 (soma 4 == 4, impossível sem 2+2 se não puder recombinar, mas 3+1=4 -> dividido 2+2! Já se tiver 3 + 3 boosted (6), 3+3=6 /2 = 3+3 -> loop infinito de 3! NUNCA forma 2!)
  Worlds.setupStep(3);
  Worlds.phase = 'gameplay';
  Worlds.pieces.find((p) => p.id === 'fo4_3_o').broken = true;
  Worlds.pieces.find((p) => p.id === 'fo4_3_q').value = 2; // Quartzo ok
  const c43 = Worlds.pieces.find((p) => p.id === 'fo4_3_c');
  c43.value = 3;
  c43.boosted = true;
  // Sombras pedem Citrina 4 e Citrina 2, só existe Citrina 3 boosted + uma segunda Citrina 3 boosted
  Worlds.pieces.push({ id: 'extra_c3', type: 'citrine', value: 3, boosted: true, shadow: false, x: 100, y: 100 });
  assert.equal(Worlds.isStepStillSolvable(), false, 'Duas Citrinas 3 (soma 6) jamais formam 4 e 2 (pois 3+3=6, 6/2=3+3) -> Beco sem Saída!');

  Worlds.deactivateCanvas();
});

test('Prompt #08: Espaço de Manipulação Expandido, Equação Dinâmica com Folga e Fração sem Sobreposição', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');

  const Worlds = globalThis.TruePixelWorlds;
  const Cave = globalThis.CaveChapter1;
  const { DialogueBox, TutorialModal } = globalThis.TruePixelEngine;

  Worlds.init();
  Cave.init();

  // ============================================================================
  // 1. Aumentar o Espaço de Manipulação em Todas as Fases & Zero Sobreposição Inicial
  // ============================================================================
  assert.ok(Worlds.STAGE_MIN_X <= 48, `STAGE_MIN_X (${Worlds.STAGE_MIN_X}) deve ser <= 48 para dar mais espaço à esquerda`);
  assert.ok(Worlds.STAGE_MAX_X >= 268, `STAGE_MAX_X (${Worlds.STAGE_MAX_X}) deve ser >= 268 para dar mais espaço à direita`);
  const usableWidth = Worlds.STAGE_MAX_X - Worlds.STAGE_MIN_X;
  assert.ok(usableWidth >= 220, `Área útil horizontal (${usableWidth}px) deve ser de pelo menos 220px`);

  // Posição dos personagens e companheiro à extrema esquerda no gameplay normal
  Worlds.startWorldLevel('forest', 1, 6);
  Worlds.running = true;
  DialogueBox.close();
  TutorialModal.close();
  Worlds.phase = 'gameplay';
  assert.ok(Worlds.protag.x <= 25, `Protagonista (${Worlds.protag.x}) deve estar posicionado à extrema esquerda (<= 25)`);
  assert.ok(Worlds.ordemCompanion.x <= 42, `Ordem (${Worlds.ordemCompanion.x}) deve estar posicionada à esquerda (<= 42)`);

  // Verificação de espaçamento inicial sem amontoamento em Floresta Fase 3 (fo3_1, fo3_2, fo3_3)
  for (let step = 1; step <= 3; step++) {
    Worlds.setupStep(step);
    const freePieces = Worlds.pieces.filter((p) => !p.inEquation && !p.inFraction && !p.broken);
    for (let i = 0; i < freePieces.length; i++) {
      for (let j = i + 1; j < freePieces.length; j++) {
        const d = Math.hypot(freePieces[i].x - freePieces[j].x, freePieces[i].y - freePieces[j].y);
        assert.ok(d >= 20, `Floresta Fase 3 Passo ${step}: peças livres ${freePieces[i].id} e ${freePieces[j].id} não devem estar coladas (d=${d.toFixed(1)}px >= 20px)`);
      }
      if (Worlds.pureEquation) {
        const dEq = Math.hypot(freePieces[i].x - Worlds.pureEquation.x, freePieces[i].y - Worlds.pureEquation.y);
        assert.ok(dEq >= 22, `Floresta Fase 3 Passo ${step}: peça livre ${freePieces[i].id} não deve colidir inicialmente com pureEquation (d=${dEq.toFixed(1)}px >= 22px)`);
      }
      if (Worlds.emeraldAltar) {
        const dAltar = Math.hypot(freePieces[i].x - Worlds.emeraldAltar.x, freePieces[i].y - Worlds.emeraldAltar.y);
        assert.ok(dAltar >= 20, `Floresta Fase 3 Passo ${step}: peça livre ${freePieces[i].id} não deve colidir inicialmente com altar (d=${dAltar.toFixed(1)}px >= 20px)`);
      }
    }
  }

  // Verificação de espaçamento inicial sem amontoamento em Rio Fase 3 (ri3_1, ri3_2)
  Worlds.startWorldLevel('river', 3, 13);
  DialogueBox.close();
  TutorialModal.close();
  Worlds.phase = 'gameplay';
  for (let step = 1; step <= 2; step++) {
    Worlds.setupStep(step);
    const freePieces = Worlds.pieces.filter((p) => !p.inEquation && !p.inFraction && !p.broken);
    for (let i = 0; i < freePieces.length; i++) {
      for (let j = i + 1; j < freePieces.length; j++) {
        const d = Math.hypot(freePieces[i].x - freePieces[j].x, freePieces[i].y - freePieces[j].y);
        assert.ok(d >= 20, `Rio Fase 3 Passo ${step}: peças livres ${freePieces[i].id} e ${freePieces[j].id} não devem estar coladas (d=${d.toFixed(1)}px >= 20px)`);
      }
      if (Worlds.pureEquation) {
        const dEq = Math.hypot(freePieces[i].x - Worlds.pureEquation.x, freePieces[i].y - Worlds.pureEquation.y);
        assert.ok(dEq >= 22, `Rio Fase 3 Passo ${step}: peça livre ${freePieces[i].id} não deve colidir inicialmente com pureEquation (d=${dEq.toFixed(1)}px >= 22px)`);
      }
      if (Worlds.fractionPlatform) {
        const fp = Worlds.fractionPlatform;
        const insideFrac = Math.abs(freePieces[i].x - fp.x) <= fp.w * 0.5 && Math.abs(freePieces[i].y - fp.y) <= fp.h * 0.5;
        assert.ok(!insideFrac, `Rio Fase 3 Passo ${step}: peça livre ${freePieces[i].id} não deve nascer sobreposta dentro da fractionPlatform`);
      }
      if (Worlds.emeraldAltar) {
        const dAltar = Math.hypot(freePieces[i].x - Worlds.emeraldAltar.x, freePieces[i].y - Worlds.emeraldAltar.y);
        assert.ok(dAltar >= 20, `Rio Fase 3 Passo ${step}: peça livre ${freePieces[i].id} não deve colidir inicialmente com altar (d=${dAltar.toFixed(1)}px >= 20px)`);
      }
    }
  }

  // ============================================================================
  // 2. Equação Cristalina com Tamanho Dinâmico e Folga Confortável
  // ============================================================================
  // Verifica método auxiliar ou cálculo dinâmico de raio rx/ry para contagem de peças
  assert.equal(typeof Worlds.getEquationRadius, 'function', 'TruePixelWorlds deve expor getEquationRadius(eq, memberCountOrList)');
  assert.equal(typeof Cave.getEquationRadius, 'function', 'CaveChapter1 deve expor getEquationRadius(eq, memberCountOrList)');

  // 1 cristal dentro da equação: raio base confortável
  const r1 = Worlds.getEquationRadius({ expanded: true }, 1);
  assert.ok(r1.rx >= 46 && r1.ry >= 28, `Raio com 1 membro deve ter base confortável (rx=${r1.rx}, ry=${r1.ry})`);

  // 3 cristais dentro da equação: raio dinâmico expande proporcionalmente
  const r3 = Worlds.getEquationRadius({ expanded: true }, 3);
  // Com 3 cristais espaçados em 24px, span = 48px (pontas em +/- 24px). rx deve ser >= 50px e ry >= 30px
  assert.ok(r3.rx >= 50, `Raio horizontal para 3 cristais (${r3.rx}) deve ser >= 50px para dar folga confortável`);
  assert.ok(r3.ry >= 30, `Raio vertical para 3 cristais (${r3.ry}) deve ser >= 30px para acomodar orbs superiores`);

  // 4 cristais dentro da equação: rx deve expandir ainda mais
  const r4 = Worlds.getEquationRadius({ expanded: true }, 4);
  assert.ok(r4.rx >= 62, `Raio horizontal para 4 cristais (${r4.rx}) deve ser >= 62px`);

  // Testar isInsideEquationAura com 3 cristais em teste de colisão real
  const testEq = { x: 150, y: 75, expanded: true, broken: false, memberCount: 3 };
  Worlds.pureEquation = testEq;
  // Ponto no limite de 48px de distância horizontal (onde antes vazaria): agora DEVE estar contido dentro da aura
  assert.equal(Worlds.isInsideEquationAura(testEq, 150 + 48, 75, true), true, 'Ponto a 48px horizontal deve estar dentro da aura expandida para 3 cristais');
  // Ponto na altura dos orbs superiores (y - 15) deve estar confortavelmente contido
  assert.equal(Worlds.isInsideEquationAura(testEq, 150, 75 - 15, true), true, 'Orbs superiores a y - 15 devem estar dentro da aura');

  // ============================================================================
  // 3. Aumentar o Espaço Interno da Fração Cristalina (Zero Sobreposição com DIVIDIR!)
  // ============================================================================
  Worlds.startWorldLevel('river', 1, 11);
  DialogueBox.close();
  TutorialModal.close();
  Worlds.phase = 'gameplay';
  Worlds.setupStep(1);
  const fp = Worlds.fractionPlatform;
  assert.ok(fp, 'Plataforma de fração deve existir em Rio 1-1');

  // Altura total da plataforma de fração deve ser >= 68px (preferencialmente 76-80px)
  assert.ok(fp.h >= 68, `Altura da fractionPlatform (${fp.h}px) deve ser >= 68px`);

  // Afastamento de bottomY em relação ao centro fy
  const bottomDist = fp.bottomY - fp.y;
  assert.ok(bottomDist >= 24, `bottomY deve estar afastado do centro da fração por pelo menos 24px (atual: ${bottomDist}px)`);

  // O botão DIVIDIR! vai de fy - 5 até fy + 6 (altura 11px)
  const buttonBottomY = fp.y + 6;

  // Um cristal posicionado em bottomY desenha seus orbs de valor mais altos a y - 15.5px
  const crystalCenterY = fp.bottomY;
  const highestOrbY = crystalCenterY - 15.5;

  // A distância vertical entre a base do botão DIVIDIR! e o topo do orb mais alto DEVE ser positiva (sem sobreposição!)
  const gapBetweenButtonAndOrbs = highestOrbY - buttonBottomY;
  assert.ok(
    gapBetweenButtonAndOrbs >= 2,
    `Os orbs do denominador devem ficar totalmente abaixo do botão DIVIDIR! com folga de pelo menos 2px (gap atual: ${gapBetweenButtonAndOrbs.toFixed(1)}px)`
  );

  Worlds.deactivateCanvas();
  Cave.deactivateCanvas();
});

test('Prompt #09: Caatinga — Preenchimento Direto no Molde Elétrico, Remoção de Equação Residual e Rotação 180° no Trapézio', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');

  const Worlds = globalThis.TruePixelWorlds;
  const { DialogueBox, TutorialModal } = globalThis.TruePixelEngine;

  const firePointer = (kind, lx, ly) => {
    const evt = {
      type: kind,
      clientX: lx * 2,
      clientY: ly * 2,
      pointerId: 1,
      cancelable: true,
      preventDefault() {}
    };
    if (kind === 'pointerdown') {
      Worlds.canvas.dispatchEvent(evt);
    } else {
      globalThis.dispatchEvent(evt);
    }
  };

  Worlds.init();

  // ============================================================================
  // 1. Preenchimento Direto no Molde Elétrico & Remoção de Equações Intermediárias
  // ============================================================================
  Worlds.startWorldLevel('caatinga', 2, 17);
  Worlds.running = true;
  DialogueBox.close();
  TutorialModal.close();
  Worlds.phase = 'gameplay';

  // Fases da Caatinga que moldam diretamente não devem ter pureEq intermediária
  for (const step of [1, 2, 3]) {
    Worlds.setupStep(step);
    assert.equal(Worlds.pureEquation, null, `Caatinga Fase 2 Etapa ${step} não deve possuir Equação Cristalina intermediária`);
  }

  Worlds.startWorldLevel('caatinga', 3, 18);
  DialogueBox.close();
  TutorialModal.close();
  Worlds.phase = 'gameplay';
  for (const step of [2, 3]) {
    Worlds.setupStep(step);
    assert.equal(Worlds.pureEquation, null, `Caatinga Fase 3 Etapa ${step} não deve possuir Equação Cristalina intermediária`);
  }

  // Testar fluxo completo em Caatinga Fase 2 Etapa 1 (Quadrado Elétrico)
  Worlds.startWorldLevel('caatinga', 2, 17);
  DialogueBox.close();
  TutorialModal.close();
  Worlds.phase = 'gameplay';
  Worlds.setupStep(1);

  const sqNode = Worlds.electricShapes[0];
  const white2 = Worlds.pieces.find((p) => p.id === 'ca2_1_q');
  const rose2 = Worlds.pieces.find((p) => p.id === 'ca2_1_r');
  assert.ok(sqNode && white2 && rose2);

  // 1º cristal colocado no molde define a BORDA (rose) e fica aguardando o 2º cristal
  firePointer('pointerdown', rose2.x, rose2.y);
  firePointer('pointermove', sqNode.x, sqNode.y);
  firePointer('pointerup', sqNode.x, sqNode.y);
  assert.equal(sqNode.used, false, 'Molde de Quadrado não deve finalizar ainda com apenas 1 cristal');
  assert.equal(sqNode.borderType, 'rose', '1º cristal colocado no molde deve definir a BORDA');
  assert.equal(sqNode.firstPieceId, rose2.id, 'Molde deve registrar o 1º cristal inserido');
  assert.equal(rose2.inMoldId, sqNode.id, '1º cristal deve ficar ancorado no molde');
  Worlds.render();

  // Toque simples no molde parcialmente preenchido libera o 1º cristal de volta
  firePointer('pointerdown', sqNode.x, sqNode.y);
  firePointer('pointerup', sqNode.x, sqNode.y);
  assert.equal(sqNode.firstPieceId, null, 'Toque no molde parcialmente preenchido deve ejetar o 1º cristal');
  assert.equal(sqNode.borderType, null);
  assert.equal(rose2.inMoldId, null);

  // Agora coloca white2 primeiro (BORDA = white) e rose2 segundo (INTERIOR = rose)
  firePointer('pointerdown', white2.x, white2.y);
  firePointer('pointermove', sqNode.x, sqNode.y);
  firePointer('pointerup', sqNode.x, sqNode.y);
  assert.equal(sqNode.borderType, 'white', '1º cristal (white) define a borda');

  // Rejeição de 2º cristal com valor incompatível (ex: rose2 com valor 3 != 2 no Quadrado)
  rose2.value = 3;
  firePointer('pointerdown', rose2.x, rose2.y);
  firePointer('pointermove', sqNode.x, sqNode.y);
  firePointer('pointerup', sqNode.x, sqNode.y);
  assert.equal(sqNode.used, false, 'Quadrado deve rejeitar 2º cristal de valor diferente do 1º');
  assert.ok(sqNode.barrierUntil > Worlds.t, 'Barreira elétrica deve sinalizar rejeição');

  // Restaura rose2.value = 2 e coloca como 2º cristal -> forma o Quadrado (white borda, rose núcleo)!
  rose2.value = 2;
  firePointer('pointerdown', rose2.x, rose2.y);
  firePointer('pointermove', sqNode.x, sqNode.y);
  firePointer('pointerup', sqNode.x, sqNode.y);
  assert.equal(sqNode.used, true, '2º cristal válido deve consolidar o Quadrado no molde');
  assert.equal(white2.shape, 'square');
  assert.equal(white2.borderType, 'white', '1º cristal colocado define a borda da forma');
  assert.equal(white2.coreType, 'rose', '2º cristal colocado define o interior da forma');
  assert.equal(white2.value, 4);

  // Testar Caatinga Fase 2 Etapa 2 (Retângulo com Opala + Quartzo direto no molde)
  Worlds.setupStep(2);
  const rectNode = Worlds.electricShapes[0];
  const q3 = Worlds.pieces.find((p) => p.id === 'ca2_2_q');
  const o6 = Worlds.pieces.find((p) => p.id === 'ca2_2_o');
  firePointer('pointerdown', q3.x, q3.y);
  firePointer('pointermove', rectNode.x, rectNode.y);
  firePointer('pointerup', rectNode.x, rectNode.y);
  assert.equal(rectNode.borderType, 'white');
  firePointer('pointerdown', o6.x, o6.y);
  firePointer('pointermove', rectNode.x, rectNode.y);
  firePointer('pointerup', rectNode.x, rectNode.y);
  assert.equal(rectNode.used, true, 'Retângulo deve aceitar Opala (6) como 2º cristal diretamente');
  assert.equal(q3.shape, 'rectangle');
  assert.equal(q3.borderType, 'white');
  assert.equal(q3.coreType, 'opal');
  assert.equal(q3.value, 9);

  // ============================================================================
  // 2. Remoção de Equação Residual ao Consolidar Forma e Restauração ao Desfazer
  // ============================================================================
  Worlds.setupStep(1);
  const moldEq = Worlds.electricShapes[0];
  const eqQ = Worlds.pieces.find((p) => p.id === 'ca2_1_q');
  const eqR = Worlds.pieces.find((p) => p.id === 'ca2_1_r');
  const eq = Worlds.ensurePureEquation(100, 72);
  eqQ.inEquation = 'pure';
  eqR.inEquation = 'pure';
  eqQ.x = 92;
  eqR.x = 108;
  Worlds.layoutEquationPieces(eq, 'pure');
  assert.ok(Worlds.pureEquation && !Worlds.pureEquation.broken);

  // Consolida a forma a partir dos cristais da equação
  assert.equal(Worlds.tryEnterElectricShapeNode(moldEq, [eqQ, eqR]), true);
  assert.equal(eqQ.shape, 'square');
  assert.ok(
    !Worlds.pureEquation || Worlds.pureEquation.broken,
    'Equação Cristalina não deve sobrar vazia na tela após consolidar a forma geométrica'
  );

  // Ao desfazer a forma geométrica, a equação vinculada é restaurada
  assert.equal(Worlds.tryDisassembleShapeOnTap(eqQ), true);
  assert.ok(
    Worlds.pureEquation && !Worlds.pureEquation.broken,
    'Equação Cristalina deve ser restaurada caso a forma geométrica vinculada seja desfeita'
  );
  assert.equal(moldEq.used, false);

  // ============================================================================
  // 3. Rotação de 180° na Pré-Formação de Trapézio (Triângulo + Trapézio -> Pentágono)
  // ============================================================================
  Worlds.startWorldLevel('caatinga', 3, 18);
  DialogueBox.close();
  TutorialModal.close();
  Worlds.phase = 'gameplay';
  Worlds.setupStep(2);

  const triNode = Worlds.electricShapes[0];
  const tQ = Worlds.pieces.find((p) => p.id === 'ca3_2_q');
  const tR = Worlds.pieces.find((p) => p.id === 'ca3_2_r');
  const trapPiece = Worlds.pieces.find((p) => p.id === 'ca3_2_trap');
  assert.ok(triNode && tQ && tR && trapPiece);

  // Cria o Triângulo diretamente no molde elétrico
  firePointer('pointerdown', tQ.x, tQ.y);
  firePointer('pointermove', triNode.x, triNode.y);
  firePointer('pointerup', triNode.x, triNode.y);
  firePointer('pointerdown', tR.x, tR.y);
  firePointer('pointermove', triNode.x, triNode.y);
  firePointer('pointerup', triNode.x, triNode.y);
  assert.equal(tQ.shape, 'triangle', 'Triângulo deve ser formado diretamente no molde');

  // Segura o Triângulo e aproxima do Trapézio para acionar a pré-formação
  Worlds.draggedPiece = tQ;
  tQ.dragging = true;
  tQ.x = trapPiece.x;
  tQ.y = trapPiece.y - 20;
  for (let i = 0; i < 6; i++) Worlds.update(0.08);

  assert.ok(Worlds.tessellationPreview, 'Deve ativar preview de encaixe entre Triângulo e Trapézio');
  assert.equal(Worlds.tessellationPreview.resultShape, 'pentagon');
  assert.equal(
    Worlds.tessellationPreview.targetRotAngle,
    Math.PI,
    'Na pré-formação com o Trapézio, a forma segurada deve girar 180 graus (Math.PI) de cabeça para baixo'
  );
  assert.ok(
    tQ.rotAngle > 2.5 && tQ.rotAngle <= Math.PI + 0.01,
    `Triângulo segurado deve estar girado de cabeça para baixo próximo de Math.PI (atual: ${tQ.rotAngle.toFixed(2)})`
  );

  tQ.dragging = false;
  Worlds.draggedPiece = null;
  Worlds.deactivateCanvas();
});

test('Prompt #10: Floresta Fase 5 (Tempo 20s, Combo Multi-Corte e HUD Top-Right) e Caatinga Fase 5 (Transição Direta sem Animação Residual)', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');

  const Worlds = globalThis.TruePixelWorlds;
  const E = globalThis.TruePixelEngine;
  const DialogueBox = E.DialogueBox;

  // -------------------------------------------------------------------------
  // 1. Floresta Fase 5: Validação do tempo de 20s e mecânica clássica de combo
  // -------------------------------------------------------------------------
  Worlds.startWorldLevel('forest', 5, 10);
  assert.ok(Worlds.forestNinja, 'Deve inicializar forestNinja');
  const fn = Worlds.forestNinja;
  assert.equal(fn.stageDuration, 20.0, 'Tempo de cada etapa deve ser reduzido para 20 segundos');
  assert.equal(fn.stageTimeRemaining, 20.0, 'Tempo inicial deve ser 20 segundos');

  // Iniciar etapa 1 oficial
  Worlds.startForestNinjaStage(1);
  assert.equal(fn.stageDuration, 20.0);
  assert.equal(fn.stageTimeRemaining, 20.0);

  // Teste de corte único: não ativa combo
  fn.strokePureCuts = 0;
  fn.strokeCrystals = [];
  const c1 = { x: 100, y: 80, vx: 10, vy: -50, rot: 0, vrot: 0, type: 'emerald', shadow: false, radius: 13, value: 2, sliced: false };
  Worlds.sliceForestCrystal(c1, false);
  assert.equal(fn.pureCuts, 1);
  assert.equal(fn.activeComboBanner, null, 'Corte de apenas 1 cristal não deve ativar combo');
  assert.equal(fn.comboMultiplier, 1, 'Multiplicador deve ser 1x sem combo');

  // Teste de corte múltiplo (2 cristais no mesmo stroke): aciona Combo 2x
  const c2 = { x: 130, y: 75, vx: 5, vy: -55, rot: 0, vrot: 0, type: 'emerald', shadow: false, radius: 13, value: 2, sliced: false };
  Worlds.sliceForestCrystal(c2, false);
  assert.equal(fn.pureCuts, 2);
  assert.ok(fn.activeComboBanner, 'Corte de 2 cristais no mesmo golpe DEVE ativar combo');
  assert.ok(fn.activeComboBanner.text.includes('2'), 'Banner deve indicar 2x');
  assert.equal(fn.comboMultiplier, 2, 'Multiplicador deve ser 2x');
  assert.ok(fn.comboTimer > 0, 'Indicador de combo deve ter temporizador ativo');

  // Teste de corte múltiplo de 3 cristais no mesmo golpe
  const c3 = { x: 160, y: 70, vx: -5, vy: -55, rot: 0, vrot: 0, type: 'citrine', shadow: false, radius: 13, value: 2, sliced: false };
  Worlds.sliceForestCrystal(c3, false);
  assert.equal(fn.comboMultiplier, 3, 'Multiplicador deve ser 3x ao cortar 3 cristais no mesmo golpe');
  assert.ok(fn.activeComboBanner.text.includes('3'));

  // Teste de corte múltiplo de 4 cristais no mesmo golpe
  const c4 = { x: 190, y: 65, vx: -10, vy: -50, rot: 0, vrot: 0, type: 'white', shadow: false, radius: 13, value: 2, sliced: false };
  Worlds.sliceForestCrystal(c4, false);
  assert.equal(fn.comboMultiplier, 4, 'Multiplicador deve ser 4x ao cortar 4 cristais no mesmo golpe');
  assert.ok(fn.activeComboBanner.text.includes('4'));

  // Validação do HUD no canto superior direito:
  assert.ok(Worlds.forestNinjaComboBadgeRect, 'Deve definir coordenadas para o badge de combo no HUD');
  assert.ok(Worlds.forestNinjaComboBadgeRect.x >= 220, 'Badge de combo deve estar posicionado no canto superior direito (x >= 220)');
  assert.ok(Worlds.forestNinjaComboBadgeRect.y <= 40, 'Badge de combo deve estar no topo (y <= 40)');

  // Renderiza HUD e efeitos visuais
  Worlds.render();

  // -------------------------------------------------------------------------
  // 2. Caatinga Fase 5: Conclusão da 6ª rodada sem animação pós-conclusão
  // -------------------------------------------------------------------------
  Worlds.startByCampaignNode(20);
  Worlds.running = false;
  Worlds.startShellGame();
  E.TutorialModal.close();

  // Completa as 6 rodadas
  for (let r = 1; r <= 6; r++) {
    Worlds.phase = 'shell_game_pick';
    Worlds.pickShellCup(Worlds.shellGame.opalCupIdx);
    Worlds.updateShellGame(1.2);
  }
  assert.equal(Worlds.phase, 'shell_game_victory', 'Deve entrar na vitória do Shell Game');

  // Ao decorrer o tempo de vitória (phaseTime >= 2.2), NÃO deve ir para musical_part1_shadows
  Worlds.updateShellGame(2.5);
  assert.notEqual(
    Worlds.phase,
    'musical_part1_shadows',
    'Conclusão da Caatinga NÃO deve acionar animação musical/shadowPlay com barras laranjas/amarelas'
  );
  assert.notEqual(
    Worlds.phase,
    'musical_part2_bright',
    'Conclusão da Caatinga NÃO deve acionar musical_part2_bright'
  );
  assert.equal(
    Worlds.phase,
    'post_musical_dlg',
    'Conclusão da Caatinga deve transitar diretamente para o diálogo de celebração com Jurema'
  );
  assert.equal(DialogueBox.sockets.caatinga, true, 'Opala de Fogo deve estar sincronizada nos encaixes');
  assert.ok(DialogueBox.isOpen, 'Diálogo de vitória da Jurema deve estar aberto');
  assert.ok(
    DialogueBox.queue[0]?.speaker === 'Jurema' || DialogueBox.queue[0]?.speaker === 'Ordem',
    'Diálogo deve ser de Jurema/Ordem'
  );

  // Avança o diálogo até a celebração final
  while (DialogueBox.isOpen) {
    DialogueBox.advance();
  }
  assert.equal(Worlds.phase, 'world_celebrate_complete', 'Após diálogo, deve celebrar a conclusão do mundo');

  Worlds.deactivateCanvas();
});






