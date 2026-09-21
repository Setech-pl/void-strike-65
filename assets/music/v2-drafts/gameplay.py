"""Gameplay-theme sketches: style B (menu) with D's bounce, 2 POKEY channels only
(ch1 bass, ch2 lead) — channels 3/4 stay SFX-only as in the current game.

G1 = STRICT: fits today's gameplay format exactly — one 14-entry pitch table shared
     by both channels, fixed volume per channel (no envelopes), per-row HOLD/REST.
G2 = EXTENDED: same score + per-frame volume envelopes and a few extra pitches
     (B4, G#4/G#5) — needs a small player extension."""
import os
from pokey_synth import *

OUT = os.path.dirname(os.path.abspath(__file__))
FPR = 6          # frames per row (125 BPM at 4 rows/beat), same as today's gameplay theme
TABLE = ["E3", "F3", "G3", "A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4", "C5", "D5", "E5"]

INSTR["flat_bass"] = dict(env=[8], sustain=8, release=False)
INSTR["flat_lead"] = dict(env=[9], sustain=9, release=False)

CHORDS = ["A", "F", "C", "G", "A", "F", "G", "E",
          "D", "A", "F", "G", "D", "A", "E", "E"]
BASS_PAIR = {"A": ("A3", "A4"), "F": ("F3", "F4"), "C": ("C4", "G3"), "G": ("G3", "G4"),
             "E": ("E3", "E4"), "D": ("D4", "A3")}

LEAD_STRICT = [
    ("E5", 2), ("C5", 2), ("A4", 2), ("C5", 2), ("D5", 2), ("E5", 3), (None, 1), ("A4", 2),
    ("C5", 2), ("A4", 2), ("F4", 2), ("A4", 2), ("C5", 4), ("A4", 3), (None, 1),
    ("G4", 2), ("C5", 2), ("E5", 2), ("D5", 2), ("C5", 4), ("G4", 3), (None, 1),
    ("D5", 6), (None, 2), ("G4", 4), ("A4", 2), (None, 2),
    ("E5", 2), ("C5", 2), ("A4", 2), ("C5", 2), ("D5", 2), ("E5", 3), (None, 1), ("E5", 2),
    ("F4", 2), ("A4", 2), ("C5", 2), ("F4", 2), ("A4", 4), ("C5", 4),
    ("D5", 4), ("C5", 2), ("D5", 2), ("G4", 4), (None, 4),
    ("E4", 4), ("E5", 8), (None, 4),
    # B section
    ("D5", 2), ("A4", 2), ("F4", 2), ("A4", 2), ("D5", 4), ("C5", 2), ("D5", 2),
    ("E5", 6), (None, 2), ("C5", 2), ("A4", 2), ("C5", 2), ("E5", 2),
    ("F4", 2), ("A4", 2), ("C5", 2), ("A4", 2), ("F4", 2), ("A4", 2), ("C5", 2), ("D5", 2),
    ("E5", 4), ("D5", 4), ("C5", 4), ("D5", 4),
    ("D5", 2), ("A4", 2), ("F4", 2), ("A4", 2), ("D5", 4), ("E5", 4),
    ("C5", 2), ("E5", 2), ("A4", 2), ("C5", 2), ("E5", 4), (None, 4),
    ("E5", 2), ("D5", 2), ("C5", 2), ("A4", 2), ("G4", 4), ("E4", 4),
    ("E4", 2), (None, 2), ("E4", 2), (None, 2), ("E5", 4), (None, 4),
]

# extended version: same score, a few leading-tone colours the strict table lacks
LEAD_EXT = list(LEAD_STRICT)
LEAD_EXT[46:49] = [("B4", 4), ("E5", 4), ("G#5", 8)]          # bar 8 on E major
LEAD_EXT[-4:] = [("B4", 2), ("E5", 2), ("G#5", 4), (None, 4)]   # bar 16 turnaround


def bass_events(staccato):
    ev = []
    for i, c in enumerate(CHORDS):
        lo, hi = BASS_PAIR[c]
        for k in range(8):
            ev.append((i * 16 + k * 2, lo if k % 2 == 0 else hi, 1 if staccato else 2))
    return ev


def check_bars(pattern):
    total = sum(n for _, n in pattern)
    assert total == 16 * len(CHORDS), total


def render(name, lead, bass_instr, lead_instr, strict, loops=2):
    check_bars(lead)
    if strict:
        used = {n for n, _ in lead if n} | {n for _, n, _ in bass_events(True)}
        missing = used - set(TABLE)
        assert not missing, f"not in 14-note table: {missing}"
    rows = 16 * len(CHORDS)
    frames = rows * FPR * loops
    ch1, ch2 = Channel(frames), Channel(frames)
    for loop in range(loops):
        off = loop * rows
        b = [(r + off, n, l) for r, n, l in bass_events(staccato=strict)]
        render_melodic(ch1, b, FPR, bass_instr)
        render_melodic(ch2, [(r + off, n, l) for r, n, l in seq(lead)], FPR, lead_instr)
    y = fade_tail(mix([ch1, ch2], frames))
    write_wav(os.path.join(OUT, name), y)
    print(name, f"{frames / 50:.1f}s")


if __name__ == "__main__":
    render("GRA-1-obecny-format.wav", LEAD_STRICT, "flat_bass", "flat_lead", strict=True)
    render("GRA-2-z-obwiednia.wav", LEAD_EXT, "bass_s", "lead", strict=False)
