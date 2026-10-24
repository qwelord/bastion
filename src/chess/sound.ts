let context: AudioContext | undefined;
export function unlockSound() {
  try {
    context ??= new AudioContext();
    void context.resume();
  } catch {
    /* Audio is optional. */
  }
}
export function moveSound(capture: boolean, check: boolean, finished: boolean, volume: number) {
  if (!context || context.state !== 'running') return;
  const t = context.currentTime;
  for (let n = 0; n < (finished ? 3 : 1); n++) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(
      finished ? 440 * (1 + n / 4) : check ? 660 : capture ? 220 : 330,
      t + n * 0.12,
    );
    gain.gain.setValueAtTime(0, t + n * 0.12);
    gain.gain.linearRampToValueAtTime(
      Math.min(1, Math.max(0, volume)) * 0.15,
      t + n * 0.12 + 0.008,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, t + n * 0.12 + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(t + n * 0.12);
    oscillator.stop(t + n * 0.12 + 0.13);
  }
}
