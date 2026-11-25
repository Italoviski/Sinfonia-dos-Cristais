# Roteiro Mestre Estilo *Silksong* (90s • 16:9 • 1920×1080 @ 60 FPS)
**Projeto:** *Crystal Math Mania — Sinfonia dos Cristais*  
**Instituição:** Universidade do Estado da Bahia (UNEB) — Curso de Graduação em Engenharia de Software  
**Referência Estratégica:** *Hollow Knight: Silksong — Release Trailer* ([youtu.be/6XGeJwsUP9c](https://youtu.be/6XGeJwsUP9c), ~1:52)

---

## 1. Estratégias Captadas do Trailer de Referência (`6XGeJwsUP9c`)

O trailer de lançamento de *Hollow Knight: Silksong* (~1:52, trilha de Christopher Larkin) funciona sem narração nem textos explicativos extensos graças a seis pilares de direção que adaptamos diretamente para *Sinfonia dos Cristais*:

| Estratégia do Trailer Original | Adaptação para *Sinfonia dos Cristais* |
| :--- | :--- |
| **1. Abertura Atmosférica sem Exposição** (`0:00–0:15` contemplativo) | Começar em planos mais longos (`3–4s`) no Santuário do Menu vivo e no voo da Fada pelo Mapa, deixando som ambiente cristalino e música respirarem antes de revelar qualquer mecânica. |
| **2. *Match-Cuts* de Movimento e Fluxo Cinético** | Conectar cortes pela direção do movimento real na tela: o arrasto magnético que funde cristais na Caverna corta direto para a trajetória da Esmeralda dobrando o cristal na Floresta e depois para o corte ninja da Araci. |
| **3. Escalada Rítmica em 4 Atos** | Ritmo progressivo intencional: **Ato 1 lento (`3.0–4.5s`) → Ato 2 ágil (`1.6–2.6s`) → Ato 3 percusivo e acelerado (`0.7–1.4s` no beat!) → Respiro abrupto de `0.6s` → Card monumental do título**. |
| **4. Síncope Tátil de Áudio + Gameplay SFX** | Tratar os efeitos sonoros reais do WebAudio do jogo (cliques roxos, explosão em cadeia da Onda de Restauração, corte cristalino, sinos do Rio, giros da Caatinga) como acentos de percussão travados diretamente nas batidas e cortes secos. |
| **5. Alta Densidade com Enquadramento Limpo** | Mostrar os 4 biomas, 7 gemas e 4 fases musicais/rítmicas sem poluir a ação com explicações; quando o corte acelera, a ação principal permanece sempre no centro visual (`True Pixel Art`, `imageSmoothingEnabled = false`). |
| **6. Tipografia Cirúrgica & Final de Impacto** | Pouquíssimos letreiros gigantes e minimalistas-épicos no padrão estético do jogo (`Fredoka-Bold` / `Montserrat 900`), encerrando na sequência: **Título Monumental → Créditos Oficiais Completos → Card Exclusivo com QR Code funcional**. |

---

## 2. Manifesto Estrito de Assets Reais e Músicas Permitidas

### Regra Absoluta de Imagem
* **ZERO geração de imagens por IA** (`image-generator`, Nano Banana, Omni Video, `invideo`, etc. estão **PROIBIDOS**).
* **Somente ativos visuais originais do repositório + capturas reais em `1920×1080 @ 60 FPS`**:
  * `assets/story/interface/menu-aprovado.png` (`1672×941`)
  * `assets/story/interface-extra/mapa-sem-personagem.png` (`1672×941`)
  * `assets/story/interface-extra/paineis-mundos.png` (`1536×1024`)
  * `assets/credits/uneb-logo.png` (`193×262`) e `assets/credits/peterson-lobato.jpg` (`460×460`)
  * `assets/fonts/Fredoka-Bold.ttf` e `assets/fonts/Fredoka-SemiBold.ttf`
  * Clipes reais em 1080p 60 FPS de `teaser/clips/01..08.mp4` + novas micro-capturas reais via Edge Headless CDP (`capture-gameplay.mjs`, usando obrigatoriamente `imageSmoothingEnabled = false`) caso falte qualquer plano rápido.
  * Card exclusivo de publicidade já pronto e verificado: `teaser-silksong-style/card-publicidade-sinfonia-qr.png`.

### Manifesto Estrito de Música (Somente Trilhas do Gameplay Real)
Conforme verificado em `js/audio.js`, `js/true-pixel-cave.js` e `js/true-pixel-worlds.js`:

| Status | Arquivo (`assets/audio/`) | Duração | Papel no Jogo Real | Uso neste Trailer |
| :---: | :--- | :---: | :--- | :--- |
| ✅ **PERMITIDA** | `musica-menu.mp3` | `161.24s` | Menu & Caverna Fases 1–4 (`true-pixel-cave.js:2787`) | **Ato 1** (`0:00 – 0:15`) |
| ✅ **PERMITIDA** | `era-uma-vez-caverna.mp3` | `168.38s` | Caverna Fase 5 Especial (`true-pixel-cave.js:4266`) | Reserva opcional para Ato 1/3 |
| ✅ **PERMITIDA** | `musica-floresta-fases.mp3` | `53.37s` | Floresta Fases Regulares (`true-pixel-worlds.js:7730`) | **Ato 2A** (`0:15 – 0:24`) |
| ✅ **PERMITIDA** | `musica-floresta-especial.mp3` | `57.18s` | Floresta Fase 10 Especial (`true-pixel-worlds.js:7737`) | **Ato 2B** (`0:24 – 0:36`) |
| ✅ **PERMITIDA** | `musica-rio-fases.mp3` | `54.60s` | Rio Fases Regulares (`true-pixel-worlds.js:7731`) | Reserva opcional para Ato 2/3 |
| ✅ **PERMITIDA** | `musica-rio-especial.mp3` | `58.10s` | Rio Fase 15 Especial (`true-pixel-worlds.js:7738`) | **Ato 3A** (`0:36 – 0:52`) |
| ✅ **PERMITIDA** | `musica-caatinga-fases.mp3` | `51.10s` | Caatinga Fases Regulares (`true-pixel-worlds.js:7732`) | Reserva opcional para Ato 3 |
| ✅ **PERMITIDA** | `musica-caatinga-especial.mp3` | `57.36s` | Caatinga Fase 20 Especial (`true-pixel-worlds.js:7739`) | **Ato 3B + Clímax + Ato 4** (`0:52 – 1:30`) |
| ❌ **PROIBIDA** | `o-que-um-cristal-pode-fazer.mp3` | — | **Música da Fase Final (não pronta!)** | **NUNCA UTILIZAR** |
| ❌ **PROIBIDA** | `era-uma-vez-ato1-amatore.mp3` / `ato2-de-nada.mp3` | — | Referências externas fora do gameplay ativo | **NÃO UTILIZAR** |

*(Observação sobre o Clímax Final: podemos mostrar as cenas visuais da entrega das 4 Gemas Primordiais e abertura da Porta Ancestral em `08-porta-final-climax.mp4`, mas **sempre sob a música `musica-caatinga-especial.mp3`** + SFX reais — jamais tocando `o-que-um-cristal-pode-fazer.mp3`!)*

---

## 3. Decupagem Segundo a Segundo (0:00 – 1:30 • 90 Segundos)

### ATO 1 (`0:00 – 0:15`) — Mistério do Santuário *(Cadência Lenta: cortes de 3–4,5s)*
* **Trilha:** `assets/audio/musica-menu.mp3` (fade-in `0.4s` logo do início atmosférico da faixa).
* **`0:00.0 – 0:04.2` | Plano 1 (`01-menu-porta.mp4`):** Fade do preto diretamente no Santuário vivo do Menu (partículas azuis/magenta a 12 FPS, lago refletindo a Porta Ancestral sem ainda destacar botões). Sem texto nos primeiros 2s para respiração visual.
* **`0:04.2 – 0:08.5` | Plano 2 (`02-mapa-jornada.mp4`):** Zoom suave na Fada cruzando o mapa completo `mapa-sem-personagem.png` em direção à Caverna Cristalina. **Letreiro cirúrgico gigante (`0:05.0 – 0:08.0`):** `4 MUNDOS. UM SANTUÁRIO.`
* **`0:08.5 – 0:12.2` | Plano 3 (`03-caverna-mecanicas.mp4` part 1):** Primeiro contato tátil: toque único seleciona cristal com aura roxa, conectando Equação Cristalina. **SFX:** acorde puro do toque.
* **`0:12.2 – 0:15.0` | Plano 4 (`03-caverna-mecanicas.mp4` part 2):** Arraste magnético fundindo dois Quartzos → Onda de Restauração Bayer 4×4 varre o quadro no exato ponto em que entra a mudança harmônica de `musica-menu.mp3`. **Letreiro (`0:12.5 – 0:14.8`):** `MATEMÁTICA 100% VISUAL`

### ATO 2 (`0:15 – 0:36`) — Descoberta, Movimento & Poderes *(Cadência Ágil: cortes de 1,8–2,8s)*
* **Trilha:** Crossfade musical (`0.5s`) em `0:15.0` para `musica-floresta-fases.mp3` (`0:15–0:24`) → aceleração limpa em `0:24.0` para `musica-floresta-especial.mp3` (`0:24–0:36`, 126 BPM).
* **`0:15.0 – 0:18.0` | Plano 5 (Match-cut Caverna → Opala de Fogo):** Opala de Fogo desliza sobre Quartzo realizando subtração visual com brasas; no impacto da subtração, corta seco para:
* **`0:18.0 – 0:21.5` | Plano 6 (`02-mapa-jornada.mp4` trecho Floresta + `paineis-mundos.png` painel Floresta):** Fada pousa no bioma Floresta Florescente, enquadrando as bordas temáticas de raízes e cristais verdes.
* **`0:21.5 – 0:24.8` | Plano 7 (`05-floresta-corte.mp4` parte 1 — Altar Esmeralda):** Cristal atravessa o Portal Esmeralda, dobra de tamanho e ganha aura + rastro verde desacoplado, seguindo imediatamente no *match-cut* para a esquerda→direita na próxima cena. **Letreiro (`0:21.8 – 0:24.5`):** `CADA GEMA. UM NOVO PODER.`
* **`0:24.8 – 0:29.5` | Plano 8 (`05-floresta-corte.mp4` parte 2 — Araci Corte Cristalino):** Explosão da batida de `musica-floresta-especial.mp3`! Três cortes sincronizados nos downbeats mostrando cortes diagonais no ar e `COMBO X2!` / `SEQ: 3`.
* **`0:29.5 – 0:33.0` | Plano 9 (`06-rio-melodia.mp4` parte 1 — Água-Marinha):** Divisão fracionária `DIVIDIR!` exatamente no centro da tela, cortando em simetria ao meio.
* **`0:33.0 – 0:36.0` | Plano 10 (`04-caverna-fada-ritmo.mp4` parte 1):** Círculos rítmicos pulsando em volta da Fada na Fase 5 da Caverna (ou cena brilhante `musical_part2_bright` preparando a escalada). **Letreiro (`0:32.8 – 0:35.6`):** `NO RITMO DA MÚSICA`

### ATO 3 (`0:36 – 1:12`) — Crescendo & Montagem Percussiva *(Cadência Acelerada: 1,6s → 0,7s)*
* **Trilha:**
  * `0:36.0 – 0:52.0`: `musica-rio-especial.mp3` (trecho de cascata enérgica a partir de `18.42s`)
  * `0:52.0 – 1:12.0`: Crossfade (`0.5s`) para `musica-caatinga-especial.mp3` (134 BPM baião acelerando até o pico em ~30–34s da faixa!)
* **`0:36.0 – 0:42.5` (Rio Encantado em pulsação crescente):** Alternância de 3 micro-planos (`2.2s`, `2.0s`, `2.3s`) em *Irecê — Melodia das Águas* (`06-rio-melodia.mp4`), cada cristal ciano/verde/âmbar acendendo nos anéis luminosos sincronizados à batida + harpa cristalina SFX. **Letreiro (`0:37.0 – 0:40.2`):** `DOMINE AS FRAÇÕES`
* **`0:42.5 – 0:48.5` (Topázio Elétrico + Citrino/Divisões):** Cortes rápidos (`1.5s` cada) entre circuito `CÍRCULO!` de Topázio Imperial (`07-caatinga-areias.mp4` início), divisão limpa de cristais e cadeia de anulação sequencial quebrando Sombrios um a um (`03-caverna-mecanicas.mp4`).
* **`0:48.5 – 0:52.0` (Transição Sertão):** Fada voando até o bioma A Caatinga no mapa (`mapa-sem-personagem.png`) em zoom rápido + painel ambarino (`paineis-mundos.png`).
* **`0:52.0 – 1:01.0` (Caatinga — Desafio das Areias em 134 BPM):** Montagem percusiva (`1.4s`, `1.2s`, `1.0s`, `0.9s`, ...): taças douradas girando em alta velocidade na Rodada 4/6 (`07-caatinga-areias.mp4`), revelação da gema vencedora e explosões de fogos dourados. **Letreiro (`0:53.0 – 0:56.8`):** `VELOCIDADE. LÓGICA. SINFONIA.`
* **`1:01.0 – 1:12.0` (Barragem Final — Corte Rápido 0,75s–1,1s no Estilo *Silksong* Climax!):**
  * Micro-flash de **todos os 4 biomas** (Caverna Fada Karaokê Brilhante → Floresta Ninja Slash → Rio Anéis → Caatinga Taças) em golpes de `0.85s` cada;
  * Seguido pelo visual da **Entrega das 4 Gemas Primordiais** nos relicários de ouro e **abertura da Porta Ancestral + celebração `Last Dance`** (`08-porta-final-climax.mp4`), sempre embalados pelo ápice do baião de `musica-caatinga-especial.mp3` (NUNCA usar `o-que-um-cristal-pode-fazer.mp3`!).

### ATO 4 (`1:12 – 1:30`) — Respiro Abrupto, Título Monumental, Créditos Oficiais & Card QR *(18s)*
* **`1:12.0 – 1:12.6` — Respiro / Queda Abrupta de Áudio (Assinatura *Silksong*!):** A imagem corta/fecha para preto profundo ou eco cristalino com queda brusca de volume (`-18 dB` / reverb de prato solto) antes da batida final.
* **`1:12.6 – 1:17.0` (4,4s) — Card Monumental do Título Oficial:**
  * Uso exclusivo do arquivo real `assets/story/interface/menu-aprovado.png` em leve push-in (`1.00 → 1.05`, `imageSmoothingEnabled = false`) enfatizando a logo oficial *Sinfonia dos Cristais* + faixa limpa inferior:
    `CRYSTAL MATH MANIA  ◆  4 BIOMAS  ◆  21 FASES`
    `TRUE PIXEL ART  ◆  ACESSÍVEL A TODOS`
* **`1:17.0 – 1:23.5` (6,5s) — Tela Completa de Créditos Oficiais (100% Dados de `index.html:218–278`):**
  * Layout fiel ao cartão de créditos do jogo (sobre fundo temático da Caverna com `assets/credits/uneb-logo.png` e `assets/credits/peterson-lobato.jpg` reais!):
    * **Título:** Crystal Math Mania — Sinfonia dos Cristais
    * **Instituição:** Universidade do Estado da Bahia (UNEB) — Graduação em Engenharia de Software
    * **Orientador e Professor:** Peterson Lobato *(com foto circular `assets/credits/peterson-lobato.jpg`)*
    * **Integrantes da Equipe:**
      * Heitor Givercy Nascimento Macedo *(Gestor)*
      * Eyder Sanshes Brandão *(Programador)*
      * Ítalo José Bomfim da Rocha *(Programador)*
      * Italo Marcus de Sant'Ana Freitas *(Designer)*
    * **Ferramentas Usadas:** VS Code • Antigravity IDE • Codex IDE • PixelLabAi • Google Sala de Aula • Trello • Figma
* **`1:23.5 – 1:30.0` (6,5s) — Card Exclusivo de Publicidade com QR Code Funcional:**
  * Exibição direta de **`teaser-silksong-style/card-publicidade-sinfonia-qr.png`** (`1920×1080`, `image-rendering: pixelated`, sem zoom agressivo para garantir leitura imediata de celular na tela!).
  * **Áudio (`1:23.5 – 1:30.0`):** Resolução firme da última frase musical de `musica-caatinga-especial.mp3` até `1:28.2`, seguida de *fade-out* exponencial limpo até `1:30.0`.
  * Fade-out visual para preto nos últimos `0.4s` (`1:29.6 – 1:30.0`).
