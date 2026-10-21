(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduced = () => document.body.classList.contains('reduce-motion');

  const W = 320, H = 180;
  const R = Math.round, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

  function fromMap(rows, map) {
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const col = map[rows[j][i]];
        if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
      }
    }
    return c;
  }

  // True Pixel Art Sprites for the Intro Cutscene Demonstration
  const Q_ROWS = [
    '.....o.....',
    '....oLo....',
    '...oLWLo...',
    '..oLWLMLo..',
    '..oLWLMMo..',
    '.oLLWLMMDo.',
    '.oLLWLMMDo.',
    '.oLLWLMMDo.',
    '.oLLWLMMDo.',
    '.oLLWLMMDo.',
    '.oLLWLMMDo.',
    '..oLWLMMo..',
    '..oLLLMDo..',
    '...oLMDo...',
    '....ooo....'
  ];
  const Q_LIGHT = fromMap(Q_ROWS, { o: '#1a1240', W: '#ffffff', L: '#9ef0ff', M: '#3fc6f0', D: '#1d70a8' });
  const Q_SHADOW = fromMap(Q_ROWS, { o: '#9b5cff', W: '#5c4c7a', L: '#42365c', M: '#2c2342', D: '#1a1428' });
  const Q_OPAL = fromMap(Q_ROWS, { o: '#3a1408', W: '#ffffd0', L: '#ffd84a', M: '#ff781e', D: '#b82e14' });
  const Q_FLASH = fromMap(Q_ROWS, { o: '#ffffff', W: '#ffffff', L: '#ffffff', M: '#ffffff', D: '#ffffff' });

  const FAIRY_SILHOUETTE = fromMap([
    '..oo....oo..',
    '.oBBo..oBBo.',
    'oBBWBoBWBBo.',
    'oBWWBBBBWWBo',
    '.oBWWssWWBo.',
    '..oBBssBBo..',
    '..oBssssBo..',
    '...osssso...',
    '....osso....',
    '...osssso...',
    '..ossBBsso..',
    '...s.ss.s...'
  ], { o: '#1f387a', B: '#4ac8ff', W: '#c8fbff', s: '#12204e' });

  const FAIRY_BUTTERFLY_SPR = fromMap([
    '............oBo............',
    '...........oBCBo...........',
    '..........oBCWCBo..........',
    '.oGGGGGo..oBCWCBo..oGGGGGo.',
    'oGWWWWWGo..oBCBGo.oGWWWWWGo',
    'oGWCCCCWGo..oGo..oGWCCCCWGo',
    'oGWCBBBCWGo.oGo.oGWCBBBCWGo',
    '.oGWCBPMCWGoHYHoGWCMBCWGo..',
    '..oGWCMPMCGHYWYHGCMPCWGo...',
    '...oGGCMPMGHYWYHGMPCGGo....',
    '....ooGGPPGHYWYHGPPGGoo....',
    '...oGWCBBBGHYWYHGBBBCWGo...',
    '..oGWCCCCWGGHYHGGWCCCCWGo..',
    '..oGWWBCWGo.oGo.oGWCBWWGo..',
    '...oGCCCGo..oBo..oGCCCGo...',
    '....oGGGo..oBCBo..oGGGo....',
    '...........oBWBBo..........',
    '...........oBCBo...........',
    '............oBo............'
  ], {
    o: '#6f3b10', G: '#e59a28', H: '#ffe066', Y: '#ffae22',
    W: '#ffffff', C: '#9ef0ff', B: '#3fc6f0', P: '#ff72e0', M: '#c77dff'
  });

  const CUTSCENE_BEATS = [
    {
      t0: 0.0, t1: 2.3,
      badge: '1/5 · O Chamado na Escuridão',
      speaker: 'Sussurro Misterioso',
      whisper: '“...Você consegue ouvir?... Desperte na caverna silenciosa...”',
      sub: 'A Porta Ancestral adormeceu e a natureza perdeu sua canção.'
    },
    {
      t0: 2.3, t1: 4.8,
      badge: '2/5 · A Voz no Cristal do Teto',
      speaker: 'Sussurro Misterioso',
      whisper: '“...Estou presa no cristal do alto... Siga minha voz para me libertar!...”',
      sub: 'Recupere a ressonância dos cristais para abrir o caminho.'
    },
    {
      t0: 4.8, t1: 7.7,
      badge: '3/5 · Arrastar: Somar e Subtrair',
      speaker: 'Sussurro dos Cristais',
      whisper: '“...Arraste um Quartzo sobre outro para somar brilhos... use a Opala de Fogo para subtrair!...”',
      sub: 'Os pontos de luz mostram a energia exata de cada cristal.'
    },
    {
      t0: 7.7, t1: 10.2,
      badge: '4/5 · Clicar: Equações e Anulação',
      speaker: 'Sussurro dos Cristais',
      whisper: '“...Toque para conectar cristais em equações... e una a luz à sombra igual para anular!...”',
      sub: 'Mesma quantidade, mesmo tipo e mesma ordem anulam a escuridão!'
    },
    {
      t0: 10.2, t1: 11.4,
      badge: '5/5 · O Despertar da Jornada',
      speaker: 'Sussurro da Fada',
      whisper: '“...Ouça os ecos... Sua jornada começa agora!...”',
      sub: 'Prepare os cristais e restaure o primeiro brilho da caverna.'
    }
  ];

  let entering = false;
  window.CrystalEntrance = {
    get active() { return entering; },
    async play(reveal, ready) {
      if (entering) return;
      entering = true;
      const main = document.querySelector('main');
      main.inert = true;

      const overlay = document.createElement('div');
      overlay.id = 'entryCinema';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-label', 'Cutscene de introdução: O chamado dos sussurros na caverna');
      overlay.innerHTML = `
        <canvas class="entry-pixel-canvas" width="${W}" height="${H}" aria-hidden="true"></canvas>
        <div class="entry-whisper-stage" aria-live="polite">
          <span class="entry-beat-badge" id="entryBeatBadge">1/5 · O Chamado</span>
          <div class="entry-whisper-speaker" id="entryWhisperSpeaker">Sussurro Misterioso</div>
          <p class="entry-whisper-line" id="entryWhisperLine"></p>
          <p class="entry-whisper-sub" id="entryWhisperSub"></p>
        </div>
        <div class="entry-controls">
          <div class="entry-progress-track" aria-hidden="true"><i id="entryProgressFill"></i></div>
          <button type="button" class="entry-skip-btn">Pular Cutscene ⏭</button>
        </div>
      `;
      document.body.append(overlay);

      const cv = overlay.querySelector('.entry-pixel-canvas');
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const badgeEl = overlay.querySelector('#entryBeatBadge');
      const speakerEl = overlay.querySelector('#entryWhisperSpeaker');
      const lineEl = overlay.querySelector('#entryWhisperLine');
      const subEl = overlay.querySelector('#entryWhisperSub');
      const fillEl = overlay.querySelector('#entryProgressFill');
      const skipBtn = overlay.querySelector('.entry-skip-btn');

      let skipped = false, shown = false, rafId = 0, currentBeatIdx = -1;
      const show = () => { if (!shown) { shown = true; reveal(); } };

      function renderTremblingWhisper(text, sub, badge, speaker) {
        badgeEl.textContent = badge;
        speakerEl.textContent = speaker;
        subEl.textContent = sub;
        lineEl.replaceChildren();
        [...text].forEach((ch, i) => {
          const s = document.createElement('span');
          s.className = 'whisper-char';
          s.textContent = ch === ' ' ? '\u00A0' : ch;
          s.style.setProperty('--char-idx', String(i));
          lineEl.append(s);
        });
      }

      const onKeySkip = e => {
        if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          skipped = true;
        }
      };
      window.addEventListener('keydown', onKeySkip);
      skipBtn.focus();
      skipBtn.onclick = () => { skipped = true; };

      const P1 = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(R(x), R(y), 1, 1); };
      const pip = (x, y, core, arm) => {
        x = R(x); y = R(y);
        ctx.fillStyle = arm;
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
        P1(x, y, core);
      };
      const star = (cx, cy, s, core, tip) => {
        if (s <= 0) return;
        cx = R(cx); cy = R(cy);
        ctx.fillStyle = tip;
        ctx.fillRect(cx - s, cy, 2 * s + 1, 1);
        ctx.fillRect(cx, cy - s, 1, 2 * s + 1);
        const inn = Math.floor(s * 0.55);
        ctx.fillStyle = core;
        ctx.fillRect(cx - inn, cy, 2 * inn + 1, 1);
        ctx.fillRect(cx, cy - inn, 1, 2 * inn + 1);
      };
      const ring = (cx, cy, r, col) => {
        if (r <= 0) return;
        cx = R(cx); cy = R(cy); r = R(r);
        ctx.fillStyle = col;
        let x = r, y = 0, e = 1 - r;
        while (x >= y) {
          ctx.fillRect(cx + x, cy + y, 1, 1); ctx.fillRect(cx + y, cy + x, 1, 1);
          ctx.fillRect(cx - y, cy + x, 1, 1); ctx.fillRect(cx - x, cy + y, 1, 1);
          ctx.fillRect(cx - x, cy - y, 1, 1); ctx.fillRect(cx - y, cy - x, 1, 1);
          ctx.fillRect(cx + y, cy - x, 1, 1); ctx.fillRect(cx + x, cy - y, 1, 1);
          y++;
          if (e < 0) e += 2 * y + 1;
          else { x--; e += 2 * (y - x) + 1; }
        }
      };

      function drawGemWithPips(spr, cx, cy, count, isShadow) {
        const sx = R(cx) - 5, sy = R(cy) - 7;
        ctx.drawImage(spr, sx, sy);
        const arm = isShadow ? '#d9a0ff' : '#9ef0ff';
        const core = isShadow ? '#f5dcff' : '#ffffff';
        const offsets = count === 1 ? [[0, 7]] : count === 2 ? [[0, 4], [0, 9]] : [[-2, 4], [2, 7], [-1, 10]];
        for (const [dx, dy] of offsets) pip(sx + 5 + dx, sy + dy, core, arm);
      }

      function drawCutsceneFrame(t) {
        const f12 = Math.floor(t * 12);
        const f8 = Math.floor(t * 8);

        // 1. Deep Cavern Bands with Bayer 4x4 Dithering
        const bands = ['#07051a', '#0c0a28', '#13103a', '#1b174e'];
        for (let y = 0; y < H; y += 2) {
          const b = Math.min(3, Math.floor((y / H) * 4));
          ctx.fillStyle = bands[b];
          ctx.fillRect(0, y, W, 2);
        }

        // 2. Monumental Gothic-Botanical Ancient Door in Background (x=114..206, y=22..130)
        const doorGlow = t >= 10.0 ? '#4d74e6' : '#3048a8';
        const doorMid = t >= 10.0 ? '#2b409e' : '#1e2c74';
        const doorBody = t >= 10.0 ? '#1d2b7a' : '#151c54';
        const goldCol = (f12 % 4 === 0 || t >= 10.0) ? '#ffd35a' : '#d88b28';
        for (let y = 22; y < 130; y++) {
          const hw = y < 68 ? R(46 * Math.pow((y - 22) / 46, 0.58)) : 46;
          const ihw = y < 74 ? R(34 * Math.pow(Math.max(0, y - 34) / 40, 0.6)) : 34;
          for (let dx = -hw; dx <= hw; dx++) {
            const x = 160 + dx, adx = Math.abs(dx);
            if (adx > ihw || y < 34) {
              const leaf = ((dx + y) % 7 === 0) && adx > ihw + 2 && adx < hw - 2;
              P1(x, y, adx >= hw - 1 ? '#08061c' : adx >= hw - 3 ? (dx < 0 ? doorGlow : doorMid) : leaf ? doorGlow : doorMid);
            } else {
              P1(x, y, adx === 0 ? '#08061c' : adx === 1 ? doorMid : doorBody);
            }
          }
        }
        // Twin Sculpted Columns, Pedestals & Glowing Ledge Crystals
        for (const s of [-1, 1]) {
          const cx = 160 + s * 40;
          ctx.fillStyle = doorMid;
          ctx.fillRect(cx - 7, 68, 14, 62);
          ctx.fillStyle = doorGlow;
          ctx.fillRect(cx - 8, 66, 16, 4);
          ctx.fillRect(cx - 8, 96, 16, 4);
          ctx.fillRect(cx - 9, 124, 18, 6);
          // Column ledge crystal
          ctx.fillStyle = '#3fc6f0';
          ctx.fillRect(cx - 2, 91, 4, 5);
          P1(cx, 90, '#ffffff');
        }
        // Grand Butterfly Fairy Gem Emblem at Top Center (160, 56) + 3 Golden Filigree Wreaths
        ctx.drawImage(FAIRY_BUTTERFLY_SPR, 160 - 13, 56 - 9);
        if ((f12 & 1) === 0) star(160, 56, 2, '#ffffff', '#ffe066');
        for (const [sx, sy, r] of [[144, 83, 7], [176, 83, 7], [160, 102, 7]]) {
          ring(sx, sy, r, goldCol);
          ring(sx, sy, r - 1, '#9c5a18');
        }
        // Peripheral Cyan & Magenta Cavern Crystals Framing the Sanctuary
        for (const [cx, cy, h, c1, c2] of [
          [22, 130, 26, '#9ef0ff', '#2590c8'], [36, 132, 18, '#ff9cf5', '#b02898'],
          [284, 132, 20, '#9ef0ff', '#2590c8'], [298, 130, 28, '#ff9cf5', '#b02898']
        ]) {
          for (let dy = 0; dy < h; dy++) {
            const hw = Math.max(1, R(5 * (1 - dy / h)));
            ctx.fillStyle = c2;
            ctx.fillRect(cx - hw, cy - dy, hw * 2, 1);
            P1(cx - hw, cy - dy, c1);
          }
        }
        // Cavern Stone Floor & Subterranean Water
        ctx.fillStyle = '#26225a';
        ctx.fillRect(0, 142, W, 4);
        ctx.fillStyle = '#16133a';
        ctx.fillRect(0, 146, W, 14);
        ctx.fillStyle = '#0a0c2a';
        ctx.fillRect(0, 160, W, 20);
        for (let k = 0; k < 20; k++) {
          const wx = (k * 19 + f8 * ((k % 2) + 1)) % W;
          const wy = 163 + (k * 5) % 15;
          ctx.fillStyle = k % 3 === 0 ? '#9b6cff' : '#3fc6f0';
          ctx.fillRect(wx, wy, 3, 1);
        }

        // 3. Ceiling Stalactites & The Fairy's Crystal Prison at Top Right-Center (x=236, y=14..54)
        for (let x = 0; x < W; x += 14) {
          const len = (x > 115 && x < 205) ? 8 : 16 + ((x * 7) % 14);
          for (let y = 0; y < len; y++) {
            const hw = Math.max(0, R(4 * (1 - y / len)));
            ctx.fillStyle = '#1e1a4a';
            ctx.fillRect(x - hw, y, hw * 2 + 1, 1);
          }
        }
        // Fairy's Ceiling Crystal Prison
        const px = 242, py = 28;
        for (let dy = -18; dy <= 20; dy++) {
          const hw = dy < 0 ? R(11 * (1 + dy / 18)) : R(11 * (1 - dy / 22));
          ctx.fillStyle = dy < 0 ? '#3fc6f0' : '#1d70a8';
          ctx.fillRect(px - hw, py + dy, hw * 2 + 1, 1);
          P1(px - hw, py + dy, '#c8fbff');
        }
        ctx.drawImage(FAIRY_SILHOUETTE, px - 6, py - 6 + (f8 % 2));
        // Whisper voice rings radiating from the trapped Fairy
        const wr = (f12 * 2) % 28;
        ring(px, py, 8 + wr, wr < 14 ? '#9ef0ff' : '#7b3fd0');
        if (t >= 2.3 && t < 5.0) {
          ring(px, py, 4 + ((f12 * 2 + 14) % 28), '#c7a6ff');
        }

        // 4. Live Visual Demonstration of Mechanics (Beats 3 & 4)
        const bob = [0, -1, 0, 1][f12 % 4];
        if (t >= 4.8 && t < 7.7) {
          const lt = t - 4.8;
          if (lt < 1.3) {
            // Two Quartzos (1 and 2) sliding toward each other to fuse into 3
            const p = clamp(lt / 1.1, 0, 1);
            const x1 = 54 + p * 22, x2 = 104 - p * 22;
            drawGemWithPips(Q_LIGHT, x1, 96 + bob, 1, false);
            drawGemWithPips(Q_LIGHT, x2, 96 + bob, 2, false);
            // Motion trail pixels
            if (p < 0.95) {
              P1(x1 - 8, 96, '#9ef0ff');
              P1(x2 + 8, 96, '#9ef0ff');
            }
          } else if (lt < 1.5) {
            // Flash of fusion
            ctx.drawImage(Q_FLASH, 79 - 5, 96 - 7);
            ring(79, 96, 10, '#ffffff');
            star(79, 96, 6, '#ffffff', '#9ef0ff');
          } else {
            // Fused Quartz (3) met by Fire Opal (1) subtracting 1 -> Quartz (2)
            const st = lt - 1.5;
            if (st < 0.9) {
              const p = clamp(st / 0.85, 0, 1);
              drawGemWithPips(Q_LIGHT, 74, 96 + bob, 3, false);
              drawGemWithPips(Q_OPAL, 122 - p * 44, 96 - bob, 1, false);
            } else {
              if (st < 1.08) {
                ring(74, 96, 11, '#ffa23c');
                star(74, 96, 5, '#ffffff', '#ffd84a');
              }
              drawGemWithPips(Q_LIGHT, 74, 96 + bob, 2, false);
            }
          }
        } else if (t >= 7.7 && t < 10.4) {
          // Beat 4: Connecting Crystalline Equation [2, 1] and annulling Shadow Equation [2, 1]
          const lt = t - 7.7;
          const approach = clamp((lt - 0.5) / 1.0, 0, 1);
          const ly = 112 - approach * 22;
          const sy = 68;
          if (lt < 1.65) {
            // Purple oscillating pixel wave line connecting [2] and [1]
            for (let x = 58; x <= 92; x++) {
              const wy = ((x + f12) % 4 < 2) ? 0 : 1;
              P1(x, ly + wy, (x + f12) % 2 ? '#f0e0ff' : '#9b6cff');
              P1(x, sy - wy, (x + f12) % 2 ? '#b070ff' : '#5a2ca0');
            }
            drawGemWithPips(Q_SHADOW, 56, sy - bob, 2, true);
            drawGemWithPips(Q_SHADOW, 94, sy - bob, 1, true);
            drawGemWithPips(Q_LIGHT, 56, ly + bob, 2, false);
            drawGemWithPips(Q_LIGHT, 94, ly + bob, 1, false);
            if (lt > 1.2) {
              // Vertical resonance beams
              for (let y = sy + 8; y < ly - 8; y += 2) {
                P1(56, y, '#ffffff');
                P1(94, y, '#c7a6ff');
              }
            }
          } else {
            // Sequential pixel shatter & expanding rings!
            const st = lt - 1.65;
            const g1 = Math.floor(st * 12);
            const g2 = Math.floor((st - 0.25) * 12);
            if (g1 >= 0 && g1 < 8) {
              ring(56, 78, 4 + g1 * 3, '#9ef0ff');
              star(56, 78, Math.max(1, 6 - g1), '#ffffff', '#9ef0ff');
            }
            if (g2 >= 0 && g2 < 8) {
              ring(94, 78, 4 + g2 * 3, '#ffc6f2');
              star(94, 78, Math.max(1, 6 - g2), '#ffffff', '#b070ff');
            }
          }
        }

        // 5. Floating Trembling Whisper Motes in the Cavern Air
        for (let i = 0; i < 18; i++) {
          const mx = (i * 23 + R(Math.sin(t + i) * 6)) % W;
          const my = (i * 17 + R(t * 10)) % 140;
          P1(mx, my, i % 3 === 0 ? '#c7a6ff' : '#9ef0ff');
        }

        // 6. Bayer 4x4 Dither Aperture at Start (0..0.5s) and End (10.5..11.4s)
        let fadeLvl = 0;
        if (t < 0.45) fadeLvl = 1 - t / 0.45;
        else if (t > 10.5) fadeLvl = clamp((t - 10.5) / 0.9, 0, 1);
        if (fadeLvl > 0) {
          const thr = R(fadeLvl * 16);
          ctx.fillStyle = '#04020e';
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              if (bay(x, y) < thr) ctx.fillRect(x, y, 1, 1);
            }
          }
        }
      }

      try {
        const totalDuration = reduced() ? 0.35 : 11.4;
        const startAt = performance.now();
        await new Promise(resolveCutscene => {
          function step(now) {
            const elapsed = (now - startAt) / 1000;
            if (skipped || elapsed >= totalDuration) {
              resolveCutscene();
              return;
            }
            if (elapsed >= totalDuration * 0.78) show();

            fillEl.style.width = `${Math.min(100, (elapsed / totalDuration) * 100)}%`;

            let beatIdx = 0;
            for (let i = 0; i < CUTSCENE_BEATS.length; i++) {
              if (elapsed >= CUTSCENE_BEATS[i].t0) beatIdx = i;
            }
            if (beatIdx !== currentBeatIdx) {
              currentBeatIdx = beatIdx;
              const b = CUTSCENE_BEATS[beatIdx];
              renderTremblingWhisper(b.whisper, b.sub, b.badge, b.speaker);
              if (beatIdx === 1 || beatIdx === 2) window.CrystalAudio?.hover?.();
              if (beatIdx === 3) window.CrystalAudio?.reward?.(1);
              if (beatIdx === 4) window.CrystalAudio?.reward?.(2);
            }

            drawCutsceneFrame(Math.floor(elapsed * 60) / 60);
            rafId = requestAnimationFrame(step);
          }
          rafId = requestAnimationFrame(step);
        });
      } finally {
        cancelAnimationFrame(rafId);
        window.removeEventListener('keydown', onKeySkip);
        show();
        overlay.remove();
        main.inert = false;
        entering = false;
        ready();
      }
    }
  };

  const track = new Audio('assets/audio/o-que-um-cristal-pode-fazer.mp3');
  track.preload = 'metadata';
  let context, analyser, gain, bins, active = false, raf = 0, onEnd, pausedByVisibility = false, generation = 0;

  function init() {
    if (context) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    context = new C();
    const source = context.createMediaElementSource(track);
    analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.65;
    gain = context.createGain();
    source.connect(analyser).connect(gain).connect(context.destination);
    bins = new Uint8Array(analyser.frequencyBinCount);
  }

  function draw() {
    if (!active) return;
    const t = track.currentTime, host = $('showCrystals');
    if (analyser) analyser.getByteFrequencyData(bins);
    const crystals = [...host.children], width = host.clientWidth, height = host.clientHeight;
    crystals.forEach((el, i) => {
      let power = 0;
      const low = [1, 4, 10, 22, 45, 12][i], high = [4, 10, 22, 45, 90, 65][i];
      if (bins) {
        for (let j = low; j < high; j++) power += bins[j] / 255;
        power /= high - low;
      }
      const prior = Number(el.dataset.energy) || 0;
      const energy = Math.max(power, prior * 0.89);
      el.dataset.energy = energy;
      const angle = i / (crystals.length - 1) * Math.PI * 2 + t * 0.09, orbit = i === crystals.length - 1 ? 0 : 1;
      const x = Math.cos(angle) * width * 0.34 * orbit, y = Math.sin(angle) * height * 0.32 * orbit;
      el.style.transform = `translate(calc(-50% + ${reduced() ? Math.cos(i * 1.256) * width * 0.34 * orbit : x}px),calc(-50% + ${reduced() ? Math.sin(i * 1.256) * height * 0.32 * orbit : y}px)) scale(${reduced() ? 1 : 1 + energy * 0.3}) rotate(${reduced() ? 0 : Math.sin(t * 0.8 + i) * 8}deg)`;
      el.style.filter = `brightness(${1 + energy * 0.35}) drop-shadow(0 0 ${5 + energy * 20}px ${i === 5 ? '#ffaaff' : '#b6dfff'})`;
    });
    $('showProgress').style.width = (Number.isFinite(track.duration) ? track.currentTime / track.duration * 100 : 0) + '%';
    $('showAct').textContent = track.paused ? 'Apresentação pausada' : t < 12 ? 'Cada encontro acende uma nova voz.' : 'Cristais, ritmo e voz em harmonia.';
    raf = requestAnimationFrame(draw);
  }

  window.CrystalShowdown = {
    unlock() {
      try { init(); return context?.resume().catch(() => {}); }
      catch { return Promise.resolve(); }
    },
    async start(done) {
      this.stop();
      onEnd = done;
      const token = ++generation;
      active = true;
      track.currentTime = 0;
      const host = $('showCrystals');
      host.replaceChildren();
      [0, 2, 4, 5, 7, 8].forEach((sprite, i) => {
        const el = document.createElement('div');
        el.className = 'show-crystal' + (i === 5 ? ' vocal' : '');
        el.style.backgroundPosition = `${sprite % 3 * 50}% ${Math.floor(sprite / 3) * 50}%`;
        host.append(el);
      });
      try {
        init();
        await context?.resume();
        if (token !== generation) return;
        await track.play();
        if (token !== generation) { track.pause(); return; }
        raf = requestAnimationFrame(draw);
      } catch {
        if (token !== generation) return;
        $('showAct').textContent = 'Não foi possível tocar a música. Use “Tentar áudio novamente”.';
        const retry = document.createElement('button');
        retry.className = 'pixel-button';
        retry.id = 'retryShowAudio';
        retry.textContent = 'Tentar áudio novamente';
        retry.onclick = () => { retry.remove(); this.start(done); };
        document.querySelector('.show-controls').append(retry);
      }
    },
    stop() {
      generation++;
      active = false;
      cancelAnimationFrame(raf);
      track.pause();
      $('retryShowAudio')?.remove();
      pausedByVisibility = false;
    },
    setVolume(v) { track.volume = Math.max(0, Math.min(1, v)); },
    get active() { return active; },
    get currentTime() { return track.currentTime; }
  };

  track.addEventListener('ended', () => {
    if (active) {
      const done = onEnd;
      CrystalShowdown.stop();
      done?.();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!active) return;
    if (document.hidden) {
      pausedByVisibility = !track.paused;
      track.pause();
    } else if (pausedByVisibility) {
      pausedByVisibility = false;
      track.play().catch(() => { $('showAct').textContent = 'Áudio pausado. Conclua ou reveja a apresentação.'; });
    }
  });

  let interacted = false, lastHover = 0;
  document.addEventListener('pointerdown', () => { interacted = true; CrystalAudio.unlock(); }, { once: true });
  document.addEventListener('keydown', () => { interacted = true; CrystalAudio.unlock(); }, { once: true });
  document.addEventListener('pointerover', e => {
    if (interacted && e.target.closest('button') && !e.target.closest('button')?.contains(e.relatedTarget) && performance.now() - lastHover > 100) {
      lastHover = performance.now();
      CrystalAudio.hover();
    }
  });
  document.addEventListener('click', e => {
    if (e.target.closest('button') && e.target.closest('button').id !== 'playButton') CrystalAudio.click();
  });
  $('pieces').addEventListener('pointerdown', () => CrystalAudio.grab());
  $('playfield').addEventListener('pointerup', () => CrystalAudio.drop());
})();
