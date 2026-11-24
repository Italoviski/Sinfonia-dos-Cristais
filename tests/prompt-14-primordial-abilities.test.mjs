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
    const state = { fillStyle: '#000', strokeStyle: '#000', font: '', textAlign: 'left', textBaseline: 'alphabetic', lineWidth: 1 };
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
      save: () => {},
      restore: () => {},
      clip: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      fillRect: (x, y, w, h) => {
        if (opsLog) opsLog.push({ op: 'fillRect', x, y, w, h, fillStyle: state.fillStyle });
      },
      strokeRect: (x, y, w, h) => {
        if (opsLog) opsLog.push({ op: 'strokeRect', x, y, w, h, strokeStyle: state.strokeStyle });
      },
      drawImage: () => {},
      clearRect: () => {},
      setTransform: () => {},
      beginPath: () => {},
      rect: () => {},
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
      fillText: (txt, x, y) => {
        if (opsLog) opsLog.push({ op: 'fillText', txt, x, y, fillStyle: state.fillStyle });
      },
      strokeText: (txt, x, y) => {
        if (opsLog) opsLog.push({ op: 'strokeText', txt, x, y, strokeStyle: state.strokeStyle });
      },
      measureText: (txt) => ({ width: (txt || '').length * 5 })
    };
  };

  if (!globalThis.document || !globalThis.document.body?.dataset) {
    const elementsById = new Map();
    const mockElement = (tag) => {
      const classes = new Set();
      const listeners = new Map();
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

function resetSocketsAndProgress(E, sockets = {}, completed = []) {
  E.DialogueBox.sockets.fairy = Boolean(sockets.fairy);
  E.DialogueBox.sockets.forest = Boolean(sockets.forest);
  E.DialogueBox.sockets.river = Boolean(sockets.river);
  E.DialogueBox.sockets.caatinga = Boolean(sockets.caatinga);
  globalThis.CrystalApp = { state: { completed: completed.slice() }, notify: () => {}, goto: () => {} };
  E.GameHUD.godMode = false;
  E.GameHUD.onUseAbility1 = null;
  E.GameHUD.onUseAbility2 = null;
  E.GameHUD.syncAbilitiesState(true);
}

test('Regras de Progressão e Desbloqueio por Mundo (Caverna, Floresta, Rio, Caatinga) + God Mode', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  const E = globalThis.TruePixelEngine;
  const HUD = E.GameHUD;

  assert.equal(typeof HUD.syncAbilitiesState, 'function', 'GameHUD.syncAbilitiesState deve existir');
  assert.equal(typeof HUD.getAbilityState, 'function', 'GameHUD.getAbilityState deve existir');

  // 1. Início do jogo: nenhum mundo concluído
  resetSocketsAndProgress(E, { fairy: false, forest: false, river: false, caatinga: false }, []);
  let a1 = HUD.getAbilityState(1);
  let a2 = HUD.getAbilityState(2);
  assert.equal(a1.unlocked, false, 'Habilidade 1 deve iniciar bloqueada antes de concluir a Caverna');
  assert.equal(a1.charges, 0);
  assert.equal(a2.unlocked, false, 'Habilidade 2 deve iniciar bloqueada antes de concluir a Floresta');
  assert.equal(a2.charges, 0);

  // 2. Ao concluir Mundo 1 (Caverna): desbloqueia Habilidade 1 (Visão) com 1 carga
  resetSocketsAndProgress(E, { fairy: true }, [5]);
  a1 = HUD.getAbilityState('vision');
  a2 = HUD.getAbilityState('rewind');
  assert.equal(a1.unlocked, true, 'Concluir Caverna deve desbloquear Habilidade 1 (Visão)');
  assert.equal(a1.maxCharges, 1);
  assert.equal(a1.charges, 1);
  assert.equal(a2.unlocked, false, 'Habilidade 2 continua bloqueada antes da Floresta');

  // 3. Ao concluir Mundo 2 (Floresta): desbloqueia Habilidade 2 (Voltar/Rebobinar) com 1 carga
  resetSocketsAndProgress(E, { fairy: true, forest: true }, [5, 10]);
  a1 = HUD.getAbilityState(1);
  a2 = HUD.getAbilityState(2);
  assert.equal(a1.unlocked, true);
  assert.equal(a1.maxCharges, 1);
  assert.equal(a2.unlocked, true, 'Concluir Floresta deve desbloquear Habilidade 2 (Rebobinar)');
  assert.equal(a2.maxCharges, 1);
  assert.equal(a2.charges, 1);

  // 4. Ao concluir Mundo 3 (Rio): +1 carga para as habilidades (total 2)
  resetSocketsAndProgress(E, { fairy: true, forest: true, river: true }, [5, 10, 15]);
  a1 = HUD.getAbilityState(1);
  a2 = HUD.getAbilityState(2);
  assert.equal(a1.maxCharges, 2, 'Concluir Rio deve conceder +1 carga à Habilidade 1');
  assert.equal(a2.maxCharges, 2, 'Concluir Rio deve conceder +1 carga à Habilidade 2');
  assert.ok(a1.chargeSources.includes('river'), 'chargeSources deve registrar cristal primordial do Rio');

  // 5. Ao concluir Mundo 4 (Caatinga): +1 carga adicional (total 3)
  resetSocketsAndProgress(E, { fairy: true, forest: true, river: true, caatinga: true }, [5, 10, 15, 20]);
  a1 = HUD.getAbilityState(1);
  a2 = HUD.getAbilityState(2);
  assert.equal(a1.maxCharges, 3, 'Concluir Caatinga deve conceder +1 carga adicional (total 3)');
  assert.equal(a2.maxCharges, 3);
  assert.ok(a1.chargeSources.includes('caatinga'), 'chargeSources deve registrar cristal primordial da Caatinga');

  // 6. No God Mode: ambas desbloqueadas e cargas infinitas mesmo sem mundos concluídos
  resetSocketsAndProgress(E, {}, []);
  HUD.godMode = true;
  HUD.syncAbilitiesState(false);
  a1 = HUD.getAbilityState(1);
  a2 = HUD.getAbilityState(2);
  assert.equal(a1.unlocked, true, 'God Mode deve desbloquear Habilidade 1');
  assert.equal(a2.unlocked, true, 'God Mode deve desbloquear Habilidade 2');
  assert.equal(a1.infinite, true, 'God Mode deve garantir cargas infinitas');
  assert.equal(a2.infinite, true);

  for (let i = 0; i < 5; i++) {
    assert.equal(HUD.useAbility(1), true, 'God Mode permite usar habilidade repetidamente sem esgotar');
    assert.equal(HUD.useAbility(2), true);
  }
  HUD.godMode = false;
});

test('Consumo de Cargas, Callbacks (onUseAbility1/2) e Reset ao Reiniciar ou Passar de Nível', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');

  const E = globalThis.TruePixelEngine;
  const HUD = E.GameHUD;
  const Cave = globalThis.CaveChapter1;
  const Worlds = globalThis.TruePixelWorlds;

  // Desbloqueia ambas com 2 cargas (Caverna + Floresta + Rio)
  resetSocketsAndProgress(E, { fairy: true, forest: true, river: true }, [5, 10, 15]);
  HUD.paused = false;
  HUD.settingsOpen = false;
  HUD.guideOpen = false;
  HUD._lastHideSteps = false;

  let ab1Calls = 0;
  let ab2Calls = 0;
  HUD.onUseAbility1 = () => { ab1Calls++; return true; };
  HUD.onUseAbility2 = () => { ab2Calls++; return true; };
  HUD.abilityParticles = [];

  // Clique direto no botão da HUD aciona Visão e consome 1 carga
  const b1 = HUD.abilityButtons.vision;
  assert.ok(b1, 'abilityButtons.vision deve existir');
  const clicked1 = HUD.handleClick(b1.x + 5, b1.y + 5);
  assert.equal(clicked1, true, 'Clique no botão Visão deve acionar habilidade');
  assert.equal(ab1Calls, 1, 'onUseAbility1 deve ser invocado');
  assert.equal(HUD.getAbilityState(1).charges, 1, 'Deve restar 1 de 2 cargas');
  assert.ok(HUD.abilityParticles.length > 0, 'Deve gerar partículas cristalinas ao usar habilidade');

  // 2º uso zera cargas; 3º uso falha
  assert.equal(HUD.useAbility(1), true);
  assert.equal(HUD.getAbilityState(1).charges, 0);
  assert.equal(HUD.useAbility(1), false, 'Sem cargas, useAbility(1) deve retornar false');
  assert.equal(ab1Calls, 2, 'Callback não deve rodar quando carga é 0');

  // Callback retornando false cancela consumo de carga
  HUD.onUseAbility2 = () => false;
  assert.equal(HUD.useAbility(2), false, 'Retornar false no callback aborta ativação');
  assert.equal(HUD.getAbilityState(2).charges, 2, 'Não deve consumir carga se callback retornar false');

  HUD.onUseAbility2 = () => { ab2Calls++; return true; };
  assert.equal(HUD.useAbility(2), true);
  assert.equal(ab2Calls, 1);
  assert.equal(HUD.getAbilityState(2).charges, 1);

  // Reiniciar via GameHUD.triggerRestart restaura cargas
  HUD.triggerRestart();
  assert.equal(HUD.getAbilityState(1).charges, 2, 'triggerRestart deve restaurar cargas de Habilidade 1');
  assert.equal(HUD.getAbilityState(2).charges, 2, 'triggerRestart deve restaurar cargas de Habilidade 2');

  // Iniciar ou reiniciar fase em CaveChapter1 restaura cargas
  HUD.useAbility(1);
  assert.equal(HUD.getAbilityState(1).charges, 1);
  Cave.currentLevel = 1;
  Cave.restartCurrentPhase();
  Cave.running = false;
  assert.equal(HUD.getAbilityState(1).charges, 2, 'CaveChapter1.restartCurrentPhase deve restaurar cargas');

  HUD.useAbility(2);
  Cave.startStandardLevel(2, 3);
  Cave.running = false;
  assert.equal(HUD.getAbilityState(2).charges, 2, 'CaveChapter1.startStandardLevel deve restaurar cargas ao passar de nível');

  // Iniciar ou reiniciar fase em TruePixelWorlds restaura cargas
  HUD.useAbility(1);
  Worlds.startWorldLevel('forest', 1, 6);
  Worlds.running = false;
  assert.equal(HUD.getAbilityState(1).charges, 2, 'TruePixelWorlds.startWorldLevel deve restaurar cargas');

  HUD.useAbility(2);
  Worlds.restartCurrentPhase();
  Worlds.running = false;
  assert.equal(HUD.getAbilityState(2).charges, 2, 'TruePixelWorlds.restartCurrentPhase deve restaurar cargas');
});

test('Interface Cristalina na HUD renderiza botões temáticos dos mundos e preservação de coordenadas existentes', async () => {
  const { createMockCtx } = setupNodeDOM();
  await import('../js/true-pixel-engine.js');

  const E = globalThis.TruePixelEngine;
  const HUD = E.GameHUD;

  // Verifica layout da top bar (sem Pause, com Casa ao lado de Configurações)
  assert.equal(HUD.buttons.guide.x, 120);
  assert.equal(HUD.buttons.map.x, 154);
  assert.equal(HUD.buttons.pause, undefined);
  assert.equal(HUD.buttons.mute.x, 254);
  assert.equal(HUD.buttons.settings.x, 276);
  assert.equal(HUD.buttons.home.x, 298);

  // Estado completo com todos os cristais primordiais (3 cargas)
  resetSocketsAndProgress(E, { fairy: true, forest: true, river: true, caatinga: true }, [5, 10, 15, 20]);
  HUD.useAbility(1);

  const ops = [];
  HUD.renderTopBar(createMockCtx(ops), 6, 1, 2, false);

  assert.ok(ops.some(o => o.op === 'fillText' && String(o.txt).includes('Visão')), 'HUD deve exibir botão cristalino Visão');
  assert.ok(ops.some(o => o.op === 'fillText' && String(o.txt).includes('Voltar')), 'HUD deve exibir botão cristalino Voltar');
  assert.ok(ops.some(o => o.fillStyle === '#e040fb' || o.fillStyle === '#c084fc'), 'Botão Visão deve usar paleta cristalina da Caverna');
  assert.ok(ops.some(o => o.fillStyle === '#4ade80' || o.fillStyle === '#69f0ae'), 'Botão Voltar deve usar paleta Esmeralda da Floresta');
  assert.ok(ops.some(o => o.fillStyle === '#38bdf8'), 'Indicador de carga extra do Rio deve usar cor azul Turmalina');
  assert.ok(ops.some(o => o.fillStyle === '#fbbf24'), 'Indicador de carga extra da Caatinga deve usar cor Opala dourada');

  // Render em God Mode exibe símbolo ∞
  HUD.godMode = true;
  const gmOps = [];
  HUD.renderTopBar(createMockCtx(gmOps), 6, 1, 2, false);
  assert.ok(gmOps.some(o => o.op === 'fillText' && String(o.txt).includes('∞')), 'God Mode deve exibir indicador de carga infinita ∞');
  HUD.godMode = false;
});
