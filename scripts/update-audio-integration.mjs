import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// 1. Atualizar js/preloader.js com todos os 17 assets ativos (8 PNGs + 9 MP3s)
const preloaderPath = path.join(ROOT, 'js', 'preloader.js');
let preloaderCode = fs.readFileSync(preloaderPath, 'utf8');

const targetPreloaderManifest = `  const AUDIO_MANIFEST = [
    { id: 'musica_menu', src: 'assets/audio/musica-menu.mp3', label: 'Sinfonia do Santuário' },
    { id: 'era_uma_vez_caverna', src: 'assets/audio/era-uma-vez-caverna.mp3', label: 'A Canção da Ordem' },
    { id: 'o_que_um_cristal_pode_fazer', src: 'assets/audio/o-que-um-cristal-pode-fazer.mp3', label: 'Apresentação Final' },
    { id: 'musica_floresta_fases', src: 'assets/audio/musica-floresta-fases.mp3', label: 'Floresta: Sussurros da Mata' },
    { id: 'musica_floresta_especial', src: 'assets/audio/musica-floresta-especial.mp3', label: 'Floresta: O Despertar da Esmeralda' },
    { id: 'musica_rio_fases', src: 'assets/audio/musica-rio-fases.mp3', label: 'Rio: Correnteza Turquesa' },
    { id: 'musica_rio_especial', src: 'assets/audio/musica-rio-especial.mp3', label: 'Rio: A Dança das Cascatas' },
    { id: 'musica_caatinga_fases', src: 'assets/audio/musica-caatinga-fases.mp3', label: 'Caatinga: Sol Sobre o Arenito' },
    { id: 'musica_caatinga_especial', src: 'assets/audio/musica-caatinga-especial.mp3', label: 'Caatinga: O Baião da Opala de Fogo' }
  ];`;

const audioManifestRegex = /const AUDIO_MANIFEST = \[[\s\S]*?\];/;
preloaderCode = preloaderCode.replace(audioManifestRegex, targetPreloaderManifest.trim());
fs.writeFileSync(preloaderPath, preloaderCode, 'utf8');
console.log('✔ js/preloader.js atualizado com os 17 assets (8 PNGs + 9 MP3s)!');

function replaceWithLineEndings(content, oldText, newText) {
  const crlfNew = newText.replace(/\r?\n/g, '\r\n');
  const lfNew = newText.replace(/\r?\n/g, '\n');
  if (content.includes(crlfNew) || content.includes(lfNew)) return content;
  const crlfOld = oldText.replace(/\r?\n/g, '\r\n');
  if (content.includes(crlfOld)) return content.replace(crlfOld, crlfNew);
  const lfOld = oldText.replace(/\r?\n/g, '\n');
  if (content.includes(lfOld)) return content.replace(lfOld, lfNew);
  return content;
}

// 2. Atualizar js/true-pixel-worlds.js
const worldsPath = path.join(ROOT, 'js', 'true-pixel-worlds.js');
let worldsCode = fs.readFileSync(worldsPath, 'utf8');

// Adiciona métodos de áudio no TruePixelWorlds
const oldAudioHooks = `      GameHUD.onMuteChange = (muted, effMus) => {
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
      };`;

const newAudioHooks = `      GameHUD.onMuteChange = (muted, effMus) => {
        const vol = effMus !== undefined ? effMus : (muted ? 0 : GameHUD.musicVol / 100);
        const inMusical = this.phase === 'musical_part1_shadows' || this.phase === 'musical_part2_bright';
        if (this.musicAudio) {
          this.musicAudio.muted = !!muted || vol <= 0;
          this.musicAudio.volume = vol;
          if (inMusical) {
            if (muted || vol <= 0 || GameHUD.paused || GameHUD.settingsOpen) {
              try { this.musicAudio.pause(); } catch (_) {}
            } else if (this.musicAudio.paused && this.musicalTime < 65.0) {
              try { this.musicAudio.play().catch(() => {}); } catch (_) {}
            }
          }
        }
        if (this.regularAudio) {
          this.regularAudio.muted = !!muted || vol <= 0;
          this.regularAudio.volume = vol;
          if (!inMusical) {
            if (muted || vol <= 0 || GameHUD.paused || GameHUD.settingsOpen) {
              try { this.regularAudio.pause(); } catch (_) {}
            } else if (this.regularAudio.paused && this.running && this.phase !== 'map_active') {
              try { this.regularAudio.play().catch(() => {}); } catch (_) {}
            }
          }
        }
      };`;

worldsCode = replaceWithLineEndings(worldsCode, oldAudioHooks, newAudioHooks);

// Atualizar startMusicalShow e adicionar métodos de BGM
const oldMusicalShow = `    startMusicalShow() {
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
    },`;

const newMusicalShow = `    getRegularBgmSrc() {
      if (this.worldKey === 'forest') return 'assets/audio/musica-floresta-fases.mp3';
      if (this.worldKey === 'river') return 'assets/audio/musica-rio-fases.mp3';
      if (this.worldKey === 'caatinga') return 'assets/audio/musica-caatinga-fases.mp3';
      return null;
    },

    getSpecialBgmSrc() {
      if (this.worldKey === 'forest') return 'assets/audio/musica-floresta-especial.mp3';
      if (this.worldKey === 'river') return 'assets/audio/musica-rio-especial.mp3';
      if (this.worldKey === 'caatinga') return 'assets/audio/musica-caatinga-especial.mp3';
      return 'assets/audio/o-que-um-cristal-pode-fazer.mp3';
    },

    playRegularBgm() {
      const src = this.getRegularBgmSrc();
      if (!src) return;
      try {
        global.CrystalMenuAudio?.pause?.();
        if (!this.regularAudio || this.regularAudio._src !== src) {
          if (this.regularAudio) {
            try { this.regularAudio.pause(); } catch (_) {}
          }
          this.regularAudio = new Audio(src);
          this.regularAudio._src = src;
          this.regularAudio.loop = true;
          this.regularAudio.preload = 'auto';
        }
        const effMus = GameHUD.muted ? 0 : clamp(GameHUD.musicVol / 100, 0, 1);
        this.regularAudio.muted = GameHUD.muted || effMus <= 0;
        this.regularAudio.volume = effMus;
        if (!GameHUD.muted && GameHUD.musicVol > 0 && this.regularAudio.paused) {
          this.regularAudio.play().catch(() => {});
        }
      } catch (_) {}
    },

    stopRegularBgm() {
      if (this.regularAudio) {
        try { this.regularAudio.pause(); } catch (_) {}
      }
    },

    startMusicalShow() {
      this.stopRegularBgm();
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
        const specSrc = this.getSpecialBgmSrc();
        if (!this.musicAudio || this.musicAudio._src !== specSrc) {
          if (this.musicAudio) {
            try { this.musicAudio.pause(); } catch (_) {}
          }
          this.musicAudio = new Audio(specSrc);
          this.musicAudio._src = specSrc;
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
      this.stopRegularBgm();
    },`;

worldsCode = replaceWithLineEndings(worldsCode, oldMusicalShow, newMusicalShow);

// Iniciar regular BGM em startWorldLevel
const oldStartWorld = `      IrisTransition.start('in', 44, 126, 0.65);

      if (!this.running) {`;

const newStartWorld = `      IrisTransition.start('in', 44, 126, 0.65);
      if (this.currentLevel < maxLvl) {
        this.playRegularBgm();
      }

      if (!this.running) {`;

worldsCode = replaceWithLineEndings(worldsCode, oldStartWorld, newStartWorld);

fs.writeFileSync(worldsPath, worldsCode, 'utf8');
console.log('✔ js/true-pixel-worlds.js atualizado com reprodução de BGM regular e especial por bioma!');

// 3. Salvar metadados em data/biome-music-production.json
const dataDir = path.join(ROOT, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const musicProductionManifest = {
  updatedAt: new Date().toISOString(),
  engine: 'Crystal Math Mania — High-Fidelity Multi-Track Procedural Synthesizer & LAME MP3 (192 kbps)',
  tracks: [
    {
      id: 'forest_regular',
      fileName: 'musica-floresta-fases.mp3',
      title: 'Sussurros da Mata Ancestral (Floresta - Fases Normais)',
      biome: 'forest',
      kind: 'regular',
      levels: [6, 7, 8, 9],
      durationSec: 53.3,
      bpm: 90,
      key: 'E minor / G major',
      instruments: ['Emerald Celtic Harp', 'Native Wooden Flute', 'Nylon Acoustic Guitar', 'Crystal Lithophone', 'Chamber Cello & Viola', 'Organic Seed Shaker']
    },
    {
      id: 'forest_special',
      fileName: 'musica-floresta-especial.mp3',
      title: 'O Despertar da Esmeralda (Floresta - Fase 10 Especial / Araci)',
      biome: 'forest',
      kind: 'special',
      levels: [10],
      durationSec: 57.1,
      bpm: 126,
      key: 'E major / A major',
      instruments: ['Forest Drums & Log Drums', 'Accelerated Maracas', 'Dual Pan Flutes', 'Emerald Bell Chimes', 'Spiccato Strings & Horns', 'Percussive Rhythm Guitar']
    },
    {
      id: 'river_regular',
      fileName: 'musica-rio-fases.mp3',
      title: 'Correnteza Turquesa (Rio - Fases Normais)',
      biome: 'river',
      kind: 'regular',
      levels: [11, 12, 13, 14],
      durationSec: 54.5,
      bpm: 88,
      key: 'C major / F Lydian',
      instruments: ['Water Cascading Harp', 'Clear Acoustic Piano', 'Silver Transverse Flute', 'Water Celesta & Glass Bells', 'Warm Legato Strings', 'Water Droplet Percussion']
    },
    {
      id: 'river_special',
      fileName: 'musica-rio-especial.mp3',
      title: 'A Dança das Cascatas (Rio - Fase 15 Especial / Irecê)',
      biome: 'river',
      kind: 'special',
      levels: [15],
      durationSec: 58.1,
      bpm: 124,
      key: 'D major (Pentatonic Sound Crystals)',
      instruments: ['Paraíba Tourmaline Chimes', 'Aquatic Marimba', 'Virtuosic Silver Flute', 'Water Drums & Log Percussion', 'Acoustic Steel Guitar', 'Dynamic Strings']
    },
    {
      id: 'caatinga_regular',
      fileName: 'musica-caatinga-fases.mp3',
      title: 'Sol Sobre o Arenito (Caatinga - Fases Normais)',
      biome: 'caatinga',
      kind: 'regular',
      levels: [16, 17, 18, 19],
      durationSec: 51.1,
      bpm: 94,
      key: 'D Mixolydian',
      instruments: ['Viola Caipira / 12-String Guitar', 'Rabeca Sertaneja (Rustic Fiddle)', 'Sandstone Lithophone', 'Cabaça Shaker & Dry Seeds', 'Acoustic Upright Bass', 'Warm Desert Wind Chiff']
    },
    {
      id: 'caatinga_special',
      fileName: 'musica-caatinga-especial.mp3',
      title: 'O Baião da Opala de Fogo (Caatinga - Fase 20 Especial / Jurema)',
      biome: 'caatinga',
      kind: 'special',
      levels: [20],
      durationSec: 57.3,
      bpm: 134,
      key: 'A major / E Mixolydian (Traditional Fast Baião)',
      instruments: ['Traditional Zabumba', 'Crystal Triangle', 'Virtuosic Solo Rabeca', 'Brazilian Sanfona (Accordion)', '7-String Guitar & Cavaquinho', 'Fire Opal Chimes']
    }
  ]
};

fs.writeFileSync(
  path.join(dataDir, 'biome-music-production.json'),
  JSON.stringify(musicProductionManifest, null, 2),
  'utf8'
);
console.log('✔ data/biome-music-production.json criado com sucesso!');
