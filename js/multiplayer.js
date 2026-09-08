// js/multiplayer.js - Lógica P2P con PeerJS

const MP = {
  isHost: false,
  isClient: false,
  peer: null,
  connections: [], // Para el Host
  hostConnection: null, // Para el Cliente
  playerName: 'Jugador',
  roomCode: '',
  lobbyPlayers: [], // {id, name, isHost, ready}

  initHost: function(onReady, onError) {
    this.isHost = true;
    this.roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.playerName = 'Host (GM)';
    
    try {
      this.peer = new Peer('tencandles-' + this.roomCode);
    } catch(e) {
      if(onError) onError("No se pudo iniciar PeerJS: " + e.message);
      return;
    }

    this.peer.on('open', (id) => {
      console.log('Host creado con ID:', id);
      this.lobbyPlayers = [{ id: 'host', name: this.playerName, isHost: true, ready: false }];
      this.updateLobbyUI();
      onReady(this.roomCode);
    });

    this.peer.on('error', (err) => {
      console.error('Peer error:', err);
      if(onError) onError(err.message);
    });

    this.peer.on('connection', (conn) => {
      this.connections.push(conn);
      console.log('Jugador conectado:', conn.peer);
      
      conn.on('open', () => {
        // Enviar estado del lobby inicial
        conn.send({
          type: 'lobby_update',
          players: this.lobbyPlayers
        });
      });

      conn.on('data', (data) => {
        this.handleClientData(data, conn);
      });
      
      conn.on('close', () => {
        this.connections = this.connections.filter(c => c !== conn);
        this.lobbyPlayers = this.lobbyPlayers.filter(p => p.id !== conn.peer);
        this.broadcast({ type: 'lobby_update', players: this.lobbyPlayers });
        this.updateLobbyUI();
      });
    });
  },

  initClient: function(code, name, onReady, onError) {
    this.isClient = true;
    this.roomCode = code.toUpperCase();
    this.playerName = name || 'Jugador';
    
    try {
      this.peer = new Peer();
    } catch(e) {
      if(onError) onError("Error al iniciar cliente: " + e.message);
      return;
    }

    this.peer.on('open', (id) => {
      console.log('Cliente iniciado:', id);
      this.hostConnection = this.peer.connect('tencandles-' + this.roomCode);
      
      this.hostConnection.on('open', () => {
        console.log('Conectado al Host');
        // Avisar al host quién soy
        this.hostConnection.send({ type: 'join_lobby', name: this.playerName });
        onReady();
      });

      this.hostConnection.on('data', (data) => {
        this.handleHostData(data);
      });
      
      this.hostConnection.on('error', (err) => {
        onError(err);
      });
    });

    this.peer.on('error', (err) => {
      onError(err.message);
    });
  },

  // --- HOST HANDLERS ---
  handleClientData: async function(data, conn) {
    if (data.type === 'join_lobby') {
      this.lobbyPlayers.push({ id: conn.peer, name: data.name, isHost: false, ready: false });
      this.broadcast({ type: 'lobby_update', players: this.lobbyPlayers });
      this.updateLobbyUI();
      appendGMMessage(`🟢 ${data.name} se ha unido a la sala.`, false);
    }
    else if (data.type === 'set_ready') {
      const p = this.lobbyPlayers.find(p => p.id === conn.peer);
      if (p) p.ready = data.ready;
      this.broadcast({ type: 'lobby_update', players: this.lobbyPlayers });
      this.updateLobbyUI();
    }
            else if (data.type === 'pause_gm') {
      const btnPauseGM = document.getElementById('btn-pause-gm');
      if (btnPauseGM) btnPauseGM.click();
    }
        else if (data.type === 'request_roll') {
      pendingRollAction = data.action;
      const rollBtn = document.getElementById('btn-roll');
      if (rollBtn) rollBtn.click();
      else rollDice(); // Si el modal no está abierto, lo forza
    }
        else if (data.type === 'sync_character') {
      if (!GameState.characters) GameState.characters = [];
      const idx = GameState.characters.findIndex(c => c.name === data.character.name);
      if (idx >= 0) GameState.characters[idx] = data.character;
      else GameState.characters.push(data.character);
      appendGMMessage(`📝 ${data.name} ha terminado de crear su personaje: ${data.character.name}.`, false);
    }
    else if (data.type === 'call_gm') {
      const btnCallGM = document.getElementById('btn-call-gm');
      if (btnCallGM) btnCallGM.click();
    }
    else if (data.type === 'player_msg') {
      const fullMsg = `[${data.name}]: ${data.text}`;
      appendPlayerMessage(fullMsg);
      GameState.addToHistory('user', fullMsg);
      
      this.broadcast({ type: 'chat_player', msg: fullMsg }, conn);

      if (!GameState.gmPaused) {
        setGMThinking(true);
        this.broadcast({ type: 'gm_thinking', state: true });
        try {
          const response = await GroqGM.ask(fullMsg);
          setGMThinking(false);
          this.broadcast({ type: 'gm_thinking', state: false });
          
          appendGMMessage(response, true);
          this.broadcast({ type: 'chat_gm', msg: response });

          if (response.includes('[TIRADA DE DADOS REQUERIDA]')) {
            showRollPrompt("Acción de " + data.name);
            this.broadcast({ type: 'roll_prompt', action: "Acción de " + data.name });
          }
        } catch(e) {
          setGMThinking(false);
          this.broadcast({ type: 'gm_thinking', state: false });
          appendGMMessage(`⚠️ Error de IA: ${e.message}`, false);
        }
      }
    }
  },

  broadcast: function(data, excludeConn = null) {
    if (!this.isHost) return;
    for (let c of this.connections) {
      if (c !== excludeConn && c.open) {
        c.send(data);
      }
    }
  },

  // --- CLIENT HANDLERS ---
  handleHostData: function(data) {
    if (data.type === 'lobby_update') {
      this.lobbyPlayers = data.players;
      this.updateLobbyUI();
    }
        else if (data.type === 'start_game') {
      showView('game');
    }
    else if (data.type === 'start_character_creation') {
      showView('character');
      if (typeof goToCharStep === 'function') goToCharStep(1);
    }
    else if (data.type === 'sync_module') {
      GameState.selectedModule = MODULES[data.modId];
      const nameEl = document.getElementById('lobby-module-name');
      const descEl = document.getElementById('lobby-module-desc');
      if (nameEl) nameEl.textContent = GameState.selectedModule.title;
      if (descEl) descEl.textContent = GameState.selectedModule.tagline;
    }
        else if (data.type === 'load_game') {
      Object.assign(GameState, data.state);
      
      const myChar = GameState.characters?.find(c => c.name === MP.playerName);
      if (myChar) {
         GameState.character = myChar;
      }
      
      if (typeof restoreGameUI === 'function') {
        restoreGameUI();
      }
    }
    else if (data.type === 'sync_state') {
      GameState.candlesLit = data.candlesLit;
      updateCandlesVisual();
      const chatBox = document.getElementById('chat-history');
      if (chatBox) chatBox.innerHTML = '';
      for (const msg of data.history) {
        if (msg.role === 'user') appendPlayerMessage(msg.text);
        else appendGMMessage(msg.text, false);
      }
    }
    else if (data.type === 'chat_player') {
      appendPlayerMessage(data.msg);
    }
    else if (data.type === 'chat_gm') {
      appendGMMessage(data.msg, true);
    }
    else if (data.type === 'chat_system') {
      appendGMMessage(data.msg, false);
    }
    else if (data.type === 'gm_thinking') {
      setGMThinking(data.state);
    }
    else if (data.type === 'dice_anim') {
      const diceAreaSide = document.getElementById('dice-result-area');
      if (diceAreaSide) {
        if (data.state) diceAreaSide.classList.add('rolling');
        else diceAreaSide.classList.remove('rolling');
      }
    }
    else if (data.type === 'dice_result') {
      renderDiceResult(data.result, data.applied);
    }
        else if (data.type === 'hide_modal') {
      hideModal(data.modalId);
    }
    else if (data.type === 'candle_out') {
      GameState.candlesLit = data.candles;
      updateCandlesVisual();
    }
  },

  // --- UI LOBBY ---
  updateLobbyUI: function() {
    const list = document.getElementById('lobby-players-list');
    if (!list) return;
    list.innerHTML = '';
    
    let allReady = true;
    for (const p of this.lobbyPlayers) {
      const li = document.createElement('li');
      li.style.padding = '8px 0';
      li.style.borderBottom = '1px solid var(--border)';
      
      const statusIcon = p.ready ? '🟢' : '🔴';
      const statusText = p.ready ? '(Listo)' : '(Esperando...)';
      li.textContent = `${statusIcon} ${p.name} ${statusText}`;
      list.appendChild(li);

      if (!p.ready) allReady = false;
    }

    if (this.isHost) {
      const btnStart = document.getElementById('btn-lobby-start');
      if (allReady) {
        btnStart.style.display = 'inline-block';
      } else {
        btnStart.style.display = 'none';
      }
    }
  },

  // --- ENVIAR DATOS (CLIENTE) ---
  sendToHost: function(data) {
    if (this.isClient && this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send(data);
    }
  }
};






