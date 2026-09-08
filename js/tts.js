// js/tts.js — Texto a Voz (Web Speech API)

const TTS = {
  synth: window.speechSynthesis,
  voice: null,
  speaking: false,

  setBestSpanishVoice() {
    const voices = this.synth.getVoices();
    if (voices.length === 0) return;

    // Prioridad estricta para acento de México (es-MX)
    let bestVoice = 
      // 1. Edge Natural - México
      voices.find(v => v.lang === 'es-MX' && v.name.includes('Natural')) ||
      // 2. Google - México
      voices.find(v => v.lang === 'es-MX' && v.name.includes('Google')) ||
      // 3. Microsoft Estándar - México (Sabina o similar)
      voices.find(v => v.lang === 'es-MX' && v.name.includes('Microsoft')) ||
      // 4. Cualquier voz genérica de México
      voices.find(v => v.lang === 'es-MX') ||
      // Si no hay de México, caemos a cualquier Natural en español
      voices.find(v => v.lang.startsWith('es') && v.name.includes('Natural')) ||
      // Último recurso: cualquier voz en español
      voices.find(v => v.lang.startsWith('es')) ||
      voices[0];

    this.voice = bestVoice;
    console.log("Voz TTS seleccionada:", this.voice ? this.voice.name : "Ninguna");
  },

  init() {
    // Esperar a que las voces carguen
    const loadVoices = () => {
      this.setBestSpanishVoice();
    };

    if (this.synth.getVoices().length) loadVoices();
    this.synth.addEventListener('voiceschanged', loadVoices);
  },

  speak(text, onEnd = null) {
    if (!this.synth) return;
    this.synth.cancel(); // Cancelar cualquier habla en curso
    if (!text || text.trim() === '') return;

    // Limpiar markdown/asteriscos del texto
    const clean = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/_/g, '')
      .replace(/#{1,6} /g, '')
      .replace(/\n\n/g, '. ')
      .replace(/\n/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang   = CONFIG.TTS_LANG;
    utterance.rate   = CONFIG.TTS_RATE;
    utterance.pitch  = CONFIG.TTS_PITCH;
    utterance.volume = CONFIG.TTS_VOLUME;
    if (this.voice) utterance.voice = this.voice;

    utterance.onstart = () => { this.speaking = true; };
    utterance.onend   = () => {
      this.speaking = false;
      if (onEnd) onEnd();
    };
    utterance.onerror = (e) => {
      this.speaking = false;
      console.warn('TTS error:', e.error);
      if (onEnd) onEnd();
    };

    this.synth.speak(utterance);
  },

  stop() {
    this.synth.cancel();
    this.speaking = false;
  },

  toggle(text) {
    if (this.speaking) this.stop();
    else this.speak(text);
  }
};
