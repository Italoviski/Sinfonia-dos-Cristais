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

test('AssetPreloader gerencia apenas os 10 recursos ativos (7 PNGs de Menu/Mapa + 3 MP3s) existentes em disco', async () => {
  setupNodeDOM();
  await import('../js/preloader.js');
  const Preloader = globalThis.AssetPreloader;
  assert.ok(Preloader, 'AssetPreloader deve existir');
  assert.equal(Preloader.totalCount, 10, 'Deve gerenciar exatamente os 10 recursos ativos do boot');

  await new Promise((r) => setTimeout(r, 20));
  for (const src of Object.keys(Preloader.cache.images)) {
    assert.ok(existsSync(new URL(`../${src}`, import.meta.url)), `Imagem ativa deve existir em disco: ${src}`);
  }
  for (const src of Object.keys(Preloader.cache.audios)) {
    assert.ok(existsSync(new URL(`../${src}`, import.meta.url)), `Áudio ativo deve existir em disco: ${src}`);
  }

  const deletedSprites = [
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

  // 3. Rio (Nós 11..15), Caatinga (Nós 16..20) e Santuário Final (Nó 21) carregam e renderizam sem erros
  for (const [nodeId, expectedWorld, expectedLevel] of [
    [10, 'forest', 4],
    [11, 'river', 1],
    [15, 'river', 4],
    [16, 'caatinga', 1],
    [20, 'caatinga', 4],
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
});
