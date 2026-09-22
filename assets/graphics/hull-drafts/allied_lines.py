import final_set as F
from PIL import Image

def allied(ribs=False, seams=False, inner_band=False):
    P = F.slab_patterns("2")
    P["line"] = ["0200"] * 8                         # one glyph: outer frame line AND inner rib
    P["seam"] = ["2222"] + ["0000"] * 7
    P["band2"] = ["2220"] * 8                        # second, inner slab band
    def extra(g, D):
        for r in range(32):
            if ribs:
                if g[r][1] == "deck":
                    g[r][1] = "line"
                if D[r] == D[r - 1] and D[r] - 3 >= 2 and g[r][D[r] - 3] == "deck":
                    g[r][D[r] - 3] = "line"
            if inner_band and D[r] == D[r - 1] and g[r][D[r] - 2] == "deck":
                g[r][D[r] - 2] = "band2"
            if seams and r % 8 == 0:
                for c in range(2, D[r] - 3):
                    if g[r][c] == "deck":
                        g[r][c] = "seam"
    g = F.build(F.A_D, P, accents={3, 14, 21, 28}, extra=extra)
    F.turret(g, 9, F.A_D[9] - 4)
    return g, P

enemies = [F.r1(), F.r2(), F.r4()]
variants = [("A dzis: sama sciana", {}),
            ("B + linia ramy i zebro (1 glif)", dict(ribs=True)),
            ("C + zebro + szwy poprzeczne", dict(ribs=True, seams=True)),
            ("D + druga pasmo sciany", dict(ribs=True, inner_band=True))]
panels = []
for name, kw in variants:
    g, P = allied(**kw)
    ab = F.budget(g, P)
    worst = 0
    for eg, EP in enemies:
        eb = F.budget(eg, EP)
        shared = {p for p in eb if tuple(r[::-1] for r in p) in ab and not any("3" in r for r in p)}
        worst = max(worst, len(ab) + len(eb) - len(shared))
    eg, EP = F.r1()
    panels.append(F.screen(F.resolve(g, P, "allied"), F.resolve(eg, EP, "enemy"),
                           f"{name}   sojusznik {len(ab)}  | najgorszy region {worst}/14"))
w, h = panels[0].size
sheet = Image.new("RGB", (w * 2 + 12, h * 2 + 12), (40, 40, 40))
for i, p in enumerate(panels):
    sheet.paste(p, ((i % 2) * (w + 12), (i // 2) * (h + 12)))
sheet.save("allied-lines-sheet.png")
