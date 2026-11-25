# Roteiro Mestre — Teaser Universitário (60s • 16:9 • 1920×1080)
**Projeto:** Crystal Math Mania — *Sinfonia dos Cristais*  
**Instituição:** Universidade do Estado da Bahia (UNEB) — Engenharia de Software  
**Orientador e Professor:** Peterson Lobato  
**Equipe:** Heitor Givercy Nascimento Macedo (Gestor), Eyder Sanshes Brandão (Programador), Ítalo José Bomfim da Rocha (Programador), Italo Marcus de Sant'Ana Freitas (Designer)

---

## 1. Estratégia de Áudio e Medley dos 4 Biomas (0 Créditos na Música)
A trilha musical é montada exclusivamente a partir das composições originais em `assets/audio/`, sincronizando cada troca de região com crossfades musicais limpos e um breve respiro dramático antes do clímax da Porta Ancestral:

| Bloco | Janela | Faixa Original (`assets/audio/`) | BPM / Clima | Papel no Teaser |
| :--- | :--- | :--- | :--- | :--- |
| 1–2 | `0:00 – 0:15` | `era-uma-vez-ato1-amatore.mp3` (52.0s) | Violino melancólico cristalino | Mistério inicial, Porta Ancestral e Caverna Cristalina |
| 3 | `0:15 – 0:26` | `musica-floresta-especial.mp3` (57.2s) | 126 BPM • *O Despertar da Esmeralda* | Ritmo percussivo na Floresta e Corte Cristalino (Araci) |
| 4 | `0:26 – 0:36` | `musica-rio-especial.mp3` (58.1s) | 124 BPM • *A Dança das Cascatas* | Fluidez aquática, frações e Melodia das Águas (Irecê) |
| 5–7 | `0:36 – 1:00` | `musica-caatinga-especial.mp3` (57.4s) | 134 BPM • *O Baião da Opala de Fogo* | Energia crescente na Caatinga (Jurema), clímax da Porta Ancestral e resolução nos créditos |

---

## 2. Decupagem Segundo a Segundo (0:00 – 1:00)

### Bloco 1 (`0:00 – 0:06`) — Gancho: O Chamado do Santuário
- **Cenário A (100% Real):** `01-menu-porta` — Câmera em zoom sutil (1.00 → 1.04) sobre o Menu Principal vivo (`menu-aprovado.png` + partículas 12 FPS + reflexo no lago subterrâneo 8 FPS), destacando a Porta Ancestral e a Gema da Fada.
- **Slot Cenário B (Amostra Única IA de 5s):** Em `cenario-b-hibrido`, os primeiros `0:00 – 0:05` recebem a cena cinemática gerada por referência da Porta Ancestral (`menu-aprovado.png`), fazendo *match-cut* exatamente para o menu/gameplay real em `0:05`.
- **Texto na tela (`0:03 – 0:05.5`):** `4 BIOMAS • 21 FASES`
- **Locução (`0:00.5 – 0:05.2`):** *"E se aprender matemática… fosse como restaurar uma sinfonia?"*
- **SFX:** Eco cristalino suave e cintilação da Gema da Fada.

### Bloco 2 (`0:06 – 0:15`) — Mundo 1: Caverna Cristalina
- **Visual:** `02-mapa-jornada` (fada cruzando a Caverna, `0:06–0:07.5`) → `03-caverna-mecanicas` (`0:07.5–0:13`: arrasto real fundindo Quartzos, subtração com Opala de Fogo, conexão de Equação Cristalina em linha roxa, anulação sequencial com Onda de Restauração Bayer 4×4) → `04-caverna-fada-ritmo` (`0:13–0:15`: Fase 5 Especial com a bolinha rítmica da Ordem).
- **Texto na tela (`0:09 – 0:13.5`):** `MATEMÁTICA 100% VISUAL`
- **Locução (`0:06.2 – 0:14.5`):** *"Em Sinfonia dos Cristais, não existem provas nem contas no papel. Você funde, equilibra e anula sombras com o toque — devolvendo cor e música ao mundo."*
- **Áudio:** Crescendo de `era-uma-vez-ato1-amatore.mp3` + SFX reais de fusão, brasa da Opala e quebra em combo.

### Bloco 3 (`0:15 – 0:26`) — Mundo 2: Floresta Florescente
- **Visual:** `02-mapa-jornada` (transição rápida da fada chegando à Floresta, `0:15–0:16.5`) → `05-floresta-corte` (`0:16.5–0:26`: Esmeralda dobrando valor com rastro verde desacoplado + Fase 10 Especial *Araci — Corte Cristalino* com combos em sequência).
- **Texto na tela (`0:18 – 0:22.5`):** `FLORESTA • CORTE CRISTALINO`
- **Locução (`0:16.0 – 0:24.5`):** *"Da caverna misteriosa à Floresta Florescente, cada bioma desperta um novo poder — e um desafio rítmico único."*
- **Áudio:** Crossfade na batida em `0:15` para `musica-floresta-especial.mp3` + SFX de cortes cristalinos.

### Bloco 4 (`0:26 – 0:36`) — Mundo 3: Rio Encantado
- **Visual:** `06-rio-melodia` — Divisão de Água-Marinha em frações visuais (`0:26–0:30`) → Fase 15 Especial *Irecê — Melodia das Águas* com cristais musicais pulsando em anéis ciano (`0:30–0:36`).
- **Texto na tela (`0:29 – 0:33.5`):** `RIO ENCANTADO • FRAÇÕES E MELODIA`
- **Locução (`0:26.5 – 0:34.5`):** *"Divida frações nas águas turquesas… e acompanhe a melodia dos cristais no seu próprio ritmo."*
- **Áudio:** Crossfade suave em `0:26` para `musica-rio-especial.mp3` + harpa/sinos aquáticos dos acertos.

### Bloco 5 (`0:36 – 0:46`) — Mundo 4: A Caatinga
- **Visual:** `07-caatinga-areias` — Topázio Imperial iluminando o circuito e Opala de Fogo (`0:36–0:40`) → Fase 20 Especial *Jurema — Desafio das Areias* com taças douradas girando rápido no ritmo do baião (`0:40–0:46`).
- **Texto na tela (`0:39 – 0:43.5`):** `CAATINGA • BAIÃO DA OPALA DE FOGO`
- **Locução (`0:36.5 – 0:44.8`):** *"Até o calor da Caatinga, onde o baião acelera cada descoberta rumo às quatro Gemas Primordiais."*
- **Áudio:** Crossfade energético em `0:36` para `musica-caatinga-especial.mp3` (134 BPM).

### Bloco 6 (`0:46 – 0:55`) — Clímax: A Porta Ancestral
- **Visual:** `08-porta-final-climax` — Fase 21 (`final-phase.js`): encaixe das 4 Gemas Primordiais nos relicários de ouro → abertura da Porta Ancestral → celebração `Last Dance` com partículas prismáticas.
- **Texto na tela (`0:51 – 0:55`):**  
  `CRYSTAL MATH MANIA — SINFONIA DOS CRISTAIS`  
  `TRUE PIXEL ART • ACESSÍVEL A TODOS`
- **Locução (`0:46.8 – 0:54.0`):** *"Quatro biomas brasileiros. True Pixel Art. Feito para todos jogarem. Sinfonia dos Cristais."*
- **Áudio:** Breve vale de ~0.5s em `0:46.0–0:46.5` antes do refrão/clímax de `musica-caatinga-especial.mp3` entrar com força total.

### Bloco 7 (`0:55 – 1:00`) — Encerramento Acadêmico UNEB (5s)
- **Visual:** `encerramento-uneb.png` (`1920×1080`, criado no Canva com o brasão oficial `assets/credits/uneb-logo.png`):
  - **CRYSTAL MATH MANIA — SINFONIA DOS CRISTAIS**
  - **Universidade do Estado da Bahia (UNEB)** • *Engenharia de Software*
  - **Orientador e Professor:** Peterson Lobato
  - **Equipe:** Heitor Givercy Nascimento Macedo (Gestor) • Eyder Sanshes Brandão (Programador) • Ítalo José Bomfim da Rocha (Programador) • Italo Marcus de Sant'Ana Freitas (Designer)
- **Áudio:** Sem locução; resolução instrumental firme até `0:58.2`, seguida de *fade out* limpo até `1:00.0`.

---

## 3. Texto Integral da Locução PT-BR (para Síntese no `invideo`)
> *(91 palavras • Leitura calma, acolhedora e inspiradora — sem tom de locutor publicitário exagerado, com pausas naturais entre blocos)*
>
> "E se aprender matemática… fosse como restaurar uma sinfonia?  
> Em Sinfonia dos Cristais, não existem provas nem contas no papel. Você funde, equilibra e anula sombras com o toque — devolvendo cor e música ao mundo.  
> Da caverna misteriosa à Floresta Florescente, cada bioma desperta um novo poder — e um desafio rítmico único.  
> Divida frações nas águas turquesas… e acompanhe a melodia dos cristais no seu próprio ritmo.  
> Até o calor da Caatinga, onde o baião acelera cada descoberta rumo às quatro Gemas Primordiais.  
> Quatro biomas brasileiros. True Pixel Art. Feito para todos jogarem. Sinfonia dos Cristais."

---

## 4. Especificação da Amostra Única — Cenário B (Branch `cenario-b-hibrido`)
- **Cena de teste (única geração de vídeo nesta etapa):** `0:00 – 0:05` (5 segundos, 16:9, `generate_audio: false`)
- **Imagem de referência (`@Image1`):** `assets/story/interface/menu-aprovado.png`
- **Prompt planejado (conciso, positivo, fiel ao True Pixel Art):**
  > `One continuous shot, no cuts. Slow forward camera push inside a dark bioluminescent crystal cavern rendered in crisp 16-bit true pixel art, glowing cyan and magenta crystal clusters reflecting softly on subterranean water toward the grand blue-cobalt stone Ancestral Door with golden filigree frames awakening with subtle cyan light. Soft cavern luminescence, sharp pixel edges. Preserve: composition, cobalt-cyan-magenta palette, butterfly-shaped Fairy Gem crest at the top of the door, and authentic pixel art aesthetic without any text.`
- **Transição para o jogo real:** *Match-cut* direto aos `0:05` para o menu/gameplay vivo 60 FPS do jogo, mantendo a coerência cromática e arquitetônica da Porta Ancestral.
