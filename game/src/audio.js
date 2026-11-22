// WebAudio sound effects, synthesized — no audio files, no network.
// Every sound is short and quiet; M toggles mute.
let audioCtx = null;
let muted = false;

export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; return muted; }

function ctx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function tone(freq, dur, type, gain, when = 0) {
  if (muted) return;
  const ac = ctx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function playLootSound() { tone(880, 0.12, 'sine', 0.06); tone(1318, 0.18, 'sine', 0.05, 0.08); }
export function playSpottedSound() { tone(220, 0.25, 'sawtooth', 0.05); tone(330, 0.25, 'sawtooth', 0.05, 0.12); }
export function playSmokeSound() { tone(180, 0.4, 'triangle', 0.05); }
export function playWinSound() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.06, i * 0.12));
}
export function playLoseSound() {
  [400, 300, 200, 120].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.05, i * 0.16));
}
export function playClickSound() { tone(660, 0.07, 'sine', 0.04); }
