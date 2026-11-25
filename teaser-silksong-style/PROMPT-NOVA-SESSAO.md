# Prompt Pronto para Nova Sessão — Trailer *Silksong-Style* (Qualidade Máxima)

> **Como usar na nova sessão (Modelo e Taxa de Uso Recomendados):**
> 1. **Qual modelo escolher:** Utilize **Gemini 4 Carbon** se quiser raciocínio e planejamento de nível máximo.
> 2. **Qual taxa de uso / `thinking_level` escolher no Carbon:**
>    - **Se for execução única aqui no Antigravity IDE:** escolha **`Orchestrator (Carbon)`** ou **`Gemini 4 Carbon (High)`** se tiver boa cota restante, ou **`Gemini 4 Carbon (Medium)`** (que é inclusive o padrão oficial do `gemini-4-carbon`) se quiser **equilibrar qualidade de código/FFmpeg com menor consumo de cota**, pois a maior parte do trabalho pesado é determinística (FFmpeg, captura via Playwright/Edge CDP e CSS em `1920×1080`). *(Dica: se estiver com ~48% de cota como nesta janela, usar **Medium** no executor e **High** só na etapa de planejamento economiza quase metade dos tokens de pensamento sem perder precisão nos scripts FFmpeg!)*
>    - **Via API Google (`interactions`):** use `model="gemini-4-carbon"` com `"thinking_level": "high"` apenas para o planejamento/revisão do corte e `"medium"` para geração dos scripts/ajustes *(lembrando que Gemini 4 Carbon não tem Free Tier na Gemini Developer API)*.

---

## Copie e cole tudo dentro do bloco abaixo na sua nova sessão:

```text
Quero que você produza o trailer oficial de ~90 segundos (1920x1080 @ 60 FPS, MP4 H.264/AAC) de "Crystal Math Mania — Sinfonia dos Cristais" no repositório c:\Users\heito\OneDrive\Documentos\GitHub\Sinfonia-dos-Cristais, aplicando integralmente as estratégias do trailer de lançamento de Hollow Knight: Silksong (https://youtu.be/6XGeJwsUP9c) documentadas em teaser-silksong-style/ROTEIRO-SILKSONG-STYLE.md.

Leia primeiro:
1. AGENTS.md
2. teaser-silksong-style/ROTEIRO-SILKSONG-STYLE.md
3. index.html (linhas 218–278, bloco #creditsDialog para extrair todos os dados oficiais de créditos)

REGRAS OBRIGATÓRIAS (NUNCA VIOLAR):
1. ZERO IMAGENS GERADAS POR IA:
   - É TERMINANTEMENTE PROIBIDO usar image-generator, Nano Banana, Gemini Omni Video, invideo ou qualquer imagem sintética.
   - Use SOMENTE ativos reais já existentes no jogo (assets/story/interface/menu-aprovado.png, assets/story/interface-extra/mapa-sem-personagem.png, assets/story/interface-extra/paineis-mundos.png, assets/credits/uneb-logo.png, assets/credits/peterson-lobato.jpg, fontes em assets/fonts/) e capturas reais de gameplay em 1920x1080 @ 60 FPS (reaproveite teaser/clips/01..08.mp4 e, se precisar de micro-planos adicionais para o Ato 3 acelerado, capture via Edge Headless CDP seguindo teaser/capture-gameplay.mjs com imageSmoothingEnabled = false).

2. SOMENTE MÚSICAS DO GAMEPLAY REAL (EXCLUINDO A FASE FINAL):
   - PERMITIDAS exclusivamente as faixas de gameplay verificadas em js/true-pixel-cave.js, js/true-pixel-worlds.js e js/audio.js:
     * assets/audio/musica-menu.mp3 (Ato 1)
     * assets/audio/era-uma-vez-caverna.mp3
     * assets/audio/musica-floresta-fases.mp3 (Ato 2A)
     * assets/audio/musica-floresta-especial.mp3 (Ato 2B)
     * assets/audio/musica-rio-fases.mp3
     * assets/audio/musica-rio-especial.mp3 (Ato 3A)
     * assets/audio/musica-caatinga-fases.mp3
     * assets/audio/musica-caatinga-especial.mp3 (Ato 3B + Clímax + Ato 4)
   - ESTÃO EXPRESSAMENTE PROIBIDAS:
     * assets/audio/o-que-um-cristal-pode-fazer.mp3 (música da fase final ainda não está pronta!)
     * assets/audio/era-uma-vez-ato1-amatore.mp3 e assets/audio/era-uma-vez-ato2-de-nada.mp3
   - No clímax visual da entrega das 4 Gemas Primordiais e abertura da Porta Ancestral (08-porta-final-climax.mp4), mantenha a trilha musica-caatinga-especial.mp3 + SFX reais do gameplay, jamais a trilha da fase final.

3. ESTRUTURA EM 4 ATOS + ESTRATÉGIAS SILKSONG (90s exatos):
   - Ato 1 (0:00–0:15): Abertura atmosférica sem textos explicativos excessivos, cortes lentos (3–4.5s) no menu vivo e mapa com musica-menu.mp3.
   - Ato 2 (0:15–0:36): Match-cuts de movimento (fusão, Opala de Fogo, Portal Esmeralda com rastro verde, Corte Cristalino da Araci, frações Água-Marinha) com cortes de 1.8–2.8s.
   - Ato 3 (0:36–1:12): Escalada musical e montagem percusiva (1.6s -> 0.75s) sincronizada nos beats das trilhas musica-rio-especial.mp3 e musica-caatinga-especial.mp3, combinada aos SFX reais extraídos do WebAudio de gameplay (tocando nos transientes dos cortes!).
   - Ato 4 (1:12–1:30):
     * 1:12.0–1:12.6: Queda/respiro abrupto (estilo Silksong) antes do reveal final.
     * 1:12.6–1:17.0: Reveal monumental com menu-aprovado.png + letreiro gigante de impacto.
     * 1:17.0–1:23.5: Placa completa de CRÉDITOS OFICIAIS do jogo baseada em index.html (#creditsDialog):
       - Título: Crystal Math Mania — Sinfonia dos Cristais
       - Instituição: Universidade do Estado da Bahia (UNEB) + brasão assets/credits/uneb-logo.png
       - Orientador e Professor: Peterson Lobato + foto circular assets/credits/peterson-lobato.jpg
       - Integrantes: Heitor Givercy Nascimento Macedo (Gestor), Eyder Sanshes Brandão (Programador), Ítalo José Bomfim da Rocha (Programador), Italo Marcus de Sant'Ana Freitas (Designer — corrija "Desinger" do HTML)
       - Ferramentas Usadas: VS Code, Antigravity IDE, Codex IDE, PixelLabAi, Google Sala de Aula, Trello, Figma
     * 1:23.5–1:30.0 (6.5s): Card exclusivo de publicidade com QR Code funcional para https://brinqueaprenda.com.br/jogo/sinfonia-dos-cristais, reutilizando diretamente o arquivo já verificado teaser-silksong-style/card-publicidade-sinfonia-qr.png (sem zoom agressivo para manter leitura instantânea no celular), com fade-out limpo na música.

4. LETREIROS DE ALTO IMPACTO & TRUE PIXEL ART:
   - Sem falas/locução — apenas músicas do gameplay + SFX + poucos letreiros gigantes de impacto visual (96–130px, gradiente cristalino, contorno escuro espesso, brilho temático, alinhados em Fredoka-Bold/Montserrat 900 sem obstruir gemas ou HUD).
   - Toda escala/compositing de gameplay deve usar imageSmoothingEnabled = false / flags=neighbor em FFmpeg para preservar Pixel Art verdadeiro.

5. FERRAMENTAS LOCAIS & ESCOPO:
   - FFmpeg 9.1 e FFprobe 9.1 já estão instalados nesta máquina (verifique em %LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg*). Edge Headless e Python + qrcode + opencv-python-headless também estão instalados. No PowerShell, evite política .ps1 rodando comandos Node via `cmd /c "..."`.
   - Salve todo o código, intermediários e o vídeo final dentro de `teaser-silksong-style/` (ex.: `teaser-silksong-style/Sinfonia-dos-Cristais-Trailer-Silksong-90s-1080p60.mp4`). NUNCA modifique index.html, js/*, css/*, assets/*, tests/*, package.json, teaser/ nem teaser-local/.

6. VERIFICAÇÃO TÉCNICA E VISUAL OBRIGATÓRIA ANTES DE CONCLUIR:
   - `ffprobe`: confirmar 1920x1080, 60/1 FPS constantes (CFR), yuv420p H.264, AAC 48000 Hz estéreo, duração ~90.0s.
   - `ffmpeg ebur128=peak=true`: normalizar e comprovar loudness entre -15 e -13 LUFS e True Peak <= -1.0 dBTP (zero clipping).
   - Extrair contact-sheet com quadros de todos os atos + quadro full-res dos Créditos Oficiais + quadro full-res em t=87s do Card QR Final e inspecionar visualmente com read_file.
   - Decodificar o QR Code diretamente do frame extraído aos t=87s via cv2.QRCodeDetector para provar que o vídeo final preserva o QR funcional para https://brinqueaprenda.com.br/jogo/sinfonia-dos-cristais.
   - `git status --short`: comprovar que nenhum arquivo rastreado do jogo foi modificado.
```
