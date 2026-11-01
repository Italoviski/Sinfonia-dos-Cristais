'use strict';
/**
 * MUNDOS 2, 3, 4 E PORTÃO FINAL (NÓS 6..21) — CONTINUAÇÃO EM TRUE PIXEL ART (640x360 / 320x180)
 * Mantém 100% da temática, direção de arte Hi-Bit estilo Owlboy, HUD, Caixa de Diálogo Global
 * (com os 4 encaixes de gemas no topo e retratos somente de rosto em losango), Tutorial Paginado,
 * mecânicas táteis de cristais, Show Musical em 2 atos (Teatro de Sombras + Nuvem + Animais de Pedra Neon
 * + Tambor Mágico + Panorama) e Transição Iris Out/In para o Mapa de `CaveChapter1`.
 */
(function (global) {
  const E = global.TruePixelEngine;
  if (!E) return;

  const {
    W, H, SPRITE_FPS, SIM_HZ, bay, mulberry, c32, fromMap,
    P1, drawRing, drawStar, drawPixelText, drawPixelTextCentered, drawParchmentBox,
    ActorAnimator, IrisTransition, DialogueBox, TutorialModal, GameHUD, StandardTutorialCards
  } = E;

  const R = Math.round;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  const HW = 640, HH = 360;
  const RH = (v) => Math.round(v * 2) * 0.5;

  // ============================================================================
  // 1. SPRITES HI-BIT DE CRISTAIS, ALTAR DE ESMERALDA E FRAGMENTOS (34x42 FÍSICOS)
  // ============================================================================
  function buildHiBitWorldGem(shape, pal) {
    const GW = 34, GH = 42;
    const c = document.createElement('canvas');
    c.width = GW;
    c.height = GH;
    c.hib = true;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;

    const put = (px, py, col) => {
      if (px >= 0 && py >= 0 && px < GW && py < GH) {
        x.fillStyle = col;
        x.fillRect(px, py, 1, 1);
      }
    };

    const cx = 16.5, cy = 20.5;
    for (let py = 2; py < GH - 2; py++) {
      const dy = (py - cy) / 18.5;
      const ny = Math.abs(dy);
      let maxHalfW;
      if (shape === 'opal') {
        maxHalfW = dy < 0 ? (1 - Math.pow(ny, 0.82)) * 14.5 : (1 - Math.pow(ny, 1.35)) * 14.5;
      } else if (shape === 'aqua') {
        // Gota cristalina lapidada para Água-Marinha
        maxHalfW = dy < 0 ? (1 - Math.pow(ny, 0.72)) * 12.2 : (1 - Math.pow(ny, 1.65)) * 14.6;
      } else if (shape === 'citrine') {
        // Prisma solar hexagonal para Citrino
        maxHalfW = ny < 0.52 ? 13.8 - ny * 2.4 : (1 - (ny - 0.52) / 0.48) * 12.5;
      } else {
        maxHalfW = ny < 0.36 ? 13.5 - ny * 4.5 : (1 - (ny - 0.36) / 0.64) * 11.8;
      }

      const hw = Math.round(maxHalfW);
      if (hw <= 0) continue;

      for (let px = Math.round(cx - hw); px <= Math.round(cx + hw); px++) {
        const dx = (px - cx) / Math.max(1, hw);
        const adx = Math.abs(dx);
        let col = pal.M;

        if (adx > 0.88 || ny > 0.91) {
          col = (dx < 0 && dy < 0) ? pal.L : pal.K;
        } else if (shape === 'opal') {
          const coreD = Math.hypot(dx * 1.15, (dy - 0.06) * 1.25);
          if (coreD < 0.32) col = pal.W;
          else if (coreD < 0.56) col = ((px + py) & 1) ? pal.H : pal.W;
          else if (coreD < 0.78) col = (dx < 0 || ((px + py) & 1)) ? pal.L : pal.M;
          else col = dx < 0 ? pal.M : pal.D;
        } else {
          const inTable = adx < 0.46 && ny < 0.48;
          if (inTable) {
            if (dx + dy < -0.32) col = pal.W;
            else if (dx + dy < 0.08) col = ((px + py) & 1) ? pal.H : pal.L;
            else if (dx + dy < 0.42) col = pal.L;
            else col = pal.M;
          } else {
            const ridge = Math.abs(adx - 0.46) < 0.09 || Math.abs(ny - 0.48) < 0.06;
            if (ridge && dx < 0.25 && dy < 0.25) col = pal.H;
            else if (dx < -0.35 && dy < 0.25) col = ((px + py) & 1) ? pal.W : pal.H;
            else if (dx < 0 && dy < 0) col = pal.L;
            else if (dx > 0.32 && dy > 0.15) col = ((px + py) & 1) ? pal.K : pal.D;
            else if (dx > 0 || dy > 0.35) col = pal.D;
            else col = pal.M;
          }
        }
        put(px, py, col);
      }
    }

    put(11, 9, '#ffffff');
    put(12, 9, '#ffffff');
    put(11, 10, '#ffffff');
    put(10, 9, pal.W);
    put(11, 8, pal.W);
    return c;
  }

  const GEM_SPRITES = {
    white_pure: buildHiBitWorldGem('quartz', {
      W: '#ffffff', H: '#e3f4f7', L: '#a8d8e6', M: '#6caac4', D: '#437794', K: '#294c66'
    }),
    white_shadow: buildHiBitWorldGem('quartz', {
      W: '#b8a6d9', H: '#8572ab', L: '#5e4d82', M: '#413361', D: '#2a1f42', K: '#1a122b'
    }),
    rose_pure: buildHiBitWorldGem('quartz', {
      W: '#fff2f5', H: '#f7cad8', L: '#e396b1', M: '#bf6588', D: '#8c3f60', K: '#59223b'
    }),
    rose_shadow: buildHiBitWorldGem('quartz', {
      W: '#cfa3c4', H: '#96688c', L: '#6e4666', M: '#4d2d47', D: '#331a2e', K: '#1f0e1c'
    }),
    opal_pure: buildHiBitWorldGem('opal', {
      W: '#fff6cc', H: '#f7c97e', L: '#e68a49', M: '#c45131', D: '#8c2d1f', K: '#541812'
    }),
    opal_shadow: buildHiBitWorldGem('opal', {
      W: '#c99b8f', H: '#8f5d52', L: '#693c34', M: '#4a2620', D: '#301512', K: '#1c0b09'
    }),
    citrine_pure: buildHiBitWorldGem('citrine', {
      W: '#fffbe0', H: '#f7df86', L: '#e6b84c', M: '#c48a2b', D: '#8c5a18', K: '#54320b'
    }),
    citrine_shadow: buildHiBitWorldGem('citrine', {
      W: '#d6c49c', H: '#9c865e', L: '#705d3d', M: '#4f4028', D: '#332818', K: '#1f170d'
    }),
    aqua_pure: buildHiBitWorldGem('aqua', {
      W: '#edffff', H: '#b8f5f2', L: '#6bd4db', M: '#3ca1b0', D: '#236c7a', K: '#133f4a'
    }),
    aqua_shadow: buildHiBitWorldGem('aqua', {
      W: '#a6cad4', H: '#6e93a1', L: '#4c6a78', M: '#334957', D: '#20303b', K: '#121d26'
    }),
    emerald_core: buildHiBitWorldGem('quartz', {
      W: '#ecffea', H: '#b2f09e', L: '#7ec456', M: '#4b943b', D: '#2c6324', K: '#183b14'
    })
  };

  const SHARD_ROWS = [
    ['..W..', '.LWM.', 'LLMMD', '.MDD.', '..D..'],
    ['.LW..', 'LLMMD', '.MDDD', '..D..'],
    ['.LW.', 'WMMD', 'MDDD', '.DD.'],
    ['..WW.', '.LMMM', 'DDDD.']
  ];
  const SHARD_SPR = {
    pure: SHARD_ROWS.map((r) => fromMap(r, { W: '#ffffff', L: '#dff4ff', M: '#6caac4', D: '#437794' })),
    rose: SHARD_ROWS.map((r) => fromMap(r, { W: '#ffffff', L: '#f7cad8', M: '#bf6588', D: '#8c3f60' })),
    opal: SHARD_ROWS.map((r) => fromMap(r, { W: '#fff6cc', L: '#e68a49', M: '#c45131', D: '#8c2d1f' })),
    citrine: SHARD_ROWS.map((r) => fromMap(r, { W: '#fffbe0', L: '#f7df86', M: '#c48a2b', D: '#8c5a18' })),
    aqua: SHARD_ROWS.map((r) => fromMap(r, { W: '#edffff', L: '#6bd4db', M: '#3ca1b0', D: '#236c7a' })),
    emerald: SHARD_ROWS.map((r) => fromMap(r, { W: '#ecffea', L: '#8ed46a', M: '#4b943b', D: '#2c6324' })),
    shadow: SHARD_ROWS.map((r) => fromMap(r, { W: '#b8a6d9', L: '#5e4d82', M: '#413361', D: '#2a1f42' })),
    rock: SHARD_ROWS.map((r) => fromMap(r, { W: '#6e635f', L: '#524846', M: '#3b3332', D: '#262020' }))
  };

  const EXTERNAL_ORB_ARCS = {
    1: [[0, -14.5]],
    2: [[-4.5, -14], [4.5, -14]],
    3: [[-7.5, -12.5], [0, -15], [7.5, -12.5]],
    4: [[-9.5, -11], [-3.5, -14.5], [3.5, -14.5], [9.5, -11]],
    5: [[-11, -9.5], [-6, -13.5], [0, -15.5], [6, -13.5], [11, -9.5]],
    6: [[-12, -8.5], [-7.5, -12.5], [-2.5, -15], [2.5, -15], [7.5, -12.5], [12, -8.5]]
  };

  function drawExternalOrb(ctx, ox, oy, coreCol, midCol, rimCol, pulse = false) {
    ox = RH(ox);
    oy = RH(oy);
    const r = pulse ? 3.0 : 2.5;
    if (pulse) {
      ctx.fillStyle = '#fff6cc';
      ctx.fillRect(ox - 3.5, oy - 1.5, 7, 3);
      ctx.fillRect(ox - 1.5, oy - 3.5, 3, 7);
    }
    ctx.fillStyle = rimCol;
    ctx.fillRect(ox - r, oy - r + 0.5, r * 2, r * 2 - 1);
    ctx.fillRect(ox - r + 0.5, oy - r, r * 2 - 1, r * 2);
    ctx.fillStyle = midCol;
    ctx.fillRect(ox - r + 0.5, oy - r + 0.5, r * 2 - 1, r * 2 - 1);
    ctx.fillStyle = coreCol;
    ctx.fillRect(ox - 1, oy - 1, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox - 1, oy - 1.5, 1, 1);
  }

  function getPieceSprite(piece) {
    const key = `${piece.type || 'white'}_${piece.shadow ? 'shadow' : 'pure'}`;
    return GEM_SPRITES[key] || (piece.shadow ? GEM_SPRITES.white_shadow : GEM_SPRITES.white_pure);
  }

  function getOrbPalette(piece) {
    if (piece.shadow) {
      return {
        core: '#f3e0ff',
        mid: piece.type === 'rose' ? '#cfa3c4' : (piece.type === 'citrine' ? '#c9b489' : (piece.type === 'aqua' ? '#8eb8c7' : '#9b84c4')),
        rim: '#1f142e',
        link: '#6e5794'
      };
    }
    if (piece.type === 'opal') return { core: '#fffdf2', mid: '#f7b259', rim: '#4a1912', link: '#e68a49' };
    if (piece.type === 'rose') return { core: '#fffdf2', mid: '#f29bb8', rim: '#4f1e35', link: '#d97a9c' };
    if (piece.type === 'citrine') return { core: '#fffdf2', mid: '#f5cf64', rim: '#4d2e0a', link: '#d9a43b' };
    if (piece.type === 'aqua') return { core: '#fffdf2', mid: '#7be3eb', rim: '#143f4a', link: '#4bb2bf' };
    return { core: '#fffdf2', mid: '#7fd4e6', rim: '#1e3a4d', link: '#569bb0' };
  }

  function drawCrystalPiece(ctx, piece, t) {
    if (!piece || piece.broken || piece.value <= 0) return;

    const isTrembling = Boolean(piece.trembling) || Boolean(piece.rejectUntil && t < piece.rejectUntil);
    const [tx, ty] = ActorAnimator.getCrystalTrembleOffset(t, isTrembling, ctx, piece.x, piece.y);
    const x = RH(piece.x + tx), y = RH(piece.y + ty);

    if (piece.dragging) {
      drawRing(ctx, R(x), R(y), 14, '#e6cf9c');
    } else if (!piece.shadow && (piece.type === 'citrine' || piece.type === 'aqua') && piece.value >= 2 && piece.value % 2 === 0) {
      // Halo sutil indicando que o cristal par pode ser dividido com um toque rápido
      if ((Math.floor(t * 6) & 1) === 0) {
        P1(ctx, R(x - 10), R(y), piece.type === 'citrine' ? '#f7df86' : '#a8f0f0');
        P1(ctx, R(x + 10), R(y), piece.type === 'citrine' ? '#f7df86' : '#a8f0f0');
      }
    }

    const spr = getPieceSprite(piece);
    const gw = spr.width * 0.5, gh = spr.height * 0.5;
    ctx.drawImage(spr, RH(x - gw / 2), RH(y - gh / 2), gw, gh);

    // Selo dourado-esmeralda caso o cristal já tenha sido abençoado pelo Altar de Esmeralda
    if (piece.boosted && !piece.shadow) {
      drawStar(ctx, R(x), R(y + 9), 2, '#ffffff', '#8ed46a');
    }

    const val = clamp(piece.value || 1, 1, 6);
    const orbCoords = EXTERNAL_ORB_ARCS[val] || EXTERNAL_ORB_ARCS[1];
    const recentlyChanged = Boolean(piece.lastValChangeAt && (t - piece.lastValChangeAt) < 0.28);
    const pal = getOrbPalette(piece);

    ctx.fillStyle = pal.link;
    for (let i = 0; i < orbCoords.length; i++) {
      const [ox, oy] = orbCoords[i];
      ctx.fillRect(RH(x + ox * 0.65), RH(y + oy * 0.72), 1, 1);
      if (i < orbCoords.length - 1) {
        const [nx, ny] = orbCoords[i + 1];
        ctx.fillRect(RH(x + (ox + nx) * 0.5), RH(y + (oy + ny) * 0.5), 1, 1);
      }
    }

    for (let i = 0; i < orbCoords.length; i++) {
      const [ox, oy] = orbCoords[i];
      drawExternalOrb(ctx, x + ox, y + oy, pal.core, pal.mid, pal.rim, recentlyChanged);
    }
  }

  function drawEmeraldAltar(ctx, altar, t) {
    if (!altar) return;
    const f12 = Math.floor(t * SPRITE_FPS);
    const ax = R(altar.x), ay = R(altar.y);
    const bob = (f12 & 2) ? -1 : 0;

    // Pedestal de pedra esculpida com musgo
    ctx.fillStyle = '#262020';
    ctx.fillRect(ax - 11, ay + 6, 22, 8);
    ctx.fillStyle = '#524846';
    ctx.fillRect(ax - 10, ay + 7, 20, 6);
    ctx.fillStyle = '#539e43';
    ctx.fillRect(ax - 10, ay + 6, 20, 2);

    // Aura de duplicação em anel esmeralda
    drawRing(ctx, ax, ay - 2, 14 + (f12 & 1), '#7ec456');
    const spr = GEM_SPRITES.emerald_core;
    const gw = spr.width * 0.5, gh = spr.height * 0.5;
    ctx.drawImage(spr, RH(ax - gw / 2), RH(ay - 4 + bob - gh / 2), gw, gh);
    if ((f12 & 1) === 0) {
      drawStar(ctx, ax - 9, ay - 10, 2, '#ffffff', '#a5e06c');
      drawStar(ctx, ax + 9, ay - 8, 2, '#ffffff', '#f2cc6b');
    }
  }

  function drawEquationAura(ctx, eq, t, members = []) {
    if (!eq || eq.broken) return;
    const f12 = Math.floor(t * SPRITE_FPS);
    const isReceptive = Boolean(eq.expanded || eq.dropHover || eq.removeHover);
    const rx = isReceptive ? 46 : 29;
    const ry = isReceptive ? 26 : 18;
    const cx = R(eq.x), cy = R(eq.y);

    if (isReceptive) {
      const fillCol = eq.dropHover ? '#243c4a' : (eq.shadow ? '#241836' : '#1c2c3d');
      ctx.fillStyle = fillCol;
      for (let dy = -ry + 2; dy <= ry - 2; dy++) {
        for (let dx = -rx + 2; dx <= rx - 2; dx++) {
          if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 0.92 && bay(cx + dx, cy + dy) < (eq.dropHover ? 9 : 6)) {
            ctx.fillRect(cx + dx, cy + dy, 1, 1);
          }
        }
      }
    }

    const rimA = eq.dropHover
      ? '#f2cc6b'
      : eq.removeHover
        ? '#e68a49'
        : (eq.shadow ? '#b8a6d9' : (eq.expanded ? '#a8d8e6' : '#d9c398'));
    const rimB = eq.dropHover
      ? '#a8d8e6'
      : eq.removeHover
        ? '#c45131'
        : (eq.shadow ? '#5e4d82' : (eq.expanded ? '#5e96ab' : '#8c7248'));

    for (let a = 0; a < 76; a++) {
      const ang = (a / 76) * Math.PI * 2;
      const wave = Math.sin(ang * 4 + f12 * 0.6) * (isReceptive ? 1.2 : 0.7);
      const px = R(cx + Math.cos(ang) * (rx + wave));
      const py = R(cy + Math.sin(ang) * (ry + wave * 0.6));
      P1(ctx, px, py, ((a + f12) & 1) ? rimA : rimB);
    }

    if (members && members.length > 0) {
      const sorted = members.slice().sort((a, b) => a.x - b.x);
      const beamHi = eq.shadow ? '#e2d4f7' : '#fff6cc';
      const beamLo = eq.shadow ? '#8572ab' : '#68b8c4';
      for (let i = 0; i < sorted.length - 1; i++) {
        const p1 = sorted[i], p2 = sorted[i + 1];
        const x1 = R(p1.x), y1 = R(p1.y);
        const x2 = R(p2.x), y2 = R(p2.y);
        const steps = Math.max(1, Math.hypot(x2 - x1, y2 - y1));
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          const lx = R(x1 + (x2 - x1) * u);
          const ly = R(y1 + (y2 - y1) * u + Math.sin(u * Math.PI * 2 + f12 * 0.8) * 1.1);
          P1(ctx, lx, ly, ((s + f12) & 1) ? beamHi : beamLo);
          P1(ctx, lx, ly + 1, beamLo);
        }
      }
      for (const m of sorted) {
        drawRing(ctx, R(m.x), R(m.y), 11, eq.shadow ? '#8572ab' : '#68b8c4');
      }
    } else if (!isReceptive) {
      const lineY = cy + ((f12 & 1) ? 0 : 1);
      for (let x = cx - rx + 6; x <= cx + rx - 6; x += 2) {
        P1(ctx, x, lineY, eq.shadow ? '#8572ab' : '#a8d8e6');
      }
    }

    if (eq.dropHover || eq.removeHover) {
      const label = eq.dropHover ? 'Solte para adicionar' : 'Solte para retirar';
      const bw = 96, bh = 13;
      const bx = clamp(R(cx - bw / 2), 6, W - bw - 6);
      const by = Math.max(22, R(cy - ry - 16));
      drawParchmentBox(ctx, bx, by, bw, bh);
      drawPixelTextCentered(ctx, label, bx + bw / 2, by + 3, eq.dropHover ? '#3e7338' : '#8c2d1f', null, bw - 6, 9);
    }
  }

  // ============================================================================
  // 2. CRISTAL GIGANTE DE CADA GUARDIÃ + OBSTÁCULOS + PORTÃO ANCESTRAL FINAL
  // ============================================================================
  const GIANT_BIOME_CRYSTAL_CACHE = {};

  function buildGiantBiomeCrystal(biomeKey, guardianKey, pal, crackStage = 0, flashMode = false) {
    const CW = 136, CH = 104;
    const c = document.createElement('canvas');
    c.width = CW;
    c.height = CH;
    c.hib = true;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    const put = (px, py, col) => {
      if (px >= 0 && py >= 0 && px < CW && py < CH) {
        x.fillStyle = col;
        x.fillRect(px, py, 1, 1);
      }
    };

    const cx = 68;
    const drawSpire = (sx, sy, sw, sh, tilt) => {
      for (let py = 0; py < sh; py++) {
        const hw = Math.max(1, Math.round(sw * (1 - py / sh)));
        const ox = Math.round((py / sh) * tilt);
        for (let dx = -hw; dx <= hw; dx++) {
          const px = sx + ox + dx, y = sy + py;
          if (flashMode) { put(px, y, '#ffffff'); continue; }
          const ndx = dx / Math.max(1, hw);
          let col = pal.M;
          if (Math.abs(ndx) > 0.85) col = ndx < 0 ? pal.H : pal.K;
          else if (ndx < -0.25) col = ((px + y) & 1) ? pal.L : pal.M;
          else if (ndx > 0.35) col = pal.D;
          put(px, y, col);
        }
      }
    };
    drawSpire(cx - 46, 0, 14, 54, -12);
    drawSpire(cx + 46, 0, 14, 54, 12);
    drawSpire(cx - 32, 0, 13, 70, -6);
    drawSpire(cx + 32, 0, 13, 70, 6);

    const maxHW = 46;
    for (let py = 0; py < 100; py++) {
      let hw = maxHW;
      if (py < 16) hw = Math.round(32 + (py / 16) * 14);
      else if (py > 56) hw = Math.max(3, Math.round(maxHW * (1 - (py - 56) / 44)));

      for (let dx = -hw; dx <= hw; dx++) {
        const px = cx + dx;
        if (flashMode) { put(px, py, '#ffffff'); continue; }
        const ndx = dx / Math.max(1, hw);
        const adx = Math.abs(ndx);
        let col = pal.M;
        if (adx > 0.92 || py === 99) col = ndx < 0 ? pal.W : pal.K;
        else if (Math.abs(adx - 0.48) < 0.05) col = pal.H;
        else if (ndx < -0.48) col = ((px + py) & 1) ? pal.H : pal.L;
        else if (ndx < 0) col = ((px + py) & 1) ? pal.L : pal.M;
        else if (ndx < 0.48) col = pal.D;
        else col = pal.K;
        put(px, py, col);
      }
    }

    const actorSet = E.SpriteBank && E.SpriteBank[guardianKey];
    if (!flashMode && actorSet && actorSet.back_silhouette) {
      const silSpr = actorSet.back_silhouette[0];
      x.globalAlpha = 0.85;
      x.drawImage(silSpr, cx - 24, 14);
      x.globalAlpha = 1.0;

      const crackPaths = [
        [[-10, 14], [-7, 24], [-3, 34], [2, 44], [6, 54], [3, 66], [0, 76]],
        [[18, 18], [14, 28], [8, 38], [2, 46], [-8, 56], [-15, 68], [-10, 82]],
        [[-24, 26], [-18, 36], [-10, 46], [0, 54], [12, 64], [20, 76], [8, 90]]
      ];
      for (let s = 0; s < crackStage; s++) {
        const path = crackPaths[s];
        for (let i = 0; i < path.length - 1; i++) {
          const [x0, y0] = path[i], [x1, y1] = path[i + 1];
          const steps = Math.max(1, Math.hypot(x1 - x0, y1 - y0));
          for (let k = 0; k <= steps; k++) {
            const u = k / steps;
            const rx = Math.round(cx + x0 + (x1 - x0) * u);
            const ry = Math.round(y0 + (y1 - y0) * u);
            put(rx, ry, '#ffffff');
            put(rx + 1, ry, pal.H);
          }
        }
      }
    }
    return c;
  }

  function getGiantBiomeCrystalFrames(biomeKey) {
    if (GIANT_BIOME_CRYSTAL_CACHE[biomeKey]) return GIANT_BIOME_CRYSTAL_CACHE[biomeKey];
    const cfg = biomeKey === 'forest'
      ? { actor: 'araci', pal: { W: '#ebffe6', H: '#9be884', L: '#63b54d', M: '#3a7a2c', D: '#24521c', K: '#143310' } }
      : biomeKey === 'river'
        ? { actor: 'irece', pal: { W: '#ebffff', H: '#9ef0f5', L: '#57bbc9', M: '#318091', D: '#1f5563', K: '#11333d' } }
        : { actor: 'jurema', pal: { W: '#fff6d9', H: '#f7c272', L: '#d97a41', M: '#9e4724', D: '#6b2914', K: '#3d1409' } };
    GIANT_BIOME_CRYSTAL_CACHE[biomeKey] = [
      buildGiantBiomeCrystal(biomeKey, cfg.actor, cfg.pal, 0, false),
      buildGiantBiomeCrystal(biomeKey, cfg.actor, cfg.pal, 1, false),
      buildGiantBiomeCrystal(biomeKey, cfg.actor, cfg.pal, 2, false),
      buildGiantBiomeCrystal(biomeKey, cfg.actor, cfg.pal, 3, false),
      buildGiantBiomeCrystal(biomeKey, cfg.actor, cfg.pal, 0, true)
    ];
    return GIANT_BIOME_CRYSTAL_CACHE[biomeKey];
  }

  function drawGiantBiomeCrystal(ctx, biomeKey, crackRatio, flashMode, broken, t) {
    if (broken) return;
    const frames = getGiantBiomeCrystalFrames(biomeKey);
    const stage = clamp(Math.floor(crackRatio * 3), 0, 3);
    const spr = flashMode ? frames[4] : frames[stage];
    const w = spr.width * 0.5, h = spr.height * 0.5;
    ctx.drawImage(spr, RH(176 - w / 2), 20, w, h);
    if (!flashMode && (Math.floor(t * SPRITE_FPS) & 1) === 0) {
      P1(ctx, 176, 40, '#ffffff');
    }
  }

  function drawBiomeObstacle(ctx, biomeKey, decayRatio, t) {
    if (decayRatio >= 1) return;
    const f12 = Math.floor(t * SPRITE_FPS);
    const maxH = R((1 - decayRatio) * 94);
    if (maxH <= 2) return;
    const baseX = 258, baseY = 142;

    const pal = biomeKey === 'forest'
      ? { k0: '#211814', k1: '#3b2a21', k2: '#573f31', vein: '#7ec456' }
      : biomeKey === 'river'
        ? { k0: '#18222e', k1: '#2a3b4f', k2: '#435b75', vein: '#6bd4db' }
        : { k0: '#2b1914', k1: '#4d2c22', k2: '#734535', vein: '#e68a49' };

    for (let dy = 0; dy < maxH; dy++) {
      const y = baseY - dy;
      const tap = 1 - (dy / 104) * 0.45;
      const hw = Math.max(4, R(20 * tap + Math.sin(dy * 0.25) * 2));
      for (let dx = -hw; dx <= hw; dx++) {
        const x = baseX + dx;
        let col = pal.k1;
        if (Math.abs(dx) > hw - 2 || dy === maxH - 1) col = pal.k0;
        else if (dx < -hw * 0.25) col = pal.k2;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
      if (decayRatio > 0.15 && dy % 9 === 0) {
        P1(ctx, baseX + ((dy * 3) % 9) - 4, y, (f12 & 1) ? '#ffffff' : pal.vein);
      }
    }
  }

  function drawAncientSanctuaryGate(ctx, sealRatio, openRatio, t) {
    const f12 = Math.floor(t * SPRITE_FPS);
    const gx = 248, gy = 26, gw = 58, gh = 116;

    // Se o portão está se abrindo, revela o Panorama Radiante dos 4 Biomas ao fundo!
    if (openRatio > 0.02) {
      drawNextBiomePanorama(ctx, 'kingdom', openRatio, t, gx - 30, gy + 6, gw + 48, gh - 6);
    }

    const split = R(easeInOut(clamp(openRatio, 0, 1)) * 24);
    // Moldura monumental do Portão das Gemas
    ctx.fillStyle = '#1f1816';
    ctx.fillRect(gx - 30, gy, 60, gh);
    ctx.fillStyle = '#4a3a31';
    ctx.fillRect(gx - 28, gy + 2, 56, 10);

    // Folhas duplas de pedra ancestral que deslizam para os lados ao abrir
    const leafW = Math.max(2, 25 - split);
    for (const side of [-1, 1]) {
      const lx = side < 0 ? (gx - 26) : (gx + 26 - leafW);
      ctx.fillStyle = '#382d29';
      ctx.fillRect(lx, gy + 12, leafW, gh - 12);
      ctx.fillStyle = '#574740';
      ctx.fillRect(lx + 1, gy + 13, Math.max(1, leafW - 2), gh - 14);
      ctx.fillStyle = '#bfa36f';
      ctx.fillRect(side < 0 ? lx + leafW - 2 : lx, gy + 12, 2, gh - 12);
    }

    // Os 4 Relicários Primordiais cravados no arco superior do Portão
    const gems = [
      [gx - 18, gy + 7, '#68b8c4', sealRatio >= 0.25],
      [gx - 6,  gy + 6, '#7ec456', sealRatio >= 0.50],
      [gx + 6,  gy + 6, '#57bbc9', sealRatio >= 0.75],
      [gx + 18, gy + 7, '#e68a49', sealRatio >= 0.99]
    ];
    for (let i = 0; i < gems.length; i++) {
      const [rx, ry, col, unlocked] = gems[i];
      ctx.fillStyle = '#d9bf86';
      ctx.fillRect(rx - 3, ry - 3, 7, 7);
      ctx.fillStyle = unlocked ? col : '#2b211d';
      ctx.fillRect(rx - 2, ry - 2, 5, 5);
      if (unlocked) {
        P1(ctx, rx - 1, ry - 1, '#ffffff');
        if (((f12 + i) & 3) === 0) drawStar(ctx, rx, ry - 4, 2, '#ffffff', col);
      }
    }
  }

  // ============================================================================
  // 3. CENÁRIOS HI-BIT 640x360 PROCEDURAIS (CACHE LAZY POR BIOMA)
  // ============================================================================
  const BIOME_PALETTES = {
    forest: {
      seed: 3102,
      dark: {
        sky: ['#1d2424', '#293332', '#394745', '#52635f'],
        far: '#18211f', mid: '#121917', midHi: '#283632',
        rock: ['#1a1715', '#292320', '#3d342f', '#52463f'],
        moss: ['#233b22', '#31542f', '#447040', '#5a8f54'],
        cA: '#3d7a47', cHi: '#a8e6b0', cLo: '#214728'
      },
      cinematic: {
        sky: ['#07100c', '#0d1c15', '#142b20', '#1e3d2e'],
        far: '#09140f', mid: '#060d0a', midHi: '#162e22',
        rock: ['#0c0a09', '#171311', '#241e1b', '#332b27'],
        moss: ['#132b16', '#1e4222', '#2c5e31', '#3f8045'],
        cA: '#68c958', cHi: '#ffffff', cLo: '#275920'
      },
      lit: {
        sky: ['#35634d', '#548c68', '#84ba86', '#cae6b5'],
        far: '#2a523d', mid: '#1f3f2e', midHi: '#467856',
        rock: ['#29201b', '#403129', '#59453a', '#755c4e'],
        moss: ['#2f6e2b', '#4ca13f', '#7ac754', '#a8eb75'],
        cA: '#68cf57', cHi: '#f2ffeb', cLo: '#2d6e26'
      }
    },
    river: {
      seed: 4203,
      dark: {
        sky: ['#1c2433', '#283447', '#384961', '#516782'],
        far: '#18202e', mid: '#121824', midHi: '#28364d',
        rock: ['#181b21', '#252a33', '#373e4a', '#4c5666'],
        moss: ['#1e4247', '#2c5e63', '#3e7d82', '#569ea3'],
        cA: '#3d8799', cHi: '#a8eef5', cLo: '#1f4c59'
      },
      cinematic: {
        sky: ['#070e17', '#0d1929', '#14263d', '#1e3854'],
        far: '#09121f', mid: '#050b14', midHi: '#172b45',
        rock: ['#0a0c10', '#14181f', '#202630', '#2e3745'],
        moss: ['#102b30', '#1a444a', '#266169', '#38838c'],
        cA: '#57d1de', cHi: '#ffffff', cLo: '#215963'
      },
      lit: {
        sky: ['#386c8a', '#5896b5', '#87c4de', '#ccf0fa'],
        far: '#2d5873', mid: '#214459', midHi: '#497d99',
        rock: ['#222830', '#343e4a', '#4b5869', '#67788c'],
        moss: ['#286b5c', '#3ea188', '#68cfad', '#9ef0ce'],
        cA: '#54d2e0', cHi: '#ebffff', cLo: '#256c78'
      }
    },
    caatinga: {
      seed: 5304,
      dark: {
        sky: ['#2b2220', '#3d302d', '#54433e', '#705a52'],
        far: '#241c1a', mid: '#1a1412', midHi: '#382b27',
        rock: ['#241a16', '#382822', '#4f3930', '#694d41'],
        moss: ['#423d24', '#5c5432', '#786e42', '#948854'],
        cA: '#9e5031', cHi: '#ffd7b8', cLo: '#542414'
      },
      cinematic: {
        sky: ['#120a0c', '#1f1114', '#301a1d', '#452629'],
        far: '#170d0e', mid: '#0d0708', midHi: '#2e1a1c',
        rock: ['#120b09', '#211410', '#33201a', '#472d24'],
        moss: ['#292414', '#3d361e', '#574d2b', '#736639'],
        cA: '#e6783e', cHi: '#ffffff', cLo: '#662812'
      },
      lit: {
        sky: ['#6e3d2c', '#a66238', '#d9964e', '#fae09e'],
        far: '#593224', mid: '#45251a', midHi: '#854e35',
        rock: ['#362017', '#543324', '#784a35', '#9c6449'],
        moss: ['#3b6e28', '#59993b', '#82c255', '#b4e67a'],
        cA: '#f0803c', cHi: '#fff8db', cLo: '#823415'
      }
    },
    sanctuary: {
      seed: 6405,
      dark: {
        sky: ['#1a2133', '#25314a', '#354666', '#4d6487'],
        far: '#161d2e', mid: '#101521', midHi: '#273552',
        rock: ['#1c1719', '#2b2326', '#403438', '#59494f'],
        moss: ['#244a3d', '#356b59', '#4b917a', '#6bc2a6'],
        cA: '#5eb8cf', cHi: '#e6fcff', cLo: '#2b5d6e'
      },
      cinematic: {
        sky: ['#090c17', '#101629', '#18223d', '#243357'],
        far: '#0c1020', mid: '#070a14', midHi: '#1c2845',
        rock: ['#0d0b0c', '#171316', '#241e22', '#362d33'],
        moss: ['#142b24', '#1f4237', '#2e6151', '#428772'],
        cA: '#6ad8eb', cHi: '#ffffff', cLo: '#296373'
      },
      lit: {
        sky: ['#395b80', '#5884ab', '#84b4d4', '#caebfa'],
        far: '#2c4969', mid: '#20364f', midHi: '#496e94',
        rock: ['#261f22', '#3b3136', '#54464d', '#736069'],
        moss: ['#2e6e49', '#479e68', '#6ec98c', '#a1f0b8'],
        cA: '#70deed', cHi: '#ffffff', cLo: '#327282'
      }
    }
  };

  const BIOME_BG_CACHE = {};

  function buildBiomeBackgroundMode(biomeKey, mode) {
    const cfg = BIOME_PALETTES[biomeKey] || BIOME_PALETTES.forest;
    const P = cfg[mode] || cfg.dark;
    const rnd = mulberry(cfg.seed);
    const buf = new Uint32Array(HW * HH);

    const put = (x, y, h) => {
      x = R(x); y = R(y);
      if (x < 0 || y < 0 || x >= HW || y >= HH) return;
      buf[y * HW + x] = c32(h);
    };

    // 1. Céu / Atmosfera em bandas com dithering Bayer 4x4
    for (let y = 0; y < HH; y++) {
      const t = clamp(y / 290, 0, 0.999) * 3;
      const b0 = Math.floor(t);
      const frac = t - b0;
      for (let x = 0; x < HW; x++) {
        let b = b0;
        if (b < 3 && bay(x, y) / 16 < frac) b++;
        put(x, y, P.sky[b]);
      }
    }

    // 2. Silhuetas distantes em paralaxe (troncos gigantes na Floresta, quedas no Rio, chapadas na Caatinga)
    const pillars = [
      [56, 36, 290], [156, 46, 286], [282, 50, 292], [418, 46, 288], [542, 38, 290]
    ];
    for (const [cx, hw, maxH] of pillars) {
      const startY = biomeKey === 'caatinga' ? 88 : 22;
      for (let y = startY; y < maxH; y++) {
        const wobble = biomeKey === 'caatinga' ? Math.round((y - startY) * 0.08) : Math.round(Math.sin(y * 0.06 + cx) * 4);
        const curHW = hw + (biomeKey === 'caatinga' ? wobble : Math.round(Math.sin(y * 0.04) * 3));
        for (let x = cx - curHW; x <= cx + curHW; x++) {
          const mistFade = (y - 212) / 78;
          if (mistFade > 0 && bay(x, y) / 16 < mistFade) continue;
          put(x, y, P.far);
        }
      }
    }

    // Cachoeiras luminosas ao fundo no bioma do Rio quando restaurado
    if (biomeKey === 'river') {
      const fallCol = mode === 'lit' ? '#ccf5fc' : (mode === 'cinematic' ? '#296373' : '#3d5066');
      const fallHi = mode === 'lit' ? '#ffffff' : '#6bd4db';
      for (const [fx, fw] of [[112, 18], [348, 24]]) {
        for (let y = 34; y < 278; y++) {
          for (let dx = -fw; dx <= fw; dx++) {
            if (bay(fx + dx, y) < 11) {
              put(fx + dx, y, ((dx + y) % 5 === 0) ? fallHi : fallCol);
            }
          }
        }
      }
    }

    // 3. Camada média esculpida + mandacarus na Caatinga
    const midCols = [[26, 28, 298], [104, 24, 294], [488, 30, 298], [608, 34, 302]];
    for (const [cx, hw, maxH] of midCols) {
      const topY = biomeKey === 'caatinga' ? 118 : 16;
      for (let y = topY; y < maxH; y++) {
        for (let dx = -hw; dx <= hw; dx++) {
          const px = cx + dx;
          const mistFade = (y - 236) / 66;
          if (mistFade > 0 && bay(px, y) / 16 < mistFade) continue;
          const isLit = dx < -hw * 0.35 && ((px + y) & 1) === 0;
          put(px, y, isLit ? P.midHi : P.mid);
        }
      }
    }

    if (biomeKey === 'caatinga') {
      const cactCol = mode === 'lit' ? '#4f8f38' : '#3b3828';
      const cactHi = mode === 'lit' ? '#8ed46a' : '#57523a';
      for (const [mx, my, mh] of [[86, 280, 62], [452, 280, 70], [568, 280, 54]]) {
        for (let dy = 0; dy < mh; dy++) {
          for (let dx = -5; dx <= 5; dx++) {
            put(mx + dx, my - dy, dx < -1 ? cactHi : cactCol);
          }
        }
        for (const side of [-1, 1]) {
          for (let ay = 18; ay < 38; ay++) {
            for (let dx = 0; dx < 12; dx++) {
              if (ay < 24 || dx >= 7) put(mx + side * (5 + dx), my - ay, cactCol);
            }
          }
          if (mode === 'lit') {
            put(mx + side * 14, my - 39, '#ffffff');
            put(mx + side * 15, my - 39, '#ffb35c');
          }
        }
      }
    }

    // 4. Moldura superior (copa de folhas na Floresta, arco mineral nos demais)
    for (let x = 0; x < HW; x++) {
      const archH = Math.round(34 + Math.sin(x * 0.028) * 8 + (x < 84 || x > 556 ? 20 : 0));
      for (let y = 0; y < archH; y++) {
        const cSet = biomeKey === 'forest' ? P.moss : P.rock;
        const d = (archH - y) / archH;
        put(x, y, d < 0.22 ? cSet[0] : (d < 0.55 ? cSet[1] : cSet[2]));
      }
      if (biomeKey === 'forest' && (x % 9) < 3) {
        const vLen = 6 + ((x * 5) % 14);
        for (let vy = 0; vy < vLen; vy++) put(x, archH + vy, vy < vLen - 3 ? P.moss[1] : P.moss[3]);
      }
    }

    // 5. Plataforma de Pedra Esculpida + Cobertura Orgânica e Cristais Ambientais (y = 284..360)
    for (let y = 284; y < HH; y++) {
      for (let x = 0; x < HW; x++) {
        const fx = ((x + Math.sin(y * 0.08) * 6) % 34 + 34) % 34;
        const fy = (y - 284) % 22;
        const seam = fx < 2 || fy < 2;
        let col = P.rock[1];
        if (seam || y > 346) col = P.rock[0];
        else if (fx + fy < 18) col = ((x + y) & 1) === 0 ? P.rock[3] : P.rock[2];
        else if (fx + fy < 34) col = P.rock[2];
        put(x, y, col);
      }
    }

    for (let x = 0; x < HW; x++) {
      const mH = 4 + Math.round((Math.sin(x * 0.09) + 1) * 2.5);
      for (let dy = -3; dy < mH; dy++) {
        const py = 284 + dy;
        const col = dy < -1 ? P.moss[3] : (dy < 1 ? P.moss[2] : (dy < 3 ? P.moss[1] : P.moss[0]));
        put(x, py, col);
      }
    }

    // Afloramentos cristalinos acesos do ambiente (iluminação da Parte 1 do musical!)
    for (const [cx, cy, ch] of [[38, 282, 22], [62, 284, 15], [586, 282, 20], [608, 284, 14]]) {
      for (let dy = 0; dy < ch; dy++) {
        const hw = Math.max(1, Math.round((1 - dy / ch) * 6));
        for (let dx = -hw; dx <= hw; dx++) {
          put(cx + dx, cy - dy, dx < 0 ? P.cHi : (dx === 0 ? P.cA : P.cLo));
        }
      }
    }

    // Poeira luminosa sutil no modo lit/cinematic
    for (let i = 0; i < 40; i++) {
      const sx = Math.floor(rnd() * HW);
      const sy = 44 + Math.floor(rnd() * 210);
      if (mode !== 'dark') put(sx, sy, P.cHi);
    }

    return buf;
  }

  function getBiomeBgSet(biomeKey) {
    if (!BIOME_BG_CACHE[biomeKey]) {
      const compositeImage = new ImageData(HW, HH);
      BIOME_BG_CACHE[biomeKey] = {
        dark: buildBiomeBackgroundMode(biomeKey, 'dark'),
        cinematic: buildBiomeBackgroundMode(biomeKey, 'cinematic'),
        lit: buildBiomeBackgroundMode(biomeKey, 'lit'),
        image: compositeImage,
        u32: new Uint32Array(compositeImage.data.buffer)
      };
    }
    return BIOME_BG_CACHE[biomeKey];
  }

  // ============================================================================
  // 4. ELEMENTOS DO SHOW MUSICAL EM 2 PARTES (TEATRO DE SOMBRAS, NUVEM, TAMBOR E PANORAMA)
  // ============================================================================
  function isWorldChorusActive(mt) {
    return (mt >= 25.0 && mt <= 31.0) || (mt >= 39.0 && mt <= 45.0) || (mt >= 48.0 && mt <= 55.5);
  }

  function drawBiomeShadowPlay(ctx, biomeKey, mt, tq, gx, gy) {
    const f12 = Math.floor(tq * SPRITE_FPS);
    const wallX = 56, wallY = 36, wallW = 208, wallH = 74;

    // Feixes suaves de luz cristalina projetando o mural de sombras na parede
    const rimCol = biomeKey === 'forest' ? '#68c958' : (biomeKey === 'river' ? '#57d1de' : '#e6783e');
    const silDark = '#090d14';
    const silGlow = biomeKey === 'forest' ? '#a5e06c' : (biomeKey === 'river' ? '#9ef0ff' : '#ffd35a');

    ctx.fillStyle = 'rgba(18, 28, 38, 0.42)';
    ctx.fillRect(wallX, wallY, wallW, wallH);
    ctx.fillStyle = rimCol;
    ctx.fillRect(wallX, wallY, wallW, 1);
    ctx.fillRect(wallX, wallY + wallH - 1, wallW, 1);

    if (mt < 8.5) {
      // Ato 1 do mural: A harmonia ancestral da Guardiã com seu bioma
      for (let i = 0; i < 4; i++) {
        const sx = wallX + 32 + i * 46;
        const sy = wallY + 54;
        ctx.fillStyle = silGlow;
        ctx.fillRect(sx - 6, sy - 26, 12, 26);
        drawStar(ctx, sx, sy - 32 - ((f12 + i) & 1), 3, '#ffffff', rimCol);
      }
    } else if (mt < 16.5) {
      // Ato 2 do mural: Fumaça, seca e desordem cobrindo os cristais do bioma
      for (let k = 0; k < 7; k++) {
        const wx = wallX + 18 + k * 28 + Math.round(Math.sin(tq * 2 + k) * 4);
        const wy = wallY + 20 + ((k * 11) % 34);
        ctx.fillStyle = silDark;
        ctx.fillRect(wx - 10, wy - 6, 20, 12);
        P1(ctx, wx, wy, rimCol);
      }
    } else {
      // Ato 3 do mural: A semente de luz resistindo no cristal até o despertar
      const r = 10 + Math.round(Math.sin(tq * 3) * 4);
      drawRing(ctx, wallX + wallW / 2, wallY + 38, r, silGlow);
      drawRing(ctx, wallX + wallW / 2, wallY + 38, r + 6, rimCol);
      drawStar(ctx, wallX + wallW / 2, wallY + 38, 4, '#ffffff', silGlow);
    }

    // Feixe sutil entre a Guardiã em silhueta e o mural
    P1(ctx, R((gx + 160) * 0.5), R((gy - 18 + wallY + wallH) * 0.5), silGlow);
  }

  function drawGuardianCloudStory(ctx, biomeKey, mt, tq, gx, gy) {
    const bx = 94, by = 28, bw = 132, bh = 54;
    // Pequenas bolhas de pensamento subindo da Guardiã até a nuvem
    ctx.fillStyle = '#f4eedf';
    ctx.fillRect(R(gx + 6), R(gy - 36), 4, 4);
    ctx.fillRect(R((gx + bx + 20) * 0.5), R(by + bh + 3), 6, 5);

    // Moldura de nuvem em pixel art estilo Owlboy
    ctx.fillStyle = '#2c221e';
    ctx.fillRect(bx - 2, by, bw + 4, bh);
    ctx.fillRect(bx, by - 2, bw, bh + 4);
    ctx.fillStyle = '#f4eedf';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#d9cfb8';
    ctx.fillRect(bx + 2, by + bh - 3, bw - 4, 2);

    // Cena interna ilustrando a restauração do bioma
    const skyCol = biomeKey === 'forest' ? '#84ba86' : (biomeKey === 'river' ? '#87c4de' : '#fae09e');
    const landCol = biomeKey === 'forest' ? '#367030' : (biomeKey === 'river' ? '#2c6880' : '#a66238');
    ctx.fillStyle = skyCol;
    ctx.fillRect(bx + 6, by + 6, bw - 12, bh - 12);
    ctx.fillStyle = landCol;
    ctx.fillRect(bx + 6, by + bh - 18, bw - 12, 12);

    const f12 = Math.floor(tq * SPRITE_FPS);
    for (let i = 0; i < 3; i++) {
      drawStar(ctx, bx + 28 + i * 38, by + 20 + ((f12 + i) & 1) * 2, 3, '#ffffff', '#f2cc6b');
    }
  }

  function drawCloudPopParticles(ctx, elapsed) {
    const r = R(12 + elapsed * 52);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const px = R(160 + Math.cos(ang) * r);
      const py = R(54 + Math.sin(ang) * (r * 0.55));
      ctx.fillStyle = '#f4eedf';
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }
  }

  function drawMagicCrystalDrum(ctx, cx, cy, tq) {
    // Projeção mágica de tambor feita por dois cristais com duas pedras manipuladas por magia
    const f12 = Math.floor(tq * SPRITE_FPS);
    const beat = (f12 % 4) === 0;
    ctx.drawImage(GEM_SPRITES.white_pure, RH(cx - 22), RH(cy - 6), 17, 21);
    ctx.drawImage(GEM_SPRITES.rose_pure, RH(cx + 5), RH(cy - 6), 17, 21);

    // Membrana translúcida de luz entre os dois cristais
    ctx.fillStyle = beat ? '#ffffff' : '#9ef0ff';
    ctx.fillRect(cx - 10, cy, 20, 3);
    if (beat) drawRing(ctx, cx, cy + 1, 12, '#f2cc6b');

    // Duas pedras flutuantes batendo alternadamente por magia
    const leftY = cy - 10 + ((f12 % 4 === 0) ? 7 : 0);
    const rightY = cy - 10 + ((f12 % 4 === 2) ? 7 : 0);
    ctx.fillStyle = '#6e635f';
    ctx.fillRect(cx - 8, leftY, 5, 5);
    ctx.fillRect(cx + 3, rightY, 5, 5);
    P1(ctx, cx - 6, leftY - 1, '#f2cc6b');
    P1(ctx, cx + 5, rightY - 1, '#f2cc6b');
  }

  function drawNextBiomePanorama(ctx, nextBiome, openProgress, tq, px = 228, py = 34, pw = 86, ph = 108) {
    const p = clamp(openProgress, 0, 1);
    if (p <= 0) return;
    const w = Math.max(4, R(pw * easeInOut(p)));
    const x0 = px + (pw - w);

    const sky = nextBiome === 'river' ? '#87c4de' : (nextBiome === 'caatinga' ? '#f5c77e' : '#9be8c8');
    const mid = nextBiome === 'river' ? '#3ca1b0' : (nextBiome === 'caatinga' ? '#c46835' : '#539e43');
    const low = nextBiome === 'river' ? '#236c7a' : (nextBiome === 'caatinga' ? '#8c3f23' : '#2f6328');

    ctx.fillStyle = '#241c19';
    ctx.fillRect(x0 - 2, py - 2, w + 4, ph + 4);
    ctx.fillStyle = sky;
    ctx.fillRect(x0, py, w, ph);
    ctx.fillStyle = mid;
    ctx.fillRect(x0, py + R(ph * 0.52), w, R(ph * 0.48));
    ctx.fillStyle = low;
    ctx.fillRect(x0, py + R(ph * 0.76), w, R(ph * 0.24));

    const f12 = Math.floor(tq * SPRITE_FPS);
    if (w > 24) {
      drawStar(ctx, x0 + R(w * 0.5), py + 22, 4, '#ffffff', '#fff6cc');
      if ((f12 & 1) === 0) {
        P1(ctx, x0 + R(w * 0.35), py + R(ph * 0.62), '#ffffff');
        P1(ctx, x0 + R(w * 0.7), py + R(ph * 0.68), '#ffffff');
      }
    }
  }

  // ============================================================================
  // 5. DADOS COMPLETOS DOS MUNDOS 2, 3, 4 E PORTÃO FINAL (NÓS 6..21)
  // ============================================================================
  const WORLD_SPECS = {
    forest: {
      key: 'forest',
      worldIndex: 2,
      hudLabel: 'Floresta',
      guardianKey: 'araci',
      guardianName: 'Araci',
      guardianPortrait: 'portrait_araci',
      socketKey: 'forest',
      nextBiome: 'river',
      nextWorldButton: 'Ir ao Rio >',
      worldClearedTitle: 'Mundo 2 Restaurado!',
      worldClearedLine1: 'Araci despertou a Esmeralda da Floresta!',
      worldClearedLine2: 'Rumo ao Rio das Águas Claras!',
      phaseClearedLine: 'As raízes da Floresta abriram passagem!',
      nodeSyncByLevel: {
        1: { ids: [6], next: 7 },
        2: { ids: [6, 7], next: 8 },
        3: { ids: [6, 7, 8], next: 9 },
        4: { ids: [6, 7, 8, 9, 10], next: 11 }
      },
      introDialogues: {
        1: [
          { speaker: 'Protagonista', portrait: 'portrait_protagonist', text: 'A Floresta inteira está coberta por cinzas silenciosas...' },
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'Ouça! A Guardiã da Esmeralda está cantando além dessas raízes petrificadas!' },
          { speaker: 'Voz Misteriosa', portrait: 'portrait_mystery_silhouette', text: 'Usem o Altar de Esmeralda para despertar a força das sementes!' }
        ],
        4: [
          { speaker: 'Protagonista', portrait: 'portrait_protagonist', text: 'Olhe no alto da copa! Outro cristal gigante envolto por raízes!' },
          { speaker: 'Voz Misteriosa', portrait: 'portrait_mystery_silhouette', text: 'A fumaça me prendeu aqui dentro! Harmonizem os cristais para libertar a mata!' },
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'Vamos juntos! Já sabemos combinar luz, Citrino, Esmeralda e Fogo!' }
        ]
      },
      postDialogues: {
        1: [
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'A luz da Esmeralda dobrou nossa energia! As primeiras folhas voltaram a respirar!' }
        ],
        2: [
          { speaker: 'Voz Misteriosa', portrait: 'portrait_mystery_silhouette', text: 'Isso! Ao repartir o Citrino Solar, cada raio encontra seu lugar na mata!' }
        ],
        3: [
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'O coração da Floresta está logo à frente! Vamos libertar sua Guardiã!' }
        ],
        4: [
          { speaker: 'Araci', portrait: 'portrait_araci', text: 'Livre! Eu sou Araci, Guardiã da Floresta, e a Esmeralda voltou a pulsar!' },
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'Mais uma gema primordial acesa! Agora precisamos seguir até o Rio das Águas Claras!' }
        ]
      },
      tutorialsByLevel: {
        1: 'FOREST_EMERALD',
        2: 'FOREST_CITRINE'
      },
      musicalCaptions: [
        [0.5, 8.0, 'Era uma mata inteira a cantar, onde cada folha sabia dançar...'],
        [8.5, 16.0, 'Mas cinza e fumaça cobriram o chão, calando o pulsar do seu coração...'],
        [16.5, 23.5, 'Na semente oculta guardei minha voz, esperando a luz despertar entre nós!'],
        [24.5, 32.5, 'E você veio com a Ordem brilhar, fazendo as raízes voltarem ao ar!'],
        [33.0, 41.5, 'Duplica a energia, reparte o calor, cada cristal faz brotar uma flor!'],
        [42.0, 47.0, 'Bate o maracá no tambor de cristal, a mata renasce em acorde vital!'],
        [47.5, 55.5, 'Abre-se a trilha das Águas Claras: a Esmeralda voltou a cantar!']
      ],
      levels: {
        1: [
          {
            emeraldAltar: { x: 156, y: 104 },
            pieces: [
              { id: 'fo1_1_q', type: 'white', value: 2, shadow: false, x: 96, y: 96 },
              { id: 'fo1_1_s', type: 'white', value: 4, shadow: true, x: 214, y: 96 }
            ]
          },
          {
            emeraldAltar: { x: 156, y: 106 },
            pieces: [
              { id: 'fo1_2_q', type: 'white', value: 1, shadow: false, x: 92, y: 78 },
              { id: 'fo1_2_r', type: 'rose', value: 2, shadow: false, x: 92, y: 112 },
              { id: 'fo1_2_sq', type: 'white', value: 2, shadow: true, x: 216, y: 78 },
              { id: 'fo1_2_sr', type: 'rose', value: 4, shadow: true, x: 216, y: 112 }
            ]
          }
        ],
        2: [
          {
            pieces: [
              { id: 'fo2_1_c', type: 'citrine', value: 4, shadow: false, x: 108, y: 96 },
              { id: 'fo2_1_s1', type: 'citrine', value: 2, shadow: true, x: 206, y: 78 },
              { id: 'fo2_1_s2', type: 'citrine', value: 2, shadow: true, x: 206, y: 114 }
            ]
          },
          {
            emeraldAltar: { x: 154, y: 104 },
            pieces: [
              { id: 'fo2_2_c', type: 'citrine', value: 4, shadow: false, x: 94, y: 96 },
              { id: 'fo2_2_s1', type: 'citrine', value: 4, shadow: true, x: 216, y: 78 },
              { id: 'fo2_2_s2', type: 'citrine', value: 4, shadow: true, x: 216, y: 114 }
            ]
          },
          {
            pieces: [
              { id: 'fo2_3_c', type: 'citrine', value: 6, shadow: false, x: 96, y: 88 },
              { id: 'fo2_3_o', type: 'opal', value: 1, shadow: false, x: 138, y: 116 },
              { id: 'fo2_3_s1', type: 'citrine', value: 3, shadow: true, x: 214, y: 78 },
              { id: 'fo2_3_s2', type: 'citrine', value: 2, shadow: true, x: 214, y: 114 }
            ]
          }
        ],
        3: [
          {
            emeraldAltar: { x: 152, y: 108 },
            pieces: [
              { id: 'fo3_1_c', type: 'citrine', value: 4, shadow: false, x: 92, y: 78 },
              { id: 'fo3_1_q', type: 'white', value: 2, shadow: false, x: 92, y: 114 },
              { id: 'fo3_1_s1', type: 'citrine', value: 4, shadow: true, x: 216, y: 66 },
              { id: 'fo3_1_s2', type: 'citrine', value: 2, shadow: true, x: 216, y: 96 },
              { id: 'fo3_1_s3', type: 'white', value: 4, shadow: true, x: 216, y: 122 }
            ]
          },
          {
            pureEq: { x: 120, y: 74, expanded: false },
            shadowEq: { x: 210, y: 74, expanded: false },
            pieces: [
              { id: 'fo3_2_c', type: 'citrine', value: 4, shadow: false, x: 92, y: 114 },
              { id: 'fo3_2_r', type: 'rose', value: 3, shadow: false, x: 138, y: 114 },
              { id: 'fo3_2_sc1', type: 'citrine', value: 2, shadow: true, x: 202, y: 74, inEquation: 'shadow' },
              { id: 'fo3_2_sr1', type: 'rose', value: 3, shadow: true, x: 220, y: 74, inEquation: 'shadow' },
              { id: 'fo3_2_sc2', type: 'citrine', value: 2, shadow: true, x: 212, y: 116 }
            ]
          },
          {
            emeraldAltar: { x: 150, y: 114 },
            pureEq: { x: 116, y: 72, expanded: false },
            shadowEq: { x: 210, y: 72, expanded: false },
            pieces: [
              { id: 'fo3_3_q', type: 'white', value: 2, shadow: false, x: 88, y: 114 },
              { id: 'fo3_3_c', type: 'citrine', value: 4, shadow: false, x: 116, y: 114 },
              { id: 'fo3_3_sq', type: 'white', value: 4, shadow: true, x: 202, y: 72, inEquation: 'shadow' },
              { id: 'fo3_3_sc', type: 'citrine', value: 2, shadow: true, x: 220, y: 72, inEquation: 'shadow' },
              { id: 'fo3_3_sl', type: 'citrine', value: 2, shadow: true, x: 214, y: 116 }
            ]
          }
        ],
        4: [
          {
            emeraldAltar: { x: 154, y: 108 },
            pieces: [
              { id: 'fo4_1_c', type: 'citrine', value: 4, shadow: false, x: 96, y: 102 },
              { id: 'fo4_1_s1', type: 'citrine', value: 4, shadow: true, x: 216, y: 84 },
              { id: 'fo4_1_s2', type: 'citrine', value: 2, shadow: true, x: 216, y: 116 }
            ]
          },
          {
            emeraldAltar: { x: 148, y: 114 },
            pureEq: { x: 114, y: 78, expanded: false },
            shadowEq: { x: 212, y: 78, expanded: false },
            pieces: [
              { id: 'fo4_2_c', type: 'citrine', value: 6, shadow: false, x: 88, y: 116 },
              { id: 'fo4_2_r', type: 'rose', value: 2, shadow: false, x: 116, y: 116 },
              { id: 'fo4_2_sc', type: 'citrine', value: 3, shadow: true, x: 204, y: 78, inEquation: 'shadow' },
              { id: 'fo4_2_sr', type: 'rose', value: 4, shadow: true, x: 222, y: 78, inEquation: 'shadow' },
              { id: 'fo4_2_sl', type: 'citrine', value: 3, shadow: true, x: 216, y: 116 }
            ]
          },
          {
            emeraldAltar: { x: 146, y: 116 },
            pureEq: { x: 112, y: 78, expanded: false },
            shadowEq: { x: 212, y: 78, expanded: false },
            pieces: [
              { id: 'fo4_3_c', type: 'citrine', value: 4, shadow: false, x: 82, y: 114 },
              { id: 'fo4_3_q', type: 'white', value: 3, shadow: false, x: 106, y: 114 },
              { id: 'fo4_3_o', type: 'opal', value: 1, shadow: false, x: 126, y: 98 },
              { id: 'fo4_3_sc', type: 'citrine', value: 4, shadow: true, x: 204, y: 78, inEquation: 'shadow' },
              { id: 'fo4_3_sq', type: 'white', value: 2, shadow: true, x: 222, y: 78, inEquation: 'shadow' },
              { id: 'fo4_3_sl', type: 'citrine', value: 2, shadow: true, x: 216, y: 116 }
            ]
          }
        ]
      }
    },

    river: {
      key: 'river',
      worldIndex: 3,
      hudLabel: 'Rio',
      guardianKey: 'irece',
      guardianName: 'Irecê',
      guardianPortrait: 'portrait_irece',
      socketKey: 'river',
      nextBiome: 'caatinga',
      nextWorldButton: 'Ir à Caatinga >',
      worldClearedTitle: 'Mundo 3 Restaurado!',
      worldClearedLine1: 'Irecê despertou a Turmalina do Rio!',
      worldClearedLine2: 'Rumo ao Mundo da Caatinga!',
      phaseClearedLine: 'As águas claras abriram caminho!',
      nodeSyncByLevel: {
        1: { ids: [11], next: 12 },
        2: { ids: [11, 12], next: 13 },
        3: { ids: [11, 12, 13], next: 14 },
        4: { ids: [11, 12, 13, 14, 15], next: 16 }
      },
      introDialogues: {
        1: [
          { speaker: 'Protagonista', portrait: 'portrait_protagonist', text: 'As cachoeiras pararam de correr... a água parece pesada e escura.' },
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'A melodia de uma flauta ecoa sob as pedras do Rio!' },
          { speaker: 'Voz Misteriosa', portrait: 'portrait_mystery_silhouette', text: 'Repartam as gotas de Água-Marinha para devolver o fluxo da correnteza!' }
        ],
        4: [
          { speaker: 'Protagonista', portrait: 'portrait_protagonist', text: 'Um prisma imenso de Turmalina Paraíba está represando a nascente!' },
          { speaker: 'Voz Misteriosa', portrait: 'portrait_mystery_silhouette', text: 'Estou presa no gelo turvo da cachoeira! Harmonizem as águas e o fogo com cuidado!' },
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'Aguente firme! Vamos libertar a nascente agora mesmo!' }
        ]
      },
      postDialogues: {
        1: [
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'Que limpidez! As gotas de Água-Marinha fluem como notas na correnteza!' }
        ],
        2: [
          { speaker: 'Voz Misteriosa', portrait: 'portrait_mystery_silhouette', text: 'Maravilhoso! Já consigo ouvir a espuma das corredeiras despertando!' }
        ],
        3: [
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'Chegamos à grande queda d’água! Vamos libertar a Guardiã do Rio!' }
        ],
        4: [
          { speaker: 'Irecê', portrait: 'portrait_irece', text: 'Obrigada! Eu sou Irecê, e as Águas Claras voltaram a cantar!' },
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'Resta apenas uma gema primordial! Vamos levar essa brisa até a Caatinga!' }
        ]
      },
      tutorialsByLevel: {
        1: 'RIVER_AQUA'
      },
      musicalCaptions: [
        [0.5, 8.0, 'Corria o rio em turquesa e cristal, levando canções pelo vale ancestral...'],
        [8.5, 16.0, 'Mas lama e silêncio travaram a foz, prendendo no prisma o eco da voz...'],
        [16.5, 23.5, 'Nas gotas partidas guardei a maré, esperando um amigo guiado por fé!'],
        [24.5, 32.5, 'Reparte a corrente, reúne o esplendor, a água desperta limpando o rancor!'],
        [33.0, 41.5, 'A flauta de Irecê faz a fonte saltar, espelhos de luz começam a dançar!'],
        [42.0, 47.0, 'No tambor cristalino repica o trovão, cachoeira liberta em pura canção!'],
        [47.5, 55.5, 'Brilha no horizonte o sol do sertão: rumo à Caatinga de coração!']
      ],
      levels: {
        1: [
          {
            pieces: [
              { id: 'ri1_1_a', type: 'aqua', value: 4, shadow: false, x: 106, y: 96 },
              { id: 'ri1_1_s1', type: 'aqua', value: 2, shadow: true, x: 208, y: 78 },
              { id: 'ri1_1_s2', type: 'aqua', value: 2, shadow: true, x: 208, y: 114 }
            ]
          },
          {
            pieces: [
              { id: 'ri1_2_a1', type: 'aqua', value: 4, shadow: false, x: 96, y: 80 },
              { id: 'ri1_2_a2', type: 'aqua', value: 2, shadow: false, x: 96, y: 114 },
              { id: 'ri1_2_s1', type: 'aqua', value: 4, shadow: true, x: 214, y: 68 },
              { id: 'ri1_2_s2', type: 'aqua', value: 1, shadow: true, x: 214, y: 96 },
              { id: 'ri1_2_s3', type: 'aqua', value: 1, shadow: true, x: 214, y: 122 }
            ]
          }
        ],
        2: [
          {
            pieces: [
              { id: 'ri2_1_a', type: 'aqua', value: 4, shadow: false, x: 102, y: 96 },
              { id: 'ri2_1_s1', type: 'aqua', value: 1, shadow: true, x: 196, y: 72 },
              { id: 'ri2_1_s2', type: 'aqua', value: 1, shadow: true, x: 222, y: 72 },
              { id: 'ri2_1_s3', type: 'aqua', value: 1, shadow: true, x: 196, y: 116 },
              { id: 'ri2_1_s4', type: 'aqua', value: 1, shadow: true, x: 222, y: 116 }
            ]
          },
          {
            pieces: [
              { id: 'ri2_2_a', type: 'aqua', value: 6, shadow: false, x: 98, y: 86 },
              { id: 'ri2_2_o', type: 'opal', value: 1, shadow: false, x: 138, y: 116 },
              { id: 'ri2_2_s1', type: 'aqua', value: 3, shadow: true, x: 214, y: 78 },
              { id: 'ri2_2_s2', type: 'aqua', value: 2, shadow: true, x: 214, y: 114 }
            ]
          },
          {
            pieces: [
              { id: 'ri2_3_a', type: 'aqua', value: 4, shadow: false, x: 94, y: 78 },
              { id: 'ri2_3_r', type: 'rose', value: 4, shadow: false, x: 94, y: 114 },
              { id: 'ri2_3_o', type: 'opal', value: 2, shadow: false, x: 142, y: 96 },
              { id: 'ri2_3_sa', type: 'aqua', value: 3, shadow: true, x: 214, y: 78 },
              { id: 'ri2_3_sr', type: 'rose', value: 3, shadow: true, x: 214, y: 114 }
            ]
          }
        ],
        3: [
          {
            pieces: [
              { id: 'ri3_1_a', type: 'aqua', value: 4, shadow: false, x: 102, y: 96 },
              { id: 'ri3_1_s1', type: 'aqua', value: 3, shadow: true, x: 214, y: 78 },
              { id: 'ri3_1_s2', type: 'aqua', value: 1, shadow: true, x: 214, y: 114 }
            ]
          },
          {
            pureEq: { x: 118, y: 74, expanded: false },
            shadowEq: { x: 210, y: 74, expanded: false },
            pieces: [
              { id: 'ri3_2_a', type: 'aqua', value: 4, shadow: false, x: 92, y: 114 },
              { id: 'ri3_2_q', type: 'white', value: 2, shadow: false, x: 136, y: 114 },
              { id: 'ri3_2_sa', type: 'aqua', value: 2, shadow: true, x: 202, y: 74, inEquation: 'shadow' },
              { id: 'ri3_2_sq', type: 'white', value: 2, shadow: true, x: 220, y: 74, inEquation: 'shadow' },
              { id: 'ri3_2_sl', type: 'aqua', value: 2, shadow: true, x: 214, y: 116 }
            ]
          },
          {
            emeraldAltar: { x: 148, y: 114 },
            pureEq: { x: 114, y: 72, expanded: false },
            shadowEq: { x: 210, y: 72, expanded: false },
            pieces: [
              { id: 'ri3_3_a', type: 'aqua', value: 4, shadow: false, x: 92, y: 114 },
              { id: 'ri3_3_s1', type: 'aqua', value: 4, shadow: true, x: 202, y: 72, inEquation: 'shadow' },
              { id: 'ri3_3_s2', type: 'aqua', value: 2, shadow: true, x: 220, y: 72, inEquation: 'shadow' }
            ]
          }
        ],
        4: [
          {
            pieces: [
              { id: 'ri4_1_a', type: 'aqua', value: 4, shadow: false, x: 94, y: 84 },
              { id: 'ri4_1_c', type: 'citrine', value: 4, shadow: false, x: 94, y: 116 },
              { id: 'ri4_1_sa1', type: 'aqua', value: 2, shadow: true, x: 216, y: 68 },
              { id: 'ri4_1_sa2', type: 'aqua', value: 2, shadow: true, x: 216, y: 96 },
              { id: 'ri4_1_sc', type: 'citrine', value: 4, shadow: true, x: 216, y: 122 }
            ]
          },
          {
            pureEq: { x: 116, y: 78, expanded: false },
            shadowEq: { x: 212, y: 78, expanded: false },
            pieces: [
              { id: 'ri4_2_a', type: 'aqua', value: 6, shadow: false, x: 92, y: 116 },
              { id: 'ri4_2_r', type: 'rose', value: 2, shadow: false, x: 132, y: 116 },
              { id: 'ri4_2_sa', type: 'aqua', value: 3, shadow: true, x: 204, y: 78, inEquation: 'shadow' },
              { id: 'ri4_2_sr', type: 'rose', value: 2, shadow: true, x: 222, y: 78, inEquation: 'shadow' },
              { id: 'ri4_2_sl', type: 'aqua', value: 3, shadow: true, x: 216, y: 116 }
            ]
          },
          {
            pureEq: { x: 114, y: 78, expanded: false },
            shadowEq: { x: 212, y: 78, expanded: false },
            pieces: [
              { id: 'ri4_3_a', type: 'aqua', value: 4, shadow: false, x: 84, y: 114 },
              { id: 'ri4_3_q', type: 'white', value: 4, shadow: false, x: 114, y: 114 },
              { id: 'ri4_3_o', type: 'opal', value: 1, shadow: false, x: 144, y: 114 },
              { id: 'ri4_3_sa', type: 'aqua', value: 2, shadow: true, x: 204, y: 78, inEquation: 'shadow' },
              { id: 'ri4_3_sq', type: 'white', value: 3, shadow: true, x: 222, y: 78, inEquation: 'shadow' },
              { id: 'ri4_3_sl', type: 'aqua', value: 2, shadow: true, x: 216, y: 116 }
            ]
          }
        ]
      }
    },

    caatinga: {
      key: 'caatinga',
      worldIndex: 4,
      hudLabel: 'Caatinga',
      guardianKey: 'jurema',
      guardianName: 'Jurema',
      guardianPortrait: 'portrait_jurema',
      socketKey: 'caatinga',
      nextBiome: 'kingdom',
      nextWorldButton: 'Ir ao Santuário >',
      worldClearedTitle: 'Mundo 4 Restaurado!',
      worldClearedLine1: 'Jurema acendeu a Opala da Caatinga!',
      worldClearedLine2: 'As 4 Gemas estão prontas para o Portão!',
      phaseClearedLine: 'O alvorecer do sertão abriu o caminho!',
      nodeSyncByLevel: {
        1: { ids: [16], next: 17 },
        2: { ids: [16, 17], next: 18 },
        3: { ids: [16, 17, 18], next: 19 },
        4: { ids: [16, 17, 18, 19, 20], next: 21 }
      },
      introDialogues: {
        1: [
          { speaker: 'Protagonista', portrait: 'portrait_protagonist', text: 'Que calor silencioso... até os mandacarus adormeceram na seca.' },
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'Escute a rabeca distante! A última Guardiã resiste nas chapadas da Caatinga!' },
          { speaker: 'Voz Misteriosa', portrait: 'portrait_mystery_silhouette', text: 'Combinem todas as gemas da jornada para despertar a flor do sertão!' }
        ],
        4: [
          { speaker: 'Protagonista', portrait: 'portrait_protagonist', text: 'Encontramos! É um geodo monumental de Opala de Fogo!' },
          { speaker: 'Voz Misteriosa', portrait: 'portrait_mystery_silhouette', text: 'O calor descontrolado trancou minha canção aqui dentro! Equilibrem fogo, água e luz!' },
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'É a última Gema Primordial! Vamos libertá-la!' }
        ]
      },
      postDialogues: {
        1: [
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'A brisa dourada voltou a soprar entre as chapadas!' }
        ],
        2: [
          { speaker: 'Voz Misteriosa', portrait: 'portrait_mystery_silhouette', text: 'As cacimbas estão brilhando de novo! Continuem, falta bem pouco!' }
        ],
        3: [
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'O alto da chapada está logo ali! Vamos despertar a Guardiã da Caatinga!' }
        ],
        4: [
          { speaker: 'Jurema', portrait: 'portrait_jurema', text: 'Viva! Eu sou Jurema, e a Caatinga inteira floresceu sob o sol!' },
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'Reunimos todas as 4 Gemas Primordiais! Voltemos à Caverna para abrir a Porta das Gemas!' }
        ]
      },
      tutorialsByLevel: {},
      musicalCaptions: [
        [0.5, 8.0, 'Sob o céu do sertão reluzia o calor, cada flor de mandacaru tinha seu valor...'],
        [8.5, 16.0, 'Veio a sombra cruel ressecar o torrão, trancando a rabeca na pedra em carvão...'],
        [16.5, 23.5, 'Mas quem guarda raiz nunca perde o cantar, esperando o orvalho voltar a brilhar!'],
        [24.5, 32.5, 'Com a Ordem, a mata e as águas na mão, você trouxe harmonia pro meu coração!'],
        [33.0, 41.5, 'Canta a rabeca acordando o luar, brota água cristalina em todo lugar!'],
        [42.0, 47.0, 'No tambor de opala ressoa o baião, floresce a Caatinga em plena estação!'],
        [47.5, 55.5, 'Quatro gemas acesas num só esplendor: o Portão Ancestral vai se abrir com amor!']
      ],
      levels: {
        1: [
          {
            pieces: [
              { id: 'ca1_1_q1', type: 'white', value: 2, shadow: false, x: 88, y: 82 },
              { id: 'ca1_1_q2', type: 'white', value: 3, shadow: false, x: 88, y: 114 },
              { id: 'ca1_1_o', type: 'opal', value: 1, shadow: false, x: 136, y: 98 },
              { id: 'ca1_1_s', type: 'white', value: 4, shadow: true, x: 212, y: 96 }
            ]
          },
          {
            pieces: [
              { id: 'ca1_2_c', type: 'citrine', value: 6, shadow: false, x: 96, y: 84 },
              { id: 'ca1_2_o', type: 'opal', value: 2, shadow: false, x: 136, y: 114 },
              { id: 'ca1_2_s1', type: 'citrine', value: 2, shadow: true, x: 214, y: 78 },
              { id: 'ca1_2_s2', type: 'citrine', value: 2, shadow: true, x: 214, y: 114 }
            ]
          },
          {
            emeraldAltar: { x: 152, y: 108 },
            pieces: [
              { id: 'ca1_3_c', type: 'citrine', value: 4, shadow: false, x: 92, y: 78 },
              { id: 'ca1_3_r', type: 'rose', value: 2, shadow: false, x: 92, y: 114 },
              { id: 'ca1_3_sc', type: 'citrine', value: 4, shadow: true, x: 216, y: 78 },
              { id: 'ca1_3_sr', type: 'rose', value: 4, shadow: true, x: 216, y: 114 }
            ]
          }
        ],
        2: [
          {
            emeraldAltar: { x: 152, y: 108 },
            pieces: [
              { id: 'ca2_1_a', type: 'aqua', value: 4, shadow: false, x: 94, y: 96 },
              { id: 'ca2_1_s1', type: 'aqua', value: 4, shadow: true, x: 216, y: 78 },
              { id: 'ca2_1_s2', type: 'aqua', value: 2, shadow: true, x: 216, y: 114 }
            ]
          },
          {
            pieces: [
              { id: 'ca2_2_a', type: 'aqua', value: 4, shadow: false, x: 92, y: 78 },
              { id: 'ca2_2_q', type: 'white', value: 5, shadow: false, x: 92, y: 114 },
              { id: 'ca2_2_o', type: 'opal', value: 2, shadow: false, x: 138, y: 114 },
              { id: 'ca2_2_sa1', type: 'aqua', value: 3, shadow: true, x: 214, y: 66 },
              { id: 'ca2_2_sa2', type: 'aqua', value: 1, shadow: true, x: 214, y: 94 },
              { id: 'ca2_2_sq', type: 'white', value: 3, shadow: true, x: 214, y: 122 }
            ]
          },
          {
            pieces: [
              { id: 'ca2_3_c', type: 'citrine', value: 6, shadow: false, x: 92, y: 78 },
              { id: 'ca2_3_a', type: 'aqua', value: 4, shadow: false, x: 92, y: 114 },
              { id: 'ca2_3_o', type: 'opal', value: 1, shadow: false, x: 136, y: 96 },
              { id: 'ca2_3_sc1', type: 'citrine', value: 2, shadow: true, x: 198, y: 68 },
              { id: 'ca2_3_sc2', type: 'citrine', value: 3, shadow: true, x: 222, y: 68 },
              { id: 'ca2_3_sa1', type: 'aqua', value: 3, shadow: true, x: 198, y: 116 },
              { id: 'ca2_3_sa2', type: 'aqua', value: 1, shadow: true, x: 222, y: 116 }
            ]
          }
        ],
        3: [
          {
            pureEq: { x: 118, y: 72, expanded: false },
            shadowEq: { x: 210, y: 72, expanded: false },
            pieces: [
              { id: 'ca3_1_c', type: 'citrine', value: 4, shadow: false, x: 92, y: 114 },
              { id: 'ca3_1_a', type: 'aqua', value: 4, shadow: false, x: 134, y: 114 },
              { id: 'ca3_1_sc', type: 'citrine', value: 2, shadow: true, x: 202, y: 72, inEquation: 'shadow' },
              { id: 'ca3_1_sa', type: 'aqua', value: 2, shadow: true, x: 220, y: 72, inEquation: 'shadow' },
              { id: 'ca3_1_sl1', type: 'citrine', value: 2, shadow: true, x: 196, y: 116 },
              { id: 'ca3_1_sl2', type: 'aqua', value: 2, shadow: true, x: 222, y: 116 }
            ]
          },
          {
            emeraldAltar: { x: 148, y: 114 },
            pureEq: { x: 114, y: 72, expanded: false },
            shadowEq: { x: 210, y: 72, expanded: false },
            pieces: [
              { id: 'ca3_2_r', type: 'rose', value: 2, shadow: false, x: 88, y: 114 },
              { id: 'ca3_2_a', type: 'aqua', value: 2, shadow: false, x: 116, y: 114 },
              { id: 'ca3_2_sr', type: 'rose', value: 4, shadow: true, x: 202, y: 72, inEquation: 'shadow' },
              { id: 'ca3_2_sa', type: 'aqua', value: 4, shadow: true, x: 220, y: 72, inEquation: 'shadow' }
            ]
          },
          {
            pureEq: { x: 116, y: 72, expanded: false },
            shadowEq: { x: 210, y: 72, expanded: false },
            pieces: [
              { id: 'ca3_3_q', type: 'white', value: 5, shadow: false, x: 86, y: 114 },
              { id: 'ca3_3_c', type: 'citrine', value: 4, shadow: false, x: 116, y: 114 },
              { id: 'ca3_3_o', type: 'opal', value: 2, shadow: false, x: 146, y: 114 },
              { id: 'ca3_3_sq', type: 'white', value: 3, shadow: true, x: 202, y: 72, inEquation: 'shadow' },
              { id: 'ca3_3_sc', type: 'citrine', value: 2, shadow: true, x: 220, y: 72, inEquation: 'shadow' },
              { id: 'ca3_3_sl', type: 'citrine', value: 2, shadow: true, x: 214, y: 116 }
            ]
          }
        ],
        4: [
          {
            emeraldAltar: { x: 150, y: 108 },
            pieces: [
              { id: 'ca4_1_q', type: 'white', value: 3, shadow: false, x: 92, y: 98 },
              { id: 'ca4_1_o', type: 'opal', value: 1, shadow: false, x: 122, y: 116 },
              { id: 'ca4_1_s', type: 'white', value: 5, shadow: true, x: 216, y: 98 }
            ]
          },
          {
            emeraldAltar: { x: 148, y: 114 },
            pureEq: { x: 114, y: 78, expanded: false },
            shadowEq: { x: 212, y: 78, expanded: false },
            pieces: [
              { id: 'ca4_2_a', type: 'aqua', value: 4, shadow: false, x: 88, y: 116 },
              { id: 'ca4_2_c', type: 'citrine', value: 2, shadow: false, x: 116, y: 116 },
              { id: 'ca4_2_sa', type: 'aqua', value: 2, shadow: true, x: 204, y: 78, inEquation: 'shadow' },
              { id: 'ca4_2_sc', type: 'citrine', value: 4, shadow: true, x: 222, y: 78, inEquation: 'shadow' },
              { id: 'ca4_2_sl', type: 'aqua', value: 2, shadow: true, x: 216, y: 116 }
            ]
          },
          {
            emeraldAltar: { x: 146, y: 116 },
            pureEq: { x: 112, y: 78, expanded: false },
            shadowEq: { x: 212, y: 78, expanded: false },
            pieces: [
              { id: 'ca4_3_r', type: 'rose', value: 3, shadow: false, x: 82, y: 114 },
              { id: 'ca4_3_a', type: 'aqua', value: 4, shadow: false, x: 106, y: 114 },
              { id: 'ca4_3_o', type: 'opal', value: 1, shadow: false, x: 126, y: 98 },
              { id: 'ca4_3_sr', type: 'rose', value: 5, shadow: true, x: 204, y: 78, inEquation: 'shadow' },
              { id: 'ca4_3_sa', type: 'aqua', value: 2, shadow: true, x: 222, y: 78, inEquation: 'shadow' },
              { id: 'ca4_3_sl', type: 'aqua', value: 2, shadow: true, x: 216, y: 116 }
            ]
          }
        ]
      }
    },

    sanctuary: {
      key: 'sanctuary',
      worldIndex: 5,
      hudLabel: 'Porta',
      customHudTitle: 'Porta - Final',
      guardianKey: 'ordem',
      guardianName: 'Ordem',
      guardianPortrait: 'portrait_ordem',
      socketKey: null,
      nextBiome: 'kingdom',
      nextWorldButton: 'Voltar ao Mapa >',
      worldClearedTitle: 'Sinfonia Completa!',
      worldClearedLine1: 'A Porta das Gemas abriu o Reino!',
      worldClearedLine2: 'Todos os quatro biomas cantam em paz!',
      phaseClearedLine: 'O Portão Ancestral despertou!',
      nodeSyncByLevel: {
        1: { ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21], next: 21 }
      },
      introDialogues: {
        1: [
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'De volta ao Santuário da Caverna! As 4 Gemas Primordiais estão reunidas!' },
          { speaker: 'Araci', portrait: 'portrait_araci', text: 'A força viva da Floresta pulsa neste altar!' },
          { speaker: 'Irecê', portrait: 'portrait_irece', text: 'As Águas Claras fluem em harmonia com cada cristal!' },
          { speaker: 'Jurema', portrait: 'portrait_jurema', text: 'E o calor da Caatinga ilumina os quatro selos ancestrais!' },
          { speaker: 'Protagonista', portrait: 'portrait_protagonist', text: 'Vamos resolver a Grande Harmonia e abrir a Porta das Gemas!' }
        ]
      },
      postDialogues: {
        1: [
          { speaker: 'Ordem', portrait: 'portrait_ordem', text: 'A Porta das Gemas se abriu! O Reino inteiro voltou a florescer!' },
          { speaker: 'Protagonista', portrait: 'portrait_protagonist', text: 'Conseguimos! A Sinfonia dos Cristais está completa!' }
        ]
      },
      tutorialsByLevel: {},
      musicalCaptions: [
        [0.5, 9.0, 'Quatro vozes unidas no altar ancestral, despertando a memória de cada cristal!'],
        [9.5, 18.5, 'Da Caverna à Floresta, do Rio ao Sertão, a sombra desfez-se diante da união!'],
        [19.0, 28.0, 'Abre-se o Portão em acordes de luz, a grande sinfonia o Reino conduz!'],
        [28.5, 39.0, 'Ordem, Araci, Irecê e Jurema a cantar: o que um cristal unido é capaz de curar!'],
        [39.5, 55.5, 'Renasce a natureza em perfeita harmonia — viva para sempre a nossa Sinfonia!']
      ],
      levels: {
        1: [
          {
            emeraldAltar: { x: 146, y: 108 },
            pieces: [
              { id: 'sa1_1_q', type: 'white', value: 2, shadow: false, x: 88, y: 82 },
              { id: 'sa1_1_c', type: 'citrine', value: 4, shadow: false, x: 88, y: 114 },
              { id: 'sa1_1_sq', type: 'white', value: 4, shadow: true, x: 204, y: 68 },
              { id: 'sa1_1_sc1', type: 'citrine', value: 2, shadow: true, x: 204, y: 96 },
              { id: 'sa1_1_sc2', type: 'citrine', value: 2, shadow: true, x: 204, y: 122 }
            ]
          },
          {
            emeraldAltar: { x: 146, y: 114 },
            pureEq: { x: 110, y: 74, expanded: false },
            shadowEq: { x: 198, y: 74, expanded: false },
            pieces: [
              { id: 'sa1_2_r', type: 'rose', value: 3, shadow: false, x: 82, y: 114 },
              { id: 'sa1_2_a', type: 'aqua', value: 4, shadow: false, x: 106, y: 114 },
              { id: 'sa1_2_o', type: 'opal', value: 1, shadow: false, x: 124, y: 98 },
              { id: 'sa1_2_sr', type: 'rose', value: 5, shadow: true, x: 190, y: 74, inEquation: 'shadow' },
              { id: 'sa1_2_sa', type: 'aqua', value: 2, shadow: true, x: 208, y: 74, inEquation: 'shadow' },
              { id: 'sa1_2_sl', type: 'aqua', value: 2, shadow: true, x: 204, y: 116 }
            ]
          },
          {
            emeraldAltar: { x: 144, y: 116 },
            pureEq: { x: 108, y: 74, expanded: false },
            shadowEq: { x: 198, y: 74, expanded: false },
            pieces: [
              { id: 'sa1_3_q', type: 'white', value: 2, shadow: false, x: 76, y: 114 },
              { id: 'sa1_3_a', type: 'aqua', value: 2, shadow: false, x: 98, y: 114 },
              { id: 'sa1_3_c', type: 'citrine', value: 6, shadow: false, x: 118, y: 98 },
              { id: 'sa1_3_o', type: 'opal', value: 1, shadow: false, x: 76, y: 88 },
              { id: 'sa1_3_sq', type: 'white', value: 4, shadow: true, x: 190, y: 74, inEquation: 'shadow' },
              { id: 'sa1_3_sc', type: 'citrine', value: 2, shadow: true, x: 208, y: 74, inEquation: 'shadow' },
              { id: 'sa1_3_sl1', type: 'citrine', value: 3, shadow: true, x: 196, y: 116 },
              { id: 'sa1_3_sl2', type: 'aqua', value: 4, shadow: true, x: 214, y: 102 }
            ]
          }
        ]
      }
    }
  };

  // ============================================================================
  // 6. CONTROLADOR DOS MUNDOS 2, 3, 4 E PORTÃO FINAL (`TruePixelWorlds`)
  // ============================================================================
  const TruePixelWorlds = {
    canvas: null,
    ctx: null,
    running: false,
    t: 0,
    lastNow: 0,
    phase: 'idle',
    phaseTime: 0,
    musicalTime: 0,
    cloudPopTime: -1,
    musicAudio: null,

    worldKey: 'forest',
    currentLevel: 1,
    currentStep: 1,
    totalSteps: 2,
    campaignNodeId: 6,

    protag: { x: 34, y: 142, state: 'idle' },
    ordemCompanion: { x: 52, y: 142, state: 'idle', visible: true, flipX: false },
    guardianActor: { x: 160, y: 142, state: 'idle', visible: false, flipX: false },

    obstacleDecay: 0,
    targetObstacleDecay: 0,
    giantCrystalFlash: false,
    giantCrystalBroken: false,
    gateOpenRatio: 0,
    waveOrigin: { x: 160, y: 90 },
    waveRadius: 0,
    waveActive: false,

    pieces: [],
    emeraldAltar: null,
    pureEquation: null,
    shadowEquation: null,
    draggedPiece: null,
    dragStartPos: null,
    dragMovedDist: 0,
    equationPointer: null,
    magneticAnim: null,
    opalDrainTimer: 0,
    opalStepInterval: 0.42,
    shards: [],

    SOLID_MIN_DIST: 18,
    ANNUL_CONTACT_DIST: 19,
    STAGE_MIN_X: 62,
    STAGE_MAX_X: 242,
    STAGE_MIN_Y: 42,
    STAGE_MAX_Y: 125,

    completeBtnRect: { x: 108, y: 115, w: 104, h: 15 },
    skipMusicalBtnRect: { x: 120, y: 2, w: 64, h: 16 },
    gameOverBtnRect: { x: 96, y: 118, w: 128, h: 16 },
    _exitIrisStarted: false,
    _bound: false,

    getSpec() {
      return WORLD_SPECS[this.worldKey] || WORLD_SPECS.forest;
    },

    isWorldFinale() {
      return this.worldKey === 'sanctuary' || this.currentLevel === 4;
    },

    init() {
      this.canvas = this.ensureCanvas();
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.bindInput();
    },

    ensureCanvas() {
      if (global.CaveChapter1 && typeof global.CaveChapter1.ensureCanvas === 'function') {
        return global.CaveChapter1.ensureCanvas();
      }
      let cv = document.getElementById('truePixelScreen');
      if (!cv) {
        cv = document.createElement('canvas');
        cv.id = 'truePixelScreen';
        cv.width = HW;
        cv.height = HH;
        cv.style.cssText = [
          'position:fixed', 'left:50%', 'top:50%', 'transform:translate(-50%,-50%)',
          'display:block', 'z-index:40', 'image-rendering:pixelated', 'image-rendering:crisp-edges',
          'background:#05030f', 'box-shadow:0 0 0 100vmax #05030f', 'cursor:pointer', 'touch-action:none'
        ].join(';');
        document.body.appendChild(cv);
      }
      this.fitCanvas(cv);
      return cv;
    },

    fitCanvas(cv) {
      if (!cv || !cv.style) return;
      const vw = typeof window !== 'undefined' && window.innerWidth ? Math.max(320, window.innerWidth) : 320;
      const vh = typeof window !== 'undefined' && window.innerHeight ? Math.max(180, window.innerHeight) : 180;
      const scale = Math.min(vw / W, vh / H);
      cv.style.width = Math.round(W * scale) + 'px';
      cv.style.height = Math.round(H * scale) + 'px';
      cv.style.display = cv.hidden ? 'none' : 'block';
    },

    toLogicalCoords(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: clamp(R(((clientX - rect.left) / rect.width) * W), 0, W - 1),
        y: clamp(R(((clientY - rect.top) / rect.height) * H), 0, H - 1)
      };
    },

    isActiveGame() {
      return Boolean(this.running && this.phase !== 'map_iris_in' && this.phase !== 'map_active');
    },

    deactivateCanvas() {
      this.stopMusicAudio();
      this.phase = 'map_active';
      this.running = false;
      IrisTransition.active = false;
      IrisTransition.onDone = null;
      if (this.canvas) {
        this.canvas.hidden = true;
        if (this.canvas.style) {
          this.canvas.style.display = 'none';
          this.canvas.style.pointerEvents = 'none';
          this.canvas.style.background = 'transparent';
          this.canvas.style.boxShadow = 'none';
        }
      }
    },

    prepareCanvasForGame() {
      global.CaveChapter1?.deactivateCanvas?.();
      if (!this.canvas) this.init();
      this.canvas.hidden = false;
      this.canvas.style.display = 'block';
      this.canvas.style.pointerEvents = 'auto';
      this.canvas.style.background = '#05030f';
      this.canvas.style.boxShadow = '0 0 0 100vmax #05030f';
      this.fitCanvas(this.canvas);

      if (typeof document !== 'undefined') {
        document.body.dataset.screen = 'game';
        for (const secId of ['home', 'map', 'game']) {
          const el = document.getElementById(secId);
          if (el) el.hidden = true;
        }
      }

      const spec = this.getSpec();
      DialogueBox.sockets.fairy = true;
      DialogueBox.syncSocketsFromCompleted?.(global.CrystalApp?.state?.completed);
      if (this.worldKey === 'river' || this.worldKey === 'caatinga' || this.worldKey === 'sanctuary') {
        DialogueBox.sockets.forest = true;
      }
      if (this.worldKey === 'caatinga' || this.worldKey === 'sanctuary') {
        DialogueBox.sockets.river = true;
      }
      if (this.worldKey === 'sanctuary') {
        DialogueBox.sockets.caatinga = true;
      }

      GameHUD.worldLabel = spec.hudLabel;
      GameHUD.onRestart = () => {
        this.restartCurrentPhase();
      };
      GameHUD.onGoMap = () => {
        DialogueBox.close();
        TutorialModal.close();
        this.stopMusicAudio();
        this.enterJourneyMapWithIrisIn(false);
      };
      GameHUD.onMuteChange = (muted, effMus) => {
        const vol = effMus !== undefined ? effMus : (muted ? 0 : GameHUD.musicVol / 100);
        const inMusical = this.phase === 'musical_part1_shadows' || this.phase === 'musical_part2_bright';
        if (this.musicAudio) {
          this.musicAudio.muted = !!muted || vol <= 0;
          this.musicAudio.volume = vol;
          if (inMusical) {
            if (muted || vol <= 0 || GameHUD.paused || GameHUD.settingsOpen) {
              try { this.musicAudio.pause(); } catch (_) {}
            } else if (this.musicAudio.paused && this.musicalTime < 56.0) {
              try { this.musicAudio.play().catch(() => {}); } catch (_) {}
            }
          }
        }
      };

      GameHUD.paused = false;
      GameHUD.settingsOpen = false;
      GameHUD.syncAudio();
    },

    // ==========================================================================
    // ROTEAMENTO POR NÓ DO MAPA (6..21) OU POR MUNDO + FASE
    // ==========================================================================
    resolveNodeToWorldLevel(nodeId) {
      const id = Number(nodeId) || 6;
      if (id >= 6 && id <= 10) {
        return { worldKey: 'forest', levelNum: id >= 9 ? 4 : (id - 5), nodeId: id };
      }
      if (id >= 11 && id <= 15) {
        return { worldKey: 'river', levelNum: id >= 14 ? 4 : (id - 10), nodeId: id };
      }
      if (id >= 16 && id <= 20) {
        return { worldKey: 'caatinga', levelNum: id >= 19 ? 4 : (id - 15), nodeId: id };
      }
      return { worldKey: 'sanctuary', levelNum: 1, nodeId: 21 };
    },

    startByCampaignNode(nodeId) {
      const target = this.resolveNodeToWorldLevel(nodeId);
      this.startWorldLevel(target.worldKey, target.levelNum, target.nodeId);
    },

    startFinalGate() {
      this.startWorldLevel('sanctuary', 1, 21);
    },

    startWorldLevel(worldKey, levelNum = 1, nodeId = null) {
      this.worldKey = WORLD_SPECS[worldKey] ? worldKey : 'forest';
      const spec = this.getSpec();
      const maxLvl = this.worldKey === 'sanctuary' ? 1 : 4;
      this.currentLevel = clamp(levelNum, 1, maxLvl);
      const stepList = spec.levels[this.currentLevel] || spec.levels[1];
      this.totalSteps = stepList.length;
      this.currentStep = 1;
      this.campaignNodeId = nodeId || (spec.nodeSyncByLevel[this.currentLevel]?.ids?.slice(-1)[0] || 6);

      this.prepareCanvasForGame();
      DialogueBox.close();
      TutorialModal.close();

      this.phase = 'cutscene_enter';
      this.phaseTime = 0;
      this.obstacleDecay = 0;
      this.targetObstacleDecay = 0;
      this.giantCrystalFlash = false;
      this.giantCrystalBroken = false;
      this.gateOpenRatio = 0;
      this.waveActive = false;
      this.waveRadius = 0;
      this.pieces = [];
      this.emeraldAltar = null;
      this.pureEquation = null;
      this.shadowEquation = null;
      this.magneticAnim = null;
      this.draggedPiece = null;
      this.equationPointer = null;
      this.shards = [];
      this.setupStep(1);

      this.protag.x = -12;
      this.protag.y = 142;
      this.protag.state = 'walk';
      this.ordemCompanion.visible = true;
      this.ordemCompanion.x = -28;
      this.ordemCompanion.y = 142;
      this.ordemCompanion.state = 'walk';
      this.ordemCompanion.flipX = false;
      this.guardianActor.visible = false;

      IrisTransition.start('in', 44, 126, 0.65);

      if (!this.running) {
        this.running = true;
        this.lastNow = typeof performance !== 'undefined' ? performance.now() : 0;
        requestAnimationFrame((now) => this.loop(now));
      }
    },

    restartCurrentPhase() {
      this.prepareCanvasForGame();
      DialogueBox.close();
      TutorialModal.close();
      GameHUD.paused = false;
      GameHUD.settingsOpen = false;
      this.draggedPiece = null;
      this.dragStartPos = null;
      this.equationPointer = null;
      this.magneticAnim = null;
      this.clearTrembleStates();
      this.shards = [];
      this.waveActive = false;
      this.waveRadius = 0;
      this.obstacleDecay = 0;
      this.targetObstacleDecay = 0;
      this.giantCrystalFlash = false;
      this.giantCrystalBroken = false;
      this.gateOpenRatio = 0;
      this.guardianActor.visible = false;

      if (this.phase === 'musical_part1_shadows' || this.phase === 'musical_part2_bright') {
        this.startMusicalShow();
        IrisTransition.start('in', 160, 90, 0.45);
        return;
      }

      this.stopMusicAudio();
      this.currentStep = 1;
      this.protag.x = 30;
      this.protag.y = 142;
      this.protag.state = 'idle';
      this.ordemCompanion.visible = true;
      this.ordemCompanion.x = 48;
      this.ordemCompanion.y = 142;
      this.ordemCompanion.state = 'idle';

      this.setupStep(1);
      this.phase = 'gameplay';
      this.phaseTime = 0;
      this.spawnShatter(160, 90, 'pure', 14);
      GameHUD.playSfx('start');
      IrisTransition.start('in', 160, 90, 0.45);

      if (!this.running) {
        this.running = true;
        this.lastNow = typeof performance !== 'undefined' ? performance.now() : 0;
        requestAnimationFrame((now) => this.loop(now));
      }
    },

    setupStep(stepNum) {
      const spec = this.getSpec();
      const stepList = spec.levels[this.currentLevel] || spec.levels[1];
      this.totalSteps = stepList.length;
      this.currentStep = clamp(stepNum, 1, this.totalSteps);
      const stepDef = stepList[this.currentStep - 1];

      this.opalDrainTimer = 0;
      this.magneticAnim = null;
      this.emeraldAltar = stepDef.emeraldAltar ? { x: stepDef.emeraldAltar.x, y: stepDef.emeraldAltar.y } : null;
      this.pureEquation = stepDef.pureEq ? { x: stepDef.pureEq.x, y: stepDef.pureEq.y, expanded: Boolean(stepDef.pureEq.expanded) } : null;
      this.shadowEquation = stepDef.shadowEq ? { x: stepDef.shadowEq.x, y: stepDef.shadowEq.y, expanded: Boolean(stepDef.shadowEq.expanded) } : null;
      this.pieces = (stepDef.pieces || []).map((p) => ({
        id: p.id,
        type: p.type,
        value: p.value,
        shadow: Boolean(p.shadow),
        boosted: Boolean(p.boosted),
        inEquation: p.inEquation || null,
        x: p.x,
        y: p.y
      }));

      if (this.pureEquation) this.layoutEquationPieces(this.pureEquation, 'pure');
      if (this.shadowEquation) this.layoutEquationPieces(this.shadowEquation, 'shadow');
      this.resolveFreeCrystalCollisions();
    },

    openIntroIfAny() {
      const spec = this.getSpec();
      const lines = spec.introDialogues && spec.introDialogues[this.currentLevel];
      const tutKey = spec.tutorialsByLevel && spec.tutorialsByLevel[this.currentLevel];

      const launchTutorialOrPlay = () => {
        this.setupStep(1);
        const cards = tutKey && StandardTutorialCards[tutKey];
        if (cards && cards.length) {
          this.phase = 'tutorial';
          TutorialModal.open(cards, () => {
            this.phase = 'gameplay';
            this.phaseTime = 0;
          }, true);
        } else {
          this.phase = 'gameplay';
          this.phaseTime = 0;
        }
      };

      if (lines && lines.length) {
        this.phase = 'intro_dialogue';
        this.phaseTime = 0;
        this.protag.state = this.currentLevel === 4 ? 'shock' : 'idle';
        DialogueBox.open(lines, () => {
          this.protag.state = 'idle';
          launchTutorialOrPlay();
        });
      } else {
        launchTutorialOrPlay();
      }
    },

    // ==========================================================================
    // FÍSICA TÁTIL DE CRISTAIS, ALTAR DE ESMERALDA, DIVISÃO E EQUAÇÕES
    // ==========================================================================
    spawnShatter(cx, cy, setKey = 'pure', count = 10) {
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + (i % 3) * 0.2;
        const spd = 28 + (i % 4) * 18;
        this.shards.push({
          x0: cx,
          y0: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 48,
          floorY: 138,
          t0: this.t,
          v: i & 3,
          set: setKey
        });
      }
      if (this.shards.length > 96) {
        this.shards.splice(0, this.shards.length - 96);
      }
    },

    isInsideEquationAura(eq, x, y, allowReception = false) {
      if (!eq || eq.broken) return false;
      const rx = (eq.expanded || allowReception) ? 48 : 30;
      const ry = (eq.expanded || allowReception) ? 28 : 18;
      const dx = (x - eq.x) / rx, dy = (y - eq.y) / ry;
      return dx * dx + dy * dy <= 1.08;
    },

    clearTrembleStates() {
      this.opalDrainTimer = 0;
      for (const p of this.pieces) p.trembling = false;
    },

    clampCrystalPos(x, y) {
      return {
        x: clamp(x, this.STAGE_MIN_X, this.STAGE_MAX_X),
        y: clamp(y, this.STAGE_MIN_Y, this.STAGE_MAX_Y)
      };
    },

    isCompatibleShadowTarget(purePiece, candidate, px = purePiece.x, py = purePiece.y) {
      if (this.phase !== 'gameplay') return false;
      if (!purePiece || purePiece.shadow || purePiece.broken || purePiece.value <= 0) return false;
      if (!candidate || !candidate.shadow || candidate.broken || candidate.value <= 0 || candidate.inEquation) return false;
      if (
        purePiece.inEquation === 'pure' &&
        this.pureEquation &&
        !this.pureEquation.broken &&
        this.isInsideEquationAura(this.pureEquation, px, py, true)
      ) {
        return false;
      }
      return candidate.type === purePiece.type && candidate.value === purePiece.value;
    },

    findTouchingCompatibleShadow(purePiece, px = purePiece.x, py = purePiece.y) {
      if (!purePiece || purePiece.shadow || purePiece.broken || purePiece.value <= 0) return null;
      let best = null;
      let bestDist = this.ANNUL_CONTACT_DIST;
      for (let i = 0; i < this.pieces.length; i++) {
        const k = this.pieces[i];
        if (!this.isCompatibleShadowTarget(purePiece, k, px, py)) continue;
        const d = Math.hypot(px - k.x, py - k.y);
        if (d <= bestDist) {
          bestDist = d;
          best = k;
        }
      }
      return best;
    },

    triggerImmediateAnnulment(purePiece, shadowTarget) {
      if (!purePiece || !shadowTarget || purePiece.broken || shadowTarget.broken) return false;
      purePiece.dragging = false;
      if (this.draggedPiece === purePiece) {
        this.draggedPiece = null;
        this.dragStartPos = null;
      }

      const wasInPureEq = purePiece.inEquation === 'pure';
      purePiece.inEquation = null;
      if (this.pureEquation) {
        this.pureEquation.dropHover = false;
        this.pureEquation.removeHover = false;
        if (wasInPureEq && !this.pureEquation.broken) {
          this.layoutEquationPieces(this.pureEquation, 'pure');
        }
      }
      this.clearTrembleStates();

      purePiece.broken = true;
      shadowTarget.broken = true;
      GameHUD.playSfx('shatter');
      GameHUD.playSfx('reward');
      const shardSet = SHARD_SPR[purePiece.type] ? purePiece.type : 'pure';
      this.spawnShatter(shadowTarget.x, shadowTarget.y, shardSet, 12);
      this.spawnShatter(shadowTarget.x, shadowTarget.y, 'shadow', 12);

      this.checkIfAllStepTargetsCleared(shadowTarget.x, shadowTarget.y);
      if (this.phase === 'gameplay') {
        this.checkEquationSolved();
        this.triggerDefeatIfImpossible();
      }
      return true;
    },

    checkEmeraldAltarBlessing(piece) {
      if (!this.emeraldAltar || !piece || piece.shadow || piece.broken || piece.value <= 0) return false;
      if (piece.type === 'opal' || piece.boosted || piece.value * 2 > 6) return false;
      if (Math.hypot(piece.x - this.emeraldAltar.x, piece.y - this.emeraldAltar.y) <= 22) {
        piece.value = clamp(piece.value * 2, 1, 6);
        piece.boosted = true;
        piece.lastValChangeAt = this.t;
        GameHUD.playSfx('reward');
        this.spawnShatter(this.emeraldAltar.x, this.emeraldAltar.y, 'emerald', 10);
        const hit = this.findTouchingCompatibleShadow(piece, piece.x, piece.y);
        if (hit) {
          this.triggerImmediateAnnulment(piece, hit);
        }
        return true;
      }
      return false;
    },

    trySplitCrystalOnTap(piece) {
      if (!piece || piece.shadow || piece.broken || piece.value < 2 || piece.value % 2 !== 0) return false;
      if (piece.type !== 'citrine' && piece.type !== 'aqua') return false;

      const half = piece.value / 2;
      piece.value = half;
      piece.lastValChangeAt = this.t;
      const origX = piece.x, origY = piece.y;
      piece.x = clamp(origX - 10, this.STAGE_MIN_X, this.STAGE_MAX_X);

      const clone = {
        id: `${piece.id}_sp_${Math.floor(this.t * 1000)}_${this.pieces.length}`,
        type: piece.type,
        value: half,
        shadow: false,
        boosted: Boolean(piece.boosted),
        inEquation: piece.inEquation || null,
        lastValChangeAt: this.t,
        x: clamp(origX + 10, this.STAGE_MIN_X, this.STAGE_MAX_X),
        y: origY
      };
      this.pieces.push(clone);

      GameHUD.playSfx('shatter');
      this.spawnShatter(origX, origY, piece.type === 'citrine' ? 'citrine' : 'aqua', 8);

      if (piece.inEquation === 'pure' && this.pureEquation && !this.pureEquation.broken) {
        this.layoutEquationPieces(this.pureEquation, 'pure');
      } else {
        this.resolveFreeCrystalCollisions();
      }

      for (const candidate of [piece, clone]) {
        if (!candidate.broken) {
          const hit = this.findTouchingCompatibleShadow(candidate, candidate.x, candidate.y);
          if (hit) this.triggerImmediateAnnulment(candidate, hit);
        }
      }
      if (this.phase === 'gameplay') {
        this.checkEquationSolved();
        this.triggerDefeatIfImpossible();
      }
      return true;
    },

    moveDraggedPieceWithCollision(piece, rawX, rawY) {
      if (!piece || piece.broken || piece.value <= 0) return { annulled: false };

      const clampedTarget = this.clampCrystalPos(rawX, rawY);
      let curX = clamp(piece.x, this.STAGE_MIN_X, this.STAGE_MAX_X);
      let curY = clamp(piece.y, this.STAGE_MIN_Y, this.STAGE_MAX_Y);

      const initialHit = this.findTouchingCompatibleShadow(piece, curX, curY);
      if (initialHit) {
        piece.x = curX;
        piece.y = curY;
        this.triggerImmediateAnnulment(piece, initialHit);
        return { annulled: true };
      }

      const totalDx = clampedTarget.x - curX;
      const totalDy = clampedTarget.y - curY;
      const totalDist = Math.hypot(totalDx, totalDy);
      if (totalDist < 1e-4) {
        piece.x = curX;
        piece.y = curY;
        return { annulled: false };
      }

      const minD = this.SOLID_MIN_DIST;
      const steps = Math.max(1, Math.ceil(totalDist / 1.25));
      const stepDx = totalDx / steps;
      const stepDy = totalDy / steps;

      for (let s = 0; s < steps; s++) {
        let nx = clamp(curX + stepDx, this.STAGE_MIN_X, this.STAGE_MAX_X);
        let ny = clamp(curY + stepDy, this.STAGE_MIN_Y, this.STAGE_MAX_Y);

        const shadowHit = this.findTouchingCompatibleShadow(piece, nx, ny);
        if (shadowHit) {
          piece.x = nx;
          piece.y = ny;
          this.triggerImmediateAnnulment(piece, shadowHit);
          return { annulled: true };
        }

        let blockedDead = false;
        for (let iter = 0; iter < 6; iter++) {
          let anyOverlap = false;
          for (let i = 0; i < this.pieces.length; i++) {
            const other = this.pieces[i];
            if (
              other === piece ||
              other.broken ||
              other.value <= 0 ||
              this.isCompatibleShadowTarget(piece, other, nx, ny)
            ) {
              continue;
            }
            const dx = nx - other.x;
            const dy = ny - other.y;
            const d = Math.hypot(dx, dy);
            if (d < minD) {
              anyOverlap = true;
              const ux = d > 1e-4 ? dx / d : 1;
              const uy = d > 1e-4 ? dy / d : 0;
              if (iter === 0) {
                const mvX = nx - curX, mvY = ny - curY;
                const vn = mvX * ux + mvY * uy;
                if (vn < 0) {
                  const vtX = mvX - vn * ux, vtY = mvY - vn * uy;
                  if (Math.hypot(vtX, vtY) <= Math.abs(vn) * 0.25 && Math.hypot(curX - other.x, curY - other.y) <= minD + 0.05) {
                    blockedDead = true;
                    break;
                  }
                }
              }
              nx = other.x + ux * minD;
              ny = other.y + uy * minD;
            }
          }
          nx = clamp(nx, this.STAGE_MIN_X, this.STAGE_MAX_X);
          ny = clamp(ny, this.STAGE_MIN_Y, this.STAGE_MAX_Y);
          if (blockedDead || !anyOverlap) break;
        }

        if (blockedDead) break;

        let valid = true;
        for (let i = 0; i < this.pieces.length; i++) {
          const other = this.pieces[i];
          if (other === piece || other.broken || other.value <= 0 || this.isCompatibleShadowTarget(piece, other, nx, ny)) {
            continue;
          }
          if (Math.hypot(nx - other.x, ny - other.y) < minD - 0.04) {
            valid = false;
            break;
          }
        }
        if (!valid) break;

        curX = nx;
        curY = ny;
        piece.x = curX;
        piece.y = curY;

        if (this.checkEmeraldAltarBlessing(piece)) {
          if (piece.broken || this.phase !== 'gameplay') return { annulled: true };
        }

        const postHit = this.findTouchingCompatibleShadow(piece, curX, curY);
        if (postHit) {
          this.triggerImmediateAnnulment(piece, postHit);
          return { annulled: true };
        }
      }

      piece.x = curX;
      piece.y = curY;
      return { annulled: false };
    },

    moveEquationWithCollision(rawEqX, rawEqY) {
      const eq = this.pureEquation;
      if (!eq || eq.broken) return;
      const members = this.pieces.filter((p) => !p.broken && p.value > 0 && p.inEquation === 'pure');
      const spacing = eq.expanded ? 24 : 18;
      const halfSpan = members.length > 1 ? ((members.length - 1) * spacing) * 0.5 : 0;
      const minEqX = Math.max(44, this.STAGE_MIN_X + halfSpan);
      const maxEqX = Math.min(W - 44, this.STAGE_MAX_X - halfSpan);
      const targetX = clamp(rawEqX, minEqX, maxEqX);
      const targetY = clamp(rawEqY, this.STAGE_MIN_Y, this.STAGE_MAX_Y);

      const totalDx = targetX - eq.x;
      const totalDy = targetY - eq.y;
      const totalDist = Math.hypot(totalDx, totalDy);
      if (totalDist < 1e-4) return;

      const minD = this.SOLID_MIN_DIST;
      const others = this.pieces.filter((p) => !p.broken && p.value > 0 && p.inEquation !== 'pure');
      const canShiftBy = (dx, dy) => {
        for (let m = 0; m < members.length; m++) {
          const mx = members[m].x + dx, my = members[m].y + dy;
          if (mx < this.STAGE_MIN_X || mx > this.STAGE_MAX_X || my < this.STAGE_MIN_Y || my > this.STAGE_MAX_Y) return false;
          for (let o = 0; o < others.length; o++) {
            if (Math.hypot(mx - others[o].x, my - others[o].y) < minD - 0.04) return false;
          }
        }
        return true;
      };

      const steps = Math.max(1, Math.ceil(totalDist / 1.5));
      const sdx = totalDx / steps, sdy = totalDy / steps;
      for (let s = 0; s < steps; s++) {
        let ax = 0, ay = 0;
        if (canShiftBy(sdx, sdy)) { ax = sdx; ay = sdy; }
        else if (Math.abs(sdx) > 1e-4 && canShiftBy(sdx, 0)) ax = sdx;
        else if (Math.abs(sdy) > 1e-4 && canShiftBy(0, sdy)) ay = sdy;
        else break;
        eq.x += ax;
        eq.y += ay;
        for (const m of members) {
          m.x += ax;
          m.y += ay;
        }
      }
    },

    resolveFreeCrystalCollisions() {
      const minD = this.SOLID_MIN_DIST;
      for (let iter = 0; iter < 6; iter++) {
        for (let i = 0; i < this.pieces.length; i++) {
          const p = this.pieces[i];
          if (p.broken || p.value <= 0 || p.shadow || p.inEquation) continue;
          p.x = clamp(p.x, this.STAGE_MIN_X, this.STAGE_MAX_X);
          p.y = clamp(p.y, this.STAGE_MIN_Y, this.STAGE_MAX_Y);
          for (let j = 0; j < this.pieces.length; j++) {
            if (i === j) continue;
            const o = this.pieces[j];
            if (o.broken || o.value <= 0) continue;
            const dx = p.x - o.x, dy = p.y - o.y;
            const d = Math.hypot(dx, dy);
            if (d < minD) {
              const ux = d > 1e-4 ? dx / d : 0;
              const uy = d > 1e-4 ? dy / d : -1;
              if (!o.shadow && !o.inEquation) {
                const push = (minD - d) * 0.5;
                p.x = clamp(p.x + ux * push, this.STAGE_MIN_X, this.STAGE_MAX_X);
                p.y = clamp(p.y + uy * push, this.STAGE_MIN_Y, this.STAGE_MAX_Y);
                o.x = clamp(o.x - ux * push, this.STAGE_MIN_X, this.STAGE_MAX_X);
                o.y = clamp(o.y - uy * push, this.STAGE_MIN_Y, this.STAGE_MAX_Y);
              } else {
                p.x = clamp(o.x + ux * minD, this.STAGE_MIN_X, this.STAGE_MAX_X);
                p.y = clamp(o.y + uy * minD, this.STAGE_MIN_Y, this.STAGE_MAX_Y);
              }
            }
          }
        }
      }
    },

    layoutEquationPieces(eq, tag) {
      if (!eq || eq.broken) return;
      const members = this.pieces.filter((p) => !p.broken && p.value > 0 && p.inEquation === tag);
      const spacing = eq.expanded ? 24 : 18;
      const halfSpan = members.length > 1 ? ((members.length - 1) * spacing) * 0.5 : 0;
      if (this.phase !== 'equation_magnetic') {
        eq.x = clamp(eq.x, this.STAGE_MIN_X + halfSpan, this.STAGE_MAX_X - halfSpan);
        eq.y = clamp(eq.y, this.STAGE_MIN_Y, this.STAGE_MAX_Y);
      }
      const startX = eq.x - halfSpan;
      members.forEach((m, idx) => {
        m.x = R(startX + idx * spacing);
        m.y = R(eq.y);
      });
      if (this.phase === 'gameplay') {
        this.resolveFreeCrystalCollisions();
      }
    },

    updateOpalProximity(dt) {
      if (this.phase !== 'gameplay' || !this.draggedPiece) {
        this.clearTrembleStates();
        return;
      }
      const dp = this.draggedPiece;
      if (dp.broken || dp.value <= 0 || dp.shadow) {
        this.clearTrembleStates();
        return;
      }

      let activeOpal = null;
      let activeTarget = null;
      let bestDist = 26;

      if (dp.type === 'opal') {
        for (const p of this.pieces) {
          if (p !== dp && !p.broken && !p.shadow && p.value > 0 && p.type !== 'opal') {
            const d = Math.hypot(dp.x - p.x, dp.y - p.y);
            if (d <= bestDist) {
              bestDist = d;
              activeOpal = dp;
              activeTarget = p;
            }
          }
        }
      } else {
        for (const p of this.pieces) {
          if (p !== dp && !p.broken && !p.shadow && p.value > 0 && p.type === 'opal') {
            const d = Math.hypot(dp.x - p.x, dp.y - p.y);
            if (d <= bestDist) {
              bestDist = d;
              activeOpal = p;
              activeTarget = dp;
            }
          }
        }
      }

      for (const p of this.pieces) p.trembling = false;
      if (!activeOpal || !activeTarget) {
        this.opalDrainTimer = 0;
        return;
      }

      activeOpal.trembling = true;
      activeTarget.trembling = true;
      GameHUD.playSfx('opalPulse');
      this.opalDrainTimer += dt;

      if (this.opalDrainTimer >= this.opalStepInterval) {
        this.opalDrainTimer -= this.opalStepInterval;
        activeTarget.value -= 1;
        activeOpal.value -= 1;
        activeTarget.lastValChangeAt = this.t;
        activeOpal.lastValChangeAt = this.t;
        GameHUD.playSfx('opalSubtract');

        this.spawnShatter((activeOpal.x + activeTarget.x) * 0.5, (activeOpal.y + activeTarget.y) * 0.5, 'opal', 6);

        if (activeTarget.value <= 0) {
          activeTarget.broken = true;
          activeTarget.dragging = false;
          if (this.draggedPiece === activeTarget) this.draggedPiece = null;
        }
        if (activeOpal.value <= 0) {
          activeOpal.broken = true;
          activeOpal.dragging = false;
          if (this.draggedPiece === activeOpal) this.draggedPiece = null;
        }
        if (activeTarget.broken || activeOpal.broken) {
          GameHUD.playSfx('shatter');
          this.clearTrembleStates();
        }
        if (!activeTarget.broken && activeTarget.value > 0) {
          const hit = this.findTouchingCompatibleShadow(activeTarget, activeTarget.x, activeTarget.y);
          if (hit) {
            this.triggerImmediateAnnulment(activeTarget, hit);
            return;
          }
        }
        this.checkEquationSolved();
        this.triggerDefeatIfImpossible();
      }
    },

    checkPieceDrop(dropped) {
      if (!dropped || dropped.broken || dropped.value <= 0) return;

      const clamped = this.clampCrystalPos(dropped.x, dropped.y);
      dropped.x = clamped.x;
      dropped.y = clamped.y;

      this.checkEmeraldAltarBlessing(dropped);
      if (dropped.broken || this.phase !== 'gameplay') return;

      // 1. Fusão entre cristais puros da mesma cor (até 6 bolinhas)
      if (dropped.type !== 'opal') {
        for (const other of this.pieces) {
          if (
            other !== dropped &&
            !other.broken &&
            !other.shadow &&
            other.value > 0 &&
            other.type !== 'opal' &&
            Math.hypot(dropped.x - other.x, dropped.y - other.y) <= 22
          ) {
            if (other.type !== dropped.type || other.value + dropped.value > 6) {
              dropped.rejectUntil = this.t + 0.35;
              other.rejectUntil = this.t + 0.35;
              GameHUD.playSfx('error');
              this.resolveFreeCrystalCollisions();
              return;
            }
            other.value += dropped.value;
            other.boosted = Boolean(other.boosted && dropped.boosted);
            other.lastValChangeAt = this.t;
            dropped.broken = true;
            GameHUD.playSfx(other.type === 'rose' ? 'roseMerge' : 'quartzMerge');
            this.spawnShatter(other.x, other.y, SHARD_SPR[other.type] ? other.type : 'pure', 8);
            if (this.pureEquation && !this.pureEquation.broken) {
              this.layoutEquationPieces(this.pureEquation, 'pure');
            }
            const mergedHit = this.findTouchingCompatibleShadow(other, other.x, other.y);
            if (mergedHit) this.triggerImmediateAnnulment(other, mergedHit);
            return;
          }
        }
      }

      // 2. Adição ou retirada na Equação Cristalina
      if (this.pureEquation && !this.pureEquation.broken) {
        if (this.isInsideEquationAura(this.pureEquation, dropped.x, dropped.y, true)) {
          if (dropped.inEquation !== 'pure') {
            dropped.inEquation = 'pure';
            GameHUD.playSfx('equationInsert');
          }
          this.layoutEquationPieces(this.pureEquation, 'pure');
          return;
        } else if (dropped.inEquation === 'pure') {
          dropped.inEquation = null;
          GameHUD.playSfx('equationRemove');
          this.layoutEquationPieces(this.pureEquation, 'pure');
        }
      }

      this.resolveFreeCrystalCollisions();

      if (!dropped.inEquation) {
        const shadowTarget = this.findTouchingCompatibleShadow(dropped, dropped.x, dropped.y);
        if (shadowTarget) this.triggerImmediateAnnulment(dropped, shadowTarget);
      }
    },

    isStepStillSolvable() {
      const shadows = this.pieces.filter((p) => p.shadow && !p.broken && p.value > 0);
      if (shadows.length === 0) return true;
      const pures = this.pieces.filter((p) => !p.shadow && !p.broken && p.value > 0);
      if (pures.length === 0) return false;

      const hasAltar = Boolean(this.emeraldAltar);
      for (const color of ['white', 'rose', 'citrine', 'aqua']) {
        const sSum = shadows.filter((s) => s.type === color).reduce((a, b) => a + b.value, 0);
        if (sSum === 0) continue;
        const pList = pures.filter((p) => p.type === color);
        if (pList.length === 0) return false;
        const maxPureSum = pList.reduce((sum, p) => {
          if (!hasAltar || p.boosted) return sum + p.value;
          // Se puder dividir antes de passar no Altar (ex: Citrino/Água 4 -> 2+2 -> 4+4 = 8), considera o teto real
          if ((color === 'citrine' || color === 'aqua') && p.value >= 2 && p.value % 2 === 0) {
            return sum + p.value * 2;
          }
          return sum + (p.value * 2 <= 6 ? p.value * 2 : p.value);
        }, 0);
        if (maxPureSum < sSum) return false;
      }
      return true;
    },

    triggerDefeatIfImpossible() {
      if (this.phase !== 'gameplay') return;
      if (!this.pieces.some((k) => k.shadow && !k.broken && k.value > 0)) return;
      if (!this.isStepStillSolvable()) {
        if (this.draggedPiece) {
          this.draggedPiece.dragging = false;
          this.draggedPiece = null;
        }
        this.dragStartPos = null;
        this.equationPointer = null;
        this.clearTrembleStates();
        GameHUD.playSfx('error');
        this.phase = 'defeat_pause';
        this.phaseTime = 0;
      }
    },

    checkIfAllStepTargetsCleared(originX, originY) {
      const remainingShadows = this.pieces.some((k) => k.shadow && !k.broken);
      const remainingShadowEq = this.shadowEquation && !this.shadowEquation.broken;
      if (!remainingShadows && !remainingShadowEq) {
        this.onStepCleared(originX, originY);
      }
    },

    checkEquationSolved() {
      if (this.phase !== 'gameplay' || !this.pureEquation || !this.shadowEquation) return;
      if (this.pureEquation.broken || this.shadowEquation.broken) return;

      const pureMembers = this.pieces.filter((p) => !p.broken && !p.shadow && p.value > 0 && p.inEquation === 'pure');
      const shadowMembers = this.pieces.filter((p) => !p.broken && p.shadow && p.value > 0 && p.inEquation === 'shadow');
      if (pureMembers.length !== shadowMembers.length || shadowMembers.length === 0) return;

      const pool = pureMembers.slice();
      for (const sm of shadowMembers) {
        const idx = pool.findIndex((pm) => pm.type === sm.type && pm.value === sm.value);
        if (idx < 0) return;
        pool.splice(idx, 1);
      }

      this.pureEquation.expanded = false;
      this.layoutEquationPieces(this.pureEquation, 'pure');
      this.layoutEquationPieces(this.shadowEquation, 'shadow');
      GameHUD.playSfx('equationMagnetic');

      this.phase = 'equation_magnetic';
      this.phaseTime = 0;
      this.magneticAnim = {
        pStartX: this.pureEquation.x,
        pStartY: this.pureEquation.y,
        sStartX: this.shadowEquation.x,
        sStartY: this.shadowEquation.y,
        midX: R((this.pureEquation.x + this.shadowEquation.x) * 0.5),
        midY: R((this.pureEquation.y + this.shadowEquation.y) * 0.5)
      };
    },

    onStepCleared(originX, originY) {
      this.targetObstacleDecay = this.currentStep / this.totalSteps;
      this.spawnShatter(this.isWorldFinale() ? 176 : 258, this.isWorldFinale() ? 34 : 108, 'rock', 14);

      if (this.currentStep < this.totalSteps) {
        this.phase = 'next_step_pause';
        this.phaseTime = 0;
      } else if (this.isWorldFinale()) {
        this.phase = 'finale_crystal_shatter';
        this.phaseTime = 0;
        this.giantCrystalFlash = true;
      } else {
        this.waveOrigin = { x: originX, y: originY };
        this.waveActive = true;
        this.waveRadius = 1;
        this.phase = 'step_resolving';
        this.phaseTime = 0;
      }
    },

    // ==========================================================================
    // SHOW MUSICAL EM 2 PARTES + PÓS-DIÁLOGO + TRANSIÇÃO AO MAPA
    // ==========================================================================
    startMusicalShow() {
      const spec = this.getSpec();
      this.phase = this.worldKey === 'sanctuary' ? 'musical_part2_bright' : 'musical_part1_shadows';
      this.phaseTime = 0;
      this.musicalTime = this.worldKey === 'sanctuary' ? 24.0 : 0;
      this.cloudPopTime = -1;

      this.protag.x = 38;
      this.protag.y = 142;
      this.protag.state = 'idle';
      this.ordemCompanion.visible = true;
      this.ordemCompanion.x = 60;
      this.ordemCompanion.y = 142;
      this.ordemCompanion.state = 'idle';

      this.guardianActor.visible = this.worldKey !== 'sanctuary';
      this.guardianActor.x = 168;
      this.guardianActor.y = 40;
      this.guardianActor.state = 'back_silhouette';
      this.guardianActor.flipX = false;

      if (this.worldKey === 'sanctuary') {
        this.waveOrigin = { x: 248, y: 84 };
        this.waveActive = true;
        this.waveRadius = 400;
      }

      try {
        global.CrystalMenuAudio?.pause?.();
        if (!this.musicAudio) {
          this.musicAudio = new Audio('assets/audio/o-que-um-cristal-pode-fazer.mp3');
          this.musicAudio.preload = 'auto';
        }
        GameHUD.syncAudio();
        this.musicAudio.currentTime = 0;
        const effMus = GameHUD.muted ? 0 : clamp(GameHUD.musicVol / 100, 0, 1);
        this.musicAudio.muted = GameHUD.muted || effMus <= 0;
        this.musicAudio.volume = effMus;
        if (!GameHUD.muted && GameHUD.musicVol > 0) {
          this.musicAudio.play().catch(() => {});
        }
      } catch (_) {}
    },

    stopMusicAudio() {
      if (this.musicAudio) {
        try { this.musicAudio.pause(); } catch (_) {}
      }
    },

    finishMusicalShow() {
      this.stopMusicAudio();
      const spec = this.getSpec();
      if (spec.socketKey) {
        DialogueBox.sockets[spec.socketKey] = true;
      }
      const syncInfo = spec.nodeSyncByLevel[this.currentLevel];
      if (syncInfo) {
        global.CrystalApp?.syncProgress?.(syncInfo.ids, syncInfo.next);
      }

      this.waveOrigin = { x: 160, y: 90 };
      this.waveActive = true;
      this.waveRadius = 400;
      this.obstacleDecay = 1;
      this.gateOpenRatio = 1;

      this.phase = 'post_musical_dlg';
      this.phaseTime = 0;
      this.protag.x = 68;
      this.protag.state = 'idle';
      this.ordemCompanion.x = 96;
      this.ordemCompanion.state = 'idle';
      if (this.worldKey !== 'sanctuary') {
        this.guardianActor.visible = true;
        this.guardianActor.x = 152;
        this.guardianActor.y = 142;
        this.guardianActor.state = 'idle';
        this.guardianActor.flipX = true;
      }

      const lines = (spec.postDialogues && spec.postDialogues[this.currentLevel]) || [];
      DialogueBox.open(lines, () => {
        this.phase = 'world_celebrate_complete';
        this.phaseTime = 0;
        this.protag.state = 'celebrate';
        this.ordemCompanion.state = 'celebrate';
        if (this.guardianActor.visible) this.guardianActor.state = 'celebrate';
      });
    },

    openPostLevelDialogue() {
      const spec = this.getSpec();
      const syncInfo = spec.nodeSyncByLevel[this.currentLevel];
      if (syncInfo) {
        global.CrystalApp?.syncProgress?.(syncInfo.ids, syncInfo.next);
      }
      this.phase = 'post_dialogue';
      this.phaseTime = 0;
      this.protag.state = 'celebrate';
      this.ordemCompanion.state = 'celebrate';

      const lines = (spec.postDialogues && spec.postDialogues[this.currentLevel]) || [];
      DialogueBox.open(lines, () => {
        this.phase = 'celebrate_complete';
        this.phaseTime = 0;
      });
    },

    startWorldExitTransition() {
      this._exitIrisStarted = false;
      this.phase = 'walk_to_world_exit';
      this.phaseTime = 0;
      this.protag.state = 'walk';
      this.ordemCompanion.state = 'walk';
      if (this.guardianActor.visible) {
        this.guardianActor.state = 'walk';
        this.guardianActor.flipX = false;
      }
    },

    enterJourneyMapWithIrisIn(worldCompleted = true) {
      DialogueBox.close();
      TutorialModal.close();
      this.stopMusicAudio();
      GameHUD.paused = false;
      GameHUD.settingsOpen = false;
      this.draggedPiece = null;
      this.equationPointer = null;
      this.clearTrembleStates();

      const spec = this.getSpec();
      if (worldCompleted) {
        const syncInfo = spec.nodeSyncByLevel[this.currentLevel];
        if (syncInfo) {
          global.CrystalApp?.syncProgress?.(syncInfo.ids, syncInfo.next);
        }
      }

      if (global.CrystalApp && typeof global.CrystalApp.goto === 'function') {
        global.CrystalApp.goto('map');
      } else if (typeof document !== 'undefined') {
        document.body.dataset.screen = 'map';
        const homeSec = document.getElementById('home');
        const gameSec = document.getElementById('game');
        const mapSec = document.getElementById('map');
        if (homeSec) homeSec.hidden = true;
        if (gameSec) gameSec.hidden = true;
        if (mapSec) mapSec.hidden = false;
      }

      ActorAnimator.adaptMapFairyIcon();

      if (this.canvas) {
        this.phase = 'map_iris_in';
        this.phaseTime = 0;
        this.canvas.hidden = false;
        if (this.canvas.style) {
          this.canvas.style.display = 'block';
          this.canvas.style.background = 'transparent';
          this.canvas.style.boxShadow = 'none';
          this.canvas.style.pointerEvents = 'none';
        }
        IrisTransition.start('in', 160, 90, 0.95, () => {
          this.deactivateCanvas();
        });
        if (!this.running) {
          this.running = true;
          this.lastNow = typeof performance !== 'undefined' ? performance.now() : 0;
          requestAnimationFrame((now) => this.loop(now));
        }
      } else {
        this.phase = 'map_active';
      }
    },

    // ==========================================================================
    // INPUT UNIFICADO (TOQUE/ARRASTO + ATALHO `R`)
    // ==========================================================================
    bindInput() {
      if (this._bound) return;
      this._bound = true;

      const onDown = (e) => {
        if (!this.running || this.phase === 'map_iris_in' || this.phase === 'map_active') return;
        const pt = e.touches ? e.touches[0] : e;
        const { x, y } = this.toLogicalCoords(pt.clientX, pt.clientY);

        if (GameHUD.handleClick(x, y)) return;

        if (DialogueBox.isOpen) {
          GameHUD.playSfx('click');
          DialogueBox.advance();
          return;
        }

        if (TutorialModal.isOpen) {
          TutorialModal.handleClick(x, y);
          return;
        }

        if (this.phase === 'game_over') {
          const gb = this.gameOverBtnRect;
          if (x >= gb.x && x <= gb.x + gb.w && y >= gb.y && y <= gb.y + gb.h) {
            GameHUD.triggerRestart();
          }
          return;
        }

        if (this.phase === 'musical_part1_shadows' || this.phase === 'musical_part2_bright') {
          const sb = this.skipMusicalBtnRect;
          if (x >= sb.x && x <= sb.x + sb.w && y >= sb.y && y <= sb.y + sb.h) {
            GameHUD.playSfx('click');
            this.finishMusicalShow();
            return;
          }
        }

        if (this.phase === 'celebrate_complete' || this.phase === 'world_celebrate_complete') {
          const b = this.completeBtnRect;
          if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
            GameHUD.playSfx('click');
            if (this.phase === 'world_celebrate_complete') {
              this.startWorldExitTransition();
            } else {
              this.startWorldLevel(this.worldKey, this.currentLevel + 1);
            }
          }
          return;
        }

        if (this.phase !== 'gameplay') return;

        const eq = this.pureEquation;
        const clickedInEq = this.isInsideEquationAura(eq, x, y);

        if (eq && !eq.broken && !eq.expanded && clickedInEq) {
          this.equationPointer = { startX: x, startY: y, origX: eq.x, origY: eq.y, moved: false };
          return;
        }

        for (let i = this.pieces.length - 1; i >= 0; i--) {
          const p = this.pieces[i];
          if (!p.shadow && !p.broken && p.value > 0 && Math.hypot(x - p.x, y - p.y) <= 16) {
            if (p.inEquation && eq && !eq.expanded) continue;
            GameHUD.playSfx(p.type === 'opal' ? 'opalGrab' : (p.type === 'rose' ? 'roseGrab' : 'quartzGrab'));
            this.draggedPiece = p;
            this.dragStartPos = { x, y };
            this.dragMovedDist = 0;
            p.dragging = true;
            const immediateHit = this.findTouchingCompatibleShadow(p, p.x, p.y);
            if (immediateHit) {
              this.triggerImmediateAnnulment(p, immediateHit);
            }
            return;
          }
        }

        if (eq && !eq.broken && eq.expanded && clickedInEq) {
          this.equationPointer = { startX: x, startY: y, origX: eq.x, origY: eq.y, moved: false };
        }
      };

      const onMove = (e) => {
        if (!this.running || this.phase === 'map_iris_in' || this.phase === 'map_active') return;
        const pt = e.touches ? e.touches[0] : e;
        if (!pt) return;
        const { x, y } = this.toLogicalCoords(pt.clientX, pt.clientY);

        if (this.draggedPiece) {
          if (this.phase !== 'gameplay' || this.draggedPiece.broken || this.draggedPiece.value <= 0) {
            this.draggedPiece.dragging = false;
            this.draggedPiece = null;
            this.dragStartPos = null;
            return;
          }
          if (this.dragStartPos) {
            this.dragMovedDist = Math.max(this.dragMovedDist, Math.hypot(x - this.dragStartPos.x, y - this.dragStartPos.y));
          }
          const res = this.moveDraggedPieceWithCollision(this.draggedPiece, x, y);
          if (res && res.annulled) return;

          if (this.draggedPiece && this.pureEquation && !this.pureEquation.broken) {
            const overEq = this.isInsideEquationAura(this.pureEquation, this.draggedPiece.x, this.draggedPiece.y, true);
            this.pureEquation.dropHover = overEq && this.draggedPiece.inEquation !== 'pure';
            this.pureEquation.removeHover = !overEq && this.draggedPiece.inEquation === 'pure';
          }
          return;
        }

        if (this.equationPointer && this.pureEquation && !this.pureEquation.broken) {
          const dist = Math.hypot(x - this.equationPointer.startX, y - this.equationPointer.startY);
          if (dist >= 4) this.equationPointer.moved = true;
          if (this.equationPointer.moved) {
            const rawEqX = this.equationPointer.origX + (x - this.equationPointer.startX);
            const rawEqY = this.equationPointer.origY + (y - this.equationPointer.startY);
            this.moveEquationWithCollision(rawEqX, rawEqY);
          }
        }
      };

      const onUp = () => {
        if (!this.running || this.phase === 'map_iris_in' || this.phase === 'map_active') return;

        if (this.equationPointer && this.pureEquation && !this.pureEquation.broken) {
          const wasTap = !this.equationPointer.moved;
          this.equationPointer = null;
          if (wasTap) {
            this.pureEquation.expanded = !this.pureEquation.expanded;
            GameHUD.playSfx(this.pureEquation.expanded ? 'equationExpand' : 'equationCollapse');
            this.layoutEquationPieces(this.pureEquation, 'pure');
          } else {
            GameHUD.playSfx('quartzDrop');
          }
          this.checkEquationSolved();
          return;
        }

        if (this.draggedPiece) {
          const p = this.draggedPiece;
          const wasQuickTap = this.dragMovedDist < 5;
          p.dragging = false;
          this.draggedPiece = null;
          this.dragStartPos = null;
          if (this.pureEquation) {
            this.pureEquation.dropHover = false;
            this.pureEquation.removeHover = false;
          }
          this.clearTrembleStates();
          if (p.broken || p.value <= 0 || this.phase !== 'gameplay') return;

          if (wasQuickTap && this.trySplitCrystalOnTap(p)) {
            return;
          }

          GameHUD.playSfx(p.type === 'opal' ? 'opalDrop' : (p.type === 'rose' ? 'roseDrop' : 'quartzDrop'));
          this.checkPieceDrop(p);
          if (this.phase === 'gameplay') {
            this.checkEquationSolved();
            this.triggerDefeatIfImpossible();
          }
        }
      };

      const onKeyDown = (e) => {
        if (e.key === 'r' || e.key === 'R') {
          if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
          if (this.isActiveGame()) {
            e.preventDefault();
            this.restartCurrentPhase();
          }
        }
      };

      if (this.canvas && typeof this.canvas.addEventListener === 'function') {
        this.canvas.addEventListener('pointerdown', onDown);
      }
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        window.addEventListener('keydown', onKeyDown);
      }
    },

    // ==========================================================================
    // UPDATE & RENDER LOOP
    // ==========================================================================
    update(dt) {
      if (GameHUD.paused || GameHUD.settingsOpen) {
        if (this.musicAudio && !this.musicAudio.paused) {
          try { this.musicAudio.pause(); } catch (_) {}
        }
        return;
      }

      if (
        (this.phase === 'musical_part1_shadows' || this.phase === 'musical_part2_bright') &&
        this.musicAudio &&
        this.musicAudio.paused &&
        this.musicalTime < 55.5
      ) {
        try { this.musicAudio.play().catch(() => {}); } catch (_) {}
      }

      this.t += dt;
      this.phaseTime += dt;
      IrisTransition.update(dt);
      DialogueBox.update(dt);

      if (this.obstacleDecay < this.targetObstacleDecay) {
        this.obstacleDecay = Math.min(this.targetObstacleDecay, this.obstacleDecay + dt * 1.4);
      }
      if (this.waveActive) {
        this.waveRadius += dt * 210;
        this.obstacleDecay = Math.max(this.obstacleDecay, clamp(this.waveRadius / 180, 0, 1));
      }

      this.updateOpalProximity(dt);

      if (this.phase === 'cutscene_enter') {
        const p = clamp(this.phaseTime / 1.1, 0, 1);
        this.protag.x = R(-12 + p * 42);
        this.ordemCompanion.x = R(-28 + p * 76);
        this.protag.state = p < 1 ? 'walk' : 'idle';
        this.ordemCompanion.state = p < 1 ? 'walk' : 'idle';
        if (this.phaseTime >= 1.2) {
          this.protag.x = 30;
          this.ordemCompanion.x = 48;
          this.protag.state = 'idle';
          this.ordemCompanion.state = 'idle';
          this.openIntroIfAny();
        }
      } else if (this.phase === 'equation_magnetic' && this.magneticAnim) {
        const p = easeInOut(clamp(this.phaseTime / 0.75, 0, 1));
        const m = this.magneticAnim;
        this.pureEquation.x = R(m.pStartX + (m.midX - 10 - m.pStartX) * p);
        this.pureEquation.y = R(m.pStartY + (m.midY - m.pStartY) * p);
        this.shadowEquation.x = R(m.sStartX + (m.midX + 10 - m.sStartX) * p);
        this.shadowEquation.y = R(m.sStartY + (m.midY - m.sStartY) * p);
        this.layoutEquationPieces(this.pureEquation, 'pure');
        this.layoutEquationPieces(this.shadowEquation, 'shadow');

        if (this.phaseTime >= 0.78) {
          this.pureEquation.broken = true;
          this.shadowEquation.broken = true;
          for (const pc of this.pieces) {
            if (pc.inEquation === 'pure' || pc.inEquation === 'shadow') pc.broken = true;
          }
          GameHUD.playSfx('equationShatter');
          GameHUD.playSfx('reward');
          this.spawnShatter(m.midX, m.midY, 'pure', 14);
          this.spawnShatter(m.midX, m.midY, 'shadow', 14);

          if (this.pieces.some((k) => k.shadow && !k.broken)) {
            this.phase = 'gameplay';
            this.phaseTime = 0;
          } else {
            this.onStepCleared(m.midX, m.midY);
          }
        }
      } else if (this.phase === 'finale_crystal_shatter') {
        if (this.phaseTime >= 0.22 && !this.giantCrystalBroken) {
          this.giantCrystalFlash = false;
          this.giantCrystalBroken = true;
          GameHUD.playSfx('ceilingShatter');
          this.spawnShatter(176, 36, 'emerald', 20);
          this.spawnShatter(176, 36, 'pure', 16);
        }
        if (this.phaseTime >= 1.05) {
          this.startMusicalShow();
        }
      } else if (this.phase === 'musical_part1_shadows' || this.phase === 'musical_part2_bright') {
        if (this.musicAudio && !this.musicAudio.paused && this.musicAudio.currentTime > 0 && this.worldKey !== 'sanctuary') {
          this.musicalTime = this.musicAudio.currentTime;
        } else {
          this.musicalTime += dt;
        }
        const mt = this.musicalTime;

        if (this.worldKey === 'sanctuary') {
          this.phase = 'musical_part2_bright';
          const st = mt - 24.0;
          this.gateOpenRatio = clamp(st / 8.0, 0, 1);
          this.ordemCompanion.x = R(132 + Math.sin(st * 1.6) * 20);
          this.ordemCompanion.y = R(136 - Math.abs(Math.sin(st * 2.4)) * 8);
          this.ordemCompanion.state = 'sing';
          this.ordemCompanion.flipX = Math.cos(st * 1.6) < 0;
          this.protag.x = R(62 + Math.sin(st * 1.8) * 8);
          this.protag.state = (Math.floor(st * 2) & 1) ? 'celebrate' : 'idle';
          if (mt >= 56.0) this.finishMusicalShow();
        } else if (mt < 24.0) {
          // PARTE 1: Ambiente escuro cinemático + Guardiã em silhueta + Show de Sombras na parede
          this.phase = 'musical_part1_shadows';
          this.guardianActor.visible = true;
          this.guardianActor.state = 'back_silhouette';
          if (mt < 5.0) {
            const p = easeInOut(clamp(mt / 5.0, 0, 1));
            this.guardianActor.x = R(176 - p * 16 + Math.sin(mt * 2.0) * 10);
            this.guardianActor.y = R(36 + p * 104);
          } else {
            const sw = (mt - 5.0) * 1.2;
            this.guardianActor.x = R(160 + Math.sin(sw) * 38);
            this.guardianActor.y = R(140 - Math.abs(Math.cos(sw * 1.8)) * 6);
            this.guardianActor.flipX = Math.cos(sw) < 0;
          }
        } else if (mt < 56.0) {
          // PARTE 2: Tudo claro + Guardiã vai até o Protagonista + Nuvem + Animais Neon + Tambor + Panorama!
          this.phase = 'musical_part2_bright';
          this.guardianActor.visible = true;
          if (mt < 38.0) {
            const p = easeInOut(clamp((mt - 24.0) / 3.5, 0, 1));
            const sway = Math.sin((mt - 24.0) * 1.4) * 12;
            this.guardianActor.x = R(160 - p * 44 + sway);
            this.guardianActor.y = R(140 - Math.abs(Math.cos(mt * 2.0)) * 4);
            this.guardianActor.state = 'sing';
            this.guardianActor.flipX = true;
          } else {
            if (this.cloudPopTime < 0) this.cloudPopTime = mt;
            const dT = mt - 38.0;
            this.guardianActor.x = R(142 + Math.sin(dT * 1.8) * 34);
            this.guardianActor.y = R(136 - Math.abs(Math.sin(dT * 3.2)) * 8);
            this.guardianActor.state = 'sing';
            this.guardianActor.flipX = Math.cos(dT * 1.8) < 0;
            this.protag.state = (Math.floor(mt * 2) & 1) ? 'celebrate' : 'walk';
            this.ordemCompanion.state = 'sing';
          }
        } else {
          this.finishMusicalShow();
        }
      } else if (this.phase === 'walk_to_world_exit') {
        const p = clamp(this.phaseTime / 1.4, 0, 1);
        this.protag.x = R(68 + p * 176);
        this.ordemCompanion.x = R(96 + p * 156);
        if (this.guardianActor.visible) {
          this.guardianActor.x = R(152 + p * 118);
        }
        if (this.phaseTime >= 0.45 && !IrisTransition.active && !this._exitIrisStarted) {
          this._exitIrisStarted = true;
          IrisTransition.start('out', 250, 118, 0.85, () => {
            this.enterJourneyMapWithIrisIn(true);
          });
        }
      } else if (this.phase === 'next_step_pause') {
        if (this.phaseTime >= 0.65) {
          this.phase = 'gameplay';
          this.phaseTime = 0;
          this.setupStep(this.currentStep + 1);
        }
      } else if (this.phase === 'step_resolving') {
        if (this.phaseTime >= 1.35) {
          this.obstacleDecay = 1;
          this.openPostLevelDialogue();
        }
      } else if (this.phase === 'defeat_pause') {
        this.protag.state = 'shock';
        if (this.phaseTime >= 0.65) {
          this.phase = 'game_over';
          this.phaseTime = 0;
          GameHUD.playSfx('gameOver');
        }
      }
    },

    composeBackground(bgSet) {
      const { dark, cinematic, lit, u32 } = bgSet;
      if (this.phase === 'musical_part1_shadows') {
        u32.set(cinematic);
        return;
      }
      if (
        this.phase === 'musical_part2_bright' ||
        this.phase === 'post_musical_dlg' ||
        this.phase === 'world_celebrate_complete' ||
        this.phase === 'walk_to_world_exit'
      ) {
        u32.set(lit);
        return;
      }
      if (!this.waveActive || this.waveRadius <= 0) {
        u32.set(dark);
        return;
      }
      if (this.waveRadius >= 360) {
        u32.set(lit);
        return;
      }
      const ox = this.waveOrigin.x * 2, oy = this.waveOrigin.y * 2;
      const rad = Math.floor(this.waveRadius * 48) / 24;
      const rim1 = c32('#c8fbff'), rim2 = c32('#ffffff');
      for (let y = 0, i = 0; y < HH; y++) {
        for (let x = 0; x < HW; x++, i++) {
          const d = Math.hypot(x - ox, y - oy) + bay(x, y) * 1.2;
          if (d < rad - 6) u32[i] = lit[i];
          else if (d < rad) u32[i] = ((x + y) & 1) ? rim1 : lit[i];
          else if (d < rad + 4 && bay(x, y) < 4) u32[i] = rim2;
          else u32[i] = dark[i];
        }
      }
    },

    drawShards(ctx) {
      const G = 260;
      for (const s of this.shards) {
        const tau = this.t - s.t0;
        if (tau < 0 || tau > 1.4) continue;
        const x = s.x0 + s.vx * tau;
        const y = Math.min(s.floorY, s.y0 + s.vy * tau + 0.5 * G * tau * tau);
        const frame = (s.v + Math.floor(tau * 12)) & 3;
        const sprSet = SHARD_SPR[s.set] || SHARD_SPR.pure;
        ctx.drawImage(sprSet[frame], R(x), R(y));
      }
    },

    drawCompletionOverlay(ctx, isWorldFinale = false) {
      const spec = this.getSpec();
      const bx = 42, by = 28, bw = 236, bh = 108;
      drawParchmentBox(ctx, bx, by, bw, bh, { headerH: 17, headerBg: '#3d2b24' });

      if (isWorldFinale) {
        const f12 = Math.floor(this.t * SPRITE_FPS);
        for (let k = 0; k < 8; k++) {
          const fx = 24 + ((k * 37) % 272);
          const fy = 24 + ((f12 * 3 + k * 19) % 110);
          drawStar(ctx, fx, fy, (k & 1) ? 3 : 2, '#ffffff', (k % 3 === 0) ? '#f2cc6b' : (k % 3 === 1 ? '#7ec456' : '#68b8c4'));
        }
        drawPixelTextCentered(ctx, spec.worldClearedTitle, bx + bw / 2, by + 8, '#f7e2b8', '#1f1410', bw - 16, 9);
        drawPixelTextCentered(ctx, spec.worldClearedLine1, bx + bw / 2, by + 28, '#2c221e', null, bw - 20, 10);
        drawPixelTextCentered(ctx, spec.worldClearedLine2, bx + bw / 2, by + 41, '#633b34', null, bw - 20, 10);
      } else {
        drawPixelTextCentered(ctx, `${spec.hudLabel} - Fase ${this.currentLevel} Concluída!`, bx + bw / 2, by + 8, '#f7e2b8', '#1f1410', bw - 16, 9);
        drawPixelTextCentered(ctx, spec.phaseClearedLine, bx + bw / 2, by + 32, '#2c221e', null, bw - 20, 10);
      }

      for (let i = 0; i < 3; i++) {
        drawStar(ctx, bx + bw / 2 - 20 + i * 20, by + 62, 4, '#ffffff', '#e3b454');
      }

      const b = this.completeBtnRect;
      ctx.fillStyle = '#2c221e';
      ctx.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
      ctx.fillStyle = '#3e7338';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#d9a85b';
      ctx.fillRect(b.x, b.y, b.w, 1);
      ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
      drawPixelTextCentered(ctx, isWorldFinale ? spec.nextWorldButton : 'Continuar >', b.x + b.w / 2, b.y + 4, '#ffffff', '#1f1410', b.w - 6, 9);
    },

    drawGameOverOverlay(ctx) {
      ctx.fillStyle = 'rgba(10, 8, 6, 0.58)';
      ctx.fillRect(0, 20, W, H - 20);
      const bx = 34, by = 28, bw = 252, bh = 116;
      drawParchmentBox(ctx, bx, by, bw, bh, { headerH: 17, headerBg: '#59221c' });
      drawPixelTextCentered(ctx, 'Equilíbrio Perdido!', bx + bw / 2, by + 8, '#f7e2b8', '#1f1410', bw - 16, 9);
      drawPixelTextCentered(ctx, 'Os cristais perderam o equilíbrio e não podem mais formar o valor exigido nesta etapa.', bx + bw / 2, by + 28, '#2c221e', null, bw - 24, 10);
      drawPixelTextCentered(ctx, 'Recomece a fase para tentar novamente!', bx + bw / 2, by + 64, '#7a2e22', null, bw - 24, 9);

      const b = this.gameOverBtnRect;
      const pulse = (Math.floor(this.t * 6) & 1) === 0;
      ctx.fillStyle = '#2c221e';
      ctx.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
      ctx.fillStyle = pulse ? '#9e3328' : '#7a251c';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = pulse ? '#f2cc6b' : '#d9a85b';
      ctx.fillRect(b.x, b.y, b.w, 1);
      ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
      drawPixelTextCentered(ctx, '↻ Reiniciar Fase', b.x + b.w / 2, b.y + 4, '#ffffff', '#1f1410', b.w - 8, 9);
    },

    renderMusicalElements(ctx, tq) {
      const spec = this.getSpec();
      const mt = this.musicalTime;

      if (this.phase === 'musical_part1_shadows') {
        drawBiomeShadowPlay(ctx, this.worldKey, mt, tq, this.guardianActor.x, this.guardianActor.y);
        ActorAnimator.drawMusicNotesLoop(ctx, this.guardianActor.x, this.guardianActor.y - 24, tq, {
          count: 4,
          dirX: this.guardianActor.flipX ? -16 : 16,
          dirY: -20,
          period: 1.6
        });
      } else if (this.phase === 'musical_part2_bright') {
        const extraVoice = isWorldChorusActive(mt);
        if (this.worldKey === 'sanctuary') {
          // As 4 Rainhas cantam juntas diante do Portão Ancestral aberto!
          ActorAnimator.drawActor(ctx, 'araci', 'sing', 94, 142, tq, { flipX: false });
          ActorAnimator.drawActor(ctx, 'irece', 'sing', 168, 142, tq, { flipX: true });
          ActorAnimator.drawActor(ctx, 'jurema', 'sing', 196, 142, tq, { flipX: true });
          ActorAnimator.drawStoneNeonAnimal(ctx, 'cyan', extraVoice, 18, 142, tq, false);
          ActorAnimator.drawStoneNeonAnimal(ctx, 'magenta', extraVoice, 302, 142, tq, true);
        } else {
          if (mt >= 47.0) {
            drawNextBiomePanorama(ctx, spec.nextBiome, (mt - 47.0) / 5.5, tq);
          }
          if (mt >= 26.0 && mt < 38.0) {
            drawGuardianCloudStory(ctx, this.worldKey, mt, tq, this.guardianActor.x, this.guardianActor.y);
          } else if (this.cloudPopTime > 0 && mt - this.cloudPopTime <= 0.85) {
            drawCloudPopParticles(ctx, mt - this.cloudPopTime);
          }
          if (mt >= 42.0 && mt < 47.0) {
            drawMagicCrystalDrum(ctx, 118, 118, tq);
          }
          ActorAnimator.drawStoneNeonAnimal(ctx, 'cyan', extraVoice, 18, 142, tq, false);
          ActorAnimator.drawStoneNeonAnimal(ctx, 'magenta', extraVoice, 206, 142, tq, true);
          if (mt < 47.0) {
            ActorAnimator.drawStoneNeonAnimal(ctx, 'gold', extraVoice, 298, 142, tq, true);
          }
          ActorAnimator.drawMusicNotesLoop(ctx, this.guardianActor.x, this.guardianActor.y - 24, tq, {
            count: 4,
            dirX: this.guardianActor.flipX ? -14 : 14,
            dirY: -20,
            period: 1.5
          });
        }
      }

      const captions = spec.musicalCaptions || [];
      const capTime = this.worldKey === 'sanctuary' ? (mt - 24.0) * 1.7 : mt;
      for (const [t0, t1, text] of captions) {
        if (capTime >= t0 && capTime <= t1) {
          drawParchmentBox(ctx, 10, 155, 300, 21);
          drawPixelTextCentered(ctx, text, 160, 162, '#2c221e', null, 286, 9);
          break;
        }
      }
    },

    render() {
      const ctx = this.ctx;
      const tq = Math.floor(this.t * SIM_HZ) / SIM_HZ;
      ctx.imageSmoothingEnabled = false;

      if (this.phase === 'map_iris_in' || this.phase === 'map_active') {
        ctx.setTransform(2, 0, 0, 2, 0, 0);
        ctx.clearRect(0, 0, W, H);
        IrisTransition.render(ctx);
        return;
      }

      const bgSet = getBiomeBgSet(this.worldKey);
      this.composeBackground(bgSet);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.putImageData(bgSet.image, 0, 0);
      ctx.setTransform(2, 0, 0, 2, 0, 0);

      const spec = this.getSpec();

      if (this.worldKey === 'sanctuary') {
        drawAncientSanctuaryGate(ctx, this.obstacleDecay, this.gateOpenRatio, tq);
      } else if (this.phase === 'post_musical_dlg' || this.phase === 'world_celebrate_complete' || this.phase === 'walk_to_world_exit') {
        drawNextBiomePanorama(ctx, spec.nextBiome, 1.0, tq);
        ActorAnimator.drawStoneNeonAnimal(ctx, 'cyan', this.phase === 'world_celebrate_complete', 20, 142, tq, false);
        ActorAnimator.drawStoneNeonAnimal(ctx, 'magenta', this.phase === 'world_celebrate_complete', 298, 142, tq, true);
      } else if (this.currentLevel === 4) {
        drawGiantBiomeCrystal(ctx, this.worldKey, this.obstacleDecay, this.giantCrystalFlash, this.giantCrystalBroken, tq);
        if (!this.giantCrystalBroken) {
          ActorAnimator.drawMusicNotesLoop(ctx, 176, 46, tq, { count: 4, dirX: -24, dirY: 18, period: 2.0 });
        }
      } else {
        drawBiomeObstacle(ctx, this.worldKey, this.obstacleDecay, tq);
        if (this.phase === 'gameplay' || this.phase === 'intro_dialogue' || this.phase === 'next_step_pause') {
          ActorAnimator.drawMusicNotesLoop(ctx, 308, 92, tq, { count: 4, dirX: -28, dirY: -16, period: 2.2 });
        }
      }

      if (this.phase === 'musical_part1_shadows' || this.phase === 'musical_part2_bright') {
        this.renderMusicalElements(ctx, tq);
      }

      ActorAnimator.drawActor(ctx, 'protagonist', this.protag.state, this.protag.x, this.protag.y, tq);
      if (this.ordemCompanion.visible) {
        ActorAnimator.drawActor(ctx, 'ordem', this.ordemCompanion.state, this.ordemCompanion.x, this.ordemCompanion.y, tq, {
          flipX: Boolean(this.ordemCompanion.flipX)
        });
      }
      if (this.guardianActor.visible) {
        ActorAnimator.drawActor(ctx, spec.guardianKey, this.guardianActor.state, this.guardianActor.x, this.guardianActor.y, tq, {
          flipX: Boolean(this.guardianActor.flipX)
        });
      }
      if (this.worldKey === 'sanctuary' && (this.phase === 'intro_dialogue' || this.phase === 'post_musical_dlg' || this.phase === 'world_celebrate_complete')) {
        const st = this.phase === 'world_celebrate_complete' ? 'celebrate' : 'idle';
        ActorAnimator.drawActor(ctx, 'araci', st, 126, 142, tq, { flipX: false });
        ActorAnimator.drawActor(ctx, 'irece', st, 156, 142, tq, { flipX: true });
        ActorAnimator.drawActor(ctx, 'jurema', st, 184, 142, tq, { flipX: true });
      }

      if (
        this.phase === 'tutorial' ||
        this.phase === 'gameplay' ||
        this.phase === 'equation_magnetic' ||
        this.phase === 'next_step_pause' ||
        this.phase === 'step_resolving' ||
        this.phase === 'defeat_pause' ||
        this.phase === 'game_over'
      ) {
        drawEmeraldAltar(ctx, this.emeraldAltar, tq);

        if (this.phase === 'equation_magnetic' && this.pureEquation && this.shadowEquation) {
          const f12 = Math.floor(tq * 12);
          for (let x = this.pureEquation.x; x <= this.shadowEquation.x; x += 3) {
            P1(ctx, x, this.pureEquation.y + ((x + f12) & 1 ? -1 : 1), '#ffffff');
          }
        }

        const pureEqMembers = this.pieces.filter((p) => !p.broken && p.value > 0 && p.inEquation === 'pure');
        const shadowEqMembers = this.pieces.filter((p) => !p.broken && p.value > 0 && p.inEquation === 'shadow');
        drawEquationAura(ctx, this.pureEquation, tq, pureEqMembers);
        drawEquationAura(ctx, this.shadowEquation, tq, shadowEqMembers);

        for (const p of this.pieces) {
          drawCrystalPiece(ctx, p, tq);
        }
      }

      this.drawShards(ctx);

      const inMusical = this.phase === 'musical_part1_shadows' || this.phase === 'musical_part2_bright';
      GameHUD.renderTopBar(ctx, this.currentLevel, this.currentStep, this.totalSteps, inMusical, spec.customHudTitle || null);

      if (inMusical) {
        const sb = this.skipMusicalBtnRect;
        ctx.fillStyle = '#3d2b24';
        ctx.fillRect(sb.x, sb.y, sb.w, sb.h);
        ctx.fillStyle = '#d9a85b';
        ctx.fillRect(sb.x, sb.y, sb.w, 1);
        ctx.fillRect(sb.x, sb.y + sb.h - 1, sb.w, 1);
        ctx.fillRect(sb.x, sb.y, 1, sb.h);
        ctx.fillRect(sb.x + sb.w - 1, sb.y, 1, sb.h);
        drawPixelTextCentered(ctx, 'Pular >>', sb.x + sb.w / 2, sb.y + 4, '#f7e2b8', '#120d0b', sb.w - 4, 8);
      }

      DialogueBox.render(ctx, tq);
      TutorialModal.render(ctx, tq);

      if (this.phase === 'celebrate_complete') {
        this.drawCompletionOverlay(ctx, false);
      } else if (this.phase === 'world_celebrate_complete') {
        this.drawCompletionOverlay(ctx, true);
      } else if (this.phase === 'game_over') {
        this.drawGameOverOverlay(ctx);
      }

      GameHUD.renderModals(ctx);
      IrisTransition.render(ctx);
    },

    loop(now) {
      if (!this.running) return;
      const dt = Math.min(0.1, Math.max(0.001, (now - this.lastNow) / 1000));
      this.lastNow = now;
      this.update(dt);
      this.render();
      requestAnimationFrame((n) => this.loop(n));
    }
  };

  global.TruePixelWorlds = TruePixelWorlds;
})(typeof window !== 'undefined' ? window : globalThis);
