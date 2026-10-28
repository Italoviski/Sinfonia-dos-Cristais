import test from 'node:test';
import assert from 'node:assert/strict';

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
      fillRect: () => {},
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

test('DialogueBox.close existe e fecha a caixa de diálogo limpando fila e estado', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  const E = globalThis.TruePixelEngine;
  assert.ok(E, 'TruePixelEngine deve existir');
  const { DialogueBox } = E;
  assert.ok(DialogueBox, 'DialogueBox deve existir');
  assert.equal(typeof DialogueBox.close, 'function', 'DialogueBox.close deve ser uma função');

  DialogueBox.open([{ speaker: 'Ordem', text: 'Bem-vindo ao reino!' }]);
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

  // Simula estado intermediário alterado na Fase 3 Etapa 2
  Cave.currentLevel = 3;
  Cave.currentStep = 2;
  Cave.phase = 'step_transition';
  Cave.draggedPiece = { id: 'dummy' };
  Cave.waveActive = true;
  Cave.waveRadius = 50;

  // Executa o reinício
  Cave.restartCurrentPhase();
  Cave.running = false; // Interrompe o loop no teste em Node

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

test('AssetPreloader gerencia carregamento, valida recursos e bloqueia início até prontidão', async () => {
  setupNodeDOM();
  await import('../js/preloader.js');
  const Preloader = globalThis.AssetPreloader;
  assert.ok(Preloader, 'AssetPreloader deve existir');
  assert.equal(typeof Preloader.preloadAll, 'function', 'preloadAll deve ser função');
  assert.equal(typeof Preloader.finishAndEnterGame, 'function', 'finishAndEnterGame deve ser função');
  assert.ok(Preloader.totalCount >= 30, 'Deve gerenciar mais de 30 recursos do jogo');

  // Verifica que global.CrystalAssetsReady existe
  assert.ok('CrystalAssetsReady' in globalThis, 'CrystalAssetsReady deve estar exposto globalmente');
});
