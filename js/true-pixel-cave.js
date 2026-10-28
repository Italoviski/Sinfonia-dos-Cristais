'use strict';
/**
 * MUNDO 1: A CAVERNA — Cutscene de Abertura, Fases 1–4, Show Musical "Era Uma Vez (A Ordem)",
 * Conclusão Especial do Mundo e Transição Iris Out/In para o Mapa (True Pixel Art 320x180).
 * Reutiliza 100% do Banco Central de Animações (`TruePixelEngine.SpriteBank` / `ActorAnimator`),
 * a Caixa de Diálogo Global (`DialogueBox`), o Tutorial Paginado (`TutorialModal`) e `IrisTransition`.
 */
(function (global) {
  const E = global.TruePixelEngine;
  if (!E) return;

  const {
    W, H, SPRITE_FPS, SIM_HZ, bay, mulberry, c32, fromMap, silhouette,
    P1, drawRing, drawStar, drawPixelText, drawPixelTextCentered, drawParchmentBox,
    ActorAnimator, IrisTransition, DialogueBox, TutorialModal, GameHUD, StandardTutorialCards
  } = E;
  const R = Math.round;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeInOut = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

  const HW = 640, HH = 360;
  const RH = (v) => Math.round(v * 2) * 0.5;
  // Pixel físico Hi-Bit (0.5 px lógico) alinhado à grade 640x360
  const P = (ctx, x, y, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(RH(x), RH(y), 0.5, 0.5);
  };

  // ============================================================================
  // SPRITES HI-BIT DE CRISTAIS E FRAGMENTOS (34x42 PIXELS FÍSICOS — ESTILO OWLBOY)
  // Gemas grandes esculpidas com facetas pictóricas suaves, refração interna e
  // brilho especular sem contorno preto grosso.
  // ============================================================================
  function buildHiBitGem(shape, pal) {
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
      // Formato octogonal lapidado para Quartzo ou gota flamejante multifacetada para Opala
      const maxHalfW = shape === 'opal'
        ? (dy < 0 ? (1 - Math.pow(ny, 0.82)) * 14.5 : (1 - Math.pow(ny, 1.35)) * 14.5)
        : (ny < 0.36 ? 13.5 - ny * 4.5 : (1 - (ny - 0.36) / 0.64) * 11.8);

      const hw = Math.round(maxHalfW);
      if (hw <= 0) continue;

      for (let px = Math.round(cx - hw); px <= Math.round(cx + hw); px++) {
        const dx = (px - cx) / Math.max(1, hw);
        const adx = Math.abs(dx);
        let col = pal.M;

        // Borda pictórica suave colorida (sem contorno preto grosso)
        if (adx > 0.88 || ny > 0.91) {
          col = (dx < 0 && dy < 0) ? pal.L : pal.K;
        } else if (shape === 'opal') {
          // Núcleo incandescente vivo da Opala de Fogo
          const coreD = Math.hypot(dx * 1.15, (dy - 0.06) * 1.25);
          if (coreD < 0.32) col = pal.W;
          else if (coreD < 0.56) col = ((px + py) & 1) ? pal.H : pal.W;
          else if (coreD < 0.78) col = (dx < 0 || ((px + py) & 1)) ? pal.L : pal.M;
          else col = dx < 0 ? pal.M : pal.D;
        } else {
          // Facetas cristalinas com planos de luz, dithering suave e refração interna
          const inTable = adx < 0.46 && ny < 0.48;
          if (inTable) {
            if (dx + dy < -0.32) col = pal.W;
            else if (dx + dy < 0.08) col = ((px + py) & 1) ? pal.H : pal.L;
            else if (dx + dy < 0.42) col = pal.L;
            else col = pal.M;
          } else {
            // Cristas diagonais de lapidação
            const ridge = Math.abs(adx - 0.46) < 0.09 || Math.abs(ny - 0.48) < 0.06;
            if (ridge && dx < 0.25 && dy < 0.25) {
              col = pal.H;
            } else if (dx < -0.35 && dy < 0.25) {
              col = ((px + py) & 1) ? pal.W : pal.H;
            } else if (dx < 0 && dy < 0) {
              col = pal.L;
            } else if (dx > 0.32 && dy > 0.15) {
              col = ((px + py) & 1) ? pal.K : pal.D;
            } else if (dx > 0 || dy > 0.35) {
              col = pal.D;
            } else {
              col = pal.M;
            }
          }
        }
        put(px, py, col);
      }
    }

    // Brilho especular estrelado na faceta superior esquerda
    put(11, 9, '#ffffff');
    put(12, 9, '#ffffff');
    put(11, 10, '#ffffff');
    put(10, 9, pal.W);
    put(11, 8, pal.W);
    return c;
  }

  // Paleta Owlboy pictórica quente e suave (warm muted tones, sem neon agressivo nem bordas pretas)
  const GEM_SPRITES = {
    white_pure: buildHiBitGem('quartz', {
      W: '#ffffff', H: '#e3f4f7', L: '#a8d8e6', M: '#6caac4', D: '#437794', K: '#294c66'
    }),
    white_shadow: buildHiBitGem('quartz', {
      W: '#b8a6d9', H: '#8572ab', L: '#5e4d82', M: '#413361', D: '#2a1f42', K: '#1a122b'
    }),
    rose_pure: buildHiBitGem('quartz', {
      W: '#fff2f5', H: '#f7cad8', L: '#e396b1', M: '#bf6588', D: '#8c3f60', K: '#59223b'
    }),
    rose_shadow: buildHiBitGem('quartz', {
      W: '#cfa3c4', H: '#96688c', L: '#6e4666', M: '#4d2d47', D: '#331a2e', K: '#1f0e1c'
    }),
    opal_pure: buildHiBitGem('opal', {
      W: '#fff6cc', H: '#f7c97e', L: '#e68a49', M: '#c45131', D: '#8c2d1f', K: '#541812'
    }),
    opal_shadow: buildHiBitGem('opal', {
      W: '#c99b8f', H: '#8f5d52', L: '#693c34', M: '#4a2620', D: '#301512', K: '#1c0b09'
    }),
    flash: buildHiBitGem('quartz', {
      W: '#ffffff', H: '#ffffff', L: '#ffffff', M: '#ffffff', D: '#e8f6ff', K: '#b8ecff'
    })
  };

  const SHARD_ROWS = [
    ['..W..', '.LWM.', 'LLMMD', '.MDD.', '..D..'],
    ['.LW..', 'LLMMD', '.MDDD', '..D..'],
    ['.LW.', 'WMMD', 'MDDD', '.DD.'],
    ['..WW.', '.LMMM', 'DDDD.']
  ];
  const SHARD_SPR = {
    pure: SHARD_ROWS.map(r => fromMap(r, { W: '#ffffff', L: '#dff4ff', M: '#6caac4', D: '#437794' })),
    rose: SHARD_ROWS.map(r => fromMap(r, { W: '#ffffff', L: '#f7cad8', M: '#bf6588', D: '#8c3f60' })),
    opal: SHARD_ROWS.map(r => fromMap(r, { W: '#fff6cc', L: '#e68a49', M: '#c45131', D: '#8c2d1f' })),
    shadow: SHARD_ROWS.map(r => fromMap(r, { W: '#b8a6d9', L: '#5e4d82', M: '#413361', D: '#2a1f42' })),
    rock: SHARD_ROWS.map(r => fromMap(r, { W: '#6e635f', L: '#524846', M: '#3b3332', D: '#262020' }))
  };

  // ============================================================================
  // UNIDADES EM BOLINHAS LUMINOSAS FORA DOS CRISTAIS (Estilo Pictórico Owlboy)
  // Facetas do cristal 100% limpas; as unidades (1 a 6) flutuam em um arco
  // harmonioso logo acima/ao redor do cristal com sombreamento esférico e brilho.
  // ============================================================================
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
    // Halo externo suave quando soma/subtrai
    if (pulse) {
      ctx.fillStyle = '#fff6cc';
      ctx.fillRect(ox - 3.5, oy - 1.5, 7, 3);
      ctx.fillRect(ox - 1.5, oy - 3.5, 3, 7);
    }
    // Borda esférica sombreada (7x7 pixels físicos = 3.5x3.5 lógicos)
    ctx.fillStyle = rimCol;
    ctx.fillRect(ox - r, oy - r + 0.5, r * 2, r * 2 - 1);
    ctx.fillRect(ox - r + 0.5, oy - r, r * 2 - 1, r * 2);

    // Corpo luminoso da bolinha
    ctx.fillStyle = midCol;
    ctx.fillRect(ox - r + 0.5, oy - r + 0.5, r * 2 - 1, r * 2 - 1);

    // Núcleo brilhante e ponto especular superior esquerdo
    ctx.fillStyle = coreCol;
    ctx.fillRect(ox - 1, oy - 1, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox - 1, oy - 1.5, 1, 1);
  }

  function drawCrystalPiece(ctx, piece, t) {
    if (!piece || piece.broken || piece.value <= 0) return;

    // 100% ESTÁTICO por padrão: só treme quando a Opala de Fogo está próxima ou em rejeição de cor!
    const isTrembling = Boolean(piece.trembling) || Boolean(piece.rejectUntil && t < piece.rejectUntil);
    const [tx, ty] = ActorAnimator.getCrystalTrembleOffset(t, isTrembling, ctx, piece.x, piece.y);
    const x = RH(piece.x + tx), y = RH(piece.y + ty);

    if (piece.dragging) {
      drawRing(ctx, R(x), R(y), 14, '#e6cf9c');
    }

    let spr = GEM_SPRITES.white_pure;
    if (piece.shadow) {
      if (piece.type === 'rose') spr = GEM_SPRITES.rose_shadow;
      else if (piece.type === 'opal') spr = GEM_SPRITES.opal_shadow;
      else spr = GEM_SPRITES.white_shadow;
    } else if (piece.type === 'rose') {
      spr = GEM_SPRITES.rose_pure;
    } else if (piece.type === 'opal') {
      spr = GEM_SPRITES.opal_pure;
    }
    // Desenha o cristal com as facetas 100% limpas (sem marcadores internos!)
    const gw = spr.width * 0.5, gh = spr.height * 0.5;
    ctx.drawImage(spr, RH(x - gw / 2), RH(y - gh / 2), gw, gh);

    // Desenha as unidades como bolinhas luminosas FORA do cristal em um arco acima dele
    const val = clamp(piece.value || 1, 1, 6);
    const orbCoords = EXTERNAL_ORB_ARCS[val] || EXTERNAL_ORB_ARCS[1];
    const recentlyChanged = Boolean(piece.lastValChangeAt && (t - piece.lastValChangeAt) < 0.28);

    const coreCol = piece.shadow ? '#f3e0ff' : '#fffdf2';
    const midCol = piece.shadow
      ? (piece.type === 'rose' ? '#cfa3c4' : '#9b84c4')
      : piece.type === 'opal'
        ? '#f7b259'
        : piece.type === 'rose'
          ? '#f29bb8'
          : '#7fd4e6';
    const rimCol = piece.shadow ? '#1f142e' : (piece.type === 'opal' ? '#4a1912' : (piece.type === 'rose' ? '#4f1e35' : '#1e3a4d'));
    const linkCol = piece.shadow ? '#6e5794' : (piece.type === 'opal' ? '#e68a49' : (piece.type === 'rose' ? '#d97a9c' : '#569bb0'));

    // Filamento energético suave conectando o arco de bolinhas externas ao topo do cristal
    ctx.fillStyle = linkCol;
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
      drawExternalOrb(ctx, x + ox, y + oy, coreCol, midCol, rimCol, recentlyChanged);
    }
  }

  // ============================================================================
  // AURA EXPANSÍVEL DA EQUAÇÃO CRISTALINA EM LOOP (Estilo Pictórico Owlboy)
  // Inclui conexões luminosas entre os cristais internos e destaque de encaixe!
  // ============================================================================
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

    // Conexões energéticas luminosas ligando os cristais que estão dentro da equação
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

    // Etiqueta de pergaminho perfeitamente centralizada ao arrastar um cristal para adicionar/retirar
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
  // CRISTAL ENORME DO TETO NA FASE 4 — HI-BIT 136x104 PIXELS FÍSICOS (68x52 LÓGICOS)
  // Formação cristalina monumental no teto com a silhueta de alta resolução da Rainha da Ordem.
  // ============================================================================
  function buildGiantCeilingCrystalSprite(crackStage = 0, flashMode = false) {
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
    // Cristais secundários laterais cravados no teto (estilo pictórico Owlboy)
    const drawSpire = (sx, sy, sw, sh, tilt) => {
      for (let py = 0; py < sh; py++) {
        const hw = Math.max(1, Math.round(sw * (1 - py / sh)));
        const ox = Math.round((py / sh) * tilt);
        for (let dx = -hw; dx <= hw; dx++) {
          const px = sx + ox + dx, y = sy + py;
          if (flashMode) { put(px, y, '#ffffff'); continue; }
          const ndx = dx / Math.max(1, hw);
          let col = '#3d5873';
          if (Math.abs(ndx) > 0.85) col = ndx < 0 ? '#a8d8e6' : '#243547';
          else if (ndx < -0.25) col = ((px + y) & 1) ? '#84bdd1' : '#5e96ab';
          else if (ndx > 0.35) col = '#2c4157';
          put(px, y, col);
        }
      }
    };
    drawSpire(cx - 46, 0, 14, 54, -12);
    drawSpire(cx + 46, 0, 14, 54, 12);
    drawSpire(cx - 32, 0, 13, 70, -6);
    drawSpire(cx + 32, 0, 13, 70, 6);

    // Corpo central monumental octogonal multifacetado (100px de altura física)
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
        let col = '#3d5873';
        if (adx > 0.92 || py === 99) col = ndx < 0 ? '#d8f3fa' : '#223242';
        else if (Math.abs(adx - 0.48) < 0.05) col = '#b8e4f2';
        else if (ndx < -0.48) col = ((px + py) & 1) ? '#96cde0' : '#73afc4';
        else if (ndx < 0) col = ((px + py) & 1) ? '#5e96ab' : '#4a7a8f';
        else if (ndx < 0.48) col = '#37536b';
        else col = '#263b4d';
        put(px, py, col);
      }
    }

    if (!flashMode && E.SpriteBank && E.SpriteBank.ordem) {
      // Silhueta de alta resolução (48x68) da Rainha da Ordem aprisionada no núcleo
      const silSpr = E.SpriteBank.ordem.back_silhouette[0];
      x.globalAlpha = 0.85;
      x.drawImage(silSpr, cx - 24, 14);
      x.globalAlpha = 1.0;

      // Rachaduras luminosas progressivas em alta resolução
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
            put(rx + 1, ry, '#a8e6cf');
          }
        }
      }
    }
    return c;
  }

  const GIANT_CRYSTAL_CACHE = [
    buildGiantCeilingCrystalSprite(0, false),
    buildGiantCeilingCrystalSprite(1, false),
    buildGiantCeilingCrystalSprite(2, false),
    buildGiantCeilingCrystalSprite(3, false),
    buildGiantCeilingCrystalSprite(0, true)
  ];

  function drawGiantCeilingCrystal(ctx, crackRatio, flashMode, broken, t) {
    if (broken) return;
    const stage = clamp(Math.floor(crackRatio * 3), 0, 3);
    const spr = flashMode ? GIANT_CRYSTAL_CACHE[4] : GIANT_CRYSTAL_CACHE[stage];
    const w = spr.width * 0.5, h = spr.height * 0.5;
    ctx.drawImage(spr, RH(176 - w / 2), 20, w, h);
    if (!flashMode && (Math.floor(t * SPRITE_FPS) & 1) === 0) {
      P1(ctx, 176, 40, '#ffffff');
    }
  }

  // ============================================================================
  // CENÁRIO HI-BIT (640x360) EM CAMADAS ESTILO OWLBOY (buildCaveBackground)
  // Pilares rochosos monumentais em múltiplas camadas de paralaxe, neblina atmosférica
  // em dithering horizontal suave, plataformas de pedra esculpida (#262020..#6e635f)
  // e cobertura de musgo/grama detalhada folha a folha (#367030..#a5e06c).
  // ============================================================================
  function buildCaveBackground(mode) {
    // mode: 'dark' | 'cinematic_crystals' | 'lit'
    const buf = new Uint32Array(HW * HH);
    const rnd = mulberry(2026);
    const P = mode === 'lit'
      ? {
          sky0: '#4a6b82', sky1: '#688ea3', sky2: '#8cb3c2', mist: '#bfd9de',
          farPillar: '#3d586b', midPillar: '#2e4352', midPillarHi: '#4f6d80',
          rock0: '#262020', rock1: '#3b3332', rock2: '#524846', rock3: '#6e635f',
          moss0: '#367030', moss1: '#539e43', moss2: '#7ec456', moss3: '#a5e06c',
          cA: '#68b8c4', cAHi: '#e6fafc', cALo: '#396e7a'
        }
      : mode === 'cinematic_crystals'
        ? {
            sky0: '#0b0e17', sky1: '#111726', sky2: '#182236', mist: '#24344d',
            farPillar: '#0e1320', midPillar: '#090d17', midPillarHi: '#1c283d',
            rock0: '#0d0b0c', rock1: '#171415', rock2: '#241f20', rock3: '#332c2d',
            moss0: '#142914', moss1: '#1f3d1e', moss2: '#2d572a', moss3: '#3e7338',
            cA: '#5ec9db', cAHi: '#ffffff', cALo: '#296473'
          }
        : {
            sky0: '#1e2836', sky1: '#2a394a', sky2: '#394d61', mist: '#546e82',
            farPillar: '#1b2430', midPillar: '#141b24', midPillarHi: '#2c3b4d',
            rock0: '#1c1717', rock1: '#2b2423', rock2: '#3d3432', rock3: '#544845',
            moss0: '#224720', moss1: '#34692f', moss2: '#4b8c41', moss3: '#68ad58',
            cA: '#4b8a9c', cAHi: '#a8e6f0', cALo: '#274d59'
          };

    const put = (x, y, h) => {
      x = R(x); y = R(y);
      if (x < 0 || y < 0 || x >= HW || y >= HH) return;
      buf[y * HW + x] = c32(h);
    };

    // 1. Gradiente atmosférico de profundidade + bandas de neblina estilo Owlboy
    const skyBands = [P.sky0, P.sky1, P.sky2, P.mist];
    for (let y = 0; y < HH; y++) {
      const t = clamp(y / 290, 0, 0.999) * 3;
      const b0 = Math.floor(t);
      const frac = t - b0;
      for (let x = 0; x < HW; x++) {
        let b = b0;
        if (b < 3 && bay(x, y) / 16 < frac) b++;
        put(x, y, skyBands[b]);
      }
    }

    // 2. Camada distante de pilares rochosos monumentais (paralaxe 1)
    const farPillars = [
      [58, 34, 290, P.farPillar],
      [152, 44, 285, P.farPillar],
      [274, 52, 292, P.farPillar],
      [412, 48, 288, P.farPillar],
      [536, 40, 290, P.farPillar]
    ];
    for (const [cx, hw, maxH, col] of farPillars) {
      for (let y = 24; y < maxH; y++) {
        const wobble = Math.round(Math.sin(y * 0.07 + cx) * 4);
        const curHW = hw + Math.round(Math.sin(y * 0.04) * 3);
        for (let x = cx - curHW + wobble; x <= cx + curHW + wobble; x++) {
          // Dissolve na neblina inferior com dithering horizontal estilo Owlboy
          const mistFade = (y - 210) / 80;
          if (mistFade > 0 && bay(x, y) / 16 < mistFade) continue;
          put(x, y, col);
        }
      }
    }

    // 3. Camada média de pilares rochosos esculpidos com musgo suspenso (paralaxe 2)
    const midPillars = [
      [24, 30, 300],
      [108, 26, 295],
      [482, 32, 298],
      [608, 36, 304]
    ];
    for (const [cx, hw, maxH] of midPillars) {
      for (let y = 16; y < maxH; y++) {
        const jag = Math.round(Math.sin(y * 0.11 + cx * 0.2) * 3);
        for (let dx = -hw; dx <= hw; dx++) {
          const px = cx + dx + jag;
          const mistFade = (y - 235) / 68;
          if (mistFade > 0 && bay(px, y) / 16 < mistFade) continue;
          const isLit = dx < -hw * 0.35 && ((px + y) & 1) === 0;
          put(px, y, isLit ? P.midPillarHi : P.midPillar);
        }
      }
    }

    // 4. Bandas horizontais de neblina atmosférica ao pé dos pilares (assinatura visual da print de Owlboy)
    for (const [mistY, mistH] of [[218, 12], [244, 16], [268, 18]]) {
      for (let dy = 0; dy < mistH; dy++) {
        const y = mistY + dy;
        const density = 1 - Math.abs(dy - mistH / 2) / (mistH / 2);
        for (let x = 0; x < HW; x++) {
          if (bay(x, y) / 16 < density * 0.65) {
            put(x, y, P.mist);
          }
        }
      }
    }

    // 5. Arco rochoso superior com vegetação/musgo pendurado (moldura natural da caverna)
    for (let x = 0; x < HW; x++) {
      const archH = Math.round(38 + Math.sin(x * 0.025) * 8 + Math.cos(x * 0.07) * 4 + (x < 90 || x > 550 ? 22 : 0));
      for (let y = 0; y < archH; y++) {
        const depth = (archH - y) / archH;
        const col = depth < 0.18 ? P.rock0 : (depth < 0.45 ? P.rock1 : P.rock2);
        put(x, y, col);
      }
      // Vinhas e musgo pendurados do teto rochoso
      if ((x % 11) < 4) {
        const vineLen = 4 + ((x * 7) % 10);
        for (let vy = 0; vy < vineLen; vy++) {
          put(x, archH + vy, vy < 2 ? P.moss0 : (vy < vineLen - 2 ? P.moss1 : P.moss2));
        }
      }
    }

    // 6. Grande Ilha/Plataforma de Pedra Esculpida (y = 284..360 em 640x360, equiv. y = 142 em 320x180)
    // Blocos facetados em tons terrosos/ardósia (#262020, #3b3332, #524846, #6e635f)
    for (let y = 284; y < HH; y++) {
      for (let x = 0; x < HW; x++) {
        // Facetas poligonais de rocha esculpida
        const cellX = Math.floor((x + Math.sin(y * 0.08) * 6) / 34);
        const cellY = Math.floor((y - 284) / 22);
        const fx = ((x + Math.sin(y * 0.08) * 6) % 34 + 34) % 34;
        const fy = (y - 284) % 22;
        const seam = fx < 2 || fy < 2;
        let col = P.rock1;
        if (seam || y > 346) {
          col = P.rock0;
        } else if (fx + fy < 18) {
          col = ((x + y) & 1) === 0 ? P.rock3 : P.rock2;
        } else if (fx + fy < 34) {
          col = P.rock2;
        } else {
          col = ((cellX + cellY) & 1) ? P.rock1 : P.rock0;
        }
        put(x, y, col);
      }
    }

    // 7. Cobertura de Musgo e Grama Detalhada Folha a Folha no topo da plataforma (y = 278..294)
    for (let x = 0; x < HW; x++) {
      const grassTop = 280 - Math.round(Math.sin(x * 0.19) * 2 + ((x * 13) % 3));
      const mossBottom = 289 + Math.round(Math.sin(x * 0.11) * 3 + ((x * 7) % 4));
      for (let y = grassTop; y <= mossBottom; y++) {
        const t = (y - grassTop) / Math.max(1, mossBottom - grassTop);
        let col = P.moss1;
        if (t < 0.22) col = ((x + y) & 1) ? P.moss3 : P.moss2;
        else if (t < 0.55) col = P.moss2;
        else if (t < 0.82) col = P.moss1;
        else col = P.moss0;
        put(x, y, col);
      }
    }

    // 8. Cristais minerais do ambiente (que permanecem acesos na escuridão cinemática!)
    const envCrystals = [
      [44, 282, 32, 10, -0.15],
      [58, 282, 44, 14, 0.05],
      [124, 282, 26, 10, -0.15],
      [138, 282, 36, 14, 0.0],
      [152, 282, 32, 14, 0.08],
      [166, 282, 28, 10, 0.2],
      [576, 282, 40, 14, -0.1],
      [592, 282, 30, 10, 0.2]
    ];
    for (const [cx, base, h, w, lean] of envCrystals) {
      const hw = w >> 1;
      for (let y = 0; y < h; y++) {
        const half = Math.min(hw, Math.max(1, Math.round(hw * (1 - y / h))));
        const ox = cx + R(y * lean);
        for (let dx = -half; dx <= half; dx++) {
          put(ox + dx, base - y, dx < -1 ? P.cAHi : dx <= 1 ? P.cA : P.cALo);
        }
      }
      if (mode === 'cinematic_crystals') {
        for (let dy = -48; dy <= 14; dy++) {
          for (let dx = -48; dx <= 48; dx++) {
            const dist = Math.hypot(dx, dy);
            if (dist < 46 && bay(cx + dx, base - 18 + dy) < (1 - dist / 46) * 10) {
              const py = base - 18 + dy, px = cx + dx;
              if (py < 282) put(px, py, '#1c384f');
            }
          }
        }
      }
    }
    return buf;
  }

  const BG_DARK = buildCaveBackground('dark');
  const BG_CINEMATIC = buildCaveBackground('cinematic_crystals');
  const BG_LIT = buildCaveBackground('lit');
  const BG_IMAGE = new ImageData(HW, HH);
  const BG_U32 = new Uint32Array(BG_IMAGE.data.buffer);

  function drawMagicCushion(ctx, cx, cy, progress, t) {
    if (progress <= 0) return;
    const f12 = Math.floor(t * SPRITE_FPS);
    const rx = R(22 * progress), ry = R(7 * progress);
    if (rx <= 1 || ry <= 1) return;

    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        const d = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        if (d > 1) continue;
        const px = R(cx + dx), py = R(cy + dy);
        if (d > 0.76) {
          P1(ctx, px, py, ((px + py + f12) & 1) ? '#9ef0ff' : '#c7a6ff');
        } else if (bay(px + f12, py) < 7) {
          P1(ctx, px, py, dy < 0 ? '#d0fcff' : '#3fc6f0');
        }
      }
    }
  }

  function drawPathObstacle(ctx, decayRatio, t) {
    if (decayRatio >= 1) return;
    const ox = 264, baseY = 142;
    const maxH = 74;
    const curH = R(maxH * (1 - decayRatio));
    const topY = baseY - curH;

    for (let y = topY; y < baseY; y++) {
      const progressY = (y - topY) / Math.max(1, curH);
      const hw = R(14 + progressY * 8);
      for (let dx = -hw; dx <= hw; dx++) {
        const x = ox + dx;
        let col = '#261e4a';
        if (dx === -hw || y === topY) col = '#4a3c74';
        else if (dx === hw) col = '#140f2d';
        else if (((x + y) % 7 === 0) && decayRatio > 0) col = '#9ef0ff';
        P1(ctx, x, y, col);
      }
    }
    if (decayRatio < 0.9) {
      const f6 = Math.floor(t * 6);
      drawRing(ctx, ox, baseY - R(curH * 0.5), 5, (f6 & 1) ? '#b070ff' : '#5a3296');
    }
  }

  // ============================================================================
  // ELEMENTOS VISUAIS DA PARTE MUSICAL (PARTE 1 E PARTE 2)
  // ============================================================================

  // 1. PARTE 1 (00:00 - 01:20): Teatro de Sombras Hi-Bit na Parede da Caverna + Coreografia da Ordem
  function drawShadowPlayOnWall(ctx, mt, t, ordemX = 160, ordemY = 140) {
    const wx = 66, wy = 18, ww = 188, wh = 92;
    const cx = wx + ww * 0.5;
    const cy = wy + wh * 0.5;
    const f12 = Math.floor(t * SPRITE_FPS);

    // Quase-blecaute dramático no fim do Verso 2 (01:00 - 01:03: "E assim chegamos ao fim...")
    const blackoutFade = (mt >= 59.5 && mt < 63.5)
      ? clamp(1 - Math.sin(clamp((mt - 59.5) / 4.0, 0, 1) * Math.PI) * 0.88, 0.12, 1)
      : 1.0;

    // 1. Feixes de luz volumétricos dramáticos cortando a neblina da caverna (presentes em toda a Parte 1, mais intensos na Intro e no Solo)
    const beamIntensity = mt < 11.0 ? 0.22 : (mt >= 63.5 ? 0.20 : 0.11 * blackoutFade);
    ctx.save();
    for (let b = 0; b < 3; b++) {
      const topX = 112 + b * 48 + Math.sin(t * 0.9 + b * 1.7) * 6;
      const botX = ( b === 1 ? ordemX : (104 + b * 56 + Math.sin(t * 1.1 + b) * 10) );
      ctx.fillStyle = b === 1
        ? `rgba(242, 204, 107, ${beamIntensity.toFixed(3)})`
        : `rgba(104, 184, 196, ${(beamIntensity * 0.85).toFixed(3)})`;
      for (let y = 16; y < 142; y += 2) {
        const p = (y - 16) / 126;
        const bx = topX + (botX - topX) * p;
        const bw = 6 + p * (b === 1 ? 26 : 18);
        ctx.fillRect(RH(bx - bw * 0.5), y, RH(bw), 2);
      }
    }
    ctx.restore();

    // 2. Mural rochoso iluminado em estilo Hi-Bit Owlboy (com bordas orgânicas suaves em 0.5px)
    if (mt >= 7.5) {
      const muralReveal = mt < 11.0 ? clamp((mt - 7.5) / 3.5, 0, 1) : 1.0;
      const effAlpha = muralReveal * blackoutFade;
      ctx.save();
      ctx.globalAlpha = effAlpha;
      for (let y = wy; y < wy + wh; y += 2) {
        for (let x = wx; x < wx + ww; x += 2) {
          const dx = (x - cx) / (ww * 0.5);
          const dy = (y - cy) / (wh * 0.5);
          const dist = Math.hypot(dx, dy);
          if (dist <= 1.0) {
            const col = dist < 0.55 ? '#1f2b4d' : (dist < 0.82 ? '#161e38' : '#0f1428');
            ctx.fillStyle = col;
            ctx.fillRect(x, y, 2, 2);
          }
        }
      }
      // Moldura de pedra antiga entalhada ao redor do mural
      drawRing(ctx, R(cx), R(cy), R(wh * 0.48), '#3b4e7a');
      ctx.restore();
    }

    // 3. Cenas sincronizadas verso a verso com a música (00:00 a 01:20)
    if (mt < 11.0) {
      // [00:00 - 00:11] INTRO DE VIOLINO: Neblina mística, feixes de luz e partículas acompanhando a descida e abertura de asas da Ordem
      for (let i = 0; i < 16; i++) {
        const px = 84 + ((i * 31 + R(Math.sin(t * 1.4 + i) * 12)) % 152);
        const py = 22 + ((i * 19 + f12 * 2) % 114);
        P(ctx, px, py, (i & 1) ? '#f2cc6b' : '#9ee6f0');
      }
      // Halo de pouso e abertura de asas quando a Ordem toca o palco (mt >= 5.5)
      if (mt >= 5.5) {
        const wingP = clamp((mt - 5.5) / 4.5, 0, 1);
        const wingSpan = R(10 + wingP * 28);
        drawRing(ctx, R(ordemX), R(ordemY - 22), R(8 + wingP * 16), '#f2cc6b');
        for (let w = 4; w <= wingSpan; w += 2) {
          const wyOff = R(Math.sin((w / wingSpan) * Math.PI) * 10);
          P(ctx, ordemX - w, ordemY - 22 - wyOff, '#f7e2b8');
          P(ctx, ordemX + w, ordemY - 22 - wyOff, '#f7e2b8');
        }
      }
    } else if (mt < 22.0) {
      // [00:11 - 00:22] "Era uma vez um reino envolto em pura alegria, guiado por quatro gemas em harmonia"
      const pVerse = clamp((mt - 11.0) / 11.0, 0, 1);

      // Silhueta Hi-Bit das torres e pontes do Reino em paz na base do mural
      const baseMuralY = wy + wh - 16;
      ctx.fillStyle = '#0c1022';
      ctx.fillRect(cx - 58, baseMuralY, 116, 8);
      const spires = [
        [-44, 22, 10], [-26, 32, 12], [-8, 44, 16], [12, 34, 12], [30, 26, 10], [44, 18, 8]
      ];
      for (const [sx, sh, sw] of spires) {
        ctx.fillStyle = '#111830';
        ctx.fillRect(R(cx + sx), baseMuralY - sh, sw, sh);
        // Telhado pontiagudo estilo Owlboy
        for (let r = 0; r < 6; r++) {
          ctx.fillStyle = '#293861';
          ctx.fillRect(R(cx + sx + r), baseMuralY - sh - r, Math.max(2, sw - r * 2), 1);
        }
        // Janelinhas acesas em ouro quente
        P(ctx, cx + sx + sw * 0.5, baseMuralY - sh + 6, '#f2cc6b');
        P(ctx, cx + sx + sw * 0.5, baseMuralY - sh + 12, '#f2cc6b');
      }

      // As 4 Gemas Primordiais orbitando em harmonia acima do Reino (Caverna, Floresta, Rio, Caatinga)
      const gemColors = [
        ['#e396b1', '#ffffff'], // Gema da Fada / Caverna
        ['#6ec488', '#e2ffea'], // Esmeralda Primordial / Floresta
        ['#68b8c4', '#e0faff'], // Turmalina Paraíba / Rio
        ['#e37b4b', '#ffe6b8']  // Opala de Fogo / Caatinga
      ];
      const orbitCx = cx, orbitCy = wy + 34;
      drawRing(ctx, R(orbitCx), R(orbitCy), 22, '#354973');
      for (let g = 0; g < 4; g++) {
        const ang = t * 1.15 + (g * Math.PI * 0.5);
        const gx = orbitCx + Math.cos(ang) * 24;
        const gy = orbitCy + Math.sin(ang) * 11;
        // Feixe suave ligando as gemas ao centro do reino
        P(ctx, (gx + orbitCx) * 0.5, (gy + orbitCy) * 0.5, gemColors[g][0]);
        drawStar(ctx, R(gx), R(gy), 3, gemColors[g][1], gemColors[g][0]);
        drawExternalOrb(ctx, gx, gy, gemColors[g][1], gemColors[g][0], '#161e38', 1.1);
      }
      // Brilho de alegria irradiando do centro
      if (pVerse > 0.25) {
        drawStar(ctx, R(orbitCx), R(orbitCy), (f12 & 1) ? 4 : 3, '#ffffff', '#f2cc6b');
      }
    } else if (mt < 30.0) {
      // [00:22 - 00:30] "Cada cristal tinha sua rainha, e entre elas a Ordem era minha"
      const gemColors = ['#e396b1', '#f2cc6b', '#68b8c4', '#e37b4b'];
      const highlightOrdem = mt >= 25.2; // "...e entre elas a Ordem era minha!"

      for (let q = 0; q < 4; q++) {
        const qx = wx + 36 + q * 38;
        const qy = wy + 52;
        const isOrdem = q === 1;
        const bob = Math.sin(t * 2.4 + q) * 1.5;

        // Halo de destaque quando a Ordem canta "e entre elas a Ordem era minha"
        if (isOrdem && highlightOrdem) {
          drawRing(ctx, R(qx), R(qy - 4 + bob), 16, '#f2cc6b');
          drawRing(ctx, R(qx), R(qy - 4 + bob), 12, '#68b8c4');
          // Asas abertas luminosas da Rainha da Ordem no mural
          for (let w = 4; w <= 13; w += 2) {
            P(ctx, qx - w, qy - 6 - (w * 0.4) + bob, '#f7e2b8');
            P(ctx, qx + w, qy - 6 - (w * 0.4) + bob, '#f7e2b8');
          }
        }

        // Silhueta Hi-Bit esculpida de cada Rainha (manto, ombros, cabeça e coroa)
        ctx.fillStyle = (isOrdem && highlightOrdem) ? '#f2cc6b' : '#090d1c';
        ctx.fillRect(RH(qx - 5), RH(qy - 4 + bob), 10, 20);
        ctx.fillRect(RH(qx - 7), RH(qy + 8 + bob), 14, 10);
        ctx.fillRect(RH(qx - 3), RH(qy - 10 + bob), 6, 6);

        // Coroa real delicada de 3 pontas
        const crownCol = isOrdem ? '#ffd86b' : gemColors[q];
        P(ctx, qx - 3, qy - 12 + bob, crownCol);
        P(ctx, qx, qy - 14 + bob, '#ffffff');
        P(ctx, qx + 3, qy - 12 + bob, crownCol);

        // Gema Primordial pairando sobre cada Rainha
        drawExternalOrb(ctx, qx, qy - 22 + bob, '#ffffff', gemColors[q], '#161e38', isOrdem && highlightOrdem ? 1.35 : 1.0);
        drawStar(ctx, R(qx), R(qy - 22 + bob), isOrdem ? 4 : 2, '#ffffff', gemColors[q]);
      }
    } else if (mt < 45.0) {
      // [00:30 - 00:44] "Mas com o tempo a fumaça e a ambição vieram manchar o ar e envenenar o chão /
      //                  Mesmo com o grito de alerta iminente, chamaram de farsa o perigo presente"
      const isAlertPart = mt >= 37.5; // "Mesmo com o grito de alerta iminente..."

      // Chão do reino envenenado com fissuras roxas/verdes tóxicas
      ctx.fillStyle = '#12081c';
      ctx.fillRect(wx + 16, wy + wh - 18, ww - 32, 10);
      for (let f = 0; f < 7; f++) {
        const fx = wx + 28 + f * 22;
        const fy = wy + wh - 16;
        P(ctx, fx, fy, '#a844c4');
        P(ctx, fx + 2, fy + 2, '#62d458');
        P(ctx, fx - 2, fy + 4, '#a844c4');
      }

      // Nuvens densas de fumaça escura subindo e manchando o ar do mural
      for (let i = 0; i < 10; i++) {
        const sx = wx + 22 + i * 16 + Math.sin(t * 1.8 + i * 0.9) * 6;
        const sy = wy + wh - 20 - ((t * 18 + i * 9) % 58);
        const sr = 6 + (i % 3) * 2;
        ctx.fillStyle = (i & 1) ? '#0a0514' : '#1b0e2e';
        ctx.fillRect(RH(sx - sr), RH(sy - sr * 0.6), sr * 2, sr * 1.2);
        P(ctx, sx, sy, '#5d2d7a');
      }

      // Seção 00:37 - 00:44: O grito de alerta iminente da Ordem sendo ignorado/engolido pelas sombras
      if (isAlertPart) {
        const alertX = cx - 28;
        const alertY = cy + 6;
        // Silhueta da Ordem emitindo anéis urgentes de alerta
        ctx.fillStyle = '#f2cc6b';
        ctx.fillRect(alertX - 3, alertY - 6, 6, 18);
        const ringR1 = 8 + R(((t * 18) % 22));
        const ringR2 = 8 + R(((t * 18 + 11) % 22));
        drawRing(ctx, alertX, alertY - 4, ringR1, '#f2cc6b');
        drawRing(ctx, alertX, alertY - 4, ringR2, '#e36956');

        // As outras silhuetas dão as costas, engolidas pela fumaça da ambição
        for (let s = 0; s < 3; s++) {
          const ox = cx + 8 + s * 20;
          ctx.fillStyle = '#07040e';
          ctx.fillRect(ox - 4, alertY - 4, 8, 18);
        }
      }
    } else if (mt < 63.5) {
      // [00:45 - 01:03] "Na sombra gerada por mãos tão cruéis, viramos cristais voláteis...
      //                  intensificando o caos e a desordem / E assim chegamos ao fim"
      const clampP = clamp((mt - 45.0) / 10.0, 0, 1);

      // Mãos gigantes de sombra com garras cruéis se fechando pelas laterais sobre o mural
      const handReach = R(18 + clampP * 38);
      ctx.fillStyle = `rgba(6, 3, 14, ${blackoutFade.toFixed(2)})`;
      // Mão esquerda e dedos em garra
      ctx.fillRect(wx + 8, wy + 14, handReach, 14);
      for (let c = 0; c < 4; c++) {
        ctx.fillRect(wx + 8 + handReach, wy + 12 + c * 6, 12, 4);
      }
      // Mão direita e dedos em garra
      ctx.fillRect(wx + ww - 8 - handReach, wy + 14, handReach, 14);
      for (let c = 0; c < 4; c++) {
        ctx.fillRect(wx + ww - 20 - handReach, wy + 12 + c * 6, 12, 4);
      }

      // As 4 Rainhas aprisionadas dentro de Cristais Voláteis que racham com arcos de caos
      for (let q = 0; q < 4; q++) {
        const qx = wx + 38 + q * 38;
        const qy = wy + 52;
        const jitter = (mt < 60.0 && ((f12 + q) & 1)) ? -1 : 1;

        // Prisma de cristal volátil aprisionando a rainha
        ctx.fillStyle = '#221038';
        ctx.fillRect(qx - 9 + jitter, qy - 14, 18, 28);
        ctx.fillStyle = '#090412';
        ctx.fillRect(qx - 4 + jitter, qy - 8, 8, 18);

        // Rachaduras elétricas instáveis no cristal volátil
        const crackCol = (q & 1) ? '#e36956' : '#c068f0';
        P(ctx, qx - 5 + jitter, qy - 10, crackCol);
        P(ctx, qx - 2 + jitter, qy - 6, '#ffffff');
        P(ctx, qx + 2 + jitter, qy - 2, crackCol);
        P(ctx, qx - 1 + jitter, qy + 4, crackCol);
        P(ctx, qx + 4 + jitter, qy + 8, '#ffffff');
      }
    } else {
      // [01:04 - 01:20] SOLO DE VIOLINO: Arcos melódicos dourados e turquesa acompanhando o giro aéreo da Ordem
      const soloP = clamp((mt - 63.5) / 16.5, 0, 1);
      const numArcs = 3 + R(soloP * 3);
      for (let k = 0; k < numArcs; k++) {
        const r = 12 + ((f12 * 2 + k * 9) % 38);
        drawRing(ctx, R(cx), R(cy), r, (k & 1) ? '#f2cc6b' : '#68b8c4');
      }
      // Fitas de luz sinfônica serpenteando pelo mural em sincronia com o violino
      for (let x = wx + 18; x < wx + ww - 18; x += 4) {
        const rel = (x - wx) / ww;
        const y1 = cy + Math.sin(t * 3.8 + rel * 6.2) * (12 + soloP * 14);
        const y2 = cy - Math.sin(t * 3.8 + rel * 6.2) * (10 + soloP * 12);
        P(ctx, x, y1, '#f2cc6b');
        P(ctx, x, y2, '#68b8c4');
      }
    }

    // Partículas luminosas ao redor da Ordem acompanhando sua movimentação pelo palco
    for (let p = 0; p < 5; p++) {
      const ang = t * 2.6 + p * 1.25;
      const px = ordemX + Math.cos(ang) * (14 + (p & 1) * 6);
      const py = (ordemY - 20) + Math.sin(ang * 1.5) * 12;
      P(ctx, px, py, (p & 1) ? '#f2cc6b' : '#9ee6f0');
    }
  }

  // 2. PARTE 2A (01:20 - 01:55): Luz da Manhã, Vinheta Pictórica de Nuvem (3 cenas) + Contagem "1, 2, 3" e Estouro
  function drawMorningSunbeams(ctx, mt, t) {
    const fade = clamp((mt - 80.0) / 3.5, 0, 1);
    ctx.save();
    for (let b = 0; b < 4; b++) {
      const topX = 58 + b * 64 + Math.sin(t * 0.7 + b) * 5;
      const botX = 38 + b * 72;
      ctx.fillStyle = `rgba(247, 226, 184, ${(0.14 * fade).toFixed(3)})`;
      for (let y = 16; y < 144; y += 2) {
        const p = (y - 16) / 128;
        const bx = topX + (botX - topX) * p;
        const bw = 8 + p * 22;
        ctx.fillRect(RH(bx - bw * 0.5), y, RH(bw), 2);
      }
    }
    ctx.restore();
  }

  function drawCloudThoughtBubble(ctx, mt, t, ordemX = 104, ordemY = 140) {
    const bx = 84, by = 16, bw = 152, bh = 72;
    const f12 = Math.floor(t * SPRITE_FPS);

    // Bolinhas de pensamento pictóricas subindo da Ordem até a nuvem
    const tailX = clamp(ordemX + 6, bx + 20, bx + bw - 20);
    ctx.fillStyle = '#3b2d26';
    ctx.fillRect(RH(tailX - 2), RH(ordemY - 46), 5, 5);
    ctx.fillRect(RH(tailX + 2), RH(ordemY - 56), 7, 6);
    ctx.fillStyle = '#f7f3e8';
    ctx.fillRect(RH(tailX - 1), RH(ordemY - 45), 3, 3);
    ctx.fillRect(RH(tailX + 3), RH(ordemY - 55), 5, 4);

    // Contorno e volume fofo de nuvem em Hi-Bit Owlboy (sombra quente + creme claro)
    const puffs = [
      [bx + 20, by + 22, 16], [bx + 46, by + 14, 18], [bx + 76, by + 12, 20],
      [bx + 106, by + 14, 18], [bx + 132, by + 22, 16],
      [bx + 24, by + 50, 16], [bx + 56, by + 54, 18], [bx + 94, by + 54, 18], [bx + 128, by + 50, 16]
    ];
    ctx.fillStyle = '#3b2d26';
    for (const [px, py, r] of puffs) {
      ctx.fillRect(px - r - 1, py - R(r * 0.55) - 1, r * 2 + 2, r + 2);
    }
    ctx.fillStyle = '#dfd5c4';
    for (const [px, py, r] of puffs) {
      ctx.fillRect(px - r, py - R(r * 0.5), r * 2, r);
    }
    ctx.fillStyle = '#f7f3e8';
    ctx.fillRect(bx + 12, by + 12, bw - 24, bh - 22);
    for (const [px, py, r] of puffs) {
      ctx.fillRect(px - r + 2, py - R(r * 0.5) + 1, r * 2 - 4, r - 3);
    }

    // Recorte interno da cena (3 atos sincronizados com a letra de 01:25 a 01:55)
    const ix = bx + 16, iy = by + 14, iw = bw - 32, ih = bh - 28;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ix, iy, iw, ih);
    ctx.clip();

    if (mt < 95.5) {
      // (a) 01:25 - 01:35: "Era uma vez uma criança inocente vagando cá e acolá!" (Superfície alegre e ensolarada)
      ctx.fillStyle = '#a8e0f0';
      ctx.fillRect(ix, iy, iw, ih);
      // Colinas verdes suaves ao fundo
      ctx.fillStyle = '#6ec488';
      ctx.fillRect(ix, iy + ih - 18, iw, 18);
      ctx.fillStyle = '#489660';
      ctx.fillRect(ix, iy + ih - 10, iw, 10);
      // Sol brilhando no canto e flores pelo caminho
      drawStar(ctx, ix + iw - 18, iy + 10, 4, '#ffffff', '#f2cc6b');
      for (let f = 0; f < 5; f++) {
        P(ctx, ix + 14 + f * 24, iy + ih - 11, (f & 1) ? '#f2cc6b' : '#e396b1');
      }
      const walkX = ix + 60 + Math.sin(t * 2.1) * 34;
      const flip = Math.cos(t * 2.1) < 0;
      ctx.save();
      ctx.translate(walkX, iy + ih - 8);
      ctx.scale(0.65, 0.65);
      ActorAnimator.drawActor(ctx, 'protagonist', 'walk', 0, 0, t, { flipX: flip });
      ctx.restore();
    } else if (mt < 101.2) {
      // (b) 01:36 - 01:41: "Em meio a uma aventura, escuridão da caverna..." (Entrando na caverna escura)
      ctx.fillStyle = '#14192e';
      ctx.fillRect(ix, iy, iw, ih);
      // Estalactites no teto da vinheta
      ctx.fillStyle = '#263154';
      for (let s = 0; s < 6; s++) {
        ctx.fillRect(ix + 10 + s * 20, iy, 8, 8 + (s % 3) * 4);
      }
      ctx.fillStyle = '#2c221e';
      ctx.fillRect(ix, iy + ih - 10, iw, 10);
      const walkX = ix + 24 + clamp((mt - 95.5) / 5.5, 0, 1) * 68;
      // Halo de lanterna/luz suave ao redor da criança na caverna escura
      drawRing(ctx, R(walkX), iy + ih - 20, 14, '#f2cc6b');
      ctx.save();
      ctx.translate(walkX, iy + ih - 8);
      ctx.scale(0.65, 0.65);
      ActorAnimator.drawActor(ctx, 'protagonist', 'walk', 0, 0, t);
      ctx.restore();
    } else if (mt < 105.8) {
      // (c) 01:42 - 01:45: "O chão se abriu e no calabouço ela caiu!" (Chão rachando e abrindo com queda!)
      ctx.fillStyle = '#101324';
      ctx.fillRect(ix, iy, iw, ih);
      // Bordas do chão rachado com pedrinhas caindo
      ctx.fillStyle = '#3d2b24';
      ctx.fillRect(ix, iy + ih - 12, 38, 12);
      ctx.fillRect(ix + iw - 38, iy + ih - 12, 38, 12);
      const fallP = clamp((mt - 101.2) / 4.2, 0, 1);
      for (let r = 0; r < 4; r++) {
        P(ctx, ix + 46 + r * 8, iy + 18 + ((R(fallP * 36) + r * 7) % 26), '#b88458');
      }
      const fallY = iy + 12 + fallP * (ih - 14);
      ctx.save();
      ctx.translate(ix + iw * 0.5, fallY);
      ctx.scale(0.65, 0.65);
      ActorAnimator.drawActor(ctx, 'protagonist', 'fall', 0, 0, t);
      ctx.restore();
    } else {
      // (d) 01:46 - 01:55: "Contudo, respira fundo, isso não foi o fim! Foi a deixa perfeita pra mim!"
      ctx.fillStyle = '#1c2442';
      ctx.fillRect(ix, iy, iw, ih);
      drawMagicCushion(ctx, ix + iw * 0.5, iy + ih - 10, 1, t);
      ctx.save();
      ctx.translate(ix + iw * 0.5, iy + ih - 10);
      ctx.scale(0.65, 0.65);
      ActorAnimator.drawActor(ctx, 'protagonist', 'celebrate', 0, 0, t);
      ctx.restore();
      drawStar(ctx, ix + iw * 0.5 - 24, iy + 16, 3, '#ffffff', '#f2cc6b');
      drawStar(ctx, ix + iw * 0.5 + 24, iy + 16, 3, '#ffffff', '#68b8c4');
    }
    ctx.restore();

    if ((f12 & 1) === 0) {
      drawStar(ctx, bx + 16, by + 16, 2, '#ffffff', '#f2cc6b');
      drawStar(ctx, bx + bw - 16, by + 16, 2, '#ffffff', '#68b8c4');
    }

    // Emblemas pulsantes "1", "2", "3" no ritmo exato (01:52.8 a 01:55.3)
    if (mt >= 112.6 && mt < 115.4) {
      const countNum = mt < 113.55 ? '1' : (mt < 114.45 ? '2' : '3');
      const badgeX = countNum === '1' ? bx + 34 : (countNum === '2' ? bx + bw * 0.5 : bx + bw - 34);
      const badgeY = by + bh + 6;
      drawParchmentBox(ctx, R(badgeX - 11), R(badgeY - 9), 22, 18);
      drawPixelTextCentered(ctx, countNum, R(badgeX), R(badgeY - 4), '#7a251c', '#f2cc6b', 18, 9);
      drawStar(ctx, R(badgeX - 13), R(badgeY - 6), 2, '#ffffff', '#f2cc6b');
      drawStar(ctx, R(badgeX + 13), R(badgeY - 6), 2, '#ffffff', '#f2cc6b');
    }
  }

  function drawCloudPopEffect(ctx, popElapsed) {
    if (popElapsed > 0.85) return;
    const cx = 160, cy = 52;
    const r = R(18 + popElapsed * 82);
    for (let k = 0; k < 12; k++) {
      const ang = (k / 12) * Math.PI * 2;
      const px = R(cx + Math.cos(ang) * r);
      const py = R(cy + Math.sin(ang) * r * 0.6);
      ctx.fillStyle = '#f7f3e8';
      ctx.fillRect(px - 3, py - 2, 6, 4);
      drawStar(ctx, px, py, 3, '#ffffff', (k & 1) ? '#f2cc6b' : '#68b8c4');
    }
    if (popElapsed < 0.55) {
      drawParchmentBox(ctx, cx - 38, cy - 10, 76, 19);
      drawPixelTextCentered(ctx, 'Vamos lá!', cx, cy - 4, '#2c221e', '#f2cc6b', 68, 9);
    }
  }

  // 2B. (01:56 - 02:05): Demonstração Visual Telecinética ("move o cristal aqui, tudo isso é bem facinho! Essa luz faz a magia, abriu-se o caminho!")
  function drawTelekineticCrystalDance(ctx, mt, t, ordemX, ordemY) {
    const localP = clamp((mt - 115.5) / 10.0, 0, 1);
    const cx = 186, cy = 84;

    if (localP < 0.55) {
      // Dois cristais com 2 bolinhas externas sendo movidos no ar pela magia da Ordem até se fundirem!
      const mergeP = easeInOut(clamp(localP / 0.55, 0, 1));
      const sep = R((1 - mergeP) * 34);
      const leftX = cx - sep;
      const rightX = cx + sep;

      // Feixes telecinéticos dourados saindo das mãos da Ordem até os cristais
      for (let s = 0; s <= 8; s++) {
        const p = s / 8;
        P(ctx, ordemX + (leftX - ordemX) * p, (ordemY - 24) + (cy - (ordemY - 24)) * p, '#f2cc6b');
        P(ctx, ordemX + (rightX - ordemX) * p, (ordemY - 24) + (cy - (ordemY - 24)) * p, '#68b8c4');
      }

      drawCrystalPiece(ctx, { x: leftX, y: cy, type: 'white', value: 2, shadow: false }, t);
      drawCrystalPiece(ctx, { x: rightX, y: cy, type: 'white', value: 2, shadow: false }, t);
    } else {
      // Cristais fundidos em um Quartzo brilhante de 4 unidades externas que dispara luz para abrir o caminho!
      const postP = (localP - 0.55) / 0.45;
      drawRing(ctx, cx, cy, R(14 + Math.sin(t * 6) * 3), '#f2cc6b');
      drawCrystalPiece(ctx, { x: cx, y: cy, type: 'white', value: 4, shadow: false, lastValChangeAt: postP < 0.25 ? t : 0 }, t);

      // Feixe de luz mágica indo do cristal fundido até a parede direita ("abriu-se o caminho!")
      for (let x = cx + 12; x < 248; x += 3) {
        const py = cy + Math.sin(t * 8 + x * 0.15) * 3;
        P(ctx, x, py, '#f2cc6b');
        P(ctx, x, py - 1, '#ffffff');
      }
      drawStar(ctx, 248, cy, 4, '#ffffff', '#f2cc6b');
    }
  }

  // 3. PARTE 2C (02:06 - 02:09): Projeção de Tambor feita por Dois Cristais com Duas Pedras manipuladas por Magia ("Abre o sapatinho! Vai no sapatinho!")
  function drawCrystalDrumMagic(ctx, cx, cy, t) {
    const f12 = Math.floor(t * SPRITE_FPS);
    // Dois cristais laterais Hi-Bit projetando o tambor energético horizontal
    drawCrystalPiece(ctx, { x: cx - 24, y: cy, type: 'white', value: 1, shadow: false }, t);
    drawCrystalPiece(ctx, { x: cx + 24, y: cy, type: 'rose', value: 1, shadow: false }, t);

    // Superfície da projeção mágica de tambor entre os dois cristais
    for (let x = cx - 15; x <= cx + 15; x++) {
      P(ctx, x, cy + 1, '#ffffff');
      P(ctx, x, cy + 2, (f12 & 1) ? '#f2cc6b' : '#68b8c4');
      P(ctx, x, cy + 3, '#3b2d26');
    }

    // Duas pedras manipuladas por magia batendo alternadamente no tambor de cristal!
    const beatLeft = (f12 % 4) < 2;
    const ly = beatLeft ? cy - 1 : cy - 10;
    const ry = beatLeft ? cy - 10 : cy - 1;

    drawRing(ctx, cx - 6, ly, 4, '#f2cc6b');
    ctx.fillStyle = '#5c4338';
    ctx.fillRect(cx - 8, ly - 2, 5, 4);

    drawRing(ctx, cx + 6, ry, 4, '#68b8c4');
    ctx.fillStyle = '#5c4338';
    ctx.fillRect(cx + 4, ry - 2, 5, 4);

    const hitX = beatLeft ? cx - 6 : cx + 6;
    drawStar(ctx, hitX, cy + 1, 3, '#ffffff', '#f2cc6b');
  }

  // 3B. PARTE 2D (02:09 - 02:46): Grama Viva e Flores Brotando nas Plataformas ("Pequenos passos fazendo a terra inteira florescer!")
  function drawCaveBloomingFlora(ctx, mt, t) {
    if (mt < 129.5) return;
    const bloomP = clamp((mt - 129.5) / 10.0, 0, 1);
    const maxPatches = R(bloomP * 18);
    const flowerColors = ['#f2cc6b', '#e396b1', '#68b8c4', '#ffffff'];

    for (let i = 0; i < maxPatches; i++) {
      const gx = 32 + i * 14;
      const gy = 142 + ((i * 3) % 4);
      // Tufos de grama esmeralda viva estilo Owlboy
      ctx.fillStyle = '#3e7338';
      ctx.fillRect(gx - 3, gy - 2, 6, 2);
      ctx.fillStyle = '#6ec488';
      P(ctx, gx - 2, gy - 3, '#6ec488');
      P(ctx, gx, gy - 4, '#8ee09e');
      P(ctx, gx + 2, gy - 3, '#6ec488');

      // Pequenas flores luminosas desabrochando
      if (i % 2 === 0) {
        const fCol = flowerColors[(i >> 1) % flowerColors.length];
        const sway = Math.sin(t * 2.5 + i) * 0.5;
        P(ctx, gx + sway, gy - 5, fCol);
        P(ctx, gx + sway, gy - 6, '#ffffff');
      }
    }

    // Feixes dourados ascendentes quando a Ordem canta "Eu sou a Ordem... Chegamos ao topo de novo, o reino inteiro vai renascer!" (02:15 - 02:23)
    if (mt >= 135.0 && mt < 143.8) {
      for (let r = 0; r < 3; r++) {
        const rad = 14 + ((R(t * 18) + r * 11) % 34);
        drawRing(ctx, 160, 108, rad, (r & 1) ? '#f2cc6b' : '#6ec488');
      }
    }
  }

  // 3C. PARTE 2E (02:24 - 02:33): Coreografia "Move pra cá! Move pra lá! Sem bagunça, sem fumaça!"
  function drawMovePraCaPraLaShow(ctx, mt, t) {
    if (mt < 143.8 || mt >= 153.8) return;

    if (mt < 148.8) {
      // "Move pra cá! (Move pra lá!) Que o dom da Ordem faz tudo brilhar!"
      const isLeft = mt < 146.2;
      const shiftX = isLeft
        ? -easeInOut(clamp((mt - 143.8) / 1.8, 0, 1)) * 28
        : -28 + easeInOut(clamp((mt - 146.2) / 2.0, 0, 1)) * 56;

      // Trio de cristais flutuantes com suas bolinhas externas dançando em sincronia horizontal com a Ordem e o Protagonista
      const trio = [
        { baseX: 112, y: 78, color: 'white', val: 2 },
        { baseX: 160, y: 68, color: 'rose', val: 3 },
        { baseX: 208, y: 78, color: 'white', val: 2 }
      ];
      for (const c of trio) {
        const cx = R(c.baseX + shiftX);
        // Trilha luminosa indicando o deslize ("Move pra cá / Move pra lá")
        ctx.fillStyle = 'rgba(242, 204, 107, 0.35)';
        ctx.fillRect(cx - (isLeft ? -8 : 18), c.y - 2, 12, 4);
        drawCrystalPiece(ctx, { x: cx, y: c.y, type: c.color, value: c.val, shadow: false }, t);
      }
    } else {
      // "Sem bagunça, sem fumaça, pode agradecer!" (02:28.8 - 02:33.8): Dissipando a fumaça em estrelas douradas
      const cleanP = clamp((mt - 148.8) / 4.8, 0, 1);
      const waveX = R(40 + cleanP * 240);
      for (let i = 0; i < 7; i++) {
        const sx = 56 + i * 32;
        const sy = 64 + (i % 3) * 14;
        if (sx < waveX) {
          drawStar(ctx, sx, sy, 3, '#ffffff', '#f2cc6b');
        } else {
          ctx.fillStyle = '#241536';
          ctx.fillRect(sx - 5, sy - 4, 10, 8);
        }
      }
    }
  }

  // 4. FINAL DA MÚSICA (02:34 - 02:46): Abertura do Caminho e Panorama Hi-Bit estilo Owlboy do Mundo da Floresta
  function drawWorldPanorama(ctx, openProgress, t) {
    const pw = R(104 * clamp(openProgress, 0, 1));
    if (pw <= 2) return;
    const cx = 252, topY = 40, h = 102;
    const x0 = cx - (pw >> 1), x1 = cx + (pw >> 1);
    const f12 = Math.floor(t * SPRITE_FPS);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, topY, pw, h);
    ctx.clip();

    // 1. Céu diurno estilo Owlboy (azul celeste suave -> dourado quente no horizonte)
    for (let y = topY; y < topY + h; y++) {
      const p = (y - topY) / h;
      ctx.fillStyle = p < 0.28 ? '#5ca8d6' : (p < 0.52 ? '#88cce8' : (p < 0.72 ? '#cbe8d4' : '#f7e2b8'));
      ctx.fillRect(x0, y, pw, 1);
    }

    // 2. Nuvens volumosas iluminadas pelo sol
    ctx.fillStyle = '#fffdf5';
    ctx.fillRect(cx - 38, topY + 14, 32, 8);
    ctx.fillRect(cx + 6, topY + 10, 36, 9);
    ctx.fillStyle = '#d8c8b4';
    ctx.fillRect(cx - 36, topY + 21, 28, 3);
    ctx.fillRect(cx + 8, topY + 18, 32, 3);

    // 3. Ilhas rochosas flutuantes e pilares da Floresta (assinatura visual de Owlboy)
    const islands = [
      [cx - 28, topY + 34, 22, 14],
      [cx + 14, topY + 28, 26, 16]
    ];
    for (const [ix, iy, iw, ih] of islands) {
      // Rocha marrom-terrosa esculpida abaixo da ilha
      ctx.fillStyle = '#633b34';
      ctx.fillRect(ix + 3, iy + 5, iw - 6, ih - 4);
      ctx.fillStyle = '#402624';
      ctx.fillRect(ix + 7, iy + ih, iw - 14, 6);
      // Topo de grama esmeralda exuberante
      ctx.fillStyle = '#3e7338';
      ctx.fillRect(ix, iy + 2, iw, 5);
      ctx.fillStyle = '#6ec488';
      ctx.fillRect(ix + 2, iy, iw - 4, 3);
    }

    // Cachoeira cristalina caindo da ilha direita
    for (let wy = topY + 33; wy < topY + 86; wy += 2) {
      P(ctx, cx + 24, wy, ((wy + f12) & 2) ? '#ffffff' : '#68b8c4');
      P(ctx, cx + 26, wy + 1, '#9ee6f0');
    }

    // 4. Copa das árvores da Floresta e caminho iluminado pelo sol na base
    ctx.fillStyle = '#26522b';
    ctx.fillRect(x0, topY + 68, pw, 18);
    ctx.fillStyle = '#3e7338';
    ctx.fillRect(x0, topY + 64, pw, 8);
    ctx.fillStyle = '#6ec488';
    for (let tx = x0 + 4; tx < x1 - 4; tx += 10) {
      ctx.fillRect(tx, topY + 60, 7, 5);
    }

    // Rio Turmalina e trilha dourada rumo à Floresta
    ctx.fillStyle = '#4da6ba';
    ctx.fillRect(x0, topY + 84, pw, 8);
    ctx.fillStyle = '#e3b454';
    ctx.fillRect(x0, topY + 92, pw, 10);

    ctx.restore();

    // Moldura de pedra iluminada e partículas solares na passagem aberta
    for (let y = topY; y < topY + h; y += 2) {
      P(ctx, x0, y, (y + f12) & 2 ? '#f7e2b8' : '#d9a85b');
      P(ctx, x1, y, (y + f12) & 2 ? '#f7e2b8' : '#d9a85b');
    }
  }

  // Verifica se há mais de uma voz / coro secundário no instante `mt` da música
  // (Regra Crítica: SEMPRE aciona os animais de pedra com cristais neon e NUNCA confunde com a voz principal da Ordem!)
  const SECONDARY_VOICE_WINDOWS = [
    [80.2, 84.0],   // 01:20 "Mas..." (coro dos animais de pedra)
    [112.6, 116.2], // 01:53 "Um, dois, três e... Vamos lá!"
    [120.8, 123.6], // 02:01 "(Bem facinho!)"
    [125.5, 129.8], // 02:06 "(Abre o sapatinho! Vai no sapatinho!)"
    [133.0, 135.8], // 02:13 "(Pode aplaudir!)"
    [138.0, 143.8], // 02:18 Coro: "Chegamos, chegamos ao topo de novo, o reino inteiro vai renascer!"
    [145.5, 148.8], // 02:26 "(Move pra lá!)"
    [153.5, 166.2]  // 02:34 Grand Finale com coro: "Vai renascer! (Vai renascer! Bem facinho!) A Ordem voltou!"
  ];
  function isSecondaryVoiceActive(mt) {
    return SECONDARY_VOICE_WINDOWS.some(([a, b]) => mt >= a && mt <= b);
  }

  // Legendas sincronizadas exatas da música enviada (00:00 a 02:46) com acentuação completa
  const MUSICAL_CAPTIONS = [
    [0.5, 10.8, '♪ Prelúdio de Violino — O Despertar da Ordem ♪'],
    [11.0, 22.0, 'Era uma vez um reino envolto em pura alegria, guiado por quatro gemas em harmonia...'],
    [22.0, 30.0, 'Cada cristal tinha sua rainha, e entre elas a Ordem era minha!'],
    [30.0, 37.5, 'Mas com o tempo a fumaça e a ambição vieram manchar o ar e envenenar o chão...'],
    [37.5, 45.0, 'Mesmo com o grito de alerta iminente, chamaram de farsa o perigo presente!'],
    [45.0, 59.5, 'Na sombra gerada por mãos tão cruéis, viramos cristais voláteis...'],
    [59.5, 63.5, 'Intensificando o caos e a desordem... E assim chegamos ao fim.'],
    [63.5, 79.8, '♪ Solo de Violino — A Dança das Sombras e da Luz ♪'],
    [80.0, 84.5, 'Mas... uma nova luz despertou na Caverna!'],
    [84.5, 95.5, 'Era uma vez uma criança inocente vagando cá e acolá!'],
    [95.5, 101.2, 'Em meio a uma aventura, na escuridão da caverna entrou...'],
    [101.2, 105.8, 'O chão se abriu e no calabouço ela caiu!'],
    [105.8, 115.5, 'Respira fundo, isso não foi o fim: foi a deixa perfeita pra mim! 1, 2, 3 e vamos lá!'],
    [115.5, 125.5, 'Olha só que novidade, eu tô livre! Move o cristal aqui, tudo isso é bem facinho!'],
    [125.5, 129.8, 'Essa luz faz a magia, abriu-se o caminho! Abre o sapatinho! Vai no sapatinho!'],
    [129.8, 135.5, 'Pequenos passos fazendo a terra inteira florescer!'],
    [135.5, 143.8, 'Eu sou a Ordem! Chegamos ao topo de novo, o reino inteiro vai renascer!'],
    [143.8, 148.8, 'Move pra cá! Move pra lá! Que o dom da Ordem faz tudo brilhar!'],
    [148.8, 153.5, 'Sem bagunça, sem fumaça, pode agradecer!'],
    [153.5, 166.5, 'O reino vai renascer! A Ordem voltou!']
  ];

  // ============================================================================
  // CONTROLADOR DO MUNDO 1: CAVERNA (ABERTURA + FASES 1–4 + MUSICAL + MAPA)
  // ============================================================================
  const CaveChapter1 = {
    canvas: null,
    ctx: null,
    running: false,
    t: 0,
    lastNow: 0,

    currentLevel: 1,
    currentStep: 1,
    totalSteps: 1,

    phase: 'cutscene_fall',
    phaseTime: 0,

    protag: {
      x: 74,
      y: -12,
      state: 'fall'
    },
    ordemActor: {
      x: 176,
      y: 32,
      state: 'back_silhouette',
      flipX: false,
      visible: false
    },
    cushionAlpha: 0,

    obstacleDecay: 0,
    targetObstacleDecay: 0,
    ceilingCrystalFlash: false,
    ceilingCrystalBroken: false,

    waveOrigin: { x: 185, y: 96 },
    waveRadius: 0,
    waveActive: false,

    // Controle do Show Musical da Fase 4
    musicAudio: null,
    musicalTime: 0,
    cloudPopTime: -1,
    skipMusicalBtnRect: { x: 132, y: 2, w: 56, h: 16 },

    pieces: [],
    pureEquation: null,
    shadowEquation: null,
    draggedPiece: null,
    equationPointer: null,
    magneticAnim: null,

    opalDrainTimer: 0,
    opalStepInterval: 0.55,
    shards: [],

    completeBtnRect: { x: 112, y: 112, w: 96, h: 16 },
    gameOverBtnRect: { x: 96, y: 120, w: 128, h: 16 },
    onChapterFinish: null,

    init(canvasElement) {
      this.canvas = canvasElement || this.ensureCanvas();
      this.ctx = this.canvas.getContext('2d', { alpha: false });
      this.ctx.imageSmoothingEnabled = false;
      this.bindInput();

      // Conecta os botões do HUD Superior (Pause, Recomeçar Fase, Mudo e Configurações)
      GameHUD.onRestart = () => {
        this.restartCurrentPhase();
      };

      GameHUD.onGoMap = () => {
        DialogueBox.close();
        TutorialModal.close();
        this.stopMusicAudio();
        this.enterJourneyMapWithIrisIn();
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
            } else if (this.musicAudio.paused && this.musicalTime < 166.0) {
              try { this.musicAudio.play().catch(() => {}); } catch (_) {}
            }
          }
        }

        if (global.CrystalMenuAudio && global.CrystalMenuAudio.track) {
          const menuTr = global.CrystalMenuAudio.track;
          menuTr.muted = !!muted || vol <= 0;
          menuTr.volume = vol;
          if (inMusical || muted || vol <= 0 || GameHUD.paused || GameHUD.settingsOpen) {
            try { menuTr.pause(); } catch (_) {}
          } else if (this.running && menuTr.paused) {
            try { menuTr.play().catch(() => {}); } catch (_) {}
          }
        }
      };

      GameHUD.syncAudio();
    },

    prepareCanvasForGame() {
      if (!this.canvas) this.init();
      this.canvas.hidden = false;
      this.canvas.style.display = 'block';
      this.canvas.style.pointerEvents = 'auto';
      this.canvas.style.background = '#05030f';
      this.canvas.style.boxShadow = '0 0 0 100vmax #05030f';
      this.fitCanvas(this.canvas);

      if (typeof document !== 'undefined') {
        document.body.dataset.screen = 'game';
        const homeSec = document.getElementById('home');
        if (homeSec) homeSec.hidden = true;
      }

      GameHUD.paused = false;
      GameHUD.settingsOpen = false;
      GameHUD.syncAudio();
    },

    restartCurrentPhase() {
      this.prepareCanvasForGame();
      DialogueBox.close();
      TutorialModal.close();
      this.draggedPiece = null;
      this.equationPointer = null;
      this.magneticAnim = null;
      this.clearTrembleStates();
      this.shards = [];
      this.cushionAlpha = 0;
      this.waveActive = false;
      this.waveRadius = 0;
      this.obstacleDecay = 0;
      this.targetObstacleDecay = 0;
      this.ceilingCrystalFlash = false;
      this.ceilingCrystalBroken = false;
      this.ordemActor.visible = false;

      // Se estava na parte musical da Fase 4, reinicia a apresentação musical do início
      if (this.phase === 'musical_part1_shadows' || this.phase === 'musical_part2_bright') {
        this.startMusicalShow();
        IrisTransition.start('in', 160, 90, 0.45);
        return;
      }

      this.stopMusicAudio();
      const lvl = clamp(this.currentLevel || 1, 1, 4);
      this.currentLevel = lvl;
      this.currentStep = 1;
      this.totalSteps = lvl === 1 ? 1 : 3;
      this.protag.x = 42;
      this.protag.y = 142;
      this.protag.state = 'idle';

      this.setupLevelStep(lvl, 1);
      // Garante entrada direta na jogabilidade da Etapa 1 ao clicar em Recomeçar Fase
      TutorialModal.close();
      this.phase = 'gameplay';
      this.phaseTime = 0;
      this.spawnShatter(160, 90, 'pure', 14);
      GameHUD.playSfx('start');
      IrisTransition.start('in', 160, 90, 0.45);
    },

    ensureCanvas() {
      let cv = document.getElementById('truePixelScreen');
      if (!cv) {
        cv = document.createElement('canvas');
        cv.id = 'truePixelScreen';
        cv.width = HW;
        cv.height = HH;
        cv.style.cssText = [
          'position:fixed',
          'left:50%',
          'top:50%',
          'transform:translate(-50%,-50%)',
          'display:block',
          'z-index:40',
          'image-rendering:pixelated',
          'image-rendering:crisp-edges',
          'background:#05030f',
          'box-shadow:0 0 0 100vmax #05030f',
          'cursor:pointer',
          'touch-action:none'
        ].join(';');
        document.body.appendChild(cv);
      } else if (cv.width !== HW || cv.height !== HH) {
        cv.width = HW;
        cv.height = HH;
      }
      this.fitCanvas(cv);
      window.addEventListener('resize', () => this.fitCanvas(cv));
      return cv;
    },

    fitCanvas(cv) {
      // Enquadramento 16:9 exato ocupando a área total da janela sem bordas desalinhadas
      const vw = Math.max(320, window.innerWidth);
      const vh = Math.max(180, window.innerHeight);
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

    isInsideEquationAura(eq, x, y, allowReception = false) {
      if (!eq || eq.broken) return false;
      const rx = (eq.expanded || allowReception) ? 48 : 30;
      const ry = (eq.expanded || allowReception) ? 28 : 18;
      const dx = (x - eq.x) / rx, dy = (y - eq.y) / ry;
      return dx * dx + dy * dy <= 1.08;
    },

    bindInput() {
      if (this._bound) return;
      this._bound = true;

      const onDown = (e) => {
        if (!this.running) return;
        const pt = e.touches ? e.touches[0] : e;
        const { x, y } = this.toLogicalCoords(pt.clientX, pt.clientY);

        // Prioridade máxima para os botões do HUD Superior (Pause, Recomeçar, Mudo, Configurações) e seus Modais
        if (GameHUD.handleClick(x, y)) {
          return;
        }

        if (DialogueBox.isOpen) {
          GameHUD.playSfx('click');
          DialogueBox.advance();
          return;
        }

        if (TutorialModal.isOpen) {
          TutorialModal.handleClick(x, y);
          return;
        }

        // Botão REINICIAR FASE na Tela de Game Over
        if (this.phase === 'game_over') {
          const gb = this.gameOverBtnRect;
          if (x >= gb.x && x <= gb.x + gb.w && y >= gb.y && y <= gb.y + gb.h) {
            GameHUD.triggerRestart();
          }
          return;
        }

        // Botão para avançar/concluir durante o show musical caso o jogador queira pular
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
            if (this.currentLevel === 1) {
              this.startFase2();
            } else if (this.currentLevel === 2) {
              this.startFase3();
            } else if (this.currentLevel === 3) {
              this.startFase4();
            } else if (this.currentLevel === 4) {
              this.startForestExitTransition();
            }
          }
          return;
        }

        if (this.phase !== 'gameplay') return;

        const eq = this.pureEquation;
        const clickedInEq = this.isInsideEquationAura(eq, x, y);

        if (eq && !eq.broken && !eq.expanded && clickedInEq) {
          this.equationPointer = {
            startX: x,
            startY: y,
            origX: eq.x,
            origY: eq.y,
            moved: false
          };
          return;
        }

        for (let i = this.pieces.length - 1; i >= 0; i--) {
          const p = this.pieces[i];
          if (!p.shadow && !p.broken && p.value > 0 && Math.hypot(x - p.x, y - p.y) <= 16) {
            if (p.inEquation && eq && !eq.expanded) continue;
            GameHUD.playSfx(p.type === 'opal' ? 'opalGrab' : (p.type === 'rose' ? 'roseGrab' : 'quartzGrab'));
            this.draggedPiece = p;
            p.dragging = true;
            return;
          }
        }

        if (eq && !eq.broken && eq.expanded && clickedInEq) {
          this.equationPointer = {
            startX: x,
            startY: y,
            origX: eq.x,
            origY: eq.y,
            moved: false
          };
        }
      };

      const onMove = (e) => {
        if (!this.running) return;
        const pt = e.touches ? e.touches[0] : e;
        const { x, y } = this.toLogicalCoords(pt.clientX, pt.clientY);

        if (this.draggedPiece) {
          this.draggedPiece.x = clamp(x, 24, W - 24);
          this.draggedPiece.y = clamp(y, 24, 134);
          if (this.pureEquation && !this.pureEquation.broken) {
            const overEq = this.isInsideEquationAura(this.pureEquation, this.draggedPiece.x, this.draggedPiece.y, true);
            this.pureEquation.dropHover = overEq && this.draggedPiece.inEquation !== 'pure';
            this.pureEquation.removeHover = !overEq && this.draggedPiece.inEquation === 'pure';
          }
          return;
        }

        if (this.equationPointer && this.pureEquation && !this.pureEquation.broken) {
          const dist = Math.hypot(x - this.equationPointer.startX, y - this.equationPointer.startY);
          if (dist >= 4) {
            this.equationPointer.moved = true;
          }
          if (this.equationPointer.moved) {
            const nx = clamp(this.equationPointer.origX + (x - this.equationPointer.startX), 44, W - 44);
            const ny = clamp(this.equationPointer.origY + (y - this.equationPointer.startY), 38, 128);
            const dx = nx - this.pureEquation.x;
            const dy = ny - this.pureEquation.y;
            this.pureEquation.x = nx;
            this.pureEquation.y = ny;
            for (const p of this.pieces) {
              if (p.inEquation === 'pure' && !p.broken) {
                p.x += dx;
                p.y += dy;
              }
            }
          }
        }
      };

      const onUp = () => {
        if (!this.running) return;

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
          p.dragging = false;
          this.draggedPiece = null;
          if (this.pureEquation) {
            this.pureEquation.dropHover = false;
            this.pureEquation.removeHover = false;
          }
          this.clearTrembleStates();
          GameHUD.playSfx(p.type === 'opal' ? 'opalDrop' : (p.type === 'rose' ? 'roseDrop' : 'quartzDrop'));
          this.checkPieceDrop(p);
          this.checkEquationSolved();
          this.triggerDefeatIfImpossible();
        }
      };

      this.canvas.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },

    clearTrembleStates() {
      this.opalDrainTimer = 0;
      for (const p of this.pieces) p.trembling = false;
    },

    layoutEquationPieces(eq, tag) {
      if (!eq || eq.broken) return;
      const members = this.pieces.filter(p => !p.broken && p.value > 0 && p.inEquation === tag);
      const spacing = eq.expanded ? 24 : 18;
      const startX = eq.x - ((members.length - 1) * spacing) * 0.5;
      members.forEach((m, idx) => {
        m.x = R(startX + idx * spacing);
        m.y = R(eq.y);
      });
    },

    // ==========================================================================
    // INICIALIZAÇÃO DAS FASES 1, 2, 3 E 4
    // ==========================================================================
    startCutsceneAndFase1(onFinish = null) {
      this.prepareCanvasForGame();
      this.onChapterFinish = onFinish;
      this.t = 0;
      this.currentLevel = 1;
      this.currentStep = 1;
      this.totalSteps = 1;
      this.phase = 'cutscene_fall';
      this.phaseTime = 0;
      this.protag.x = 74;
      this.protag.y = -10;
      this.protag.state = 'fall';
      this.ordemActor.visible = false;
      this.cushionAlpha = 0;
      this.obstacleDecay = 0;
      this.targetObstacleDecay = 0;
      this.ceilingCrystalFlash = false;
      this.ceilingCrystalBroken = false;
      this.waveRadius = 0;
      this.waveActive = false;
      this.pieces = [];
      this.pureEquation = null;
      this.shadowEquation = null;
      this.shards = [];
      IrisTransition.start('in', 74, 118, 0.75);

      if (!this.running) {
        this.running = true;
        this.lastNow = performance.now();
        requestAnimationFrame((now) => this.loop(now));
      }
    },

    startFase2(onFinish = null) {
      this.startStandardLevel(2, 3, onFinish);
    },

    startFase3(onFinish = null) {
      this.startStandardLevel(3, 3, onFinish);
    },

    startFase4(onFinish = null) {
      this.prepareCanvasForGame();
      if (onFinish) this.onChapterFinish = onFinish;

      this.currentLevel = 4;
      this.currentStep = 1;
      this.totalSteps = 3;
      this.phase = 'cutscene_fase4_walk';
      this.phaseTime = 0;
      this.obstacleDecay = 0;
      this.targetObstacleDecay = 0;
      this.ceilingCrystalFlash = false;
      this.ceilingCrystalBroken = false;
      this.ordemActor.visible = false;
      this.waveRadius = 0;
      this.waveActive = false;
      this.pieces = [];
      this.pureEquation = null;
      this.shadowEquation = null;
      this.magneticAnim = null;
      this.shards = [];

      this.protag.x = -8;
      this.protag.y = 142;
      this.protag.state = 'walk';
      IrisTransition.start('in', 42, 126, 0.65);

      if (!this.running) {
        this.running = true;
        this.lastNow = performance.now();
        requestAnimationFrame((now) => this.loop(now));
      }
    },

    startStandardLevel(levelNum, totalSteps, onFinish = null) {
      this.prepareCanvasForGame();
      if (onFinish) this.onChapterFinish = onFinish;

      this.currentLevel = levelNum;
      this.currentStep = 1;
      this.totalSteps = totalSteps;
      this.phase = 'cutscene_enter_level';
      this.phaseTime = 0;
      this.obstacleDecay = 0;
      this.targetObstacleDecay = 0;
      this.ceilingCrystalFlash = false;
      this.ceilingCrystalBroken = false;
      this.ordemActor.visible = false;
      this.waveRadius = 0;
      this.waveActive = false;
      this.pieces = [];
      this.pureEquation = null;
      this.shadowEquation = null;
      this.magneticAnim = null;
      this.shards = [];

      this.protag.x = -8;
      this.protag.y = 142;
      this.protag.state = 'walk';
      IrisTransition.start('in', 42, 126, 0.65);

      if (!this.running) {
        this.running = true;
        this.lastNow = performance.now();
        requestAnimationFrame((now) => this.loop(now));
      }
    },

    openFase4IntroDialogue() {
      this.phase = 'cutscene_fase4_dlg';
      this.phaseTime = 0;
      this.protag.state = 'shock';

      DialogueBox.open([
        {
          speaker: 'Protagonista',
          portrait: 'portrait_protagonist',
          text: 'Quê?! Mas que cristal enorme é esse?!'
        },
        {
          speaker: 'Voz Misteriosa',
          portrait: 'portrait_mystery_silhouette',
          text: '... Eu estou aqui dentro!!'
        },
        {
          speaker: 'Protagonista',
          portrait: 'portrait_protagonist',
          text: 'Aaaahh!'
        },
        {
          speaker: 'Voz Misteriosa',
          portrait: 'portrait_mystery_silhouette',
          text: 'Manipule os cristais e me tire daqui!'
        },
        {
          speaker: 'Protagonista',
          portrait: 'portrait_protagonist',
          text: 'O-ok! Eu consigo!'
        }
      ], () => {
        this.protag.state = 'idle';
        this.phase = 'gameplay';
        this.phaseTime = 0;
        this.setupLevelStep(4, 1);
      });
    },

    // ==========================================================================
    // SEQUÊNCIA MUSICAL DA FASE 4 ("ERA UMA VEZ — A ORDEM")
    // ==========================================================================
    startMusicalShow() {
      this.phase = 'musical_part1_shadows';
      this.phaseTime = 0;
      this.musicalTime = 0;
      this.cloudPopTime = -1;

      // Protagonista recua para a esquerda assistindo à libertação grandiosa
      this.protag.x = 46;
      this.protag.y = 142;
      this.protag.state = 'idle';

      // Quem estava dentro se liberta de forma grandiosa e cai em pé, de costas, em silhueta
      this.ordemActor.visible = true;
      this.ordemActor.x = 160;
      this.ordemActor.y = 36;
      this.ordemActor.state = 'back_silhouette';

      try {
        if (global.CrystalMenuAudio) {
          global.CrystalMenuAudio.pause?.();
        }
        if (global.CrystalMusic) {
          global.CrystalMusic.stop?.();
        }
        if (!this.musicAudio) {
          this.musicAudio = new Audio('assets/audio/era-uma-vez-caverna.mp3?v=13');
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
      // Acende a Gema da Caverna no topo da Caixa de Diálogo Global
      DialogueBox.sockets.fairy = true;
      this.waveOrigin = { x: 160, y: 90 };
      this.waveActive = true;
      this.waveRadius = 400;
      this.obstacleDecay = 1;

      // Corta para o jogo normal com a "Ordem" explicando que agora devem ir para a Floresta
      this.phase = 'post_musical_ordem_dlg';
      this.phaseTime = 0;
      this.protag.x = 84;
      this.protag.y = 142;
      this.protag.state = 'idle';
      this.ordemActor.visible = true;
      this.ordemActor.x = 148;
      this.ordemActor.y = 142;
      this.ordemActor.state = 'idle';

      DialogueBox.open([
        {
          speaker: 'Ordem',
          portrait: 'portrait_ordem',
          text: 'Livre! Eu sou a Ordem, e a Caverna voltou a brilhar!'
        },
        {
          speaker: 'Ordem',
          portrait: 'portrait_ordem',
          text: 'Agora devemos ir para a Floresta restaurar a próxima gema!'
        }
      ], () => {
        // Corta para a animação de conclusão de fase MAIS ANIMADA que o comum (última fase do mundo)
        this.phase = 'world_celebrate_complete';
        this.phaseTime = 0;
        this.protag.state = 'celebrate';
        this.ordemActor.state = 'celebrate';
      });
    },

    startForestExitTransition() {
      // Os personagens caminham juntos até a entrada para o mundo da Floresta (reutilizando `walk`)
      this.phase = 'walk_to_forest_exit';
      this.phaseTime = 0;
      this.protag.state = 'walk';
      this.ordemActor.state = 'walk';
    },

    enterJourneyMapWithIrisIn() {
      // Adapta SOMENTE o ícone da fada no círculo da fase no Mapa para o estilo True Pixel Art novo
      ActorAnimator.adaptMapFairyIcon();

      // Mostra a tela de Mapa existente (placeholder intacto)
      document.body.dataset.screen = 'map';
      const homeSec = document.getElementById('home');
      const gameSec = document.getElementById('game');
      const mapSec = document.getElementById('map');
      if (homeSec) homeSec.hidden = true;
      if (gameSec) gameSec.hidden = true;
      if (mapSec) mapSec.hidden = false;

      if (global.CrystalJourney && typeof global.CrystalJourney.render === 'function') {
        global.CrystalJourney.render({
          current: 5,
          unlocked: 6,
          completed: [1, 2, 3, 4, 5],
          records: {},
          reduced: false,
          notify: () => {},
          start: (lvlId) => {
            this.canvas.style.pointerEvents = 'auto';
            this.canvas.style.background = '#05030f';
            this.canvas.style.boxShadow = '0 0 0 100vmax #05030f';
            if (lvlId === 1) this.startCutsceneAndFase1();
            else if (lvlId === 2) this.startFase2();
            else if (lvlId === 3) this.startFase3();
            else this.startFase4();
          }
        });
        ActorAnimator.adaptMapFairyIcon();
      }

      // Efeito inverso (Iris In: círculo se abrindo sobre o Mapa!)
      this.phase = 'map_iris_in';
      this.phaseTime = 0;
      this.canvas.style.background = 'transparent';
      this.canvas.style.boxShadow = 'none';
      this.canvas.style.pointerEvents = 'none';
      IrisTransition.start('in', 160, 90, 0.95, () => {
        this.phase = 'map_active';
      });
    },

    setupLevelStep(level, step) {
      this.currentLevel = level;
      this.currentStep = step;
      this.opalDrainTimer = 0;
      this.pureEquation = null;
      this.shadowEquation = null;
      this.magneticAnim = null;

      if (level === 1) {
        this.totalSteps = 1;
        this.pieces = [
          { id: 'f1_q1', type: 'white', value: 1, shadow: false, x: 118, y: 96 },
          { id: 'f1_s1', type: 'white', value: 1, shadow: true, x: 204, y: 96 }
        ];
      } else if (level === 2) {
        this.totalSteps = 3;
        if (step === 1) {
          this.pieces = [
            { id: 'f2_e1_q1', type: 'white', value: 1, shadow: false, x: 112, y: 96 },
            { id: 'f2_e1_s1', type: 'white', value: 1, shadow: true, x: 206, y: 96 }
          ];
        } else if (step === 2) {
          this.pieces = [
            { id: 'f2_e2_q2', type: 'white', value: 2, shadow: false, x: 122, y: 92 },
            { id: 'f2_e2_op1', type: 'opal', value: 1, shadow: false, x: 84, y: 108 },
            { id: 'f2_e2_s1', type: 'white', value: 1, shadow: true, x: 208, y: 96 }
          ];
          TutorialModal.open(StandardTutorialCards.FASE2_OPAL);
        } else if (step === 3) {
          this.pieces = [
            { id: 'f2_e3_q3', type: 'white', value: 3, shadow: false, x: 96, y: 82 },
            { id: 'f2_e3_q2', type: 'white', value: 2, shadow: false, x: 138, y: 82 },
            { id: 'f2_e3_op3', type: 'opal', value: 3, shadow: false, x: 116, y: 118 },
            { id: 'f2_e3_s2', type: 'white', value: 2, shadow: true, x: 212, y: 96 }
          ];
        }
      } else if (level === 3) {
        this.totalSteps = 3;
        if (step === 1) {
          this.pieces = [
            { id: 'f3_e1_qw3', type: 'white', value: 3, shadow: false, x: 96, y: 76 },
            { id: 'f3_e1_qr2', type: 'rose', value: 2, shadow: false, x: 96, y: 114 },
            { id: 'f3_e1_op2', type: 'opal', value: 2, shadow: false, x: 138, y: 95 },
            { id: 'f3_e1_sw2', type: 'white', value: 2, shadow: true, x: 208, y: 76 },
            { id: 'f3_e1_sr1', type: 'rose', value: 1, shadow: true, x: 208, y: 114 }
          ];
          TutorialModal.open(StandardTutorialCards.FASE3_ROSE_AND_AURA);
        } else if (step === 2) {
          this.pureEquation = { x: 112, y: 94, expanded: false, shadow: false, broken: false };
          this.shadowEquation = { x: 210, y: 94, expanded: false, shadow: true, broken: false };
          this.pieces = [
            { id: 'f3_e2_qr2', type: 'rose', value: 2, shadow: false, inEquation: 'pure', x: 98, y: 94 },
            { id: 'f3_e2_qr3', type: 'rose', value: 3, shadow: false, inEquation: 'pure', x: 112, y: 94 },
            { id: 'f3_e2_qw2', type: 'white', value: 2, shadow: false, inEquation: 'pure', x: 126, y: 94 },
            { id: 'f3_e2_sr5', type: 'rose', value: 5, shadow: true, inEquation: 'shadow', x: 202, y: 94 },
            { id: 'f3_e2_sw2', type: 'white', value: 2, shadow: true, inEquation: 'shadow', x: 218, y: 94 }
          ];
          this.layoutEquationPieces(this.pureEquation, 'pure');
          this.layoutEquationPieces(this.shadowEquation, 'shadow');
          TutorialModal.open(StandardTutorialCards.FASE3_EQUATION_AURA);
        } else if (step === 3) {
          this.pureEquation = { x: 112, y: 94, expanded: false, shadow: false, broken: false };
          this.shadowEquation = { x: 210, y: 94, expanded: false, shadow: true, broken: false };
          this.pieces = [
            { id: 'f3_e3_qr3', type: 'rose', value: 3, shadow: false, inEquation: 'pure', x: 98, y: 94 },
            { id: 'f3_e3_qw2', type: 'white', value: 2, shadow: false, inEquation: 'pure', x: 112, y: 94 },
            { id: 'f3_e3_op4', type: 'opal', value: 4, shadow: false, inEquation: 'pure', x: 126, y: 94 },
            { id: 'f3_e3_sr2', type: 'rose', value: 2, shadow: true, inEquation: 'shadow', x: 202, y: 94 },
            { id: 'f3_e3_sop1', type: 'opal', value: 1, shadow: true, inEquation: 'shadow', x: 218, y: 94 }
          ];
          this.layoutEquationPieces(this.pureEquation, 'pure');
          this.layoutEquationPieces(this.shadowEquation, 'shadow');
        }
      } else if (level === 4) {
        this.totalSteps = 3;
        if (step === 1) {
          this.pieces = [
            { id: 'f4_e1_qw1', type: 'white', value: 1, shadow: false, x: 84, y: 78 },
            { id: 'f4_e1_qw3', type: 'white', value: 3, shadow: false, x: 120, y: 78 },
            { id: 'f4_e1_qr3', type: 'rose', value: 3, shadow: false, x: 96, y: 114 },
            { id: 'f4_e1_op1', type: 'opal', value: 1, shadow: false, x: 138, y: 114 },
            { id: 'f4_e1_sw3', type: 'white', value: 3, shadow: true, x: 212, y: 78 },
            { id: 'f4_e1_sr3', type: 'rose', value: 3, shadow: true, x: 212, y: 114 }
          ];
        } else if (step === 2) {
          this.pureEquation = { x: 112, y: 98, expanded: false, shadow: false, broken: false };
          this.shadowEquation = { x: 212, y: 98, expanded: false, shadow: true, broken: false };
          this.pieces = [
            { id: 'f4_e2_qr2a', type: 'rose', value: 2, shadow: false, inEquation: 'pure', x: 96, y: 98 },
            { id: 'f4_e2_qr2b', type: 'rose', value: 2, shadow: false, inEquation: 'pure', x: 112, y: 98 },
            { id: 'f4_e2_qw4', type: 'white', value: 4, shadow: false, inEquation: 'pure', x: 128, y: 98 },
            { id: 'f4_e2_op1', type: 'opal', value: 1, shadow: false, x: 112, y: 64 },
            { id: 'f4_e2_sr4', type: 'rose', value: 4, shadow: true, inEquation: 'shadow', x: 204, y: 98 },
            { id: 'f4_e2_sw3', type: 'white', value: 3, shadow: true, inEquation: 'shadow', x: 220, y: 98 }
          ];
          this.layoutEquationPieces(this.pureEquation, 'pure');
          this.layoutEquationPieces(this.shadowEquation, 'shadow');
        } else if (step === 3) {
          this.pureEquation = { x: 112, y: 108, expanded: false, shadow: false, broken: false };
          this.shadowEquation = { x: 212, y: 108, expanded: false, shadow: true, broken: false };
          this.pieces = [
            { id: 'f4_e3_qw4', type: 'white', value: 4, shadow: false, x: 92, y: 68 },
            { id: 'f4_e3_op3', type: 'opal', value: 3, shadow: false, x: 132, y: 68 },
            { id: 'f4_e3_qr1', type: 'rose', value: 1, shadow: false, inEquation: 'pure', x: 104, y: 108 },
            { id: 'f4_e3_qr3', type: 'rose', value: 3, shadow: false, inEquation: 'pure', x: 120, y: 108 },
            { id: 'f4_e3_sw2', type: 'white', value: 2, shadow: true, x: 212, y: 68 },
            { id: 'f4_e3_sr3', type: 'rose', value: 3, shadow: true, inEquation: 'shadow', x: 204, y: 108 },
            { id: 'f4_e3_sop1', type: 'opal', value: 1, shadow: true, inEquation: 'shadow', x: 220, y: 108 }
          ];
          this.layoutEquationPieces(this.pureEquation, 'pure');
          this.layoutEquationPieces(this.shadowEquation, 'shadow');
        }
      }
    },

    spawnShatter(cx, cy, setKey, count = 12) {
      const rnd = mulberry(R(cx * 31 + cy * 17 + this.t * 100));
      for (let i = 0; i < count; i++) {
        const a = rnd() * Math.PI * 2;
        const sp = 55 + rnd() * 65;
        this.shards.push({
          t0: this.t,
          x0: cx,
          y0: cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 45,
          floorY: 140 + Math.floor(rnd() * 3),
          set: setKey,
          v: i & 3
        });
      }
    },

    updateOpalProximity(dt) {
      if (this.phase !== 'gameplay' || TutorialModal.isOpen || DialogueBox.isOpen) return;

      for (const p of this.pieces) p.trembling = false;

      const canManipulate = (p) => {
        if (p.broken || p.shadow || p.value <= 0) return false;
        if (p.inEquation === 'pure' && this.pureEquation && !this.pureEquation.expanded) return false;
        return true;
      };

      const opals = this.pieces.filter(p => canManipulate(p) && p.type === 'opal');
      const minTargetValue = (this.currentLevel === 3 && this.currentStep === 3) ? 1 : 2;
      const targets = this.pieces.filter(p => canManipulate(p) && p.type !== 'opal' && (p.value >= minTargetValue));

      let activeOpal = null;
      let activeTarget = null;
      let bestDist = 26;

      for (const op of opals) {
        for (const tg of targets) {
          if (!op.dragging && !tg.dragging) continue;
          const d = Math.hypot(op.x - tg.x, op.y - tg.y);
          if (d <= bestDist) {
            bestDist = d;
            activeOpal = op;
            activeTarget = tg;
          }
        }
      }

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

        this.spawnShatter(
          (activeOpal.x + activeTarget.x) * 0.5,
          (activeOpal.y + activeTarget.y) * 0.5,
          'opal',
          6
        );

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
        this.checkEquationSolved();
        this.triggerDefeatIfImpossible();
      }
    },

    checkPieceDrop(dropped) {
      if (!dropped || dropped.broken || dropped.value <= 0) return;

      // 1. Verifica fusão entre Quartzos da mesma cor primeiro (dentro ou fora da equação)
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
            if (other.type !== dropped.type) {
              dropped.rejectUntil = this.t + 0.35;
              other.rejectUntil = this.t + 0.35;
              GameHUD.playSfx('error');
              return;
            }
            other.value += dropped.value;
            other.lastValChangeAt = this.t;
            dropped.broken = true;
            GameHUD.playSfx(other.type === 'rose' ? 'roseMerge' : 'quartzMerge');
            this.spawnShatter(other.x, other.y, other.type === 'rose' ? 'rose' : 'pure', 8);
            if (this.pureEquation && !this.pureEquation.broken) {
              this.layoutEquationPieces(this.pureEquation, 'pure');
            }
            return;
          }
        }
      }

      // 2. Adição ou retirada intuitiva na Equação Cristalina (funciona mesmo se estiver fechada!)
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

      if (dropped.type === 'opal') return;

      // 3. Anulação direta contra um cristal sombrio isolado equivalente
      if (!dropped.inEquation) {
        const shadowTarget = this.pieces.find(
          k => k.shadow && !k.broken && !k.inEquation && k.type === dropped.type && k.value === dropped.value &&
          Math.hypot(dropped.x - k.x, dropped.y - k.y) <= 22
        );
        if (shadowTarget) {
          dropped.broken = true;
          shadowTarget.broken = true;
          GameHUD.playSfx('shatter');
          GameHUD.playSfx('reward');
          this.spawnShatter(shadowTarget.x, shadowTarget.y, dropped.type === 'rose' ? 'rose' : 'pure', 12);
          this.spawnShatter(shadowTarget.x, shadowTarget.y, 'shadow', 12);

          this.checkIfAllStepTargetsCleared(shadowTarget.x, shadowTarget.y);
        }
      }
    },

    /**
     * Verifica matematicamente se os cristais puros restantes ainda conseguem formar
     * todos os valores exigidos pelos cristais/equações sombrias restantes na etapa.
     */
    isStepStillSolvable() {
      const shadows = this.pieces.filter(p => p.shadow && !p.broken && p.value > 0);
      if (shadows.length === 0) return true;

      const pures = this.pieces.filter(p => !p.shadow && !p.broken && p.value > 0);
      if (pures.length === 0) return false;

      const pureByType = {
        white: pures.filter(p => p.type === 'white').map(p => p.value),
        rose: pures.filter(p => p.type === 'rose').map(p => p.value),
        opal: pures.filter(p => p.type === 'opal').map(p => p.value)
      };
      const shadowByType = {
        white: shadows.filter(p => p.type === 'white').map(p => p.value),
        rose: shadows.filter(p => p.type === 'rose').map(p => p.value),
        opal: shadows.filter(p => p.type === 'opal').map(p => p.value)
      };

      const totalOpal = pureByType.opal.reduce((a, b) => a + b, 0);
      const reqOpalSum = shadowByType.opal.reduce((a, b) => a + b, 0);
      if (shadowByType.opal.length > pureByType.opal.length) return false;
      if (totalOpal < reqOpalSum) return false;

      // Quantidade de unidades que a Opala de Fogo PODE (ou DEVE, se houver Opala Sombria) subtrair
      const maxOpalAvailableForDrain = totalOpal - reqOpalSum;
      const mustDrainFromQuartz = shadowByType.opal.length > 0 ? (totalOpal - reqOpalSum) : 0;
      const minLeave = (this.currentLevel === 3 && this.currentStep === 3) ? 0 : 1;

      let minDrainNeeded = 0;
      let maxDrainCapacity = 0;

      for (const color of ['white', 'rose']) {
        const pList = pureByType[color];
        const sList = shadowByType[color];
        const pSum = pList.reduce((a, b) => a + b, 0);
        const sSum = sList.reduce((a, b) => a + b, 0);

        // Se a soma total de Quartzos dessa cor já ficou menor que o alvo sombrio, é impossível recuperar
        if (pSum < sSum) return false;
        if (sList.length > 0 && pList.length === 0) return false;

        if (sList.length === 0) {
          // Nenhum alvo sombrio dessa cor: os cristais dessa cor podem apenas absorver drenagem da Opala
          maxDrainCapacity += Math.max(0, pSum - minLeave);
        } else {
          // Há alvo sombrio (sSum): verifica o menor dreno necessário a partir de qualquer subconjunto de pList >= sSum
          let bestMinDrain = Infinity;
          const n = pList.length;
          for (let mask = 1; mask < (1 << n); mask++) {
            let subSum = 0;
            for (let i = 0; i < n; i++) {
              if (mask & (1 << i)) subSum += pList[i];
            }
            if (subSum >= sSum) {
              bestMinDrain = Math.min(bestMinDrain, subSum - sSum);
            }
          }
          if (!Number.isFinite(bestMinDrain)) return false;
          minDrainNeeded += bestMinDrain;
          maxDrainCapacity += (pSum - sSum);
        }
      }

      // 1) Se os Quartzos precisam ser reduzidos mais do que a Opala disponível permite -> Derrota!
      if (minDrainNeeded > maxOpalAvailableForDrain) return false;
      // 2) Se a Opala precisa ser reduzida para igualar uma Opala Sombria, mas os Quartzos não têm margem para absorver -> Derrota!
      if (mustDrainFromQuartz > maxDrainCapacity) return false;

      return true;
    },

    triggerDefeatIfImpossible() {
      if (this.phase !== 'gameplay') return;
      const remainingShadows = this.pieces.some(k => k.shadow && !k.broken && k.value > 0);
      if (!remainingShadows) return;

      if (!this.isStepStillSolvable()) {
        if (this.draggedPiece) {
          this.draggedPiece.dragging = false;
          this.draggedPiece = null;
        }
        this.equationPointer = null;
        if (this.pureEquation) {
          this.pureEquation.dropHover = false;
          this.pureEquation.removeHover = false;
        }
        this.clearTrembleStates();
        GameHUD.playSfx('error');
        this.phase = 'defeat_pause';
        this.phaseTime = 0;
      }
    },

    checkIfAllStepTargetsCleared(originX, originY) {
      const remainingShadows = this.pieces.some(k => k.shadow && !k.broken);
      const remainingShadowEq = this.shadowEquation && !this.shadowEquation.broken;
      if (!remainingShadows && !remainingShadowEq) {
        this.onStepCleared(originX, originY);
      }
    },

    checkEquationSolved() {
      if (this.phase !== 'gameplay' || !this.pureEquation || !this.shadowEquation) return;
      if (this.pureEquation.broken || this.shadowEquation.broken) return;

      const pureMembers = this.pieces.filter(p => !p.broken && !p.shadow && p.value > 0 && p.inEquation === 'pure');
      const shadowMembers = this.pieces.filter(p => !p.broken && p.shadow && p.value > 0 && p.inEquation === 'shadow');

      if (pureMembers.length !== shadowMembers.length) return;

      const countsMatch = shadowMembers.every(sm =>
        pureMembers.some(pm => pm.type === sm.type && pm.value === sm.value)
      );
      if (!countsMatch) return;

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
      this.spawnShatter(this.currentLevel === 4 ? 176 : 264, this.currentLevel === 4 ? 32 : 110, 'rock', 14);

      if (this.currentStep < this.totalSteps) {
        this.phase = 'next_step_pause';
        this.phaseTime = 0;
      } else if (this.currentLevel === 4) {
        this.phase = 'ceiling_crystal_shatter';
        this.phaseTime = 0;
        this.ceilingCrystalFlash = true;
      } else {
        this.waveOrigin = { x: originX, y: originY };
        this.waveActive = true;
        this.waveRadius = 1;
        this.phase = 'step_resolving';
        this.phaseTime = 0;
      }
    },

    openWakeUpDialogue() {
      this.phase = 'cutscene_wake_dlg';
      this.phaseTime = 0;
      this.protag.state = 'talk';
      DialogueBox.open([
        {
          speaker: 'Protagonista',
          portrait: 'portrait_protagonist',
          text: 'O que aconteceu? Onde eu estou?'
        }
      ], () => {
        this.phase = 'cutscene_listen_notes';
        this.phaseTime = 0;
        this.protag.state = 'idle';
      });
    },

    openMysteryVoiceDialogue() {
      this.phase = 'cutscene_voice_dlg';
      this.phaseTime = 0;
      DialogueBox.open([
        {
          speaker: 'Voz Misteriosa',
          portrait: 'portrait_mystery_silhouette',
          text: 'Me salve! Me salve!'
        },
        {
          speaker: 'Protagonista',
          portrait: 'portrait_protagonist',
          text: 'Hã? Escutei alguma coisa? De onde vem essa voz? Onde você está?'
        },
        {
          speaker: 'Voz Misteriosa',
          portrait: 'portrait_mystery_silhouette',
          text: 'Siga a minha voz!'
        },
        {
          speaker: 'Protagonista',
          portrait: 'portrait_protagonist',
          text: 'Mas como? O caminho está bloqueado!'
        },
        {
          speaker: 'Voz Misteriosa',
          portrait: 'portrait_mystery_silhouette',
          text: 'Não se preocupe! Está vendo aqueles cristais?'
        },
        {
          speaker: 'Protagonista',
          portrait: 'portrait_protagonist',
          text: 'S-sim, estou!'
        },
        {
          speaker: 'Voz Misteriosa',
          portrait: 'portrait_mystery_silhouette',
          text: 'Quebre eles!'
        }
      ], () => {
        this.phase = 'tutorial';
        this.setupLevelStep(1, 1);
        TutorialModal.open(StandardTutorialCards.FASE1_INTRO, () => {
          this.phase = 'gameplay';
          this.phaseTime = 0;
        });
      });
    },

    openPostLevelDialogue() {
      this.phase = 'post_dialogue';
      this.phaseTime = 0;

      if (this.currentLevel === 1) {
        this.protag.state = 'talk';
        DialogueBox.open([
          {
            speaker: 'Protagonista',
            portrait: 'portrait_protagonist',
            text: 'Consegui! Consegui!'
          },
          {
            speaker: 'Voz Misteriosa',
            portrait: 'portrait_mystery_silhouette',
            text: 'Isso! Continue, pequeno gafanhoto! Assim você vai conseguir me tirar daqui!'
          }
        ], () => {
          this.phase = 'celebrate_complete';
          this.phaseTime = 0;
          this.protag.state = 'celebrate';
        });
      } else if (this.currentLevel === 2) {
        this.protag.state = 'celebrate';
        DialogueBox.open([
          {
            speaker: 'Voz Misteriosa',
            portrait: 'portrait_mystery_silhouette',
            text: 'Isso! Você é muito inteligente! Continue!'
          }
        ], () => {
          this.phase = 'celebrate_complete';
          this.phaseTime = 0;
          this.protag.state = 'celebrate';
        });
      } else if (this.currentLevel === 3) {
        this.protag.state = 'celebrate';
        DialogueBox.open([
          {
            speaker: 'Voz Misteriosa',
            portrait: 'portrait_mystery_silhouette',
            text: 'Isso, você chegou até onde estou!'
          },
          {
            speaker: 'Protagonista',
            portrait: 'portrait_protagonist',
            text: 'Isso, finalmente! Não posso esperar para saber de onde vem essa voz!'
          }
        ], () => {
          this.phase = 'celebrate_complete';
          this.phaseTime = 0;
          this.protag.state = 'celebrate';
        });
      }
    },

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
        this.musicalTime < 166.0
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

      if (this.phase === 'cutscene_fall') {
        const pt = this.phaseTime;
        if (pt < 1.1) {
          this.protag.state = 'fall';
          const p = clamp(pt / 1.1, 0, 1);
          this.protag.y = R(-10 + p * 138);
          if (p > 0.55) {
            this.cushionAlpha = clamp((p - 0.55) / 0.35, 0, 1);
          }
        } else if (pt < 2.5) {
          this.cushionAlpha = 1;
          this.protag.y = 128;
          this.protag.state = 'recover_stand';
        } else if (pt < 3.4) {
          this.cushionAlpha = clamp(1 - (pt - 2.5) / 0.8, 0, 1);
          this.protag.y = R(128 + ((pt - 2.5) / 0.9) * 14);
          this.protag.state = 'idle';
        } else {
          this.protag.y = 142;
          this.cushionAlpha = 0;
          this.openWakeUpDialogue();
        }
      } else if (this.phase === 'cutscene_listen_notes') {
        if (this.phaseTime >= 1.8) {
          this.openMysteryVoiceDialogue();
        }
      } else if (this.phase === 'cutscene_enter_level') {
        const p = clamp(this.phaseTime / 1.1, 0, 1);
        this.protag.x = R(-8 + p * 50);
        this.protag.state = p < 1 ? 'walk' : 'idle';
        if (this.phaseTime >= 1.2) {
          this.protag.x = 42;
          this.protag.state = 'idle';
          this.phase = 'gameplay';
          this.phaseTime = 0;
          this.setupLevelStep(this.currentLevel, 1);
        }
      } else if (this.phase === 'cutscene_fase4_walk') {
        const p = clamp(this.phaseTime / 1.0, 0, 1);
        this.protag.x = R(-8 + p * 50);
        this.protag.state = p < 1 ? 'walk' : 'shock';
        if (this.phaseTime >= 1.35) {
          this.protag.x = 42;
          this.openFase4IntroDialogue();
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
            if (pc.inEquation === 'pure' || pc.inEquation === 'shadow') {
              pc.broken = true;
            }
          }
          GameHUD.playSfx('equationShatter');
          GameHUD.playSfx('reward');
          this.spawnShatter(m.midX, m.midY, 'rose', 14);
          this.spawnShatter(m.midX, m.midY, 'pure', 12);
          this.spawnShatter(m.midX, m.midY, 'shadow', 14);

          const remainingShadows = this.pieces.some(k => k.shadow && !k.broken);
          if (remainingShadows) {
            this.phase = 'gameplay';
            this.phaseTime = 0;
          } else {
            this.onStepCleared(m.midX, m.midY);
          }
        }
      } else if (this.phase === 'ceiling_crystal_shatter') {
        if (this.phaseTime >= 0.22 && !this.ceilingCrystalBroken) {
          this.ceilingCrystalFlash = false;
          this.ceilingCrystalBroken = true;
          GameHUD.playSfx('ceilingShatter');
          this.spawnShatter(176, 26, 'pure', 24);
          this.spawnShatter(176, 26, 'shadow', 16);
        }
        if (this.phaseTime >= 1.1) {
          this.startMusicalShow();
        }
      } else if (this.phase === 'musical_part1_shadows' || this.phase === 'musical_part2_bright') {
        // Sincroniza com o áudio real se estiver tocando, ou avança pelo relógio lógico
        if (this.musicAudio && !this.musicAudio.paused && this.musicAudio.currentTime > 0) {
          this.musicalTime = this.musicAudio.currentTime;
        } else {
          this.musicalTime += dt;
        }
        const mt = this.musicalTime;

        if (mt < 80.0) {
          // PARTE 1 DA MÚSICA (00:00 - 01:20): Coreografia contínua da Ordem pelo palco + Teatro de Sombras Hi-Bit
          this.phase = 'musical_part1_shadows';
          this.ordemActor.state = 'back_silhouette';

          if (mt < 11.0) {
            // [00:00 - 00:11] Intro de Violino: Descida graciosa em espiral de luz (0..6s) + deslize de abertura de asas (6..11s)
            if (mt < 6.0) {
              const pDesc = easeInOut(clamp(mt / 6.0, 0, 1));
              this.ordemActor.x = R(176 - pDesc * 16 + Math.sin(mt * 1.8) * 14);
              this.ordemActor.y = R(32 + pDesc * 108);
              this.ordemActor.flipX = Math.cos(mt * 1.8) < 0;
            } else {
              const pGlide = (mt - 6.0) / 5.0;
              this.ordemActor.x = R(160 + Math.sin(pGlide * Math.PI * 2) * 28);
              this.ordemActor.y = R(140 - Math.sin(pGlide * Math.PI) * 6);
              this.ordemActor.flipX = Math.cos(pGlide * Math.PI * 2) < 0;
            }
          } else if (mt < 22.0) {
            // [00:11 - 00:22] "Era uma vez um reino...": Caminhada/flutuação suave de um lado ao outro apontando para o Reino e as 4 Gemas
            const sweep = Math.sin((mt - 11.0) * 0.85);
            this.ordemActor.x = R(160 + sweep * 42);
            this.ordemActor.y = R(140 - Math.abs(Math.cos((mt - 11.0) * 1.7)) * 4);
            this.ordemActor.flipX = Math.cos((mt - 11.0) * 0.85) < 0;
          } else if (mt < 30.0) {
            // [00:22 - 00:30] "Cada cristal tinha sua rainha...": Desliza apresentando as 4 rainhas e flutua sob sua própria efígie real
            if (mt < 26.0) {
              const pQ = (mt - 22.0) / 4.0;
              this.ordemActor.x = R(112 + pQ * 92);
              this.ordemActor.y = R(140 - Math.sin(pQ * Math.PI * 2) * 3);
              this.ordemActor.flipX = false;
            } else {
              const pH = (mt - 26.0) / 4.0;
              this.ordemActor.x = R(204 - easeInOut(pH) * 66);
              this.ordemActor.y = R(134 - Math.sin(pH * Math.PI) * 7);
              this.ordemActor.flipX = true;
            }
          } else if (mt < 45.0) {
            // [00:30 - 00:44] "Mas com o tempo a fumaça... / grito de alerta": Movimento urgente de um lado ao outro alertando sobre o perigo
            const urg = (mt - 30.0) * 1.45;
            this.ordemActor.x = R(160 + Math.sin(urg) * 46);
            this.ordemActor.y = R(140 - Math.abs(Math.sin(urg * 2)) * 5);
            this.ordemActor.flipX = Math.cos(urg) < 0;
          } else if (mt < 63.5) {
            // [00:45 - 01:03] "Na sombra gerada por mãos tão cruéis...": Levitação dramática tentando resistir às garras até o quase-blecaute
            if (mt < 59.5) {
              const pTrap = (mt - 45.0) / 14.5;
              this.ordemActor.x = R(160 + Math.sin(pTrap * Math.PI * 3) * 34);
              this.ordemActor.y = R(140 - Math.sin(pTrap * Math.PI) * 14);
              this.ordemActor.flipX = Math.cos(pTrap * Math.PI * 3) < 0;
            } else {
              // Pausa dramática em descida lenta durante "E assim chegamos ao fim..."
              const pEnd = clamp((mt - 59.5) / 4.0, 0, 1);
              this.ordemActor.x = R(160 + (1 - pEnd) * 12);
              this.ordemActor.y = R(128 + easeInOut(pEnd) * 14);
              this.ordemActor.flipX = false;
            }
          } else {
            // [01:04 - 01:20] Solo de Violino: Giro e dança aérea expressiva em figura-8 pelo palco acompanhando o crescendo
            const vTime = mt - 63.5;
            this.ordemActor.x = R(160 + Math.sin(vTime * 1.55) * 52);
            this.ordemActor.y = R(132 - Math.abs(Math.sin(vTime * 3.1)) * 16);
            // Giro expressivo nos picos do violino
            this.ordemActor.flipX = (Math.floor(vTime * 2.5) & 1) === 1;
          }
        } else if (mt < 166.5) {
          // PARTE 2 DA MÚSICA (01:20 - 02:46): Luz da manhã, vinheta de nuvem em 3 atos, dança de cristais, sapatinho, florescer e panorama Owlboy!
          this.phase = 'musical_part2_bright';

          if (mt < 84.5) {
            // [01:20 - 01:24.5] "Mas...": Ordem voa em arco luminoso até o Protagonista enquanto os animais de pedra cantam o coro
            const p = easeInOut(clamp((mt - 80.0) / 4.5, 0, 1));
            this.ordemActor.x = R(160 - p * 54);
            this.ordemActor.y = R(142 - Math.sin(p * Math.PI) * 16);
            this.ordemActor.state = p < 0.85 ? 'walk' : 'sing';
            this.ordemActor.flipX = true;
            this.protag.x = 64;
            this.protag.y = 142;
            this.protag.state = 'idle';
          } else if (mt < 105.8) {
            // [01:25 - 01:45.8] Vinheta de nuvem com a história da criança (superfície -> caverna escura -> queda no calabouço)
            const sway = (mt - 84.5) * 1.15;
            this.ordemActor.x = R(106 + Math.sin(sway) * 14);
            this.ordemActor.y = R(140 - Math.abs(Math.cos(sway * 1.5)) * 4);
            this.ordemActor.state = 'sing';
            this.ordemActor.flipX = Math.cos(sway) < 0;
            this.protag.x = 62;
            this.protag.y = 142;
            this.protag.state = mt >= 101.2 ? 'shock' : 'idle';
          } else if (mt < 115.3) {
            // [01:46 - 01:55.3] "Contudo, respira fundo... Um, dois, três e... Vamos lá!": Ordem circula o Protagonista animada
            const cir = (mt - 105.8) * 2.1;
            this.ordemActor.x = R(92 + Math.sin(cir) * 32);
            this.ordemActor.y = R(136 - Math.abs(Math.cos(cir)) * 10);
            this.ordemActor.state = 'sing';
            this.ordemActor.flipX = Math.cos(cir) < 0;
            this.protag.x = 64;
            this.protag.y = 142;
            this.protag.state = mt >= 112.6 ? 'celebrate' : 'idle';
          } else if (mt < 125.5) {
            // [01:56 - 02:05.5] "Olha só que novidade, eu tô livre, move o cristal aqui... abriu-se o caminho!"
            if (this.cloudPopTime < 0) this.cloudPopTime = mt;
            const dTime = mt - 115.3;
            this.ordemActor.x = R(142 + Math.sin(dTime * 1.5) * 38);
            this.ordemActor.y = R(128 - Math.abs(Math.sin(dTime * 3.0)) * 12);
            this.ordemActor.state = 'sing';
            this.ordemActor.flipX = Math.cos(dTime * 1.5) < 0;
            this.protag.x = R(68 + Math.sin(dTime * 2.0) * 8);
            this.protag.y = 142;
            this.protag.state = (Math.floor(mt * 2) & 1) ? 'celebrate' : 'walk';
            this.obstacleDecay = clamp((mt - 120.0) / 5.0, 0, 1);
          } else if (mt < 129.8) {
            // [02:06 - 02:09.8] "Abre o sapatinho! Vai no sapatinho!": Passos ritmados junto ao tambor mágico
            const stepT = (mt - 125.5) * 7.5;
            this.ordemActor.x = R(132 + Math.sin(stepT) * 12);
            this.ordemActor.y = R(142 - Math.abs(Math.sin(stepT * 2)) * 5);
            this.ordemActor.state = 'sing';
            this.ordemActor.flipX = Math.cos(stepT) < 0;
            this.protag.x = R(74 + Math.sin(stepT) * 10);
            this.protag.y = R(142 - Math.abs(Math.cos(stepT * 2)) * 4);
            this.protag.state = (Math.floor(stepT) & 1) ? 'celebrate' : 'walk';
          } else if (mt < 143.8) {
            // [02:09.8 - 02:23.8] "Pequenos passos fazendo a terra inteira florescer! ... Chegamos ao topo de novo!"
            if (mt < 135.5) {
              const flP = (mt - 129.8) / 5.7;
              this.ordemActor.x = R(96 + Math.sin(flP * Math.PI * 2) * 54);
              this.ordemActor.y = R(138 - Math.abs(Math.cos(flP * Math.PI * 4)) * 6);
              this.ordemActor.flipX = Math.cos(flP * Math.PI * 2) < 0;
            } else {
              // Sobe flutuando em destaque no refrão "Eu sou a Ordem... Chegamos ao topo de novo!"
              const chP = clamp((mt - 135.5) / 8.3, 0, 1);
              this.ordemActor.x = R(160 + Math.sin(chP * Math.PI * 2) * 28);
              this.ordemActor.y = R(124 - Math.sin(chP * Math.PI) * 16);
              this.ordemActor.flipX = Math.cos(chP * Math.PI * 2) < 0;
            }
            this.ordemActor.state = 'sing';
            this.protag.x = 76;
            this.protag.y = 142;
            this.protag.state = 'celebrate';
          } else if (mt < 153.5) {
            // [02:24 - 02:33.5] "Move pra cá! Move pra lá! Que o dom da Ordem faz tudo brilhar! Sem bagunça, sem fumaça!"
            if (mt < 148.8) {
              const isLeft = mt < 146.2;
              const shiftX = isLeft
                ? -easeInOut(clamp((mt - 143.8) / 1.8, 0, 1)) * 28
                : -28 + easeInOut(clamp((mt - 146.2) / 2.0, 0, 1)) * 56;
              this.ordemActor.x = R(156 + shiftX);
              this.ordemActor.y = R(134 - Math.abs(Math.sin((mt - 143.8) * 5)) * 5);
              this.ordemActor.flipX = isLeft;
              this.protag.x = R(84 + shiftX * 0.75);
              this.protag.y = 142;
              this.protag.state = 'walk';
            } else {
              const cleanP = (mt - 148.8) / 4.7;
              this.ordemActor.x = R(120 + cleanP * 68);
              this.ordemActor.y = R(132 - Math.sin(cleanP * Math.PI) * 10);
              this.ordemActor.flipX = false;
              this.protag.x = 84;
              this.protag.y = 142;
              this.protag.state = 'celebrate';
            }
            this.ordemActor.state = 'sing';
          } else {
            // [02:34 - 02:46.5] "O reino vai renascer! A Ordem voltou!": Celebração diante do Panorama da Floresta
            const finT = mt - 153.5;
            this.ordemActor.x = R(148 + Math.sin(finT * 2.0) * 18);
            this.ordemActor.y = R(136 - Math.abs(Math.sin(finT * 3.0)) * 8);
            this.ordemActor.state = 'sing';
            this.ordemActor.flipX = false;
            this.protag.x = R(84 + Math.sin(finT * 2.0) * 8);
            this.protag.y = 142;
            this.protag.state = (Math.floor(mt * 2) & 1) ? 'celebrate' : 'idle';
          }
        } else {
          this.finishMusicalShow();
        }
      } else if (this.phase === 'walk_to_forest_exit') {
        // Personagens entram na entrada para a Floresta -> Iris Out (círculo se fechando até ficar tudo preto)
        const p = clamp(this.phaseTime / 1.4, 0, 1);
        this.protag.x = R(84 + p * 165);
        this.ordemActor.x = R(148 + p * 115);
        if (this.phaseTime >= 0.45 && !IrisTransition.active && this.phaseTime < 1.35) {
          IrisTransition.start('out', 250, 118, 0.85, () => {
            this.enterJourneyMapWithIrisIn();
          });
        }
      } else if (this.phase === 'next_step_pause') {
        if (this.phaseTime >= 0.65) {
          this.phase = 'gameplay';
          this.phaseTime = 0;
          this.setupLevelStep(this.currentLevel, this.currentStep + 1);
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

    composeBackground() {
      // Na Parte 1 da música, tudo fica escuro cinematicamente mantendo apenas os cristais do ambiente acesos!
      if (this.phase === 'musical_part1_shadows') {
        BG_U32.set(BG_CINEMATIC);
        return;
      }
      // Na Parte 2 da música e pós-música, tudo fica claro e animado!
      if (
        this.phase === 'musical_part2_bright' ||
        this.phase === 'post_musical_ordem_dlg' ||
        this.phase === 'world_celebrate_complete' ||
        this.phase === 'walk_to_forest_exit'
      ) {
        BG_U32.set(BG_LIT);
        return;
      }
      if (!this.waveActive || this.waveRadius <= 0) {
        BG_U32.set(BG_DARK);
        return;
      }
      if (this.waveRadius >= 360) {
        BG_U32.set(BG_LIT);
        return;
      }
      const ox = this.waveOrigin.x * 2, oy = this.waveOrigin.y * 2;
      const rad = Math.floor(this.waveRadius * 48) / 24;
      const rim1 = c32('#c8fbff'), rim2 = c32('#ffffff');
      for (let y = 0, i = 0; y < HH; y++) {
        for (let x = 0; x < HW; x++, i++) {
          const d = Math.hypot(x - ox, y - oy) + bay(x, y) * 1.2;
          if (d < rad - 6) BG_U32[i] = BG_LIT[i];
          else if (d < rad) BG_U32[i] = ((x + y) & 1) ? rim1 : BG_LIT[i];
          else if (d < rad + 4 && bay(x, y) < 4) BG_U32[i] = rim2;
          else BG_U32[i] = BG_DARK[i];
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
      // Card de conclusão em Pergaminho Estilo Owlboy, perfeitamente centralizado e enquadrado
      const bx = 42, by = 28, bw = 236, bh = 108;
      drawParchmentBox(ctx, bx, by, bw, bh, { headerH: 17, headerBg: '#3d2b24' });

      if (isWorldFinale) {
        const f12 = Math.floor(this.t * SPRITE_FPS);
        for (let k = 0; k < 8; k++) {
          const fx = 24 + ((k * 37) % 272);
          const fy = 24 + ((f12 * 3 + k * 19) % 110);
          drawStar(ctx, fx, fy, (k & 1) ? 3 : 2, '#ffffff', (k % 3 === 0) ? '#f2cc6b' : (k % 3 === 1 ? '#68b8c4' : '#e396b1'));
        }
        drawPixelTextCentered(ctx, 'Mundo 1 Restaurado!', bx + bw / 2, by + 8, '#f7e2b8', '#1f1410', bw - 16, 9);
        drawPixelTextCentered(ctx, 'A Ordem despertou a Caverna!', bx + bw / 2, by + 28, '#2c221e', null, bw - 20, 10);
        drawPixelTextCentered(ctx, 'Rumo ao Mundo da Floresta!', bx + bw / 2, by + 41, '#633b34', null, bw - 20, 10);
      } else {
        drawPixelTextCentered(ctx, `Fase ${this.currentLevel} Concluída!`, bx + bw / 2, by + 8, '#f7e2b8', '#1f1410', bw - 16, 9);
        drawPixelTextCentered(ctx, 'O caminho da Caverna se abriu!', bx + bw / 2, by + 32, '#2c221e', null, bw - 20, 10);
      }

      const starY = by + 62;
      for (let i = 0; i < 3; i++) {
        drawStar(ctx, bx + bw / 2 - 20 + i * 20, starY, 4, '#ffffff', '#e3b454');
      }

      const b = this.completeBtnRect;
      ctx.fillStyle = '#2c221e';
      ctx.fillRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
      ctx.fillStyle = '#3e7338';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#d9a85b';
      ctx.fillRect(b.x, b.y, b.w, 1);
      ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
      drawPixelTextCentered(ctx, isWorldFinale ? 'Ir à Floresta >' : 'Continuar >', b.x + b.w / 2, b.y + 4, '#ffffff', '#1f1410', b.w - 6, 9);
    },

    drawGameOverOverlay(ctx) {
      ctx.fillStyle = 'rgba(10, 8, 6, 0.58)';
      ctx.fillRect(0, 20, W, H - 20);

      const bx = 34, by = 28, bw = 252, bh = 116;
      drawParchmentBox(ctx, bx, by, bw, bh, { headerH: 17, headerBg: '#59221c' });
      drawPixelTextCentered(ctx, 'Equilíbrio Perdido!', bx + bw / 2, by + 8, '#f7e2b8', '#1f1410', bw - 16, 9);

      drawPixelTextCentered(
        ctx,
        'Os cristais perderam o equilíbrio e não podem mais formar o valor exigido nesta etapa.',
        bx + bw / 2,
        by + 28,
        '#2c221e',
        null,
        bw - 24,
        10
      );
      drawPixelTextCentered(
        ctx,
        'Recomece a fase para tentar novamente!',
        bx + bw / 2,
        by + 64,
        '#7a2e22',
        null,
        bw - 24,
        9
      );

      // Botão destacado "Reiniciar Fase"
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
      const mt = this.musicalTime;

      if (this.phase === 'musical_part1_shadows') {
        // Parte 1 (00:00 - 01:20): Feixes volumétricos, Teatro de Sombras Hi-Bit na parede e notas acompanhando a Ordem em movimento
        drawShadowPlayOnWall(ctx, mt, tq, this.ordemActor.x, this.ordemActor.y);
        ActorAnimator.drawMusicNotesLoop(ctx, this.ordemActor.x, this.ordemActor.y - 24, tq, {
          count: 4,
          dirX: this.ordemActor.flipX ? -16 : 16,
          dirY: -20,
          period: 1.6
        });
      } else if (this.phase === 'musical_part2_bright') {
        const ox = this.ordemActor.x, oy = this.ordemActor.y;

        // 01:20+: Luz quente da manhã iluminando rochas, musgo e neblina
        drawMorningSunbeams(ctx, mt, tq);

        // Panorama Owlboy da Floresta abrindo pela passagem direita (02:34 - 02:46)
        if (mt >= 153.5) {
          drawWorldPanorama(ctx, (mt - 153.5) / 6.0, tq);
        }

        // Vinheta de nuvem pictórica (01:24.5 - 01:55.3) + estouro em "Vamos lá!"
        if (mt >= 84.5 && mt < 115.3) {
          drawCloudThoughtBubble(ctx, mt, tq, ox, oy);
        } else if (this.cloudPopTime > 0 && mt - this.cloudPopTime <= 0.85) {
          drawCloudPopEffect(ctx, mt - this.cloudPopTime);
        }

        // Grama viva e flores brotando por onde a Ordem passa (02:09.8+)
        drawCaveBloomingFlora(ctx, mt, tq);

        // Dança telecinética de cristais com bolinhas de unidade (01:55.5 - 02:05.5)
        if (mt >= 115.5 && mt < 125.5) {
          drawTelekineticCrystalDance(ctx, mt, tq, ox, oy);
        }

        // Tambor mágico do "Sapatinho" (02:05.5 - 02:09.8)
        if (mt >= 125.5 && mt < 129.8) {
          drawCrystalDrumMagic(ctx, 104, 116, tq);
        }

        // "Move pra cá! Move pra lá! Sem bagunça, sem fumaça!" (02:23.8 - 02:33.8)
        drawMovePraCaPraLaShow(ctx, mt, tq);

        // Animais de Pedra com Cristais Neon cantando as vozes secundárias / coro
        const extraVoice = isSecondaryVoiceActive(mt);
        ActorAnimator.drawStoneNeonAnimal(ctx, 'cyan', extraVoice, 24, 142, tq, false);
        ActorAnimator.drawStoneNeonAnimal(ctx, 'magenta', extraVoice, 206, 142, tq, true);
        if (mt < 153.5) {
          ActorAnimator.drawStoneNeonAnimal(ctx, 'gold', extraVoice, 296, 142, tq, true);
        }

        // Notas musicais da voz principal da Ordem acompanhando sua direção
        ActorAnimator.drawMusicNotesLoop(ctx, ox, oy - 24, tq, {
          count: 4,
          dirX: this.ordemActor.flipX ? -14 : 14,
          dirY: -20,
          period: 1.5
        });
      }

      // Legenda sincronizada da música em pergaminho estilo Owlboy, 100% centralizada
      for (const [t0, t1, text] of MUSICAL_CAPTIONS) {
        if (mt >= t0 && mt <= t1) {
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

      // Se já entrou no Mapa, desenha apenas o Iris In abrindo sobre o Mapa
      if (this.phase === 'map_iris_in' || this.phase === 'map_active') {
        ctx.setTransform(2, 0, 0, 2, 0, 0);
        ctx.clearRect(0, 0, W, H);
        IrisTransition.render(ctx);
        return;
      }

      this.composeBackground();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.putImageData(BG_IMAGE, 0, 0);
      ctx.setTransform(2, 0, 0, 2, 0, 0);

      // Na saída para a Floresta, mantém o panorama aberto à direita
      if (this.phase === 'post_musical_ordem_dlg' || this.phase === 'world_celebrate_complete' || this.phase === 'walk_to_forest_exit') {
        drawWorldPanorama(ctx, 1.0, tq);
        ActorAnimator.drawStoneNeonAnimal(ctx, 'cyan', this.phase === 'world_celebrate_complete', 24, 142, tq, false);
        ActorAnimator.drawStoneNeonAnimal(ctx, 'magenta', this.phase === 'world_celebrate_complete', 294, 142, tq, true);
      } else if (this.currentLevel === 4) {
        drawGiantCeilingCrystal(
          ctx,
          this.obstacleDecay,
          this.ceilingCrystalFlash,
          this.ceilingCrystalBroken,
          tq
        );
        if (!this.ceilingCrystalBroken) {
          ActorAnimator.drawMusicNotesLoop(ctx, 176, 46, tq, {
            count: 4,
            dirX: -24,
            dirY: 18,
            period: 2.0
          });
        }
      } else {
        drawPathObstacle(ctx, this.obstacleDecay, tq);
      }

      if (this.cushionAlpha > 0) {
        drawMagicCushion(ctx, 74, 127, this.cushionAlpha, tq);
      }

      if (
        this.currentLevel < 4 &&
        (this.phase === 'cutscene_listen_notes' ||
          this.phase === 'cutscene_voice_dlg' ||
          this.phase === 'gameplay' ||
          this.phase === 'equation_magnetic' ||
          this.phase === 'next_step_pause')
      ) {
        ActorAnimator.drawMusicNotesLoop(ctx, 312, 92, tq, {
          count: 4,
          dirX: -28,
          dirY: -16,
          period: 2.2
        });
      }

      // Renderiza elementos da Parte Musical (Show de Sombras, Nuvem, Animais de Pedra Neon, Tambor de Cristal e Panorama)
      if (this.phase === 'musical_part1_shadows' || this.phase === 'musical_part2_bright') {
        this.renderMusicalElements(ctx, tq);
      }

      // Protagonista Hi-Bit (40x54 pixels físicos)
      if (this.phase === 'cutscene_fall' && this.protag.state === 'recover_stand') {
        const recElapsed = Math.max(0, this.phaseTime - 1.1);
        const subFrame = recElapsed < 0.85 ? 0 : recElapsed < 1.15 ? 2 : 3;
        const spr = E.SpriteBank.protagonist.recover_stand[subFrame];
        const scale = spr.hib ? 0.5 : 1;
        const sw = spr.width * scale, sh = spr.height * scale;
        ctx.drawImage(spr, RH(this.protag.x - sw / 2), RH(this.protag.y - sh), sw, sh);
      } else {
        ActorAnimator.drawActor(ctx, 'protagonist', this.protag.state, this.protag.x, this.protag.y, tq);
      }

      // Personagem liberta ("Ordem") usando os estados em loop do SpriteBank e flipX coreografado
      if (this.ordemActor.visible) {
        ActorAnimator.drawActor(ctx, 'ordem', this.ordemActor.state, this.ordemActor.x, this.ordemActor.y, tq, {
          flipX: Boolean(this.ordemActor.flipX)
        });
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
        if (this.phase === 'equation_magnetic' && this.pureEquation && this.shadowEquation) {
          const f12 = Math.floor(tq * 12);
          for (let x = this.pureEquation.x; x <= this.shadowEquation.x; x += 3) {
            P1(ctx, x, this.pureEquation.y + ((x + f12) & 1 ? -1 : 1), '#ffffff');
          }
        }

        const pureEqMembers = this.pieces.filter(p => !p.broken && p.value > 0 && p.inEquation === 'pure');
        const shadowEqMembers = this.pieces.filter(p => !p.broken && p.value > 0 && p.inEquation === 'shadow');
        drawEquationAura(ctx, this.pureEquation, tq, pureEqMembers);
        drawEquationAura(ctx, this.shadowEquation, tq, shadowEqMembers);

        for (const p of this.pieces) {
          drawCrystalPiece(ctx, p, tq);
        }
      }

      this.drawShards(ctx);

      // HUD Superior Completo (Título da Fase, Etapa + Botões de Pause, Recomeçar, Mudo e Configurações)
      GameHUD.renderTopBar(ctx, this.currentLevel, this.currentStep, this.totalSteps);

      // Botão Pular >> no topo durante o show musical, enquadrado ao lado dos 4 botões do HUD
      if (this.phase === 'musical_part1_shadows' || this.phase === 'musical_part2_bright') {
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

      // Modais interativos de Pause e Configurações sobre a cena
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

  function hookPlayButton() {
    ActorAnimator.adaptMapFairyIcon();
    const playBtn = document.getElementById('playButton');
    if (playBtn && !playBtn._truePixelHooked) {
      playBtn._truePixelHooked = true;
      playBtn.addEventListener('click', (ev) => {
        ev.stopImmediatePropagation();
        ev.preventDefault();
        CaveChapter1.startCutsceneAndFase1();
      }, true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hookPlayButton);
  } else {
    hookPlayButton();
  }

  global.CaveChapter1 = CaveChapter1;
})(typeof window !== 'undefined' ? window : globalThis);
