# Direção de Cena & Demo Animada — "O Despertar da Caverna"

![Animação em True Pixel Art — O Despertar da Caverna (320×180 nativo, 12 FPS sprites / 60 Hz lógica)](C:/Users/heito/.gemini/antigravity/brain/cfb4e569-1b45-4d83-a356-2ec8d61380fc/despertar-da-caverna.gif)

> [!TIP]
> **Player Interativo com Áudio Chiptune e Inspeção Quadro a Quadro (`1/12 s`):**
> Abra [despertar-da-caverna.html](file:///C:/Users/heito/.gemini/antigravity/brain/cfb4e569-1b45-4d83-a356-2ec8d61380fc/despertar-da-caverna.html) ou [demo-pixel-art.html](file:///c:/Users/heito/Documents/Codex/2026-09-08/a-reuni-o-aprofundou-a-discuss/outputs/sinfonia-dos-cristais/demo-pixel-art.html) para controlar a cena em tempo real:
> - `Espaço`: Pausar / Reproduzir
> - `←` / `→`: Avançar ou voltar **exatamente 1 quadro de sprite (`1/12 s`)**
> - `G`: Ligar/desligar a **grade física de pixels `320×180`** (comprova zero mixels)
> - `S`: Ativar o **som chiptune procedural** (combo ascendente Dó–Mi–Sol–Dó na quebra sequencial + arpejo de restauração)

---

## 1. Conceito & Logline da Cena

> **Logline:** Na Caverna apagada, uma **Equação Cristalina** luminosa (`2 orbes + 1 orbe`, sem algarismos na tela) encontra sua **Equação Sombria** equivalente. Os cristais se quebram **um a um em sequência** com fragmentos caindo pelo chão, uma onda de luz em dithering Bayer devolve a cor à caverna, a prisão cristalina racha em 3 estágios e a **Fada** se liberta em voo, acendendo a **Gema da Fada** no topo da **Porta Ancestral**.

**Contexto no jogo:** Encerramento do arco da Caverna (resgate da Fada e ativação do 1º encaixe superior da Porta das Quatro Gemas Primordiais, conforme especificado em `Crystal-Math-Mania-mecanicas-organizadas-v2.txt` e `apresentacao-conceitos/porta/registro-e-prompts-v2.md`).

---

## 2. Storyboard Capturado dos 9 Beats (Inspeção Quadro a Quadro)

````carousel
![Beat 1 — Silêncio Sombrio (0,8 s): Caverna apagada, Equação Sombria flutuando a 6 FPS e Fada adormecida na prisão em dithering](C:/Users/heito/.gemini/antigravity/brain/cfb4e569-1b45-4d83-a356-2ec8d61380fc/beat1-silencio-sombrio.png)
<!-- slide -->
![Beat 2 — Entrada Magnética (3,2 s): Equação Cristalina (Quartzo de 2 orbes + Quartzo de 1 orbe conectados por linha roxa) desliza a 60 Hz](C:/Users/heito/.gemini/antigravity/brain/cfb4e569-1b45-4d83-a356-2ec8d61380fc/beat2-entrada-magnetica.png)
<!-- slide -->
![Beat 3 — Correspondência Visual (4,5 s): Feixes pontilhados validam par a par (2 orbes ↔ 2 orbes, 1 orbe ↔ 1 orbe) sem números escritos](C:/Users/heito/.gemini/antigravity/brain/cfb4e569-1b45-4d83-a356-2ec8d61380fc/beat3-correspondencia.png)
<!-- slide -->
![Beat 4 — Quebra Sequencial (5,5 s): Os cristais explodem um por um a 12 FPS com hit-flash de 1 quadro, anel de choque e fragmentos caindo no chão](C:/Users/heito/.gemini/antigravity/brain/cfb4e569-1b45-4d83-a356-2ec8d61380fc/beat4-quebra-sequencial.png)
<!-- slide -->
![Beat 5 — Onda de Restauração (7,7 s): Frente de luz em dithering Bayer 4×4 varre a caverna a 24 FPS, acendendo os cristais ciano/magenta e os reflexos na água](C:/Users/heito/.gemini/antigravity/brain/cfb4e569-1b45-4d83-a356-2ec8d61380fc/beat5-onda-restauracao.png)
<!-- slide -->
![Beat 6 — Rachaduras na Prisão (9,5 s): A Fada abre os olhos e a prisão cristalina racha em 3 estágios progressivos](C:/Users/heito/.gemini/antigravity/brain/cfb4e569-1b45-4d83-a356-2ec8d61380fc/beat6-rachaduras-prisao.png)
<!-- slide -->
![Beat 7 — Libertação da Fada (10,1 s): A prisão explode em 36 fragmentos físicos com anel duplo e estrela de 4 pontas enquanto a Fada abre as asas](C:/Users/heito/.gemini/antigravity/brain/cfb4e569-1b45-4d83-a356-2ec8d61380fc/beat7-libertacao-fada.png)
<!-- slide -->
![Beat 8 — Gema da Fada na Porta Ancestral (11,95 s): A Fada canaliza um feixe até o topo da Porta Ancestral, acendendo a Gema da Fada em formato de asas](C:/Users/heito/.gemini/antigravity/brain/cfb4e569-1b45-4d83-a356-2ec8d61380fc/beat8-gema-da-fada-porta.png)
<!-- slide -->
![Beat 9 — Caverna Restaurada (13,4 s): Vagalumes percorrem a caverna iluminada, a Gema da Fada pulsa na Porta e o título cai letra a letra](C:/Users/heito/.gemini/antigravity/brain/cfb4e569-1b45-4d83-a356-2ec8d61380fc/beat9-caverna-restaurada.png)
````

---

## 3. Ficha Técnica de True Pixel Art

| Parâmetro | Especificação na Cena | Justificativa Técnica |
|---|---|---|
| **Resolução Nativa** | **`320 × 180` px** (`16:9`) | Grade inteira canônica de Pixel Art (escala exata `4×` para `1280×720` e `6×` para `1920×1080`). |
| **Escalonamento** | **Inteiro em pixels físicos** (`Math.floor` considerando `devicePixelRatio`) | Impede pixels retangulares distorcidos (*mixels*) em telas Windows com escala de `125%` ou `150%`. |
| **Interpolação** | `imageSmoothingEnabled = false` + `image-rendering: pixelated` | Zero borrão bilinear. |
| **Coordenadas** | `Math.round(x)`, `Math.round(y)` antes de todo `drawImage` / `fillRect` | Impede sub-pixel rendering. |
| **Transparência** | **Zero alpha blending** — translucidez 100% via **Dithering Bayer 4×4 e Xadrez** | A prisão de cristal, a frente da onda e o fade usam matrizes de dithering puras sobre paleta indexada (< 48 cores). |

---

## 4. Arquitetura de Cadência de Quadros (Dual-Rate: `60 Hz` + `12 FPS`)

| Camada | Taxa de Atualização | Elementos da Cena |
|---|---|---|
| **Física, Trajetórias & Câmera** | **`60 Hz` fixo** | Deslize magnético da Equação Cristalina (`easeOutBack`), voo em curva Bézier da Fada, gravidade e quique dos 76 fragmentos de cristal no chão. |
| **Sprites & Efeitos Core** | **`12 FPS` (`83,3 ms`/quadro)** | Batida de asas da Fada (ciclo de 4 quadros = 3 batidas/s), ondulação da linha energética roxa, hit-flash + rachadura + anel de explosão dos cristais, giro de 4 poses dos fragmentos no ar, rastro da Fada e quique das letras do título. |
| **Frente da Onda Ambiental** | **`24 FPS`** | Expansão radial com borda cintilante em dithering Bayer que converte o cenário da paleta `DARK` para `LIT`. |
| **Respiração Ambiental** | **`6–8 FPS`** | Flutuação vertical de `1 px` dos cristais (`BOB`), pulsação do contorno sombrio, cintilação dos vagalumes e ondulação dos reflexos na água. |

---

## 5. Roteiro Detalhado de Direção (Beats × Regras v2)

| Beat | Janela | Ação Dramática | Regra de Design (`v2.txt`) Demonstrada |
|---|---|---|---|
| **1. Silêncio Sombrio** | `0,0 – 1,6 s` | Fade-in em dithering Bayer. Caverna apagada; Equação Sombria (`2 orbes + 1 orbe`) flutua com aura roxa; Fada dorme na prisão de cristal à direita da Porta Ancestral. | Equações Sombrias têm brilho escuro/roxo e estrutura composta por mais de uma gema. |
| **2. Entrada Magnética** | `1,6 – 3,6 s` | Equação Cristalina normal (`Quartzo 2 orbes` conectado a `Quartzo 1 orbe` por linha roxa energética) entra pela esquerda com leve *overshoot* e se alinha sob a Equação Sombria. | Conexão por clique mantém os cristais **fisicamente separados** ligados por linha energética roxa. |
| **3. Correspondência** | `3,9 – 5,0 s` | Feixes verticais pontilhados conectam cada cristal sombrio ao seu par luminoso; os orbes internos piscam em sincronia. | **Matemática 100% visual**: quantidades lidas por orbes luminosos (`2 ↔ 2`, `1 ↔ 1`), **sem números escritos**. |
| **4. Quebra Sequencial** | `5,0 – 6,4 s` | Os 4 cristais quebram **um a um em sequência** (`SA → NA → SB → NB`, a cada `0,4 s`): 1 quadro de *hit-flash* branco, 1 quadro de rachadura interna, seguidos por anéis concêntricos, estrela de 4 pontas e fragmentos que caem e quicam no chão ao som de **combo ascendente (Dó–Mi–Sol–Dó)**. | **Anulação sequencial peça por peça** com fragmentos caindo e combo **puramente audiovisual** (§4.6). |
| **5. Onda de Restauração** | `6,7 – 8,7 s` | Do centro da anulação nasce uma onda de luz em dithering Bayer (`24 FPS`) que transforma a paleta escura da caverna em azul-safira vibrante, acendendo os cristais ciano e magenta e os reflexos na água. | Restauração progressiva do bioma a cada equação sombria anulada. |
| **6. Rachaduras** | `8,9 – 9,8 s` | A Fada abre os olhos dentro da prisão; o cristal racha em 3 estágios (`8,90 s`, `9,15 s`, `9,40 s`) e emite um clarão branco de 2 quadros. | Antecipação visual clássica de pixel art antes de ruptura. |
| **7. Libertação** | `9,8 – 11,4 s` | A prisão se estilhaça em 36 fragmentos que caem e quicam no chão; a Fada abre as asas (ciclo de 4 poses a `12 FPS`) e voa em arco deixando rastro de partículas cintilantes. | Identidade visual da Fada fiel à referência aprovada (`fada-aprovada.png`). |
| **8. Gema da Fada** | `11,4 – 12,2 s` | A Fada paira acima da Porta Ancestral e envia um feixe até o encaixe superior em forma de asas, onde a **Gema da Fada** (ciano/lilás com núcleo dourado) se materializa. | Os 4 encaixes da Porta Ancestral: **Gema da Fada** no topo e 3 encaixes inferiores aguardando Floresta, Rio e Caatinga. |
| **9. Título & Loop** | `12,2 – 15,0 s` | O título `"CAVERNA RESTAURADA"` cai letra por letra com quique de 5 quadros; vagalumes flutuam pela caverna até o fade-out em dithering. | Fechamento de fase com feedback claro de conquista. |
