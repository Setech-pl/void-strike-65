"""Audition a format-2 theme: render assets/music/*.json to a WAV.

    python3 assets/music/preview/render.py assets/music/menu-theme.json out.wav

This is the reference renderer -- the half of the original sketch tool that
READS a theme. It never writes a JSON file. Its per-frame voice rules are the
specification of what the music is: scripts/music-oracle.mjs is an independent
port of the loop below, and tests/music-v2-stream.test.mjs and
tests/music-v2-runtime.test.mjs hold the converter and the 6502 player to it.

Change a theme by editing its JSON, render it here, listen, and only then
build. The register-stream tests pin the approved music by SHA-256, so a
deliberate retune needs fresh owner acceptance, which is the point.

Options:
  --pitches FILE   take the pitch table from another theme (the gameplay theme
                   shares the menu's table)
  --loops N        how many times to play the loop (default 2)

Requires numpy and scipy, like every preview tool in this repository; nothing
in the build depends on it.
"""
import argparse
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pokey_synth import CLK64, POLY, SPF, SR, fade_tail, write_wav  # noqa: E402


def poly4_seq():
    """The 4-bit polynomial POKEY runs for distortion $C, as +-1 over its 15 clocks."""
    reg, out = 0xF, []
    for _ in range(15):
        bit = ((reg >> 0) ^ (reg >> 1)) & 1
        reg = (reg >> 1) | (bit << 3)
        out.append(1 if reg & 1 else -1)
    return np.array(out, dtype=np.float64)


P4 = poly4_seq()
T = np.arange(SPF)


def wave_frame(dist, divider, vol, state):
    if vol == 0:
        return np.zeros(SPF)
    if dist == "pure":
        f = CLK64 / (2 * (divider + 1))
        ph = state["ph"] + f * T / SR
        state["ph"] = (state["ph"] + f * SPF / SR) % 1.0
        return vol * np.where((ph % 1.0) < 0.5, 1.0, -1.0)
    rate = CLK64 / (divider + 1)  # sample ticks per second
    pos = state["pos"] + rate * T / SR
    state["pos"] += rate * SPF / SR
    k = pos.astype(np.int64)
    if dist == "buzz":
        step = (13 * (divider + 1)) % 15  # poly4 advances 28 CPU clocks per 64 kHz tick
        return vol * P4[(k * step) % 15]
    return vol * POLY[k % len(POLY)]


def render(song, pitches, loops, path):
    """One voice per channel; a token starts it, HOLD keeps it, REST forgets it."""
    index = {p["id"]: i for i, p in enumerate(pitches)}
    instruments = song.get("instruments", {})
    drums = song.get("drums", {})
    fpr = song["framesPerRow"]
    rows = song["rowsPerPattern"]
    frames_per_loop = len(song["sequence"]) * rows * fpr
    out = np.zeros(frames_per_loop * loops * SPF)
    for c in range(len(song["channels"])):
        state = {"ph": 0.0, "pos": 0.0}
        cur = None  # (kind, name, base index, age)
        f = 0
        for _ in range(loops):
            for pname in song["sequence"]:
                for row in song["patterns"][pname]:
                    tok = row[c]
                    if tok == "REST":
                        cur = None
                    elif tok != "HOLD":
                        if ":" in tok:
                            ins, p = tok.split(":")
                            cur = ("inst", ins, index[p], 0)
                        else:
                            cur = ("drum", tok, None, 0)
                    for _k in range(fpr):
                        if cur is not None:
                            kind, name, base, age = cur
                            if kind == "inst":
                                ins = instruments[name]
                                env = ins["volume"]
                                v = env[min(age, len(env) - 1)]
                                arp = ins.get("arp", [0])
                                idx = base + arp[age % len(arp)]
                                w = wave_frame(ins["distortion"], pitches[idx]["divider"], v, state)
                            else:
                                mac = drums[name]
                                if age < len(mac):
                                    d, div, v = mac[age]
                                    w = wave_frame(d, div, v, state)
                                else:
                                    w = np.zeros(SPF)
                            out[f * SPF:(f + 1) * SPF] += w
                            cur = (kind, name, base, age + 1)
                        f += 1
    out /= 60.0
    from scipy.signal import lfilter
    a = np.exp(-2 * np.pi * 7000 / SR)
    y = lfilter([1 - a], [1, -a], out)
    y -= np.convolve(y, np.ones(2205) / 2205, mode="same")
    y = y / (np.max(np.abs(y)) or 1) * 0.85
    write_wav(path, fade_tail(y))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("theme", help="a format-2 theme JSON in assets/music")
    parser.add_argument("output", help="the WAV file to write")
    parser.add_argument("--pitches", help="take the pitch table from this theme instead")
    parser.add_argument("--loops", type=int, default=2)
    args = parser.parse_args()

    with open(args.theme) as handle:
        song = json.load(handle)
    if song.get("formatVersion") != 2:
        raise SystemExit(f"{args.theme} is not a format-2 theme")
    if args.pitches:
        with open(args.pitches) as handle:
            pitches = json.load(handle)["pitches"]
    else:
        pitches = song["pitches"]
    render(song, pitches, args.loops, args.output)
    print(f"wrote {args.output}: {len(song['sequence'])} bars, "
          f"{len(song['sequence']) * song['rowsPerPattern'] * song['framesPerRow']} frames "
          f"per loop, {args.loops} loops")


if __name__ == "__main__":
    main()
