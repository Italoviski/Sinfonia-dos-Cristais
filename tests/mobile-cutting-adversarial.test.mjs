import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

import net from 'node:net';

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function startServer() {
  const port = await getAvailablePort();
  const baseURL = `http://127.0.0.1:${port}/index.html`;
  return new Promise((resolveReady, rejectReady) => {
    let errOutput = '';
    const child = spawn(process.execPath, ['scripts/serve.mjs'], {
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stderr.on('data', chunk => { errOutput += chunk; });
    const timeout = setTimeout(() => rejectReady(new Error(`Timeout starting test server: ${errOutput}`)), 8000);
    child.stdout.on('data', chunk => {
      if (String(chunk).includes(String(port))) {
        clearTimeout(timeout);
        resolveReady({ child, port, baseURL });
      }
    });
    child.on('error', err => {
      clearTimeout(timeout);
      rejectReady(err);
    });
    child.on('exit', code => {
      clearTimeout(timeout);
      rejectReady(new Error(`Server exited early with code ${code}: ${errOutput}`));
    });
  });
}

test('Playwright Mobile Adversarial: Full touch, UI, and edge case suite', async (t) => {
  const serverObj = await startServer();
  const server = serverObj.child;
  const BASE_URL = serverObj.baseURL;
  let browser = null;
  let context = null;
  let page = null;

  try {
    browser = await chromium.launch({
      channel: 'msedge',
      headless: true
    });

    // Mobile landscape viewport (640x360) with touch and mobile emulation enabled
    context = await browser.newContext({
      viewport: { width: 640, height: 360 },
      isMobile: true,
      hasTouch: true
    });
    page = await context.newPage();

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // Wait for game test API and scripts to load
    await page.waitForFunction(() => Boolean(window.CrystalTestAPI && window.TruePixelWorlds && window.TruePixelEngine));

    // Helper to reset level 10 to clean play state
    async function resetToForestGame() {
      await page.evaluate(() => {
        window.CrystalTestAPI.closeDialogs();
        window.CrystalTestAPI.startLevel(10);
        const W = window.TruePixelWorlds;
        const E = window.TruePixelEngine;
        W.phase = 'forest_ninja_game';
        W.running = true;
        E.GameHUD.paused = false;
        E.GameHUD.muted = false;
        E.GameHUD.settingsOpen = false;
        if (W.forestNinja) {
          W.forestNinja.vignetteCard = 0;
          W.forestNinja.phase = 'play';
          W.forestNinja.isSlicing = false;
          W.forestNinja.bladeTrail = [];
        }
      });
      await page.waitForSelector('#truePixelScreen', { state: 'visible', timeout: 5000 });
    }

    await resetToForestGame();

    await t.test('1. Mobile CSS verification: touch-action and overscroll-behavior', async () => {
      await resetToForestGame();

      const styles = await page.evaluate(() => {
        const cv = document.getElementById('truePixelScreen');
        const body = document.body;
        const cvStyle = window.getComputedStyle(cv);
        const bodyStyle = window.getComputedStyle(body);
        return {
          cvTouchAction: cvStyle.touchAction,
          cvOverscroll: cvStyle.overscrollBehavior,
          bodyTouchAction: bodyStyle.touchAction,
          bodyOverscroll: bodyStyle.overscrollBehavior,
          bodyScreen: body.dataset.screen
        };
      });

      assert.equal(styles.cvTouchAction, 'none', 'Canvas #truePixelScreen must have touch-action: none');
      assert.equal(styles.cvOverscroll, 'none', 'Canvas #truePixelScreen must have overscroll-behavior: none');
      assert.equal(styles.bodyTouchAction, 'none', 'Body[data-screen="game"] must have touch-action: none');
      assert.equal(styles.bodyOverscroll, 'none', 'Body[data-screen="game"] must have overscroll-behavior: none');
    });

    await t.test('2. Virtual "CORTAR" button absence verification', async () => {
      await resetToForestGame();

      // A: Verify in runtime object
      const forestSlashBtnRect = await page.evaluate(() => window.TruePixelWorlds.forestSlashBtnRect);
      assert.equal(forestSlashBtnRect, null, 'forestSlashBtnRect property must be strictly null');

      // B: Verify in DOM
      const cortarElements = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('*'));
        return all
          .filter(el => (el.textContent && el.textContent.includes('CORTAR')) ||
                        (el.getAttribute('aria-label') && el.getAttribute('aria-label').includes('CORTAR')) ||
                        (el.id && el.id.toLowerCase().includes('cortar')))
          .map(el => el.tagName);
      });
      assert.equal(cortarElements.length, 0, 'No DOM elements with "CORTAR" should exist');

      // C: Verify render does not draw virtual touch button
      const isVirtualButtonActive = await page.evaluate(() => {
        const W = window.TruePixelWorlds;
        return Boolean(W.forestSlashBtnRect);
      });
      assert.equal(isVirtualButtonActive, false, 'Virtual button must not be active or drawn');
    });

    await t.test('3. Mobile Touch on Pause and Volume buttons without bouncing (R1)', async () => {
      await resetToForestGame();

      async function getPhysicalPoint(logicalX, logicalY) {
        return await page.evaluate(({ lx, ly }) => {
          const cv = document.getElementById('truePixelScreen');
          const rect = cv.getBoundingClientRect();
          const W = 320, H = 180;
          return {
            x: rect.left + (lx / W) * rect.width,
            y: rect.top + (ly / H) * rect.height
          };
        }, { lx: logicalX, ly: logicalY });
      }

      // Pause button center: logical (198, 10)
      const pausePt = await getPhysicalPoint(198, 10);
      await page.tap('#truePixelScreen', { position: { x: pausePt.x, y: pausePt.y } });

      let hudState = await page.evaluate(() => ({
        paused: window.TruePixelEngine.GameHUD.paused,
        muted: window.TruePixelEngine.GameHUD.muted
      }));
      assert.equal(hudState.paused, true, 'Pause button should toggle paused = true on single mobile tap');

      // Tap again to unpause
      await page.tap('#truePixelScreen', { position: { x: pausePt.x, y: pausePt.y } });
      hudState = await page.evaluate(() => ({
        paused: window.TruePixelEngine.GameHUD.paused,
        muted: window.TruePixelEngine.GameHUD.muted
      }));
      assert.equal(hudState.paused, false, 'Pause button should toggle paused = false on second mobile tap');

      // Volume / Mute button center: logical (286, 10)
      const mutePt = await getPhysicalPoint(286, 10);
      await page.tap('#truePixelScreen', { position: { x: mutePt.x, y: mutePt.y } });

      hudState = await page.evaluate(() => ({
        paused: window.TruePixelEngine.GameHUD.paused,
        muted: window.TruePixelEngine.GameHUD.muted
      }));
      assert.equal(hudState.muted, true, 'Volume/Mute button should toggle muted = true on single mobile tap');

      await page.tap('#truePixelScreen', { position: { x: mutePt.x, y: mutePt.y } });
      hudState = await page.evaluate(() => ({
        paused: window.TruePixelEngine.GameHUD.paused,
        muted: window.TruePixelEngine.GameHUD.muted
      }));
      assert.equal(hudState.muted, false, 'Volume/Mute button should toggle muted = false on second mobile tap');
    });

    await t.test('4. Extreme and corner coordinates adversarial testing: (0,0), (319,179), (188,2), (276,2)', async () => {
      async function testPoint(logicalX, logicalY) {
        await resetToForestGame();

        return await page.evaluate(({ lx, ly }) => {
          const W = window.TruePixelWorlds;
          const E = window.TruePixelEngine;
          const fn = W.forestNinja;
          const initialScreen = document.body.dataset.screen;
          const initialPaused = E.GameHUD.paused;
          const initialMuted = E.GameHUD.muted;
          const initialCuts = fn.bladeTrail.length;

          // Compute canvas client coords
          const cv = document.getElementById('truePixelScreen');
          const rect = cv.getBoundingClientRect();
          const clientX = rect.left + (lx / 320) * rect.width;
          const clientY = rect.top + (ly / 180) * rect.height;

          // Dispatch pointerdown
          const downEvt = new PointerEvent('pointerdown', {
            pointerId: 1,
            clientX,
            clientY,
            cancelable: true,
            bubbles: true
          });
          cv.dispatchEvent(downEvt);

          const isSlicingWhileDown = fn.isSlicing;
          const cutsDelta = fn.bladeTrail.length - initialCuts;
          const pausedChanged = E.GameHUD.paused !== initialPaused;
          const mutedChanged = E.GameHUD.muted !== initialMuted;
          const screenAfter = document.body.dataset.screen;

          // Clean up pointer
          const upEvt = new PointerEvent('pointerup', { pointerId: 1, clientX, clientY, bubbles: true });
          window.dispatchEvent(upEvt);

          return {
            screenChanged: screenAfter !== initialScreen,
            newScreen: screenAfter,
            pausedChanged,
            mutedChanged,
            isSlicingWhileDown,
            isSlicingAfterUp: fn.isSlicing,
            cutsDelta
          };
        }, { lx: logicalX, ly: logicalY });
      }

      // Corner A: (0, 0) - Top-left extreme corner (in top bar zone y <= 20)
      const res00 = await testPoint(0, 0);
      assert.equal(res00.pausedChanged, false, '(0,0) must not trigger pause');
      assert.equal(res00.mutedChanged, false, '(0,0) must not trigger mute');
      assert.equal(res00.isSlicingWhileDown, false, '(0,0) is in header bar (y<=20), must NOT start slice');
      assert.equal(res00.cutsDelta, 0, '(0,0) must not record blade trail');

      // Corner B: (319, 179) - Bottom-right extreme corner (in game arena)
      const res319 = await testPoint(319, 179);
      assert.equal(res319.pausedChanged, false, '(319,179) must not trigger pause');
      assert.equal(res319.mutedChanged, false, '(319,179) must not trigger mute');
      assert.equal(res319.isSlicingWhileDown, true, '(319,179) starts slice stroke cleanly');
      assert.equal(res319.isSlicingAfterUp, false, 'isSlicing reset on pointerup');
      assert.equal(res319.cutsDelta, 1, '(319,179) records 1 trail point');

      // Corner C: (188, 2) - Top-left boundary of Pause button
      // Note: Map button occupies x: 154..186 with padX: 2 (effective 152..188).
      // At exact boundary (188, 2), Map button's padded hitbox takes precedence.
      // At (189, 2), Pause button is cleanly activated.
      const res188 = await testPoint(188, 2);
      assert.equal(res188.cutsDelta, 0, '(188,2) in header zone must never start blade cut');
      const res189 = await testPoint(189, 2);
      assert.equal(res189.pausedChanged, true, '(189,2) inside Pause button body toggles pause');
      assert.equal(res189.cutsDelta, 0, 'Pause button tap must not start blade cut');

      // Corner D: (276, 2) - Top-left boundary of Mute button
      // Note: Restart button occupies x: 210..274 with padX: 2 (effective 208..276).
      // At (276, 2), Restart button's padded hitbox is activated.
      // At (277, 2), Mute button is cleanly activated.
      const res276 = await testPoint(276, 2);
      assert.equal(res276.cutsDelta, 0, '(276,2) in header zone must never start blade cut');
      const res277 = await testPoint(277, 2);
      assert.equal(res277.mutedChanged, true, '(277,2) inside Mute button body toggles mute');
      assert.equal(res277.cutsDelta, 0, 'Mute button tap must not start blade cut');
    });

    await t.test('5. Direct swipe gesture cuts crystals and prevents page scroll/zoom', async () => {
      await resetToForestGame();

      // Set up a target flying crystal
      await page.evaluate(() => {
        const W = window.TruePixelWorlds;
        const fn = W.forestNinja;
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
        fn.halvedCrystals = [];
        fn.pureCuts = 0;
        fn.isSlicing = false;
        window.scrollTo(0, 0);
      });

      // Swipe horizontally across crystal from logical (100, 100) to (220, 100)
      // Logical (100, 100) -> client (200, 200); logical (220, 100) -> client (440, 200)
      const startPt = await page.evaluate(() => {
        const cv = document.getElementById('truePixelScreen');
        const rect = cv.getBoundingClientRect();
        return {
          x: rect.left + (100 / 320) * rect.width,
          y: rect.top + (100 / 180) * rect.height
        };
      });
      const endPt = await page.evaluate(() => {
        const cv = document.getElementById('truePixelScreen');
        const rect = cv.getBoundingClientRect();
        return {
          x: rect.left + (220 / 320) * rect.width,
          y: rect.top + (100 / 180) * rect.height
        };
      });

      // Perform swipe via mouse drag
      await page.mouse.move(startPt.x, startPt.y);
      await page.mouse.down();
      await page.mouse.move(endPt.x, endPt.y, { steps: 5 });
      await page.mouse.up();

      const swipeResult = await page.evaluate(() => {
        const fn = window.TruePixelWorlds.forestNinja;
        return {
          flyingCount: fn.flyingCrystals.length,
          halvedCount: fn.halvedCrystals.length,
          pureCuts: fn.pureCuts,
          scrollY: window.scrollY
        };
      });

      assert.equal(swipeResult.flyingCount, 0, 'Crystal should be sliced by swipe');
      assert.equal(swipeResult.halvedCount, 2, 'Crystal split into 2 halves');
      assert.equal(swipeResult.pureCuts, 1, 'pureCuts incremented by 1');
      assert.equal(swipeResult.scrollY, 0, 'Page scrollY must remain 0 during swipe gestures');
    });

    await t.test('6. Resuming from pause modal via mobile tap does NOT slice crystals', async () => {
      await resetToForestGame();

      await page.evaluate(() => {
        const W = window.TruePixelWorlds;
        const E = window.TruePixelEngine;
        const fn = W.forestNinja;
        E.GameHUD.paused = true;
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
        fn.bladeTrail = [];
      });

      // Resume button is at logical (160, 59)
      const resumePt = await page.evaluate(() => {
        const cv = document.getElementById('truePixelScreen');
        const rect = cv.getBoundingClientRect();
        return {
          x: rect.left + (160 / 320) * rect.width,
          y: rect.top + (59 / 180) * rect.height
        };
      });

      await page.tap('#truePixelScreen', { position: { x: resumePt.x, y: resumePt.y } });

      const resumeResult = await page.evaluate(() => {
        const fn = window.TruePixelWorlds.forestNinja;
        return {
          paused: window.TruePixelEngine.GameHUD.paused,
          isSlicing: fn.isSlicing,
          flyingCount: fn.flyingCrystals.length,
          bladeTrailCount: fn.bladeTrail.length
        };
      });

      assert.equal(resumeResult.paused, false, 'Tapping resume should unpause the game');
      assert.equal(resumeResult.isSlicing, false, 'Unpausing must NOT start a slicing stroke');
      assert.equal(resumeResult.flyingCount, 1, 'Flying crystals under modal must NOT be accidentally sliced');
      assert.equal(resumeResult.bladeTrailCount, 0, 'No blade trail should be recorded on resume tap');
    });

    await t.test('7. Desktop accessibility: Keyboard slash controls remain fully functional', async () => {
      await resetToForestGame();

      // Set up flying crystals for keyboard slash test
      await page.evaluate(() => {
        const W = window.TruePixelWorlds;
        const E = window.TruePixelEngine;
        const fn = W.forestNinja;
        E.GameHUD.paused = false;
        fn.flyingCrystals = [
          { x: 100, y: 80, vx: 0, vy: 0, rot: 0, vrot: 0, type: 'white', shadow: false, radius: 13, value: 2, sliced: false },
          { x: 180, y: 70, vx: 0, vy: 0, rot: 0, vrot: 0, type: 'emerald', shadow: false, radius: 13, value: 2, sliced: false }
        ];
        fn.pureCuts = 0;
      });

      // Press Spacebar
      await page.keyboard.press('Space');

      let cutsResult = await page.evaluate(() => {
        const fn = window.TruePixelWorlds.forestNinja;
        return {
          flyingCount: fn.flyingCrystals.length,
          pureCuts: fn.pureCuts
        };
      });

      assert.equal(cutsResult.flyingCount, 0, 'Space key should slice all flying crystals in range');
      assert.equal(cutsResult.pureCuts, 2, 'Space key should slice both pure crystals');

      // Reset crystals and test 'KeyC'
      await page.evaluate(() => {
        const W = window.TruePixelWorlds;
        const fn = W.forestNinja;
        fn.flyingCrystals = [
          { x: 140, y: 90, vx: 0, vy: 0, rot: 0, vrot: 0, type: 'citrine', shadow: false, radius: 13, value: 2, sliced: false }
        ];
        fn.pureCuts = 0;
      });

      await page.keyboard.press('KeyC');

      cutsResult = await page.evaluate(() => {
        const fn = window.TruePixelWorlds.forestNinja;
        return {
          flyingCount: fn.flyingCrystals.length,
          pureCuts: fn.pureCuts
        };
      });

      assert.equal(cutsResult.flyingCount, 0, 'KeyC should slice flying crystal in range');
      assert.equal(cutsResult.pureCuts, 1, 'KeyC should increment pureCuts');

      // Reset crystals and test 'Enter'
      await page.evaluate(() => {
        const W = window.TruePixelWorlds;
        const fn = W.forestNinja;
        fn.flyingCrystals = [
          { x: 140, y: 90, vx: 0, vy: 0, rot: 0, vrot: 0, type: 'quartz', shadow: false, radius: 13, value: 1, sliced: false }
        ];
        fn.pureCuts = 0;
      });

      await page.keyboard.press('Enter');

      cutsResult = await page.evaluate(() => {
        const fn = window.TruePixelWorlds.forestNinja;
        return {
          flyingCount: fn.flyingCrystals.length,
          pureCuts: fn.pureCuts
        };
      });

      assert.equal(cutsResult.flyingCount, 0, 'Enter key should slice flying crystal in range');
      assert.equal(cutsResult.pureCuts, 1, 'Enter key should increment pureCuts');
    });

  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (server) {
      server.kill();
      await new Promise(r => setTimeout(r, 200));
    }
  }
});
