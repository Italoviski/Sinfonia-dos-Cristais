import test from 'node:test';
import assert from 'node:assert/strict';

// Import TruePixelEngine to verify rich text parser & justified text engine
let TruePixelEngine;

test.before(async () => {
  // Setup minimal DOM/window mock for node environment
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

test('parseRichTokens parses color tokens and markdown bold into colored words', () => {
  assert.ok(TruePixelEngine, 'TruePixelEngine must be exported');
  assert.equal(typeof TruePixelEngine.parseRichTokens, 'function', 'parseRichTokens must be a function');

  const raw = 'Arraste os {cyan:cristais puros} para **anulá-los** e liberar o {green:caminho}!';
  const tokens = TruePixelEngine.parseRichTokens(raw);

  assert.ok(Array.isArray(tokens), 'tokens must be an array');
  assert.ok(tokens.length >= 8, 'should have tokenized words');

  // Verify cyan tokens
  const cristais = tokens.find(t => t.text === 'cristais');
  assert.ok(cristais, 'cristais word found');
  assert.equal(cristais.color, '#38bdf8');

  // Verify markdown bold (**anulá-los**) mapped to gold/bright accent
  const anular = tokens.find(t => t.text.includes('anulá-los'));
  assert.ok(anular, 'anulá-los word found');
  assert.equal(anular.color, '#fbbf24');

  // Verify green token
  const caminho = tokens.find(t => t.text.includes('caminho'));
  assert.ok(caminho, 'caminho word found');
  assert.equal(caminho.color, '#4ade80');

  // Regular word has default/null color
  const arraste = tokens.find(t => t.text === 'Arraste');
  assert.ok(arraste, 'Arraste found');
  assert.equal(arraste.color, null);
});

test('wrapJustifiedLines breaks lines and distributes justification gaps correctly', () => {
  assert.equal(typeof TruePixelEngine.wrapJustifiedLines, 'function', 'wrapJustifiedLines must be a function');

  const text = 'Arraste os {cyan:cristais} pelo campo até as {green:sombras} para vencer a fase!';
  const maxWidth = 120;
  const lines = TruePixelEngine.wrapJustifiedLines(text, maxWidth);

  assert.ok(Array.isArray(lines), 'returns an array of lines');
  assert.ok(lines.length >= 2, 'wraps into at least 2 lines');

  // Intermediate lines have justify = true and extraSpace >= 0
  const firstLine = lines[0];
  assert.equal(firstLine.justify, true);
  assert.ok(firstLine.words.length > 1);
  assert.ok(firstLine.gapWidth >= 3); // Standard space is 3px or more with justification

  // Last line of paragraph has justify = false (standard spacing)
  const lastLine = lines[lines.length - 1];
  assert.equal(lastLine.justify, false);
});

test('drawJustifiedPixelText executes without errors and renders formatted lines', () => {
  assert.equal(typeof TruePixelEngine.drawJustifiedPixelText, 'function', 'drawJustifiedPixelText must be a function');

  const calls = [];
  const mockCtx = {
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    fillRect: () => calls.push('fillRect'),
    fillText: (txt, x, y) => calls.push({ op: 'fillText', txt, x, y }),
    strokeText: (txt, x, y) => calls.push({ op: 'strokeText', txt, x, y }),
    measureText: (txt) => ({ width: (txt || '').length * 5 })
  };

  const height = TruePixelEngine.drawJustifiedPixelText(
    mockCtx,
    'A {gold:Opala} subtrai 1 bolinha por vez ao se aproximar.',
    20,
    30,
    140,
    12,
    '#ffea31',
    '#000000'
  );

  assert.ok(height > 0, 'height should be positive');
  assert.ok(calls.some(c => c.op === 'fillText'), 'should render text via fillText');
});

test('ALL StandardTutorialCards contain dynamic color keywords and parse without error', () => {
  const cardsObj = TruePixelEngine.StandardTutorialCards;
  assert.ok(cardsObj, 'StandardTutorialCards must exist');

  const keys = Object.keys(cardsObj);
  assert.ok(keys.length >= 10, 'Should have tutorial sets for all mechanics');

  let totalCardsCount = 0;
  for (const key of keys) {
    const list = cardsObj[key];
    assert.ok(Array.isArray(list), `Tutorial ${key} must be an array of cards`);
    assert.ok(list.length > 0, `Tutorial ${key} must have at least 1 card`);

    for (let i = 0; i < list.length; i++) {
      const card = list[i];
      totalCardsCount++;
      assert.ok(card.title && card.title.length > 0, `${key}[${i}] must have a title`);
      assert.ok(card.body && card.body.length > 0, `${key}[${i}] must have a body`);

      // Verify dynamic keywords present
      const hasKeywords = /\{[a-zA-Z0-9_#]+:[^}]+\}|\*\*[^*]+\*\*/.test(card.body);
      assert.ok(hasKeywords, `${key}[${i}] must contain highlighted keywords for dynamic reading`);

      // Test parsing
      const tokens = TruePixelEngine.parseRichTokens(card.body);
      assert.ok(tokens.length > 0, `${key}[${i}] parsed tokens must not be empty`);
      const coloredTokens = tokens.filter(t => t.color !== null);
      assert.ok(coloredTokens.length > 0, `${key}[${i}] must have at least one colored token`);

      // Test wrapping
      const lines = TruePixelEngine.wrapJustifiedLines(card.body, 248);
      assert.ok(lines.length > 0, `${key}[${i}] must wrap cleanly`);
    }
  }

  assert.ok(totalCardsCount >= 18, `Expected at least 18 total tutorial cards, got ${totalCardsCount}`);
});
