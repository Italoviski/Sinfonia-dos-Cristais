# Guia Técnico de Integração para a Equipe — Pacote 16-Bit True Pixel Art

Este diretório (`pacote-equipe-16bits/`) contém **todos os novos assets em True Pixel Art 16-Bit** gerados do zero (sem relação com os assets antigos do jogo), além da demonstração executável [`demonstracao-completa-16bits.html`](./demonstracao-completa-16bits.html) que implementa a linha de eventos completa do novo roteiro e o fluxo das Fases 1 a 5 do Mundo 1 (Caverna).

---

## 1. Estrutura da Pasta `pacote-equipe-16bits/`

```text
pacote-equipe-16bits/
├── demonstracao-completa-16bits.html   # Demonstração interativa e cinemática (Roteiro + Fases 1 a 5)
├── DIRECAO-DE-CENA-16BITS.md           # Direção de cena quadro a quadro (13 cenas + 5 fases)
├── GUIA-TECNICO-EQUIPE.md              # Este guia técnico para os programadores
└── assets/
    ├── atlas-manifest.json             # Manifesto JSON com dimensões, células e FPS de cada sprite
    ├── personagens/
    │   ├── protagonista-16bit-spritesheet.png   # 384×384 (grade 6×6 de células 64×64 px)
    │   └── fada-16bit-spritesheet.png           # 256×192 (grade 4×3 de células 64×64 px)
    ├── prologo-undertale/
    │   ├── painel-01-historia-do-mundo.png      # 320×140 (Sépia 16-bit: Contexto / História)
    │   ├── painel-02-crianca-na-floresta.png    # 320×140 (Sépia 16-bit: Criança entrando na caverna)
    │   └── painel-03-queda-no-calabouco.png     # 320×140 (Sépia 16-bit: Caindo no buraco)
    ├── cristais/
    │   └── cristais-16bit-spritesheet.png       # 256×192 (grade 4×3 de células 64×64 px)
    ├── efeitos/
    │   └── efeitos-16bit-spritesheet.png        # 384×256 (grade 6×4 de células 64×64 px)
    ├── cenarios/
    │   ├── 01-menu-porta-ancestral.png          # 320×180 (Menu com Porta Ancestral grandiosa)
    │   ├── 02-poco-queda-vertical.png           # 320×360 (Poço vertical tileable com saliências)
    │   ├── 03-caverna-fase1-o-despertar.png     # 320×180 (Câmara Fase 1)
    │   ├── 04-caverna-fase2-galeria-dos-ecos.png# 320×180 (Câmara Fase 2)
    │   ├── 05-caverna-fase3-lago-subterraneo.png# 320×180 (Câmara Fase 3)
    │   ├── 06-caverna-fase4-jardim-mineral.png  # 320×180 (Câmara Fase 4)
    │   ├── 07-caverna-fase5-santuario-da-fada.png# 320×180 (Câmara Fase 5 + Porta Ancestral)
    │   └── obstaculo-pedras-saida-spritesheet.png# 384×96 (grade 4×1 de células 96×96 px)
    └── ui/
        └── ui-16bit-spritesheet.png             # 384×192 (grade 6×3 de células 64×64 px)
```

---

## 2. Como Renderizar sem Perder a Nitidez (True Pixel Art)

1. **CSS Obrigatório**:
   ```css
   canvas, img {
     image-rendering: pixelated;
     image-rendering: crisp-edges;
   }
   ```
2. **Contexto 2D do Canvas**:
   ```js
   const ctx = canvas.getContext('2d');
   ctx.imageSmoothingEnabled = false;
   ```
3. **Coordenadas Inteiras**:
   Sempre arredonde posições `(x, y)` com `Math.round(x)` e `Math.round(y)` ao chamar `ctx.drawImage(...)`.

---

## 3. Mapa de Linhas do Protagonista (`protagonista-16bit-spritesheet.png`)

Cada célula mede **`64 × 64` pixels**, com 6 quadros por linha:
- **Linha 0 (`y = 0`)**: `Idle` (8 FPS) — respiração suave no fundo da caverna.
- **Linha 1 (`y = 64`)**: `Run / Walk` (12 FPS) — corrida para a direita rumo à próxima fase após clicar em `Continuar`.
- **Linha 2 (`y = 128`)**: `Freefall` (12 FPS) — queda livre no poço vertical (posicionar no canto superior esquerdo enquanto a parede direita sobe a 60 FPS).
- **Linha 3 (`y = 192`)**: `Magic Cushion Landing & Recovery` (12 FPS) — pouso na almofada mágica gerada pelos 3 cristais da esquerda e recuperação do baque enquanto a voz doce cantarola.
- **Linha 4 (`y = 256`)**: `Observe / Tutorial` (8 FPS) — olhando os cristais e acompanhando o cursor do Mouse Imaginário.
- **Linha 5 (`y = 320`)**: `Victory / Harmony` (12 FPS) — comemoração durante a explosão do cristal sombrio e abertura das pedras.

---

## 4. Máquina de Estados de Cada Fase (Fases 1 a 5)

Conforme demonstrado em `demonstracao-completa-16bits.html`, cada fase segue o ciclo:
1. **`ENTRADA`**:
   - Na **Fase 1**: Sequência de queda livre pelo poço (`Frames 5 & 23`) $\rightarrow$ aproximação dos 3 cristais da base esquerda (`Frame 24`) $\rightarrow$ geração da **Almofada de Magia** + **Voz Doce cantarolando** (`Frame 25`).
   - Nas **Fases 2 a 5**: O protagonista entra correndo pela esquerda até `x = 72, y = 134`.
2. **`TUTORIAL_MOUSE_IMAGINARIO` / `JOGABILIDADE`**:
   - A voz doce sussurra no canto superior direito o que fazer.
   - Na Fase 1 (e quando o jogador pede dica/demonstração), o **Mouse Imaginário** (`ui-16bit-spritesheet.png`, linha 0) demonstra visualmente:
     1. *"Usando o mouse, clique no cristal e não solte"* (`Frame 26`);
     2. *"Agora arraste ele até o cristal sombrio"* (`Frame 27`).
3. **`EXPLOSAO_ANULACAO`**:
   - Flash branco de 2 quadros + explosão de fragmentos geométricos e **raios azuis espiralados** (`Frame 28`, `efeitos-16bit-spritesheet.png` linha 1) a `24 FPS`.
4. **`ONDAS_AZUIS_DESBLOQUEIO`**:
   - Ondas concêntricas azuis (`efeitos-16bit-spritesheet.png` linha 2) viajam para a direita e atualizam `obstaculo-pedras-saida-spritesheet.png` do quadro `0` ao quadro `3` (caminho livre), enquanto a onda **Bayer 4×4 Dither** ilumina o cenário (`Frame 29`).
   - **Adicional da Fase 5**: As ondas azuis também sobem até o **Cristal-Prisão do Teto**, libertando a **Fada das Gemas** (`fada-16bit-spritesheet.png`), que voa até o protagonista e acende a Gema da Fada na Porta Ancestral.
5. **`MENU_3_ESTRELAS_CONTINUAR`**:
   - Exibe o modal de conclusão com as **3 estrelas douradas** acendendo e **apenas o botão `Continuar`** (`Frame 29`).
6. **`CORRIDA_PROXIMA_FASE`**:
   - Ao clicar em `Continuar`, o modal fecha e o protagonista executa a animação da **Linha 1 (`Run`)** até atravessar a saída aberta na direita.
