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
        this.currentTime = 0;
        this.volume = 1;
        this.muted = false;
      }
      load() {}
      play() { this.paused = false; return Promise.resolve(); }
      pause() { this.paused = true; }
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
      rect: () => {},
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

// ============================================================================
// PARTE 1: TESTE ADVERSARIAL DE RELÓGIO EM DEGRAUS (Precision Audio Clock)
// ============================================================================

test('Precision Audio Clock: Simulação adversarial de congelamento de 10-15 frames (160-240ms) e degraus de 200ms a 60 FPS', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Cave = globalThis.CaveChapter1;
  assert.ok(Cave, 'CaveChapter1 deve existir');

  Cave.currentLevel = 5;
  Cave.phase = 'musical_part1_shadows';
  Cave.musicalTime = 0.500;
  Cave._lastAudioTime = undefined;
  Cave._lastAudioPerf = undefined;

  const mockAudio = {
    paused: false,
    currentTime: 0.545 // 0.545 - 0.045 = 0.500s exato
  };
  Cave.musicAudio = mockAudio;

  let fakePerfNow = 1000.0;
  const originalPerformance = globalThis.performance;
  globalThis.performance = {
    now: () => fakePerfNow
  };

  try {
    const fps = 60;
    const dt = 1 / fps; // 16.6667ms
    const totalFrames = 600; // 10 segundos de simulação contínua

    let audioTime = mockAudio.currentTime;
    let framesSinceAudioUpdate = 0;
    let freezeLength = 12;

    const deltas = [];

    for (let frame = 0; frame < totalFrames; frame++) {
      fakePerfNow += dt * 1000;
      framesSinceAudioUpdate++;

      // Simula o comportamento real do browser: currentTime congela de 10 a 15 frames
      if (framesSinceAudioUpdate >= freezeLength) {
        audioTime += framesSinceAudioUpdate * dt;
        mockAudio.currentTime = audioTime;
        framesSinceAudioUpdate = 0;
        freezeLength = 10 + (frame % 6); // varia entre 10 e 15 frames
      }

      const prevTime = Cave.musicalTime;
      Cave.update(dt);
      const currTime = Cave.musicalTime;

      if (frame > 0) {
        const delta = currTime - prevTime;
        deltas.push(delta);

        // 1. Sem retrocessos no tempo (delta >= 0 estrito)
        assert.ok(
          delta >= 0,
          `Frame ${frame}: Retrocesso detectado no tempo musical! delta = ${delta.toFixed(6)}s`
        );

        // 2. Sem descontinuidades abruptas (> 50ms em um único frame de 16.6ms)
        assert.ok(
          delta < 0.050,
          `Frame ${frame}: Salto abrupto excessivo detectado! delta = ${(delta * 1000).toFixed(2)}ms`
        );

        // 3. Progressão contínua (sem congelar a zero após warmup)
        if (frame > 20) {
          assert.ok(
            delta > 0.005,
            `Frame ${frame}: Tempo estagnou: delta = ${(delta * 1000).toFixed(3)}ms`
          );
        }
      }
    }

    const minDelta = Math.min(...deltas);
    const maxDelta = Math.max(...deltas);
    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;

    assert.ok(
      Math.abs(avgDelta - dt) < 0.001,
      `Média do delta (${(avgDelta * 1000).toFixed(2)}ms) convergiu para dt (${(dt * 1000).toFixed(2)}ms)`
    );

    console.log(`[PASS] Precision Audio Clock sob congelamento 10-15 frames: 600 frames. Min: ${(minDelta * 1000).toFixed(2)}ms, Max: ${(maxDelta * 1000).toFixed(2)}ms, Avg: ${(avgDelta * 1000).toFixed(2)}ms`);
  } finally {
    globalThis.performance = originalPerformance;
  }
});

// ============================================================================
// PARTE 2: TESTE DE LIMITES DE AVALIAÇÃO DE HIT (evaluateHit)
// ============================================================================

test('evaluateHit: Limites exatos na prática (0.000s, 0.090s, 0.150s, 0.280s, 0.500s)', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Karaoke = globalThis.CaveRhythmKaraoke;
  assert.ok(Karaoke, 'CaveRhythmKaraoke deve existir');

  const targetTime = 1.8; // palavra 1 da prática ("uma", t = 1.8s)

  // 1. diff = 0.000s -> Perfeito! (score 50, col #ffe033)
  Karaoke.resetPractice();
  let hit = Karaoke.evaluateHit(targetTime + 0.000, true);
  assert.ok(hit, 'diff = 0.000s deve ser registrado');
  assert.equal(hit.grade, 'perfeito', 'diff = 0.000s deve ser Perfeito!');
  assert.equal(hit.score, 50);
  assert.equal(hit.col, '#ffe033');

  // 2. diff = 0.090s -> Perfeito! (score 50, col #ffe033)
  Karaoke.resetPractice();
  hit = Karaoke.evaluateHit(targetTime + 0.090, true);
  assert.ok(hit, 'diff = 0.090s deve ser registrado');
  assert.equal(hit.grade, 'perfeito', 'diff = 0.090s deve ser Perfeito!');
  assert.equal(hit.score, 50);
  assert.equal(hit.col, '#ffe033');

  // 3. diff = 0.150s (tempo de reação auditiva humano) -> Ótimo! (score 25, col #68e3a2)
  Karaoke.resetPractice();
  hit = Karaoke.evaluateHit(targetTime + 0.150, true);
  assert.ok(hit, 'diff = 0.150s deve ser registrado');
  assert.equal(hit.grade, 'otimo', 'diff = 0.150s deve ser Ótimo!');
  assert.equal(hit.score, 25);
  assert.equal(hit.col, '#68e3a2');

  // 4. diff = 0.280s -> Tarde! (score 10, col #ff9c42) e NÃO null/miss
  Karaoke.resetPractice();
  hit = Karaoke.evaluateHit(targetTime + 0.280, true);
  assert.ok(hit, 'diff = 0.280s deve ser registrado (não null)');
  assert.equal(hit.grade, 'tarde', 'diff = 0.280s deve ser Tarde!');
  assert.equal(hit.score, 10);
  assert.equal(hit.col, '#ff9c42');

  // 5. diff = 0.500s -> ignorado / null
  Karaoke.resetPractice();
  hit = Karaoke.evaluateHit(targetTime + 0.500, true);
  assert.equal(hit, null, 'diff = 0.500s deve ser ignorado (retornar null)');
});

// ============================================================================
// PARTE 3: TESTE ADVERSARIAL DE LIMITES EM TODAS AS 24 FRASES DA MÚSICA REAL
// ============================================================================

test('evaluateHit Adversarial: Valida registro de clique em TODAS as palavras das 24 frases da música real', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Karaoke = globalThis.CaveRhythmKaraoke;
  Karaoke.initLayouts();

  const droppedClicks = [];

  for (let pi = 0; pi < Karaoke.phrases.length; pi++) {
    const phrase = Karaoke.phrases[pi];
    if (!phrase.words || phrase.words.length === 0) continue;

    for (let wi = 0; wi < phrase.words.length; wi++) {
      const w = phrase.words[wi];

      // Testa clique cravado no tempo exato (diff = 0.000s)
      Karaoke.resetSong();
      const hitExact = Karaoke.evaluateHit(w.t, false);
      if (!hitExact || hitExact.grade !== 'perfeito') {
        droppedClicks.push({
          phraseIndex: pi,
          wordIndex: wi,
          text: w.text,
          t: w.t,
          phraseT0: phrase.t0,
          phraseT1: phrase.t1,
          diff: 0.000,
          result: hitExact ? hitExact.grade : 'null (DROPPED)'
        });
      }

      // Testa clique com reação típica (diff = 0.150s)
      Karaoke.resetSong();
      const hitTypical = Karaoke.evaluateHit(w.t + 0.150, false);
      if (!hitTypical || hitTypical.grade !== 'otimo') {
        droppedClicks.push({
          phraseIndex: pi,
          wordIndex: wi,
          text: w.text,
          t: w.t,
          phraseT0: phrase.t0,
          phraseT1: phrase.t1,
          diff: 0.150,
          result: hitTypical ? hitTypical.grade : 'null (DROPPED)'
        });
      }

      // Testa clique tardio (diff = 0.280s)
      Karaoke.resetSong();
      phrase.words.forEach((other, idx) => { if (idx > wi) other.judged = true; });
      const hitLate = Karaoke.evaluateHit(w.t + 0.280, false);
      assert.ok(hitLate, `Clique tardio em P${pi} W${wi} "${w.text}" não deve ser nulo`);
      if (!hitLate || hitLate.grade !== 'tarde') {
        droppedClicks.push({
          phraseIndex: pi,
          wordIndex: wi,
          text: w.text,
          t: w.t,
          phraseT0: phrase.t0,
          phraseT1: phrase.t1,
          diff: 0.280,
          result: hitLate ? hitLate.grade : 'null (DROPPED)'
        });
      }
    }
  }

  console.log('Resultados do Teste de Cliques em Frases Reais da Música:');
  console.log(`Total de falhas/cliques descartados: ${droppedClicks.length}`);
  for (const f of droppedClicks) {
    console.log(`  [Falha de Hit] P${f.phraseIndex} W${f.wordIndex} "${f.text}" @ t=${f.t}s (frase [${f.phraseT0}, ${f.phraseT1}]): diff=${f.diff}s -> ${f.result}`);
  }

  assert.equal(
    droppedClicks.length,
    0,
    `Foram encontrados ${droppedClicks.length} cliques descartados ou com avaliação incorreta na música real!`
  );
});
