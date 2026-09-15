// Singleton AudioContext for instant, reliable playback without latency
let sharedAudioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
};

export const playAudioFeedback = (type: "success" | "error" | "info" | "warning" | "scan" | "scan_error") => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    const playTone = (freq: number, oscType: OscillatorType, startTime: number, duration: number, vol: number = 0.1) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = oscType;
        osc.frequency.setValueAtTime(freq, startTime);
        
        gainNode.gain.setValueAtTime(0.001, startTime);
        gainNode.gain.linearRampToValueAtTime(vol, startTime + 0.01);
        gainNode.gain.setValueAtTime(vol, startTime + duration - 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;

    if (type === "scan") {
      // Classic digital barcode scanner beep (crisp 1850Hz)
      playTone(1850, 'square', now, 0.08, 0.12);
    } else if (type === "scan_error") {
      // Digital error (double low square buzz)
      playTone(320, 'square', now, 0.12, 0.12);
      playTone(280, 'square', now + 0.15, 0.15, 0.12);
    } else if (type === "success") {
      // Ascending digital melody
      playTone(523.25, 'square', now, 0.08, 0.08);
      playTone(659.25, 'square', now + 0.09, 0.08, 0.08);
      playTone(783.99, 'square', now + 0.18, 0.08, 0.08);
      playTone(1046.50, 'square', now + 0.27, 0.18, 0.1);
    } else if (type === "error") {
      playTone(350, 'sawtooth', now, 0.12, 0.15);
      playTone(220, 'sawtooth', now + 0.13, 0.22, 0.15);
    } else if (type === "warning") {
      playTone(880, 'square', now, 0.08, 0.1);
      playTone(880, 'square', now + 0.12, 0.08, 0.1);
    } else {
      // Digital UI blip
      playTone(1200, 'square', now, 0.05, 0.08);
    }
  } catch (e) {
    console.error("Audio feedback failed:", e);
  }
};

/**
 * Authentic digital electronic beep for card transitions
 * Crisp two-step digital terminal blip (high-tech cyber electronic beep, NO fluid/plop sine waves)
 */
export const playHackerCardSwitchSound = (vol: number = 0.12) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Helper for crisp square-wave digital blip
    const playDigitalStep = (freq: number, startTime: number, duration: number, stepVol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Square wave with highpass to remove muddy low frequencies -> pure crisp digital sound
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(stepVol, startTime + 0.004);
      gain.gain.setValueAtTime(stepVol, startTime + duration - 0.006);
      gain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.005);
    };

    // Crisp high-tech digital two-tone chirp: 1600Hz -> 2400Hz (35ms each)
    // Sounds 100% like a sci-fi console or electronic barcode reader switching records
    playDigitalStep(1650, now, 0.035, vol * 0.9);
    playDigitalStep(2480, now + 0.038, 0.045, vol);
  } catch (e) {
    // Audio autoplay restrictions fallback
  }
};

/**
 * High-tech cyber warning digital alert beep
 * Double high-frequency electronic warning beeps for debtor detection
 */
export const playHackerAlertSound = (vol: number = 0.16) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const playDigitalBeep = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, startTime);
      filter.Q.setValueAtTime(2, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.008);
      gain.gain.setValueAtTime(vol, startTime + duration - 0.01);
      gain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.005);
    };

    // Double digital warning beep (1900Hz and 2200Hz) - unmistakably digital electronic alarm
    playDigitalBeep(1960, now, 0.07);
    playDigitalBeep(2350, now + 0.09, 0.09);
  } catch (e) {
    // Graceful fallback
  }
};

/**
 * Crisp electronic digital tick / micro-beep for buttons and touch
 */
export const playHackerDataBeep = (vol: number = 0.08) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(2800, now);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  } catch (e) {}
};
