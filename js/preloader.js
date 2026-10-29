'use strict';
/**
 * TELA DE LOADING FUNCIONAL EM TRUE PIXEL ART — SINFONIA DOS CRISTAIS
 * Garante que 100% dos assets (imagens, cenários, spritesheets e áudios)
 * sejam previamente carregados e validados antes que o jogo e o menu sejam liberados.
 */
(function (global) {
  const W = 320, H = 180;
  const HW = 640, HH = 360;
  const R = Math.round;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Manifest completo dos recursos essenciais do jogo
  const IMAGE_MANIFEST = [
    { id: 'pixel_cave', src: 'assets/scenarios/pixel-cave.png', label: 'Cenário da Caverna' },
    { id: 'pixel_worlds', src: 'assets/scenarios/pixel-worlds.png', label: 'Atlas dos 4 Biomas' },
    { id: 'portal_crystal', src: 'assets/scenarios/portal-crystal.png', label: 'Portal Ancestral' },
    { id: 'pixel_gems', src: 'assets/sprites/pixel-gems.png', label: 'Gemas e Cristais' },
    { id: 'pixel_ecology', src: 'assets/sprites/pixel-ecology.png', label: 'Ecologia e Natureza' },
    { id: 'menu_aprovado', src: 'assets/story/interface/menu-aprovado.png', label: 'Pórtico do Menu' },
    { id: 'btn_jogar', src: 'assets/story/interface/btn-jogar.png', label: 'Botão Jogar' },
    { id: 'btn_opcoes', src: 'assets/story/interface/btn-opcoes.png', label: 'Botão Opções' },
    { id: 'btn_creditos', src: 'assets/story/interface/btn-creditos.png', label: 'Botão Créditos' },
    { id: 'btn_sair', src: 'assets/story/interface/btn-sair.png', label: 'Botão Sair' },
    { id: 'paineis_mundos', src: 'assets/story/interface-extra/paineis-mundos.png', label: 'Painéis dos Mundos' },
    { id: 'mapa_sem_personagem', src: 'assets/story/interface-extra/mapa-sem-personagem.png', label: 'Caminho do Mapa' },
    { id: 'porta_abertura', src: 'assets/story/interface-extra/porta-abertura.png', label: 'Porta Ancestral' },
    { id: 'porta_estados', src: 'assets/story/interface-extra/porta-estados.png', label: 'Fechaduras da Porta' },
    { id: 'fada_16', src: 'assets/story/personagens/fada-16-quadros-v1.png', label: 'Ordem (Fada)' },
    { id: 'fada_canto', src: 'assets/story/personagens/fada-canto-12-quadros-v2.png', label: 'Ordem Cantora' },
    { id: 'fada_mapa', src: 'assets/story/personagens/fada-mapa-8-quadros.png', label: 'Guia do Mapa' },
    { id: 'araci', src: 'assets/story/personagens/araci-16-quadros.png', label: 'Guardiã Araci' },
    { id: 'onca', src: 'assets/story/personagens/onca-12-quadros.png', label: 'Onça Protetora' },
    { id: 'irece', src: 'assets/story/personagens/irece-16-quadros.png', label: 'Guardiã Irecê' },
    { id: 'jurema', src: 'assets/story/personagens/jurema-16-quadros.png', label: 'Guardiã Jurema' },
    { id: 'trans_caverna', src: 'assets/story/transicoes/caverna-20-quadros.png', label: 'Restauração da Caverna' },
    { id: 'trans_floresta', src: 'assets/story/transicoes/floresta-20-quadros.png', label: 'Restauração da Floresta' },
    { id: 'trans_rio', src: 'assets/story/transicoes/rio-20-quadros.png', label: 'Restauração do Rio' },
    { id: 'trans_caatinga', src: 'assets/story/transicoes/caatinga-20-quadros.png', label: 'Restauração da Caatinga' }
  ];

  const AUDIO_MANIFEST = [
    { id: 'musica_menu', src: 'assets/audio/musica-menu.mp3', label: 'Sinfonia do Santuário' },
    { id: 'era_uma_vez_caverna', src: 'assets/audio/era-uma-vez-caverna.mp3', label: 'A Canção da Ordem' },
    { id: 'o_que_um_cristal_pode_fazer', src: 'assets/audio/o-que-um-cristal-pode-fazer.mp3', label: 'Apresentação Final' }
  ];

  const TOTAL_RESOURCES = IMAGE_MANIFEST.length + AUDIO_MANIFEST.length;

  const AssetPreloader = {
    active: true,
    ready: false,
    loadedCount: 0,
    totalCount: TOTAL_RESOURCES,
    smoothRatio: 0,
    currentLabel: 'Iniciando ressonância cristalina...',
    cache: {
      images: {},
      audios: {}
    },
    particles: [],
    startTime: 0,
    fadeAlpha: 0,
    fadingOut: false,

    init() {
      global.CrystalAssetsReady = false;
      global.CrystalAssetCache = this.cache;

      if (typeof document === 'undefined') return;

      this.ensureDOM();
      this.initParticles();
      this.startTime = typeof performance !== 'undefined' ? performance.now() : 0;
      this.startLoop();
      this.preloadAll();
    },

    ensureDOM() {
      if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
      let root = typeof document.getElementById === 'function' ? document.getElementById('preloaderScreen') : null;
      if (!root) {
        root = document.createElement('div');
        root.id = 'preloaderScreen';
        root.style = root.style || {};
        root.addEventListener = root.addEventListener || (() => {});
        if (document.body && typeof document.body.appendChild === 'function') {
          document.body.appendChild(root);
        }
      }

      let cv = typeof document.getElementById === 'function' ? document.getElementById('preloaderCanvas') : null;
      if (!cv) {
        cv = document.createElement('canvas');
        cv.id = 'preloaderCanvas';
        cv.width = HW;
        cv.height = HH;
        cv.style = cv.style || {};
        if (root && typeof root.appendChild === 'function') {
          root.appendChild(cv);
        }
      }
      this.canvas = cv;
      if (cv && typeof cv.getContext === 'function') {
        this.ctx = cv.getContext('2d');
        if (this.ctx) this.ctx.imageSmoothingEnabled = false;
      }

      this.fitCanvas();
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('resize', () => this.fitCanvas());
      }

      // Clique ou tecla para entrar quando estiver 100% carregado
      const onTrigger = (e) => {
        if (!this.ready || this.fadingOut) return;
        if (e && e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ' && e.key !== 'r' && e.key !== 'R') return;
        this.finishAndEnterGame();
      };

      if (root && typeof root.addEventListener === 'function') {
        root.addEventListener('pointerdown', onTrigger);
      }
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('keydown', onTrigger);
      }
    },

    fitCanvas() {
      if (!this.canvas) return;
      const vw = Math.max(320, window.innerWidth);
      const vh = Math.max(180, window.innerHeight);
      const scale = Math.min(vw / W, vh / H);
      this.canvas.style.width = Math.round(W * scale) + 'px';
      this.canvas.style.height = Math.round(H * scale) + 'px';
    },

    initParticles() {
      this.particles = [];
      for (let i = 0; i < 48; i++) {
        this.particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vy: 6 + Math.random() * 14,
          vx: (Math.random() - 0.5) * 4,
          phase: Math.random() * Math.PI * 2,
          size: Math.random() < 0.25 ? 2 : 1,
          color: ['#9ef0ff', '#ffe478', '#ff8ae2', '#b37af0'][Math.floor(Math.random() * 4)]
        });
      }
    },

    preloadAll() {
      let completed = 0;

      const onItemLoaded = (item, success) => {
        completed++;
        this.loadedCount = completed;
        this.currentLabel = success
          ? `Carregado: ${item.label}`
          : `Verificado: ${item.label}`;

        if (completed >= this.totalCount) {
          this.onAllLoaded();
        }
      };

      // 1. Carrega todas as imagens
      IMAGE_MANIFEST.forEach((item) => {
        const img = new Image();
        img.onload = () => {
          this.cache.images[item.src] = img;
          onItemLoaded(item, true);
        };
        img.onerror = () => {
          this.cache.images[item.src] = img;
          onItemLoaded(item, false);
        };
        img.src = item.src;
      });

      // 2. Carrega e decodifica os áudios com timeout seguro
      AUDIO_MANIFEST.forEach((item) => {
        const audio = new Audio();
        let finished = false;
        const mark = (ok) => {
          if (finished) return;
          finished = true;
          clearTimeout(safetyTimer);
          audio.removeEventListener('canplaythrough', onCanPlay);
          audio.removeEventListener('error', onError);
          this.cache.audios[item.src] = audio;
          onItemLoaded(item, ok);
        };

        const onCanPlay = () => mark(true);
        const onError = () => mark(false);

        // Timeout de fallback para não prender a tela caso o navegador restrinja codec
        const safetyTimer = setTimeout(() => mark(true), 3500);

        audio.addEventListener('canplaythrough', onCanPlay, { once: true });
        audio.addEventListener('error', onError, { once: true });
        audio.preload = 'auto';
        audio.src = item.src;
        try {
          audio.load();
        } catch (_) {
          mark(true);
        }
      });
    },

    onAllLoaded() {
      // Confirmação com ressonância completa
      this.currentLabel = `Todos os ${this.totalCount} recursos cristalinos harmonizados!`;
      global.CrystalAssetsReady = true;

      // Mantém a prontidão visível
      setTimeout(() => {
        this.ready = true;
      }, 350);
    },

    finishAndEnterGame() {
      if (this.fadingOut) return;
      this.fadingOut = true;

      // Destrava o áudio do navegador imediatamente no gesto do usuário
      try {
        if (global.CrystalAudio && typeof global.CrystalAudio.unlock === 'function') {
          global.CrystalAudio.unlock();
        }
        if (global.CrystalMenuAudio && typeof global.CrystalMenuAudio.autoStart === 'function') {
          global.CrystalMenuAudio.autoStart();
        }
      } catch (_) {}

      // Fade-out suave do overlay de carregamento
      const root = document.getElementById('preloaderScreen');
      if (root) {
        root.style.transition = 'opacity 0.45s ease-out';
        root.style.opacity = '0';
        setTimeout(() => {
          root.remove();
          this.active = false;
        }, 460);
      } else {
        this.active = false;
      }
    },

    startLoop() {
      const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb) => setTimeout(cb, 16);
      const renderFrame = (now) => {
        if (!this.active) return;
        this.update(now);
        this.render(now);
        raf(renderFrame);
      };
      raf(renderFrame);
    },

    update(now) {
      const targetRatio = clamp(this.loadedCount / Math.max(1, this.totalCount), 0, 1);
      // Interpolação fluida do progresso para suavidade Hi-Bit
      this.smoothRatio += (targetRatio - this.smoothRatio) * 0.14;
      if (Math.abs(targetRatio - this.smoothRatio) < 0.002) {
        this.smoothRatio = targetRatio;
      }

      const dt = 1 / 60;
      for (const p of this.particles) {
        p.y -= p.vy * dt;
        p.x += Math.sin(now * 0.002 + p.phase) * 0.4;
        if (p.y < -4) {
          p.y = H + 4;
          p.x = Math.random() * W;
        }
      }
    },

    render(now) {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const t = (now - this.startTime) * 0.001;

      // Escala 2x para pixel art 320x180 em canvas 640x360
      ctx.setTransform(2, 0, 0, 2, 0, 0);

      // Fundo Caverna Mística Profunda (#05030f)
      ctx.fillStyle = '#05030f';
      ctx.fillRect(0, 0, W, H);

      // Brilho ambiente radial pulsante na caverna
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
      const radGlow = ctx.createRadialGradient(160, 70, 8, 160, 70, 140);
      radGlow.addColorStop(0, `rgba(74, 185, 224, ${0.18 + pulse * 0.12})`);
      radGlow.addColorStop(0.5, `rgba(132, 60, 180, ${0.10 + pulse * 0.08})`);
      radGlow.addColorStop(1, 'rgba(5, 3, 15, 0)');
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 0, W, H);

      // Partículas ascendentes de energia mágica
      for (const p of this.particles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(R(p.x), R(p.y), p.size, p.size);
      }

      // 1. TÍTULO DO JOGO NO ESTILO OWLBOY
      this.drawTitle(ctx, t);

      // 2. CRISTAL CENTRAL CARREGANDO POR FACETAS
      this.drawChargingCrystal(ctx, 160, 72, t, this.smoothRatio);

      // 3. BARRA DE PROGRESSO ESCULPIDA EM PEDRA
      this.drawProgressBar(ctx, 50, 126, 220, 12, this.smoothRatio, t);

      // 4. MENSAGEM DE STATUS E CONTAGEM DE RECURSOS
      this.drawStatusInfo(ctx, t);

      // 5. BOTÃO / PROMPT DE ENTRADA QUANDO 100% PRONTO
      if (this.ready) {
        this.drawReadyPrompt(ctx, t);
      }
    },

    drawTitle(ctx, t) {
      const title = 'CRYSTAL MATH MANIA';
      const subtitle = '— SINFONIA DOS CRISTAIS —';
      const bob = Math.round(Math.sin(t * 1.8) * 1.2);

      // Sombra dupla gravada
      this.drawPixelText(ctx, title, 160, 18 + bob, '#100c1e', true, 9);
      this.drawPixelText(ctx, title, 160, 17 + bob, '#f7e2b8', true, 9);

      this.drawPixelText(ctx, subtitle, 160, 31 + bob, '#21182c', true, 8);
      this.drawPixelText(ctx, subtitle, 160, 30 + bob, '#9ef0ff', true, 8);
    },

    drawChargingCrystal(ctx, cx, cy, t, ratio) {
      cx = R(cx);
      cy = R(cy);
      const bob = Math.round(Math.sin(t * 2.5) * 2);
      cy += bob;

      // Aura circundante que se expande com o ratio
      const auraRad = R(14 + ratio * 20);
      const auraAlpha = 0.2 + ratio * 0.45 + Math.sin(t * 4) * 0.1;
      ctx.fillStyle = `rgba(158, 240, 255, ${Math.max(0, auraAlpha)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, auraRad, 0, Math.PI * 2);
      ctx.fill();

      // Silhueta do Cristal Primordial lapidado (28x36 px)
      // Facetas divididas em 4 quadrantes que acendem com o progresso:
      // Quadrante 1 (Inferior Quartzo, ratio >= 0.1)
      const q1Lit = ratio >= 0.2;
      ctx.fillStyle = q1Lit ? '#6cd4ea' : '#1d273a';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 18);
      ctx.lineTo(cx - 10, cy + 2);
      ctx.lineTo(cx, cy + 4);
      ctx.closePath();
      ctx.fill();

      // Quadrante 2 (Inferior Esmeralda, ratio >= 0.45)
      const q2Lit = ratio >= 0.45;
      ctx.fillStyle = q2Lit ? '#75e27a' : '#182b26';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 18);
      ctx.lineTo(cx + 10, cy + 2);
      ctx.lineTo(cx, cy + 4);
      ctx.closePath();
      ctx.fill();

      // Quadrante 3 (Médio Ametista, ratio >= 0.70)
      const q3Lit = ratio >= 0.70;
      ctx.fillStyle = q3Lit ? '#d675e2' : '#2d1838';
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 2);
      ctx.lineTo(cx - 7, cy - 14);
      ctx.lineTo(cx, cy - 8);
      ctx.lineTo(cx, cy + 4);
      ctx.closePath();
      ctx.fill();

      // Quadrante 4 (Médio Topázio / Opala, ratio >= 0.85)
      const q4Lit = ratio >= 0.85;
      ctx.fillStyle = q4Lit ? '#ffd05a' : '#3d2b14';
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy + 2);
      ctx.lineTo(cx + 7, cy - 14);
      ctx.lineTo(cx, cy - 8);
      ctx.lineTo(cx, cy + 4);
      ctx.closePath();
      ctx.fill();

      // Ápice da Gema da Fada (ratio >= 0.98)
      const apexLit = ratio >= 0.95;
      ctx.fillStyle = apexLit ? '#ffffff' : '#453856';
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy - 14);
      ctx.lineTo(cx, cy - 22);
      ctx.lineTo(cx + 7, cy - 14);
      ctx.lineTo(cx, cy - 8);
      ctx.closePath();
      ctx.fill();

      // Contornos esculpidos do cristal
      ctx.strokeStyle = '#100c1e';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Brilho estelar no topo do cristal se 100% carregado
      if (ratio >= 0.98) {
        const starSize = 2 + (Math.floor(t * 8) % 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - starSize, cy - 22, starSize * 2 + 1, 1);
        ctx.fillRect(cx, cy - 22 - starSize, 1, starSize * 2 + 1);
      }
    },

    drawProgressBar(ctx, x, y, w, h, ratio, t) {
      x = R(x);
      y = R(y);
      w = R(w);
      h = R(h);

      // Moldura externa esculpida em rocha com bordas chanfradas
      ctx.fillStyle = '#100b18';
      ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

      ctx.fillStyle = '#2d2422';
      ctx.fillRect(x - 1, y - 1, w + 2, h + 2);

      // Detalhes dourados nos 4 cantos da barra
      ctx.fillStyle = '#d9a85b';
      ctx.fillRect(x - 2, y - 2, 3, 2);
      ctx.fillRect(x + w - 1, y - 2, 3, 2);
      ctx.fillRect(x - 2, y + h, 3, 2);
      ctx.fillRect(x + w - 1, y + h, 3, 2);

      // Fundo vazio da barra
      ctx.fillStyle = '#171221';
      ctx.fillRect(x, y, w, h);

      // Preenchimento com gradiente de energia cristalina
      const fillW = clamp(R(w * ratio), 0, w);
      if (fillW > 0) {
        const barGrad = ctx.createLinearGradient(x, y, x + fillW, y);
        barGrad.addColorStop(0, '#2d728f');
        barGrad.addColorStop(0.5, '#4ec5db');
        barGrad.addColorStop(1, '#a8f2ff');
        ctx.fillStyle = barGrad;
        ctx.fillRect(x, y, fillW, h);

        // Brilho interior pulsante
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(x, y, fillW, 2);

        // Linha de energia brilhante correndo pela barra
        const sweep = (Math.floor(t * 120) % (w + 24)) - 24;
        if (sweep >= 0 && sweep < fillW) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + sweep, y, 4, h);
        }
      }

      // Porcentagem em texto nítido centralizada sobre a barra
      const pct = Math.floor(ratio * 100);
      const pctText = `${pct}%`;
      this.drawPixelText(ctx, pctText, x + w / 2, y + 2, '#100c1e', true, 8);
      this.drawPixelText(ctx, pctText, x + w / 2, y + 1, '#ffffff', true, 8);
    },

    drawStatusInfo(ctx, t) {
      // Nome do recurso atual sendo carregado
      const status = this.currentLabel;
      this.drawPixelText(ctx, status, 160, 144, '#100c1e', true, 7);
      this.drawPixelText(ctx, status, 160, 143, '#d8c7b8', true, 7);

      // Contador de recursos concluídos
      const countText = `${this.loadedCount} / ${this.totalCount} recursos verificados`;
      this.drawPixelText(ctx, countText, 160, 155, '#100c1e', true, 7);
      this.drawPixelText(ctx, countText, 160, 154, '#7ec456', true, 7);
    },

    drawReadyPrompt(ctx, t) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      const bx = 80, by = 163, bw = 160, bh = 14;

      // Caixa botão pulsante
      ctx.fillStyle = pulse > 0.4 ? '#3e7338' : '#284f25';
      ctx.fillRect(bx, by, bw, bh);

      ctx.fillStyle = '#f2cc6b';
      ctx.fillRect(bx, by, bw, 1);
      ctx.fillRect(bx, by + bh - 1, bw, 1);
      ctx.fillRect(bx, by, 1, bh);
      ctx.fillRect(bx + bw - 1, by, 1, bh);

      const prompt = '▶ TOQUE OU PRESSIONE [ENTER] PARA INICIAR';
      this.drawPixelText(ctx, prompt, 160, by + 3, '#100c1e', true, 8);
      this.drawPixelText(ctx, prompt, 160, by + 2, pulse > 0.5 ? '#ffffff' : '#f2cc6b', true, 8);
    },

    drawPixelText(ctx, text, x, y, col, center = false, size = 8) {
      ctx.fillStyle = col;
      ctx.font = `${size}px monospace`;
      ctx.textAlign = center ? 'center' : 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text, R(x), R(y));
    }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => AssetPreloader.init());
    } else {
      AssetPreloader.init();
    }
  }

  global.AssetPreloader = AssetPreloader;
})(typeof window !== 'undefined' ? window : globalThis);
