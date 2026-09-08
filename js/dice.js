// js/dice.js — Motor de dados de Ten Candles

const Dice = {
  /**
   * Tira el pool del jugador + dado de esperanza si aplica.
   * También tira los dados del GM.
   * Retorna: { playerDice, gmDice, hopeDie, success, sixes, gmSixes, ones, playerWinsNarration }
   */
  roll(playerPool, gmPool, hasHopeDie) {
    // Tirar dados del jugador
    const playerDice = [];
    for (let i = 0; i < playerPool; i++) {
      playerDice.push(Math.ceil(Math.random() * 6));
    }

    // Dado de Esperanza (cuenta 5 o 6 como éxito, no se pierde si sale 1)
    let hopeDieResult = null;
    if (hasHopeDie) {
      hopeDieResult = Math.ceil(Math.random() * 6);
    }

    // Tirar dados del GM (si tiene)
    const gmDice = [];
    for (let i = 0; i < gmPool; i++) {
      gmDice.push(Math.ceil(Math.random() * 6));
    }

    // Calcular resultados
    const playerSixes = playerDice.filter(d => d === 6).length;
    const hopeSixes   = hopeDieResult !== null && (hopeDieResult === 5 || hopeDieResult === 6) ? 1 : 0;
    const totalSixes  = playerSixes + hopeSixes;
    const gmSixes     = gmDice.filter(d => d === 6).length;
    const ones        = playerDice.filter(d => d === 1).length; // el dado de esperanza NO se pierde si sale 1
    const success     = totalSixes > 0;

    // Derechos narrativos: quien saca más 6s. Empate → GM gana
    const playerWinsNarration = success && playerSixes > gmSixes;

    const result = {
      playerDice,
      hopeDieResult,
      gmDice,
      success,
      sixes: totalSixes,
      playerSixes,
      hopeSixes,
      gmSixes,
      ones,
      playerWinsNarration,
    };

    GameState.lastRoll = result;
    return result;
  },

  /**
   * Re-tira todos los dados que cayeron en 1 (al quemar un Rasgo)
   * Devuelve los nuevos resultados de esos dados.
   */
  rerollOnes(ones) {
    const rerolled = [];
    for (let i = 0; i < ones; i++) {
      rerolled.push(Math.ceil(Math.random() * 6));
    }
    return rerolled;
  },

  /**
   * Re-tira TODO el pool del jugador (al abrazar el Tope)
   */
  rerollAll(playerPool, hasHopeDie) {
    return this.roll(playerPool, 0, hasHopeDie);
  },

  /**
   * Aplica el resultado de una tirada al estado del juego.
   * Retorna: { diceRemoved, candleOut, message }
   */
  applyResult(result) {
    const gs = GameState;

    if (result.success) {
      // Éxito: remover dados con 1 del pool
      gs.playerPool = Math.max(0, gs.playerPool - result.ones);
      gs.diceTrash += result.ones;
      return {
        diceRemoved: result.ones,
        candleOut: false,
        message: result.playerWinsNarration
          ? '¡Éxito! Ganas los derechos de narración.'
          : `¡Éxito! El Game Master gana los derechos de narración (${result.gmSixes} seises vs ${result.playerSixes}).`,
      };
    } else {
      // Fracaso: apagar vela
      const diceBeforeCandle = gs.playerPool;
      const remaining = gs.extinguishCandle('conflict');
      // Los dados sobrantes van al GM
      const surplusDice = Math.max(0, diceBeforeCandle - remaining);
      gs.gmPool += surplusDice;
      // Recargar pool del jugador al número de velas encendidas
      gs.playerPool = remaining;
      gs.diceTrash = 0;
      gs.character.traitsBurnedThisScene = 0;
      return {
        diceRemoved: diceBeforeCandle,
        candleOut: true,
        candlesLeft: remaining,
        message: gs.isFinalPhase
          ? '⚫ Conflicto fallido en la Fase Final. Tu personaje MUERE.'
          : `⚫ Conflicto fallido. Una vela se apaga. Quedan ${remaining} velas.`,
      };
    }
  },
};
