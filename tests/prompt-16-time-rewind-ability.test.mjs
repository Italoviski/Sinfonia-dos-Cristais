import test from 'node:test';
import assert from 'node:assert/strict';

function setupNodeDOM() {
  globalThis.window = globalThis;
  globalThis.window.innerWidth = 1280;
  globalThis.window.innerHeight = 720;
  delete globalThis.window.ontouchstart;
  globalThis.window.matchMedia = () => ({ matches: false });

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
    const stateStack = [];
    const state = {
      fillStyle: '#000',
      strokeStyle: '#000',
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      lineWidth: 1,
      globalAlpha: 1
    };
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
      get globalAlpha() { return state.globalAlpha; },
      set globalAlpha(v) {
        state.globalAlpha = Number(v);
        if (opsLog) opsLog.push({ op: 'globalAlpha', alpha: state.globalAlpha });
      },
      save: () => {
        stateStack.push({ ...state });
        if (opsLog) opsLog.push({ op: 'save', alpha: state.globalAlpha });
      },
      restore: () => {
        if (stateStack.length) {
          Object.assign(state, stateStack.pop());
        }
        if (opsLog) opsLog.push({ op: 'restore', alpha: state.globalAlpha });
      },
      clip: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      setLineDash: () => {},
      fillRect: (x, y, w, h) => {
        if (opsLog) opsLog.push({ op: 'fillRect', x, y, w, h, fillStyle: state.fillStyle, alpha: state.globalAlpha });
      },
      strokeRect: (x, y, w, h) => {
        if (opsLog) opsLog.push({ op: 'strokeRect', x, y, w, h, strokeStyle: state.strokeStyle, alpha: state.globalAlpha });
      },
      drawImage: (img, dx, dy) => {
        if (opsLog) opsLog.push({ op: 'drawImage', dx, dy, alpha: state.globalAlpha });
      },
      clearRect: () => {},
      setTransform: () => {},
      beginPath: () => {},
      rect: () => {},
      moveTo: (x, y) => {
        if (opsLog) opsLog.push({ op: 'moveTo', x, y, alpha: state.globalAlpha });
      },
      lineTo: (x, y) => {
        if (opsLog) opsLog.push({ op: 'lineTo', x, y, alpha: state.globalAlpha });
      },
      arc: (x, y, r) => {
        if (opsLog) opsLog.push({ op: 'arc', x, y, r, alpha: state.globalAlpha });
      },
      fill: () => {
        if (opsLog) opsLog.push({ op: 'fill', fillStyle: state.fillStyle, alpha: state.globalAlpha });
      },
      stroke: () => {
        if (opsLog) opsLog.push({ op: 'stroke', strokeStyle: state.strokeStyle, alpha: state.globalAlpha });
      },
      closePath: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createImageData: (w, h) => new globalThis.ImageData(w, h),
      getImageData: (x, y, w, h) => new globalThis.ImageData(w, h),
      putImageData: () => {},
      fillText: (txt, x, y) => {
        if (opsLog) opsLog.push({ op: 'fillText', txt, x, y, fillStyle: state.fillStyle, alpha: state.globalAlpha });
      },
      strokeText: (txt, x, y) => {
        if (opsLog) opsLog.push({ op: 'strokeText', txt, x, y, strokeStyle: state.strokeStyle, alpha: state.globalAlpha });
      },
      measureText: (txt) => ({ width: (txt || '').length * 5 })
    };
  };

  if (!globalThis.document || !globalThis.document.body?.dataset) {
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
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
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

  return { createMockCtx };
}

function resetAbilitiesForestUnlocked(E, completed = [5, 10], sockets = { fairy: true, forest: true }) {
  E.DialogueBox.sockets.fairy = Boolean(sockets.fairy);
  E.DialogueBox.sockets.forest = Boolean(sockets.forest);
  E.DialogueBox.sockets.river = Boolean(sockets.river);
  E.DialogueBox.sockets.caatinga = Boolean(sockets.caatinga);
  globalThis.CrystalApp = { state: { completed: completed.slice() }, notify: () => {}, goto: () => {} };
  E.GameHUD.godMode = false;
  E.GameHUD.paused = false;
  E.GameHUD.settingsOpen = false;
  E.GameHUD.guideOpen = false;
  E.GameHUD.syncAbilitiesState(true);
}

test('TruePixelEngine.drawTimeRewindEffect e drawDeadEndAlert renderizam estética Esmeralda / Alerta de Beco sem Saída e restauram globalAlpha', async () => {
  const { createMockCtx } = setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  const E = globalThis.TruePixelEngine;

  assert.equal(typeof E.drawTimeRewindEffect, 'function', 'TruePixelEngine.drawTimeRewindEffect deve existir');
  assert.equal(typeof E.drawDeadEndAlert, 'function', 'TruePixelEngine.drawDeadEndAlert deve existir');

  const rewindOps = [];
  const rCtx = createMockCtx(rewindOps);
  E.drawTimeRewindEffect(rCtx, {
    t: 0.3,
    duration: 0.75,
    isAutoDeadEnd: false,
    label: 'VOLTANDO NO TEMPO!',
    trails: [{ fromX: 200, fromY: 90, toX: 110, toY: 90, pieceType: 'pure', pieceValue: 2 }]
  }, 1.2);

  assert.ok(
    rewindOps.some(o => o.fillStyle === '#4ade80' || o.fillStyle === '#69f0ae'),
    'drawTimeRewindEffect deve usar paleta Esmeralda da Floresta (#4ade80 / #69f0ae)'
  );
  assert.ok(
    rewindOps.some(o => o.op === 'fillText' && String(o.txt).includes('VOLTANDO NO TEMPO')),
    'drawTimeRewindEffect deve exibir texto de retorno temporal'
  );
  assert.equal(rCtx.globalAlpha, 1, 'drawTimeRewindEffect deve restaurar globalAlpha para 1');

  const deadOps = [];
  const dCtx = createMockCtx(deadOps);
  E.drawDeadEndAlert(dCtx, 0.8, true, 2.0, [{ id: 'p1', broken: false, value: 3, x: 100, y: 100 }]);
  assert.ok(
    deadOps.some(o => o.op === 'fillText' && String(o.txt).toUpperCase().includes('BECO SEM')),
    'drawDeadEndAlert deve exibir claramente o alerta de BECO SEM SAÍDA'
  );
  assert.equal(dCtx.globalAlpha, 1, 'drawDeadEndAlert deve restaurar globalAlpha para 1');
});

test('CaveChapter1 registra snapshots por ação e uso manual de Voltar no Tempo restaura estado exato e consome 1 carga', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const E = globalThis.TruePixelEngine;
  const HUD = E.GameHUD;
  const Cave = globalThis.CaveChapter1;

  resetAbilitiesForestUnlocked(E, [5, 10], { fairy: true, forest: true });
  Cave.prepareCanvasForGame(false);
  Cave.setupLevelStep(2, 2); // white 2, opal 1, shadow 1
  E.TutorialModal.isOpen = false;
  Cave.phase = 'gameplay';

  assert.ok(Array.isArray(Cave.actionHistory), 'Cave.actionHistory deve existir como array');
  assert.equal(Cave.actionHistory.length, 0, 'actionHistory deve iniciar vazio na etapa');

  // Uso manual sem nenhuma ação salva deve retornar false e preservar carga
  assert.equal(HUD.useAbility(2), false, 'Sem histórico de ações, useAbility(2) deve retornar false');
  assert.equal(HUD.getAbilityState(2).charges, 1, 'Não deve consumir carga se não houver ação para desfazer');

  // Executa fusão / ação na fase (ex.: Caverna 4-1 possui dois quartzos brancos fundíveis q1 e q3)
  Cave.setupLevelStep(4, 1);
  E.TutorialModal.isOpen = false;
  Cave.phase = 'gameplay';
  const q1 = Cave.pieces.find(p => p.id === 'f4_e1_qw1');
  const q3 = Cave.pieces.find(p => p.id === 'f4_e1_qw3');
  const initialCount = Cave.pieces.filter(p => !p.broken).length;
  const origQ1Val = q1.value;
  const origQ3Pos = { x: q3.x, y: q3.y };

  // Arrasta/solta q1 exatamente sobre q3 para fundir (+1 e +3 -> +4)
  q1.x = q3.x;
  q1.y = q3.y;
  Cave.checkPieceDrop(q1);

  assert.ok(Cave.actionHistory.length >= 1, 'Fusão de cristais deve gravar snapshot no actionHistory');
  assert.equal(q3.value, 4, 'Fusão real deve ter elevado valor para 4');
  assert.equal(q1.broken, true, 'Peça fundida deve ter sido marcada broken');

  // Agora aciona manualmente Habilidade 2 via HUD
  HUD.abilityParticles = [];
  const used = HUD.useAbility(2);
  assert.equal(used, true, 'useAbility(2) deve desfazer última ação na Caverna');
  assert.equal(HUD.getAbilityState(2).charges, 0, 'Uso manual deve consumir 1 carga da Habilidade 2');
  assert.ok(HUD.abilityParticles.length > 0, 'Deve gerar partículas temáticas ao rebobinar');
  assert.ok(Cave.rewindAnim, 'Cave.rewindAnim deve iniciar ao rebobinar');

  const restoredQ1 = Cave.pieces.find(p => p.id === 'f4_e1_qw1');
  const restoredQ3 = Cave.pieces.find(p => p.id === 'f4_e1_qw3');
  assert.equal(Cave.pieces.filter(p => !p.broken).length, initialCount, 'Quantidade de peças ativas deve voltar ao original');
  assert.equal(restoredQ1.broken, false, 'Cristal original deve deixar de estar broken');
  assert.equal(restoredQ1.value, origQ1Val, 'Valor do cristal restaurado deve voltar ao original');
  assert.equal(restoredQ3.value, 3, 'Valor do cristal alvo deve voltar de 4 para 3');
  assert.equal(restoredQ3.x, origQ3Pos.x);

  // God Mode permite usar repetidamente sem gastar cargas
  HUD.godMode = true;
  restoredQ1.x = restoredQ3.x;
  restoredQ1.y = restoredQ3.y;
  Cave.checkPieceDrop(restoredQ1);
  assert.equal(HUD.useAbility(2), true, 'God Mode deve permitir usar Rebobinar com 0 cargas');
  HUD.godMode = false;
  assert.equal(HUD.getAbilityState(2).charges, 0, 'God Mode não deve alterar cargas reais após desativar');

  Cave.running = false;
});

test('TruePixelWorlds registra snapshots em Altar/Citrino/Fração/Molde e aciona Auto-Rewind em Beco sem Saída após delay demonstrativo (1.5s–2.0s)', async () => {
  const { createMockCtx } = setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-worlds.js');

  const E = globalThis.TruePixelEngine;
  const HUD = E.GameHUD;
  const Worlds = globalThis.TruePixelWorlds;

  // Desbloqueia com 2 cargas (Floresta + Rio concluídos)
  resetAbilitiesForestUnlocked(E, [5, 10, 15], { fairy: true, forest: true, river: true });

  // 1. Altar Esmeralda (Floresta 1-1) + Rebobinar manual
  Worlds.startWorldLevel('forest', 1, 6);
  E.TutorialModal.isOpen = false;
  Worlds.phase = 'gameplay';
  const foQ = Worlds.pieces.find(p => p.id === 'fo1_1_q');
  assert.equal(foQ.value, 2);
  foQ.x = Worlds.emeraldAltar.x;
  foQ.y = Worlds.emeraldAltar.y;
  Worlds.checkEmeraldAltarBlessing(foQ);
  assert.equal(foQ.value, 4, 'Altar Esmeralda deve dobrar valor de 2 para 4');
  assert.equal(HUD.useAbility(2), true, 'Rebobinar manual deve desfazer bênção do Altar Esmeralda');
  assert.equal(Worlds.pieces.find(p => p.id === 'fo1_1_q').value, 2, 'Cristal deve retornar para valor 2 e não estar boosted');
  assert.equal(Worlds.pieces.find(p => p.id === 'fo1_1_q').boosted, false);

  // 2. Citrino Split + Plataforma de Fração + Molde Elétrico
  Worlds.startWorldLevel('forest', 2, 7);
  E.TutorialModal.isOpen = false;
  Worlds.phase = 'gameplay';
  const cit = Worlds.pieces.find(p => p.id === 'fo2_1_c');
  Worlds.trySplitCrystalOnTap(cit);
  assert.equal(Worlds.pieces.filter(p => !p.broken && p.type === 'citrine' && !p.shadow).length, 2);
  HUD.godMode = true;
  assert.equal(HUD.useAbility(2), true, 'Rebobinar manual deve desfazer divisão do Citrino');
  assert.equal(Worlds.pieces.filter(p => !p.broken && p.type === 'citrine' && !p.shadow).length, 1);
  assert.equal(Worlds.pieces.find(p => p.id === 'fo2_1_c').value, 4);

  Worlds.startWorldLevel('river', 1, 11);
  E.TutorialModal.isOpen = false;
  Worlds.phase = 'gameplay';
  const riFree = Worlds.pieces.find(p => p.id === 'ri1_1_free');
  riFree.x = Worlds.fractionPlatform.x;
  riFree.y = Worlds.fractionPlatform.bottomY;
  Worlds.checkPieceDrop(riFree);
  assert.equal(Worlds.fractionPlatform.glowing, true);
  Worlds.triggerFractionDivide();
  assert.equal(Worlds.fractionPlatform, null);
  assert.equal(HUD.useAbility(2), true, 'Rebobinar deve restaurar plataforma de fração antes da divisão');
  assert.ok(Worlds.fractionPlatform && Worlds.fractionPlatform.glowing === true, 'Plataforma de fração deve voltar ao estado glowing anterior à divisão');
  assert.equal(HUD.useAbility(2), true, 'Segundo rebobinar deve tirar peça da fração e restaurar peça livre');
  assert.equal(Worlds.fractionPlatform.glowing, false);
  assert.equal(Worlds.pieces.find(p => p.id === 'ri1_1_free').inFraction, null);

  Worlds.startWorldLevel('caatinga', 1, 16);
  E.TutorialModal.isOpen = false;
  Worlds.phase = 'gameplay';
  const caOpal = Worlds.pieces.find(p => p.id === 'ca1_1_o');
  const caMold = Worlds.electricShapes[0];
  Worlds.tryEnterElectricShapeNode(caMold, [caOpal]);
  assert.equal(caOpal.shape, 'circle');
  assert.equal(caMold.used, true);
  assert.equal(HUD.useAbility(2), true, 'Rebobinar deve desfazer encaixe no molde elétrico');
  assert.equal(Worlds.pieces.find(p => p.id === 'ca1_1_o').shape, null);
  assert.equal(Worlds.electricShapes[0].used, false);
  HUD.godMode = false;

  // 3. Ativação Automática em Beco sem Saída com Delay Demonstrativo (1.5s–2.0s)
  resetAbilitiesForestUnlocked(E, [5, 10], { fairy: true, forest: true }); // exatamente 1 carga!
  Worlds.startWorldLevel('forest', 4, 9);
  E.TutorialModal.isOpen = false;
  Worlds.setupStep(3); // Caso B clássico da Floresta 4-3: Opala 1 gasta na Citrina (4 -> 3) causa Beco sem Saída!
  Worlds.phase = 'gameplay';
  Worlds.opalStepInterval = 0.25;

  const opal = Worlds.pieces.find(p => p.id === 'fo4_3_o');
  const citTarget = Worlds.pieces.find(p => p.id === 'fo4_3_c');
  assert.ok(opal && citTarget);

  // Move Opala perto da Citrina e drena 1 passo via update(dt) para disparar ação fatal com snapshot real
  opal.x = citTarget.x - 18;
  opal.y = citTarget.y;
  Worlds.draggedPiece = opal;
  opal.dragging = true;
  Worlds.ctx = createMockCtx();
  Worlds.update(0.3);

  assert.equal(Worlds.phase, 'defeat_pause', 'Após ação fatal, jogo deve entrar em defeat_pause para exibir o Beco sem Saída');
  assert.equal(Worlds.deadEndAutoRewindPending, true, 'Com carga na Habilidade 2, deadEndAutoRewindPending deve ser true');
  assert.equal(HUD.getAbilityState(2).charges, 1, 'Carga NÃO pode ser gasta instantaneamente no momento do erro');

  // Em t = 0.5s e t = 1.2s: deve continuar em defeat_pause mostrando aviso visual de Beco sem Saída!
  const deadOps = [];
  Worlds.ctx = createMockCtx(deadOps);
  Worlds.update(0.5);
  assert.equal(Worlds.phase, 'defeat_pause', 'Em t = 0.5s o jogador ainda deve ver o erro (não rebobinar instantaneamente)');
  assert.equal(HUD.getAbilityState(2).charges, 1, 'Carga deve permanecer intacta durante o delay demonstrativo');
  Worlds.render();
  assert.ok(
    deadOps.some(o => o.op === 'fillText' && String(o.txt).toUpperCase().includes('BECO SEM')),
    'Durante a pausa de Beco sem Saída, feedback visual deve ser renderizado'
  );

  Worlds.update(0.7); // total ~1.2s
  assert.equal(Worlds.phase, 'defeat_pause', 'Em t = 1.2s o atraso demonstrativo (1.5s-2.0s) ainda deve estar em exibição');
  assert.equal(HUD.getAbilityState(2).charges, 1);

  // Ao ultrapassar o delay (1.75s): auto-rewind dispara, consome a carga, restaura a Opala e Citrina originais e volta para gameplay!
  Worlds.update(0.65); // total ~1.85s
  assert.equal(Worlds.phase, 'gameplay', 'Após o delay (1.5s-2.0s), Auto-Rewind deve devolver jogador para gameplay');
  assert.equal(HUD.getAbilityState(2).charges, 0, 'Auto-Rewind deve consumir 1 carga da Habilidade 2');
  assert.ok(Worlds.rewindAnim, 'Auto-Rewind deve ativar o efeito visual de rebobinar');
  const restoredOpal = Worlds.pieces.find(p => p.id === 'fo4_3_o');
  const restoredCit = Worlds.pieces.find(p => p.id === 'fo4_3_c');
  assert.equal(restoredOpal.broken, false, 'Opala gasta no erro deve ser restaurada');
  assert.equal(restoredOpal.value, 1);
  assert.equal(restoredCit.value, 4, 'Citrina deve voltar ao valor 4 anterior à ação fatal');

  // Sem cargas restantes (charges === 0): novo Beco sem Saída leva para game_over normalmente!
  restoredOpal.broken = true;
  restoredOpal.value = 0;
  restoredCit.value = 3;
  Worlds.triggerDefeatIfImpossible();
  assert.equal(Worlds.phase, 'defeat_pause');
  assert.equal(Worlds.deadEndAutoRewindPending, false, 'Sem cargas restantes, não deve agendar Auto-Rewind');
  Worlds.update(0.75);
  assert.equal(Worlds.phase, 'game_over', 'Sem cargas restantes, defeat_pause deve evoluir normalmente para game_over');

  Worlds.running = false;
});
