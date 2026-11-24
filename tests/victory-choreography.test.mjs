import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function createMockCtx() {
  const calls = [];
  const noop = () => {};
  const ctx = {
    imageSmoothingEnabled: false,
    fillStyle: '#000',
    strokeStyle: '#000',
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    fillRect(x, y, w, h) { calls.push(['fillRect', x, y, w, h, this.fillStyle]); },
    clearRect: noop,
    strokeRect: noop,
    drawImage(...args) { calls.push(['drawImage', args.length]); },
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    setTransform: noop,
    beginPath: noop,
    rect: noop,
    clip: noop,
    fillText: noop,
    strokeText: noop,
    measureText: (s) => ({ width: String(s || '').length * 6 }),
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: noop,
    _calls: calls
  };
  return ctx;
}

function loadEngine() {
  const sfxLog = [];
  const sandbox = {
    console,
    Math,
    Date,
    performance: { now: () => 1000 },
    setTimeout: () => 0,
    clearTimeout: () => {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    Uint32Array,
    Uint8ClampedArray,
    Float32Array,
    Map,
    Set,
    document: {
      createElement(tag) {
        if (tag === 'canvas') {
          return {
            width: 320,
            height: 180,
            style: {},
            getContext: () => createMockCtx(),
            getBoundingClientRect: () => ({ width: 640, height: 360 })
          };
        }
        return { style: {}, classList: { toggle() {}, add() {}, remove() {} } };
      },
      getElementById: () => null,
      body: { classList: { toggle() {}, add() {}, remove() {} } }
    },
    CrystalAudio: {
      unlock() {},
      setEnabled() {},
      setVolume() {},
      victoryFanfare() { sfxLog.push('victoryFanfare'); },
      worldFinaleFanfare() { sfxLog.push('worldFinaleFanfare'); },
      starChime(idx) { sfxLog.push(`starChime${idx}`); },
      reward(n) { sfxLog.push(`reward:${n}`); },
      click() { sfxLog.push('click'); }
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const engineSrc = fs.readFileSync('js/true-pixel-engine.js', 'utf8');
  vm.runInContext(engineSrc, sandbox, { filename: 'js/true-pixel-engine.js' });
  return { E: sandbox.TruePixelEngine, sfxLog };
}

test('VictoryChoreography: 5 biomas distintos renderizam overlay e step_resolving com estrelas esculpidas', () => {
  const { E } = loadEngine();
  const VC = E.VictoryChoreography;
  assert.ok(VC, 'TruePixelEngine deve exportar VictoryChoreography');

  const biomes = ['cave', 'forest', 'river', 'caatinga', 'sanctuary'];
  const headerColors = new Set();

  for (const worldKey of biomes) {
    const theme = VC.getTheme(worldKey);
    assert.ok(theme && theme.headerBg, `Tema ${worldKey} deve existir`);
    headerColors.add(theme.headerBg);

    const ctx = createMockCtx();
    VC.renderStepResolvingFX(ctx, {
      worldKey,
      phaseTime: 0.45,
      tq: 1.5,
      waveOrigin: { x: 160, y: 96 },
      waveRadius: 95,
      barrierX: 260,
      barrierY: 108,
      actors: [{ x: 64, y: 142 }],
      reducedMotion: false
    });
    assert.ok(ctx._calls.length > 20, `renderStepResolvingFX (${worldKey}) deve desenhar onda e partículas`);

    const ctxOverlay = createMockCtx();
    VC.renderCompletionOverlay(ctxOverlay, {
      worldKey,
      isWorldFinale: worldKey === 'sanctuary',
      title: `Teste ${worldKey}`,
      line1: 'Vitória!',
      line2: worldKey === 'sanctuary' ? '4 Gemas Primordiais!' : '',
      buttonLabel: 'Continuar >',
      buttonRect: VC.DEFAULT_BTN_RECT,
      phaseTime: 1.35,
      t: 3.2,
      reducedMotion: false
    });
    const drawImages = ctxOverlay._calls.filter((c) => c[0] === 'drawImage');
    assert.ok(drawImages.length >= 3, `Overlay (${worldKey}) deve desenhar as 3 estrelas esculpidas em pixel art`);
  }

  assert.equal(headerColors.size, 5, 'Cada bioma deve possuir identidade visual/paleta própria');
});

test('VictoryChoreography: áudio sequencial de fanfarra + 3 estrelas e respeito a reducedMotion', () => {
  const { E, sfxLog } = loadEngine();
  const VC = E.VictoryChoreography;
  E.GameHUD.muted = false;
  E.GameHUD.sfxVol = 80;

  const host = {};
  VC.resetAudioState(host);
  VC.updateCompletionAudio(host, 0.05, false, false);
  assert.deepEqual(sfxLog, ['victoryFanfare']);

  VC.updateCompletionAudio(host, 0.50, false, false);
  assert.deepEqual(sfxLog, ['victoryFanfare', 'starChime1']);

  VC.updateCompletionAudio(host, 0.85, false, false);
  assert.deepEqual(sfxLog, ['victoryFanfare', 'starChime1', 'starChime2']);

  VC.updateCompletionAudio(host, 1.20, false, false);
  assert.deepEqual(sfxLog, ['victoryFanfare', 'starChime1', 'starChime2', 'starChime3']);

  // Reduced motion: sem pulo e sem chimes repetidos
  assert.equal(VC.getCelebrationJumpOffset(0.2, true), 0, 'reducedMotion deve zerar o salto');
  assert.ok(VC.getCelebrationJumpOffset(0.2, false) < 0, 'Modo normal deve produzir arco de salto negativo');

  sfxLog.length = 0;
  VC.resetAudioState(host);
  VC.updateCompletionAudio(host, 1.5, true, true);
  assert.deepEqual(sfxLog, ['worldFinaleFanfare'], 'reducedMotion deve tocar apenas a fanfarra principal');
});
