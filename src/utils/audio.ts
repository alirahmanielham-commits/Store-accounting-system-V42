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
