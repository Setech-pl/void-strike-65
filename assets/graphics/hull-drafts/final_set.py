"""Recommended final hull set, GLYPH-BASED (4x8 ANTIC-4 cells, the real constraint).
Allied B-SLAB with solid diagonal chamfers (lit = white on advance, shadow = solid on retreat)
+ 4 enemy regions. Patterns are authored in ALLIED orientation (corridor edge on the right);
enemy = horizontal mirror. Budget is COUNTED from the built maps."""
import json, random
from PIL import Image, ImageDraw, ImageFont

VS = "/tmp/claude-0/-home-claude/43f460dc-0516-54ce-bb64-18ab4557456b/scratchpad/vs"
OUT = "/tmp/claude-0/-home-claude/43f460dc-0516-54ce-bb64-18ab4557456b/scratchpad/hulls"
HULLS = json.load(open(f"{VS}/assets/graphics/capital-hulls.json"))
GLYPH = {g["name"]: g["pixels"] for g in HULLS["glyphs"]}
RGB = {0: (4, 4, 4), 1: (211, 211, 211), 2: (13, 58, 115)}
AMBER, BURG = (250, 204, 144), (128, 48, 111)


def rec(p, m):
    return ["".join(m.get(c, c) for c in r) for r in p]


def mir(p):
    return [r[::-1] for r in p]


def slab_patterns(c):            # c = faction colour digit ("2" allied steel, "3" enemy burgundy)
    acc = "3" if c == "2" else "2"
    P = {
        "deck":   ["0000"] * 8,
        "wall":   [f"{c*3}1"] * 8,
        "wacc":   [f"{c*3}1"] * 3 + [f"{acc}{c*2}1"] * 2 + [f"{c*3}1"] * 3,
        "solid":  [c * 4] * 8,
        "ch_out": ["1000", "1000", "1100", "1100", "1110", "1110", "1111", "1111"],     # lit face
        "ch_in":  [f"{c*3}1", f"{c*3}1", f"{c*2}10", f"{c*2}10", f"{c}100", f"{c}100", "1000", "1000"],
    }
    return P


def profile(segments):
    """(cells, rows) runs -> per-row depth in cells; each change is a 45-degree chamfer of one
    cell per row, eaten from the start of the new run."""
    D = []
    prev = segments[-1][0]
    for cells, rows in segments:
        cur = prev
        for i in range(rows):
            if cur != cells:
                cur += 1 if cells > cur else -1
            D.append(cur)
        prev = cells
    assert len(D) == 32 and D[0] == D[-1] + (1 if D[0] > D[-1] else -1 if D[0] < D[-1] else 0) or True
    return D


def build(D, P, fill="deck", accents=(), extra=None):
    """grid[r][c] = role name (None = space), allied orientation."""
    g = [[None] * 9 for _ in range(32)]
    for r in range(32):
        d, dp = D[r], D[r - 1]
        for c in range(d):
            g[r][c] = fill
        if d > dp:                                  # advancing chamfer row
            g[r][d - 2] = "solid" if fill == "deck" else fill
            g[r][d - 1] = "ch_out"
        elif d < dp:                                # retreating chamfer row (hull still in col d)
            g[r][d - 1] = "solid" if fill == "deck" else fill
            g[r][d] = "ch_in"
        else:
            g[r][d - 1] = "wacc" if r in accents else "wall"
    if extra:
        extra(g, D)
    return g


def turret(g, row, x):
    for dr in (-1, 1):
        for c in (x, x + 1, x + 2):
            g[row + dr][c] = "T:turret_base"
    g[row][x] = "T:turret_base"
    g[row][x + 1] = "T:turret_housing"
    g[row][x + 2] = "T:turret_barrel"
    g[row][x + 3] = "T:turret_barrel"
    g[row][x + 4] = "T:turret_muzzle"


def resolve(g, P, faction):
    out = []
    for row in g:
        o = []
        for k in row:
            if k is None:
                o.append(None)
            elif k.startswith("T:"):
                pix = GLYPH[f"{faction}_{k[2:]}"]
                o.append(pix if faction == "allied" else mir(pix))   # stored enemy-oriented
            else:
                o.append(P[k])
        out.append(o)
    return out


def budget(g, P):
    return {tuple(P[k]) for row in g for k in row if k and not k.startswith("T:")}


# ---------------------------------------------------------------- the set
A_P = slab_patterns("2")
A_D = profile([(6, 5), (8, 7), (6, 4), (5, 6), (7, 6), (6, 4)])
A_G = build(A_D, A_P, accents={3, 14, 21, 28})
turret(A_G, 9, A_D[9] - 4)

E_P = slab_patterns("3")


def r1():
    D = profile([(7, 6), (5, 5), (6, 5), (8, 6), (6, 4), (7, 6)])
    g = build(D, E_P, accents={2, 13, 22, 28})
    turret(g, 19, D[19] - 4)
    return g, dict(E_P)


def r2():
    P = dict(E_P)
    P["rib"] = ["0300"] * 8
    P["vent"] = ["2222", "2222", "0000", "0000", "2222", "2222", "0000", "0000"]

    def extra(g, D):
        for r in range(32):
            if D[r] == D[r - 1] and D[r] - 3 >= 1 and g[r][D[r] - 3] == "deck":
                g[r][D[r] - 3] = "rib"
        for r in (4, 5, 21, 22):
            if D[r] == D[r - 1]:
                g[r][D[r] - 3] = g[r][D[r] - 2] = "vent"
    D = profile([(8, 8), (6, 4), (7, 6), (5, 4), (7, 6), (8, 4)])
    g = build(D, P, accents={11, 18, 29}, extra=extra)
    turret(g, 2, D[2] - 4)
    turret(g, 26, D[26] - 4)
    return g, P


def r4():
    P = dict(E_P)
    P["fill"] = ["3333"] * 8
    P["ch_in"] = ["3331", "3331", "3310", "3310", "3100", "3100", "1000", "1000"]
    P["ch_out"] = ["3111", "3111", "3311", "3311", "3331", "3331", "3333", "3333"]   # mass behind lit face
    P["groove_v"] = ["3033"] * 8
    P["groove_h"] = ["0000"] + ["3333"] * 7

    def extra(g, D):
        for r in range(32):
            if D[r] > 4 and g[r][2] == "fill":
                g[r][2] = "groove_v"
        for r in (0, 16):
            for c in range(D[r] - 1):
                if g[r][c] in ("fill", "groove_v"):
                    g[r][c] = "groove_h"
    D = profile([(8, 6), (7, 4), (8, 6), (6, 5), (7, 5), (8, 6)])
    g = build(D, P, fill="fill", accents={4, 11, 21, 27}, extra=extra)
    turret(g, 13, D[13] - 4)
    turret(g, 28, D[28] - 4)
    return g, P


def current():
    rows = HULLS["maps"]["enemy"]["rows"]
    return [[None if n == "space" else GLYPH[n] for n in rows[r].split()] for r in range(32)]


# ---------------------------------------------------------------- draw
def screen(ag, eg_cells, title, phase=40, scale=3, enemy_raw=False):
    img = Image.new("RGB", (320 * scale, 200 * scale), RGB[0])
    dr = ImageDraw.Draw(img)
    rnd = random.Random(7)
    for _ in range(70):
        x, y = rnd.randrange(40, 120) * 2, rnd.randrange(0, 200)
        dr.rectangle([x * scale, y * scale, (x + 2) * scale - 1, (y + 1) * scale - 1],
                     fill=RGB[1] if rnd.random() < .3 else RGB[2])

    def blit(cells, x0, mirror, p3, raw):
        for y in range(200):
            yy = (y + phase) % 256
            r, ly = divmod(yy, 8)
            for c in range(9):
                pix = cells[r][c]
                if pix is None:
                    continue
                row = pix[ly]
                for lx in range(4):
                    v = int(row[lx])
                    if not v:
                        continue
                    col = p3 if v == 3 else RGB[v]
                    if raw:                                  # already enemy-oriented, col 0 at corridor
                        sx = x0 + c * 4 + lx
                    elif mirror:
                        sx = x0 + (35 - (c * 4 + lx))
                    else:
                        sx = x0 + c * 4 + lx
                    X = sx * 2 * scale
                    dr.rectangle([X, y * scale, X + 2 * scale - 1, (y + 1) * scale - 1], fill=col)
    blit(ag, 0, False, AMBER, False)
    blit(eg_cells, 124, True, BURG, enemy_raw)
    fx, fy = 156, 150
    for dy, row in enumerate(["...##...", "..####..", ".######.", "##.##.##", "#..##..#"]):
        for dx, ch in enumerate(row):
            if ch == "#":
                dr.rectangle([(fx + dx) * scale, (fy + dy) * scale, (fx + dx + 1) * scale - 1,
                              (fy + dy + 1) * scale - 1], fill=RGB[1])
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 19)
    dr.rectangle([0, 0, 320 * scale, 30], fill=(20, 20, 20))
    dr.text((8, 5), title, fill=(235, 235, 235), font=f)
    return img


if __name__ == "__main__":
    a_cells = resolve(A_G, A_P, "allied")
    a_b = budget(A_G, A_P)
    report, panels = {"allied_codes": len(a_b)}, []
    for i, (name, fn) in enumerate([("R1 poz.1-4 slab bordo", r1), ("R2 poz.5-8 slab + zebro/wyrzutnie", r2),
                                    ("R3 poz.9-12 obecny wrog", None), ("R4 poz.13-16 armour", r4)]):
        if fn:
            g, P = fn()
            e_b = budget(g, P)
            shared = {p for p in e_b if tuple(r[::-1] for r in p) in a_b and not any("3" in r for r in p)}
            own = len(e_b) - len(shared)
            tot = len(a_b) + own
            title = f"{name}   sojusznik {len(a_b)} + wrog {own} = {tot}/14"
            report[name] = dict(enemy_own=own, shared=len(shared), total=tot)
            panels.append(screen(a_cells, resolve(g, P, "enemy"), title))
        else:
            panels.append(screen(a_cells, current(), f"{name}   (glify jak dzis)", enemy_raw=True))
    w, h = panels[0].size
    from PIL import Image as I
    sheet = I.new("RGB", (w * 2 + 12, h * 2 + 12), (40, 40, 40))
    for i, p in enumerate(panels):
        sheet.paste(p, ((i % 2) * (w + 12), (i // 2) * (h + 12)))
        p.save(f"{OUT}/final-R{i + 1}.png")
    sheet.save(f"{OUT}/final-set-sheet.png")
    print(json.dumps(report, indent=1))
