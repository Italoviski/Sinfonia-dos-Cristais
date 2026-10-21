(() => {
  'use strict';
  const dialog = document.createElement('dialog');
  dialog.className = 'story-dialog';
  dialog.setAttribute('aria-labelledby', 'story-speaker');
  dialog.setAttribute('aria-describedby', 'story-line');
  document.body.append(dialog);

  const cinema = document.createElement('div');
  cinema.className = 'story-cinema';
  cinema.hidden = true;
  cinema.setAttribute('aria-hidden', 'true');
  const doorCanvas = document.createElement('canvas');
  doorCanvas.className = 'story-door-canvas';
  doorCanvas.width = 320;
  doorCanvas.height = 180;
  cinema.append(doorCanvas);
  document.body.append(cinema);

  const dctx = doorCanvas.getContext('2d');
  dctx.imageSmoothingEnabled = false;

  const portraits = { fairy: 'fada', araci: 'araci', irece: 'irece', jurema: 'jurema' };
  const introductions = {
    1: [
      ['Sussurro', '“...Você desperta em uma caverna desconhecida... Uma Porta Ancestral monumental chama sua atenção...”', 'door-empty'],
      ['Sussurro', '“...Olhe para os cristais flutuando... Arraste um Quartzo até outro para somar seus brilhos...”'],
      ['Sussurro', '“...A Opala de Fogo retira brilho por arrastamento... Prepare a luz e una-a à sua versão sombria para anular!...”'],
      ['Sussurro', '“...No alto estão o mapa, o reinício e as configurações... À direita, cada etapa recupera uma nota da canção...”']
    ],
    2: [
      ['Sussurro', '“...Agora forme uma Equação Cristalina... Toque em um cristal e depois em outro para conectá-los sem fundir...”'],
      ['Sussurro', '“...A equação sombria procura sua correspondente: mesmos tipos, quantidades e ordem... Arraste a alça para mover!...”'],
      ['Sussurro', '“...Dez Diamantes bônus despertaram para você... Arraste um Diamante até uma equação normal se quiser desfazer conexões...”']
    ],
    3: [
      ['Sussurro', '“...O lago subterrâneo reflete a ordem das pedras... Observe cada brilho sombrio antes de conectar sua equação...”']
    ],
    4: [
      ['Sussurro', '“...O grande geodo guarda um eco antigo... Funda os Quartzos necessários antes de conectar a equação final...”']
    ],
    5: [
      ['Sussurro', '“...Aqui no alto!... Os sussurros vêm do enorme cristal no teto... Há uma silhueta de asas presa dentro dele!...”'],
      ['Sussurro', '“...Reduza com a Opala, conecte na ordem certa e anule a equação sombria para libertar a Fada das Gemas!...”']
    ],
    6: [
      ['Fada das Gemas', 'A floresta sofreu com o desmatamento e as queimadas. As árvores perderam suas folhas, o solo secou e o silêncio tomou conta da mata.'],
      ['Fada das Gemas', 'A Esmeralda, Gema Primordial da Terra, perdeu sua ressonância e adormeceu no coração da floresta. Precisamos devolver o equilíbrio a este lugar.']
    ],
    11: [
      ['Fada das Gemas', 'Efluentes e resíduos poluíram o Rio das Águas Claras. A água ficou turva, as cascatas pararam e a vida aquática está sufocando.'],
      ['Fada das Gemas', 'A Turmalina Paraíba, Gema Primordial da Água, perdeu sua ressonância. Vamos ajudar a correnteza a recuperar sua vida.']
    ],
    16: [
      ['Fada das Gemas', 'O calor excessivo e o desgaste do solo trouxeram uma seca extrema. As cacimbas secaram, o chão se abriu em fendas e a poeira cobriu a paisagem.'],
      ['Fada das Gemas', 'A Opala de Fogo, Gema Primordial do Sol e da Terra, perdeu seu brilho sob as areias. Vamos recuperar a água e o equilíbrio da Caatinga.']
    ],
    21: [
      ['Fada das Gemas', 'Voltamos ao santuário da caverna. As quatro Gemas Primordiais estão reunidas nos relicários dourados da Porta Ancestral.', 'door-full'],
      ['Fada das Gemas', 'Minha gema, a Esmeralda, a Turmalina Paraíba e a Opala de Fogo: quatro vozes, uma canção. Vamos despertar a porta!', 'door-full']
    ]
  };

  let settle = null, lines = [], index = 0, options = {}, lastFocus, activeArt = null, doorRaf = 0;

  function drawStoryDoorFx(now) {
    if (cinema.hidden || !activeArt) return;
    const t = now / 1000;
    const f12 = Math.floor(t * 12);
    const f8 = Math.floor(t * 8);
    dctx.clearRect(0, 0, 320, 180);

    // Shimmering pixel stars on the Monumental Ancient Door sockets & crystals
    const star = (cx, cy, s, core, tip) => {
      cx = Math.round(cx); cy = Math.round(cy);
      dctx.fillStyle = tip;
      dctx.fillRect(cx - s, cy, 2 * s + 1, 1);
      dctx.fillRect(cx, cy - s, 1, 2 * s + 1);
      dctx.fillStyle = core;
      dctx.fillRect(cx, cy, 1, 1);
    };

    const sockets = [
      { x: 160, y: 58, col: '#9ef0ff', active: activeArt !== 'door-empty' },
      { x: 141, y: 88, col: '#7aee8d', active: activeArt === 'door-earth' || activeArt === 'door-full' || activeArt.startsWith('open-') },
      { x: 179, y: 88, col: '#57ffe3', active: activeArt === 'door-full' || activeArt.startsWith('open-') },
      { x: 160, y: 108, col: '#ffa23c', active: activeArt === 'door-full' || activeArt.startsWith('open-') }
    ];
    sockets.forEach((s, i) => {
      if (s.active && (f12 + i * 3) % 4 < 2) {
        star(s.x, s.y, 2, '#ffffff', s.col);
      } else if ((f12 + i * 5) % 12 === 0) {
        star(s.x, s.y, 1, '#fff3b0', '#e59a28');
      }
    });

    // Subterranean water pixel ripples at bottom of door scene
    for (let k = 0; k < 22; k++) {
      const wx = 80 + ((k * 17 + f8 * ((k % 2) + 1)) % 160);
      const wy = 148 + (k * 5) % 28;
      dctx.fillStyle = k % 4 === 0 ? '#ffd35a' : k % 2 === 0 ? '#ff72e0' : '#63e5ff';
      dctx.fillRect(wx, wy, 3, 1);
    }

    doorRaf = requestAnimationFrame(drawStoryDoorFx);
  }

  function scene(kind) {
    activeArt = kind || null;
    cinema.hidden = !kind;
    cancelAnimationFrame(doorRaf);
    if (!kind) return;
    const opening = kind.startsWith('open-');
    const frame = opening ? Number(kind.slice(5)) : ({ 'door-empty': 0, 'door-fairy': 1, 'door-earth': 2, 'door-full': 3 }[kind] ?? 0);
    cinema.style.backgroundImage = `url('assets/story/interface-extra/${opening ? 'porta-abertura' : 'porta-estados'}.png')`;
    cinema.style.backgroundPosition = `${frame % 2 * 100}% ${Math.floor(frame / 2) * 100}%`;
    doorRaf = requestAnimationFrame(drawStoryDoorFx);
  }

  function render() {
    const [speaker, text, art, person] = lines[index];
    const isWhisper = speaker === 'Sussurro';
    scene(art);
    dialog.classList.toggle('is-whisper', isWhisper);
    dialog.replaceChildren();

    const portrait = document.createElement('div');
    portrait.className = 'story-portrait';
    portrait.setAttribute('aria-hidden', 'true');
    const who = portraits[person || 'fairy'];
    portrait.style.backgroundImage = `url('assets/story/personagens/${who}-16-quadros${who === 'fada' ? '-v1' : ''}.png')`;
    portrait.hidden = isWhisper;

    const copy = document.createElement('div');
    copy.className = 'story-copy';
    const name = document.createElement('h2');
    name.id = 'story-speaker';
    name.textContent = isWhisper ? '✧ Sussurro da Caverna ✧' : speaker;

    const p = document.createElement('p');
    p.id = 'story-line';
    if (isWhisper) {
      p.className = 'whisper-floating-text';
      p.setAttribute('aria-label', text);
      [...text].forEach((ch, i) => {
        const span = document.createElement('span');
        span.className = 'whisper-char';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        span.style.setProperty('--char-idx', String(i));
        p.append(span);
      });
    } else {
      p.textContent = text;
    }

    const count = document.createElement('span');
    count.className = 'story-count';
    count.textContent = `${index + 1} / ${lines.length}`;

    const next = document.createElement('button');
    next.className = 'pixel-button primary';
    next.textContent = index === lines.length - 1 ? 'Continuar' : 'Próximo';
    next.onclick = advance;

    copy.append(name, p, count, next);
    dialog.append(portrait, copy);
    next.focus();
    options.speak?.(`${speaker}. ${text}`);
  }

  function advance() {
    if (++index < lines.length) render();
    else close();
  }

  function close() {
    cancelAnimationFrame(doorRaf);
    if (dialog.open) dialog.close();
    cinema.hidden = true;
    activeArt = null;
    window.speechSynthesis?.cancel();
    const resolve = settle;
    settle = null;
    resolve?.();
    lastFocus?.isConnected && lastFocus.focus();
  }

  function show(items, config = {}) {
    close();
    if (!items?.length) return Promise.resolve();
    lines = items;
    index = 0;
    options = config;
    lastFocus = document.activeElement;
    return new Promise(resolve => {
      settle = resolve;
      dialog.showModal();
      render();
    });
  }

  dialog.addEventListener('cancel', e => {
    e.preventDefault();
    advance();
  });

  const before = {
    5: [['Fada das Gemas', 'Você me libertou! Era minha voz que ecoava dentro do cristal. Agora, acompanhe meu canto: espere o anel encontrar o círculo atrás de cada cristal.']],
    10: [['Araci', 'Sou Araci, a Guarda Florestal. Meu maracá guarda o ritmo das sementes. Vamos cantar com a Fada e despertar o coração da mata.', null, 'araci']],
    15: [['Irecê', 'Sou Irecê, protetora das nascentes. Minha flauta acompanha o canto das águas. Siga o ritmo e deixe a correnteza voltar a respirar.', null, 'irece']],
    20: [['Jurema', 'Sou Jurema, Guardiã da Caatinga. A rabeca chama a renovação. No compasso do sertão, a água e as flores vão voltar.', null, 'jurema']]
  };

  const after = {
    5: [
      ['Fada das Gemas', 'Esta é minha Gema Primordial. Seu primeiro relicário no topo da Porta Ancestral despertou!', 'door-fairy'],
      ['Fada das Gemas', 'A porta guarda o caminho para restaurar o equilíbrio do mundo. Ainda precisamos encontrar a Esmeralda da floresta, a Turmalina Paraíba do rio e a Opala de Fogo da Caatinga.', 'door-fairy'],
      ['Fada das Gemas', 'Vou liberar a passagem. Lá fora começa nossa jornada!']
    ],
    10: [['Fada das Gemas', 'A Esmeralda despertou. A floresta recupera folhas, abrigo e vida. Mais uma voz se une à Porta Ancestral.', 'door-earth']],
    15: [['Fada das Gemas', 'A Turmalina Paraíba foi libertada. As águas voltam a correr claras e a vida aquática pode respirar. Falta a Opala de Fogo.']],
    20: [
      ['Fada das Gemas', 'A Opala de Fogo despertou! A água brota das rochas, o solo se veste de verde e os mandacarus florescem. As quatro gemas estão reunidas.', 'door-full'],
      ['Fada das Gemas', 'Volte à fase final, no início do mundo da Caverna. A Porta Ancestral está esperando nossa última canção.', 'door-full']
    ],
    21: [
      ['Fada das Gemas', 'As quatro ressonâncias se encontraram. A Porta Ancestral está se abrindo!', 'open-1'],
      ['Fada das Gemas', 'Cada cristal, cada nota e cada pequeno gesto ajudou a restaurar este mundo.', 'open-2'],
      ['Fada das Gemas', 'O caminho está livre. Que nossa canção continue cuidando da vida!', 'open-3']
    ]
  };

  window.CrystalStory = {
    intro: (id, config) => show(introductions[id], config),
    beforeMusic: async (id, config) => {
      if (id === 5) await window.CrystalStage?.release();
      if (!document.getElementById('game').hidden) await show(before[id], config);
    },
    afterMusic: (id, config) => show(after[id], config),
    close,
    get active() { return dialog.open; }
  };
})();
