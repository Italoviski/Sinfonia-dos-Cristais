import test from 'node:test';
import assert from 'node:assert/strict';

function setupNodeDOM() {
  globalThis.window = globalThis;
  globalThis.window.innerWidth = 1280;
  globalThis.window.innerHeight = 720;
  delete globalThis.window.ontouchstart;
  globalThis.window.matchMedia = () => ({ matches: false });

  const storage = new Map();
  globalThis.localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => { storage.set(k, String(v)); },
    removeItem: (k) => { storage.delete(k); },
    clear: () => { storage.clear(); }
  };

  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
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
      constructor() { this._src = ''; }
      get src() { return this._src; }
      set src(v) { this._src = v; }
    };
  }
  if (!globalThis.Audio) {
    globalThis.Audio = class Audio {
      constructor() { this._src = ''; this.paused = true; }
      load() {}
      play() { return Promise.resolve(); }
      pause() {}
      addEventListener() {}
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
        toggle: (c, f) => (f ? (classes.add(c), true) : (classes.delete(c), false)),
        contains: (c) => classes.has(c)
      },
      setAttribute: () => {},
      getAttribute: () => null,
      appendChild: (c) => c,
      append: () => {},
      remove: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      getContext: () => createMockCtx(),
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

  return { createMockCtx, storage };
}

test('Guia: desbloqueio gradual, sem spoilers, persistência, abertura no último tutorial visto e God Mode', async () => {
  const { createMockCtx } = setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');
  await import('../js/app.js');

  const E = globalThis.TruePixelEngine;
  const HUD = E.GameHUD;
  const Modal = E.TutorialModal;
  const App = globalThis.CrystalApp;

  // Reset limpo de progresso
  HUD.setGodMode(false, true);
  Modal.seenKeys.clear();
  HUD.syncTutorialProgress({ unlockedTutorials: [], lastViewedTutorialKey: null, guideIntroShown: false, completed: [] });

  // 1. Sem progresso: tutoriais futuros estão bloqueados e ocultos como "???" sem spoilers
  assert.equal(HUD.isTutorialUnlocked('FASE1_INTRO'), false);
  assert.equal(HUD.isTutorialUnlocked('FOREST_EMERALD'), false);
  assert.equal(HUD.isTutorialUnlocked('CAATINGA_SHELL_GAME'), false);

  HUD.guideOpen = true;
  HUD.openGuideAtLastViewed();
  const lockedOps = [];
  HUD.renderGuideModal(createMockCtx(lockedOps), 1.0);
  const lockedTexts = lockedOps.filter(o => o.op === 'fillText').map(o => String(o.txt));
  assert.ok(lockedTexts.some(t => t.includes('???')), 'Itens bloqueados devem aparecer ocultos como ???');
  assert.ok(lockedTexts.some(t => /Bloqueado/i.test(t)), 'Painel direito bloqueado deve informar Tutorial Bloqueado sem spoiler');
  assert.ok(!lockedTexts.some(t => /Opala de Fogo/i.test(t)), 'Não deve vazar nome de mecânica bloqueada');

  // 2. Ao abrir tutorial na campanha (ex: FASE2_OPAL), ele desbloqueia, vira lastViewedTutorialKey e persiste no localStorage
  Modal.open(E.StandardTutorialCards.FASE1_INTRO);
  Modal.close();
  Modal.open(E.StandardTutorialCards.FASE2_OPAL);
  Modal.close();

  assert.equal(HUD.isTutorialUnlocked('FASE1_INTRO'), true);
  assert.equal(HUD.isTutorialUnlocked('FASE2_OPAL'), true);
  assert.equal(HUD.isTutorialUnlocked('FASE3_EQUATION_AURA'), false, 'Tutoriais ainda não vistos continuam bloqueados');
  assert.equal(HUD.lastViewedTutorialKey, 'FASE2_OPAL');

  const saved = JSON.parse(globalThis.localStorage.getItem('crystal-campaign-v4'));
  assert.ok(saved.unlockedTutorials.includes('FASE1_INTRO'), 'FASE1_INTRO deve persistir no localStorage');
  assert.ok(saved.unlockedTutorials.includes('FASE2_OPAL'), 'FASE2_OPAL deve persistir no localStorage');
  assert.equal(saved.lastViewedTutorialKey, 'FASE2_OPAL', 'lastViewedTutorialKey deve persistir no localStorage');

  // 3. Ao clicar no botão Guia, abre automaticamente na aba e item do ÚLTIMO tutorial visto
  HUD.guideOpen = false;
  HUD.guideWorld = 'caatinga';
  HUD.guideItemIndex = 4;
  HUD.handleClick(HUD.buttons.guide.x + 5, HUD.buttons.guide.y + 5);
  assert.equal(HUD.guideOpen, true);
  assert.equal(HUD.guideWorld, 'caverna', 'Deve abrir na aba do último tutorial visto');
  assert.equal(HUD.guideItemIndex, 1, 'Deve abrir no item FASE2_OPAL (índice 1)');
  HUD.guideOpen = false;

  // 4. Sincronização com fases concluídas (completed) desbloqueia tutoriais correspondentes
  App.syncProgress([1, 2, 3, 6], 7);
  assert.equal(HUD.isTutorialUnlocked('FASE3_EQUATION_AURA'), true, 'Fase 3 concluída desbloqueia FASE3_EQUATION_AURA');
  assert.equal(HUD.isTutorialUnlocked('FOREST_EMERALD'), true, 'Fase 6 concluída desbloqueia FOREST_EMERALD');
  assert.equal(HUD.isTutorialUnlocked('FOREST_CITRINE'), false, 'Fase 7 não concluída mantém FOREST_CITRINE bloqueado');

  // 5. No GOD MODE, todos os tutoriais ficam desbloqueados para teste
  HUD.setGodMode(true, true);
  assert.equal(HUD.isTutorialUnlocked('CAATINGA_SHELL_GAME'), true, 'God Mode libera todos os tutoriais no Guia');
  assert.equal(HUD.isTutorialUnlocked('RIVER_MELODY_SIMON'), true, 'God Mode libera Rio no Guia');
  HUD.setGodMode(false, true);
});

test('Callout do botão Guia: aparece 1× logo após o primeiro tutorial da Fase 1 e persiste por perfil', async () => {
  const { createMockCtx } = setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/app.js');

  const E = globalThis.TruePixelEngine;
  const HUD = E.GameHUD;
  const Cave = globalThis.CaveChapter1;

  HUD.setGodMode(false, true);
  HUD.syncTutorialProgress({ unlockedTutorials: [], lastViewedTutorialKey: null, guideIntroShown: false, completed: [] });
  HUD.guideIntroActive = false;

  // Dispara o diálogo da Fase 1 e avança até o tutorial FASE1_INTRO
  Cave.openMysteryVoiceDialogue();
  while (E.DialogueBox.isOpen) E.DialogueBox.advance();
  assert.equal(E.TutorialModal.isOpen, true, 'FASE1_INTRO deve abrir após diálogo da Fase 1');

  // Conclui as 2 páginas do primeiro tutorial
  while (E.TutorialModal.isOpen) {
    E.TutorialModal.pageElapsed = E.TutorialModal.pageDuration + 1;
    E.TutorialModal.nextStep();
  }

  // Logo após concluir o primeiro tutorial, o callout apontando para o botão Guia deve abrir!
  assert.equal(HUD.guideIntroActive, true, 'Callout apontando para o botão Guia deve abrir após o 1º tutorial');
  const ops = [];
  HUD.renderModals(createMockCtx(ops), 1.0);
  const texts = ops.filter(o => o.op === 'fillText').map(o => String(o.txt));
  assert.ok(texts.some(t => /Guia/i.test(t)), 'Callout deve explicar o botão Guia');
  assert.ok(texts.some(t => /Entendi/i.test(t)), 'Callout deve ter botão Entendi!');

  // Clicar em Entendi! fecha o callout, marca guideIntroShown = true, persiste e inicia gameplay
  const btn = HUD.guideIntroBtnRect;
  HUD.handleClick(btn.x + 4, btn.y + 4);
  assert.equal(HUD.guideIntroActive, false);
  assert.equal(HUD.guideIntroShown, true);
  assert.equal(Cave.phase, 'gameplay', 'Após dispensar callout do Guia, Fase 1 deve iniciar gameplay');

  const saved = JSON.parse(globalThis.localStorage.getItem('crystal-campaign-v4'));
  assert.equal(saved.guideIntroShown, true, 'guideIntroShown deve ser persistido no localStorage');

  // Segunda vez: não deve reaparecer
  const openedAgain = HUD.openGuideIntro(() => {});
  assert.equal(openedAgain, false, 'Callout do Guia deve ser exibido apenas 1 vez por perfil/save');
});

test('Treino: Equação Cristalina — sem timer, trava até praticar 1×, selo interativo e layout sem colisão', async () => {
  const { createMockCtx } = setupNodeDOM();
  await import('../js/true-pixel-engine.js');

  const E = globalThis.TruePixelEngine;
  const HUD = E.GameHUD;
  const Modal = E.TutorialModal;

  HUD.setGodMode(false, true);
  Modal.open(E.StandardTutorialCards.FASE3_EQUATION_AURA);
  Modal.pageElapsed = Modal.pageDuration + 1;
  Modal.nextStep(); // vai para o card 2: Treino: Equação Cristalina

  // 1. Sem timer: mesmo com muito tempo decorrido, continua travado até praticar 1×!
  Modal.pageElapsed = 999;
  assert.equal(Modal.isPageLocked(), true, 'Página interativa deve permanecer bloqueada mesmo após 999s sem praticar');
  const blockedClick = Modal.handleClick(Modal.btnRect.x + 5, Modal.btnRect.y + 5);
  assert.equal(blockedClick, false, 'Botão Começar! não pode liberar sem prática');
  assert.equal(Modal.isOpen, true);

  // 2. Verificar layout: cristal rosa afastado do Reset e rótulo FORA e ABAIXO do círculo (fechado e expandido)
  const ps = Modal.practiceState;
  const rose = ps.pieces.find(p => p.id === 'p1');
  const rb = ps.resetBtnRect;
  const roseOrbsTopY = rose.y - 13; // py - 11 - 2
  const resetBottomY = rb.y + rb.h;
  assert.ok(
    roseOrbsTopY - resetBottomY >= 18,
    `Bolinhas do cristal rosa (y=${roseOrbsTopY}) devem estar bem afastadas abaixo do Reset (bottom=${resetBottomY})`
  );

  // Render fechado: verificar selo interativo, indicador de objetivo prático (sem timer) e posição do rótulo TOQUE P/ ABRIR
  const opsClosed = [];
  Modal.render(createMockCtx(opsClosed), 1.0);
  const closedTexts = opsClosed.filter(o => o.op === 'fillText');
  assert.ok(closedTexts.some(t => /PRÁTICA INTERATIVA/i.test(String(t.txt))), 'Deve exibir selo destacado PRÁTICA INTERATIVA');
  assert.ok(closedTexts.some(t => /Pratique 1/i.test(String(t.txt))), 'Deve exibir indicador de objetivo prático em vez de timer');

  const eqTagClosed = closedTexts.find(t => /TOQUE P\/ ABRIR/i.test(String(t.txt)));
  assert.ok(eqTagClosed, 'Deve renderizar rótulo TOQUE P/ ABRIR');
  // drawPixelTextCentered usa fillText com baseline alphabetic (y ≈ tagTop + fontPx*0.9), então verificamos que tagTop >= eq.y + 16 + 3
  assert.ok(eqTagClosed.y > ps.eq.y + 16 + 3, `Rótulo fechado (y=${eqTagClosed.y}) deve ficar fora e abaixo do círculo (bottom=${ps.eq.y + 16})`);

  // Expandir a equação e verificar rótulo ABERTA (arraste) fora e abaixo do círculo expandido (auraR=24)
  Modal.handleClick(ps.eq.x, ps.eq.y);
  Modal.handlePointerUp(ps.eq.x, ps.eq.y);
  assert.equal(ps.eq.expanded, true);

  const opsExpanded = [];
  Modal.render(createMockCtx(opsExpanded), 1.2);
  const eqTagOpen = opsExpanded.filter(o => o.op === 'fillText').find(t => /ABERTA \(arraste\)/.test(String(t.txt)));
  assert.ok(eqTagOpen, 'Deve renderizar rótulo ABERTA (arraste)');
  assert.ok(eqTagOpen.y > ps.eq.y + 24 + 3, `Rótulo expandido (y=${eqTagOpen.y}) deve ficar fora e abaixo do círculo expandido (bottom=${ps.eq.y + 24})`);

  // 3. Arrastar um cristal para a equação completa a prática e libera Começar!
  Modal.handleClick(rose.x, rose.y);
  Modal.handlePointerMove(ps.eq.x, ps.eq.y);
  Modal.handlePointerUp(ps.eq.x, ps.eq.y);
  assert.equal(Modal.practiceCompleted, true);
  assert.equal(Modal.isPageLocked(), false, 'Após praticar 1×, página deve ser liberada');

  const opsDone = [];
  Modal.render(createMockCtx(opsDone), 1.5);
  assert.ok(opsDone.some(o => o.op === 'fillText' && /Prática concluída/i.test(String(o.txt))), 'Deve exibir feedback ✓ Prática concluída!');

  const okClick = Modal.handleClick(Modal.btnRect.x + 5, Modal.btnRect.y + 5);
  assert.equal(okClick, true);
  assert.equal(Modal.isOpen, false);

  // 4. Bypass no GOD MODE
  HUD.setGodMode(true, true);
  Modal.open(E.StandardTutorialCards.FASE3_EQUATION_AURA);
  Modal.nextStep();
  assert.equal(Modal.practiceCompleted, false);
  assert.equal(Modal.isPageLocked(), false, 'God Mode permite avançar sem praticar');
  Modal.close();
  HUD.setGodMode(false, true);
});

test('Treino de Corte (Floresta 5) e Treino Livre de Ritmo (Caverna 5): travam até praticar 1× (exceto God Mode)', async () => {
  const { createMockCtx } = setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');

  const E = globalThis.TruePixelEngine;
  const HUD = E.GameHUD;
  const Cave = globalThis.CaveChapter1;
  const Worlds = globalThis.TruePixelWorlds;

  HUD.setGodMode(false, true);

  // --- Floresta 5: Treino de Corte ---
  Worlds.startWorldLevel('forest', 5);
  while (E.DialogueBox.isOpen) E.DialogueBox.advance();
  E.TutorialModal.close();
  assert.equal(Worlds.phase, 'forest_ninja_vignette');
  assert.equal(HUD.isTutorialUnlocked('FOREST_SLICING_NINJA'), true, 'Entrar na Floresta 5 registra FOREST_SLICING_NINJA no Guia');

  // Ir para Card 2 (Treino de Corte)
  Worlds.handleForestNinjaVignetteClick(240, 155);
  assert.equal(Worlds.forestNinja.vignetteCard, 2);
  assert.equal(Worlds.isForestNinjaPracticeUnlocked(), false);

  // Tentar iniciar sem cortar cristal puro -> bloqueado!
  Worlds.handleForestNinjaVignetteClick(240, 155);
  assert.equal(Worlds.phase, 'forest_ninja_vignette', 'Não deve iniciar desafio antes de fatiar 1 cristal puro');

  // Cortar uma sombra no treino NÃO libera
  Worlds.sliceForestCrystal({ x: 160, y: 80, vx: 0, vy: 0, rot: 0, vrot: 0, type: 'white', shadow: true, radius: 13, value: 1 }, true);
  assert.equal(Worlds.isForestNinjaPracticeUnlocked(), false, 'Cortar sombra não deve liberar o desafio');

  // Render mostra selo interativo e objetivo prático
  const fnOps = [];
  Worlds.drawForestNinjaVignette(createMockCtx(fnOps), 1.0);
  assert.ok(fnOps.some(o => o.op === 'fillText' && /PRÁTICA INTERATIVA/i.test(String(o.txt))));
  assert.ok(fnOps.some(o => o.op === 'fillText' && /Pratique 1/i.test(String(o.txt))));

  // Cortar 1 cristal puro -> libera!
  Worlds.sliceForestCrystal({ x: 160, y: 80, vx: 0, vy: 0, rot: 0, vrot: 0, type: 'emerald', shadow: false, radius: 13, value: 2 }, true);
  assert.equal(Worlds.isForestNinjaPracticeUnlocked(), true);
  Worlds.handleForestNinjaVignetteClick(240, 155);
  assert.equal(Worlds.phase, 'forest_ninja_game', 'Após fatiar 1 cristal puro, deve iniciar desafio');

  // --- Caverna 5: Treino Livre de Ritmo ---
  Cave.startFase5();
  Cave.phaseTime = 4.0;
  Cave.handleVignetteClick(240, 155); // Card 2
  assert.equal(Cave.vignetteCard, 2);
  assert.equal(Cave.isRhythmPracticeUnlocked(), false);

  // Sem acertar nota -> bloqueado
  Cave.handleVignetteClick(240, 155);
  assert.equal(Cave.phase, 'musical_vignette');

  // God Mode faz bypass imediato
  HUD.setGodMode(true, true);
  assert.equal(Cave.isRhythmPracticeUnlocked(), true, 'God Mode libera Treino de Ritmo imediatamente');
  HUD.setGodMode(false, true);
  assert.equal(Cave.isRhythmPracticeUnlocked(), false);

  // Acertar 1 nota em t=0.8 -> libera!
  Cave.vignettePracticeTime = 0.8;
  Cave.handleVignetteClick(150, 60);
  assert.equal(Cave.isRhythmPracticeUnlocked(), true);
  Cave.handleVignetteClick(240, 155);
  assert.equal(Cave.phase, 'musical_part1_shadows');
});
