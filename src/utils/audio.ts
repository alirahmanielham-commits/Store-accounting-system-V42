export const playAudioFeedback = (type: "success" | "error" | "info" | "warning" | "scan" | "scan_error") => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    // Resume context if it was suspended by the browser
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, vol: number = 0.1) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(vol, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;

    if (type === "scan") {
      // Classic barcode scanner beep (high pitch, short duration)
      playTone(1500, 'sine', now, 0.1, 0.15);
    } else if (type === "scan_error") {
      // Classic barcode scanner error (double low beep)
      playTone(300, 'square', now, 0.15, 0.1);
      playTone(300, 'square', now + 0.2, 0.15, 0.1);
    } else if (type === "success") {
      // Satisfying ascending chime (C4, E4, G4, C5) - Indicates successful recording
      playTone(261.63, 'sine', now, 0.2, 0.1);
      playTone(329.63, 'sine', now + 0.1, 0.2, 0.1);
      playTone(392.00, 'sine', now + 0.2, 0.3, 0.1);
      playTone(523.25, 'sine', now + 0.3, 0.6, 0.15);
    } else if (type === "error") {
      // Downward discordant buzz - Indicates failure
      playTone(300, 'triangle', now, 0.2, 0.2);
      playTone(250, 'triangle', now + 0.15, 0.3, 0.2);
      playTone(200, 'sawtooth', now + 0.3, 0.4, 0.1);
    } else if (type === "warning") {
      // Quick double beep (attention) - Indicates a warning or prompt
      playTone(440, 'square', now, 0.15, 0.05);
      playTone(440, 'square', now + 0.2, 0.15, 0.05);
    } else {
      // Info: Gentle single pop/chime - Indicates generic info
      playTone(600, 'sine', now, 0.3, 0.1);
    }
  } catch (e) {
    console.error("Audio feedback failed:", e);
  }
};

/**
 * Cyber/Hacker futuristic card switch sound effect (digital laser swipe/chirp)
 * Plays when cards switch, slide, shuffle, or navigate.
 */
export const playHackerCardSwitchSound = (vol: number = 0.12) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    // Frequency sweep up then quick settle (high-tech blip/whoosh)
    osc1.frequency.setValueAtTime(520, now);
    osc1.frequency.exponentialRampToValueAtTime(1450, now + 0.04);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.09);

    osc2.frequency.setValueAtTime(1040, now);
    osc2.frequency.exponentialRampToValueAtTime(2200, now + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.09);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(vol, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.12);
    osc2.stop(now + 0.12);
  } catch (e) {
    // Audio may be blocked by browser autoplay policy before user gesture
  }
};

/**
 * Cyber/Hacker warning alert beep sound effect
 * Distinct high-tech warning chirps for overdue debtor detection
 */
export const playHackerAlertSound = (vol: number = 0.18) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    const playChirp = (startTime: number, startFreq: number, endFreq: number, duration: number, oscType: OscillatorType = 'sawtooth') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = oscType;
      osc.frequency.setValueAtTime(startFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, startTime);
      filter.Q.setValueAtTime(3, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Double high-tech cyber radar ping/chirp
    playChirp(now, 1760, 880, 0.12, 'sawtooth');
    playChirp(now + 0.14, 2340, 1170, 0.14, 'square');
  } catch (e) {
    // Graceful fallback
  }
};

/**
 * Quick cyber data tick/click
 */
export const playHackerDataBeep = (vol: number = 0.08) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.03);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  } catch (e) {}
};
