import test from 'node:test';
import assert from 'node:assert/strict';

// Configuração do ambiente DOM simulado para executar o jogo em ambiente Node.js isolado
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

// ------------------------------------------------------------------------------------------------
// SUÍTE 1: TESTE ADVERSARIAL DE RELÓGIO EM DEGRAUS (Precision Audio Clock Stress Test)
// ------------------------------------------------------------------------------------------------

test('Precision Audio Clock: Degraus de 10 a 15 frames (160ms a 240ms) mantêm progressão suave a 60 FPS sem retrocessos', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Cave = globalThis.CaveChapter1;
  assert.ok(Cave, 'CaveChapter1 deve existir');

  // Inicializa o modo musical da Fase 5
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
    const dt = 1 / fps; // ~0.0166667s
    const totalFrames = 600; // 10 segundos de simulação contínua

    let audioTime = mockAudio.currentTime;
    let framesSinceAudioUpdate = 0;
    let freezeLength = 12; // congelamento inicial de 12 frames (~200ms)

    const recordedMusicalTimes = [];
    const deltas = [];

    for (let frame = 0; frame < totalFrames; frame++) {
      fakePerfNow += dt * 1000;
      framesSinceAudioUpdate++;

      // Simulação do comportamento real de browsers onde currentTime congela por 10 a 15 frames e salta bruscamente
      if (framesSinceAudioUpdate >= freezeLength) {
        audioTime += framesSinceAudioUpdate * dt;
        mockAudio.currentTime = audioTime;
        framesSinceAudioUpdate = 0;
        // Varia adversariamente o intervalo de congelamento entre 10 e 15 frames (160ms a 250ms)
        freezeLength = 10 + (frame % 6);
      }

      const prevTime = Cave.musicalTime;
      Cave.update(dt);
      const currTime = Cave.musicalTime;

      recordedMusicalTimes.push(currTime);

      if (frame > 0) {
        const delta = currTime - prevTime;
        deltas.push(delta);

        // 1. Não pode haver retrocesso no tempo (delta >= 0 estrito)
        assert.ok(
          delta >= 0,
          `Frame ${frame}: Retrocesso detectado no tempo musical! delta = ${delta.toFixed(6)}s`
        );

        // 2. Não pode haver descontinuidades abruptas (> 50ms num único frame de 16.6ms)
        assert.ok(
          delta < 0.050,
          `Frame ${frame}: Salto abrupto excessivo detectado! delta = ${(delta * 1000).toFixed(2)}ms`
        );

        // 3. A velocidade instantânea deve ser suave (sem congelamento após warmup)
        if (frame > 20) {
          assert.ok(
            delta > 0.005,
            `Frame ${frame}: Tempo estagnou ou avançou muito devagar: delta = ${(delta * 1000).toFixed(3)}ms`
          );
        }
      }
    }

    const minDelta = Math.min(...deltas);
    const maxDelta = Math.max(...deltas);
    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;

    // A média deve convergir para dt (16.67ms)
    assert.ok(
      Math.abs(avgDelta - dt) < 0.001,
      `A média do delta (${(avgDelta*1000).toFixed(2)}ms) deve convergir para dt (${(dt*1000).toFixed(2)}ms)`
    );

    console.log(`[PASS] Precision Audio Clock 60 FPS: ${totalFrames} frames. Min: ${(minDelta*1000).toFixed(2)}ms, Max: ${(maxDelta*1000).toFixed(2)}ms, Avg: ${(avgDelta*1000).toFixed(2)}ms`);

  } finally {
    globalThis.performance = originalPerformance;
  }
});

test('Precision Audio Clock: Resistência a clock drift, jitter e dessincronização de busca (> 0.4s)', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Cave = globalThis.CaveChapter1;
  Cave.currentLevel = 5;
  Cave.phase = 'musical_part1_shadows';
  Cave.musicalTime = 10.0;
  Cave._lastAudioTime = undefined;
  Cave._lastAudioPerf = undefined;

  const mockAudio = {
    paused: false,
    currentTime: 10.045
  };
  Cave.musicAudio = mockAudio;

  let fakePerfNow = 10000.0;
  const originalPerformance = globalThis.performance;
  globalThis.performance = { now: () => fakePerfNow };

  try {
    const dt = 1 / 60;

    // 1. Teste de drift contínuo
    for (let frame = 0; frame < 120; frame++) {
      fakePerfNow += dt * 1000;
      if (frame % 10 === 0) {
        // Áudio tem drift de -4ms a cada 10 frames
        mockAudio.currentTime += 10 * dt - 0.004;
      }
      const prev = Cave.musicalTime;
      Cave.update(dt);
      const curr = Cave.musicalTime;
      assert.ok(curr >= prev, `Frame ${frame}: retrocesso de tempo sob drift negativo de áudio`);
    }

    // 2. Teste de salto abrupto de busca (> 0.4s)
    // O usuário avança a música em 3.0s (seek forward)
    mockAudio.currentTime += 3.0;
    Cave.update(dt);
    // Deve resincronizar imediatamente para cerca de 13.0 - 0.045 = 12.955s
    assert.ok(
      Math.abs(Cave.musicalTime - (mockAudio.currentTime - 0.045)) < 0.05,
      `Após salto abrupto de busca, o relógio deve resincronizar de imediato. Obtido: ${Cave.musicalTime}`
    );

    // 3. Teste de seek backward (> 0.4s)
    mockAudio.currentTime -= 2.0;
    Cave.update(dt);
    assert.ok(
      Math.abs(Cave.musicalTime - (mockAudio.currentTime - 0.045)) < 0.05,
      `Após seek backward, o relógio deve resincronizar sem travar. Obtido: ${Cave.musicalTime}`
    );

  } finally {
    globalThis.performance = originalPerformance;
  }
});

// ------------------------------------------------------------------------------------------------
// SUÍTE 2: TESTE DE LIMITES DE AVALIAÇÃO DE HIT (evaluateHit Boundary Tests)
// ------------------------------------------------------------------------------------------------

test('evaluateHit: Limites exatos especificados na missão (0.000s, 0.090s, 0.150s, 0.280s, 0.500s)', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Karaoke = globalThis.CaveRhythmKaraoke;
  assert.ok(Karaoke, 'CaveRhythmKaraoke deve existir');

  // Palavra 1 da prática ("uma", t = 1.8s)
  const targetTime = 1.8;

  // 1. Toque cravado com diff = 0.000s -> Perfeito! (score 50, col #ffe033)
  Karaoke.resetPractice();
  let hit = Karaoke.evaluateHit(targetTime + 0.000, true);
  assert.ok(hit, 'diff = 0.000s deve ser registrado');
  assert.equal(hit.grade, 'perfeito', 'diff = 0.000s deve ser Perfeito!');
  assert.equal(hit.score, 50);

  // 2. Toque no limiar com diff = 0.090s -> Perfeito! (score 50, col #ffe033)
  Karaoke.resetPractice();
  hit = Karaoke.evaluateHit(targetTime + 0.090, true);
  assert.ok(hit, 'diff = 0.090s deve ser registrado');
  assert.equal(hit.grade, 'perfeito', 'diff = 0.090s deve ser Perfeito!');
  assert.equal(hit.score, 50);

  // 3. Toque com diff = 0.150s (tempo de reação auditivo humano típico) -> Ótimo! (score 25, col #68e3a2)
  Karaoke.resetPractice();
  hit = Karaoke.evaluateHit(targetTime + 0.150, true);
  assert.ok(hit, 'diff = 0.150s deve ser registrado');
  assert.equal(hit.grade, 'otimo', 'diff = 0.150s deve ser Ótimo!');
  assert.equal(hit.score, 25);

  // 4. Toque tardio com diff = 0.280s -> Tarde! (score 10, col #ff9c42) e NÃO null/miss
  Karaoke.resetPractice();
  hit = Karaoke.evaluateHit(targetTime + 0.280, true);
  assert.ok(hit, 'diff = 0.280s deve ser registrado (não null)');
  assert.equal(hit.grade, 'tarde', 'diff = 0.280s deve ser Tarde!');
  assert.equal(hit.score, 10);

  // 5. Toque muito tardio com diff = 0.500s -> Deve ser ignorado / null
  Karaoke.resetPractice();
  hit = Karaoke.evaluateHit(targetTime + 0.500, true);
  assert.equal(hit, null, 'diff = 0.500s deve ser ignorado (retornar null)');
});

test('evaluateHit: Janelas completas e simetria antecipado/atrasado', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Karaoke = globalThis.CaveRhythmKaraoke;
  const t0 = 1.8; // palavra 1

  const testCases = [
    // Extremamente cedo (fora da janela)
    { diff: -0.450, expectedGrade: null, desc: 'Antecipado extremo (-0.45s) -> fora da janela (null)' },

    // Faixa "Cedo demais": [-0.40, -0.22)
    { diff: -0.380, expectedGrade: 'cedo_demais', desc: 'Antecipado em -0.38s -> Cedo demais' },
    { diff: -0.300, expectedGrade: 'cedo_demais', desc: 'Antecipado em -0.30s -> Cedo demais' },
    { diff: -0.230, expectedGrade: 'cedo_demais', desc: 'Antecipado em -0.23s -> Cedo demais' },

    // Faixa "Ótimo!" (antecipado): [-0.22, -0.095)
    { diff: -0.210, expectedGrade: 'otimo', desc: 'Antecipado em -0.21s -> Ótimo!' },
    { diff: -0.150, expectedGrade: 'otimo', desc: 'Antecipado em -0.15s -> Ótimo!' },
    { diff: -0.100, expectedGrade: 'otimo', desc: 'Antecipado em -0.10s -> Ótimo!' },

    // Faixa "Perfeito!": [-0.095, +0.095]
    { diff: -0.090, expectedGrade: 'perfeito', desc: 'Antecipado em -0.09s -> Perfeito!' },
    { diff: -0.050, expectedGrade: 'perfeito', desc: 'Antecipado em -0.05s -> Perfeito!' },
    { diff: 0.000, expectedGrade: 'perfeito', desc: 'No tempo em 0.00s -> Perfeito!' },
    { diff: 0.050, expectedGrade: 'perfeito', desc: 'Atrasado em +0.05s -> Perfeito!' },
    { diff: 0.090, expectedGrade: 'perfeito', desc: 'Atrasado em +0.09s -> Perfeito!' },

    // Faixa "Ótimo!" (atrasado): (0.095, 0.24]
    { diff: 0.100, expectedGrade: 'otimo', desc: 'Atrasado em +0.10s -> Ótimo!' },
    { diff: 0.150, expectedGrade: 'otimo', desc: 'Atrasado em +0.15s -> Ótimo!' },
    { diff: 0.220, expectedGrade: 'otimo', desc: 'Atrasado em +0.22s -> Ótimo!' },

    // Faixa "Tarde!": (0.24, 0.36]
    { diff: 0.250, expectedGrade: 'tarde', desc: 'Atrasado em +0.25s -> Tarde!' },
    { diff: 0.280, expectedGrade: 'tarde', desc: 'Atrasado em +0.28s -> Tarde!' },
    { diff: 0.340, expectedGrade: 'tarde', desc: 'Atrasado em +0.34s -> Tarde!' },

    // Extremamente tarde (fora da janela)
    { diff: 0.420, expectedGrade: null, desc: 'Atrasado extremo em +0.42s -> fora da janela (null)' },
    { diff: 0.500, expectedGrade: null, desc: 'Atrasado extremo em +0.50s -> fora da janela (null)' }
  ];

  for (const tc of testCases) {
    Karaoke.resetPractice();
    // Usa arredondamento de 4 casas decimais para simular timestamp de relógio real
    const sampleTime = Math.round((t0 + tc.diff) * 10000) / 10000;
    const hit = Karaoke.evaluateHit(sampleTime, true);
    if (tc.expectedGrade === null) {
      assert.equal(hit, null, `${tc.desc} falhou: esperado null, obteve ${hit?.grade}`);
    } else {
      assert.ok(hit, `${tc.desc} falhou: retornou null`);
      assert.equal(hit.grade, tc.expectedGrade, `${tc.desc} falhou: esperado ${tc.expectedGrade}, obteve ${hit.grade}`);
    }
  }
});

test('Não-expiração prematura em CaveRhythmKaraoke.update', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Karaoke = globalThis.CaveRhythmKaraoke;
  Karaoke.resetPractice();

  const w1 = Karaoke.practicePhrase.words[1]; // t = 1.8
  assert.equal(w1.judged, false);

  // Aos 1.8 + 0.36s (fim da janela de acerto "Tarde!"), a palavra ainda NÃO pode estar julgada como miss
  Karaoke.update(0.016, 1.8 + 0.36, false, true);
  assert.equal(w1.judged, false, 'Palavra em t+0.36s não pode ser descartada antes da janela fechar');

  // Apenas após t + 0.38s a palavra deve ser marcada como missed
  Karaoke.update(0.030, 1.8 + 0.385, false, true);
  assert.equal(w1.judged, true, 'Palavra após t+0.38s deve ser marcada como julgada');
  assert.equal(w1.missed, true, 'Palavra expirada deve ser marcada como missed');
});

test('Continuidade Cinemática da Bolinha (getBallPosition) durante degraus de áudio', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Karaoke = globalThis.CaveRhythmKaraoke;
  Karaoke.resetPractice();

  // Amostra a trajetória a cada 16.6ms (60 FPS) entre t = 0.5s e t = 3.5s
  let prevX = null;
  let prevY = null;
  let maxJumpX = 0;
  let maxJumpY = 0;

  for (let t = 0.5; t <= 3.5; t += 0.0166667) {
    const pos = Karaoke.getBallPosition(t, true);
    assert.ok(pos, `Posição da bolinha deve ser retornada em t = ${t}`);
    assert.ok(Number.isFinite(pos.x), `pos.x deve ser finito em t = ${t}`);
    assert.ok(Number.isFinite(pos.y), `pos.y deve ser finito em t = ${t}`);

    if (prevX !== null) {
      const dx = Math.abs(pos.x - prevX);
      const dy = Math.abs(pos.y - prevY);
      if (dx > maxJumpX) maxJumpX = dx;
      if (dy > maxJumpY) maxJumpY = dy;

      // Não pode haver teletransporte abrupto entre frames contíguos de 16.6ms
      // A maior distância entre palavras é ~50px ao longo de ~1.0s -> ~1px/frame (max permitido 8px/frame)
      assert.ok(
        dx <= 8,
        `Teletransporte horizontal detectado na bolinha em t = ${t.toFixed(3)}s: dx = ${dx}px`
      );
      assert.ok(
        dy <= 10,
        `Salto vertical excessivo detectado na bolinha em t = ${t.toFixed(3)}s: dy = ${dy}px`
      );
    }

    prevX = pos.x;
    prevY = pos.y;
  }

  console.log(`[PASS] Ball Kinematics Continuity: 180 frames. Max dx: ${maxJumpX}px/frame, Max dy: ${maxJumpY}px/frame`);
});
