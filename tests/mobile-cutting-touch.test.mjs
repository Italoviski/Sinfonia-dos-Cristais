import test from 'node:test';
import assert from 'node:assert/strict';

function setupNodeDOM() {
  globalThis.window = globalThis;
  const windowListeners = new Map();
  globalThis.addEventListener = (evt, fn) => {
    if (!windowListeners.has(evt)) windowListeners.set(evt, []);
    windowListeners.get(evt).push(fn);
  };
  globalThis.removeEventListener = (evt, fn) => {
    const list = windowListeners.get(evt);
    if (list) {
      const idx = list.indexOf(fn);
      if (idx !== -1) list.splice(idx, 1);
    }
  };
  globalThis.dispatchEvent = (evt) => {
    const list = windowListeners.get(evt.type) || [];
    for (const fn of list) fn(evt);
  };
  globalThis._windowListeners = windowListeners;
  globalThis.requestAnimationFrame = (fn) => 1;
  globalThis.cancelAnimationFrame = (id) => {};
  globalThis.innerWidth = 640;
  globalThis.innerHeight = 360;

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

  const canvasListeners = new Map();
  const mockCanvas = {
    tagName: 'CANVAS',
    id: 'truePixelScreen',
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => false, contains: () => false },
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: (c) => c,
    append: () => {},
    remove: () => {},
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    addEventListener: (evt, fn) => {
      if (!canvasListeners.has(evt)) canvasListeners.set(evt, []);
      canvasListeners.get(evt).push(fn);
    },
    removeEventListener: (evt, fn) => {
      const list = canvasListeners.get(evt);
      if (list) {
        const idx = list.indexOf(fn);
        if (idx !== -1) list.splice(idx, 1);
      }
    },
    dispatchEvent: (evt) => {
      const list = canvasListeners.get(evt.type) || [];
      for (const fn of list) fn(evt);
    },
    _listeners: canvasListeners,
    getContext: () => ({
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
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createImageData: (w, h) => new globalThis.ImageData(w, h),
      getImageData: (x, y, w, h) => new globalThis.ImageData(w, h),
      putImageData: () => {},
      fillText: () => {},
      measureText: () => ({ width: 40 })
    }),
    toDataURL: () => 'data:image/png;base64,AA==',
    // Logical 320x180 scaled to 640x360 (scale = 2)
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 })
  };

  const elements = new Map();
  elements.set('truePixelScreen', mockCanvas);

  globalThis.document = {
    createElement: (tag) => (tag === 'canvas' ? mockCanvas : {
      tagName: tag.toUpperCase(),
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => false, contains: () => false },
      setAttribute: () => {},
      getAttribute: () => null,
      appendChild: (c) => c,
      append: () => {},
      remove: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      getContext: () => mockCanvas.getContext(),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 })
    }),
    getElementById: (id) => elements.get(id) || {
      tagName: 'DIV',
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => false, contains: () => false },
      setAttribute: () => {},
      getAttribute: () => null,
      appendChild: (c) => c,
      append: () => {},
      remove: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => []
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    body: {
      dataset: { screen: 'game' },
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => false, contains: () => false },
      appendChild: (c) => c
    }
  };

  return { mockCanvas, canvasListeners, windowListeners };
}

test('Mobile Touch & Cutting: Pause and Volume Buttons single touch toggle without bouncing (R1)', async () => {
  const { mockCanvas, canvasListeners, windowListeners } = setupNodeDOM();

  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');
  await import('../js/true-pixel-worlds.js');
  await import('../js/test-harness.js');

  const Worlds = globalThis.TruePixelWorlds;
  const E = globalThis.TruePixelEngine;
  assert.ok(Worlds);
  assert.ok(E);

  // Iniciar fase 5 da Floresta (Nó 10)
  Worlds.canvas = mockCanvas;
  Worlds.ctx = mockCanvas.getContext();
  Worlds.startByCampaignNode(10);
  Worlds.running = true;
  Worlds.phase = 'forest_ninja_game';
  E.DialogueBox.close();
  E.TutorialModal.close();
  E.GameHUD.paused = false;
  E.GameHUD.muted = false;
  E.GameHUD.settingsOpen = false;

  // Re-bind listeners on mockCanvas
  Worlds.canvas = mockCanvas;
  Worlds._bound = false;
  Worlds.bindInput();

  // Helper to simulate a native mobile tap (pointerdown immediately followed by touchstart)
  function simulateMobileTap(logicalX, logicalY) {
    // Canvas is 640x360 for logical 320x180, so clientX = logicalX * 2, clientY = logicalY * 2
    const clientX = logicalX * 2;
    const clientY = logicalY * 2;

    const pointerdownEvt = {
      type: 'pointerdown',
      pointerId: 1,
      clientX,
      clientY,
      cancelable: true,
      preventDefault: () => {}
    };

    const touchstartEvt = {
      type: 'touchstart',
      touches: [{ clientX, clientY }],
      cancelable: true,
      preventDefault: () => {}
    };

    // Dispatch pointerdown
    const pDownHandlers = canvasListeners.get('pointerdown') || [];
    for (const handler of pDownHandlers) handler(pointerdownEvt);

    // Dispatch touchstart immediately (as mobile browsers do)
    const tStartHandlers = canvasListeners.get('touchstart') || [];
    for (const handler of tStartHandlers) handler(touchstartEvt);
  }

  // 1. Test Pause button tap (buttons.pause: x: 188..208, y: 2..18)
  assert.equal(E.GameHUD.paused, false, 'Game should start unpaused');
  simulateMobileTap(198, 10);
  assert.equal(E.GameHUD.paused, true, 'Single mobile tap on Pause should toggle paused to true without bouncing back');

  // Verify test harness exposes HUD state
  if (globalThis.CrystalTestAPI?.getState) {
    const apiState = globalThis.CrystalTestAPI.getState();
    assert.equal(apiState.hud?.paused, true, 'CrystalTestAPI should reflect paused = true');
  }

  // Tap again to unpause (using pause button or resume button in modal)
  simulateMobileTap(198, 10);
  assert.equal(E.GameHUD.paused, false, 'Second mobile tap should unpause');

  // 2. Test Volume/Mute button tap (buttons.mute: x: 276..296, y: 2..18)
  assert.equal(E.GameHUD.muted, false, 'Audio should start unmuted');
  simulateMobileTap(286, 10);
  assert.equal(E.GameHUD.muted, true, 'Single mobile tap on Mute should toggle muted to true without bouncing back');

  if (globalThis.CrystalTestAPI?.getState) {
    const apiState = globalThis.CrystalTestAPI.getState();
    assert.equal(apiState.hud?.muted, true, 'CrystalTestAPI should reflect muted = true');
  }

  simulateMobileTap(286, 10);
  assert.equal(E.GameHUD.muted, false, 'Second mobile tap should unmute');
});

test('Mobile UI & Controls: Virtual "CORTAR" button is absent and direct swipe cutting works (R2)', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-worlds.js');

  const Worlds = globalThis.TruePixelWorlds;
  const E = globalThis.TruePixelEngine;

  // 1. forestSlashBtnRect should be null
  assert.equal(Worlds.forestSlashBtnRect, null, 'forestSlashBtnRect must be null');

  // 2. Enter forest_ninja_game
  Worlds.startByCampaignNode(10);
  Worlds.running = true;
  Worlds.phase = 'forest_ninja_game';
  const fn = Worlds.forestNinja;
  assert.ok(fn);

  // 3. Tapping in the HUD area (y <= 20) should be protected
  const topBarTapResult = Worlds.handleForestNinjaPointerDown(100, 15);
  assert.equal(topBarTapResult, false, 'handleForestNinjaPointerDown must return false for y <= 20');
  assert.equal(fn.isSlicing, false, 'No slicing stroke should start in the HUD bar zone');

  // 4. Test direct swipe slicing through a flying crystal
  fn.flyingCrystals = [];
  fn.bladeTrail = [];
  const targetCrystal = {
    x: 160,
    y: 100,
    vx: 0,
    vy: 0,
    rot: 0,
    vrot: 0,
    type: 'emerald',
    shadow: false,
    radius: 13,
    value: 2,
    sliced: false
  };
  fn.flyingCrystals.push(targetCrystal);

  // Start swipe at (120, 100)
  const downResult = Worlds.handleForestNinjaPointerDown(120, 100);
  assert.equal(downResult, true, 'Pointer down in game arena should start slicing stroke');
  assert.equal(fn.isSlicing, true, 'isSlicing should be true');
  assert.equal(fn.flyingCrystals.length, 1, 'Crystal is at x=160, not yet sliced at x=120');

  // Move swipe through crystal to (200, 100)
  Worlds.handleForestNinjaPointerMove(200, 100);
  assert.equal(fn.flyingCrystals.length, 0, 'Flying crystal should be sliced and removed by direct swipe gesture');
  assert.equal(fn.halvedCrystals.length, 2, 'Sliced crystal should produce 2 halves');
  assert.equal(fn.pureCuts, 1, 'pureCuts count should increment');

  // End swipe
  Worlds.handleForestNinjaPointerUp();
  assert.equal(fn.isSlicing, false, 'Pointer up should finish slice');

  // 5. Test direct tap slicing on crystal (accessible single-touch mode)
  const directTapCrystal = {
    x: 140,
    y: 90,
    vx: 0,
    vy: 0,
    rot: 0,
    vrot: 0,
    type: 'citrine',
    shadow: false,
    radius: 13,
    value: 2,
    sliced: false
  };
  fn.flyingCrystals.push(directTapCrystal);

  const tapSliceResult = Worlds.handleForestNinjaPointerDown(142, 91);
  assert.equal(tapSliceResult, true);
  assert.equal(fn.flyingCrystals.length, 0, 'Direct tap on crystal should slice it cleanly');
  assert.equal(fn.pureCuts, 2);
  Worlds.handleForestNinjaPointerUp();
});

test('Mobile Usability: Movement guarded when paused and pointer capture active (R3)', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-worlds.js');

  const Worlds = globalThis.TruePixelWorlds;
  const E = globalThis.TruePixelEngine;

  Worlds.startByCampaignNode(10);
  Worlds.running = true;
  Worlds.phase = 'forest_ninja_game';
  const fn = Worlds.forestNinja;

  fn.flyingCrystals = [{
    x: 160,
    y: 100,
    vx: 0,
    vy: 0,
    rot: 0,
    vrot: 0,
    type: 'emerald',
    shadow: false,
    radius: 13,
    value: 2,
    sliced: false
  }];

  // Pause the game
  E.GameHUD.paused = true;

  // Attempting swipe while paused should not process or cut crystals
  Worlds.handleForestNinjaPointerDown(120, 100);
  assert.equal(fn.flyingCrystals.length, 1, 'Crystal should not be cut');

  // Re-enable game
  E.GameHUD.paused = false;
  Worlds.handleForestNinjaPointerUp();
});

test('Mobile Usability: Resuming from pause modal via mobile tap does not trigger accidental blade cuts', async () => {
  const { mockCanvas, canvasListeners } = setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-worlds.js');

  const Worlds = globalThis.TruePixelWorlds;
  const E = globalThis.TruePixelEngine;

  Worlds.canvas = mockCanvas;
  Worlds.ctx = mockCanvas.getContext();
  Worlds.startByCampaignNode(10);
  Worlds.running = true;
  Worlds.phase = 'forest_ninja_game';
  const fn = Worlds.forestNinja;
  assert.ok(fn);

  // Set up crystal in center
  fn.flyingCrystals = [{
    x: 160,
    y: 60,
    vx: 0,
    vy: 0,
    rot: 0,
    vrot: 0,
    type: 'citrine',
    shadow: false,
    radius: 13,
    value: 2,
    sliced: false
  }];
  fn.isSlicing = false;

  // Re-bind listeners on mockCanvas
  Worlds._bound = false;
  Worlds.bindInput();

  // Pause the game
  E.GameHUD.paused = true;
  assert.equal(E.GameHUD.paused, true);

  // Resume button is at x: 92..228, y: 52..67 (center ~160, 59)
  // Simulate mobile tap on Resume button
  const clientX = 160 * 2;
  const clientY = 59 * 2;
  const pointerdownEvt = {
    type: 'pointerdown',
    pointerId: 1,
    clientX,
    clientY,
    cancelable: true,
    preventDefault: () => {}
  };
  const touchstartEvt = {
    type: 'touchstart',
    touches: [{ clientX, clientY }],
    cancelable: true,
    preventDefault: () => {}
  };

  const pDownHandlers = canvasListeners.get('pointerdown') || [];
  for (const handler of pDownHandlers) handler(pointerdownEvt);

  const tStartHandlers = canvasListeners.get('touchstart') || [];
  for (const handler of tStartHandlers) handler(touchstartEvt);

  assert.equal(E.GameHUD.paused, false, 'Tapping resume should unpause the game');
  assert.equal(fn.isSlicing, false, 'Unpausing via tap MUST NOT start an accidental blade cut');
  assert.equal(fn.flyingCrystals.length, 1, 'Flying crystals must not be accidentally sliced when tapping resume');
});

test('Mobile CSS Integrity: touch-action: none !important and overscroll-behavior: none !important are defined', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const pixelCss = fs.readFileSync(path.resolve('css/pixel.css'), 'utf-8');
  const responsiveCss = fs.readFileSync(path.resolve('css/responsive.css'), 'utf-8');

  // Verify pixel.css has touch-action: none !important for #truePixelScreen
  assert.ok(pixelCss.includes('#truePixelScreen'), 'pixel.css must target #truePixelScreen');
  assert.ok(pixelCss.includes('touch-action: none !important;'), 'pixel.css must enforce touch-action: none !important');
  assert.ok(pixelCss.includes('overscroll-behavior: none !important;'), 'pixel.css must enforce overscroll-behavior: none !important');

  // Verify responsive.css does not downgrade #truePixelScreen
  assert.ok(responsiveCss.includes('#truePixelScreen'), 'responsive.css must protect #truePixelScreen from manipulation fallback');
  assert.ok(responsiveCss.includes('touch-action: none !important;'), 'responsive.css coarse media must enforce touch-action: none !important');
});

test('Desktop Accessibility: Keyboard slash shortcuts (Space, KeyC, Enter) remain functional', async () => {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-worlds.js');

  const Worlds = globalThis.TruePixelWorlds;
  Worlds.startByCampaignNode(10);
  Worlds.running = true;
  Worlds.phase = 'forest_ninja_game';
  const fn = Worlds.forestNinja;

  fn.flyingCrystals = [
    { x: 100, y: 80, vx: 0, vy: 0, rot: 0, vrot: 0, type: 'white', shadow: false, radius: 13, value: 2, sliced: false },
    { x: 180, y: 70, vx: 0, vy: 0, rot: 0, vrot: 0, type: 'emerald', shadow: false, radius: 13, value: 2, sliced: false }
  ];

  Worlds.handleForestNinjaKeyboardSlash();
  assert.equal(fn.flyingCrystals.length, 0, 'Keyboard slash should slice crystals in range');
  assert.equal(fn.pureCuts >= 2, true, 'Keyboard slash should increment pure cuts');
});

