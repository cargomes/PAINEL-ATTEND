# Attend · Painel Operacional

Painel kiosk (display-only) para triagem industrial. Roda em HTML/CSS/JavaScript puro — sem build, sem framework, sem dependências.

Três telas rotacionam automaticamente em loop: chamado ativo + ocorrências, fila de descartes e checklist de EPI. As telas 1 e 2 partem com dados fixos de exemplo (`data.js`), prontos para serem substituídos por dados reais do backend.

---

## Estrutura de pastas

```
.
├── index.html                  ← ponto de entrada
├── README.md
└── assets/
    ├── css/
    │   └── styles.css          ← estilos (com índice / TOC no topo)
    ├── images/
    │   └── logo_w.png
    └── js/
        ├── data.js             ← dados iniciais + tipos (JSDoc)
        └── app.js              ← aplicação principal (state, render, timers)
```

---

## Como rodar

Basta abrir `index.html` em um navegador moderno.

> Se for servir via backend, lembre-se de que `assets/` deve estar acessível pelo mesmo caminho relativo (`./assets/...`).

---

## Telas

| # | Tela               | Conteúdo principal                                    |
|---|--------------------|-------------------------------------------------------|
| 1 | Painel Operacional | Próximo chamado (painel lateral) + lista de ocorrências |
| 2 | Fila de Descartes  | Lista da fila do pátio (posição, placa, tipo, ETA, status) |
| 3 | EPI / Segurança    | Checklist visual com scan animado em loop             |

A rotação automática e a duração de cada tela vivem em `SCREENS_META` no topo de `app.js`.

---

## Atalhos de teclado

| Tecla    | Ação                    |
|----------|-------------------------|
| ← / →    | Navegar entre telas     |
| 1…3      | Ir direto para uma tela |
| F / F11  | Alternar tela cheia     |

---

## Arquitetura

```
data.js                app.js
  │                     │
  │  window.AppData     │   ┌─ state (fonte única da verdade)
  └──────────────────────►  │
                        │   ├─ render*() — recria HTML de cada seção
                        │   ├─ timers   — mutam state e chamam render*()
                        │   └─ eventos  — teclado + dots do topbar
                        ▼
                   DOM (#call-panel, #cards-col, #s2-queue, #s3-grid)
```

- **`state`** é a fonte única da verdade. Toda alteração visual parte de uma mutação no state seguida do `render*()` da seção que mudou.
- **`render*()`** recriam o HTML interno de cada seção a partir do state.
- **Timers** (`setInterval` / `requestAnimationFrame`) atualizam o state e disparam o render correto.
- **Eventos** (teclado, clique nos dots) chamam `showScreen()`.
- Tudo isolado em IIFE — não polui o escopo global.

---

## Integração com backend

O frontend foi escrito pensando em substituir as simulações por dados reais sem mexer na camada de renderização.

### Substituindo a simulação por fetch / WebSocket

As telas 1 e 2 não possuem timers de simulação — os dados de `data.js` são renderizados uma única vez no boot (`INITIAL_ACTIVE_CALL`, `INITIAL_OCCS`, `INITIAL_QUEUE`). Para integrar com o backend, basta atualizar o `state` com os dados reais e chamar o `render*()` correspondente:

```js
// Exemplo — polling REST a cada 10s para a Tela 1
async function pollOperationalScreen() {
  const r = await fetch('/api/operational');
  const data = await r.json();        // { activeCall, occs }
  state.activeCall = data.activeCall;
  state.occs       = data.occs;
  if (state.idx === 0) {              // só re-renderiza se está visível
    renderActiveCallPanel();
    renderOccurrenceCards();
  }
}
setInterval(pollOperationalScreen, 10000);
```

### IDs estáveis do DOM (para integração)

| Tela | Container dinâmico | Função render               |
|------|--------------------|-----------------------------|
| 1    | `#call-panel`      | `renderActiveCallPanel()`   |
| 1    | `#cards-col`       | `renderOccurrenceCards()`   |
| 2    | `#s2-queue`        | `renderScreen2()`           |
| 3    | `#s3-grid`         | `renderScreen3()`           |

### Contratos de dados

Todos os esquemas (`ActiveCall`, `Occurrence`, `QueueItem`) estão documentados via JSDoc no topo de `assets/js/data.js`. Use-os como referência para o que o backend precisa devolver.

---

## Tokens visuais (CSS)

Todas as cores e tipografia vivem em variáveis CSS dentro de `:root` no `styles.css`. Exemplos:

| Token             | Uso                                  |
|-------------------|--------------------------------------|
| `--bg-0`…`--bg-3` | Fundos escalonados (escuro → claro)  |
| `--text-1/2/3`    | Texto primário / secundário / rótulo |
| `--red`           | Severidade crítica / urgente         |
| `--amber`         | Atenção / em monitoramento           |
| `--green`         | OK / liberado                        |
| `--blue`          | Lab / em atendimento                 |
| `--font-sans`     | Outfit (UI geral)                    |
| `--font-mono`     | DM Mono (números / rótulos)          |

Para tema light ou variante de marca, basta sobrescrever `:root` em uma folha posterior.

---

## Acessibilidade

- Estrutura semântica: `<header>`, `<main>`, `<section>`, `<aside>`, `<footer>`, `<nav>`.
- Landmark roles e `aria-label` nos elementos interativos.
- Foco com `:focus-visible` ao usar teclado nos dots de navegação.
