import test from 'node:test';
import assert from 'node:assert/strict';

function setupHiDPIDOM({ dpr = 2, rectW = 1280, rectH = 720 } = {}) {
  globalThis.window = globalThis;
  globalThis.devicePixelRatio = dpr;
  globalThis.innerWidth = rectW;
  globalThis.innerHeight = rectH;
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};

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
      set src(v) { this._src = v; }
      get src() { return this._src; }
    };
  }
  if (!globalThis.Audio) {
    globalThis.Audio = class Audio {
      constructor() { this.paused = true; this.muted = false; this.volume = 1; }
      play() { this.paused = false; return Promise.resolve(); }
      pause() { this.paused = true; }
      addEventListener() {}
      removeEventListener() {}
    };
  }

  class MockHTMLCanvasElement {
    constructor(id = '') {
      this.tagName = 'CANVAS';
      this.id = id;
      this.width = 640;
      this.height = 360;
      this.hidden = false;
      this.style = { display: 'block', cssText: '' };
      this._attrs = {};
      this.ops = [];
      this._ctx = this._makeCtx();
    }
    setAttribute(k, v) { this._attrs[k] = String(v); }
    getAttribute(k) { return this._attrs[k] ?? null; }
    getBoundingClientRect() {
      return { left: 10, top: 20, width: rectW, height: rectH };
    }
    _makeCtx() {
      const canvas = this;
      const ops = this.ops;
      let transform = { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 };
      const ctx = {
        canvas,
        fillStyle: '#000',
        strokeStyle: '#000',
        font: '10px sans-serif',
        textAlign: 'left',
        textBaseline: 'alphabetic',
        lineWidth: 1,
        lineJoin: 'round',
        miterLimit: 2,
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        imageSmoothingEnabled: false,
        save: () => ops.push({ op: 'save' }),
        restore: () => ops.push({ op: 'restore' }),
        beginPath: () => ops.push({ op: 'beginPath' }),
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        rect: (x, y, w, h) => ops.push({ op: 'rect', x, y, w, h }),
        ellipse: (x, y, rx, ry) => ops.push({ op: 'ellipse', x, y, rx, ry }),
        arc: () => {},
        clip: () => ops.push({ op: 'clip' }),
        fill: () => ops.push({ op: 'fill', comp: ctx.globalCompositeOperation }),
        stroke: () => {},
        translate: (x, y) => ops.push({ op: 'translate', x, y }),
        rotate: (r) => ops.push({ op: 'rotate', r }),
        scale: () => {},
        setTransform: (a, b, c, d, e, f) => {
          transform = { a, b, c, d, e, f };
        },
        getTransform: () => ({ ...transform }),
        clearRect: (x, y, w, h) => ops.push({ op: 'clearRect', x, y, w, h }),
        fillRect: (x, y, w, h) => ops.push({ op: 'fillRect', x, y, w, h, comp: ctx.globalCompositeOperation, fillStyle: ctx.fillStyle }),
        strokeRect: () => {},
        drawImage: () => {},
        createImageData: (w, h) => new globalThis.ImageData(w, h),
        getImageData: (x, y, w, h) => new globalThis.ImageData(w, h),
        putImageData: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        strokeText: (txt, x, y, mw) => ops.push({ op: 'strokeText', txt, x, y, mw, font: ctx.font, alpha: ctx.globalAlpha }),
        fillText: (txt, x, y, mw) => ops.push({ op: 'fillText', txt, x, y, mw, font: ctx.font, alpha: ctx.globalAlpha, fillStyle: ctx.fillStyle }),
        measureText: (txt) => {
          const m = /([\d.]+)px/.exec(ctx.font);
          const px = m ? parseFloat(m[1]) : 16;
          return { width: String(txt || '').length * px * 0.55 };
        }
      };
      return ctx;
    }
    getContext() { return this._ctx; }
  }

  globalThis.HTMLCanvasElement = MockHTMLCanvasElement;
  const byId = new Map();
  const bodyChildren = [];
  globalThis.document = {
    body: {
      dataset: { screen: 'game' },
      classList: { toggle: () => {}, contains: () => false },
      appendChild: (el) => {
        bodyChildren.push(el);
        if (el.id) byId.set(el.id, el);
        return el;
      }
    },
    createElement: (tag) => {
      if (tag === 'canvas') return new MockHTMLCanvasElement();
      return { tagName: tag.toUpperCase(), style: {}, setAttribute: () => {}, appendChild: (c) => c };
    },
    getElementById: (id) => byId.get(id) || null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  const gameCanvas = new MockHTMLCanvasElement('truePixelScreen');
  gameCanvas.width = 640;
  gameCanvas.height = 360;
  document.body.appendChild(gameCanvas);

  return { gameCanvas, byId };
}

test('1. TextOverlay HiDPI renderiza textos em resolução nativa real, respeita clip, globalAlpha e limpa sob modais', async () => {
  const { gameCanvas, byId } = setupHiDPIDOM({ dpr: 2, rectW: 1280, rectH: 720 });
  await import(`../js/true-pixel-engine.js?hidpi=${Date.now()}`);

  const E = globalThis.TruePixelEngine;
  const ov = E.TextOverlay;
  assert.ok(ov, 'TruePixelEngine.TextOverlay deve ser exportado');

  const gctx = gameCanvas.getContext('2d');
  gctx.setTransform(2, 0, 0, 2, 0, 0);

  const started = ov.beginFrame(gameCanvas);
  assert.equal(started, true, 'beginFrame deve ativar overlay para HTMLCanvasElement real');

  const overlayCanvas = byId.get('truePixelTextOverlay');
  assert.ok(overlayCanvas, 'Canvas overlay #truePixelTextOverlay deve ser criado no DOM');
  assert.equal(overlayCanvas.width, 2560, 'Overlay deve ter largura nativa rect.width * dpr (1280 * 2)');
  assert.equal(overlayCanvas.height, 1440, 'Overlay deve ter altura nativa rect.height * dpr (720 * 2)');
  assert.ok(overlayCanvas.style.cssText.includes('pointer-events:none'), 'Overlay nunca deve bloquear cliques/toques');
  assert.equal(ov.ctx.imageSmoothingEnabled, true, 'Overlay de texto deve manter imageSmoothingEnabled = true');

  // Texto desenhado via drawPixelText vai para o overlay HiDPI e NÃO para o canvas pixel art 640x360
  gctx.globalAlpha = 0.75;
  E.drawPixelText(gctx, 'Sinfonia dos Cristais', 16, 40, '#ffea31', '#000000', 240, 10);
  gctx.globalAlpha = 1;

  assert.equal(gameCanvas.ops.some(o => o.op === 'fillText'), false, 'Canvas 640x360 não deve receber fillText quando overlay HiDPI está ativo');
  const textOp = overlayCanvas.ops.find(o => o.op === 'fillText' && o.txt === 'Sinfonia dos Cristais');
  assert.ok(textOp, 'Overlay HiDPI deve receber o texto vetorial');
  assert.equal(textOp.alpha, 0.75, 'Overlay HiDPI deve respeitar ctx.globalAlpha');
  // Em 2560x1440 (8x o lógico 320x180), fonte ~8.6 * 8 = ~68.8px
  const fontMatch = /([\d.]+)px/.exec(textOp.font);
  assert.ok(fontMatch && parseFloat(fontMatch[1]) >= 40, `Fonte nativa no overlay HiDPI deve ser escalada (>=40px), veio ${textOp.font}`);

  // Clip progressivo (ex.: karaokê hold da Caverna 5)
  ov.pushClipRect(gctx, 20, 150, 30, 16);
  E.drawPixelText(gctx, 'harmonia', 20, 154, '#ffe033', '#2c221e', 120, 10);
  ov.popClipRect(gctx);
  assert.ok(overlayCanvas.ops.some(o => o.op === 'clip'), 'Overlay HiDPI deve aplicar ctx.clip() para palavras hold');

  // drawParchmentBox limpa o retângulo do modal no overlay HiDPI para evitar vazamento de texto de fundo
  const clearsBefore = overlayCanvas.ops.filter(o => o.op === 'clearRect').length;
  E.drawParchmentBox(gctx, 24, 18, 272, 144);
  const clearsAfter = overlayCanvas.ops.filter(o => o.op === 'clearRect').length;
  assert.ok(clearsAfter > clearsBefore, 'drawParchmentBox deve limpar o retângulo no overlay HiDPI');

  // IrisTransition mascara o overlay com destination-in
  ov.maskIris(gctx, 160, 90, 50);
  assert.ok(overlayCanvas.ops.some(o => o.op === 'fill' && o.comp === 'destination-in'), 'IrisTransition deve mascarar o overlay HiDPI');

  // hide() oculta e desativa overlay ao sair da gameplay
  ov.hide(gameCanvas);
  assert.equal(ov.active, false);
  assert.equal(overlayCanvas.hidden, true);
  assert.equal(overlayCanvas.style.display, 'none');
});

test('2. HUD Superior remove Pause, adiciona botão Casa (home) ao lado de Configurações e retorna ao menu inicial', async () => {
  const { gameCanvas } = setupHiDPIDOM({ dpr: 1, rectW: 640, rectH: 360 });
  await import(`../js/true-pixel-engine.js?hud=${Date.now()}`);

  const E = globalThis.TruePixelEngine;
  const HUD = E.GameHUD;

  assert.equal(HUD.buttons.pause, undefined, 'Botão pause deve ser completamente removido');
  assert.equal(HUD.pauseMenuBtns, undefined, 'pauseMenuBtns deve ser removido');
  assert.ok(HUD.buttons.settings, 'Botão settings deve existir');
  assert.ok(HUD.buttons.home, 'Botão home (Casa) deve existir');
  assert.ok(HUD.buttons.home.x >= HUD.buttons.settings.x + HUD.buttons.settings.w, 'Botão home deve ficar imediatamente ao lado de settings sem sobreposição');
  assert.ok(HUD.buttons.home.x + HUD.buttons.home.w <= 320, 'Botão home deve caber dentro dos 320px da barra superior');

  // Verifica que nenhum botão da barra superior se sobrepõe
  const ordered = Object.values(HUD.buttons).sort((a, b) => a.x - b.x);
  for (let i = 1; i < ordered.length; i++) {
    assert.ok(ordered[i - 1].x + ordered[i - 1].w <= ordered[i].x, 'Botões da barra superior não devem se sobrepor');
  }

  let gotoTarget = null;
  let caveStopped = false;
  let caveDeactivated = false;
  let worldsStopped = false;
  let worldsDeactivated = false;

  globalThis.CrystalApp = { goto: (screen) => { gotoTarget = screen; } };
  globalThis.CaveChapter1 = {
    stopMusicAudio: () => { caveStopped = true; },
    deactivateCanvas: () => { caveDeactivated = true; }
  };
  globalThis.TruePixelWorlds = {
    stopMusicAudio: () => { worldsStopped = true; },
    deactivateCanvas: () => { worldsDeactivated = true; }
  };

  HUD.onGoHome = null;
  HUD.settingsOpen = true;
  E.DialogueBox.isOpen = true;
  E.TutorialModal.isOpen = true;
  E.TextOverlay.beginFrame(gameCanvas);

  const clicked = HUD.handleClick(HUD.buttons.home.x + 8, HUD.buttons.home.y + 8);
  assert.equal(clicked, true, 'Clique no botão Casa deve ser tratado pela HUD');
  assert.equal(gotoTarget, 'home', 'Botão Casa deve chamar CrystalApp.goto("home")');
  assert.equal(caveStopped && caveDeactivated, true, 'Botão Casa deve parar áudio e desativar Caverna');
  assert.equal(worldsStopped && worldsDeactivated, true, 'Botão Casa deve parar áudio e desativar Mundos');
  assert.equal(HUD.settingsOpen, false, 'Modais do HUD devem fechar ao voltar para Casa');
  assert.equal(E.DialogueBox.isOpen, false, 'DialogueBox deve fechar ao voltar para Casa');
  assert.equal(E.TutorialModal.isOpen, false, 'TutorialModal deve fechar ao voltar para Casa');
  assert.equal(E.TextOverlay.active, false, 'TextOverlay deve ser ocultado ao voltar para Casa');
});

test('3. Visão, Voltar e GOD MODE nunca sobrepõem VÍDEO DEMO, vinhetas, TutorialModal, modais do HUD nem minigames especiais', async () => {
  setupHiDPIDOM({ dpr: 1, rectW: 640, rectH: 360 });
  delete globalThis.HTMLCanvasElement; // usa mock ctx direto para inspecionar ops de fillText
  await import(`../js/true-pixel-engine.js?guard=${Date.now()}`);

  const E = globalThis.TruePixelEngine;
  const HUD = E.GameHUD;

  let visionCalls = 0;
  let rewindCalls = 0;
  HUD.onUseAbility1 = () => { visionCalls++; };
  HUD.onUseAbility2 = () => { rewindCalls++; };
  HUD.godMode = true;
  E.DialogueBox.sockets = { fairy: true, forest: true, river: true, caatinga: true };
  HUD.syncAbilitiesState(true);

  const makeLogCtx = (ops) => ({
    fillStyle: '', strokeStyle: '', font: '', textAlign: 'left', textBaseline: 'alphabetic',
    save: () => {}, restore: () => {}, fillRect: () => {}, drawImage: () => {},
    strokeText: () => {},
    fillText: (txt, x, y) => ops.push(String(txt))
  });

  const scenarios = [
    {
      name: 'VÍDEO DEMO (forest_ninja_vignette)',
      setup: () => {
        globalThis.CaveChapter1 = { isActiveGame: () => false };
        globalThis.TruePixelWorlds = { isActiveGame: () => true, phase: 'forest_ninja_vignette', forestNinja: {} };
        E.TutorialModal.isOpen = false; HUD.settingsOpen = false; HUD.guideOpen = false;
      }
    },
    {
      name: 'Corte Cristalino (forest_ninja_game)',
      setup: () => {
        globalThis.TruePixelWorlds = { isActiveGame: () => true, phase: 'forest_ninja_game', forestNinja: {} };
      }
    },
    {
      name: 'Melodia das Águas (river_melody_game)',
      setup: () => {
        globalThis.TruePixelWorlds = { isActiveGame: () => true, phase: 'river_melody_game', riverMelody: {} };
      }
    },
    {
      name: 'Desafio das Areias (shell_game_reveal)',
      setup: () => {
        globalThis.TruePixelWorlds = { isActiveGame: () => true, phase: 'shell_game_reveal', shellGame: {} };
      }
    },
    {
      name: 'Vinheta Musical Caverna 5 (musical_vignette)',
      setup: () => {
        globalThis.TruePixelWorlds = { isActiveGame: () => false };
        globalThis.CaveChapter1 = { isActiveGame: () => true, phase: 'musical_vignette' };
      }
    },
    {
      name: 'TutorialModal aberto durante gameplay',
      setup: () => {
        globalThis.CaveChapter1 = { isActiveGame: () => true, phase: 'gameplay' };
        E.TutorialModal.isOpen = true;
      }
    },
    {
      name: 'Modal Configurações aberto',
      setup: () => {
        E.TutorialModal.isOpen = false;
        HUD.settingsOpen = true;
      }
    },
    {
      name: 'Modal Guia aberto',
      setup: () => {
        HUD.settingsOpen = false;
        HUD.guideOpen = true;
      }
    }
  ];

  for (const sc of scenarios) {
    sc.setup();
    const ops = [];
    HUD.renderTopBar(makeLogCtx(ops), 5, 1, 3, false);
    assert.equal(ops.some(t => t.includes('Visão')), false, `${sc.name}: não deve renderizar Visão`);
    assert.equal(ops.some(t => t.includes('Voltar')), false, `${sc.name}: não deve renderizar Voltar`);
    assert.equal(ops.some(t => t.includes('GOD MODE')), false, `${sc.name}: não deve renderizar selo GOD MODE`);

    const prevV = visionCalls, prevR = rewindCalls;
    HUD.handleClick(HUD.abilityButtons.vision.x + 10, HUD.abilityButtons.vision.y + 8);
    HUD.handleClick(HUD.abilityButtons.rewind.x + 10, HUD.abilityButtons.rewind.y + 8);
    assert.equal(visionCalls, prevV, `${sc.name}: clique em Visão deve ser ignorado quando oculto`);
    assert.equal(rewindCalls, prevR, `${sc.name}: clique em Voltar deve ser ignorado quando oculto`);
  }

  // Em gameplay normal sem modais/minigames, deve renderizar e aceitar cliques normalmente
  globalThis.CaveChapter1 = { isActiveGame: () => true, phase: 'gameplay' };
  globalThis.TruePixelWorlds = { isActiveGame: () => false };
  E.TutorialModal.isOpen = false;
  HUD.settingsOpen = false;
  HUD.guideOpen = false;
  const normalOps = [];
  HUD.renderTopBar(makeLogCtx(normalOps), 2, 1, 3, false);
  assert.ok(normalOps.some(t => t.includes('Visão')), 'Em gameplay normal deve renderizar Visão');
  assert.ok(normalOps.some(t => t.includes('Voltar')), 'Em gameplay normal deve renderizar Voltar');
  assert.ok(normalOps.some(t => t.includes('GOD MODE')), 'Em gameplay normal com God Mode deve renderizar GOD MODE');

  HUD.handleClick(HUD.abilityButtons.vision.x + 10, HUD.abilityButtons.vision.y + 8);
  HUD.handleClick(HUD.abilityButtons.rewind.x + 10, HUD.abilityButtons.rewind.y + 8);
  assert.equal(visionCalls, 1, 'Clique em Visão deve funcionar em gameplay normal');
  assert.equal(rewindCalls, 1, 'Clique em Voltar deve funcionar em gameplay normal');
});
