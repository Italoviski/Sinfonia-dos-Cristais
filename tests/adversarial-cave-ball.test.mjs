import test from 'node:test';
import assert from 'node:assert/strict';

function setupNodeDOM() {
  globalThis.window = globalThis;
  globalThis.requestAnimationFrame = (fn) => 1;
  globalThis.cancelAnimationFrame = (id) => {};
  if (!globalThis.ImageData) {
    globalThis.ImageData = class ImageData { constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); } };
  }
  if (!globalThis.Image) {
    globalThis.Image = class Image { constructor() { this._src = ''; setTimeout(() => this.onload?.(), 2); } get src() { return this._src; } set src(v) { this._src = v; } };
  }
  if (!globalThis.Audio) {
    globalThis.Audio = class Audio { constructor() { this._src = ''; this.paused = true; this.currentTime = 0; this.volume = 1; this.muted = false; } load() {} play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } addEventListener(evt, fn) { if (evt === 'canplaythrough') setTimeout(fn, 2); } removeEventListener() {} };
  }
  if (!globalThis.document) {
    const mockContext = () => ({
      save: () => {}, restore: () => {}, clip: () => {}, translate: () => {}, scale: () => {},
      fillRect: () => {}, strokeRect: () => {}, drawImage: () => {}, clearRect: () => {},
      setTransform: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {},
      arc: () => {}, fill: () => {}, stroke: () => {}, closePath: () => {}, rect: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createImageData: (w, h) => new globalThis.ImageData(w, h),
      getImageData: (x, y, w, h) => new globalThis.ImageData(w, h),
      putImageData: () => {}, fillText: () => {}, measureText: () => ({ width: 40 })
    });
    const mockElement = (tag) => ({
      tagName: tag.toUpperCase(), style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => false, contains: () => false },
      setAttribute: () => {}, getAttribute: () => null, appendChild: (c) => c, append: () => {}, remove: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, getContext: () => mockContext(),
      toDataURL: () => 'data:image/png;base64,AA==', getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 })
    });
    globalThis.document = {
      createElement: mockElement, getElementById: (id) => mockElement('div'),
      querySelector: () => null, querySelectorAll: () => [], body: mockElement('body'),
      addEventListener: () => {}, removeEventListener: () => {}, readyState: 'complete'
    };
    globalThis.document.body.dataset = {};
  }
}

test('Test 2: Monotonicidade da Altura do Arco (computeJumpArc)', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  const K = globalThis.CaveRhythmKaraoke;

  let prevH = -1;
  const samples = [];
  for (let dt = 0.10; dt <= 2.0001; dt += 0.05) {
    const roundedDt = Math.round(dt * 100) / 100;
    const arc = K.computeJumpArc(roundedDt);
    samples.push({ dt: roundedDt, height: arc.height });
    assert.ok(arc.height >= prevH, `Altura do arco decresceu em dt=${roundedDt}: H=${arc.height} < prevH=${prevH}`);
    prevH = arc.height;
  }
  assert.equal(samples[0].height, 6, 'Altura mínima deve ser 6px para saltos rápidos');
  assert.equal(samples[samples.length - 1].height, 25, 'Altura máxima deve ser 25px para saltos lentos');
});

test('Test 3: Precisão de Aterrissagem (Landing Precision at t = W_{k+1}.t)', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  const K = globalThis.CaveRhythmKaraoke;
  K.initLayouts();

  const landingErrors = [];
  for (let pi = 0; pi < K.phrases.length; pi++) {
    const p = K.phrases[pi];
    if (!p.words || p.words.length === 0) continue;
    for (let wi = 0; wi < p.words.length; wi++) {
      const w = p.words[wi];
      const targetX = w.isHold ? Math.round(w.x + 3) : w.midX;
      const pos = K.getBallPosition(w.t);
      if (pos.x !== targetX) {
        landingErrors.push({
          phraseIndex: pi,
          wordIndex: wi,
          text: w.text,
          t: w.t,
          targetX,
          actualX: pos.x,
          diff: Math.abs(pos.x - targetX)
        });
      }
    }
  }

  console.log('Landing Precision test completed. Failures:', landingErrors.length);
  for (const err of landingErrors) {
    console.log(`  [Landing Error] P${err.phraseIndex} W${err.wordIndex} "${err.text}" @ t=${err.t}s: expected x=${err.targetX}, got x=${err.actualX} (diff: ${err.diff}px)`);
  }
  // Se houver falhas, este assert falhará de forma reprodutível
  assert.equal(landingErrors.length, 0, `Foram encontradas ${landingErrors.length} falhas de aterrissagem`);
});

test('Test 1: Continuidade a 60 FPS da Bolinha ao longo de todas as frases', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  const K = globalThis.CaveRhythmKaraoke;
  K.initLayouts();

  const dtStep = 0.016;
  const continuityViolations = [];

  for (let pi = 0; pi < K.phrases.length; pi++) {
    const p = K.phrases[pi];
    if (!p.words || p.words.length === 0) continue;

    // Amostragem ao longo da frase em passos de 16ms
    for (let t = p.t0; t + dtStep <= p.t1; t += dtStep) {
      const pA = K.getCurrentPhrase(t);
      const pB = K.getCurrentPhrase(t + dtStep);
      // Avalia dentro da mesma frase ativa
      if (pA === p && pB === p) {
        const posA = K.getBallPosition(t);
        const posB = K.getBallPosition(t + dtStep);
        const dx = Math.abs(posB.x - posA.x);
        const dy = Math.abs(posB.y - posA.y);
        if (dx > 6.0 || dy > 4.5) {
          continuityViolations.push({
            phraseIndex: pi,
            tA: t.toFixed(3),
            tB: (t + dtStep).toFixed(3),
            dx: dx.toFixed(2),
            dy: dy.toFixed(2),
            posA,
            posB
          });
        }
      }
    }
  }

  console.log('60 FPS Continuity test completed. Violations within same phrase:', continuityViolations.length);
  for (const v of continuityViolations) {
    console.log(`  [Continuity Violation] P${v.phraseIndex} t=[${v.tA} -> ${v.tB}] dx=${v.dx} dy=${v.dy} from (${v.posA.x},${v.posA.y}) to (${v.posB.x},${v.posB.y})`);
  }
  assert.equal(continuityViolations.length, 0, `Foram encontradas ${continuityViolations.length} violações de continuidade`);
});
