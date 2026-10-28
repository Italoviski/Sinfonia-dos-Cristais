(() => {
  'use strict';
  // True Pixel Art Rhythmic Boss Minigame (osu!-style approach rings & crystalline melody)
  const lead = 1.25;
  const defaultTrack = typeof Audio !== 'undefined' ? new Audio('assets/audio/o-que-um-cristal-pode-fazer.mp3') : null;
  const caveTrack = typeof Audio !== 'undefined' ? new Audio('assets/audio/era-uma-vez-caverna.mp3?v=13') : null;
  if (defaultTrack) defaultTrack.preload = 'auto';
  if (caveTrack) caveTrack.preload = 'auto';
  let track = defaultTrack;

  const host = document.createElement('section');
  host.className = 'rhythm-stage';
  host.hidden = true;
  host.setAttribute('aria-label', 'Desafio musical');
  document.body.append(host);

  let context, gain, active = false, paused = false;
  let notes = [], frameId, callback, options = {};
  let serial = 0, points = 0, hits = 0, total = 0, targetTotal = 10;
  let session = 0, startTime = 0, scheduledIndices = new Set();
  const layout = [[0.25, 0.35], [0.65, 0.38], [0.42, 0.68], [0.75, 0.68], [0.5, 0.28], [0.22, 0.68], [0.72, 0.32], [0.35, 0.45]];

  // Melodic timestamp beats relative to sequence start (seconds)
  const BEAT_OFFSETS = [1.0, 2.2, 3.4, 4.6, 5.8, 7.0, 8.2, 9.4, 10.6, 11.8];

  function initContext() {
    if (context) return context;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    context = new C();
    gain = context.createGain();
    gain.connect(context.destination);
    return context;
  }

  function message(text) {
    const el = host.querySelector('.rhythm-judgment');
    if (el) el.textContent = text;
  }

  function display() {
    const scoreEl = host.querySelector('.rhythm-score');
    if (scoreEl) scoreEl.textContent = `${points} pontos · ${hits}/${targetTotal} acertos`;
    const fraction = targetTotal ? Math.min(1, Math.max(0, (serial - (notes.length ? 1 : 0)) / targetTotal)) : 0;
    const prog = host.querySelector('progress');
    if (prog) prog.value = fraction;
    options.onProgress?.(fraction);
  }

  function target(time, practice = false) {
    const id = serial++;
    const el = document.createElement('button');
    el.className = 'rhythm-target' + (practice ? ' practice-target' : '');
    el.setAttribute('aria-label', practice ? 'Cristal de treino. Toque para iniciar a música.' : `Cristal musical ${id}. Clique no círculo ou pressione Espaço.`);
    const p = layout[id % layout.length];
    el.style.left = (p[0] * 100) + '%';
    el.style.top = (p[1] * 100) + '%';
    el.innerHTML = '<span class="rhythm-base"></span><span class="rhythm-gem"></span><span class="rhythm-approach"></span>';

    const gem = el.querySelector('.rhythm-gem');
    const types = options.gems?.length ? options.gems : ['quartz', 'opal'];
    const sprite = { quartz: 0, opal: 3, aqua: 4, citrine: 2, emerald: 5 }[types[id % types.length]] ?? 0;
    gem.style.backgroundPosition = `${(sprite % 3) * 50}% ${Math.floor(sprite / 3) * 50}%`;

    const note = { el, time, practice, ring: el.querySelector('.rhythm-approach'), hitDone: false };
    el.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); hit(note); };
    el.onclick = e => { if (e.detail === 0) hit(note); };
    notes.push(note);
    host.append(el);
    if (!practice) {
      total++;
      display();
    }
    return note;
  }

  function remove(note) {
    note.el.remove();
    notes = notes.filter(n => n !== note);
  }

  function burst(note, value) {
    const fx = document.createElement('div');
    fx.className = 'rhythm-hit';
    fx.style.left = note.el.style.left;
    fx.style.top = note.el.style.top;
    fx.setAttribute('aria-hidden', 'true');

    const label = document.createElement('strong');
    label.textContent = value === 100 ? 'PERFEITO!' : value === 70 ? 'ÓTIMO!' : value >= 50 ? 'OK!' : 'BOM!';
    fx.append(label);

    for (let i = 0; i < 12; i++) {
      const shard = document.createElement('i'), angle = i * Math.PI / 6;
      shard.style.setProperty('--dx', (Math.cos(angle) * 85) + 'px');
      shard.style.setProperty('--dy', (Math.sin(angle) * 85) + 'px');
      shard.style.setProperty('--turn', (i * 67) + 'deg');
      fx.append(shard);
    }
    host.append(fx);
    setTimeout(() => fx.remove(), 850);
  }

  function hit(note) {
    if (!active || paused || note.hitDone || !notes.includes(note)) return;
    note.hitDone = true;
    const now = context ? context.currentTime : (performance.now() / 1000);
    const delta = Math.abs(now - note.time);
    const win = options.assist ? 0.6 : 0.35;

    if (note.practice) {
      burst(note, 100);
      window.CrystalAudio?.reward?.(1);
      remove(note);
      message('Perfeito! Acompanhe o ritmo dos cristais.');
      startSongSequence();
      return;
    }

    const value = delta <= (options.assist ? 0.22 : 0.12) ? 100 : delta <= (options.assist ? 0.40 : 0.24) ? 70 : delta <= win ? 50 : 30;
    points += value;
    hits++;
    burst(note, value);
    window.CrystalAudio?.reward?.(1);
    message(value === 100 ? 'Perfeito! ✦✦✦' : value === 70 ? 'Ótimo! ✦✦' : value === 50 ? 'OK! ✦' : 'Bom!');
    remove(note);
    display();

    if (serial >= targetTotal && notes.length === 0) {
      setTimeout(() => finish(), 400);
    }
  }

  async function startSongSequence() {
    startTime = context ? context.currentTime : (performance.now() / 1000);
    scheduledIndices.clear();
    serial = 0;
    points = 0;
    hits = 0;
    total = 0;
    targetTotal = BEAT_OFFSETS.length;
    display();

    if (track) {
      try {
        track.currentTime = 0;
        await track.play();
      } catch {
        // Fallback: visual and synth cues continue even if external audio is blocked
      }
    }
  }

  function finish() {
    if (!active) return;
    const possible = targetTotal * 100;
    const stars = hits >= Math.floor(targetTotal * 0.7) ? 3 : hits >= Math.floor(targetTotal * 0.4) ? 2 : 1;
    const result = {
      points: Math.max(points, hits * 100),
      possible,
      hits,
      total: targetTotal,
      stars: Math.max(1, Math.min(3, stars))
    };
    const done = callback;
    stop();
    done?.(result);
  }

  function frame() {
    if (!active) return;
    if (!paused) {
      const now = context ? context.currentTime : (performance.now() / 1000);

      // Schedule upcoming melodic notes based on BEAT_OFFSETS
      if (startTime > 0) {
        const elapsed = now - startTime;
        for (let i = 0; i < BEAT_OFFSETS.length; i++) {
          if (!scheduledIndices.has(i) && elapsed >= BEAT_OFFSETS[i] - lead) {
            scheduledIndices.add(i);
            target(startTime + BEAT_OFFSETS[i], false);
          }
        }
      }

      // Update rings and auto-retire expired notes
      for (const note of [...notes]) {
        const left = note.time - now;
        note.ring.style.transform = `scale(${1 + Math.max(0, left) / lead * 1.8})`;
        note.ring.style.opacity = left < -0.28 ? '0.25' : '1';

        if (note.practice) {
          if (left <= 0 && !note.ready) {
            note.ready = true;
            note.el.classList.add('practice-ready');
            message('Toque no cristal ou pressione Espaço para começar.');
          }
          continue;
        }

        // Expired target note
        if (left < (options.assist ? -0.5 : -0.32)) {
          remove(note);
          if (!options.assist) {
            message('Passou a nota!');
          }
          display();
          if (scheduledIndices.size >= BEAT_OFFSETS.length && notes.length === 0) {
            setTimeout(() => finish(), 400);
          }
        }
      }
    }
    if (active) frameId = requestAnimationFrame(frame);
  }

  function stop() {
    session++;
    if (active) {
      const main = document.querySelector('main');
      if (main) main.inert = false;
    }
    window.CrystalStage?.musical?.(false);
    active = false;
    if (track) track.pause();
    cancelAnimationFrame(frameId);
    notes.forEach(n => n.el.remove());
    notes = [];
    host.hidden = true;
    context?.suspend?.();
  }

  async function pause() {
    if (!active) return;
    paused = !paused;
    const pBtn = host.querySelector('.rhythm-pause');
    if (pBtn) pBtn.textContent = paused ? 'Retomar' : 'Pausar';
    if (paused) {
      if (track) track.pause();
      await context?.suspend?.();
    } else {
      await context?.resume?.();
      if (track && startTime > 0) {
        track.play().catch(() => {});
      }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && active && !paused) pause();
  });

  document.addEventListener('keydown', e => {
    if (!active || e.repeat) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      pause();
      return;
    }
    if (e.target.closest('button:not(.rhythm-target)')) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const now = context ? context.currentTime : (performance.now() / 1000);
      const note = notes.reduce((a, b) => !a || Math.abs(b.time - now) < Math.abs(a.time - now) ? b : a, null);
      if (note) hit(note);
    }
  });

  window.CrystalRhythm = {
    async start(config, done) {
      stop();
      const token = ++session;
      options = config || {};
      track = (options.levelId === 5 || options.world === 0) && caveTrack ? caveTrack : defaultTrack;
      if (track && Number.isFinite(options.volume)) track.volume = Math.max(0, Math.min(1, options.volume));
      callback = done;
      initContext();
      if (context) await context.resume().catch(() => {});
      if (token !== session) return;

      active = true;
      paused = false;
      serial = points = hits = total = 0;
      targetTotal = BEAT_OFFSETS.length;
      startTime = 0;
      scheduledIndices.clear();

      const main = document.querySelector('main');
      if (main) main.inert = true;
      host.hidden = false;
      host.tabIndex = -1;
      window.CrystalStage?.musical?.(true, () => Math.max(0, track ? track.currentTime : 0));

      host.innerHTML = `
        <header>
          <h2>O canto dos cristais</h2>
          <p>Clique quando o anel encontrar o cristal · Espaço também funciona</p>
          <output class="rhythm-score"></output>
          <progress max="1" value="0" aria-label="Precisão musical"></progress>
          <button class="rhythm-pause pixel-button">Pausar</button>
          <button class="rhythm-skip pixel-button">Concluir</button>
          <button class="rhythm-exit pixel-button">Voltar ao mapa</button>
        </header>
        <p class="rhythm-judgment" role="status" aria-live="polite"></p>
      `;

      host.querySelector('.rhythm-pause').onclick = pause;
      host.querySelector('.rhythm-skip').onclick = () => finish();
      host.querySelector('.rhythm-exit').onclick = () => {
        const cancel = options.onCancel;
        stop();
        cancel?.();
      };

      host.onpointerdown = e => {
        if (e.target === host && notes.length && !notes[0].practice && !paused) {
          message('Toque sobre o cristal luminoso!');
        }
      };

      display();
      message('Treino: Toque no cristal para despertar a canção.');
      const now = context ? context.currentTime : (performance.now() / 1000);
      target(now + lead, true);
      host.focus();
      frame();
    },
    stop,
    finish,
    get active() { return active; },
    get state() {
      const now = context ? context.currentTime : (performance.now() / 1000);
      return {
        active,
        paused,
        points,
        total: targetTotal,
        hits,
        visible: notes.length,
        trackPosition: track ? track.currentTime : 0,
        duration: track ? track.duration : null,
        trackPaused: track ? track.paused : true,
        contextState: context?.state,
        hidden: document.hidden
      };
    }
  };
})();
