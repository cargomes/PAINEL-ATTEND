/**
 * ================================================================
 * ATTEND · Painel Operacional — Dados iniciais
 * ================================================================
 *
 * Este arquivo expõe `window.AppData` com todos os dados de partida
 * usados pelo painel. É o ponto natural para substituição posterior
 * por chamadas ao backend (REST, websocket, etc.) sem precisar mexer
 * em outras partes do código.
 *
 * Esquemas dos objetos abaixo estão documentados via JSDoc para que
 * o backend tenha um contrato claro do que cada tela espera receber.
 * ================================================================
 */

/**
 * Chamada ativa no painel lateral da Tela 1.
 * @typedef {Object} ActiveCall
 * @property {string} plate     Placa do veículo
 * @property {string} type      Tipo de carga / motivo da chamada
 * @property {string} company   Empresa geradora
 * @property {string} origin    Origem dentro do pátio
 * @property {string} driver    Nome do motorista
 * @property {string} cnpj      CNPJ do gerador
 * @property {string} vehicle   Descrição do veículo
 * @property {string} pos       Posição na fila (ex.: "01")
 * @property {number} waitSec   Segundos aguardando (timer ascendente)
 */

/**
 * Ocorrência exibida na lista da Tela 1.
 * @typedef {Object} Occurrence
 * @property {string} id
 * @property {"crit"|"warn"|"ok"|"lab"} cls   Severidade visual
 * @property {"r"|"a"|"g"|"b"}           dot   Cor do dot
 * @property {string} plate                   Placa
 * @property {string} type                    Tipo da ocorrência (UPPERCASE)
 * @property {string} detail                  Descrição complementar
 * @property {string} wt                      Tempo em texto (ex.: "48 min")
 * @property {"r"|"a"|"g"|"b"} wc             Cor do tempo
 * @property {"urgente"|"atencao"|"normal"|"lab"} badge  Classe do badge
 * @property {string} bl                      Texto do badge
 */

/**
 * Item na fila de descartes (Tela 4).
 * @typedef {Object} QueueItem
 * @property {string} id
 * @property {number} pos       Posição na fila (1-based)
 * @property {string} plate
 * @property {boolean} next     true se for o próximo a descarregar
 * @property {boolean} blocked  true se estiver bloqueado
 * @property {string} type      Tipo de descarga / motivo
 * @property {string} eta       ETA em texto (ex.: "12 min" ou "Agora")
 * @property {string} cargo
 * @property {string} company
 */

/* ════════════════════════════════════════════════════════════════
 * CHAMADA ATIVA — Tela 1 (painel lateral esquerdo)
 * ════════════════════════════════════════════════════════════════ */

/** @type {ActiveCall} */
const INITIAL_ACTIVE_CALL = {
  plate: 'ELV3B29',
  type: 'Resíduo Perigoso · Classe I',
  company: 'CONSORCIO AVBN',
  origin: 'PAC. 22 E 23',
  driver: 'Roberto C. Andrade',
  cnpj: '12.345.678/0001-09',
  vehicle: 'Caminhão Truck · Branco',
  pos: '01',
  waitSec: 2008, // 33:28 — exemplo já acima de 30min (faixa "urgente"), segue contando em tempo real
};

/* ════════════════════════════════════════════════════════════════
 * OCORRÊNCIAS INICIAIS — Tela 1 (lista de cards à direita)
 * ════════════════════════════════════════════════════════════════ */

/** @type {Occurrence[]} */
const INITIAL_OCCS = [
  {
    id: 'occ-1',
    cls: 'crit',
    dot: 'r',
    plate: 'ELV3B29',
    type: 'Excesso de tempo parado',
    detail: 'Pátio A · Pos.04 — sem movimentação detectada há 48 min',
    wt: '48 min',
    wc: 'r',
    badge: 'urgente',
    bl: 'Urgente',
  },
  {
    id: 'occ-2',
    cls: 'crit',
    dot: 'r',
    plate: 'DPT0F72',
    type: 'Contrato vencido',
    detail: 'Vencimento: 02/05 — pendente regularização com administrativo',
    wt: '35 min',
    wc: 'r',
    badge: 'urgente',
    bl: 'Urgente',
  },
  {
    id: 'occ-3',
    cls: 'warn',
    dot: 'a',
    plate: 'GPT4F76',
    type: 'Carga não conforme',
    detail: 'Tratabilidade — análise visual pendente',
    wt: '22 min',
    wc: 'a',
    badge: 'atencao',
    bl: 'Atenção',
  },
  {
    id: 'occ-4',
    cls: 'lab',
    dot: 'b',
    plate: 'RPL3E40',
    type: 'Coleta laboratorial',
    detail: 'Amostra enviada — aguardando resultado analítico',
    wt: '25 min',
    wc: 'b',
    badge: 'lab',
    bl: 'Lab',
  },

  // Ocorrência liberada para descarga após conclusão da triagem
  /*{
    id: 'occ-5', // Identificador único da ocorrência
    cls: 'ok', // Classe/Status visual
    dot: 'g', // Cor do indicador (g = green/verde)
    plate: 'JBX5L08', // Placa do veículo
    type: 'Liberado para descarga', // Tipo da ocorrência
    detail: 'Triagem concluída — aguardando vaga no pátio', // Descrição detalhada
    wt: '8 min', // Tempo de espera
    wc: 'g', // Cor do tempo de espera (verde)
    badge: 'normal', // Estilo do badge
    bl: 'Normal', // Texto exibido no badge
  },*/
];

/* ════════════════════════════════════════════════════════════════
 * FILA DE DESCARTES — Tela 4
 * ════════════════════════════════════════════════════════════════ */

/**
 * Apenas os 5 primeiros itens são exibidos na Tela 4 (ver
 * `renderScreen4()` em app.js). Lista fixa de exemplo — sem ciclo
 * de avanço automático; em produção, substitua por dados do backend.
 * @type {QueueItem[]}
 */
const INITIAL_QUEUE = [
  {
    id: 'q-1',
    pos: 1,
    plate: 'MKP7A14',
    next: true,
    blocked: false,
    type: 'Descarga normal',
    eta: 'Agora',
    cargo: 'Sólido Classe II-A',
    company: 'AMB. SUL',
    title: 'AMB. SUL - Pátio Norte',
    desc: 'Sólido Classe II-A — descarga autorizada',
  },
  {
    id: 'q-2',
    pos: 2,
    plate: 'NVP8B30',
    next: false,
    blocked: false,
    type: 'Resíduo classe IIA',
    eta: '5 min',
    cargo: 'Sólido Industrial',
    company: 'TRANSREC',
    title: 'TRANSREC - Pacotes 23 e 25',
    desc: 'Efluente com alta carga de sólidos',
  },
  {
    id: 'q-3',
    pos: 3,
    plate: 'BNT4F12',
    next: false,
    blocked: false,
    type: 'Descarga normal',
    eta: '12 min',
    cargo: 'Misto',
    company: 'BNT LOG.',
    title: 'BNT LOG. - Setor B2',
    desc: 'Carga mista — triagem concluída',
  },
  {
    id: 'q-4',
    pos: 4,
    plate: 'TRV9G20',
    next: false,
    blocked: false,
    type: 'Resíduo perigoso',
    eta: '18 min',
    cargo: 'Classe I',
    company: 'TRV AMB.',
    title: 'TRV AMB. - Área Restrita',
    desc: 'Resíduo Classe I — requer EPI completo',
  },
  {
    id: 'q-5',
    pos: 5,
    plate: 'PRX3A70',
    next: false,
    blocked: false,
    type: 'Triagem + coleta',
    eta: '24 min',
    cargo: 'Misto + Lab',
    company: 'PRAXIS',
    title: 'PRAXIS - Laboratório Central',
    desc: 'Coleta laboratorial + triagem pendente',
  },
];

/* ════════════════════════════════════════════════════════════════
 * EXPORT — exposto em `window.AppData` para o `app.js` consumir.
 * ════════════════════════════════════════════════════════════════ */
window.AppData = {
  INITIAL_ACTIVE_CALL,
  INITIAL_OCCS,
  INITIAL_QUEUE,
};
