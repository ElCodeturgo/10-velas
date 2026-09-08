// js/gameState.js — Estado completo del juego Ten Candles

const GameState = {
  // ── Fase general ──────────────────────────────────────────
  phase: 'menu',        // menu | character | game | finale
  charStep: 1,          // Paso actual de creación (1-7)

  // ── Módulo ───────────────────────────────────────────────
  selectedModule: null, // objeto del módulo seleccionado

  // ── Velas y escenas ───────────────────────────────────────
  candlesLit: 10,
  scene: 1,
  isFinalPhase: false,  // true cuando candlesLit === 1

  // ── Dados ────────────────────────────────────────────────
  playerPool: 10,       // número de dados en el pool comunal
  gmPool: 0,            // dados del DJ
  lastRoll: null,       // { playerDice:[], gmDice:[], success:bool, sixes:int, ones:int }
  diceTrash: 0,         // dados removidos en la escena actual (por 1s)

  // ── Personaje ─────────────────────────────────────────────
  character: {
    name: '',
    appearance: '',
    concept: '',
    finalMessage: '',

    virtue: { name: '', burned: false },
    vice:   { name: '', burned: false },

    // stack[0] = carta activa (arriba). El Tope SIEMPRE está abajo (oculto).
    // stackOrder determina el orden visible: 'moment','virtue','vice'
    stackOrder: ['moment', 'virtue', 'vice'],

    moment: {
      text: '',       // "Encontraré esperanza en..."
      active: false,  // true cuando llegó al top del stack
      lived: false,   // ha sido jugado (éxito → dado esperanza)
      burned: false,
      hopeDie: false, // tiene dado de esperanza
    },

    brink: {
      text: '',       // "Te he visto..."
      active: false,  // activo solo cuando virtue, vice y moment están quemados
      burned: false,
    },

    theyBrink: '',    // "Los he visto..." (naturaleza de Ellos)

    inventory: [],    // array de strings
    conditions: [],   // estados alterados: ["Pierna rota - no puede correr"]

    traitsBurnedThisScene: 0, // max 1 por escena
  },

  // ── Historial para la IA ───────────────────────────────────
  history: [], // [{role:'user'|'model', text:'...'}]

  // ── Verdades establecidas ──────────────────────────────────
  allTruths: [],        // [[verdad1, verdad2, ...], ...] — una sub-array por transición
  currentTruths: [],    // verdades de la transición en curso

  // ── Helpers ───────────────────────────────────────────────
  reset() {
    Object.assign(this, {
      phase: 'menu',
      charStep: 1,
      selectedModule: null,
      candlesLit: 10,
      scene: 1,
      isFinalPhase: false,
      playerPool: 10,
      gmPool: 0,
      lastRoll: null,
      diceTrash: 0,
      history: [],
      allTruths: [],
      currentTruths: [],
      character: {
        name: '', appearance: '', concept: '', finalMessage: '',
        virtue: { name: '', burned: false },
        vice:   { name: '', burned: false },
        stackOrder: ['moment', 'virtue', 'vice'],
        moment: { text: '', active: false, lived: false, burned: false, hopeDie: false },
        brink: { text: '', active: false, burned: false },
        theyBrink: '',
        inventory: [],
        conditions: [],
        traitsBurnedThisScene: 0,
      }
    });
  },

  getActiveCard() {
    // Devuelve la carta activa del stack ('virtue'|'vice'|'moment'|'brink')
    const c = this.character;
    for (const cardName of c.stackOrder) {
      const card = c[cardName];
      if (!card.burned) return cardName;
    }
    // Si todo está quemado, el Tope se activa
    if (!c.brink.burned) {
      c.brink.active = true;
      return 'brink';
    }
    return null;
  },

  canBurnTrait() {
    const c = this.character;
    if (c.traitsBurnedThisScene >= 1) return false;
    const active = this.getActiveCard();
    return active === 'virtue' || active === 'vice';
  },

  burnTrait(traitName) {
    const c = this.character;
    c[traitName].burned = true;
    c.traitsBurnedThisScene++;
  },

  refreshScene() {
    // Al cambiar de escena: recargar pool, resetear quemas del turno
    this.playerPool = this.candlesLit;
    this.diceTrash = 0;
    this.character.traitsBurnedThisScene = 0;
    // Los dados sobrantes van al GM
    // (este cálculo lo hace dice.js)
  },

  extinguishCandle(reason = 'conflict') {
    if (this.candlesLit <= 0) return;
    this.candlesLit--;
    this.scene++;
    this.isFinalPhase = (this.candlesLit === 1);
    // GMPool aumenta con los dados que sobran (calculado externamente)
    return this.candlesLit;
  },

  addToHistory(role, text) {
    this.history.push({ role, text });
    // Mantener últimas 30 entradas para no sobrecargar el contexto
    if (this.history.length > 30) this.history.shift();
  },

  buildContextSummary() {
    const c = this.character;
    const mod = this.selectedModule;

    const virtueStatus = c.virtue.burned ? '[QUEMADA]' : (this.getActiveCard() === 'virtue' ? '[ACTIVA]' : '[INACTIVA]');
    const viceStatus   = c.vice.burned   ? '[QUEMADO]' : (this.getActiveCard() === 'vice'   ? '[ACTIVO]'  : '[INACTIVO]');
    const momentStatus = c.moment.burned ? '[QUEMADO]' : c.moment.lived ? '[VIVIDO]' : (this.getActiveCard() === 'moment' ? '[ACTIVO]' : '[INACTIVO]');
    const brinkStatus  = c.brink.burned  ? '[QUEMADO]' : c.brink.active  ? '[ACTIVO - REVELADO]' : '[OCULTO]';

    const truthsSummary = this.allTruths
      .map((t, i) => `Escena ${i+1}: ${t.join(' | ')}`)
      .join('\n');

    return `
=== ESTADO ACTUAL DEL JUEGO ===
Módulo: ${mod?.title || '?'}
Escena: ${this.scene} | Velas encendidas: ${this.candlesLit}/10
Fase Final: ${this.isFinalPhase ? 'SÍ — ¡los conflictos fallidos matan!' : 'No'}

=== PERSONAJE ===
Nombre: ${c.name}
Aspecto: ${c.appearance}
Concepto: ${c.concept}
Virtud: ${c.virtue.name} ${virtueStatus}
Vicio: ${c.vice.name} ${viceStatus}
Momento: "${c.moment.text}" ${momentStatus}
Dado de Esperanza: ${c.moment.hopeDie ? 'SÍ' : 'No'}
Tope: "${c.brink.text}" ${brinkStatus}
Ellos pueden: ${c.theyBrink}
Inventario: ${c.inventory.length ? c.inventory.join(', ') : 'nada'}
Condiciones/Heridas: ${c.conditions.length ? c.conditions.join('; ') : 'ninguna'}

=== VERDADES ESTABLECIDAS ===
${truthsSummary || '(ninguna aún)'}
    `.trim();
  }
};
