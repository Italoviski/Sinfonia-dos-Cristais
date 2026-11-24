import test from 'node:test';
import assert from 'node:assert/strict';

function setupNodeDOM(options = {}) {
  globalThis.window = globalThis;
  globalThis.window.innerWidth = options.innerWidth ?? 1280;
  globalThis.window.innerHeight = options.innerHeight ?? 720;
  if (options.isMobile) {
    globalThis.window.ontouchstart = () => {};
    globalThis.window.matchMedia = (q) => ({ matches: q.includes('coarse') });
  } else {
    delete globalThis.window.ontouchstart;
    globalThis.window.matchMedia = () => ({ matches: false });
  }

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
    const ctx = {
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
    return ctx;
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
  if (globalThis.document?.body?.classList) {
    globalThis.document.body.classList.toggle('is-touch-device', Boolean(options.isMobile));
  }

  return { createMockCtx };
}

test('Item 1: Caverna Fase 2 Etapa 3 ensina que podem sobrar cristais', async () => {
  const { createMockCtx } = setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const E = globalThis.TruePixelEngine;
  const Cave = globalThis.CaveChapter1;
  const cardSet = E.StandardTutorialCards.FASE2_LEFTOVER;

  assert.ok(Array.isArray(cardSet) && cardSet.length >= 1, 'StandardTutorialCards.FASE2_LEFTOVER deve existir');
  assert.equal(cardSet[0].vignette, 'leftover_crystals', 'Vinheta deve ser leftover_crystals');
  assert.match(cardSet[0].body, /sobrar/i, 'Texto deve ensinar claramente que podem sobrar cristais');
  assert.ok(/\{[a-z]+:[^}]+\}/.test(cardSet[0].body), 'Texto deve possuir palavras-chave destacadas');

  E.TutorialModal.close();
  Cave.setupLevelStep(2, 3);
  assert.equal(E.TutorialModal.isOpen, true, 'CaveChapter1.setupLevelStep(2, 3) deve abrir TutorialModal');
  assert.equal(E.TutorialModal.cards[0].id, 'tut_leftover_crystals', 'Tutorial aberto na Fase 2 Etapa 3 deve ser tut_leftover_crystals');

  const ops = [];
  E.TutorialModal.render(createMockCtx(ops), 1.5);
  assert.ok(ops.some(o => o.op === 'fillText' && String(o.txt).includes('SOBROU')), 'Vinheta leftover_crystals deve exibir feedback visual de sobra OK');
  E.TutorialModal.close();
});

test('Item 2: Equação Cristalina possui etapa interativa de Treino Livre sem penalidade', async () => {
  const { createMockCtx } = setupNodeDOM();
  await import('../js/true-pixel-engine.js');

  const E = globalThis.TruePixelEngine;
  const Modal = E.TutorialModal;
  const eqCards = E.StandardTutorialCards.FASE3_EQUATION_AURA;

  assert.ok(Array.isArray(eqCards) && eqCards.length >= 2, 'FASE3_EQUATION_AURA deve possuir 2 cards');
  assert.equal(eqCards[1].interactivePractice, 'equation_practice', '2º card deve ser treino interativo de equação');

  let finished = false;
  E.GameHUD.godMode = false;
  Modal.open(eqCards, () => { finished = true; });
  Modal.pageElapsed = Modal.pageDuration + 0.1;
  Modal.nextStep();

  assert.equal(Modal.currentIndex, 1, 'Deve avançar para o 2º card (treino prático)');
  assert.ok(Modal.practiceState, 'practiceState deve ser inicializado ao entrar no treino da equação');
  assert.ok(Modal.practiceState.eq, 'practiceState deve conter a equação de treino');
  assert.ok(Array.isArray(Modal.practiceState.pieces) && Modal.practiceState.pieces.length >= 2, 'practiceState deve conter cristais arrastáveis');

  // Testar clicar na equação expandida/fechada dentro do practiceRect não fecha/avança o modal
  const eq = Modal.practiceState.eq;
  const initialExpanded = Boolean(eq.expanded);
  const clickedPractice = Modal.handleClick(eq.x, eq.y);
  assert.equal(clickedPractice, true, 'Clique dentro da área prática deve ser tratado');
  Modal.handlePointerUp(eq.x, eq.y);
  assert.equal(Modal.isOpen, true, 'Interação na área de treino não deve fechar o modal');
  assert.equal(finished, false, 'Interação na área de treino não deve disparar onFinish');
  assert.equal(eq.expanded, !initialExpanded, 'Tocar na equação no treino deve alternar expanded');

  // Arrastar um cristal externo para dentro da equação
  const freePiece = Modal.practiceState.pieces.find(p => !p.inEq);
  assert.ok(freePiece, 'Deve haver cristal fora da equação para teste de arraste');
  Modal.handleClick(freePiece.x, freePiece.y);
  Modal.handlePointerMove(eq.x, eq.y);
  Modal.handlePointerUp(eq.x, eq.y);
  assert.equal(freePiece.inEq, true, 'Arrastar cristal para a equação no treino deve adicioná-lo');

  // Testar botão Reset do treino
  const rb = Modal.practiceState.resetBtnRect;
  Modal.handleClick(rb.x + 4, rb.y + 4);
  Modal.handlePointerUp(rb.x + 4, rb.y + 4);
  const freeCountAfterReset = Modal.practiceState.pieces.filter(p => !p.inEq).length;
  assert.ok(freeCountAfterReset >= 2, 'Reset do treino deve restaurar os cristais originais');

  // Render sem erros e botão Começar finaliza após tempo de leitura
  Modal.render(createMockCtx([]), 1.0);
  Modal.pageElapsed = Modal.pageDuration + 0.1;
  Modal.handleClick(Modal.btnRect.x + 4, Modal.btnRect.y + 4);
  assert.equal(Modal.isOpen, false, 'Clicar em Começar! desbloqueado deve fechar modal');
  assert.equal(finished, true, 'onFinish deve disparar ao clicar em Começar!');
});

test('Item 3: Tutorial da Fração Cristalina possui área de vídeo ampliada e animação clara sem sobreposição', async () => {
  const { createMockCtx } = setupNodeDOM();
  await import('../js/true-pixel-engine.js');

  const E = globalThis.TruePixelEngine;
  const Modal = E.TutorialModal;
  const fracCards = E.StandardTutorialCards.RIVER_FRACTION_PLATFORM;

  assert.ok(Array.isArray(fracCards) && fracCards.length >= 2, 'RIVER_FRACTION_PLATFORM deve possuir 2 cards');
  assert.equal(fracCards[0].largeVignette, true, 'Card 1 da fração deve habilitar largeVignette');
  assert.equal(fracCards[1].largeVignette, true, 'Card 2 da fração deve habilitar largeVignette');
  assert.match(fracCards[0].body, /TOPO/i);
  assert.match(fracCards[0].body, /BASE/i);
  assert.match(fracCards[1].body, /Dividir/i);

  Modal.open(fracCards);
  const ops = [];
  Modal.render(createMockCtx(ops), 1.2);

  // A vinheta desenha fundo '#241d1a' via fillRect(vx, vy, vw, vh)
  const vigBg = ops.find(o => o.op === 'fillRect' && o.fillStyle === '#241d1a');
  assert.ok(vigBg, 'Deve renderizar caixa da vinheta demonstrativa');
  assert.ok(vigBg.h >= 50, `Altura da vinheta ampliada deve ser >= 50px, obtida: ${vigBg.h}`);

  // Verificar que o texto do corpo começa abaixo da vinheta (zero sobreposição) e acima da barra inferior
  const textCalls = ops.filter(o => o.op === 'fillText' && o.y > vigBg.y && o.txt !== 'Começar!' && o.txt !== 'Avançar >');
  const bodyCalls = textCalls.filter(o => o.y >= vigBg.y + vigBg.h);
  assert.ok(bodyCalls.length > 0, 'Texto explicativo da fração deve ser renderizado abaixo da área ampliada de demonstração');
  assert.ok(bodyCalls.every(o => o.y <= 146), 'Texto explicativo não deve invadir a barra de progresso inferior');

  // Verifica animação do card 2 (Divisão)
  Modal.pageElapsed = Modal.pageDuration + 0.1;
  Modal.nextStep();
  const ops2 = [];
  Modal.render(createMockCtx(ops2), 1.5);
  assert.ok(ops2.some(o => o.op === 'fillText' && /DIVIDIR/i.test(String(o.txt))), 'Card 2 da fração deve demonstrar claramente a ação de DIVIDIR');

  Modal.close();
});

test('Item 4: Treino Livre de Ritmo exibe demonstração visual sincronizada no PC e no Mobile', async () => {
  const { createMockCtx } = setupNodeDOM({ isMobile: false });
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const Cave = globalThis.CaveChapter1;
  assert.equal(typeof Cave.getRhythmDemoInputState, 'function', 'CaveChapter1.getRhythmDemoInputState deve existir');

  // Testar estados de sincronização com a frase prática (Era=0.8, uma=1.8, vez...=2.8, harmonia!=3.8..5.2)
  const waitState = Cave.getRhythmDemoInputState(0.2);
  assert.equal(waitState.pressed, false, 'Em t=0.2s antes do beat, demonstração está aguardando');

  const beatState = Cave.getRhythmDemoInputState(0.8);
  assert.equal(beatState.isBeat, true, 'Em t=0.8s, círculo fecha e indica beat');
  assert.equal(beatState.pressed, true, 'Em t=0.8s, tecla/botão demo deve aparecer pressionado');
  assert.ok(typeof beatState.label === 'string' && beatState.label.length > 0, 'Deve retornar rótulo instrutivo');

  const holdState = Cave.getRhythmDemoInputState(4.3);
  assert.equal(holdState.isHold, true, 'Em t=4.3s (durante harmonia!), demonstração indica SEGURAR');
  assert.equal(holdState.pressed, true, 'Durante hold, tecla/botão demo permanece pressionado');

  // Render PC (Espaço + Mouse)
  Cave.startFase5();
  Cave.vignetteCard = 2;
  Cave.vignettePracticeTime = 0.8;
  const pcOps = [];
  Cave.renderMusicalVignette(createMockCtx(pcOps), 0.8);
  assert.ok(pcOps.some(o => o.op === 'fillText' && /ESPA[ÇC]O/i.test(String(o.txt))), 'No PC, deve exibir demonstração da tecla ESPAÇO');
  assert.ok(pcOps.some(o => o.op === 'fillText' && /APERTE/i.test(String(o.txt))), 'No momento do beat, deve destacar instrução APERTE');

  // Render Mobile (Mãozinha + Botão touch)
  setupNodeDOM({ isMobile: true });
  Cave.vignettePracticeTime = 4.3;
  const mobOps = [];
  Cave.renderMusicalVignette(createMockCtx(mobOps), 4.3);
  assert.ok(mobOps.some(o => o.op === 'fillText' && /SEGURE/i.test(String(o.txt))), 'No Mobile em nota longa, deve destacar instrução SEGURE');
  assert.ok(mobOps.some(o => o.op === 'fillRect' && o.fillStyle === '#ffdbac'), 'No Mobile, deve desenhar mãozinha animada pressionando o botão');
});

test('Item 5: Botão Guia na HUD das fases abre Menu em duas colunas organizado por Mundo', async () => {
  const { createMockCtx } = setupNodeDOM();
  await import('../js/true-pixel-engine.js');

  const HUD = globalThis.TruePixelEngine.GameHUD;
  const bGuide = HUD.buttons.guide;

  // Verifica layout da top bar sem botão Pause e com botão Casa (home) ao lado de Configurações
  assert.ok(bGuide, 'GameHUD.buttons.guide deve existir');
  assert.equal(HUD.buttons.pause, undefined, 'Botão Pause deve ter sido removido da barra superior');
  assert.equal(HUD.buttons.map.x, 154, 'Botão Mapa não deve deslocar de x=154');
  assert.equal(HUD.buttons.settings.x, 276, 'Botão Configurações deve estar em x=276');
  assert.ok(HUD.buttons.home, 'Botão Casa (home) deve existir');
  assert.equal(HUD.buttons.home.x, 298, 'Botão Casa (home) deve estar imediatamente ao lado de Configurações em x=298');
  assert.ok(bGuide.x + bGuide.w <= HUD.buttons.map.x, 'Botão Guia não deve sobrepor o botão Mapa');

  // Verifica catálogo organizado nos 4 mundos
  const catalog = typeof HUD.getGuideCatalog === 'function' ? HUD.getGuideCatalog() : HUD.guideCatalog;
  assert.ok(catalog && catalog.caverna && catalog.floresta && catalog.rio && catalog.caatinga, 'Catálogo do Guia deve separar os 4 mundos');
  assert.ok(catalog.caverna.items.length >= 5, 'Caverna deve listar todos os seus tutoriais (incluindo sobras)');
  assert.ok(catalog.floresta.items.length >= 3, 'Floresta deve listar seus tutoriais');
  assert.ok(catalog.rio.items.length >= 3, 'Rio deve listar seus tutoriais');
  assert.ok(catalog.caatinga.items.length >= 5, 'Caatinga deve listar seus tutoriais');

  // Garante renderTopBar mostra botão Guia
  const topOps = [];
  HUD.renderTopBar(createMockCtx(topOps), 1, 1, 3);
  assert.ok(topOps.some(o => o.op === 'fillText' && String(o.txt).includes('Guia')), 'HUD superior deve exibir rótulo Guia');

  // Abrir Guia via clique no botão Guia
  HUD.guideOpen = false;
  HUD.paused = false;
  HUD.settingsOpen = false;
  const handledOpen = HUD.handleClick(bGuide.x + 5, bGuide.y + 5);
  assert.equal(handledOpen, true, 'Clique no botão Guia deve ser tratado pela HUD');
  assert.equal(HUD.guideOpen, true, 'Clique no botão Guia deve abrir o menu Guia');

  // Alternar para mundo Rio clicando na aba da coluna esquerda e selecionar tutorial
  const tabs = HUD.guideLayout?.worldTabRects;
  assert.ok(tabs && tabs.rio, 'Guia deve possuir abas clicáveis para os mundos na coluna esquerda');
  HUD.handleClick(tabs.rio.x + 4, tabs.rio.y + 4);
  assert.equal(HUD.guideWorld, 'rio', 'Clique na aba Rio deve filtrar tutoriais do Rio');

  // Renderiza o modal de duas colunas
  const modalOps = [];
  HUD.renderModals(createMockCtx(modalOps), 1.4);
  assert.ok(modalOps.some(o => o.op === 'fillText' && /Guia/i.test(String(o.txt))), 'Cabeçalho do Guia deve ser renderizado');
  assert.ok(modalOps.some(o => o.fillStyle === '#241d1a'), 'Coluna direita do Guia deve renderizar vinheta animada do tutorial selecionado');

  // Fechar Guia pelo botão Fechar
  const closeBtn = HUD.guideLayout?.closeBtn;
  assert.ok(closeBtn, 'Guia deve possuir botão Fechar');
  HUD.handleClick(closeBtn.x + 4, closeBtn.y + 4);
  assert.equal(HUD.guideOpen, false, 'Clicar em Fechar deve fechar o menu Guia');
});
