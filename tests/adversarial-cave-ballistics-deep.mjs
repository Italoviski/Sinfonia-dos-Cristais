import assert from 'node:assert/strict';

function setupNodeDOM() {
  globalThis.window = globalThis;
  globalThis.requestAnimationFrame = (fn) => 1;
  globalThis.cancelAnimationFrame = (id) => {};
  if (!globalThis.ImageData) {
    globalThis.ImageData = class ImageData { constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); } };
  }
  if (!globalThis.Image) {
    globalThis.Image = class Image { constructor() { this._src = ''; setTimeout(() => this.onload?.(), 2); } get src() { return this._src; } set src(v) { this._src = v; } };
  }
  if (!globalThis.Audio) {
    globalThis.Audio = class Audio { constructor() { this._src = ''; this.paused = true; this.currentTime = 0; this.volume = 1; this.muted = false; } load() {} play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } addEventListener(evt, fn) { if (evt === 'canplaythrough') setTimeout(fn, 2); } removeEventListener() {} };
  }
  if (!globalThis.document) {
    const mockContext = () => ({
      save: () => {}, restore: () => {}, clip: () => {}, translate: () => {}, scale: () => {},
      fillRect: () => {}, strokeRect: () => {}, drawImage: () => {}, clearRect: () => {},
      setTransform: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {},
      arc: () => {}, fill: () => {}, stroke: () => {}, closePath: () => {}, rect: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createImageData: (w, h) => new globalThis.ImageData(w, h),
      getImageData: (x, y, w, h) => new globalThis.ImageData(w, h),
      putImageData: () => {}, fillText: () => {}, measureText: () => ({ width: 40 })
    });
    const mockElement = (tag) => ({
      tagName: tag.toUpperCase(), style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => false, contains: () => false },
      setAttribute: () => {}, getAttribute: () => null, appendChild: (c) => c, append: () => {}, remove: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, getContext: () => mockContext(),
      toDataURL: () => 'data:image/png;base64,AA==', getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 360 })
    });
    globalThis.document = {
      createElement: mockElement, getElementById: (id) => mockElement('div'),
      querySelector: () => null, querySelectorAll: () => [], body: mockElement('body'),
      addEventListener: () => {}, removeEventListener: () => {}, readyState: 'complete'
    };
    globalThis.document.body.dataset = {};
  }
}

async function runEmpiricalStressTest() {
  setupNodeDOM();
  await import('../js/true-pixel-engine.js');
  await import('../js/true-pixel-cave.js');

  const K = globalThis.CaveRhythmKaraoke;
  K.initLayouts();

  console.log('=== EMPIRICAL STRESS TEST SUITE ===\n');

  console.log('--- PHRASE TIMETABLE & METADATA ---');
  for (let pi = 0; pi < K.phrases.length; pi++) {
    const p = K.phrases[pi];
    if (!p.words || p.words.length === 0) {
      console.log(`P${pi}: [${p.t0} .. ${p.t1}] BANNER: "${p.banner}"`);
    } else {
      const w0 = p.words[0];
      const wLast = p.words[p.words.length - 1];
      const wLastEnd = wLast.t + (wLast.isHold ? (wLast.holdDur || wLast.dur) : wLast.dur);
      console.log(`P${pi}: [${p.t0} .. ${p.t1}] ${p.words.length} words, range [${w0.t} .. ${wLastEnd.toFixed(2)}] (w0: "${w0.text}" @ ${w0.t}, wLast: "${wLast.text}" @ ${wLast.t})`);
    }
  }
  console.log('------------------------------------\n');

  // -------------------------------------------------------------
  // TEST 1: Arc Height Monotonicity
  // -------------------------------------------------------------
  console.log('--- TEST 1: Arc Height Monotonicity [0.1s .. 2.0s step 0.05s] ---');
  let monotonicityFailed = false;
  let prevH = -1;
  const arcTable = [];
  for (let dt = 0.10; dt <= 2.0001; dt += 0.05) {
    const rDt = Math.round(dt * 100) / 100;
    const arc = K.computeJumpArc(rDt);
    arcTable.push({ dt: rDt, H: arc.height });
    if (arc.height < prevH) {
      console.error(`  FAIL: Monotonicity violation at dt=${rDt}: H=${arc.height} < prevH=${prevH}`);
      monotonicityFailed = true;
    }
    prevH = arc.height;
  }
  const minH = arcTable[0].H;
  const maxH = arcTable[arcTable.length - 1].H;
  console.log(`  Min H(0.1s)=${minH}px, Max H(2.0s)=${maxH}px. Monotonicity: ${monotonicityFailed ? 'FAIL' : 'PASS'}`);

  // -------------------------------------------------------------
  // TEST 2: Landing Precision at t = W_{k+1}.t
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Landing Precision at t = W_{k+1}.t ---');
  const landingErrors = [];
  for (let pi = 0; pi < K.phrases.length; pi++) {
    const p = K.phrases[pi];
    if (!p.words || p.words.length === 0) continue;
    for (let wi = 0; wi < p.words.length; wi++) {
      const w = p.words[wi];
      const targetX = w.isHold ? Math.round(w.x + 3) : w.midX;
      const pos = K.getBallPosition(w.t);
      const activePhraseAtT = K.getCurrentPhrase(w.t);
      if (pos.x !== targetX) {
        landingErrors.push({
          phraseIndex: pi,
          phraseT0: p.t0,
          phraseT1: p.t1,
          wordIndex: wi,
          text: w.text,
          t: w.t,
          targetX,
          actualX: pos.x,
          diff: Math.abs(pos.x - targetX),
          activePhraseFound: activePhraseAtT ? K.phrases.indexOf(activePhraseAtT) : null
        });
      }
    }
  }

  // Also check practice phrase
  const pp = K.practicePhrase;
  for (let wi = 0; wi < pp.words.length; wi++) {
    const w = pp.words[wi];
    const targetX = w.isHold ? Math.round(w.x + 3) : w.midX;
    const pos = K.getBallPosition(w.t, true);
    if (pos.x !== targetX) {
      landingErrors.push({
        phraseIndex: 'PRACTICE',
        phraseT0: pp.t0,
        phraseT1: pp.t1,
        wordIndex: wi,
        text: w.text,
        t: w.t,
        targetX,
        actualX: pos.x,
        diff: Math.abs(pos.x - targetX)
      });
    }
  }

  console.log(`  Total landing errors found: ${landingErrors.length}`);
  for (const err of landingErrors) {
    console.log(`  [Landing Error] P${err.phraseIndex} W${err.wordIndex} "${err.text}" @ t=${err.t}s: expected x=${err.targetX}, got x=${err.actualX} (diff: ${err.diff}px) [activePhrase found at t: P${err.activePhraseFound}, phrase bounds: ${err.phraseT0}..${err.phraseT1}]`);
  }

  // -------------------------------------------------------------
  // TEST 3: Continuity at 60 FPS (Zero Teleportation) within phrases
  // dx <= 6.0px and dy <= 4.5px per 16ms
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: 60 FPS Continuity (Zero Teleportation) within phrases ---');
  const dtStep = 0.016;
  const continuityViolations = [];

  for (let pi = 0; pi < K.phrases.length; pi++) {
    const p = K.phrases[pi];
    if (!p.words || p.words.length === 0) continue;

    for (let t = p.t0; t + dtStep <= p.t1; t += dtStep) {
      const pA = K.getCurrentPhrase(t);
      const pB = K.getCurrentPhrase(t + dtStep);
      if (pA === p && pB === p) {
        const posA = K.getBallPosition(t);
        const posB = K.getBallPosition(t + dtStep);
        const dx = Math.abs(posB.x - posA.x);
        const dy = Math.abs(posB.y - posA.y);
        if (dx > 6.0 || dy > 4.5) {
          continuityViolations.push({
            phraseIndex: pi,
            tA: Number(t.toFixed(4)),
            tB: Number((t + dtStep).toFixed(4)),
            dx: Number(dx.toFixed(2)),
            dy: Number(dy.toFixed(2)),
            posA,
            posB
          });
        }
      }
    }
  }

  console.log(`  Total continuity violations (dx > 6.0 or dy > 4.5) found: ${continuityViolations.length}`);
  for (const v of continuityViolations) {
    console.log(`  [Continuity Violation] P${v.phraseIndex} t=[${v.tA} -> ${v.tB}] dx=${v.dx} dy=${v.dy} from (${v.posA.x},${v.posA.y}) to (${v.posB.x},${v.posB.y})`);
  }

  // -------------------------------------------------------------
  // TEST 4: Timing Structure Audit of KARAOKE_PHRASES
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Timing Structure Audit of KARAOKE_PHRASES ---');
  const phraseAnomalies = [];
  for (let pi = 0; pi < K.phrases.length; pi++) {
    const p = K.phrases[pi];
    if (!p.words || p.words.length === 0) continue;
    const w0 = p.words[0];
    const wLast = p.words[p.words.length - 1];
    const lastWordEnd = wLast.t + (wLast.isHold ? (wLast.holdDur || wLast.dur) : wLast.dur);

    // Check if first word starts before phrase t0
    if (w0.t < p.t0) {
      phraseAnomalies.push({
        phraseIndex: pi,
        issue: `First word "${w0.text}" starts at t=${w0.t}s BEFORE phrase t0=${p.t0}s (diff: ${(p.t0 - w0.t).toFixed(2)}s)`
      });
    }

    // Check if next phrase overlaps with current phrase
    if (pi < K.phrases.length - 1) {
      const nextP = K.phrases[pi + 1];
      if (p.t1 > nextP.t0) {
        phraseAnomalies.push({
          phraseIndex: pi,
          issue: `Phrase ${pi} t1=${p.t1}s OVERLAPS with Phrase ${pi + 1} t0=${nextP.t0}s (overlap: ${(p.t1 - nextP.t0).toFixed(2)}s)`
        });
      }
    }

    // Check intra-phrase words for overlap (especially holdDur)
    for (let wi = 0; wi < p.words.length - 1; wi++) {
      const wCur = p.words[wi];
      const wNext = p.words[wi + 1];
      const curEnd = wCur.t + (wCur.isHold ? (wCur.holdDur || wCur.dur) : wCur.dur);
      if (curEnd > wNext.t) {
        phraseAnomalies.push({
          phraseIndex: pi,
          issue: `Word ${wi} "${wCur.text}" end (t=${curEnd.toFixed(2)}s) OVERLAPS with Word ${wi + 1} "${wNext.text}" start (t=${wNext.t}s) in P${pi}`
        });
      }
    }
  }

  console.log(`  Total phrase structure anomalies found: ${phraseAnomalies.length}`);
  for (const a of phraseAnomalies) {
    console.log(`  [Phrase Anomaly] P${a.phraseIndex}: ${a.issue}`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Test 1 (Monotonicity): ${monotonicityFailed ? 'FAIL' : 'PASS'}`);
  console.log(`Test 2 (Landing Precision): ${landingErrors.length === 0 ? 'PASS' : 'FAIL (' + landingErrors.length + ' errors)'}`);
  console.log(`Test 3 (60 FPS Continuity): ${continuityViolations.length === 0 ? 'PASS' : 'FAIL (' + continuityViolations.length + ' violations)'}`);
  console.log(`Test 4 (Structure Anomalies): ${phraseAnomalies.length === 0 ? 'PASS' : 'FAIL (' + phraseAnomalies.length + ' anomalies)'}`);
}

runEmpiricalStressTest().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
