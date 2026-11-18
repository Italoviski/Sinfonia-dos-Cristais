import test from 'node:test';
import assert from 'node:assert/strict';

function setupNodeDOM() {
  globalThis.window = globalThis;
  globalThis.window.innerWidth = 1280;
  globalThis.window.innerHeight = 720;
  delete globalThis.window.ontouchstart;
  globalThis.window.matchMedia = () => ({ matches: false });

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
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};

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

  const createMockCtx = (opsLog = null) => {
    const stateStack = [];
    const state = {
      fillStyle: '#000',
      strokeStyle: '#000',
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      lineWidth: 1,
      globalAlpha: 1
    };
    return {
      get fillStyle() { return state.fillStyle; },
      set fillStyle(v) { state.fillStyle = v; },
      get strokeStyle() { return state.strokeStyle; },
      set strokeStyle(v) { state.strokeStyle = v; },
      get font() { return state.font; },
      set font(v) { state.font = v; },
      get textAlign() { return state.textAlign; },
      set textAlign(v) { state.textAlign = v; },
      get textBaseline() { return state.textBaseline; },
      set textBaseline(v) { state.textBaseline = v; },
      get lineWidth() { return state.lineWidth; },
      set lineWidth(v) { state.lineWidth = v; },
      get globalAlpha() { return state.globalAlpha; },
      set globalAlpha(v) {
        state.globalAlpha = Number(v);
        if (opsLog) opsLog.push({ op: 'globalAlpha', alpha: state.globalAlpha });
      },
      save: () => {
        stateStack.push({ ...state });
        if (opsLog) opsLog.push({ op: 'save', alpha: state.globalAlpha });
      },
      restore: () => {
        if (stateStack.length) {
          Object.assign(state, stateStack.pop());
        }
        if (opsLog) opsLog.push({ op: 'restore', alpha: state.globalAlpha });
      },
      clip: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      setLineDash: () => {},
      fillRect: (x, y, w, h) => {
        if (opsLog) opsLog.push({ op: 'fillRect', x, y, w, h, fillStyle: state.fillStyle, alpha: state.globalAlpha });
      },
      strokeRect: (x, y, w, h) => {
        if (opsLog) opsLog.push({ op: 'strokeRect', x, y, w, h, strokeStyle: state.strokeStyle, alpha: state.globalAlpha });
      },
      drawImage: (img, dx, dy) => {
        if (opsLog) opsLog.push({ op: 'drawImage', dx, dy, alpha: state.globalAlpha });
      },
      clearRect: () => {},
      setTransform: () => {},
      beginPath: () => {},
      rect: () => {},
      moveTo: (x, y) => {
        if (opsLog) opsLog.push({ op: 'moveTo', x, y, alpha: state.globalAlpha });
      },
      lineTo: (x, y) => {
        if (opsLog) opsLog.push({ op: 'lineTo', x, y, alpha: state.globalAlpha });
      },
      arc: (x, y, r) => {
        if (opsLog) opsLog.push({ op: 'arc', x, y, r, alpha: state.globalAlpha });
      },
      fill: () => {
        if (opsLog) opsLog.push({ op: 'fill', fillStyle: state.fillStyle, alpha: state.globalAlpha });
      },
      stroke: () => {
        if (opsLog) opsLog.push({ op: 'stroke', strokeStyle: state.strokeStyle, alpha: state.globalAlpha });
      },
      closePath: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createImageData: (w, h) => new globalThis.ImageData(w, h),
      getImageData: (x, y, w, h) => new globalThis.ImageData(w, h),
      putImageData: () => {},
      fillText: (txt, x, y) => {
        if (opsLog) opsLog.push({ op: 'fillText', txt, x, y, fillStyle: state.fillStyle, alpha: state.globalAlpha });
      },
      strokeText: (txt, x, y) => {
        if (opsLog) opsLog.push({ op: 'strokeText', txt, x, y, strokeStyle: state.strokeStyle, alpha: state.globalAlpha });
      },
      measureText: (txt) => ({ width: (txt || '').length * 5 })
    };
  };

  if (!globalThis.document || !globalThis.document.body?.dataset) {
    const elementsById = new Map();
    const mockElement = (tag) => {
      const classes = new Set();
      return {
        tagName: tag.toUpperCase(),
        hidden: false,
        value: '',
        style: { setProperty(k, v) { this[k] = v; } },
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
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        getContext: () => createMockCtx(),
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

  return { createMockCtx };
}

function resetAbilitiesUnlocked(E, completed = [5], sockets = { fairy: true }) {
  E.DialogueBox.sockets.fairy = Boolean(sockets.fairy);
  E.DialogueBox.sockets.forest = Boolean(sockets.forest);
  E.DialogueBox.sockets.river = Boolean(sockets.river);
  E.DialogueBox.sockets.caatinga = Boolean(sockets.caatinga);
  globalThis.CrystalApp = { state: { completed: completed.slice() }, notify: () => {}, goto: () => {} };
  E.GameHUD.godMode = false;
  E.GameHUD.paused = false;
  E.GameHUD.settingsOpen = false;
  E.GameHUD.guideOpen = false;
  E.GameHUD.syncAbilitiesState(true);
}

function snapshotPieces(pieces = []) {
  return pieces.map(p => ({
    id: p.id,
    type: p.type,
    value: p.value,
    x: p.x,
    y: p.y,
    broken: Boolean(p.broken),
    inEquation: Boolean(p.inEquation),
    inFraction: p.inFraction ?? null,
    inMoldId: p.inMoldId ?? null,
    shape: p.shape ?? null,
    angleDeg: p.angleDeg ?? 0,
    polarity: p.polarity ?? null
  }));
}

test('TruePixelEngine.drawGhostHandHint renderiza animação translúcida (drag e tap) e restaura globalAlpha', async () => {
  const { createMockCtx } = setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  const E = globalThis.TruePixelEngine;

  assert.equal(typeof E.drawGhostHandHint, 'function', 'TruePixelEngine.drawGhostHandHint deve existir');

  const dragOps = [];
  const dragCtx = createMockCtx(dragOps);
  E.drawGhostHandHint(dragCtx, {
    kind: 'drag',
    fromX: 80,
    fromY: 110,
    toX: 220,
    toY: 110,
    pieceType: 'pure',
    pieceValue: 2,
    label: 'Anule +2 com -2',
    t: 1.1,
    duration: 2.2
  }, 1.5);

  assert.ok(
    dragOps.some(o => o.alpha !== undefined && o.alpha > 0 && o.alpha < 1 && (o.op === 'fillRect' || o.op === 'drawImage' || o.op === 'arc')),
    'Animação drag da Mão Fantasma deve desenhar com globalAlpha translúcido (< 1)'
  );
  assert.equal(dragCtx.globalAlpha, 1, 'drawGhostHandHint deve restaurar globalAlpha para 1 ao finalizar');

  const tapOps = [];
  const tapCtx = createMockCtx(tapOps);
  E.drawGhostHandHint(tapCtx, {
    kind: 'tap',
    fromX: 160,
    fromY: 96,
    toX: 160,
    toY: 96,
    pieceType: 'citrine',
    pieceValue: 4,
    label: 'Toque para dividir!',
    t: 0.9,
    duration: 2.0
  }, 0.9);

  assert.ok(
    tapOps.some(o => o.alpha !== undefined && o.alpha > 0 && o.alpha < 1),
    'Animação tap da Mão Fantasma deve desenhar com globalAlpha translúcido (< 1)'
  );
  assert.equal(tapCtx.globalAlpha, 1, 'drawGhostHandHint (tap) deve restaurar globalAlpha para 1');
});

test('CaveChapter1.computeNextGhostStep calcula próximo passo válido e HUD aciona Mão Fantasma sem mutar cristais reais', async () => {
  const { createMockCtx } = setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const E = globalThis.TruePixelEngine;
  const HUD = E.GameHUD;
  const Cave = globalThis.CaveChapter1;

  assert.equal(typeof Cave.computeNextGhostStep, 'function', 'CaveChapter1.computeNextGhostStep deve existir');
  assert.equal(typeof Cave.triggerGhostHandHint, 'function', 'CaveChapter1.triggerGhostHandHint deve existir');

  resetAbilitiesUnlocked(E, [5], { fairy: true });

  // 1. Caverna Nível 1 Passo 1: anulação direta
  Cave.prepareCanvasForGame(false);
  Cave.setupLevelStep(1, 1);
  E.TutorialModal.isOpen = false;
  Cave.phase = 'gameplay';
  Cave.animating = false;

  const hint1 = Cave.computeNextGhostStep();
  assert.ok(hint1, 'Deve retornar dica válida na Caverna Nível 1 Passo 1');
  assert.equal(hint1.kind, 'drag');
  assert.ok(Number.isFinite(hint1.fromX) && Number.isFinite(hint1.fromY));
  assert.ok(Number.isFinite(hint1.toX) && Number.isFinite(hint1.toY));
  const srcPiece1 = Cave.pieces.find(p => p.id === hint1.pieceId);
  assert.ok(srcPiece1 && !srcPiece1.broken, 'pieceId da dica deve apontar para um cristal ativo da fase');

  // Ativar Habilidade 1 via GameHUD fora de gameplay deve retornar false e não gastar carga
  Cave.phase = 'intro';
  assert.equal(HUD.useAbility(1), false, 'Fora de gameplay, useAbility(1) deve retornar false');
  assert.equal(HUD.getAbilityState(1).charges, 1, 'Carga não pode ser consumida fora de gameplay');

  // Ativar em gameplay deve iniciar ghostHandAnim, gastar 1 carga e NÃO mutar os cristais
  Cave.phase = 'gameplay';
  const beforePieces = snapshotPieces(Cave.pieces);
  HUD.abilityParticles = [];
  assert.equal(HUD.useAbility(1), true, 'useAbility(1) em gameplay deve ativar Dica da Mão Fantasma');
  assert.equal(HUD.getAbilityState(1).charges, 0, 'Deve consumir 1 carga após ativação válida');
  assert.ok(HUD.abilityParticles.length > 0, 'Deve emitir partículas temáticas ao usar Visão');
  assert.ok(Cave.ghostHandAnim, 'Cave.ghostHandAnim deve estar ativo após ativação');
  assert.deepEqual(snapshotPieces(Cave.pieces), beforePieces, 'Ativar Mão Fantasma NÃO pode mover nem quebrar cristais reais');

  // Avançar update(dt) e renderizar no Canvas mockado durante e após animação
  const renderOps = [];
  const ctx = createMockCtx(renderOps);
  Cave.ctx = ctx;
  for (let i = 0; i < 6; i++) {
    Cave.update(0.25);
    Cave.render();
    assert.deepEqual(snapshotPieces(Cave.pieces), beforePieces, 'Durante a animação fantasma nenhum cristal real pode ser modificado');
  }
  assert.ok(
    renderOps.some(o => o.alpha !== undefined && o.alpha > 0 && o.alpha < 1),
    'Cave.render deve desenhar a Mão Fantasma com transparência (globalAlpha < 1)'
  );

  // Avançar até concluir a animação (duração típica ~2.2s)
  for (let i = 0; i < 15; i++) {
    Cave.update(0.2);
  }
  assert.equal(Cave.ghostHandAnim, null, 'ghostHandAnim deve encerrar e limpar para null após duração');
  assert.deepEqual(snapshotPieces(Cave.pieces), beforePieces, 'Após terminar a animação fantasma os cristais devem continuar intactos');

  // 2. Caverna Nível 2 (Opala) Passo 1: precisa sugerir próximo movimento válido
  Cave.setupLevelStep(2, 1);
  E.TutorialModal.isOpen = false;
  Cave.phase = 'gameplay';
  const hintOpal = Cave.computeNextGhostStep();
  assert.ok(hintOpal, 'Deve retornar dica válida na Caverna Nível 2 (Opala)');
  assert.ok(['drag', 'tap'].includes(hintOpal.kind));

  // 3. Caverna Nível 3 (Equação) Passo 1: precisa sugerir próximo passo na equação ou anulação
  Cave.setupLevelStep(3, 1);
  E.TutorialModal.isOpen = false;
  Cave.phase = 'gameplay';
  const hintEq = Cave.computeNextGhostStep();
  assert.ok(hintEq, 'Deve retornar dica válida na Caverna Nível 3 (Equação)');
  assert.ok(Number.isFinite(hintEq.fromX) && Number.isFinite(hintEq.toX));

  Cave.running = false;
});

test('TruePixelWorlds.computeNextGhostStep cobre Altar Esmeralda, Citrino, Frações do Rio e Moldes da Caatinga sem mutação', async () => {
  const { createMockCtx } = setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-worlds.js');

  const E = globalThis.TruePixelEngine;
  const HUD = E.GameHUD;
  const Worlds = globalThis.TruePixelWorlds;

  assert.equal(typeof Worlds.computeNextGhostStep, 'function', 'TruePixelWorlds.computeNextGhostStep deve existir');
  assert.equal(typeof Worlds.triggerGhostHandHint, 'function', 'TruePixelWorlds.triggerGhostHandHint deve existir');

  resetAbilitiesUnlocked(E, [5, 10], { fairy: true, forest: true });

  // 1. Floresta Fase 1 (Altar Esmeralda)
  Worlds.startWorldLevel('forest', 1, 6);
  E.TutorialModal.isOpen = false;
  Worlds.phase = 'gameplay';
  Worlds.animating = false;
  const beforeForest1 = snapshotPieces(Worlds.pieces);
  const forestHint1 = Worlds.computeNextGhostStep();
  assert.ok(forestHint1, 'Floresta Fase 1 deve retornar dica (Altar Esmeralda ou anulação)');
  assert.ok(Number.isFinite(forestHint1.toX) && Number.isFinite(forestHint1.toY));
  assert.equal(HUD.useAbility(1), true, 'GameHUD.useAbility(1) deve disparar triggerGhostHandHint em TruePixelWorlds');
  assert.ok(Worlds.ghostHandAnim, 'Worlds.ghostHandAnim deve iniciar quando Habilidade 1 é usada');
  assert.equal(HUD.getAbilityState(1).charges, 0);

  const wOps = [];
  Worlds.ctx = createMockCtx(wOps);
  Worlds.update(0.4);
  Worlds.render();
  assert.ok(wOps.some(o => o.alpha !== undefined && o.alpha > 0 && o.alpha < 1), 'Worlds.render deve desenhar Mão Fantasma translúcida');
  assert.deepEqual(snapshotPieces(Worlds.pieces), beforeForest1, 'Floresta: animação da Mão Fantasma não pode alterar cristais reais');

  // 2. Floresta Fase 2 (Citrino que divide ao tocar)
  Worlds.startWorldLevel('forest', 2, 7);
  E.TutorialModal.isOpen = false;
  Worlds.phase = 'gameplay';
  const citrineHint = Worlds.computeNextGhostStep();
  assert.ok(citrineHint, 'Floresta Fase 2 deve sugerir divisão de Citrino ou anulação');

  // 3. Rio Fase 1 (Frações) - Testar preenchimento e toque em fração cheia
  Worlds.startWorldLevel('river', 1, 11);
  E.TutorialModal.isOpen = false;
  Worlds.phase = 'gameplay';
  const fracFillHint = Worlds.computeNextGhostStep();
  assert.ok(fracFillHint, 'Rio Fase 1 deve sugerir preencher a plataforma de fração');
  assert.ok(Worlds.fractionPlatform, 'Rio Fase 1 deve possuir fractionPlatform');
  Worlds.fractionPlatform.glowing = true;
  const divideHint = Worlds.computeNextGhostStep();
  assert.ok(divideHint, 'Plataforma de fração pronta (glowing) deve retornar dica para dividir');
  assert.equal(divideHint.kind, 'tap', 'Dica de fração pronta deve ser do tipo tap na plataforma');

  // 4. Caatinga Fase 1 (Moldes elétricos geométricos) e Fase 3 (Tesselação com Trapézio rotacionável)
  Worlds.startWorldLevel('caatinga', 1, 16);
  E.TutorialModal.isOpen = false;
  Worlds.phase = 'gameplay';
  const moldHint = Worlds.computeNextGhostStep();
  assert.ok(moldHint, 'Caatinga Fase 1 deve retornar dica para encaixar cristal no molde geométrico');

  Worlds.startWorldLevel('caatinga', 3, 18);
  E.TutorialModal.isOpen = false;
  Worlds.phase = 'gameplay';
  const tessHint = Worlds.computeNextGhostStep();
  assert.ok(tessHint, 'Caatinga Fase 3 deve retornar dica de tesselação ou rotação');

  // God Mode mantém uso infinito em TruePixelWorlds
  HUD.godMode = true;
  const gOps = [];
  Worlds.ctx = createMockCtx(gOps);
  assert.equal(HUD.useAbility(1), true, 'God Mode deve permitir usar Habilidade 1 em TruePixelWorlds com 0 cargas');
  HUD.godMode = false;

  Worlds.running = false;
});
