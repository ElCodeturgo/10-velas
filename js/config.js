// js/config.js — Configuración global de Ten Candles

const CONFIG = {
  // --- Groq AI ---
  GROQ_API_KEY: '', // Se llenará desde la interfaz (localStorage) por seguridad
  GROQ_URL: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: 'openai/gpt-oss-120b', // Modelo actualizado y súper potente

  // --- Text-to-Speech ---
  TTS_LANG: 'es-MX',
  TTS_RATE: 0.82,
  TTS_PITCH: 0.75,
  TTS_VOLUME: 1.0,

  // --- Juego ---
  TOTAL_CANDLES: 10,
  INITIAL_PLAYER_POOL: 10,
  GM_MAX_TOKENS: 1500,
  GM_TEMPERATURE: 0.92,

  // --- UI ---
  DICE_ANIMATION_MS: 1200,
  CANDLE_OUT_DELAY_MS: 800,
};
