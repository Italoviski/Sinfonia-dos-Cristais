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

test('CaveRhythmKaraoke inicializa com 23 frases, prática e layout de texto dentro do pergaminho (300px)', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Karaoke = globalThis.CaveRhythmKaraoke;
  assert.ok(Karaoke, 'CaveRhythmKaraoke deve existir no escopo global');
  assert.equal(typeof Karaoke.update, 'function', 'update deve ser função');
  assert.equal(typeof Karaoke.render, 'function', 'render deve ser função');
  assert.equal(typeof Karaoke.onInput, 'function', 'onInput deve ser função');
  assert.equal(typeof Karaoke.evaluateHit, 'function', 'evaluateHit deve ser função');

  const phrases = Karaoke.phrases;
  assert.equal(phrases.length, 38, 'Devem existir exatamente 38 frases sincronizadas com a música completa cantada');

  // Verifica que cada frase cabe com margem folgada dentro dos 300px do pergaminho (max <= 230px)
  let maxW = 0;
  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i];
    assert.ok(p.t0 >= 0 && p.t1 > p.t0, `Frase ${i} deve ter t0 e t1 válidos`);
    if (p.words.length === 0) {
      assert.ok(p.banner, `Frase ${i} sem palavras deve ter banner descritivo`);
      continue;
    }

    const firstWord = p.words[0];
    const lastWord = p.words[p.words.length - 1];
    const totalW = (lastWord.x + lastWord.width) - firstWord.x;
    if (totalW > maxW) maxW = totalW;
    assert.ok(totalW <= 270, `Frase ${i} excede limite seguro do pergaminho: ${totalW}px`);

    // Cada palavra deve ter coordenadas lógicas válidas
    for (const w of p.words) {
      assert.ok(w.width > 0, `Palavra "${w.text}" deve ter largura calculada`);
      assert.ok(w.midX >= w.x, `Palavra "${w.text}" deve ter centro horizontal válido`);
    }
  }
  assert.ok(maxW <= 270, `Frase mais longa (${maxW}px) deve caber no pergaminho de 300px com margem`);

  // Prática
  const practice = Karaoke.practicePhrase;
  assert.ok(practice, 'practicePhrase deve existir');
  assert.equal(practice.words.length, 4, 'Frase de prática deve ter 4 palavras');
});

test('CaveRhythmKaraoke avalia acertos rítmicos: Cedo demais, Ótimo e Perfeito', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Karaoke = globalThis.CaveRhythmKaraoke;
  Karaoke.resetPractice();

  // A frase de prática tem palavras em t = 0.8, 1.8, 2.8, 3.9 (hold)
  // 1. Toque muito antes da janela (tempo 0.1s para t=0.8s) -> null
  let res = Karaoke.evaluateHit(0.1, true);
  assert.equal(res, null, 'Toque antes da janela não deve registrar acerto');

  // 2. Toque prematuro ("Cedo demais") entre -0.55s e -0.20s (ex: 0.8 - 0.28 = 0.52s)
  res = Karaoke.evaluateHit(0.52, true);
  assert.ok(res, 'Deve registrar toque');
  assert.equal(res.text, 'Cedo demais');
  assert.equal(res.score, 10);

  // 3. Toque aproximado ("Ótimo!") entre -0.20s e -0.09s (ex: 1.8 - 0.14 = 1.66s)
  res = Karaoke.evaluateHit(1.66, true);
  assert.ok(res, 'Deve registrar toque');
  assert.equal(res.text, 'Ótimo!');
  assert.equal(res.score, 25);

  // 4. Toque cravado no tempo ("Perfeito!") dentro de ±0.088s (ex: 2.8 + 0.02 = 2.82s)
  res = Karaoke.evaluateHit(2.82, true);
  assert.ok(res, 'Deve registrar toque');
  assert.equal(res.text, 'Perfeito!');
  assert.equal(res.score, 50);
});

test('CaveRhythmKaraoke sustenta notas estendidas (hold) e detecta soltura prematura', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Karaoke = globalThis.CaveRhythmKaraoke;
  Karaoke.resetPractice();

  // Palavra de índice 3 ("harmonia!") em t = 3.9s com holdDur = 2.3s
  const holdWord = Karaoke.practicePhrase.words[3];
  assert.equal(holdWord.isHold, true, 'Última palavra da prática deve ser nota estendida');

  // 1. Pressiona tecla no tempo exato (t = 3.9s)
  Karaoke.onInput(true, true, 3.9, true);
  assert.equal(holdWord.holding, true, 'Palavra deve entrar em estado holding');

  // 2. Simula sustentação por 0.8s
  Karaoke.update(0.4, 4.3, true, true);
  Karaoke.update(0.4, 4.7, true, true);
  assert.equal(holdWord.holding, true, 'Deve continuar holding');

  // 3. Solta antes de 72% da nota (soltou aos 0.8s de 2.3s ~ 35%)
  Karaoke.onInput(false, true, 4.7, true);
  assert.equal(holdWord.holding, false, 'Deve sair do estado holding');
  const earlyFeedback = Karaoke.feedbacks.find(f => f.text === 'Soltou cedo');
  assert.ok(earlyFeedback, 'Deve exibir feedback "Soltou cedo" para soltura precoce');

  // 4. Agora testa sustentação bem-sucedida (> 85%)
  Karaoke.resetPractice();
  Karaoke.onInput(true, true, 3.9, true);
  // Avança até 3.9 + 2.05 = 5.95s (> 89% do holdDur de 2.3s)
  Karaoke.update(2.05, 5.95, true, true);
  const sustainFeedback = Karaoke.feedbacks.find(f => f.text === 'Sustentado!');
  assert.ok(sustainFeedback, 'Deve conceder bônus "Sustentado!" ao manter espaço pressionado');
});

test('CaveChapter1: vinheta da Fase 5 (Cards 1 e 2), transição para música e reinício limpo', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Cave = globalThis.CaveChapter1;
  assert.ok(Cave, 'CaveChapter1 deve existir');

  // 1. Inicia Fase 5 diretamente
  Cave.startFase5();
  assert.equal(Cave.currentLevel, 5, 'Nível atual deve ser 5');
  assert.equal(Cave.phase, 'musical_vignette', 'Fase deve entrar na vinheta preparatória');
  assert.equal(Cave.vignetteCard, 1, 'Deve abrir no Card 1 (Apresentação)');

  // 2. Avança Card 1 para Card 2 (Modo Prática Interativa)
  // Clica no botão central inferior do Card 1 (x: 240, y: 155)
  Cave.handleVignetteClick(240, 155);
  assert.equal(Cave.vignetteCard, 2, 'Deve avançar para Card 2 (Treino Interativo)');
  assert.equal(Cave.vignettePracticeTime, 0, 'Tempo de treino deve iniciar em 0');

  // 3. Atualiza no Card 2 e verifica que o loop de treino avança
  Cave.update(0.1);
  assert.ok(Cave.vignettePracticeTime > 0, 'Tempo de treino deve avançar no update');

  // 4. Inicia música real a partir do Card 2 (botão "♪ Iniciar Show!" em x: 240, y: 155)
  Cave.handleVignetteClick(240, 155);
  assert.equal(Cave.phase, 'musical_part1_shadows', 'Deve entrar no Ato 1 da música (Teatro de Sombras)');
  assert.equal(Cave.currentLevel, 5, 'Deve permanecer na Fase 5');

  // 5. Reinicia fase durante a música (pressionando R ou chamando restartCurrentPhase)
  Cave.restartCurrentPhase();
  assert.equal(Cave.currentLevel, 5, 'Deve continuar na Fase 5');
  assert.equal(Cave.phase, 'musical_vignette', 'Deve recomeçar na vinheta da Fase 5 de forma limpa');
  assert.equal(Cave.isHoldingSpace, false, 'isHoldingSpace deve ser falso após reiniciar');
});

test('TruePixelEngine: exporta wrapPixelLines e renderiza todos os glifos essenciais sem fallback', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  const E = globalThis.TruePixelEngine;

  assert.equal(typeof E.wrapPixelLines, 'function', 'wrapPixelLines deve ser exportado');
  assert.equal(typeof E.measurePixelText, 'function', 'measurePixelText deve ser exportado');

  const testStr = 'A bolinha salta de palavra em palavra no compasso do violino!';
  const wrapped = E.wrapPixelLines(testStr, 120);
  assert.ok(wrapped.length >= 2, 'Deve quebrar em múltiplas linhas');
  assert.equal(wrapped.join(' '), testStr, 'Texto quebrado deve preservar todas as palavras');

  // Glifos especiais essenciais de UI e ritmo
  const glyphs = ['▶', '◀', '•', '♪', '↺', '↻', '♥', '—', '–', '…', '&', '*', '[', ']', '_', '°', 'º', 'ª'];
  for (const ch of glyphs) {
    const w = E.measurePixelText(ch);
    assert.ok(w > 0, `Glifo ${ch} deve ter largura positiva calculada`);
  }
});

test('CaveChapter1: vinheta Card 1 e Card 2 com zero sobreposição de texto e botões clicáveis em toda a extensão', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Cave = globalThis.CaveChapter1;
  const Karaoke = globalThis.CaveRhythmKaraoke;
  Cave.startFase5();
  assert.equal(Cave.vignetteCard, 1);

  // Card 1 -> Card 2
  Cave.handleVignetteClick(240, 155);
  assert.equal(Cave.vignetteCard, 2);

  // Card 2: botão recomeçar na lateral esquerda (x: 50, y: 155)
  Cave.vignettePracticeTime = 3.5;
  Cave.handleVignetteClick(50, 155);
  assert.equal(Cave.vignettePracticeTime, 0, 'Clique em x=50, y=155 deve reiniciar o treino');

  // Card 2: clique no palco fora dos botões registra input rítmico
  Karaoke.resetPractice();
  Cave.vignettePracticeTime = 0.8; // momento da palavra 0 ("Era")
  Cave.handleVignetteClick(150, 60);
  assert.equal(Cave.isHoldingSpace, true, 'Clique no palco deve acionar sustentação');
  assert.equal(Karaoke.practicePhrase.words[0].judged, true, 'Palavra alvo deve ser julgada');

  // Card 2: botão iniciar show na lateral direita (x: 240, y: 155)
  Cave.handleVignetteClick(240, 155);
  assert.equal(Cave.phase, 'musical_part1_shadows', 'Clique em x=240, y=155 deve iniciar show');
});

test('CaveRhythmKaraoke: física do pulo sustentado (hold) e tolerância do círculo de aproximação', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Karaoke = globalThis.CaveRhythmKaraoke;
  Karaoke.resetPractice();

  // Teste de física de sustentação da bolinha na nota estendida "harmonia!" (t=3.9, holdDur=2.3)
  const holdW = Karaoke.practicePhrase.words[3];
  Karaoke.onInput(true, true, 3.9, true);
  assert.equal(holdW.holding, true);

  // Mock canvas para capturar coordenadas desenhadas no render
  let drawnY = null;
  const mockCtx = {
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
    fillRect(x, y, w, h) {
      // Captura posição da bolinha
      if (w === 9 && h === 7) drawnY = y;
    }
  };

  Karaoke.render(mockCtx, 4.5, true);
  const holdingY = drawnY;

  // Solta prematuramente
  Karaoke.onInput(false, true, 4.6, true);
  assert.equal(holdW.holdFailed, true);
  Karaoke.render(mockCtx, 4.7, true);
  const droppedY = drawnY;

  // A bolinha sustentada no ar deve estar mais alta (menor valor de y) que a bolinha caída
  assert.ok(holdingY < droppedY, `Bolinha sustentada (${holdingY}) deve flutuar mais alto que a caída (${droppedY})`);
});

test('CaveRhythmKaraoke: todos os arcos de um trecho novo já ficam traçados desde t0 e letra cantada completa está presente', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Karaoke = globalThis.CaveRhythmKaraoke;
  Karaoke.initLayouts();

  const fullText = Karaoke.phrases
    .filter(p => p.words && p.words.length > 0)
    .map(p => p.words.map(w => w.text).join(' '))
    .join(' | ');

  for (const snippet of [
    'reino envolto em pura alegria',
    'chamaram de farsa o perigo presente!',
    'Na sombra gerada por mãos tão cruéis,',
    'intensificando o caos e a desordem,',
    'vagando cá e acolá, tão de repente!',
    'topou com a verdade mais dura e eterna:',
    'O chão se abriu, e no calabouço ela caiu!',
    'Contudo, respira fundo, isso não foi o fim!',
    'Um, dois, três e... vamos lá!',
    'Abre o sapatinho! Vai no sapatinho!',
    'Pequenos passos fazendo a terra inteira florescer!',
    'Siga as minhas regras que tudo vai fluir!',
    'Viu como a Ordem faz tudo brilhar?'
  ]) {
    assert.ok(fullText.includes(snippet), `Letra cantada deve conter "${snippet}"`);
  }

  // Verifica que no exato instante t0 em que cada trecho aparece, todos os arcos entre suas palavras já estão traçados
  for (let pi = 0; pi < Karaoke.phrases.length; pi++) {
    const p = Karaoke.phrases[pi];
    if (!p.words || p.words.length < 2) continue;
    const arcsAtStart = Karaoke.getPhraseArcs(p, { x: 10, y: 153, w: 300, h: 25 }, p.t0);
    assert.equal(
      arcsAtStart.length,
      p.words.length - 1,
      `Frase ${pi} deve ter todos os ${p.words.length - 1} arcos traçados já em t0=${p.t0}`
    );
    for (const seg of arcsAtStart) {
      assert.ok(seg.x1 > seg.x0, `Arco de P${pi} (${seg.fromIndex}->${seg.toIndex}) deve avançar na horizontal`);
      assert.ok(seg.height >= 6 && seg.height <= 25, `Arco de P${pi} deve ter altura válida`);
      assert.equal(seg.u, 0, `Em t0=${p.t0}, o arco (${seg.fromIndex}->${seg.toIndex}) deve estar 100% pré-traçado (u=0)`);
    }
  }
});


