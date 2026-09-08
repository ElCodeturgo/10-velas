// js/multiplayer.js - Lógica P2P con PeerJS

const MP = {
  isHost: false,
  isClient: false,
  peer: null,
  connections: [], // Para el Host
  hostConnection: null, // Para el Cliente
  playerName: 'Jugador',
  roomCode: '',

  initHost: function(onReady) {
    this.isHost = true;
    this.roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.peer = new Peer('tencandles-' + this.roomCode);

    this.peer.on('open', (id) => {
      console.log('Host creado con ID:', id);
      onReady(this.roomCode);
    });

    this.peer.on('connection', (conn) => {
      this.connections.push(conn);
      console.log('Jugador conectado:', conn.peer);
      
      // Enviar estado actual al nuevo jugador
      conn.on('open', () => {
        conn.send({
          type: 'sync_state',
          candlesLit: GameState.candlesLit,
          history: GameState.history // Enviar todo el historial
        });
      });

      conn.on('data', (data) => {
        this.handleClientData(data, conn);
      });
      
      conn.on('close', () => {
        this.connections = this.connections.filter(c => c !== conn);
      });
    });
  },

  initClient: function(code, name, onReady, onError) {
    this.isClient = true;
    this.roomCode = code.toUpperCase();
    this.playerName = name || 'Jugador';
    this.peer = new Peer();

    this.peer.on('open', (id) => {
      console.log('Cliente iniciado:', id);
      this.hostConnection = this.peer.connect('tencandles-' + this.roomCode);
      
      this.hostConnection.on('open', () => {
        console.log('Conectado al Host');
        // Avisar al host quién soy
        this.hostConnection.send({ type: 'player_join', name: this.playerName });
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
    if (data.type === 'player_msg') {
      const fullMsg = `[${data.name}]: ${data.text}`;
      appendPlayerMessage(fullMsg);
      GameState.addToHistory('user', fullMsg);
      
      // Re-transmitir a todos los demás clientes
      this.broadcast({ type: 'chat_player', msg: fullMsg }, conn);

      // Si el GM NO está pausado, hacer que el GM responda
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
    else if (data.type === 'player_join') {
      const msg = `🟢 ${data.name} se ha unido a la partida.`;
      appendGMMessage(msg, false);
      this.broadcast({ type: 'chat_system', msg: msg });
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
    if (data.type === 'sync_state') {
      // Sincronizar velas
      GameState.candlesLit = data.candlesLit;
      updateCandlesVisual();
      // Limpiar y cargar historial
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
    else if (data.type === 'candle_out') {
      GameState.candlesLit = data.candles;
      updateCandlesVisual();
    }
  },

  // --- ENVIAR DATOS (CLIENTE) ---
  sendToHost: function(data) {
    if (this.isClient && this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send(data);
    }
  }
};
