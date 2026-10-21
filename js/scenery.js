/* True Pixel Art Scenery Engine (320x180 logical pixel grid, 24 FPS Bayer 4x4 Dithered Restoration Wave,
 * 12 FPS crystal star glints & waterfalls, 8 FPS fireflies & subterranean water ripples).
 */
(() => {
  'use strict';
  const W = 320, H = 180;
  const R = Math.round, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

  function hash(n) {
    let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }

  let ticket = 0, current = 0, active = null, desired = 0, displayed = 0, sceneId = null;
  let waveStart = -10, waveOrigin = { x: 160, y: 95 }, fromIndex = 0, toIndex = 0, progressRatio = 0;
  const layers = [], cache = new Map(), quadBuffers = new Map();

  const gameEl = document.getElementById('game');
  const host = document.createElement('div');
  host.className = 'restoration-scene';
  host.setAttribute('aria-hidden', 'true');
  gameEl.prepend(host);

  for (let i = 0; i < 2; i++) {
    const layer = document.createElement('div');
    layer.className = 'restoration-layer';
    host.append(layer);
    layers.push(layer);
  }

  // True Pixel Art Canvas (320x180) over the scenery layers
  const pCanvas = document.createElement('canvas');
  pCanvas.className = 'scenery-pixel-canvas';
  pCanvas.width = W;
  pCanvas.height = H;
  host.append(pCanvas);
  const pCtx = pCanvas.getContext('2d');
  pCtx.imageSmoothingEnabled = false;

  // Floating Trembling Whispers Banner for World 1 (Caverna)
  const whisperBanner = document.createElement('div');
  whisperBanner.className = 'stage-whisper-banner';
  whisperBanner.setAttribute('aria-hidden', 'true');
  whisperBanner.hidden = true;
  gameEl.append(whisperBanner);

  let activeWhispers = [], whisperStepIdx = 0;
  function renderWhisperBanner(text) {
    if (!text) {
      whisperBanner.hidden = true;
      return;
    }
    whisperBanner.hidden = false;
    if (whisperBanner.dataset.text === text) return;
    whisperBanner.dataset.text = text;
    whisperBanner.replaceChildren();
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'whisper-char';
      s.textContent = ch === ' ' ? '\u00A0' : ch;
      s.style.setProperty('--char-idx', String(i));
      whisperBanner.append(s);
    });
  }

  const DMAP = new Float32Array(W * H);
  function rebuildDistanceMap(ox, oy) {
    for (let y = 0, i = 0; y < H; y++) {
      for (let x = 0; x < W; x++, i++) {
        DMAP[i] = Math.hypot(x + 0.5 - ox, (y + 0.5 - oy) * 1.1) + hash((x >> 2) + (y >> 2) * 131) * 9;
      }
    }
  }
  rebuildDistanceMap(160, 95);

  const OUT = new ImageData(W, H);
  const O32 = new Uint32Array(OUT.data.buffer);
  const RIM1 = ((255 << 24) | (0xff << 16) | (0xfb << 8) | 0xc8) >>> 0; // #c8fbff
  const RIM2 = 0xffffffff >>> 0; // #ffffff

  function extractQuadBuffers(id, img) {
    if (quadBuffers.has(id)) return quadBuffers.get(id);
    const qw = Math.floor(img.width / 2), qh = Math.floor(img.height / 2);
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.imageSmoothingEnabled = false;
    const states = [];
    for (let idx = 0; idx < 4; idx++) {
      const sx = (idx % 2) * qw, sy = Math.floor(idx / 2) * qh;
      // Crop 2px inward to avoid black grid lines between quadrants
      octx.clearRect(0, 0, W, H);
      octx.drawImage(img, sx + 2, sy + 2, qw - 4, qh - 4, 0, 0, W, H);
      const idata = octx.getImageData(0, 0, W, H);
      states.push(new Uint32Array(idata.data.buffer.slice(0)));
    }
    quadBuffers.set(id, states);
    return states;
  }

  function preload(id) {
    if (!cache.has(id)) {
      const image = new Image();
      image.src = id === 'door' ? 'assets/story/interface-extra/porta-estados.png' : `assets/story/cenarios/${id}-quatro-estados.png`;
      cache.set(id, image.decode().then(() => {
        extractQuadBuffers(id, image);
        return image;
      }).catch(() => null));
    }
    return cache.get(id);
  }

  function show(index, instant = false, origin = null) {
    if (!active) return;
    const clamped = clamp(index, 0, 3);
    if (!instant && clamped !== displayed) {
      fromIndex = displayed;
      toIndex = clamped;
      waveOrigin = origin || { x: 160, y: 95 };
      rebuildDistanceMap(waveOrigin.x, waveOrigin.y);
      waveStart = performance.now() / 1000;
    } else if (instant) {
      fromIndex = clamped;
      toIndex = clamped;
      waveStart = -10;
    }
    displayed = clamped;
    const next = 1 - current, layer = layers[next];
    layer.style.transition = instant ? 'none' : '';
    layer.style.backgroundImage = `url("${active.src}")`;
    layer.style.backgroundPosition = `${clamped % 2 * 100}% ${Math.floor(clamped / 2) * 100}%`;
    layer.style.opacity = '1';
    layers[current].style.opacity = '0';
    current = next;
  }

  // Ambient fireflies & dust motes
  const FLIES = Array.from({ length: 24 }, (_, i) => ({
    x: 12 + hash(i * 3 + 1) * 296,
    y: 18 + hash(i * 3 + 2) * 124,
    ph: hash(i * 3 + 3) * 6.28
  }));
  const DUST = Array.from({ length: 28 }, (_, i) => ({
    x: hash(i * 5 + 11) * W,
    y: hash(i * 5 + 12) * 148,
    ph: hash(i * 5 + 13) * 6.28,
    s: 2 + hash(i * 5 + 14) * 3.5
  }));
  const TIPS = [
    { x: 24, y: 112, k: 'A' }, { x: 38, y: 120, k: 'A' }, { x: 282, y: 115, k: 'A' },
    { x: 296, y: 122, k: 'B' }, { x: 18, y: 88, k: 'A' }, { x: 302, y: 90, k: 'B' },
    { x: 160, y: 52, k: 'G' }, { x: 120, y: 108, k: 'A' }, { x: 200, y: 108, k: 'A' }
  ];

  function P1(x, y, c) {
    pCtx.fillStyle = c;
    pCtx.fillRect(R(x), R(y), 1, 1);
  }

  function star(cx, cy, s, core, tip) {
    if (s <= 0) return;
    cx = R(cx); cy = R(cy);
    pCtx.fillStyle = tip;
    pCtx.fillRect(cx - s, cy, 2 * s + 1, 1);
    pCtx.fillRect(cx, cy - s, 1, 2 * s + 1);
    const inn = Math.floor(s * 0.55);
    pCtx.fillStyle = core;
    pCtx.fillRect(cx - inn, cy, 2 * inn + 1, 1);
    pCtx.fillRect(cx, cy - inn, 1, 2 * inn + 1);
  }

  function ring(cx, cy, r, col) {
    if (r <= 0) return;
    cx = R(cx); cy = R(cy); r = R(r);
    pCtx.fillStyle = col;
    let x = r, y = 0, e = 1 - r;
    while (x >= y) {
      pCtx.fillRect(cx + x, cy + y, 1, 1); pCtx.fillRect(cx + y, cy + x, 1, 1);
      pCtx.fillRect(cx - y, cy + x, 1, 1); pCtx.fillRect(cx - x, cy + y, 1, 1);
      pCtx.fillRect(cx - x, cy - y, 1, 1); pCtx.fillRect(cx - y, cy - x, 1, 1);
      pCtx.fillRect(cx + y, cy - x, 1, 1); pCtx.fillRect(cx + x, cy - y, 1, 1);
      y++;
      if (e < 0) e += 2 * y + 1;
      else { x--; e += 2 * (y - x) + 1; }
    }
  }

  function renderSceneryLoop(now) {
    if (!gameEl.hidden && !document.hidden && sceneId) {
      const reduced = document.body.classList.contains('reduce-motion');
      const t = now / 1000;
      const f12 = reduced ? 0 : Math.floor(t * 12);
      const f8 = reduced ? 0 : Math.floor(t * 8);

      const states = quadBuffers.get(sceneId);
      if (states && states[toIndex]) {
        const elapsedWave = t - waveStart;
        const waveDuration = 1.35;
        if (!reduced && elapsedWave >= 0 && elapsedWave < waveDuration && fromIndex !== toIndex) {
          const tq = Math.floor(elapsedWave * 24) / 24;
          const p = clamp(tq / waveDuration, 0, 1);
          const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          const rad = ease * 360;
          const bufA = states[fromIndex], bufB = states[toIndex];
          for (let y = 0, i = 0; y < H; y++) {
            for (let x = 0; x < W; x++, i++) {
              const d = DMAP[i] + bay(x, y) * 0.7;
              if (d < rad - 4) O32[i] = bufB[i];
              else if (d < rad) O32[i] = ((x + y) & 1) ? RIM1 : bufB[i];
              else if (d < rad + 3 && bay(x, y) < 4) O32[i] = RIM2;
              else O32[i] = bufA[i];
            }
          }
          pCtx.putImageData(OUT, 0, 0);
        } else {
          O32.set(states[toIndex]);
          pCtx.putImageData(OUT, 0, 0);
        }
      } else {
        pCtx.clearRect(0, 0, W, H);
      }

      // === LEVEL-SPECIFIC TRUE PIXEL ART ANIMATIONS FOR WORLD 1 (C1..C5 & DOOR) ===
      if (sceneId && (sceneId.startsWith('C') || sceneId === 'door')) {
        // 1. Subterranean Water Shimmer along the Cavern Floor (8 FPS)
        for (let k = 0; k < 22; k++) {
          const wy = 164 + (k * 5) % 14;
          const wx = ((Math.floor(hash(k + 500) * W) + f8 * ((k % 3) + 1)) % (W + 8)) - 4;
          pCtx.fillStyle = toIndex > 0 ? (k % 4 === 0 ? '#ffc6f2' : '#9ef0ff') : '#242052';
          pCtx.fillRect(R(wx), R(wy), 3 + (k % 2), 1);
        }

        // 2. C1 & Door: Monumental Ancient Door Subtle Background Sanctuary Aura
        if (sceneId === 'C1' || sceneId === 'door') {
          const glowCol = toIndex >= 2 ? '#9ef0ff' : '#4a3c8c';
          if ((f12 % 6) < 3) {
            star(160, 54, toIndex >= 2 ? 2 : 1, '#ffffff', glowCol);
          }
        }

        // 3. C2 (Fase 2 — Galeria dos Ecos): Animated Pixel Waterfalls from the Twin Stone Arches (12 FPS)
        if (sceneId === 'C2' && toIndex >= 1 && !reduced) {
          for (const fx of [43, 275]) {
            for (let y = 58; y < 126; y += 3) {
              const dropY = 58 + ((y - 58 + f12 * 2) % 68);
              P1(fx, dropY, (dropY + f12) % 4 === 0 ? '#ffffff' : '#63e5ff');
              if (toIndex >= 2) P1(fx + 1, dropY, '#3fc6f0');
            }
            // Basin splash droplets
            if (f12 % 2 === 0) {
              P1(fx - 2 + (f12 % 5), 125, '#ffffff');
              P1(fx + 2 - (f12 % 5), 124, '#9ef0ff');
            }
          }
        }

        // 4. C3 (Fase 3 — Lago Subterrâneo): Animated Concentric Lake Ripples & Reflections (8 FPS)
        if (sceneId === 'C3' && toIndex >= 1) {
          for (let r = 0; r < 3; r++) {
            const rx = 95 + r * 65;
            const ry = 148 + (r % 2) * 4;
            const span = 4 + ((f8 + r * 5) % 14);
            pCtx.fillStyle = toIndex >= 2 ? '#9ef0ff' : '#3fc6f0';
            pCtx.fillRect(rx - span, ry, span * 2, 1);
            if (toIndex >= 2 && (f12 + r * 3) % 8 === 0) {
              star(rx, ry - 1, 2, '#ffffff', '#9ef0ff');
            }
          }
        }

        // 5. C4 (Fase 4 — Jardim Mineral): Electric Geode Fissure Pulse (12 FPS)
        if (sceneId === 'C4' && toIndex >= 1) {
          const gx = 198, gy = 128;
          if ((f12 & 1) === 0) {
            star(gx, gy - 8, toIndex >= 2 ? 3 : 2, '#ffffff', '#9ef0ff');
            if (toIndex >= 2) ring(gx, gy - 6, 6 + (f12 % 8), '#c77dff');
          }
        }

        // 6. C5 (Fase 5 — O Sussurro da Fada): Ceiling Crystal Prison Resonance (12 FPS)
        if (sceneId === 'C5' && toIndex < 3) {
          const wr = (f12 % 14);
          if (wr < 8) {
            ring(200, 58, 4 + wr * 2, wr % 2 === 0 ? '#9ef0ff' : '#c77dff');
          }
          if ((f12 % 6) < 3) {
            star(200, 58, 2, '#ffffff', '#9ef0ff');
          }
        }

        // 7. Universal Cavern Dust Motes & Fireflies (8 FPS)
        for (const d of DUST) {
          const x = R(d.x + Math.sin(t * 0.6 + d.ph) * 3);
          const y = R(((d.y - t * d.s) % 148 + 148) % 148);
          P1(x, y, toIndex >= 2 ? '#4a68dc' : '#2e2858');
        }
        if (toIndex >= 1) {
          const activeCount = toIndex * 8;
          for (let i = 0; i < activeCount && i < FLIES.length; i++) {
            const f = FLIES[i];
            if ((f8 + i * 3) % 7 === 0) continue;
            const x = R(f.x + Math.sin(t * 0.9 + f.ph) * 6);
            const y = R(f.y + Math.sin(t * 1.3 + f.ph * 2) * 4);
            P1(x, y, '#fff6a0');
            if ((f8 + i) % 2 === 0) {
              pCtx.fillStyle = '#c89a2a';
              pCtx.fillRect(x - 1, y, 1, 1); pCtx.fillRect(x + 1, y, 1, 1);
              pCtx.fillRect(x, y - 1, 1, 1); pCtx.fillRect(x, y + 1, 1, 1);
            }
          }
        }

        // 8. Crystal Tip Star Glints (12 FPS)
        if (toIndex >= 1) {
          TIPS.forEach((tp, i) => {
            const l = (f12 + Math.floor(hash(i + 77) * 36)) % 36;
            if (l < 3) {
              star(tp.x, tp.y, [1, 2, 1][l], '#ffffff', tp.k === 'G' ? '#ffe066' : tp.k === 'B' ? '#ffc6f2' : '#c8fbff');
            }
          });
        }
      }
    }
    requestAnimationFrame(renderSceneryLoop);
  }
  requestAnimationFrame(renderSceneryLoop);

  let readyPromise = Promise.resolve();
  window.CrystalScenery = {
    get ready() { return readyPromise; },
    async load(id, level = null) {
      const token = ++ticket;
      sceneId = id;
      desired = id === 'door' ? 3 : 0;
      displayed = desired;
      fromIndex = desired;
      toIndex = desired;
      waveStart = -10;
      progressRatio = 0;
      active = null;

      // Setup floating trembling whispers for World 1 levels
      const lvl = level || window.CrystalCampaign?.levels?.find(l => (l.final ? 'door' : l.scene) === id);
      activeWhispers = lvl?.whispers || [];
      whisperStepIdx = 0;
      renderWhisperBanner(activeWhispers[0] || '');

      const srcUrl = id === 'door' ? 'assets/story/interface-extra/porta-estados.png' : `assets/story/cenarios/${id}-quatro-estados.png`;
      layers[0].style.transition = 'none';
      layers[0].style.backgroundImage = `url("${srcUrl}")`;
      layers[0].style.backgroundPosition = `${desired % 2 * 100}% ${Math.floor(desired / 2) * 100}%`;
      layers[0].style.opacity = '1';
      layers[1].style.opacity = '0';
      current = 0;

      host.classList.add('loading');
      readyPromise = preload(id);
      const image = await readyPromise;
      if (token !== ticket) return;
      if (image) {
        active = image;
        show(desired, true);
      }
      host.classList.remove('loading');
    },
    setProgress(ratio, origin = null) {
      progressRatio = clamp(ratio, 0, 1);
      desired = sceneId === 'door' ? 3 : Math.min(3, Math.floor(progressRatio * 3));
      show(desired, false, origin);
      if (activeWhispers.length > 0) {
        const wIdx = Math.min(activeWhispers.length - 1, Math.floor(progressRatio * activeWhispers.length));
        if (wIdx !== whisperStepIdx) {
          whisperStepIdx = wIdx;
          renderWhisperBanner(activeWhispers[wIdx]);
        }
      }
    },
    triggerWave(origin) {
      waveOrigin = origin || { x: 160, y: 95 };
      rebuildDistanceMap(waveOrigin.x, waveOrigin.y);
      waveStart = performance.now() / 1000;
    },
    preload
  };
  ['C1', 'C2', 'C3', 'C4', 'C5'].forEach(preload);
})();
