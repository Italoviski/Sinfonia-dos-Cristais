import test from 'node:test';
import assert from 'node:assert/strict';

let TruePixelEngine;

test.before(async () => {
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = {
      innerWidth: 1280,
      innerHeight: 720,
      addEventListener: () => {},
      removeEventListener: () => {}
    };
  }
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      createElement: (tag) => {
        if (tag === 'canvas') {
          return {
            width: 320,
            height: 180,
            getContext: () => ({
              save: () => {},
              restore: () => {},
              fillRect: () => {},
              strokeRect: () => {},
              fillText: () => {},
              strokeText: () => {},
              beginPath: () => {},
              moveTo: () => {},
              lineTo: () => {},
              stroke: () => {},
              measureText: (txt) => ({ width: (txt || '').length * 5 })
            })
          };
        }
        return { style: {} };
      },
      getElementById: () => null
    };
  }

  await import('../js/true-pixel-engine.js');
  TruePixelEngine = globalThis.TruePixelEngine || globalThis.window?.TruePixelEngine;
});

test('TutorialModal calculates pedagogical reading duration based on word count', () => {
  const Modal = TruePixelEngine.TutorialModal;
  assert.ok(Modal, 'TutorialModal must exist');
  assert.equal(typeof Modal.calculatePageDuration, 'function', 'calculatePageDuration must be a function');

  // Short card (~8 words): should clamp around 3.0s minimum
  const shortCard = { title: 'Curto', body: 'Arraste os cristais para anular a sombra!' };
  const shortDur = Modal.calculatePageDuration(shortCard);
  assert.ok(shortDur >= 3.0, `Short duration should be >= 3.0s, got ${shortDur}`);
  assert.ok(shortDur <= 3.8, `Short duration should not be too long, got ${shortDur}`);

  // Medium/long card (~25 words): should scale nicely between 4.0s and 5.0s
  const longCard = {
    title: 'Longo',
    body: 'Observe o cristal de referência por 1 segundo e acompanhe os 5 cristais flutuando na melodia. Depois, toque-os na ordem exata para harmonizar o rio sagrado!'
  };
  const longDur = Modal.calculatePageDuration(longCard);
  assert.ok(longDur >= 4.0, `Long duration should be >= 4.0s, got ${longDur}`);
  assert.ok(longDur <= 5.2, `Long duration should not exceed 5.2s, got ${longDur}`);
});

test('TutorialModal locks advance button during reading timer and unlocks when complete', () => {
  const Modal = TruePixelEngine.TutorialModal;
  const HUD = TruePixelEngine.GameHUD;
  HUD.godMode = false;

  Modal.open([
    { id: 't1', title: 'Página 1', body: 'Texto um para leitura com várias palavras.' },
    { id: 't2', title: 'Página 2', body: 'Texto dois para conclusão da fase.' }
  ]);

  assert.equal(Modal.isOpen, true);
  assert.equal(Modal.currentIndex, 0);

  // Initially, elapsed time is 0 and page is locked
  assert.equal(Modal.isPageLocked(), true, 'Page must be locked at start');

  // Attempting to click button or advance while locked must be blocked
  const btn = Modal.btnRect;
  const clicked = Modal.handleClick(btn.x + 5, btn.y + 5);
  assert.equal(clicked, false, 'Click must be rejected while page is locked');
  assert.equal(Modal.currentIndex, 0, 'Must remain on page 1');

  // Advance time past pageDuration
  Modal.pageElapsed = Modal.pageDuration + 0.1;
  assert.equal(Modal.isPageLocked(), false, 'Page must be unlocked after duration elapsed');

  // Now click is accepted and advances to page 2
  const advanced = Modal.handleClick(btn.x + 5, btn.y + 5);
  assert.equal(advanced, true, 'Click must be accepted when unlocked');
  assert.equal(Modal.currentIndex, 1, 'Must have advanced to page 2');

  // Page 2 timer is reset and locked again
  assert.equal(Modal.isPageLocked(), true, 'New page must start locked');

  Modal.close();
});

test('TutorialModal allows instant advance when God Mode is active', () => {
  const Modal = TruePixelEngine.TutorialModal;
  const HUD = TruePixelEngine.GameHUD;
  HUD.godMode = true;

  Modal.open([
    { id: 'gm1', title: 'God Mode Test', body: 'Texto de teste com God Mode ativo.' }
  ]);

  // Under God Mode, isPageLocked returns false immediately
  assert.equal(Modal.isPageLocked(), false, 'Page must NOT be locked when God Mode is active');

  const btn = Modal.btnRect;
  const clicked = Modal.handleClick(btn.x + 5, btn.y + 5);
  assert.equal(clicked, true, 'God Mode allows immediate click');
  assert.equal(Modal.isOpen, false, 'Modal should close after single card finished');

  HUD.godMode = false;
});
