import test from 'node:test';
import assert from 'node:assert/strict';

function setupNodeDOM() {
  const winListeners = new Map();
  globalThis.window = globalThis;
  globalThis.addEventListener = (evt, fn) => {
    if (!winListeners.has(evt)) winListeners.set(evt, []);
    winListeners.get(evt).push(fn);
  };
  globalThis.removeEventListener = () => {};
  globalThis._winListeners = winListeners;
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
      addEventListener() {}
      removeEventListener() {}
    };
  }

  const makeMockCtx = () => {
    const ops = { fillRects: [], fillTexts: [] };
    return {
      _ops: ops,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      imageSmoothingEnabled: false,
      save: () => {},
      restore: () => {},
      clip: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      fillRect: (x, y, w, h) => { ops.fillRects.push({ x, y, w, h, fill: '' }); },
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
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createImageData: (w, h) => new globalThis.ImageData(w, h),
      getImageData: (x, y, w, h) => new globalThis.ImageData(w, h),
      putImageData: () => {},
      strokeText: () => {},
      fillText: (txt, x, y) => { ops.fillTexts.push({ text: String(txt), x, y }); },
      measureText: (txt) => ({ width: String(txt || '').length * 5 })
    };
  };

  const elementsById = new Map();
  const mockElement = (tag) => {
    const listeners = new Map();
    return {
      tagName: tag.toUpperCase(),
      style: {},
      dataset: {},
      hidden: false,
      width: 640,
      height: 360,
      _listeners: listeners,
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => false,
        contains: () => false
      },
      setAttribute: () => {},
      getAttribute: () => null,
      appendChild: (c) => {
        if (c && c.id) elementsById.set(c.id, c);
        return c;
      },
      append: () => {},
      remove: () => {},
      addEventListener: (evt, fn) => {
        if (!listeners.has(evt)) listeners.set(evt, []);
        listeners.get(evt).push(fn);
      },
      removeEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      getContext: () => makeMockCtx(),
      toDataURL: () => 'data:image/png;base64,AA==',
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 180 })
    };
  };

  const body = mockElement('body');
  globalThis.document = {
    createElement: mockElement,
    getElementById: (id) => elementsById.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    body,
    addEventListener: () => {},
    removeEventListener: () => {},
    readyState: 'complete'
  };

  const firePointer = (canvas, type, lx, ly) => {
    const ev = { clientX: lx, clientY: ly, pointerId: 1, cancelable: true, preventDefault: () => {} };
    const src = type === 'pointerdown' ? canvas._listeners.get(type) : winListeners.get(type);
    for (const fn of (src || [])) fn(ev);
  };

  return { firePointer, makeMockCtx };
}

const domHelpers = setupNodeDOM();
const { firePointer, makeMockCtx } = domHelpers;

test('1. Floresta Fase 2 Etapa 2: permite dobrar (4->8) e dividir (8->4+4) além de dividir (4->2+2) e dobrar (4+4), sem falso beco sem saída', async () => {
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-worlds.js');

  const E = globalThis.TruePixelEngine;
  const Worlds = globalThis.TruePixelWorlds;

  // Caminho A: 4 -> dobrar no Altar (8) -> dividir (4 + 4) -> anular ambas sombras 4
  Worlds.startWorldLevel('forest', 2, 7);
  Worlds.running = false;
  E.DialogueBox.close();
  E.TutorialModal.close();
  Worlds.phase = 'gameplay';
  Worlds.setupStep(2);

  const citA = Worlds.pieces.find((p) => p.id === 'fo2_2_c');
  assert.ok(citA, 'Deve existir fo2_2_c na Floresta Fase 2 Etapa 2');
  assert.equal(citA.value, 4);

  // Move até o Altar de Esmeralda
  citA.x = Worlds.emeraldAltar.x;
  citA.y = Worlds.emeraldAltar.y;
  const blessed = Worlds.checkEmeraldAltarBlessing(citA);
  assert.equal(blessed, true, 'Altar de Esmeralda deve aceitar dobrar Citrino 4 -> 8');
  assert.equal(citA.value, 8);
  assert.equal(citA.boosted, true);
  assert.equal(Worlds.isStepStillSolvable(), true, 'Após dobrar 4 -> 8, etapa continua solucionável sem falso beco sem saída');

  // Renderiza com 8 bolinhas sem erro
  Worlds.render();

  // Divide 8 -> 4 + 4
  const splitOk = Worlds.trySplitCrystalOnTap(citA);
  assert.equal(splitOk, true, 'Citrino 8 abençoado deve dividir em 4 + 4');
  const pureFours = Worlds.pieces.filter((p) => !p.shadow && !p.broken && p.type === 'citrine' && p.value === 4);
  assert.equal(pureFours.length, 2, 'Deve produzir dois Citrinos puros de valor 4');
  assert.equal(Worlds.isStepStillSolvable(), true);

  // Caminho B: 4 -> dividir (2 + 2) -> dobrar cada um (4 + 4)
  Worlds.setupStep(2);
  const citB = Worlds.pieces.find((p) => p.id === 'fo2_2_c');
  assert.equal(Worlds.trySplitCrystalOnTap(citB), true);
  const pureTwos = Worlds.pieces.filter((p) => !p.shadow && !p.broken && p.type === 'citrine' && p.value === 2);
  assert.equal(pureTwos.length, 2);
  for (const two of pureTwos) {
    two.x = Worlds.emeraldAltar.x;
    two.y = Worlds.emeraldAltar.y;
    assert.equal(Worlds.checkEmeraldAltarBlessing(two), true);
    assert.equal(two.value, 4);
  }
  assert.equal(Worlds.isStepStillSolvable(), true);
});

test('2. Plataforma de Fração (Rio): permite clicar, arrastar, reorganizar entre topo/base, dividir e remover para fora com undo', async () => {
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-worlds.js');

  const E = globalThis.TruePixelEngine;
  const Worlds = globalThis.TruePixelWorlds;

  Worlds.startWorldLevel('river', 1, 11);
  Worlds.running = true;
  E.DialogueBox.close();
  E.TutorialModal.close();
  Worlds.phase = 'gameplay';

  const fp = Worlds.fractionPlatform;
  const topPiece = Worlds.pieces.find((p) => p.inFraction === 'top');
  assert.ok(fp && topPiece);

  // 2a. Arrastar peça de dentro da fração PARA FORA via ponteiro real
  const startX = topPiece.x;
  const startY = topPiece.y;
  const historyBefore = Worlds.actionHistory.length;
  firePointer(Worlds.canvas, 'pointerdown', startX, startY);
  assert.equal(Worlds.draggedPiece, topPiece, 'Deve permitir selecionar/pegar cristal de dentro da Plataforma de Fração');
  firePointer(Worlds.canvas, 'pointermove', startX - 70, startY);
  firePointer(Worlds.canvas, 'pointerup', startX - 70, startY);

  assert.equal(topPiece.inFraction, null, 'Puxar para fora deve limpar p.inFraction');
  assert.equal(fp.topPieces.includes(topPiece), false, 'Peça removida não deve ficar em topPieces');
  assert.equal(fp.topSum, 0, 'Soma do topo deve atualizar para 0');
  assert.ok(Worlds.actionHistory.length > historyBefore, 'Deve registrar snapshot de undo ao remover da fração');

  // 2b. Desfazer (undo) devolve a peça para dentro da fração
  E.GameHUD.godMode = true;
  const rewound = Worlds.triggerTimeRewind();
  assert.equal(rewound, true, 'Undo deve restaurar estado anterior à remoção');
  const restoredTop = Worlds.pieces.find((p) => p.id === topPiece.id);
  assert.equal(restoredTop.inFraction, 'top', 'Peça deve voltar ao topo da fração após undo');
  assert.equal(Worlds.fractionPlatform.topSum, 2);

  // 2c. Reorganizar do topo para a base arrastando dentro da plataforma
  firePointer(Worlds.canvas, 'pointerdown', restoredTop.x, restoredTop.y);
  firePointer(Worlds.canvas, 'pointermove', Worlds.fractionPlatform.x, Worlds.fractionPlatform.bottomY);
  firePointer(Worlds.canvas, 'pointerup', Worlds.fractionPlatform.x, Worlds.fractionPlatform.bottomY);
  assert.equal(restoredTop.inFraction, 'bottom', 'Arrastar do topo para a base deve mover para bottom');
  assert.equal(Worlds.fractionPlatform.topSum, 0);
  assert.equal(Worlds.fractionPlatform.bottomSum, 2);

  // 2d. Dividir cristal par dentro da plataforma (2 -> 1 + 1 no mesmo slot)
  assert.equal(Worlds.trySplitCrystalOnTap(restoredTop), true, 'Deve permitir dividir cristal par dentro da fração');
  assert.equal(Worlds.fractionPlatform.bottomPieces.length, 2);
  assert.equal(Worlds.fractionPlatform.bottomSum, 2);
  Worlds.running = false;
});

test('3. Caatinga: Círculo + Círculo (arraste e toque-toque) forma Círculo maior, atualiza solver e anula círculo sombrio equivalente', async () => {
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-worlds.js');

  const E = globalThis.TruePixelEngine;
  const Worlds = globalThis.TruePixelWorlds;

  Worlds.startWorldLevel('caatinga', 1, 16);
  Worlds.running = true;
  E.DialogueBox.close();
  E.TutorialModal.close();
  Worlds.phase = 'gameplay';

  // Cenário com 2 círculos puros brancos (2 + 2) e 1 círculo sombrio branco (4)
  Worlds.electricShapes = [];
  Worlds.pieces = [
    { id: 'c1', type: 'white', value: 2, shadow: false, shape: 'circle', borderType: 'white', coreType: 'white', x: 90, y: 90, components: [{ id: 'c1_raw', type: 'white', value: 2 }] },
    { id: 'c2', type: 'white', value: 2, shadow: false, shape: 'circle', borderType: 'white', coreType: 'white', x: 130, y: 90, components: [{ id: 'c2_raw', type: 'white', value: 2 }] },
    { id: 'cs', type: 'white', value: 4, shadow: true, shape: 'circle', borderType: 'white', coreType: 'white', x: 220, y: 90 }
  ];

  // Preview visual ao aproximar
  const c1 = Worlds.pieces[0];
  const c2 = Worlds.pieces[1];
  const cs = Worlds.pieces[2];
  const match = Worlds.getTessellationMatch(c1, c2);
  assert.ok(match, 'getTessellationMatch deve reconhecer Círculo + Círculo da mesma cor');
  assert.equal(match.resultShape, 'circle');
  assert.ok(match.label.includes('CÍRCULO'));

  // Toque-toque em c1 depois c2 deve selecionar c1 e unir com c2 (sem desmontar!)
  firePointer(Worlds.canvas, 'pointerdown', c1.x, c1.y);
  firePointer(Worlds.canvas, 'pointerup', c1.x, c1.y);
  assert.equal(Worlds.selectedPiece, c1, '1º toque no Círculo com par compatível deve selecioná-lo');

  firePointer(Worlds.canvas, 'pointerdown', c2.x, c2.y);
  firePointer(Worlds.canvas, 'pointerup', c2.x, c2.y);
  assert.equal(c1.shape, 'circle', 'Resultado deve continuar sendo shape === circle');
  assert.equal(c1.value, 4, 'Unidades devem somar (2 + 2 = 4)');
  assert.equal(c2.broken, true, 'Segundo círculo deve ser consumido na fusão');
  assert.equal(Worlds.isStepStillSolvable(), true, 'Solver deve reconhecer o círculo somado como solucionável');

  // Anulação contra o círculo sombrio equivalente (valor 4)
  assert.equal(Worlds.arePiecesEquivalent(c1, cs), true);
  const res = Worlds.moveDraggedPieceWithCollision(c1, cs.x, cs.y);
  assert.equal(res.annulled, true, 'Círculo maior deve anular círculo sombrio equivalente');
  Worlds.running = false;
});

test('4. Floresta Fase 5 (Corte Cristalino): Streak contínuo no canto direito + Multi-Corte sem limite de 4 e sem caixa opaca', async () => {
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-worlds.js');

  const Worlds = globalThis.TruePixelWorlds;
  Worlds.startWorldLevel('forest', 5, 10);
  Worlds.running = false;
  Worlds.startForestNinjaStage(2);

  const fn = Worlds.forestNinja;
  fn.floatingBanner = null; // limpa banner inicial de etapa para inspecionar apenas o multi-corte
  assert.equal(fn.streak, 0);

  // Corta 5 cristais puros num único golpe (multi-corte 5x+ sem limite de 4)
  fn.strokePureCuts = 0;
  fn.strokeCrystals = [];
  for (let i = 0; i < 5; i++) {
    const c = { x: 100 + i * 20, y: 90, vx: 0, vy: -40, rot: 0, vrot: 0, type: 'emerald', shadow: false, radius: 13, value: 2, sliced: false };
    Worlds.sliceForestCrystal(c, false);
  }
  assert.equal(fn.streak, 5, 'Combo de Sequência (Streak) deve contar 5 cortes puros seguidos (sem limite de 4)');
  assert.equal(fn.comboMultiplier, 5, 'Combo de Multi-Corte deve contar 5x sem teto artificial em 4');
  assert.equal(fn.activeComboBanner?.text, 'COMBO X5!');

  // Verifica renderização: SEQ: 5 no canto direito e multi-corte SEM caixa opaca
  const spyCtx = makeMockCtx();
  Worlds.drawForestNinjaGame(spyCtx, 1.0);
  assert.ok(spyCtx._ops.fillTexts.some((t) => t.text === 'SEQ: 5'), 'Canto superior direito deve exibir SEQ: 5');
  assert.ok(spyCtx._ops.fillTexts.some((t) => t.text === 'COMBO X5!'), 'Deve desenhar texto flutuante COMBO X5!');
  // Nenhum fillRect grande opaco na altura do activeComboBanner (y ~ 78, w ~ 96, h ~ 18)
  const hasOpaqueComboBox = spyCtx._ops.fillRects.some((r) => r.w >= 80 && r.h >= 16 && r.y >= 45 && r.y <= 140);
  assert.equal(hasOpaqueComboBox, false, 'Combo de Multi-Corte NÃO deve desenhar caixa de fundo opaca');

  // Deixar 1 cristal puro cair sem cortar zera o streak imediatamente
  fn.flyingCrystals = [{ x: 140, y: 196, vx: 0, vy: 50, rot: 0, vrot: 0, type: 'emerald', shadow: false, radius: 13, value: 2, sliced: false }];
  Worlds.updateForestNinjaGame(0.05);
  assert.equal(fn.streak, 0, 'Deixar um cristal puro cair sem cortar deve zerar o streak imediatamente');

  // Corta 2 puros, depois corta 1 sombrio -> zera streak novamente
  for (let i = 0; i < 2; i++) {
    Worlds.sliceForestCrystal({ x: 110 + i * 20, y: 90, vx: 0, vy: -40, rot: 0, vrot: 0, type: 'emerald', shadow: false, radius: 13, value: 2, sliced: false }, false);
  }
  assert.equal(fn.streak, 2);
  Worlds.sliceForestCrystal({ x: 150, y: 90, vx: 0, vy: -40, rot: 0, vrot: 0, type: 'shadow_bomb', shadow: true, radius: 13, value: 1, sliced: false }, false);
  assert.equal(fn.streak, 0, 'Cortar um cristal sombrio deve zerar o streak imediatamente');
});

test('5. Rio Fase 5 (Melodia das Águas): HUD despoluído, sem frase fixa inferior, dica após 4.5s e mãozinha clicando no 1º cristal', async () => {
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-worlds.js');

  const E = globalThis.TruePixelEngine;
  const Worlds = globalThis.TruePixelWorlds;

  Worlds.startWorldLevel('river', 5, 15);
  Worlds.running = true;
  E.DialogueBox.close();
  E.TutorialModal.close();
  Worlds.phase = 'river_melody_game';
  const rm = Worlds.riverMelody;
  rm.phase = 'player_input';
  rm.playerIndex = 0;
  rm.inputIdleTimer = 0;

  // 5a. Visão e Voltar ocultos no minigame; Modo Calmo não sobrepõe título nem cristal gigante central
  assert.equal(E.GameHUD.isSpecialOrModalActive(false), true, 'Minigame do Rio deve ocultar Visão e Voltar');
  Worlds.running = false;
  assert.ok(Worlds.riverCalmBtnRect.y >= 36, 'Botão Modo Calmo deve ficar abaixo da faixa de título sem sobrepor');
  assert.ok(Worlds.riverCalmBtnRect.x + Worlds.riverCalmBtnRect.w <= 145, 'Botão Modo Calmo não deve invadir o cristal gigante central');

  // 5b. Antes de 4.5s, NÃO deve exibir a frase fixa inferior nem a mãozinha
  let ghostHandCalls = 0;
  let lastGhostHandAnim = null;
  const origDrawGhost = E.drawGhostHandHint;
  E.drawGhostHandHint = (ctx, anim, t) => {
    ghostHandCalls++;
    lastGhostHandAnim = anim;
  };

  try {
    Worlds.updateRiverMelodyGame(2.0);
    const spyBefore = makeMockCtx();
    Worlds.drawRiverMelodyGame(spyBefore, 2.0);
    assert.equal(
      spyBefore._ops.fillTexts.some((t) => t.text.includes('Toque os cristais na ordem')),
      false,
      'NÃO deve exibir "Toque os cristais na ordem!" antes de 4.5s de inatividade'
    );
    assert.equal(ghostHandCalls, 0, 'NÃO deve animar mãozinha antes de 4.5s');

    // 5c. Após >= 4.5s no primeiro cristal (playerIndex === 0), exibe aviso suave e mãozinha no cristal correto
    Worlds.updateRiverMelodyGame(3.0); // total 5.0s
    assert.ok(rm.inputIdleTimer >= 4.5);
    const spyAfter = makeMockCtx();
    Worlds.drawRiverMelodyGame(spyAfter, 5.0);
    assert.ok(
      spyAfter._ops.fillTexts.some((t) => t.text === 'Toque os cristais na ordem!'),
      'Deve exibir suavemente "Toque os cristais na ordem!" após >= 4.5s de inatividade'
    );
    assert.equal(ghostHandCalls, 1, 'Deve animar a mãozinha clicando sobre o 1º cristal correto');
    const firstExpected = rm.crystals[rm.masterSequence[0]];
    assert.equal(lastGhostHandAnim.fromX, firstExpected.x, 'Mãozinha deve mirar exatamente o X do 1º cristal correto');
    assert.equal(lastGhostHandAnim.loop, true);

    // 5d. Clicar no cristal reseta o temporizador de inatividade e oculta a dica imediatamente
    Worlds.clickRiverMelodyCrystal(rm.masterSequence[0]);
    assert.equal(rm.inputIdleTimer, 0, 'Clique do jogador deve resetar inputIdleTimer');
  } finally {
    E.drawGhostHandHint = origDrawGhost;
  }
});
