# Tutorial Cards Visual Overhaul & Reading Pace Control Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the visual presentation, text layout, dynamic reading highlights, and child reading pace timer with a progress bar on all tutorial cards in *Sinfonia dos Cristais*.

**Architecture:** 
- A tokenized rich-text parser and justified line layout engine in `TutorialModal` supporting colored highlights (`{cyan:...}`, `{gold:...}`, `{green:...}`, `{pink:...}` or `**...**`) and balanced inter-word spacing (`text-align: justify`) to evenly distribute text and eliminate empty gaps.
- An automatic child-reading timer (`pageDuration = clamp(1.8 + words * 0.18, 3.0, 5.2)`) tracking reading progress with an animated pixel progress bar at the bottom of the card.
- A lock state on the "Avançar >" / "Começar!" button preventing skipping while reading is underway (with visual wait feedback and instant bypass for `GameHUD.godMode`).
- Comprehensive revision of all tutorial copy in `StandardTutorialCards` and `CaveChapter1` musical vignette cards with pedagogical keyword highlights.

**Tech Stack:** HTML5 Canvas 2D (True Pixel Engine 320x180 resolution), JavaScript ES Modules, Node.js Test Runner.

**Spec:** Prompt #12 from the general roadmap.

## Global Constraints
- Target pixel resolution is strictly 320x180 (`W=320`, `H=180`) with crisp integer pixel coordinates (`R(x)`).
- Visuals must retain the Owlboy-inspired high-contrast parchment aesthetic with dark frame and vibrant pixel accents.
- God Mode (`GameHUD.godMode`) must allow immediate bypass of reading locks so developers, automated tests, and AI Playtester are not blocked.
- All existing tests (88/88 unit tests, campaign balance, build, and AI playtester 21/21) must continue to pass cleanly.

## Review Focus
1. **Punctuation and Line Breaks in Justified Text:** Inter-word justification must not stretch single words or the last line of paragraphs, nor break tokens across lines ungracefully.
2. **Short vs Long Tutorial Pages:** Single-sentence cards must never stall longer than ~3.0s, while denser cards must not exceed ~5.0s, maintaining a comfortable pace for children without causing frustration.
3. **Card Switching & Reopening:** Switching cards via "Avançar >" or closing/reopening the modal must cleanly reset `pageElapsed` and timer state without residual progress from previous cards.
4. **Touch & Click Bounds:** The bottom progress bar must not overlap or corrupt button hitbox detection on mobile touch screens or mouse clicks.
5. **Node.js Test Environment Compatibility:** Any canvas text measurement/rendering fallbacks must execute without crashing in headless/mocked canvas environments.

---

### Task 1: Rich Text Parser and Justified Canvas Text Engine

**Files:**
- Modify: `C:/Users/heito/OneDrive/Documentos/GitHub/Sinfonia-dos-Cristais/js/true-pixel-engine.js`
- Test: `C:/Users/heito/OneDrive/Documentos/GitHub/Sinfonia-dos-Cristais/tests/tutorial-rich-text.test.mjs`

- [ ] Write failing test in `tests/tutorial-rich-text.test.mjs` verifying:
  - Token parsing for colors (e.g. `{cyan:palavra}`, `{gold:palavra}`, `{green:palavra}`, `{pink:palavra}`, and markdown-style `**palavra**`).
  - Word measurement and line wrapping with tokens stripped for width calculation.
  - Justification spacing calculation across a fixed bounding width for intermediate lines.
- [ ] Run `node --test tests/tutorial-rich-text.test.mjs` and confirm failure.
- [ ] Implement `parseRichTokens(text)` and `drawJustifiedPixelText(ctx, text, x, y, maxWidth, lineHeight, defaultCol, shadowCol)` in `js/true-pixel-engine.js`.
- [ ] Expose `parseRichTokens` and `drawJustifiedPixelText` in `TruePixelEngine`.
- [ ] Run `node --test tests/tutorial-rich-text.test.mjs` and verify it passes.

---

### Task 2: Child Reading Pace Timer, Progress Bar, and Button Lock State

**Files:**
- Modify: `C:/Users/heito/OneDrive/Documentos/GitHub/Sinfonia-dos-Cristais/js/true-pixel-engine.js`
- Test: `C:/Users/heito/OneDrive/Documentos/GitHub/Sinfonia-dos-Cristais/tests/tutorial-reading-pace.test.mjs`

- [ ] Write failing test in `tests/tutorial-reading-pace.test.mjs` verifying:
  - Calculation of `pageDuration` based on word count (minimum 3.0s, maximum 5.0s, proportional to word count).
  - `TutorialModal.isPageLocked()` returns `true` while `pageElapsed < pageDuration` when God Mode is inactive.
  - `TutorialModal.isPageLocked()` returns `false` immediately when `GameHUD.godMode = true`.
  - `TutorialModal.handleClick()` rejects advances when locked and accepts when unlocked or under God Mode.
  - Reset of `pageElapsed` upon `open()` and `nextStep()`.
- [ ] Run `node --test tests/tutorial-reading-pace.test.mjs` and confirm failure.
- [ ] In `TutorialModal` in `js/true-pixel-engine.js`:
  - Add `pageElapsed`, `pageDuration`, `lastRenderTime`, `calculatePageDuration(card)` methods.
  - Update `open()` and `nextStep()` to compute and reset reading timer.
  - Guard `handleClick(lx, ly)` and `nextStep()` against locked state (unless `GameHUD.godMode` is true).
  - In `render(ctx, t)`:
    - Compute delta time from animation timestamp `t`.
    - Render horizontal progress rail and fill bar at the bottom of the card (`#1b2434` rail, `#38bdf8` -> `#fbbf24` gradient fill with leading pixel spark).
    - Render action button with locked styling (`#1a2130` background, muted `#5a6d8c` text) when locked, transitioning to active styling (`#2b689c`, `#ffffff` text, glowing cyan/gold border with pulse) when complete.
- [ ] Run `node --test tests/tutorial-reading-pace.test.mjs` and confirm it passes.

---

### Task 3: Tutorial Card Layout Balancing and Harmonic Spacing

**Files:**
- Modify: `C:/Users/heito/OneDrive/Documentos/GitHub/Sinfonia-dos-Cristais/js/true-pixel-engine.js`

- [ ] Optimize dimensions and text area in `TutorialModal.render`:
  - Card box: `cx = 24`, `cy = 18`, `cw = 272`, `ch = 144` (or adjusted for optimal 320x180 viewport balance).
  - Header: Left title, right page counter.
  - Vignette container: `cx + 12`, `cy + 22`, `cw - 24`, `38`.
  - Text box: `cx + 12`, `cy + 66`, `cw - 24`, `52` using `drawJustifiedPixelText` with calibrated font height (`9px`) and line spacing (`11px`) to fill the vertical and horizontal space cleanly.
  - Progress bar: Placed cleanly along the bottom left (`x: cx + 12`, `y: cy + ch - 16`, `w: cw - 108`, `h: 5`) with percentage indicator or decorative border.
  - Action button: Positioned at `x: cx + cw - 90`, `y: cy + ch - 21`, `w: 78`, `h: 15`.

---

### Task 4: Content Revision of All Tutorial Cards with Dynamic Reading Highlights

**Files:**
- Modify: `C:/Users/heito/OneDrive/Documentos/GitHub/Sinfonia-dos-Cristais/js/true-pixel-engine.js`
- Modify: `C:/Users/heito/OneDrive/Documentos/GitHub/Sinfonia-dos-Cristais/js/true-pixel-cave.js`
- Test: `C:/Users/heito/OneDrive/Documentos/GitHub/Sinfonia-dos-Cristais/tests/tutorial-rich-text.test.mjs`

- [ ] Revise all cards in `StandardTutorialCards` in `js/true-pixel-engine.js`:
  - `FASE1_INTRO`: highlight **Arraste**, **bolinhas luminosas**, **cristais puros**, **sombrios**, **anulá-los!**, **barreira de pedra**, **liberar a passagem!**.
  - `FASE2_OPAL`: highlight **Opala de Fogo**, **tremem**, **subtraem 1 bolinha**, **Afaste para parar!**.
  - `FASE3_ROSE_AND_AURA`: highlight **Quartzo Rosa**, **Soma igual**, **cores diferentes não fundem!**.
  - `FASE3_EQUATION_AURA`: highlight **Equação Cristalina**, **adicioná-los**, **toque para expandir**, **organizar seu interior!**.
  - `FOREST_EMERALD`: highlight **Altar de Esmeralda**, **duplicar bolinhas**, **uma única vez!**.
  - `FOREST_CITRINE`: highlight **Citrino Solar**, **Toque rápido**, **número par**, **dividi-lo em dois iguais!**.
  - `FOREST_SLICING_NINJA`: highlight **Deslize o dedo ou mouse**, **cortar cristais puros**, **Combos múltiplos**, **sombrios descontam 2s!**.
  - `RIVER_AQUA`: highlight **Água-Marinha**, **Toque rápido**, **reparti-la**, **arraste iguais para somá-las!**.
  - `RIVER_FRACTION_PLATFORM`: highlight **Plataforma de Frações**, **não podem mais sair**, **Iguale cima e baixo**, **brilhará em rosa**, **Clique para quebrar e dividir!**.
  - `RIVER_MELODY_SIMON`: highlight **Sinfonia das Águas**, **Observe por 1s**, **ordem exata**, **harmonizar o rio!**.
  - `CAATINGA_CIRCLE`: highlight **Círculo Elétrico**, **1 único cristal**, **anular sombra circular!**.
  - `CAATINGA_SQUARE`: highlight **Quadrado Elétrico**, **exigem 2 cristais**, **mesmo valor matemático**, **A ordem importa!**, **1º = borda**, **2º = núcleo interno**.
  - `CAATINGA_RECTANGLE`: highlight **Retângulo Elétrico**, **2 cristais diferentes**, **1º = borda, 2º = interior**.
  - `CAATINGA_TRAPEZOID`: highlight **Trapézio Elétrico**, **matriz trapezoidal**.
  - `CAATINGA_TESSELLATION`: highlight **Conecte duas formas**, **polígonos maiores**, **Arraste para desmontar!**.
  - `CAATINGA_NESTED`: highlight **Geometria Avançada**, **dentro de Equações**, **sombras compostas em cascata!**.
  - `CAATINGA_SHELL_GAME`: highlight **Desafio das Areias**, **Opala de Fogo**, **1 segundo**, **cúpula correta**, **6 rodadas!**.
- [ ] In `js/true-pixel-cave.js`:
  - Enhance `renderMusicalVignette` (Fase 5 Vinheta Card 1 e 2) with dynamic highlights, text justification, and progress bar reading control matching `TutorialModal`.
- [ ] Add assertions in tests validating that all cards have rich tokens and non-empty formatted content.

---

### Task 5: Full Regression Verification, AI Playtester, and Git Commit

**Files:**
- Execute verification suite across the repository.

- [ ] Run full unit test suite: `node --test tests/*.test.mjs`.
- [ ] Run campaign balance verification: `node .agents/skills/campaign-balancer/scripts/verify-campaign.mjs`.
- [ ] Run build script: `node scripts/build.mjs`.
- [ ] Run AI Playtester on all 21 levels: `node .agents/skills/ai-playtester/scripts/playtest.mjs`.
- [ ] Commit all changes on branch `main` with descriptive message (`feat(tutorial): reformula apresentacao visual, texto justificado, palavras-chave e barra de progresso infantil`).
