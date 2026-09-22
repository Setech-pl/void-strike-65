"""Builds the owner-approved music as format-v2 sources (menu = sketch B, gameplay = GRA-2)
and renders previews FROM THE JSON FILES, so what the owner hears is what the files say.

Format v2 (proposal for the plan session):
  pitches      shared table, ids -> 8-bit AUDF dividers at the 64 kHz clock (AUDCTL 0).
               'pure' block is chromatic and contiguous, so an arpeggio offset of k
               semitones is simply table index + k. 'buzz' block = distortion $C (poly4)
               dividers for bass below the pure-tone floor (~B2).
  instruments  distortion (pure $A / buzz $C / noise $8), a per-frame volume envelope
               (last value held), optional per-frame arpeggio (table-index offsets, cycled).
  drums        per-frame macros of raw (distortion, AUDF, volume) — kick, snare, hat.
  patterns     16 rows x channels; tokens 'INSTR:PITCH', 'DRUM', 'HOLD', 'REST'.
"""
import json, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pokey_synth import CLK64, SR, SPF, POLY, midi, hz, fade_tail, write_wav

OUT = os.path.dirname(os.path.abspath(__file__))
NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def note_name(m):
    return f"{NAMES[m % 12]}{m // 12 - 1}"


# ---------------- shared pitch table ----------------
PURE_LO, PURE_HI = midi("B2"), midi("C6")
PITCHES = []
for m in range(PURE_LO, PURE_HI + 1):
    n = int(round(CLK64 / (2 * hz(m)))) - 1
    PITCHES.append({"id": note_name(m), "kind": "pure", "divider": min(n, 255)})
# buzz bass: f = clk / ((N+1) * 15); N+1 must not be divisible by 3 or 5 (poly4 period)
for name in ["C2", "E2", "F2", "G2", "A2"]:
    target = CLK64 / (hz(midi(name)) * 15)
    cands = [k for k in range(int(target) - 3, int(target) + 4) if k % 3 and k % 5]
    k = min(cands, key=lambda k: abs(np.log2(CLK64 / (k * 15) / hz(midi(name)))))
    PITCHES.append({"id": name + "~", "kind": "buzz", "divider": k - 1})
PIDX = {p["id"]: i for i, p in enumerate(PITCHES)}


def cents(p):
    base = p["id"].rstrip("~")
    f = CLK64 / (2 * (p["divider"] + 1)) if p["kind"] == "pure" else CLK64 / ((p["divider"] + 1) * 15)
    return round(1200 * np.log2(f / hz(midi(base))))


for p in PITCHES:
    p["centsOff"] = cents(p)

# ---------------- instruments ----------------
MENU_INSTR = {
    "BASS_BUZZ": {"distortion": "buzz", "volume": [11, 9, 7, 5, 3, 1, 0]},
    "BASS_PURE": {"distortion": "pure", "volume": [11, 9, 7, 5, 3, 1, 0]},
    "LEAD":      {"distortion": "pure", "volume": [11, 10, 9, 9, 8]},
    "ARP_MIN":   {"distortion": "pure", "volume": [6, 6, 5], "arp": [0, 3, 7]},
    "ARP_MAJ":   {"distortion": "pure", "volume": [6, 6, 5], "arp": [0, 4, 7]},
}
DRUMS = {  # per frame: [distortion, AUDF, volume]
    "KICK":  [["buzz", 42, 13], ["buzz", 57, 11], ["buzz", 76, 8], ["buzz", 91, 5], ["buzz", 102, 2]],
    "SNARE": [["noise", 4, 12], ["noise", 6, 9], ["noise", 8, 6], ["noise", 8, 4], ["noise", 8, 2], ["noise", 8, 1]],
    "HAT":   [["noise", 1, 5], ["noise", 1, 2]],
}
GAME_INSTR = {  # same timbres, ~60 % level so SFX stay on top (owner tunes in smoke)
    "BASS_G": {"distortion": "pure", "volume": [7, 6, 4, 3, 2, 1, 0]},
    "LEAD_G": {"distortion": "pure", "volume": [7, 6, 6, 5, 5]},
}


def to_rows(events, total_rows):
    """events: (row, token, length) -> list of per-row tokens with HOLD/REST."""
    rows = ["REST"] * total_rows
    for r, tok, n in events:
        rows[r] = tok
        for k in range(1, n):
            if r + k < total_rows:
                rows[r + k] = "HOLD"
    return rows


def seq_events(pattern, instr):
    out, r = [], 0
    for note, n in pattern:
        if note is not None:
            out.append((r, f"{instr}:{note}", n))
        r += n
    return out


def patterns_from(channels, bars):
    pats, order = {}, []
    for b in range(bars):
        name = f"bar{b + 1:02d}"
        pats[name] = [[channels[c][b * 16 + r] for c in range(len(channels))] for r in range(16)]
        order.append(name)
    return pats, order


# ---------------- MENU: sketch B ----------------
def build_menu():
    chords = [("A", "MIN"), ("F", "MAJ"), ("C", "MAJ"), ("G", "MAJ"),
              ("A", "MIN"), ("F", "MAJ"), ("G", "MAJ"), ("E", "MAJ")]
    rows = 16 * len(chords)
    bass, arp = [], []
    for i, (root, q) in enumerate(chords):
        for k in range(8):
            tok = f"BASS_BUZZ:{root}2~" if k % 2 == 0 else f"BASS_PURE:{root}3"
            bass.append((i * 16 + k * 2, tok, 2))
        arp.append((i * 16, f"ARP_{q}:{root}4", 16))
    lead = [("E5", 2), ("A5", 2), ("E5", 2), ("C5", 2), ("D5", 2), ("E5", 4), ("A4", 2),
            ("C5", 2), ("D5", 2), ("C5", 2), ("A4", 2), ("F4", 4), ("A4", 4),
            ("G4", 2), ("C5", 2), ("E5", 2), ("G5", 2), ("E5", 4), ("D5", 2), ("C5", 2),
            ("D5", 8), ("B4", 4), ("G4", 4),
            ("E5", 2), ("A5", 2), ("E5", 2), ("C5", 2), ("D5", 2), ("E5", 4), ("A5", 2),
            ("C6", 4), ("A5", 4), ("F5", 4), ("A5", 4),
            ("B5", 4), ("G5", 4), ("D5", 4), ("B4", 4),
            ("B4", 4), ("E5", 4), ("G#5", 8)]
    drums = "K.H.S.H.K.K.S.HH" * 7 + "K.H.S.H.S.S.SSSS"
    dmap = {"K": "KICK", "S": "SNARE", "H": "HAT", ".": "HOLD"}
    ch = [to_rows(bass, rows), [dmap[c] for c in drums],
          to_rows(seq_events(lead, "LEAD"), rows), to_rows(arp, rows)]
    pats, order = patterns_from(ch, len(chords))
    return {
        "formatVersion": 2, "title": "Void Strike — Menu (sketch B)", "originalComposition": True,
        "targetFrameHz": 50, "audctl": 0, "framesPerRow": 6, "rowsPerPattern": 16,
        "channels": [
            {"channel": 1, "role": "bass: buzz root / pure octave bounce"},
            {"channel": 2, "role": "drums: kick (buzz sweep), snare and hat (noise)"},
            {"channel": 3, "role": "lead melody"},
            {"channel": 4, "role": "chord arpeggio (per-frame)"}],
        "pitchTable": "shared (see pitches in this file)",
        "pitches": PITCHES, "instruments": MENU_INSTR, "drums": DRUMS,
        "patterns": pats, "sequence": order,
    }


# ---------------- GAMEPLAY: GRA-2 ----------------
def build_game():
    import gameplay as g
    rows = 16 * len(g.CHORDS)
    bass = [(r, f"BASS_G:{n}", l) for r, n, l in g.bass_events(staccato=False)]
    ch = [to_rows(bass, rows), to_rows(seq_events(g.LEAD_EXT, "LEAD_G"), rows)]
    pats, order = patterns_from(ch, len(g.CHORDS))
    return {
        "formatVersion": 2, "title": "Void Strike — Gameplay (GRA-2)", "originalComposition": True,
        "targetFrameHz": 50, "audctl": 0, "framesPerRow": 6, "rowsPerPattern": 16,
        "channels": [
            {"channel": 1, "role": "bass ostinato", "preemptedBy": "PROPOSED: nothing (bass keeps the pulse)"},
            {"channel": 2, "role": "lead", "preemptedBy": "PROPOSED: Player Fighter shot and hit SFX"}],
        "reservedSfxChannels": [{"channel": 3, "role": "engine bed"}, {"channel": 4, "role": "capital-hull explosion"}],
        "pitchTable": "shared with menu-theme",
        "instruments": GAME_INSTR, "patterns": pats, "sequence": order,
    }


# ---------------- renderer that reads the JSON ----------------
POLY4 = None


def poly4_seq():
    reg, out = 0xF, []
    for _ in range(15):
        bit = ((reg >> 0) ^ (reg >> 1)) & 1
        reg = (reg >> 1) | (bit << 3)
        out.append(1 if reg & 1 else -1)
    return np.array(out, dtype=np.float64)


P4 = poly4_seq()
t = np.arange(SPF)


def wave_frame(dist, divider, vol, state):
    if vol == 0:
        return np.zeros(SPF)
    if dist == "pure":
        f = CLK64 / (2 * (divider + 1))
        ph = state["ph"] + f * t / SR
        state["ph"] = (state["ph"] + f * SPF / SR) % 1.0
        return vol * np.where((ph % 1.0) < 0.5, 1.0, -1.0)
    rate = CLK64 / (divider + 1)       # sample ticks per second
    pos = state["pos"] + rate * t / SR
    state["pos"] += rate * SPF / SR
    k = pos.astype(np.int64)
    if dist == "buzz":
        step = (13 * (divider + 1)) % 15   # poly4 advances 28 CPU clocks per 64 kHz tick
        return vol * P4[(k * step) % 15]
    return vol * POLY[k % len(POLY)]


def render(song, pitches, instruments, drums, loops, path):
    fpr = song["framesPerRow"]
    nch = len(song["channels"])
    frames_per_loop = len(song["sequence"]) * 16 * fpr
    out = np.zeros(frames_per_loop * loops * SPF)
    for c in range(nch):
        state = {"ph": 0.0, "pos": 0.0}
        cur = None  # (kind, name, base_index, age)
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
                            cur = ("inst", ins, PIDX[p], 0)
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
                                dist = ins["distortion"]
                                w = wave_frame(dist, pitches[idx]["divider"], v, state)
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


if __name__ == "__main__":
    # PROVENANCE ONLY. This is the tool that composed the owner-approved v2
    # sketches; the committed themes in assets/music are its output and the
    # register-stream tests pin them by SHA-256. It refuses to overwrite a
    # theme unless you ask for it, and it writes into this directory, never
    # over assets/music. To audition an EDIT, use ../render.py instead.
    if "--write" not in sys.argv:
        raise SystemExit(
            "provenance only: pass --write to regenerate the sketches into this directory; "
            "assets/music/preview/render.py is how a theme is auditioned")
    menu, game = build_menu(), build_game()
    for name, doc in [("menu-theme.v2.json", menu), ("gameplay-theme.v2.json", game)]:
        with open(os.path.join(OUT, name), "w") as fh:
            json.dump(doc, fh, indent=1)
    # render back from the written files
    menu = json.load(open(os.path.join(OUT, "menu-theme.v2.json")))
    game = json.load(open(os.path.join(OUT, "gameplay-theme.v2.json")))
    render(menu, menu["pitches"], menu["instruments"], menu["drums"], 2, os.path.join(OUT, "MENU-B-z-pliku.wav"))
    render(game, menu["pitches"], game["instruments"], {}, 2, os.path.join(OUT, "GRA-2-z-pliku.wav"))
    print("pitches:", len(PITCHES), "worst cents:",
          sorted(((abs(p["centsOff"]), p["id"]) for p in PITCHES), reverse=True)[:6])
