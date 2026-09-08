// js/main.js — Orquestador principal de Ten Candles

// ═══════════════════════════════════════════════════════════════
//  VARIABLES GLOBALES DE UI
// ═══════════════════════════════════════════════════════════════
let gmIsThinking = false;
let ttsEnabled = true;
let currentTruthIndex = 0;
let pendingCandleOut = false;

// ═══════════════════════════════════════════════════════════════
//  INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  TTS.init();
  showView('menu');
  setupMenuListeners();
  setupCharacterListeners();
  setupGameListeners();
});

// ═══════════════════════════════════════════════════════════════
//  NAVEGACIÓN DE VISTAS
// ═══════════════════════════════════════════════════════════════
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + viewId);
  if (target) target.classList.add('active');
  GameState.phase = viewId;
}

function showModal(modalId) {
  document.getElementById('modal-' + modalId)?.classList.add('active');
}

function hideModal(modalId) {
  document.getElementById('modal-' + modalId)?.classList.remove('active');
}

// ═══════════════════════════════════════════════════════════════
//  MENÚ PRINCIPAL
// ═══════════════════════════════════════════════════════════════
function setupMenuListeners() {
  const checkApiKey = (callback) => {
    let key = localStorage.getItem('GROQ_API_KEY');
    if (key) {
      CONFIG.GROQ_API_KEY = key;
      callback();
    } else {
      document.getElementById('api-key-section').style.display = 'block';
      document.getElementById('btn-save-key').onclick = () => {
        const inputKey = document.getElementById('input-api-key').value.trim();
        if (inputKey) {
          localStorage.setItem('GROQ_API_KEY', inputKey);
          CONFIG.GROQ_API_KEY = inputKey;
          document.getElementById('api-key-section').style.display = 'none';
          callback();
        } else {
          alert('Por favor ingresa una API Key válida.');
        }
      };
    }
  };

  document.getElementById('btn-solo')?.addEventListener('click', () => {
    checkApiKey(() => {
      GameState.reset();
      showView('module');
      renderModuleCards();
    });
  });

  document.getElementById('btn-host')?.addEventListener('click', (e) => {
    checkApiKey(() => {
      GameState.reset();
      const btn = e.target;
      const oldText = btn.textContent;
      btn.textContent = 'Iniciando servidor...';
      btn.disabled = true;
      
      MP.initHost((roomCode) => {
        btn.textContent = oldText;
        btn.disabled = false;
        
        document.getElementById('room-banner').style.display = 'block';
        document.getElementById('room-code-display').textContent = roomCode;
        
        showView('module');
        renderModuleCards();
      }, (err) => {
        btn.textContent = oldText;
        btn.disabled = false;
        alert("Error al iniciar el Host: " + err);
      });
    });
  });
  
  document.getElementById('btn-join')?.addEventListener('click', () => {
    document.getElementById('modal-join').style.display = 'flex';
  });

  document.getElementById('btn-confirm-join')?.addEventListener('click', () => {
    const name = document.getElementById('input-join-name').value.trim();
    const code = document.getElementById('input-join-code').value.trim();
    const errEl = document.getElementById('join-error');
    
    if (!name || code.length !== 4) {
      errEl.textContent = 'Nombre y código de 4 letras requeridos.';
      return;
    }
    
    errEl.textContent = 'Conectando...';
    
    MP.initClient(code, name, () => {
      document.getElementById('modal-join').style.display = 'none';
      const viewMenu = document.getElementById('view-menu');
      if (viewMenu) viewMenu.classList.remove('active');
      document.getElementById('character-creation-container').style.display = 'block';
      document.getElementById('room-banner').style.display = 'block';
      document.getElementById('room-code-display').textContent = 'CONECTADO A: ' + code.toUpperCase();
    }, (errorMsg) => {
      errEl.textContent = 'Error: ' + errorMsg;
    });
  });
}

function renderModuleCards() {
  const container = document.getElementById('module-cards');
  if (!container) return;
  container.innerHTML = '';
  Object.values(MODULES).forEach(mod => {
    const card = document.createElement('div');
    card.className = 'module-card';
    card.innerHTML = `
      <div class="module-icon">${mod.icon}</div>
      <h3>${mod.title}</h3>
      <p class="module-tagline">${mod.tagline}</p>
      <p class="module-desc">${mod.description.substring(0, 180)}...</p>
      <button class="btn-primary btn-select-module" data-id="${mod.id}">Seleccionar</button>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('.btn-select-module').forEach(btn => {
    btn.addEventListener('click', () => selectModule(btn.dataset.id));
  });
}

function selectModule(moduleId) {
  GameState.selectedModule = MODULES[moduleId];
  showView('character');
  goToCharStep(1);
}

// ═══════════════════════════════════════════════════════════════
//  CREACIÓN DE PERSONAJE — 7 PASOS
// ═══════════════════════════════════════════════════════════════
function setupCharacterListeners() {
  // Paso 1: Rasgos
  document.getElementById('btn-step1-next')?.addEventListener('click', () => {
    const virtue = document.getElementById('input-virtue')?.value.trim();
    const vice   = document.getElementById('input-vice')?.value.trim();
    if (!virtue || !vice) return showError('Escribe una Virtud y un Vicio.');
    GameState.character.virtue.name = virtue;
    GameState.character.vice.name   = vice;
    goToCharStep(2);
  });

  // Paso 2: Módulo (solo avance)
  document.getElementById('btn-step2-next')?.addEventListener('click', () => goToCharStep(3));
  document.getElementById('btn-read-module')?.addEventListener('click', () => {
    const mod = GameState.selectedModule;
    TTS.speak(mod.description + ' Objetivo: ' + mod.objective);
  });

  // Paso 3: Concepto
  document.getElementById('btn-step3-next')?.addEventListener('click', () => {
    const name   = document.getElementById('input-name')?.value.trim();
    const appear = document.getElementById('input-appearance')?.value.trim();
    const conc   = document.getElementById('input-concept')?.value.trim();
    if (!name || !appear || !conc) return showError('Completa nombre, aspecto y concepto.');
    GameState.character.name       = name;
    GameState.character.appearance = appear;
    GameState.character.concept    = conc;
    goToCharStep(4);
  });

  // Paso 4: Momento
  document.getElementById('btn-step4-next')?.addEventListener('click', () => {
    const moment = document.getElementById('input-moment')?.value.trim();
    if (!moment) return showError('Escribe tu Momento.');
    GameState.character.moment.text = moment;
    goToCharStep(5);
  });

  // Paso 5: Tope y Ellos
  document.getElementById('btn-step5-next')?.addEventListener('click', () => {
    const brink = document.getElementById('input-brink')?.value.trim();
    const they  = document.getElementById('input-they')?.value.trim();
    if (!brink || !they) return showError('Escribe tu Tope y lo que Ellos pueden hacer.');
    GameState.character.brink.text  = brink;
    GameState.character.theyBrink   = they;
    goToCharStep(6);
  });

  // Paso 6: Organizar pila — solo avance
  document.getElementById('btn-step6-next')?.addEventListener('click', () => goToCharStep(7));
  setupStackReorder();

  // Paso 7: Inventario y mensaje final
  document.getElementById('btn-add-item')?.addEventListener('click', () => {
    const input = document.getElementById('input-item');
    const item  = input?.value.trim();
    if (!item) return;
    GameState.character.inventory.push(item);
    renderInventoryList('char-inventory-list');
    if (input) input.value = '';
  });

  document.getElementById('btn-start-game')?.addEventListener('click', async () => {
    const msg = document.getElementById('input-final-message')?.value.trim();
    if (!msg) return showError('Graba tu mensaje final antes de comenzar.');
    GameState.character.finalMessage = msg;
    await startGame();
  });
}

function goToCharStep(step) {
  GameState.charStep = step;
  document.querySelectorAll('.char-step').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`char-step-${step}`);
  if (target) {
    target.classList.add('active');
    updateStepIndicator(step);
  }

  // Rellenar datos dinámicos en pasos
  if (step === 2) {
    const mod = GameState.selectedModule;
    const el = document.getElementById('module-synopsis');
    if (el) el.innerHTML = `<h3>${mod.icon} ${mod.title}</h3><p>${mod.description}</p><p><strong>Objetivo:</strong> ${mod.objective}</p>`;
  }
  if (step === 6) renderStackUI();
}

function updateStepIndicator(step) {
  document.querySelectorAll('.step-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i + 1 === step);
    dot.classList.toggle('done', i + 1 < step);
  });
}

function setupStackReorder() {
  // Simple stack reorder con botones arriba/abajo
  document.getElementById('stack-up')?.addEventListener('click', () => moveStack(-1));
  document.getElementById('stack-down')?.addEventListener('click', () => moveStack(1));
}

function renderStackUI() {
  const container = document.getElementById('stack-display');
  if (!container) return;
  const c = GameState.character;
  const items = c.stackOrder.map(name => {
    const labels = { virtue: c.virtue.name, vice: c.vice.name, moment: c.moment.text };
    const icons  = { virtue: '⭐', vice: '💀', moment: '💫' };
    return `<div class="stack-item" data-name="${name}">${icons[name]} <strong>${name === 'moment' ? 'Momento' : name === 'virtue' ? 'Virtud' : 'Vicio'}:</strong> ${labels[name]}</div>`;
  }).join('');
  container.innerHTML = items + `<div class="stack-item stack-brink">🔒 Tope (siempre al fondo, secreto)</div>`;
}

function moveStack(dir) {
  const selected = document.querySelector('.stack-item.selected');
  if (!selected) {
    document.querySelector('.stack-item:not(.stack-brink)')?.classList.add('selected');
    return;
  }
  const name = selected.dataset.name;
  const order = GameState.character.stackOrder;
  const idx = order.indexOf(name);
  const newIdx = Math.max(0, Math.min(order.length - 1, idx + dir));
  [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
  renderStackUI();
  document.querySelectorAll('.stack-item')[newIdx]?.classList.add('selected');
}

function renderInventoryList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = GameState.character.inventory
    .map((item, i) => `<li><span>${item}</span><button class="btn-icon" onclick="removeInventoryItem(${i})">✕</button></li>`)
    .join('');
}

function removeInventoryItem(index) {
  GameState.character.inventory.splice(index, 1);
  renderInventoryList('char-inventory-list');
  renderInventoryList('game-inventory-list');
}

// ═══════════════════════════════════════════════════════════════
//  INICIO DEL JUEGO
// ═══════════════════════════════════════════════════════════════
async function startGame() {
  showView('game');
  initCandleUI();
  updateGameHUD();
  renderCharacterSheet();
  renderInventoryList('game-inventory-list');

  appendGMMessage('🕯️ *Las luces se apagan. Solo quedan las velas...*', false);
  await sleep(1000);

  setGMThinking(true);
  try {
    const opening = await GroqGM.openingNarration();
    setGMThinking(false);
    appendGMMessage(opening, true);
  } catch (e) {
    setGMThinking(false);
    appendGMMessage(`⚠️ Error al conectar con el Game Master: ${e.message}`, false);
  }
}

// ═══════════════════════════════════════════════════════════════
//  TABLERO DE JUEGO — LISTENERS
// ═══════════════════════════════════════════════════════════════
function setupGameListeners() {
  // Enviar mensaje
  const sendBtn = document.getElementById('btn-send');
  const chatInput = document.getElementById('chat-input');

  sendBtn?.addEventListener('click', sendPlayerMessage);
  chatInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPlayerMessage(); }
  });

  
    // --- Lógica de Rol Libre (Pausar GM) ---
  let gmPaused = false;
  let queuedMessages = 0;

  const btnPauseGM = document.getElementById('btn-pause-gm');
  const btnCallGM = document.getElementById('btn-call-gm');

  if (btnPauseGM && btnCallGM) {
    btnPauseGM.addEventListener('click', () => {
      gmPaused = true;
      btnPauseGM.style.display = 'none';
      btnCallGM.style.display = 'inline-block';
      appendGMMessage('🔇 **Modo Rol Libre activado.** El GM no interrumpirá. Hablen libremente. Presiona "Llamar al GM" cuando quieran que el mundo reaccione.', false);
    });

    btnCallGM.addEventListener('click', async () => {
      gmPaused = false;
      btnCallGM.style.display = 'none';
      btnPauseGM.style.display = 'inline-block';
      
      if (queuedMessages > 0) {
        queuedMessages = 0;
        setGMThinking(true);
        try {
          const response = await GroqGM.ask("El grupo ha estado charlando o actuando entre ellos. Reacciona a toda la conversación anterior, avanza la trama y cede la palabra o pide tirada de dados si alguien intentó una acción de riesgo.");
          setGMThinking(false);
          appendGMMessage(response, true);
          if (response.includes('[TIRADA DE DADOS REQUERIDA]')) {
            showRollPrompt("Acción del grupo");
          }
        } catch(e) {
          setGMThinking(false);
          appendGMMessage(`⚠️ Error: ${e.message}`, false);
        }
      } else {
        appendGMMessage('🔊 **El GM está de vuelta.** Esperando tu acción.', false);
      }
    });
  }

  // Tirar dados (deshabilitado por defecto)
  const rollBtn = document.getElementById('btn-roll');
  if (rollBtn) rollBtn.disabled = true;
  rollBtn?.addEventListener('click', rollDice);

  // TTS toggle
  document.getElementById('btn-tts-toggle')?.addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    document.getElementById('btn-tts-toggle').textContent = ttsEnabled ? '🔊' : '🔇';
    if (!ttsEnabled) TTS.stop();
  });

  // Quemar Rasgo
  document.getElementById('btn-burn-virtue')?.addEventListener('click', () => burnTrait('virtue'));
  document.getElementById('btn-burn-vice')?.addEventListener('click',   () => burnTrait('vice'));

  // Vivir Momento
  document.getElementById('btn-live-moment')?.addEventListener('click', liveMoment);

  // Abrazar Tope
  document.getElementById('btn-embrace-brink')?.addEventListener('click', embraceBrink);

  // Añadir estado de salud
  document.getElementById('btn-add-condition')?.addEventListener('click', () => {
    const input = document.getElementById('input-condition');
    const cond  = input?.value.trim();
    if (!cond) return;
    GameState.character.conditions.push(cond);
    renderConditions();
    if (input) input.value = '';
  });

  // Añadir ítem al inventario
  document.getElementById('btn-add-inv')?.addEventListener('click', () => {
    const input = document.getElementById('input-inv-item');
    const item  = input?.value.trim();
    if (!item) return;
    GameState.character.inventory.push(item);
    renderInventoryList('game-inventory-list');
    if (input) input.value = '';
  });
}

// ═══════════════════════════════════════════════════════════════
//  ENVIAR MENSAJE AL GM
// ═══════════════════════════════════════════════════════════════
async function sendPlayerMessage() {
  if (gmIsThinking) return;
  const input = document.getElementById('chat-input');
  const msg   = input?.value.trim();
  if (!msg) return;

  input.value = '';

  // --- MODO CLIENTE MULTIJUGADOR ---
  if (MP.isClient) {
    appendPlayerMessage(msg);
    MP.sendToHost({ type: 'player_msg', text: msg, name: MP.playerName });
    return;
  }

  // --- MODO HOST O SOLITARIO ---
  appendPlayerMessage(msg);
  
  if (MP.isHost) {
    const fullMsg = `[Host]: ${msg}`;
    MP.broadcast({ type: 'chat_player', msg: fullMsg });
    GameState.addToHistory('user', fullMsg);
  } else {
    GameState.addToHistory('user', msg);
  }

  if (typeof gmPaused !== 'undefined' && gmPaused) {
    if (typeof queuedMessages !== 'undefined') queuedMessages++;
    return;
  }

  setGMThinking(true);
  if (MP.isHost) MP.broadcast({ type: 'gm_thinking', state: true });

  try {
    const response = await GroqGM.ask(MP.isHost ? `[Host]: ${msg}` : msg);
    setGMThinking(false);
    appendGMMessage(response, true);

    // Detectar si el GM pide tirada
    if (response.includes('[TIRADA DE DADOS REQUERIDA]')) {
      showRollPrompt(msg);
    }

    // Detectar si una vela se apaga
    if (response.includes('[VELA APAGADA]')) {
      await handleCandleOut('gm_narrative');
    }

    // Detectar momento vivido
    if (response.includes('[MOMENTO VIVIDO]')) {
      handleMomentLived();
    }

  } catch (e) {
    setGMThinking(false);
    appendGMMessage(`⚠️ Error: ${e.message}`, false);
  }
}

// ═══════════════════════════════════════════════════════════════
//  MECÁNICA DE DADOS
// ═══════════════════════════════════════════════════════════════
let pendingRollAction = '';

function showRollPrompt(action) {
  pendingRollAction = action;
  const rollActionText = document.getElementById('roll-action-text');
  if (rollActionText) rollActionText.textContent = `Acción: "${action}"`;
  
  // Habilitar botón de la UI principal también
  const rollBtn = document.getElementById('btn-roll');
  if (rollBtn) {
    rollBtn.disabled = false;
    rollBtn.classList.add('pulse-button');
  }
  
  // Limpiar áreas de dados
  document.getElementById('dice-result-area-modal').innerHTML = '';
  document.getElementById('dice-result-area').innerHTML = '';
  
  showModal('dice');
}

function closeRollModal() { 
  hideModal('dice'); 
  const rollBtn = document.getElementById('btn-roll');
  if (rollBtn) rollBtn.classList.remove('pulse-button');
}

async function rollDice() {
  if (gmIsThinking) return;
  const gs = GameState;

  // Deshabilitar botón para evitar clics múltiples
  const rollBtn = document.getElementById('btn-roll');
  if (rollBtn) {
    rollBtn.disabled = true;
    rollBtn.classList.remove('pulse-button');
  }

  if (gs.playerPool <= 0) {
    appendGMMessage('⚫ No quedan dados en el pool. El conflicto falla automáticamente.', false);
    hideModal('dice');
    await handleCandleOut('no_dice');
    return;
  }

  // Animar dados en ambos lugares (modal y sidebar)
  const diceAreaModal = document.getElementById('dice-result-area-modal');
  const diceAreaSide = document.getElementById('dice-result-area');
  
  if (diceAreaModal) {
    diceAreaModal.innerHTML = '<div style="text-align:center; padding:20px;">🎲 Tirando dados...</div>';
    diceAreaModal.classList.add('rolling');
  }
  if (diceAreaSide) diceAreaSide.classList.add('rolling');
  
  await sleep(CONFIG.DICE_ANIMATION_MS);
  
  if (diceAreaModal) diceAreaModal.classList.remove('rolling');
  if (diceAreaSide) diceAreaSide.classList.remove('rolling');

  const hasHopeDie = gs.character.moment.hopeDie;
  const result = Dice.roll(gs.playerPool, gs.gmPool, hasHopeDie);
  const applied = Dice.applyResult(result);

  // Mostrar resultado visual
  renderDiceResult(result, applied);
  updateGameHUD();
  
  // Dar un segundito para ver los dados antes de cerrar el modal
  await sleep(1500);
  hideModal('dice');

  if (result.success && result.playerWinsNarration) {
    // EL JUGADOR GANA LA NARRATIVA
    appendGMMessage('✅ **¡Éxito! Tienes los derechos de narración.**\n\nDescribe cómo lograste la acción y qué ocurre a continuación.', false);
    GameState.addToHistory('model', `[Nota de Sistema: El jugador tiró los dados, tuvo éxito y ganó los derechos narrativos sobre la acción "${pendingRollAction}". El jugador narrará a continuación lo que sucede.]`);
    updateCharacterSheetState();
    
    // Enfocar input para que el jugador narre
    document.getElementById('chat-input')?.focus();
  } else {
    // EL GM GANA LA NARRATIVA O FALLA
    setGMThinking(true);
    try {
      const narration = await GroqGM.narrateRollResult(result, pendingRollAction || 'acción del personaje');
      setGMThinking(false);
      appendGMMessage(narration, true);

      if (applied.candleOut) {
        await handleCandleOut('conflict_fail');
      }

      updateCharacterSheetState();
    } catch (e) {
      setGMThinking(false);
      appendGMMessage(`⚠️ Error de narración: ${e.message}`, false);
      if (applied.candleOut) await handleCandleOut('conflict_fail');
    }
  }
}

function renderDiceResult(result, applied) {
  const area = document.getElementById('dice-result-area');
  if (!area) return;

  const dieHTML = (val, type) => {
    let cls = 'die';
    if (val === 6) cls += ' die-six';
    else if (val === 1) cls += ' die-one';
    if (type === 'hope') cls += ' die-hope';
    return `<span class="${cls}">${val}</span>`;
  };

  let html = '<div class="dice-group"><span class="dice-label">Jugador</span><div class="dice-row">';
  result.playerDice.forEach(d => { html += dieHTML(d, 'player'); });
  html += '</div></div>';

  if (result.hopeDieResult !== null) {
    html += `<div class="dice-group"><span class="dice-label">🌟 Esperanza</span><div class="dice-row">${dieHTML(result.hopeDieResult, 'hope')}</div></div>`;
  }

  if (result.gmDice.length > 0) {
    html += '<div class="dice-group"><span class="dice-label">GM</span><div class="dice-row">';
    result.gmDice.forEach(d => { html += dieHTML(d, 'gm'); });
    html += '</div></div>';
  }

  const outcomeClass = result.success ? 'outcome-success' : 'outcome-fail';
  const outcomeText  = result.success
    ? (result.playerWinsNarration ? '✅ Éxito — Narras tú' : '✅ Éxito — Narra el GM')
    : '❌ Fracaso — Se apaga una vela';

  html += `<div class="outcome ${outcomeClass}">${outcomeText}</div>`;
  html += `<div class="outcome-detail">${applied.message}</div>`;

  area.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
//  VELAS
// ═══════════════════════════════════════════════════════════════
function initCandleUI() {
  const container = document.getElementById('candles-circle');
  if (!container) return;
  container.innerHTML = '';

  const total = CONFIG.TOTAL_CANDLES;
  for (let i = 0; i < total; i++) {
    const angle  = (i * 36 - 90) * (Math.PI / 180);
    const radius = 110;
    const cx = 140, cy = 140;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    const candle = document.createElement('div');
    candle.className = 'candle lit';
    candle.id = `candle-${i}`;
    candle.style.left = `${x - 18}px`;
    candle.style.top  = `${y - 40}px`;
    candle.innerHTML  = `
      <div class="flame"><div class="flame-inner"></div></div>
      <div class="candle-body"></div>
    `;
    container.appendChild(candle);
  }
}

async function handleCandleOut(reason) {
  const gs = GameState;
  const candleIdx = gs.candlesLit; // la vela que se apaga es la que tiene ese índice
  
  // Apagar la vela visualmente
  extinguishCandleUI(candleIdx - 1);
  await sleep(CONFIG.CANDLE_OUT_DELAY_MS);

  updateGameHUD();

  // ¿Última vela?
  if (gs.candlesLit <= 0) {
    await triggerFinale();
    return;
  }

  // ¿Fase Final?
  if (gs.isFinalPhase) {
    appendGMMessage('🕯️ *Queda una sola vela. La Fase Final ha comenzado. Los conflictos fallidos ahora significan muerte.*', false);
  }

  // Iniciar Fase de Verdades
  await startTruthPhase();
}

function extinguishCandleUI(index) {
  const candle = document.getElementById(`candle-${index}`);
  if (candle) {
    candle.classList.remove('lit');
    candle.classList.add('out');
  }
}

// ═══════════════════════════════════════════════════════════════
//  FASE DE VERDADES
// ═══════════════════════════════════════════════════════════════
async function startTruthPhase() {
  const candlesLeft = GameState.candlesLit;
  GameState.currentTruths = [];
  currentTruthIndex = 0;

  // Calcular cuántas verdades necesita cada parte
  // Total verdades = número de velas encendidas. La última es colectiva "y estamos vivos"
  const totalTruths = candlesLeft;
  const playerTruths = Math.ceil(totalTruths / 2);
  const gmTruthsCount = Math.max(0, totalTruths - playerTruths - 1); // -1 por "y estamos vivos"

  // Mostrar modal de verdades
  const modal = document.getElementById('modal-truth');
  const intro = document.getElementById('truth-intro');
  const content = document.getElementById('truth-content');
  const finalBtn = document.getElementById('btn-truth-final');

  if (intro) intro.textContent = `Estas cosas son ciertas. El mundo está oscuro. — ${totalTruths} verdad(es) a establecer.`;
  if (content) content.innerHTML = '';
  if (finalBtn) finalBtn.style.display = 'none';
  showModal('truth');

  // Turno del jugador
  await collectPlayerTruths(playerTruths, content);

  // Turno del GM
  if (gmTruthsCount > 0) {
    const gmTruths = await GroqGM.generateGMTruths(gmTruthsCount);
    gmTruths.forEach(truth => {
      GameState.currentTruths.push(truth);
      appendTruthItem(content, truth, 'gm');
    });
  }

  // Frase ritual final
  if (finalBtn) {
    finalBtn.style.display = 'block';
    finalBtn.onclick = async () => {
      hideModal('truth');
      appendGMMessage('🕯️ *Y estamos vivos.*', false);
      TTS.speak('Y estamos vivos.');

      // Guardar verdades
      GameState.allTruths.push([...GameState.currentTruths]);

      // Nueva escena
      GameState.refreshScene();
      await sleep(1500);

      // GM narra nueva escena
      setGMThinking(true);
      try {
        const narration = await GroqGM.sceneTransitionNarration(GameState.currentTruths);
        setGMThinking(false);
        appendGMMessage(narration, true);
        updateGameHUD();
        updateCharacterSheetState();
      } catch (e) {
        setGMThinking(false);
        appendGMMessage(`Error al narrar nueva escena: ${e.message}`, false);
      }
    };
  }
}

function collectPlayerTruths(count, container) {
  return new Promise(resolve => {
    let collected = 0;

    function addTruthInput() {
      if (collected >= count) { resolve(); return; }

      const wrapper = document.createElement('div');
      wrapper.className = 'truth-input-wrapper';
      wrapper.innerHTML = `
        <p class="truth-prompt">Verdad ${collected + 1} de ${count} (tú):</p>
        <div class="truth-input-row">
          <input type="text" class="truth-input" placeholder="Una verdad sobre lo que ahora es cierto..." />
          <button class="btn-primary btn-confirm-truth">Confirmar</button>
        </div>
      `;
      container.appendChild(wrapper);
      wrapper.querySelector('input').focus();

      wrapper.querySelector('.btn-confirm-truth').addEventListener('click', () => {
        const val = wrapper.querySelector('input').value.trim();
        if (!val) return;
        GameState.currentTruths.push(val);
        wrapper.innerHTML = `<div class="truth-item player">👤 ${val}</div>`;
        collected++;
        addTruthInput();
      });
    }

    addTruthInput();
  });
}

function appendTruthItem(container, text, who) {
  const div = document.createElement('div');
  div.className = `truth-item ${who}`;
  div.textContent = (who === 'gm' ? '🕯️ ' : '👤 ') + text;
  container.appendChild(div);
}

// ═══════════════════════════════════════════════════════════════
//  RASGOS — QUEMAR
// ═══════════════════════════════════════════════════════════════
function burnTrait(traitName) {
  const gs = GameState;
  const c  = gs.character;

  if (c[traitName].burned) return showError(`${traitName} ya está quemado.`);
  if (gs.getActiveCard() !== traitName) return showError(`${traitName} no está activo ahora.`);
  if (!gs.canBurnTrait()) return showError('Ya quemaste un rasgo en esta escena.');

  gs.burnTrait(traitName);

  // Re-tirar los 1s del último resultado
  if (gs.lastRoll && gs.lastRoll.ones > 0) {
    const rerolled = Dice.rerollOnes(gs.lastRoll.ones);
    appendGMMessage(`🔥 Quemas tu ${traitName === 'virtue' ? 'Virtud' : 'Vicio'} "${c[traitName].name}". Re-tirada de ${gs.lastRoll.ones} dado(s): [${rerolled.join(', ')}]`, false);
    
    // Recalcular: ¿alguno de los re-tirados es 6?
    const newSixes = rerolled.filter(d => d === 6).length;
    const newOnes  = rerolled.filter(d => d === 1).length;
    gs.playerPool = Math.max(0, gs.playerPool - newOnes);

    if (newSixes > 0 || (gs.lastRoll.sixes > 0)) {
      appendGMMessage(`✅ Resultado final: éxito. Pierdes ${newOnes} dado(s) adicionale(s).`, false);
    } else if (gs.lastRoll.sixes === 0) {
      appendGMMessage(`⚠️ Aún sin seises. El conflicto sigue fallando.`, false);
    }
  }

  updateCharacterSheetState();
  updateGameHUD();
}

// ═══════════════════════════════════════════════════════════════
//  MOMENTO
// ═══════════════════════════════════════════════════════════════
async function liveMoment() {
  const gs = GameState;
  const c  = gs.character;

  if (gs.getActiveCard() !== 'moment') return showError('Tu Momento no está activo todavía.');
  if (c.moment.lived || c.moment.burned) return showError('Tu Momento ya fue jugado.');

  const action = document.getElementById('chat-input')?.value.trim() || 'vivir el Momento';
  appendGMMessage(`💫 *Intentas vivir tu Momento: "${c.moment.text}"*`, false);

  // Tirar dados
  const result = Dice.roll(gs.playerPool, gs.gmPool, false);
  renderDiceResult(result, { message: result.success ? 'Éxito' : 'Fracaso' });

  if (result.success) {
    c.moment.lived    = true;
    c.moment.burned   = true;
    c.moment.hopeDie  = true;
    appendGMMessage(`🌟 **¡Esperanza inspirada!** Ganas un Dado de Esperanza.`, false);
    TTS.speak('¡Esperanza inspirada! Ganas un Dado de Esperanza.');
  } else {
    c.moment.burned = true;
    appendGMMessage(`💔 **La esperanza se pierde.** Una vela se apaga.`, false);
    Dice.applyResult({ success: false, ones: 0, sixes: 0 });
    await handleCandleOut('moment_fail');
  }

  updateCharacterSheetState();
  updateGameHUD();
}

// ═══════════════════════════════════════════════════════════════
//  TOPE — ABRAZAR
// ═══════════════════════════════════════════════════════════════
async function embraceBrink() {
  const gs = GameState;
  const c  = gs.character;

  if (gs.getActiveCard() !== 'brink') return showError('Tu Tope no está activo aún.');
  if (c.brink.burned) return showError('Tu Tope ya fue quemado.');

  appendGMMessage(`🔒 *Abrazas tu Tope: "${c.brink.text}". Re-tirando todo el pool...*`, false);

  const result = Dice.rerollAll(gs.playerPool, c.moment.hopeDie);

  if (result.success) {
    appendGMMessage(`💀 Tope abrazado con éxito. Mantienes tu Tope para el futuro.`, false);
    gs.playerPool = Math.max(0, gs.playerPool - result.ones);
  } else {
    c.brink.burned = true;
    if (c.moment.hopeDie) c.moment.hopeDie = false;
    appendGMMessage(`💀 El Tope te ha consumido. Se quema, pierdes el dado de esperanza, y una vela se apaga.`, false);
    await handleCandleOut('brink_fail');
  }

  updateCharacterSheetState();
  updateGameHUD();
}

function handleMomentLived() {
  const c = GameState.character;
  if (!c.moment.burned) {
    c.moment.lived  = true;
    c.moment.burned = true;
    c.moment.hopeDie = true;
  }
  updateCharacterSheetState();
  updateGameHUD();
}

// ═══════════════════════════════════════════════════════════════
//  FINAL DEL JUEGO
// ═══════════════════════════════════════════════════════════════
async function triggerFinale() {
  showView('finale');
  const c = GameState.character;

  document.getElementById('finale-char-name').textContent = c.name;
  document.getElementById('finale-module').textContent = GameState.selectedModule?.title;

  setGMThinking(true);
  let deathNarration = '';
  try {
    deathNarration = await GroqGM.narrateDeath(pendingRollAction || 'su último acto de valentía');
  } catch (e) {
    deathNarration = `Estas cosas son ciertas. El mundo está oscuro. ${c.name} ya no está.`;
  }
  setGMThinking(false);

  document.getElementById('finale-narration').textContent = deathNarration;
  TTS.speak(deathNarration, () => {
    // Después de la narración, reproducir el mensaje final
    setTimeout(() => {
      const msgBox = document.getElementById('finale-message');
      if (msgBox) {
        msgBox.textContent = `"${c.finalMessage}"`;
        msgBox.style.display = 'block';
        TTS.speak(c.finalMessage);
      }
    }, 1500);
  });
}

// ═══════════════════════════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════════════════════════
function appendGMMessage(text, speak) {
  const log = document.getElementById('chat-log');
  if (!log) return;

  const bubble = document.createElement('div');
  bubble.className = 'msg gm-msg';
  bubble.innerHTML = `<span class="msg-icon">🕯️</span><div class="msg-text">${text.replace(/\n/g, '<br>').replace(/\[TIRADA DE DADOS REQUERIDA\]/g, '<strong class="roll-prompt">🎲 TIRADA REQUERIDA</strong>').replace(/\[VELA APAGADA\]/g, '<strong class="candle-out">⚫ VELA APAGADA</strong>').replace(/\[MOMENTO VIVIDO\]/g, '<strong class="moment-lived">💫 MOMENTO VIVIDO</strong>')}</div>`;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;

  if (speak && ttsEnabled) {
    TTS.speak(text);
  }
}

function appendPlayerMessage(text) {
  const log = document.getElementById('chat-log');
  if (!log) return;
  const bubble = document.createElement('div');
  bubble.className = 'msg player-msg';
  bubble.innerHTML = `<div class="msg-text">${text}</div><span class="msg-icon">👤</span>`;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}

function setGMThinking(val) {
  gmIsThinking = val;
  const indicator = document.getElementById('gm-thinking');
  if (indicator) indicator.style.display = val ? 'flex' : 'none';
  const sendBtn = document.getElementById('btn-send');
  if (sendBtn) sendBtn.disabled = val;
}

function updateGameHUD() {
  const gs = GameState;
  
  // Velas
  const el = document.getElementById('hud-candles');
  if (el) el.textContent = `${gs.candlesLit}/10`;

  // Escena
  const es = document.getElementById('hud-scene');
  if (es) es.textContent = gs.scene;

  // Pool
  const ep = document.getElementById('hud-pool');
  if (ep) ep.textContent = gs.playerPool;

  // GM Pool
  const eg = document.getElementById('hud-gm-pool');
  if (eg) eg.textContent = gs.gmPool;

  // Fase final
  const ef = document.getElementById('final-phase-banner');
  if (ef) ef.style.display = gs.isFinalPhase ? 'block' : 'none';

  // Dado de esperanza
  const eh = document.getElementById('hud-hope');
  if (eh) eh.style.display = gs.character.moment.hopeDie ? 'inline-block' : 'none';
}

function renderCharacterSheet() {
  const c = GameState.character;
  ['name','appearance','concept','virtue','vice','moment','brink'].forEach(field => {
    const el = document.getElementById(`sheet-${field}`);
    if (!el) return;
    if (field === 'virtue') el.textContent = c.virtue.name;
    else if (field === 'vice') el.textContent = c.vice.name;
    else if (field === 'moment') el.textContent = c.moment.text;
    else if (field === 'brink') el.textContent = '???';
    else el.textContent = c[field];
  });
  updateCharacterSheetState();
}

function updateCharacterSheetState() {
  const c = GameState.character;
  const active = GameState.getActiveCard();

  // Virtue
  updateTraitUI('virtue', c.virtue.burned, active === 'virtue');
  // Vice
  updateTraitUI('vice',   c.vice.burned,   active === 'vice');
  // Moment
  const momentEl = document.getElementById('trait-moment');
  if (momentEl) {
    momentEl.className = 'trait-card' + (c.moment.burned ? ' burned' : active === 'moment' ? ' active-card' : ' inactive');
  }
  // Brink
  const brinkEl = document.getElementById('trait-brink');
  if (brinkEl) {
    brinkEl.className = 'trait-card brink-card' + (c.brink.burned ? ' burned' : c.brink.active ? ' active-card revealed' : ' hidden-card');
    document.getElementById('sheet-brink').textContent = c.brink.active ? c.brink.text : '???';
  }

  // Botones
  document.getElementById('btn-burn-virtue')?.toggleAttribute('disabled', c.virtue.burned || active !== 'virtue' || !GameState.canBurnTrait());
  document.getElementById('btn-burn-vice')?.toggleAttribute('disabled',   c.vice.burned   || active !== 'vice'   || !GameState.canBurnTrait());
  document.getElementById('btn-live-moment')?.toggleAttribute('disabled', c.moment.burned || active !== 'moment');
  document.getElementById('btn-embrace-brink')?.toggleAttribute('disabled', c.brink.burned || active !== 'brink');

  // Dado de esperanza
  const hopeEl = document.getElementById('hope-die-indicator');
  if (hopeEl) hopeEl.style.display = c.moment.hopeDie ? 'block' : 'none';
}

function updateTraitUI(name, burned, isActive) {
  const el = document.getElementById(`trait-${name}`);
  if (!el) return;
  el.className = 'trait-card' + (burned ? ' burned' : isActive ? ' active-card' : ' inactive');
}

function renderConditions() {
  const c = GameState.character;
  const container = document.getElementById('conditions-list');
  if (!container) return;
  container.innerHTML = c.conditions
    .map((cond, i) => `<li>${cond} <button class="btn-icon" onclick="removeCondition(${i})">✕</button></li>`)
    .join('') || '<li class="no-conditions">Sin heridas ni estados</li>';
}

function removeCondition(index) {
  GameState.character.conditions.splice(index, 1);
  renderConditions();
}

function showError(msg) {
  const toast = document.getElementById('error-toast');
  if (!toast) return alert(msg);
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }


// Añadir al final de main.js — actualizar visual del pool de dados
function updateDicePoolVisual() {
  const container = document.getElementById('dice-pool-visual');
  if (!container) return;
  const pool = GameState.playerPool;
  const hasHope = GameState.character.moment.hopeDie;
  let html = '';
  for (let i = 0; i < 10; i++) {
    if (i < pool) html += `<div class="pool-die">${i + 1}</div>`;
    else html += `<div class="pool-die empty"></div>`;
  }
  if (hasHope) html += `<div class="pool-die hope">★</div>`;
  container.innerHTML = html;
}

// Sobreescribir updateGameHUD para incluir updateDicePoolVisual
const _origUpdateHUD = updateGameHUD;
const updateGameHUDExtended = function() {
  _origUpdateHUD();
  updateDicePoolVisual();
};

// Reemplazar la referencia
window.updateGameHUD = updateGameHUDExtended;


// ----------------------------------------------------
// SPEECH TO TEXT (VOZ A TEXTO)
// ----------------------------------------------------
function setupSpeechToText() {
  const micBtn = document.getElementById('btn-mic');
  const chatInput = document.getElementById('chat-input');
  if (!micBtn || !chatInput) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micBtn.style.display = 'none';
    console.warn("Speech Recognition no soportado en este navegador.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'es-MX'; // Configurado a español
  recognition.continuous = false;
  recognition.interimResults = true;

  let isRecording = false;

  micBtn.addEventListener('click', () => {
    if (isRecording) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch(e) { console.error(e); }
    }
  });

  recognition.onstart = () => {
    isRecording = true;
    micBtn.classList.add('mic-recording');
    chatInput.placeholder = "Escuchando tu voz...";
    chatInput.value = "";
  };

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    chatInput.value = transcript;
    // Autoresize
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  };

  recognition.onend = () => {
    isRecording = false;
    micBtn.classList.remove('mic-recording');
    chatInput.placeholder = "Describe tu acción o habla como tu personaje... (Enter para enviar)";
    // Opcional: autoenviar si el texto no está vacío tras un breve retraso
    setTimeout(() => {
        if (chatInput.value.trim().length > 0) {
            sendPlayerMessage();
        }
    }, 500);
  };

  recognition.onerror = (e) => {
    console.error("Error de reconocimiento de voz:", e);
    isRecording = false;
    micBtn.classList.remove('mic-recording');
    chatInput.placeholder = "No se pudo escuchar. Escribe tu acción...";
  };
}

// Inicializar cuando cargue el DOM
document.addEventListener('DOMContentLoaded', setupSpeechToText);











