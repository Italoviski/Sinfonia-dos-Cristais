import test from 'node:test';
import assert from 'node:assert/strict';

function setupFinalPhaseTestDOM() {
  const winListeners = new Map();
  globalThis.window = globalThis;
  globalThis.addEventListener = (evt, fn) => {
    if (!winListeners.has(evt)) winListeners.set(evt, []);
    winListeners.get(evt).push(fn);
  };
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
    const ops = { fillRects: [], rects: [], fillTexts: [], drawImages: [] };
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
      fillRect: (x, y, w, h) => {
        ops.fillRects.push({ x, y, w, h, fill: '' });
      },
      rect: (x, y, w, h) => {
        ops.rects.push({ x, y, w, h });
      },
      strokeRect: () => {},
      drawImage: (...args) => {
        ops.drawImages.push(args);
      },
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
      fillText: (txt, x, y) => {
        ops.fillTexts.push({ text: String(txt), x, y });
      },
      measureText: (txt) => ({ width: String(txt || '').length * 5 })
    };
  };

  const elementsById = new Map();
  const mockElement = (tag) => {
    const listeners = new Map();
    const el = {
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
    return el;
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

  return { makeMockCtx };
}

const { makeMockCtx } = setupFinalPhaseTestDOM();

test('Fase Final: cristais encaixados simetricamente na Porta Final e elementos alinhados sem invasão/duplicação', async () => {
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');
  await import('../js/final-phase.js');

  const E = globalThis.TruePixelEngine;
  const Worlds = globalThis.TruePixelWorlds;
  const gate = Worlds.SANCTUARY_GATE;
  const sockets = Worlds.SANCTUARY_DOOR_SOCKETS;

  assert.ok(gate, 'SANCTUARY_GATE deve estar exposto em TruePixelWorlds');
  assert.ok(sockets, 'SANCTUARY_DOOR_SOCKETS deve estar exposto em TruePixelWorlds');

  // 1. Todos os 4 encaixes ficam simetricamente dentro da verga da Porta Final e alinham com gemFlight
  const socketList = ['forest', 'river', 'caatinga', 'fairy'].map((k) => sockets[k]);
  assert.equal(socketList.length, 4);
  for (const s of socketList) {
    assert.ok(s.x - 3 >= gate.lintelX, `Encaixe ${s.label} deve ficar dentro da borda esquerda da verga`);
    assert.ok(s.x + 3 <= gate.lintelX + gate.lintelW, `Encaixe ${s.label} deve ficar dentro da borda direita da verga`);
    assert.ok(s.y - 3 >= gate.lintelY, `Encaixe ${s.label} deve ficar abaixo do topo da verga`);
    assert.ok(s.y + 3 <= gate.lintelY + gate.lintelH, `Encaixe ${s.label} deve ficar acima da base da verga`);
  }
  assert.equal((socketList[0].x + socketList[3].x) / 2, gate.gx, 'Encaixes externos devem ser simétricos em torno de gx');
  assert.equal((socketList[1].x + socketList[2].x) / 2, gate.gx, 'Encaixes internos devem ser simétricos em torno de gx');

  // 2. drawAncientSanctuaryGate com openRatio = 0.5 e 1.0 não desenha nem clipa fora da moldura
  for (const openRatio of [0.5, 1.0]) {
    const spyCtx = makeMockCtx();
    Worlds.drawAncientSanctuaryGate(spyCtx, 1.0, openRatio, 1.0, { forest: true, river: true, caatinga: true, fairy: true }, true);
    assert.ok(
      spyCtx._ops.rects.some((r) => r.x === gate.innerX && r.y === gate.innerY && r.w === gate.innerW && r.h === gate.innerH),
      `Clip do vão interno deve coincidir exatamente com innerX..innerW (openRatio=${openRatio})`
    );
    for (const r of spyCtx._ops.fillRects) {
      assert.ok(
        r.x >= gate.frameX - 1 && r.x + r.w <= gate.frameX + gate.frameW + 1,
        `fillRect (${r.x}, ${r.w}) de drawAncientSanctuaryGate não pode vazar fora da moldura (${gate.frameX}..${gate.frameX + gate.frameW})`
      );
      assert.ok(
        r.y >= gate.frameY && r.y + r.h <= gate.frameY + gate.frameH,
        `fillRect vertical (${r.y}, ${r.h}) não pode vazar fora da moldura (${gate.frameY}..${gate.frameY + gate.frameH})`
      );
    }
  }

  // 3. Visão e Voltar ocultos em todas as fases do Santuário
  Worlds.startWorldLevel('sanctuary', 1, 21);
  Worlds.running = true;
  E.TutorialModal.close();
  E.DialogueBox.close();
  for (const ph of ['final_intro_mystery', 'final_guardian_enter', 'forest_ninja_game', 'river_melody_game', 'shell_game_show', 'final_musical_order_puzzle', 'final_gem_delivery', 'final_gate_opening', 'final_last_dance', 'final_wall_thanks']) {
    Worlds.phase = ph;
    assert.equal(E.GameHUD.isSpecialOrModalActive(false), true, `GameHUD deve ocultar Visão/Voltar em sanctuary/${ph}`);
  }
  Worlds.running = false;

  // 4a. Destino do voo da gema coincide exatamente com SANCTUARY_DOOR_SOCKETS
  for (const [idx, key] of [[1, 'forest'], [2, 'river'], [3, 'caatinga'], [4, 'fairy']]) {
    Worlds.startGemDeliveryToGate(idx);
    assert.equal(Worlds.gemFlight.endX, sockets[key].x, `gemFlight ${idx} endX deve bater com ${key}`);
    assert.equal(Worlds.gemFlight.endY, sockets[key].y, `gemFlight ${idx} endY deve bater com ${key}`);
  }

  // 4b. Estado das guardiãs é resetado para 'idle' ao iniciar nova etapa (sem ficar preso em 'celebrate')
  Worlds.finalGuardians.araci.visible = true;
  Worlds.finalGuardians.araci.state = 'celebrate';
  Worlds.startSanctuaryPuzzleStep(2, true);
  assert.equal(Worlds.finalGuardians.araci.state, 'idle', 'Guardiã anterior não pode permanecer travada em celebrate');
  E.DialogueBox.close();

  // 4c. River Melody no Santuário: cristais e banner à esquerda da porta, sem invadir a porta nem cabeças
  for (const c of Worlds.riverMelody.crystals) {
    assert.ok(c.x + 12 < gate.frameX, `Cristal River Melody x=${c.x} deve ficar à esquerda da porta`);
    assert.ok(c.baseY <= 92, `Cristal River Melody y=${c.baseY} não deve sobrepor guardiãs/banner inferior`);
  }
  const riverCtx = makeMockCtx();
  E.GameHUD.godMode = true;
  Worlds.drawRiverMelodyGame(riverCtx, 1.0);
  E.GameHUD.godMode = false;
  const riverJoined = riverCtx._ops.fillTexts.map((t) => t.text).join(' ');
  assert.ok(
    riverJoined.includes('Sinfonia das Águas - Melodia 1/2'),
    `Título de River Melody na Fase Final deve mostrar 1/2 em vez de 2/5 (obtido: ${riverJoined})`
  );
  assert.ok(
    riverCtx._ops.fillRects.every((r) => r.x + r.w <= gate.frameX),
    'Nenhum retângulo de UI de River Melody no Santuário pode invadir a Porta Final'
  );

  // 4d. Forest Ninja no Santuário: barra e banners à esquerda da porta e título Cortes: 0/8
  Worlds.startSanctuaryPuzzleStep(1, true);
  const forestCtx = makeMockCtx();
  Worlds.drawForestNinjaGame(forestCtx, 1.0);
  const forestJoined = forestCtx._ops.fillTexts.map((t) => t.text).join(' ');
  assert.ok(
    forestJoined.includes('Cortes: 0/8'),
    `Barra do Forest Ninja na Fase Final deve mostrar Cortes: 0/8 (obtido: ${forestJoined})`
  );
  assert.ok(
    forestCtx._ops.fillRects.every((r) => r.w >= 300 || r.x + r.w <= gate.frameX),
    'UI de Forest Ninja no Santuário deve ficar totalmente à esquerda da Porta Final'
  );

  // 4e. Shell Game no Santuário: Modo Calmo, título 1/3, tapete de areia, cúpulas e banner à esquerda da porta
  Worlds.startSanctuaryPuzzleStep(3, true);
  for (const cup of Worlds.shellGame.cups) {
    assert.ok(cup.x + 12 < gate.frameX, `Cúpula x=${cup.x} deve ficar à esquerda da porta`);
  }
  const shellCtx = makeMockCtx();
  Worlds.drawShellGame(shellCtx, 1.0);
  const shellJoined = shellCtx._ops.fillTexts.map((t) => t.text).join(' ');
  assert.ok(
    shellJoined.includes('Desafio das Areias - Rodada 1/3'),
    `Título do Shell Game na Fase Final deve exibir Rodada 1/3 (obtido: ${shellJoined})`
  );
  assert.ok(
    shellCtx._ops.fillRects.every((r) => r.x + r.w <= gate.frameX),
    'Nenhum elemento de Shell Game no Santuário pode invadir a Porta Final'
  );
  assert.ok(
    Worlds.getShellCalmBtnRect().x + Worlds.getShellCalmBtnRect().w < gate.frameX,
    'Botão Modo Calmo do Shell Game no Santuário deve ficar à esquerda da porta'
  );

  // 4f. Puzzle 4 (Ordem Musical): nós e banners livres da porta e das guardiãs
  Worlds.startSanctuaryPuzzleStep(4, true);
  E.DialogueBox.close();
  Worlds.finalMusicalOrder.subPhase = 'harmonic_nodes';
  for (const node of Worlds.finalMusicalOrder.nodes) {
    assert.ok(node.x + 28 < gate.frameX, `Nó ${node.label} não pode invadir a Porta Final`);
    assert.ok(node.y >= 48 && node.y <= 104, `Nó ${node.label} deve ficar entre o banner superior e as guardiãs`);
  }
  const orderCtx = makeMockCtx();
  Worlds.renderSanctuaryPuzzleLayer(orderCtx, 1.0);
  assert.ok(
    orderCtx._ops.fillRects.every((r) => r.x + r.w <= gate.frameX),
    'Banners e nós do Puzzle 4 não podem sobrepor a Porta Final'
  );

  // 5. Cena final_wall_thanks: placa à esquerda da porta e protagonista desenhado apenas 1 vez
  Worlds.phase = 'final_wall_thanks';
  Worlds.phaseTime = 1.0;
  let protagCalls = 0;
  const origDrawActor = E.ActorAnimator.drawActor;
  E.ActorAnimator.drawActor = (ctx, actorKey, ...rest) => {
    if (actorKey === 'protagonist') protagCalls++;
    return origDrawActor.call(E.ActorAnimator, ctx, actorKey, ...rest);
  };
  try {
    Worlds.render();
  } finally {
    E.ActorAnimator.drawActor = origDrawActor;
  }
  assert.equal(protagCalls, 1, 'final_wall_thanks deve desenhar exatamente 1 protagonista (sem duplicação)');

  const wallCtx = makeMockCtx();
  Worlds.renderSanctuaryPuzzleLayer(wallCtx, 1.0);
  assert.ok(
    wallCtx._ops.fillRects.every((r) => r.x + r.w <= gate.frameX),
    'Placa "Obrigado por jogar" deve ficar totalmente à esquerda da Porta Final'
  );

  // Encerra música/timers da fase final para permitir término limpo do processo Node
  globalThis.FinalPhaseMusic?.stop?.();
  Worlds.deactivateCanvas?.();
});
