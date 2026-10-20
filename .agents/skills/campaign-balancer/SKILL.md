---
name: campaign-balancer
description: >-
  Valida matematicamente e equilibra as 21 fases da campanha, as regras de equações racionais
  (CrystalRules), os dispositivos físicos (Matter.js) e a pontuação de estrelas (CrystalScore).
  Use esta skill ao criar ou modificar fases, mecânicas de gemas ou curvas de dificuldade.
---

# Campaign Balancer — Sinfonia dos Cristais

Esta skill fornece as diretrizes e ferramentas de verificação para projetar e balancear puzzles em `js/rules.js`, `js/campaign.js`, `js/campaign-current.js` e `js/equations.js`.

## 1. Regras de Ouro de Design de Fases

1. **Solucionabilidade Exata**:
   - Toda fase deve terminar com `board.pieces.size === 0` (todas as peças de luz anuladas contra suas respectivas sombras) sem exigir o consumo de Diamantes (`board.diamonds` serve apenas para desfazer conexões acidentais do jogador).
2. **Progressão Pedagógica nos 4 Biomas + Fase Final**:
   - **Mundo 1 — Caverna (Fases 1–5)**: Adição (`Quartzo`), Subtração (`Opala de Fogo`), Conexão de Equações Ordenadas e Reflexão de Luz (`Topázio`).
   - **Mundo 2 — Floresta (Fases 6–10)**: Multiplicação por 2 (`Portal de Esmeralda`), Divisão Inteira (`Citrino`) e Equilíbrio de Expressões (`Balança`).
   - **Mundo 3 — Rio das Águas Claras (Fases 11–15)**: Frações (`Água-Marinha` $\frac{1}{2}, \frac{1}{4}, \frac{3}{4}$), Recombinação Fracionária e Correnteza/Roda d'Água.
   - **Mundo 4 — Caatinga (Fases 16–20)**: Expressões Mistas (Inteiros + Frações + Portais + Subtração) e Descoberta de Incógnita (`Turmalina`).
   - **Fase 21 — A Porta das Gemas**: Síntese das 4 Gemas Primordiais antes do concerto final.

## 2. Verificação Automatizada da Campanha

Execute o verificador de campanha e regras:
- [verify-campaign.mjs](./scripts/verify-campaign.mjs)

Comando:
```powershell
node .agents/skills/campaign-balancer/scripts/verify-campaign.mjs
```
O script valida:
- Existência de todos os assets de cenário e transição referenciados por cada fase.
- Resolução passo a passo de todas as fases no motor `CrystalRules.Board`.
- Coerência das ferramentas habilitadas (`drag`, `cut`, `shake`, `rotate`, `launch`) com as peças presentes na fase.
