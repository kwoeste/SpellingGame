export type SoundKind = "tap" | "pair" | "correct" | "wrong" | "fanfare";

let audioCtx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioCtx ??= new Ctor();
  return audioCtx;
}

function tone(ctx: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain = 0.08) {
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.setValueAtTime(gain, start);
  vol.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(vol);
  vol.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur);
}

export function playSound(kind: SoundKind, enabled: boolean): void {
  if (!enabled || typeof window === "undefined") return;
  const ctx = context();
  if (!ctx) return;
  void ctx.resume();
  const now = ctx.currentTime;
  switch (kind) {
    case "tap":
      tone(ctx, 520, now, 0.08, "sine", 0.05);
      return;
    case "pair":
      tone(ctx, 440, now, 0.1, "triangle", 0.06);
      tone(ctx, 660, now + 0.06, 0.12, "triangle", 0.05);
      return;
    case "correct":
      tone(ctx, 523, now, 0.12, "triangle", 0.07);
      tone(ctx, 659, now + 0.1, 0.14, "triangle", 0.07);
      tone(ctx, 784, now + 0.2, 0.18, "triangle", 0.06);
      return;
    case "wrong":
      tone(ctx, 220, now, 0.16, "sawtooth", 0.04);
      tone(ctx, 180, now + 0.1, 0.18, "sawtooth", 0.03);
      return;
    case "fanfare":
      tone(ctx, 392, now, 0.14, "triangle", 0.07);
      tone(ctx, 523, now + 0.12, 0.14, "triangle", 0.07);
      tone(ctx, 659, now + 0.24, 0.16, "triangle", 0.07);
      tone(ctx, 784, now + 0.38, 0.28, "triangle", 0.08);
      return;
    default: {
      const unhandled: never = kind;
      throw new Error(`Unhandled sound ${String(unhandled)}`);
    }
  }
}
