// js/ai.js — Integración con Groq (Nube Ultra-rápida)

const GroqGM = {
  buildSystemPrompt() {
    return `Eres el Game Master de Ten Candles, un juego de rol de horror trágico de supervivencia.
Tono: Oscuro, poético, desesperanzador, aterrador, fatalista.
Los jugadores inevitablemente morirán al final de la sesión. Todos ellos.
Estás narrando el módulo: "${GameState.selectedModule?.title || 'Desconocido'}"
Objetivo del grupo: ${GameState.selectedModule?.objective || 'Sobrevivir un poco más.'}
Contexto actual: ${GameState.buildContextSummary()}
Naturaleza de Ellos (establecida por los jugadores): ver resumen de personajes

=== REGLAS ABSOLUTAS QUE DEBES SEGUIR ===
1. ATMÓSFERA Y DESCRIPCIÓN: Describe vívidamente el entorno, olores, sombras y sonidos. Plantea situaciones misteriosas y obstáculos activamente.
2. DIÁLOGOS COMPLETOS: NUNCA cortes una frase a la mitad. Concluye tu idea y termina con un punto o pregunta.
3. LA REGLA DE ORO DE LOS DADOS (MUY IMPORTANTE): Si el jugador intenta hacer algo cuyo resultado es incierto (ej. "Busco comida", "Ataco al monstruo", "Intento abrir la puerta", "Me escondo"), TÚ TIENES PROHIBIDO DECIR SI LO LOGRA O FRACASA.
   -> INCORRECTO: "Buscas en el cajón y encuentras vendas." (¡Resolviste la acción sin dados!)
   -> CORRECTO: "Metes la mano en el cajón a oscuras, pero escuchas pasos detrás de ti. [TIRADA DE DADOS REQUERIDA]"
   -> NUNCA entregues el premio o el castigo antes de la tirada. Siempre corta la narración en el clímax de la acción y escribe "[TIRADA DE DADOS REQUERIDA]".
4. MEMORIA Y HERIDAS: Recuerda TODO lo ocurrido. Monitorea y menciona las heridas del personaje.
5. MOMENTOS: Guía la narrativa hacia los Momentos activos de los personajes.
6. VELAS: Con ${GameState.candlesLit} velas encendidas, el mundo es más oscuro.
7. FASE FINAL: Si queda 1 vela, deja claro que el siguiente fallo será fatal.
8. VERDADES: Cuando narres el inicio de una escena, incorpora las verdades.
9. ELLOS: Manifiéstalos según la Naturaleza que establecieron los jugadores.
10. CONCISIÓN: Máximo 3-4 párrafos. Termina cediendo la palabra al jugador (o requiriendo tirada).
11. NUNCA asumas o narres las acciones o decisiones del jugador. Tú controlas el mundo, él controla su personaje.

El juego está diseñado para terminar con la muerte de todos los personajes. Eso no es spoiler, es la esencia del juego. Haz que cada momento sea significativo.`;
  },

  buildMessages(userMessage) {
    const messages = [];
    
    // 1. System Prompt
    messages.push({ role: 'system', content: this.buildSystemPrompt() });

    // 2. Historial de la partida
    for (const msg of GameState.history) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    }

    // 3. Mensaje actual del jugador
    messages.push({ role: 'user', content: userMessage });

    return messages;
  },

  async ask(userMessage) {
    const messages = this.buildMessages(userMessage);

    const payload = {
      model: CONFIG.GROQ_MODEL,
      messages: messages,
      temperature: CONFIG.GM_TEMPERATURE,
      max_tokens: CONFIG.GM_MAX_TOKENS,
      stream: false
    };

    let response;
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(CONFIG.GROQ_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`
          },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        if (attempt === maxRetries) throw new Error(`Groq no responde: ${e.message}`);
        await new Promise(r => setTimeout(r, attempt * 1500));
        continue;
      }
      break; 
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content;
    
    if (!text) throw new Error('Respuesta vacía de Groq.');

    // Guardar en historial
    GameState.addToHistory('user',  userMessage);
    GameState.addToHistory('model', text);

    return text;
  },

  async openingNarration() {
    return this.ask("Narra el inicio de la sesión. Describe dónde estamos y qué está pasando, e introduce la primera amenaza o situación. Termina cediéndome la palabra para que yo decida qué hacer.");
  },

  async sceneTransitionNarration() {
    return this.ask("Narra la transición a la siguiente escena, teniendo en cuenta las nuevas verdades establecidas por los jugadores. Plantea un nuevo obstáculo inicial.");
  },

  async narrateRollResult(result, playerAction) {
    const prompt = `El jugador intentó: "${playerAction}"
Resultado de la tirada: ${result.success ? 'ÉXITO, pero el GM (TÚ) ganó los derechos narrativos (empate o más seises).' : 'FRACASO. El GM asume el control narrativo.'}
Dados del jugador perdidos (unos): ${result.ones}

${result.success
  ? 'Narra cómo el jugador logra su objetivo, pero añade un giro inesperado, un costo oculto o un detalle perturbador (ya que tú tienes los derechos narrativos). Cierra tu idea completamente.'
  : 'El conflicto falló miserablemente. Narra las consecuencias negativas, cómo la situación empeora o el personaje sufre daño. Recuerda no dejar frases a medias. (Una vela se apaga por mecánica del sistema).'}

NUNCA decidas la siguiente acción del jugador, solo descríbele el resultado de la actual.`;

    return this.ask(prompt);
  },

  async generateGMTruths(count) {
    const prompt = `Una vela se acaba de apagar. Debes generar ${count} "Verdades" sobre el mundo o la situación actual. 
Las verdades son frases cortas, de 1 o 2 líneas máximo, que establecen hechos narrativos crudos o lúgubres.
Ejemplos: "La radio ha dejado de funcionar.", "Ellos han encontrado una forma de entrar al edificio.", "El frío es insoportable."
Devuelve SOLO las ${count} verdades separadas por un salto de línea, sin viñetas, sin introducciones.`;
    
    const payload = {
      model: CONFIG.GROQ_MODEL,
      messages: [{ role: 'system', content: this.buildSystemPrompt() }, { role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 200,
      stream: false
    };

    const res = await fetch(CONFIG.GROQ_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) return ["El frío arrecia.", "Ellos están más cerca."].slice(0, count);
    const data = await res.json();
    return data.choices[0]?.message?.content.split('\n').filter(t => t.trim().length > 0).slice(0, count);
  },

  async narrateDeath() {
    return this.ask("FASE FINAL. El jugador ha fallado un conflicto estando en la última vela. Narra la MUERTE INEVITABLE del personaje de forma trágica y poética. Descríbelo consumido por la oscuridad o por Ellos. Esta es la narración final del juego.");
  }
};


