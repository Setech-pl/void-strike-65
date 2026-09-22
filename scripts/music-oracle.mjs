// The reference renderer's rules, as JavaScript (plan-music-v2.md §6a).
//
// This is a port of the `render()` loop in assets/music/preview/render.py --
// the Python renderer that produced the audio the owner approved by ear. It is
// deliberately written against the JSON, never against the compiled bytes: it
// is the specification the converter and the 6502 player are both measured
// against, so it must not share code with either.
//
// What it produces is a per-frame POKEY register stream: for every PAL frame
// of the loop, for every channel, the (AUDF, AUDC) pair the renderer's voice
// state implies. AUDF is null wherever AUDC is $00, because a silent channel's
// divider is not observable -- the equality checks skip it.

const DISTORTION_BASE = Object.freeze({ pure: 0xa0, buzz: 0xc0, noise: 0x80 });

export const DISTORTION_BASE_BYTES = DISTORTION_BASE;

function silence() {
  return { audf: null, audc: 0x00 };
}

// One frame of one voice, exactly as render() computes it:
//   instrument -> volume = env[min(age, len-1)], pitch = base + arp[age % len]
//   drum       -> macro[age], or silence once the macro is exhausted
// A volume of zero renders as silence (wave_frame returns zeros), which is
// AUDC $00 and not `distortion | 0`.
function voiceFrame(voice, { pitches, instruments, drums }) {
  if (voice === null) return silence();
  const { kind, name, base, age } = voice;
  if (kind === "drum") {
    const macro = drums[name];
    if (age >= macro.length) return silence();
    const [distortion, divider, volume] = macro[age];
    if (volume === 0) return silence();
    return { audf: divider, audc: DISTORTION_BASE[distortion] | volume };
  }
  const instrument = instruments[name];
  const envelope = instrument.volume;
  const volume = envelope[Math.min(age, envelope.length - 1)];
  if (volume === 0) return silence();
  const arp = instrument.arp ?? [0];
  const divider = pitches[base + arp[age % arp.length]].divider;
  return { audf: divider, audc: DISTORTION_BASE[instrument.distortion] | volume };
}

function startVoice(token, pitchIndex) {
  if (token.includes(":")) {
    const [name, pitch] = token.split(":");
    return { kind: "inst", name, base: pitchIndex.get(pitch), age: 0 };
  }
  return { kind: "drum", name: token, base: null, age: 0 };
}

/**
 * Renders `frames` PAL frames of a format-2 theme, looping the sequence as
 * often as it takes. Returns `frames` entries, each an array of one
 * `{ audf, audc }` per channel.
 */
export function renderOracleStream(theme, { pitches, frames } = {}) {
  const table = pitches ?? theme.pitches;
  const pitchIndex = new Map(table.map(({ id }, index) => [id, index]));
  const context = { pitches: table, instruments: theme.instruments, drums: theme.drums ?? {} };
  const framesPerRow = theme.framesPerRow;
  const channelCount = theme.channels.length;
  const total = frames ?? loopFrames(theme);

  const stream = Array.from({ length: total }, () => new Array(channelCount));
  for (let channel = 0; channel < channelCount; channel += 1) {
    let voice = null;
    let frame = 0;
    let cursor = 0;
    while (frame < total) {
      const bar = theme.sequence[Math.floor(cursor / theme.rowsPerPattern) % theme.sequence.length];
      const token = theme.patterns[bar][cursor % theme.rowsPerPattern][channel];
      if (token === "REST") voice = null;
      else if (token !== "HOLD") voice = startVoice(token, pitchIndex);
      for (let step = 0; step < framesPerRow && frame < total; step += 1) {
        stream[frame][channel] = voiceFrame(voice, context);
        if (voice !== null) voice = { ...voice, age: voice.age + 1 };
        frame += 1;
      }
      cursor += 1;
    }
  }
  return stream;
}

export function loopFrames(theme) {
  return theme.sequence.length * theme.rowsPerPattern * theme.framesPerRow;
}

/** The peak summed POKEY volume over one loop, music only (plan §4). */
export function peakVolumeSum(stream) {
  let peak = 0;
  for (const frame of stream) {
    peak = Math.max(peak, frame.reduce((sum, { audc }) => sum + (audc & 0x0f), 0));
  }
  return peak;
}

/** A stable text form of the stream, for SHA-256 pinning of the approved music. */
export function serialiseStream(stream) {
  return JSON.stringify(stream.map((frame) =>
    frame.flatMap(({ audf, audc }) => [audc === 0 ? -1 : audf, audc])));
}
