// =========================================================
// 1. MOTOR DE ÁUDIO CRISTALINO (Sinfonia dos Cristais)
// =========================================================
class CrystalSymphonyAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.75;
    // Escala pentatônica brilhante para os 10 cristais da caverna
    this.crystalScale = [
      523.25, // C5
      587.33, // D5
      659.25, // E5
      783.99, // G5
      880.00, // A5
      1046.50, // C6
      1174.66, // D6
      1318.51, // E6
      1567.98, // G6
      1760.00  // A6
    ];
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Toca uma nota de cristal com harmônicos brilhantes (estilo harpa de vidro/xilofone)
  playCrystalNote(noteIndex = 0) {
    if (!this.enabled) return;
    this.init();

    const baseFreq = this.crystalScale[noteIndex % this.crystalScale.length];
    const now = this.ctx.currentTime;

    // Oscilador principal + harmônico de oitava acima para brilho de cristal
    [1, 2].forEach((multiplier, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq * multiplier, now);

      const amp = (idx === 0 ? 0.25 : 0.08) * this.volume;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(amp, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.65);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.66);
    });
  }

  // Som sutil de hover nos botões
  playHover() {
    if (!this.enabled) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.07); // E6

    gain.gain.setValueAtTime(0.1 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Som de gota / ondulação na água
  playWaterRipple() {
    if (!this.enabled) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.14);

    gain.gain.setValueAtTime(0.09 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Acorde mágico ao clicar nos botões ou na Borboleta do Portal
  playChord(type = 'default') {
    if (!this.enabled) return;
    this.init();

    const notes = type === 'play'
      ? [523.25, 659.25, 783.99, 1046.50, 1318.51] // Arpejo triunfante (Jogar)
      : type === 'butterfly'
      ? [659.25, 783.99, 987.77, 1318.51, 1567.98] // Acorde místico da borboleta
      : [587.33, 880.00, 1174.66];                 // Clique de menu

    notes.forEach((freq, index) => {
      const now = this.ctx.currentTime + index * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.2 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.42);
    });
  }
}

const sfx = new CrystalSymphonyAudio();

// =========================================================
// 2. RECORTE MATEMÁTICO DE SPRITES (Botões e Título da Arte)
// =========================================================
/**
 * Posiciona um elemento e alinha a imagem menu_bg.jpg interna exatamente
 * com a coordenada correspondente para que ele funcione como um sprite recortado.
 */
function applySpriteSlice(element, leftPct, topPct, widthPct, heightPct) {
  element.style.left = `${leftPct}%`;
  element.style.top = `${topPct}%`;
  element.style.width = `${widthPct}%`;
  element.style.height = `${heightPct}%`;

  const bgWidth = (100 / widthPct) * 100;
  const bgHeight = (100 / heightPct) * 100;
  const bgPosX = (leftPct / (100 - widthPct)) * 100;
  const bgPosY = (topPct / (100 - heightPct)) * 100;

  element.style.backgroundSize = `${bgWidth}% ${bgHeight}%`;
  element.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;
}

// =========================================================
// 3. PARTÍCULAS SAINDO DIRETAMENTE DOS CRISTAIS REAIS
// =========================================================
function spawnParticleFromCrystal(crystalNodes, container) {
  if (!crystalNodes.length) return;
  const randomCrystal = crystalNodes[Math.floor(Math.random() * crystalNodes.length)];

  const left = parseFloat(randomCrystal.style.left);
  const top = parseFloat(randomCrystal.style.top);
  const width = parseFloat(randomCrystal.style.width);
  const height = parseFloat(randomCrystal.style.height);
  const color = randomCrystal.dataset.color || '#00f2fe';

  const spark = document.createElement('span');
  spark.className = 'crystal-spark';

  // Nasce exatamente dentro da área do cristal escolhido
  const spawnX = left + Math.random() * width;
  const spawnY = top + Math.random() * (height * 0.7);
  const size = Math.random() * 5 + 4;

  spark.style.width = `${size}px`;
  spark.style.height = `${size}px`;
  spark.style.left = `${spawnX}%`;
  spark.style.top = `${spawnY}%`;
  spark.style.background = color;
  spark.style.boxShadow = `0 0 8px ${color}, 0 0 14px #ffffff`;
  spark.style.animationDuration = `${Math.random() * 1.8 + 1.6}s`;

  container.appendChild(spark);
  setTimeout(() => spark.remove(), 3500);
}

// Explosão de fragmentos de cristal onde o jogador clica
function createShardBurst(xPx, yPx, color = '#00f2fe', gameContainer) {
  for (let i = 0; i < 8; i++) {
    const shard = document.createElement('span');
    shard.className = 'burst-shard';

    const angle = (Math.PI * 2 * i) / 8 + (Math.random() * 0.4 - 0.2);
    const distance = Math.random() * 45 + 20;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    shard.style.left = `${xPx}px`;
    shard.style.top = `${yPx}px`;
    shard.style.background = color;
    shard.style.boxShadow = `0 0 8px ${color}`;
    shard.style.setProperty('--tx', `${tx}px`);
    shard.style.setProperty('--ty', `${ty}px`);

    gameContainer.appendChild(shard);
    setTimeout(() => shard.remove(), 650);
  }
}

// =========================================================
// 4. INICIALIZAÇÃO GERAL DO MENU INTERATIVO
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
  const gameContainer = document.getElementById('game-container');
  const particlesContainer = document.getElementById('particles-container');
  const customCursor = document.getElementById('custom-cursor');

  const titleSprite = document.getElementById('title-sprite');
  const btnJogar = document.getElementById('btn-jogar');
  const btnOpcoes = document.getElementById('btn-opcoes');
  const btnCreditos = document.getElementById('btn-creditos');

  // 1. Aplica o recorte exato dos sprites sobre a imagem original
  applySpriteSlice(titleSprite, 3.2, 4.2, 40.2, 30.2);
  applySpriteSlice(btnJogar,    7.4, 39.8, 16.5, 8.2);
  applySpriteSlice(btnOpcoes,   7.4, 49.8, 19.0, 8.4);
  applySpriteSlice(btnCreditos, 7.4, 60.0, 20.4, 8.4);

  // 2. Emissão contínua de brilhos saindo diretamente dos cristais mapeados
  const crystalNodes = Array.from(document.querySelectorAll('.crystal-node, #portal-butterfly'));
  setInterval(() => {
    spawnParticleFromCrystal(crystalNodes, particlesContainer);
  }, 220);

  // 3. Movimento do Cursor Customizado + Rastro de Poeira de Cristal
  let lastTrailTime = 0;
  gameContainer.addEventListener('mousemove', (e) => {
    const rect = gameContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    customCursor.style.left = `${x}px`;
    customCursor.style.top = `${y}px`;

    const now = performance.now();
    if (now - lastTrailTime > 35) {
      lastTrailTime = now;
      const trail = document.createElement('span');
      trail.className = 'cursor-trail';
      trail.style.left = `${x + 4}px`;
      trail.style.top = `${y + 4}px`;
      trail.style.background = Math.random() > 0.5 ? '#00f2fe' : '#ff2a85';
      trail.style.boxShadow = `0 0 6px ${trail.style.background}`;
      gameContainer.appendChild(trail);
      setTimeout(() => trail.remove(), 500);
    }
  });

  gameContainer.addEventListener('mousedown', () => {
    customCursor.classList.add('cursor-click');
  });
  window.addEventListener('mouseup', () => {
    customCursor.classList.remove('cursor-click');
  });

  // Muda o estado do cursor ao passar em elementos interativos
  const interactiveElements = document.querySelectorAll(
    '.menu-btn, .crystal-node, #portal-butterfly, #title-sprite, .close-modal-btn, .control-row'
  );
  interactiveElements.forEach((el) => {
    el.addEventListener('mouseenter', () => customCursor.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => customCursor.classList.remove('cursor-hover'));
  });

  // 4. Interação com os Cristais da Caverna (Sinfonia Musical)
  document.querySelectorAll('.crystal-node').forEach((crystal) => {
    crystal.addEventListener('mouseenter', () => {
      // Toque suave ao passar o mouse
      sfx.playHover();
    });

    crystal.addEventListener('click', (e) => {
      const noteIdx = Number(crystal.dataset.note || 0);
      const color = crystal.dataset.color || '#00f2fe';
      sfx.playCrystalNote(noteIdx);

      crystal.classList.add('crystal-active');
      setTimeout(() => crystal.classList.remove('crystal-active'), 350);

      const rect = gameContainer.getBoundingClientRect();
      createShardBurst(e.clientX - rect.left, e.clientY - rect.top, color, gameContainer);
    });
  });

  // 5. Interação com a Borboleta do Portal
  const butterfly = document.getElementById('portal-butterfly');
  butterfly.addEventListener('click', (e) => {
    sfx.playChord('butterfly');
    const rect = gameContainer.getBoundingClientRect();
    createShardBurst(e.clientX - rect.left, e.clientY - rect.top, '#ffd740', gameContainer);
  });

  // 6. Interação com o Título "Crystal Math Mania"
  titleSprite.addEventListener('click', (e) => {
    sfx.playChord('butterfly');
    titleSprite.classList.remove('title-pulse');
    void titleSprite.offsetWidth; // Reinicia animação
    titleSprite.classList.add('title-pulse');

    const rect = gameContainer.getBoundingClientRect();
    createShardBurst(e.clientX - rect.left, e.clientY - rect.top, '#00f2fe', gameContainer);
  });

  // 7. Interação com a Água Reflexiva (Ondulações)
  const waterZone = document.getElementById('water-zone');
  let lastRipple = 0;
  waterZone.addEventListener('mousemove', (e) => {
    const now = performance.now();
    if (now - lastRipple > 180) {
      lastRipple = now;
      const rect = gameContainer.getBoundingClientRect();
      createWaterRipple(e.clientX - rect.left, e.clientY - rect.top);
    }
  });

  waterZone.addEventListener('click', (e) => {
    sfx.playWaterRipple();
    const rect = gameContainer.getBoundingClientRect();
    createWaterRipple(e.clientX - rect.left, e.clientY - rect.top);
  });

  function createWaterRipple(x, y) {
    const ripple = document.createElement('span');
    ripple.className = 'water-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    gameContainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 1100);
  }

  // 8. Ações dos Botões do Menu
  const modalOpcoes = document.getElementById('modal-opcoes');
  const modalCreditos = document.getElementById('modal-creditos');
  const transitionScreen = document.getElementById('transition-screen');

  document.querySelectorAll('.menu-btn, .close-modal-btn').forEach((btn) => {
    btn.addEventListener('mouseenter', () => sfx.playHover());
  });

  btnJogar.addEventListener('click', (e) => {
    sfx.playChord('play');
    const rect = gameContainer.getBoundingClientRect();
    createShardBurst(e.clientX - rect.left, e.clientY - rect.top, '#90ff40', gameContainer);
    transitionScreen.classList.remove('hidden');

    setTimeout(() => {
      transitionScreen.classList.add('hidden');
    }, 2400);
  });

  btnOpcoes.addEventListener('click', (e) => {
    sfx.playChord();
    const rect = gameContainer.getBoundingClientRect();
    createShardBurst(e.clientX - rect.left, e.clientY - rect.top, '#64c3ff', gameContainer);
    modalOpcoes.classList.remove('hidden');
  });

  btnCreditos.addEventListener('click', (e) => {
    sfx.playChord();
    const rect = gameContainer.getBoundingClientRect();
    createShardBurst(e.clientX - rect.left, e.clientY - rect.top, '#ff5082', gameContainer);
    modalCreditos.classList.remove('hidden');
  });

  document.querySelectorAll('.close-modal-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      sfx.playChord();
      const targetId = btn.getAttribute('data-close');
      document.getElementById(targetId).classList.add('hidden');
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modalOpcoes.classList.add('hidden');
      modalCreditos.classList.add('hidden');
    }
  });

  // Controles de Opções
  document.getElementById('toggle-sfx').addEventListener('change', (e) => {
    sfx.enabled = e.target.checked;
  });

  document.getElementById('slider-volume').addEventListener('input', (e) => {
    sfx.volume = Number(e.target.value) / 100;
  });

  document.getElementById('toggle-debug').addEventListener('change', (e) => {
    gameContainer.classList.toggle('debug-mode', e.target.checked);
  });
});