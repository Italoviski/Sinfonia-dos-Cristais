// =========================================================
// 1. SINTETIZADOR DE ÁUDIO (Web Audio API)
// =========================================================
class CrystalAudioEngine {
  constructor() {
    this.ctx = null;
    // Escala de 14 notas cristalinas para os 14 cristais da caverna
    this.crystalNotes = [
      392.00,  // G4
      440.00,  // A4
      493.88,  // B4
      523.25,  // C5
      587.33,  // D5
      659.25,  // E5
      739.99,  // F#5
      783.99,  // G5
      880.00,  // A5
      987.77,  // B5
      1046.50, // C6
      1174.66, // D6
      1318.51, // E6
      1567.98  // G6
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

  // Som puro de cristal ao clicar num cristal do cenário
  playCrystal(index) {
    this.init();
    const freq = this.crystalNotes[index % this.crystalNotes.length];
    const now = this.ctx.currentTime;

    [1, 2].forEach((mult, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq * mult, now);

      const peak = i === 0 ? 0.22 : 0.07;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.55);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.56);
    });
  }

  // Sons exclusivos para cada uma das 3 palavras do título
  playTitleWord(word) {
    this.init();
    const chords = {
      sinfonia: [523.25, 659.25, 783.99, 1046.50], // Arpejo Ciano
      dos:      [587.33, 880.00],                  // Dupla nota curta
      cristais: [659.25, 830.61, 987.77, 1318.51]  // Arpejo Rosa
    };

    const notes = chords[word] || chords.dos;
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    });
  }
}

const audio = new CrystalAudioEngine();

// =========================================================
// 2. ALINHAMENTO MATEMÁTICO DAS 3 PALAVRAS DO TÍTULO
// =========================================================
function setupTitleWordSlice(buttonEl, leftPct, topPct, widthPct, heightPct) {
  buttonEl.style.left = `${leftPct}%`;
  buttonEl.style.top = `${topPct}%`;
  buttonEl.style.width = `${widthPct}%`;
  buttonEl.style.height = `${heightPct}%`;

  const sprite = buttonEl.querySelector('.word-sprite');
  const bgWidth = (100 / widthPct) * 100;
  const bgHeight = (100 / heightPct) * 100;
  const bgPosX = (leftPct / (100 - widthPct)) * 100;
  const bgPosY = (topPct / (100 - heightPct)) * 100;

  sprite.style.backgroundSize = `${bgWidth}% ${bgHeight}%`;
  sprite.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;
}

// =========================================================
// 3. INICIALIZAÇÃO DOS EVENTOS
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
  const gameContainer = document.getElementById('game-container');

  // Coordenadas exatas de cada palavra na imagem 1000073521.jpg
  const wordSinfonia = document.getElementById('word-sinfonia');
  const wordDos = document.getElementById('word-dos');
  const wordCristais = document.getElementById('word-cristais');

  setupTitleWordSlice(wordSinfonia, 8.0,  11.5, 28.9, 14.0);
  setupTitleWordSlice(wordDos,      5.0,  26.2, 10.8, 11.6);
  setupTitleWordSlice(wordCristais, 17.1, 25.8, 22.9, 12.0);

  // Clique individual em "Sinfonia", "dos" e "Cristais"
  const titleWords = [
    { el: wordSinfonia, key: 'sinfonia' },
    { el: wordDos,      key: 'dos' },
    { el: wordCristais, key: 'cristais' }
  ];

  titleWords.forEach(({ el, key }) => {
    el.addEventListener('click', () => {
      audio.playTitleWord(key);

      el.classList.remove('is-jumping');
      void el.offsetWidth;
      el.classList.add('is-jumping');
    });

    el.addEventListener('animationend', () => {
      el.classList.remove('is-jumping');
    });
  });

  // Clique nos 14 cristais da caverna (fora da porta)
  document.querySelectorAll('.crystal-hitbox').forEach((crystal) => {
    crystal.addEventListener('click', () => {
      const noteIndex = Number(crystal.dataset.note || 0);
      audio.playCrystal(noteIndex);

      crystal.classList.remove('crystal-ringing');
      void crystal.offsetWidth;
      crystal.classList.add('crystal-ringing');

      setTimeout(() => {
        crystal.classList.remove('crystal-ringing');
      }, 260);
    });
  });

  // Botão 🔧 no ecrã (e tecla 'D' no PC) para mostrar/esconder áreas de clique
  const btnDebugMobile = document.getElementById('btn-debug-mobile');
  btnDebugMobile.addEventListener('click', () => {
    gameContainer.classList.toggle('debug-mode');
  });

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'd') {
      gameContainer.classList.toggle('debug-mode');
    }
  });
});
