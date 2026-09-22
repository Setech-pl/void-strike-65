"""Owner-approved v2: full-mass hulls (allied + 4 enemy regions), rendered and budget-counted."""
import json
import final_set as F
from PIL import Image

def mass_patterns(c):
    P = dict(F.slab_patterns(c))
    acc = "3" if c == "2" else "2"
    P["solid"] = [c * 4] * 8
    P["wall"] = [f"{c*3}1"] * 8
    P["wacc"] = [f"{c*3}1"] * 3 + [f"{acc}{c*2}1"] * 2 + [f"{c*3}1"] * 3
    P["ch_out"] = [f"{c}111", f"{c}111", f"{c*2}11", f"{c*2}11", f"{c*3}1", f"{c*3}1", c * 4, c * 4]
    P["ch_in"] = [f"{c*3}1", f"{c*3}1", f"{c*3}1", f"{c*3}1", f"{c*2}10", f"{c*2}10", f"{c}100", f"{c}100"]
    P["groove"] = [f"{c}0{c}{c}"] * 8
    P["seam"] = ["0000"] + [c * 4] * 7
    for k in ("deck",):
        P.pop(k, None)
    return P

ACC_A = {3, 10, 17, 24, 31}

def allied_mass():
    P = mass_patterns("2")
    def extra(g, D):
        for r in range(32):
            if g[r][1] == "solid":
                g[r][1] = "groove"
            if r % 10 == 3:
                for c in range(0, max(0, D[r] - 2)):
                    if g[r][c] in ("solid", "groove"):
                        g[r][c] = "seam"
    g = F.build(F.A_D, P, fill="solid", accents=ACC_A, extra=extra)
    F.turret(g, 9, F.A_D[9] - 4)
    return g, P

def r1_mass():                       # slab: one long groove line, calm surface
    P = mass_patterns("3"); P.pop("seam")
    def extra(g, D):
        for r in range(32):
            if g[r][1] == "solid":
                g[r][1] = "groove"
            if D[r] == D[r - 1] and D[r] - 3 >= 2 and g[r][D[r] - 3] == "solid":
                g[r][D[r] - 3] = "groove"
    D = F.profile([(7, 6), (5, 5), (6, 5), (8, 6), (6, 4), (7, 6)])
    g = F.build(D, P, fill="solid", accents={2, 9, 16, 23, 30}, extra=extra)
    F.turret(g, 19, D[19] - 4)
    return g, P

def r2_mass():                       # ribs + launcher vents next to the wall
    P = mass_patterns("3"); P.pop("seam")
    P["vent"] = ["2222", "2222", "3333", "3333", "2222", "2222", "3333", "3333"]
    def extra(g, D):
        for r in range(32):
            if g[r][1] == "solid":
                g[r][1] = "groove"
            if D[r] == D[r - 1] and D[r] - 3 >= 2 and g[r][D[r] - 3] == "solid":
                g[r][D[r] - 3] = "groove"
        for r in (4, 5, 21, 22):
            if D[r] == D[r - 1]:
                g[r][D[r] - 3] = g[r][D[r] - 2] = "vent"
    D = F.profile([(8, 8), (6, 4), (7, 6), (5, 4), (7, 6), (8, 4)])
    g = F.build(D, P, fill="solid", accents={11, 18, 25}, extra=extra)
    F.turret(g, 2, D[2] - 4)
    return g, P

def r3_mass():                       # heavy: double groove pair, wide plates
    P = mass_patterns("3"); P.pop("seam")
    def extra(g, D):
        for r in range(32):
            for c in (1, 2):
                if D[r] > 5 and g[r][c] == "solid":
                    g[r][c] = "groove"
            if D[r] == D[r - 1] and D[r] - 4 >= 3 and g[r][D[r] - 4] == "solid":
                g[r][D[r] - 4] = "groove"
    D = F.profile([(7, 5), (8, 6), (6, 5), (7, 6), (5, 4), (7, 6)])
    g = F.build(D, P, fill="solid", accents={8, 15, 22, 29}, extra=extra)
    F.turret(g, 13, D[13] - 4)
    return g, P

def r4_mass():                       # armour: grooves plus transverse seams
    P = mass_patterns("3")
    def extra(g, D):
        for r in range(32):
            if g[r][2] == "solid":
                g[r][2] = "groove"
            if r % 8 == 0:
                for c in range(0, max(0, D[r] - 1)):
                    if g[r][c] in ("solid", "groove"):
                        g[r][c] = "seam"
    D = F.profile([(8, 6), (7, 4), (8, 6), (6, 5), (7, 5), (8, 6)])
    g = F.build(D, P, fill="solid", accents={4, 12, 20, 28}, extra=extra)
    F.turret(g, 13, D[13] - 4)
    return g, P

AG, AP = allied_mass()
ab = F.budget(AG, AP)
regions = [("R1-slab", "1-4", r1_mass), ("R2-rib-launchers", "5-8", r2_mass),
           ("R3-heavy-plates", "9-12", r3_mass), ("R4-armour", "13-16", r4_mass)]
panels, report = [], {}
for key, lv, fn in regions:
    g, P = fn()
    eb = F.budget(g, P)
    shared = {p for p in eb if tuple(r[::-1] for r in p) in ab and not any("3" in r for r in p)}
    own, tot = len(eb) - len(shared), len(ab) + len(eb) - len(shared)
    report[key] = dict(allied=len(ab), enemy_own=own, total=tot)
    panels.append(F.screen(F.resolve(AG, AP, "allied"), F.resolve(g, P, "enemy"),
                           f"{key} poz.{lv}   sojusznik {len(ab)} + wrog {own} = {tot}/14"))
w, h = panels[0].size
sheet = Image.new("RGB", (w * 2 + 12, h * 2 + 12), (40, 40, 40))
for i, p in enumerate(panels):
    sheet.paste(p, ((i % 2) * (w + 12), (i // 2) * (h + 12)))
sheet.save("set-MASS-sheet.png")
print(json.dumps(report, indent=1))
