"""POKEY-faithful preview synth for Void Strike 65 music sketches.

Model (PAL):
  - base clocks: 64 kHz = 1773447/28, 15 kHz = 1773447/114
  - pure tone (AUDC $Ax): square, f = clk / (2 * (AUDF + 1)), AUDF 0..255
  - noise (AUDC $8x): 17-bit poly sampled at clk / (AUDF + 1)
  - volume 0..15 per channel, set once per 50 Hz frame, channels summed
Every pitch is quantised to a real AUDF divider, so detuning is authentic.
"""
import numpy as np
import wave

SR = 44100
FRAME_HZ = 50
SPF = SR // FRAME_HZ  # 882 samples per PAL frame
CLK64 = 1773447 / 28
CLK15 = 1773447 / 114

NOTE_INDEX = {"C": 0, "C#": 1, "DB": 1, "D": 2, "D#": 3, "EB": 3, "E": 4, "F": 5,
              "F#": 6, "GB": 6, "G": 7, "G#": 8, "AB": 8, "A": 9, "A#": 10, "BB": 10, "B": 11}


def midi(name):
    name = name.upper()
    octv = int(name[-1])
    return 12 * (octv + 1) + NOTE_INDEX[name[:-1]]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def pokey_tone(m):
    """Return (clock, divider, actual_hz) for the closest real POKEY pure tone."""
    f = hz(m)
    best = None
    for clk in (CLK64, CLK15):
        n = int(round(clk / (2 * f))) - 1
        if 0 <= n <= 255:
            actual = clk / (2 * (n + 1))
            err = abs(1200 * np.log2(actual / f))
            if best is None or err < best[3]:
                best = (clk, n, actual, err)
    return best[:3]


# 17-bit poly (POKEY noise source)
def _poly17():
    n = (1 << 17) - 1
    out = np.empty(n, dtype=np.int8)
    reg = 0x1FFFF
    for i in range(n):
        bit = ((reg >> 0) ^ (reg >> 5)) & 1
        reg = (reg >> 1) | (bit << 16)
        out[i] = 1 if (reg & 1) else -1
    return out


POLY = _poly17()


class Channel:
    """Per-frame register timeline: list of (kind, freq_or_rate, volume)."""

    def __init__(self, frames):
        self.kind = ["off"] * frames
        self.freq = [0.0] * frames
        self.vol = [0] * frames


# ---------- instruments: per-frame volume envelope, optional pitch/arp ----------
INSTR = {
    # name: dict(env=[...], sustain=value or None (hold last), arp=[semitone offsets])
    "lead":   dict(env=[11, 10, 9, 9, 8], sustain=8),
    "lead_s": dict(env=[11, 9, 7, 5, 3, 2, 1, 0], sustain=0),        # staccato
    "bass":   dict(env=[11, 10, 9, 8], sustain=8),
    "bass_s": dict(env=[11, 9, 7, 5, 3, 1, 0], sustain=0),
    "pad":    dict(env=[3, 4, 5, 5], sustain=5),
    "arp":    dict(env=[6, 6, 5], sustain=5, arp=None),               # arp set per note
    "bell":   dict(env=[10, 9, 8, 7, 7, 6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1], sustain=0),
    "drone":  dict(env=[0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6], sustain=6),
    "drone2": dict(env=[0, 0, 1, 1, 2, 2, 3], sustain=3),
    "stab":   dict(env=[7, 6, 4, 2, 0], sustain=0),
}

# drums: sequences of (kind, midi_or_noise_divider, vol) per frame
DRUMS = {
    "K": [("tone", 43, 13), ("tone", 38, 11), ("tone", 33, 8), ("tone", 30, 5), ("tone", 28, 2)],
    "S": [("noise", 4, 12), ("noise", 6, 9), ("noise", 8, 6), ("noise", 8, 4), ("noise", 8, 2), ("noise", 8, 1)],
    "H": [("noise", 1, 5), ("noise", 1, 2)],
    "T": [("tone", 48, 11), ("tone", 45, 9), ("tone", 43, 6), ("tone", 41, 3)],   # tom
    "B": [("tone", 36, 14), ("tone", 31, 12), ("tone", 28, 9), ("tone", 26, 6), ("tone", 25, 4), ("tone", 24, 2)],  # big boom
    "W": [("noise", 20, v) for v in [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1]],  # wind swell
}


def seq(pattern, rows_offset=0):
    """pattern: list of (note|None, rows) -> list of (row, note, rows)."""
    out, r = [], rows_offset
    for note, n in pattern:
        if note is not None:
            out.append((r, note, n))
        r += n
    return out


def render_melodic(ch, events, frames_per_row, instr, transpose=0, arp_by_row=None):
    """events: (row, note, length_rows); arp_by_row: dict row -> offsets list."""
    ins = INSTR[instr]
    for row, note, length in events:
        start = row * frames_per_row
        dur = length * frames_per_row
        base = midi(note) + transpose
        arp = (arp_by_row or {}).get(row, ins.get("arp") or [0])
        for k in range(dur):
            f = start + k
            if f >= len(ch.kind):
                break
            env = ins["env"]
            v = env[k] if k < len(env) else ins["sustain"]
            # release: last 2 frames of a held note drop a little (articulation)
            if ins["sustain"] and ins.get("release", True) and k >= dur - 1:
                v = max(0, v - 3)
            m = base + arp[k % len(arp)]
            clk, n, actual = pokey_tone(m)
            ch.kind[f], ch.freq[f], ch.vol[f] = "tone", actual, v


def render_drums(ch, pattern, frames_per_row, start_row=0):
    """pattern: string of drum letters / '.' per row."""
    for i, c in enumerate(pattern.replace(" ", "")):
        if c == ".":
            continue
        start = (start_row + i) * frames_per_row
        for k, (kind, p, v) in enumerate(DRUMS[c]):
            f = start + k
            if f >= len(ch.kind):
                break
            if kind == "tone":
                ch.kind[f], ch.freq[f], ch.vol[f] = "tone", pokey_tone(p)[2], v
            else:
                ch.kind[f], ch.freq[f], ch.vol[f] = "noise", CLK64 / (p + 1), v


def mix(channels, frames, gain=1.0):
    out = np.zeros(frames * SPF, dtype=np.float64)
    t = np.arange(SPF)
    for ch in channels:
        phase = 0.0
        npos = 0.0
        for f in range(frames):
            v = ch.vol[f]
            kind = ch.kind[f]
            if kind == "off" or v == 0:
                continue
            seg = slice(f * SPF, (f + 1) * SPF)
            if kind == "tone":
                ph = phase + ch.freq[f] * t / SR
                sq = np.where((ph % 1.0) < 0.5, 1.0, -1.0)
                phase = (phase + ch.freq[f] * SPF / SR) % 1.0
                out[seg] += v * sq
            else:
                idx = (npos + ch.freq[f] * t / SR).astype(np.int64) % len(POLY)
                npos += ch.freq[f] * SPF / SR
                out[seg] += v * POLY[idx]
    out /= 60.0
    # one-pole lowpass ~7 kHz (TV speaker) and DC block
    a = np.exp(-2 * np.pi * 7000 / SR)
    from scipy.signal import lfilter
    y = lfilter([1 - a], [1, -a], out)
    y -= np.convolve(y, np.ones(2205) / 2205, mode="same")
    peak = np.max(np.abs(y)) or 1.0
    y = y / peak * 0.85 * gain
    return y


def fade_tail(y, seconds=1.5):
    n = int(seconds * SR)
    y[-n:] *= np.linspace(1, 0, n)
    return y


def write_wav(path, y):
    data = (np.clip(y, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
