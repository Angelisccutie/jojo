/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API Sound Synthesizer for physical home feedback
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play door action sound: realistic mechanical latch, wood creak, or garage roll
 */
export function playDoorSound(type: 'mainDoor' | 'garageDoor', open: boolean) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'garageDoor') {
      // Motor hum + heavy metallic movement + lock
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(open ? 180 : 120, now);
      filter.frequency.exponentialRampToValueAtTime(open ? 320 : 80, now + 0.35);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(open ? 85 : 110, now);
      osc.frequency.exponentialRampToValueAtTime(open ? 120 : 60, now + 0.35);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.42);

      // Add a metallic click at end
      setTimeout(() => {
        if (!ctx) return;
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(open ? 600 : 400, ctx.currentTime);
        clickGain.gain.setValueAtTime(0.12, ctx.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        clickOsc.connect(clickGain);
        clickGain.connect(ctx.destination);
        clickOsc.start();
        clickOsc.stop(ctx.currentTime + 0.09);
      }, 250);
    } else {
      // Main Entrance Door: Brass latch click + wood resonance seal
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(open ? 420 : 540, now);
      osc1.frequency.exponentialRampToValueAtTime(open ? 220 : 180, now + 0.15);

      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Wood body thump / acoustic resonance
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(140, now + 0.04);
      osc2.frequency.exponentialRampToValueAtTime(50, now + 0.18);

      gain2.gain.setValueAtTime(0.25, now + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.04);
      osc2.stop(now + 0.22);
    }
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}

/**
 * Play subtle soft electronic relay click for light switch toggle
 */
export function playLightClickSound(on: boolean) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(on ? 880 : 640, now);
    osc.frequency.exponentialRampToValueAtTime(on ? 1200 : 440, now + 0.06);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    // ignore
  }
}

/**
 * Play pleasant futuristic wake-word attention chime (KeepSafe summoned)
 */
export function playWakeChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // First note (523.25 Hz - C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.01, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second note (880 Hz - A5 / bell chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.08);
    gain2.gain.setValueAtTime(0.01, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.48);

    // Subtle ambient shimmer harmonic (1318.5 Hz - E6)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1318.5, now + 0.14);
    gain3.gain.setValueAtTime(0.01, now + 0.14);
    gain3.gain.linearRampToValueAtTime(0.08, now + 0.18);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.14);
    osc3.stop(now + 0.52);
  } catch {
    // ignore
  }
}
