/* True Pixel Art Stage & Landmark Animator (12 FPS sprites / 24 FPS effects / 60 Hz physics).
 * Automatically keys out opaque backgrounds from sprite sheets into clean binary RGBA alpha,
 * animates World 1 (Caverna Levels 1-5) landmarks in True Pixel Art, and renders the
 * full 320x180 Fairy Liberation & Monumental Ancient Door activation sequence on Level 5.
 */
(() => {
  'use strict';
  const game = document.getElementById('game');
  const host = document.createElement('div');
  host.className = 'stage-company';
  host.setAttribute('aria-hidden', 'true');
  game.append(host);

  const R = Math.round, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const data = {
    araci: { y: [0, 0.274, 0.523, 0.766, 1], x: [[0, 0.255, 0.493, 0.731, 1], [0, 0.248, 0.50, 0.748, 1], [0, 0.27, 0.518, 0.757, 1], [0, 0.254, 0.497, 0.737, 1]] },
    irece: { y: [0, 0.251, 0.496, 0.736, 1], x: [[0, 0.284, 0.491, 0.704, 1], [0, 0.285, 0.498, 0.712, 1], [0, 0.286, 0.503, 0.719, 1], [0, 0.237, 0.495, 0.713, 1]] },
    jurema: { y: [0, 0.252, 0.493, 0.733, 1], x: [[0, 0.271, 0.486, 0.706, 1], [0, 0.252, 0.483, 0.713, 1], [0, 0.272, 0.507, 0.748, 1], [0, 0.25, 0.503, 0.716, 1]] },
    onca: { y: [0, 0.38, 0.658, 1], x: [[0, 0.294, 0.535, 0.768, 1], [0, 0.27, 0.507, 0.746, 1], [0, 0.27, 0.505, 0.775, 1]] }
  };
  const rows = {
    caverna: [[0, 0.195], [0.195, 0.377], [0.377, 0.548], [0.548, 0.729], [0.729, 1]],
    floresta: [[0, 0.262], [0.262, 0.415], [0.415, 0.591], [0.591, 0.754], [0.754, 1]],
    rio: [[0, 0.216], [0.216, 0.392], [0.392, 0.568], [0.568, 0.763], [0.763, 1]],
    caatinga: [[0, 0.186], [0.186, 0.34], [0.34, 0.568], [0.568, 0.759], [0.763, 1]]
  };

  const cache = new Map();
  let token = 0, actors = [], object = null, level = null, progress = 0, music = false, clock = () => 0, lastFrame = -1, lastPropFrame = -1, reduced = false;

  function image(url) {
    if (!cache.has(url)) {
      const img = new Image();
      img.src = url;
      cache.set(url, img.decode().then(() => img).catch(() => null));
    }
    return cache.get(url);
  }

  function canvas(className, w = 160, h = 160) {
    const el = document.createElement('canvas');
    el.width = w;
    el.height = h;
    el.className = className;
    host.append(el);
    return el;
  }

  function paint(el, img, x1, y1, x2, y2) {
    const ctx = el.getContext('2d', { willReadFrequently: true });
    const cw = el.width, ch = el.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = false;
    const w = (x2 - x1) * img.width, h = (y2 - y1) * img.height;
    const scale = Math.min((cw - 8) / w, (ch - 8) / h);
    const dw = R(w * scale), dh = R(h * scale);
    const dx = R((cw - dw) / 2), dy = R(ch - 4 - dh);
    ctx.drawImage(img, R(x1 * img.width), R(y1 * img.height), R(w), R(h), dx, dy, dw, dh);
    // Fast binary alpha clean on the 160x160 buffer if the sprite sub-rect has an opaque white background
    try {
      const id = ctx.getImageData(0, 0, cw, ch);
      const d = id.data;
      const cIdx = ((dy + 1) * cw + (dx + 1)) * 4;
      if (d[cIdx + 3] > 220 && d[cIdx] > 235 && d[cIdx + 1] > 235 && d[cIdx + 2] > 235) {
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) d[i + 3] = 0;
        }
        ctx.putImageData(id, 0, 0);
      }
    } catch {}
  }

  function star(ctx, cx, cy, s, core, tip) {
    if (s <= 0) return;
    cx = R(cx); cy = R(cy);
    ctx.fillStyle = tip;
    ctx.fillRect(cx - s, cy, 2 * s + 1, 1);
    ctx.fillRect(cx, cy - s, 1, 2 * s + 1);
    const inn = Math.floor(s * 0.55);
    ctx.fillStyle = core;
    ctx.fillRect(cx - inn, cy, 2 * inn + 1, 1);
    ctx.fillRect(cx, cy - inn, 1, 2 * inn + 1);
  }

  function ring(ctx, cx, cy, r, col) {
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
  }

  // Draw 12 FPS True Pixel Art overlays on World 1 (Caverna) Landmark Objects (Fases 1 a 5)
  function paintObjectWithPixelFx(f12) {
    if (!object) return;
    const frameIdx = clamp(Math.floor(progress * 3), 0, 3);
    const [top, bottom] = rows[object.world][object.row];
    paint(object.el, object.img, frameIdx / 4, top, (frameIdx + 1) / 4, bottom);

    if (object.world !== 'caverna') return;
    const ctx = object.el.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const row = object.row; // 0..4 for Levels 1..5

    if (row === 0) {
      // Fase 1 (C1 — Afloramento de Quartzo): Twinkling crystal stars & rising moss spores
      const tips = [[82, 34], [108, 62], [60, 74], [118, 92]];
      tips.forEach(([tx, ty], i) => {
        if (frameIdx >= 1 && (f12 + i * 5) % 10 < 3) {
          star(ctx, tx, ty, frameIdx >= 2 ? 3 : 2, '#ffffff', '#9ef0ff');
        }
      });
      for (let i = 0; i < (frameIdx + 1) * 3; i++) {
        const sx = 35 + ((i * 23 + R(Math.sin(f12 * 0.2 + i) * 4)) % 90);
        const sy = 135 - ((f12 * 2 + i * 19) % 95);
        ctx.fillStyle = i % 2 === 0 ? '#9ef0ff' : '#7aee8d';
        ctx.fillRect(sx, sy, 2, 2);
      }
    } else if (row === 1) {
      // Fase 2 (C2 — Fonte de Pedra): 12 FPS Cascading Pixel Water Stream & Mushroom Spores
      if (frameIdx >= 1) {
        for (let y = 78; y < 142; y += 4) {
          const wy = 78 + ((y - 78 + f12 * 3) % 64);
          ctx.fillStyle = (wy + f12) % 4 === 0 ? '#ffffff' : '#63e5ff';
          ctx.fillRect(79, wy, frameIdx >= 2 ? 4 : 2, 2);
        }
        // Splash droplets at base
        const sp = f12 % 4;
        ctx.fillStyle = '#c8fbff';
        ctx.fillRect(74 - sp * 2, 138 - (sp % 2) * 2, 2, 2);
        ctx.fillRect(85 + sp * 2, 138 - ((sp + 1) % 2) * 2, 2, 2);
      }
      if (frameIdx >= 2 && f12 % 6 < 3) {
        star(ctx, 48, 52, 2, '#ffffff', '#9ef0ff');
        star(ctx, 114, 58, 2, '#ffffff', '#c77dff');
      }
    } else if (row === 2) {
      // Fase 3 (C3 — Lago Subterrâneo): 12 FPS Rippling Pool Rings & Bioluminescent Ferns
      const cx = 80, cy = 112;
      for (let k = 0; k < 3; k++) {
        const rw = 8 + ((f12 * 2 + k * 12) % 34);
        ctx.fillStyle = frameIdx >= 2 ? '#9ef0ff' : '#3fc6f0';
        ctx.fillRect(cx - rw, cy + (k - 1) * 6, rw * 2, 1);
      }
      if (frameIdx >= 2) {
        if (f12 % 4 < 2) star(ctx, 64, 108, 2, '#ffffff', '#9ef0ff');
        if ((f12 + 2) % 4 < 2) star(ctx, 96, 114, 2, '#ffffff', '#ffc6f2');
      }
    } else if (row === 3) {
      // Fase 4 (C4 — Geodo Ancestral): Electric Fissure & Pulsing Crystal Core
      if (frameIdx === 1) {
        // Electric lightning crack
        for (let y = 44; y < 126; y += 3) {
          const x = 82 - R((y - 44) * 0.18) + ((y + f12) % 3 - 1);
          ctx.fillStyle = (y + f12) % 2 === 0 ? '#ffffff' : '#3fc6f0';
          ctx.fillRect(x, y, 2, 2);
        }
      } else if (frameIdx >= 2) {
        if (f12 % 4 < 2) star(ctx, 82, 92, 3, '#ffffff', '#9ef0ff');
        ring(ctx, 82, 92, 8 + (f12 % 12), frameIdx === 3 ? '#ffc6f2' : '#9ef0ff');
      }
    } else if (row === 4) {
      // Fase 5 (C5 — Cristal-Prisão da Fada): Voice Rings & Electric Fractures
      const cx = 80, cy = 78;
      ring(ctx, cx, cy, 14 + ((f12 * 2) % 26), f12 % 2 === 0 ? '#9ef0ff' : '#c77dff');
      if (frameIdx >= 1 && frameIdx < 3) {
        star(ctx, cx, cy, 3, '#ffffff', '#9ef0ff');
      }
    }
  }

  function pose(actor, row, column) {
    const d = data[actor.name], key = row * 4 + column;
    if (actor.key === key) return;
    actor.key = key;
    if (actor.name === 'fada') {
      paint(actor.el, actor.img, column / 4, row / 3, (column + 1) / 4, (row + 1) / 3);
      return;
    }
    paint(actor.el, actor.img, d.x[row][column], d.y[row], d.x[row][column + 1], d.y[row + 1]);
  }

  function restore(value) {
    progress = Math.max(0, Math.min(1, value));
    if (!object) return;
    const frameIdx = Math.floor(progress * 3);
    const changed = object.frame !== frameIdx;
    object.frame = frameIdx;
    paintObjectWithPixelFx(Math.floor(performance.now() / 1000 * 12));
    if (changed && !reduced) {
      object.el.animate(
        [{ opacity: 0.75, transform: 'translateY(4px) scale(0.98)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
        { duration: 320, easing: 'steps(4, end)' }
      );
      if (level?.specialHarmony && frameIdx === 3) {
        window.CrystalAudio?.reward?.(3);
      }
    }
  }

  function frame(now) {
    if (level && !game.hidden && !document.hidden) {
      const t = music ? clock() : now / 1000;
      const step = Math.floor(t * (music ? 5 : 2));
      const f12 = reduced ? 0 : Math.floor((now / 1000) * 12);

      if (object && object.world === 'caverna' && f12 !== lastPropFrame) {
        lastPropFrame = f12;
        paintObjectWithPixelFx(f12);
      }

      if (step !== lastFrame) {
        lastFrame = step;
        for (const actor of actors) {
          if (actor.name === 'fada') continue;
          const row = music ? 2 : progress === 1 ? (actor.name === 'onca' ? 0 : 3) : 0;
          const column = music ? step % 4 : progress === 1 && actor.name !== 'onca' ? 3 : step % 8 === 1 ? 1 : 0;
          pose(actor, row, column);
        }
      }
      for (const actor of actors) {
        if (actor.name === 'fada') {
          const f = reduced ? 0 : Math.floor(t * 12) % 12;
          pose(actor, Math.floor(f / 4), f % 4);
          actor.el.hidden = !music;
        }
        const y = reduced ? 0 : R(music ? -Math.abs(Math.sin(t * Math.PI * 2)) * 6 : Math.sin(t * 1.8) * 2);
        actor.el.style.transform = `translateY(${y}px)`;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // === TRUE PIXEL ART FAIRY LIBERATION & MONUMENTAL ANCIENT DOOR ACTIVATION (FASE 5) ===
  function fromMap(rowsMap, pal) {
    const h = rowsMap.length, w = rowsMap[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const col = pal[rowsMap[j][i]];
        if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
      }
    }
    return c;
  }

  const FAIRY_ROWS = [
    '....hhhh....',
    '...hHHHHh...',
    '..hHhhhhHg..',
    '..hhsssshh..',
    '..hsessesh..',
    '..hssssssh..',
    '..hhsSSshh..',
    '.hh.bBBb.hh.',
    '.hhsbBBbshh.',
    '.hhsbbBbshh.',
    '.hh.bbbb.hh.',
    '.hhbBbbBbhh.',
    '..hbbdbbdbh.',
    '..bBdbBdbB..',
    '....s..s....',
    '....S..S....'
  ];
  const FAIRY_BODY = fromMap(FAIRY_ROWS, {
    h: '#3b1d0e', H: '#6b3a1c', g: '#ffd35a', s: '#7a4426', S: '#55301a',
    e: '#120806', b: '#2f6fd6', B: '#7fc4ff', d: '#1b3c8f'
  });
  const SHARD_SPR = [
    fromMap(['.W.', 'LWM', 'LMD', '.D.'], { W: '#ffffff', L: '#c8fbff', M: '#8fd8ff', D: '#3fb6e8' }),
    fromMap(['LW..', 'LMMD', '.MD.'], { W: '#ffffff', L: '#c8fbff', M: '#8fd8ff', D: '#3fb6e8' })
  ];
  const FAIRY_GEM_LIT = fromMap([
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

  async function release() {
    const generation = token;
    if (reduced) return;
    const W = 320, H = 180;
    const el = canvas('fairy-release-canvas', W, H);
    const ctx = el.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // 36 gravity-bouncing crystal shards
    const shards = Array.from({ length: 36 }, (_, i) => {
      const a = (i / 36) * Math.PI * 2 + (i % 3) * 0.2;
      const sp = 65 + (i % 5) * 18;
      return {
        x0: 196 + ((i % 7) - 3) * 3,
        y0: 54 + ((i % 5) - 2) * 4,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 45,
        floorY: 146 + (i % 4) * 2
      };
    });

    const start = performance.now();
    window.CrystalAudio?.reward?.(3);

    await new Promise(resolve => {
      function tick(now) {
        if (generation !== token || game.hidden) {
          el.remove();
          resolve();
          return;
        }
        const elapsed = (now - start) / 1000;
        const duration = 2.4;
        if (elapsed >= duration) {
          el.remove();
          resolve();
          return;
        }

        const f12 = Math.floor(elapsed * 12);
        ctx.clearRect(0, 0, W, H);

        // 1. White 2-frame flash + Concentric Shockwave Rings at Prison (196, 54)
        if (f12 < 2) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(182, 32, 28, 44);
        } else if (f12 < 12) {
          const r = 6 + (f12 - 2) * 5;
          ring(ctx, 196, 54, r, f12 % 2 === 0 ? '#ffffff' : '#9ef0ff');
          ring(ctx, 196, 54, r - 2, '#c77dff');
          star(ctx, 196, 54, Math.max(2, 14 - f12), '#ffffff', '#9ef0ff');
        }

        // 2. 36 Falling & Floor-Bouncing Shards (60 Hz physics)
        const G = 260;
        shards.forEach((s, i) => {
          const tc = (-s.vy + Math.sqrt(s.vy * s.vy + 2 * G * (s.floorY - s.y0))) / G;
          let sx, sy;
          if (elapsed < tc) {
            sx = s.x0 + s.vx * elapsed;
            sy = s.y0 + s.vy * elapsed + 0.5 * G * elapsed * elapsed;
          } else {
            const xc = s.x0 + s.vx * tc;
            const vb = -0.32 * (s.vy + G * tc);
            const t2 = elapsed - tc;
            const tb2 = -2 * vb / G;
            if (t2 < tb2) {
              sx = xc + s.vx * 0.45 * t2;
              sy = s.floorY + vb * t2 + 0.5 * G * t2 * t2;
            } else {
              sx = xc + s.vx * 0.45 * tb2;
              sy = s.floorY;
            }
          }
          ctx.drawImage(SHARD_SPR[(i + f12) & 1], R(sx), R(sy));
        });

        // 3. Fairy of Gems Bézier Flight Arc (196,54 -> 130,22 -> 160,64)
        const fp = clamp((elapsed - 0.15) / 1.35, 0, 1);
        const ease = fp < 0.5 ? 2 * fp * fp : 1 - Math.pow(-2 * fp + 2, 2) / 2;
        const q = 1 - ease;
        const fx = R(q * q * 196 + 2 * q * ease * 130 + ease * ease * 160);
        const fy = R(q * q * 54 + 2 * q * ease * 20 + ease * ease * 62 + Math.sin(elapsed * 8) * 2);

        // Stardust trail
        for (let k = 1; k <= 6; k++) {
          const tp = clamp(fp - k * 0.04, 0, 1);
          const tq = 1 - tp;
          const tx = R(tq * tq * 196 + 2 * tq * tp * 130 + tp * tp * 160);
          const ty = R(tq * tq * 54 + 2 * tq * tp * 20 + tp * tp * 62);
          star(ctx, tx, ty + 6, k < 3 ? 2 : 1, '#ffffff', k % 2 === 0 ? '#ffd35a' : '#9ef0ff');
        }

        // Draw Pixel-Art Wings (12 FPS flap) + Fairy Body
        const wingLift = [-2, 0, 2, 0][f12 % 4];
        ctx.fillStyle = '#9ef0ff';
        ctx.fillRect(fx - 7, fy + 4 + wingLift, 6, 5);
        ctx.fillRect(fx + 13, fy + 4 + wingLift, 6, 5);
        ctx.fillStyle = '#ecfeff';
        ctx.fillRect(fx - 5, fy + 5 + wingLift, 4, 3);
        ctx.fillRect(fx + 13, fy + 5 + wingLift, 4, 3);
        ctx.drawImage(FAIRY_BODY, fx, fy);

        // 4. Grand Butterfly Fairy Gem Socket Igniting at (160, 88)
        if (elapsed >= 1.45) {
          const sf = Math.floor((elapsed - 1.45) * 12);
          ctx.drawImage(FAIRY_GEM_LIT, 160 - 13, 88 - 9);
          ring(ctx, 160, 88, 6 + sf * 3, sf % 2 === 0 ? '#9ef0ff' : '#ffc6f2');
          star(ctx, 160, 88, 4, '#ffffff', '#ffe066');
        }

        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  window.CrystalStage = {
    release,
    async load(next, options) {
      const generation = ++token;
      level = next;
      progress = 0;
      music = false;
      reduced = !!options.motion;
      actors = [];
      object = null;
      host.replaceChildren();
      host.classList.remove('performing');
      lastFrame = -1;
      lastPropFrame = -1;

      const world = ['caverna', 'floresta', 'rio', 'caatinga'][next.world];
      const row = (next.id - 1) % 5;
      const atlas = await image(`assets/story/transicoes/${world}-20-quadros.png`);
      if (token !== generation) return;
      if (atlas && !next.final) {
        object = { el: canvas('restoration-object', 160, 160), img: atlas, world, row, frame: -1 };
        restore(progress);
      }
      const names = next.world === 1 ? ['araci', 'onca', 'fada'] : next.world === 2 ? ['irece', 'fada'] : next.world === 3 ? ['jurema', 'fada'] : ['fada'];
      for (const name of names) {
        const img = await image(`assets/story/personagens/${name === 'fada' ? 'fada-canto-12-quadros-v2' : name + '-' + (name === 'onca' ? 12 : 16) + '-quadros'}.png`);
        if (token !== generation) return;
        if (img) {
          const actor = { name, img, el: canvas('stage-actor ' + name, 160, 160), key: -1 };
          actor.el.hidden = name === 'fada';
          actors.push(actor);
          pose(actor, 0, 0);
        }
      }
    },
    restore,
    musical(value, getClock) {
      music = value;
      clock = getClock || (() => 0);
      lastFrame = -1;
      host.classList.toggle('performing', value);
    },
    get state() {
      return { actors: actors.map(a => a.name), frame: object?.frame, music };
    }
  };
})();
