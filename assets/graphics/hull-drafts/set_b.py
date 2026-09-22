import final_set as F
from allied_lines import allied
from PIL import Image

AG, AP = allied(ribs=True)
ab = F.budget(AG, AP)

def r3():      # thick slab: 3-cell burgundy mass band behind the wall, black interior beyond
    P = dict(F.E_P)
    P["edge_in"] = ["0333"] * 8
    def extra(g, D):
        for r in range(32):
            d = min(D[r], D[r - 1])
            lo = max(1, d - 4)
            for c in range(lo, d - 1):
                if g[r][c] == "deck":
                    g[r][c] = "solid"
            if g[r][lo] == "solid" and lo > 1:
                g[r][lo] = "edge_in"
    D = F.profile([(7, 5), (8, 6), (6, 5), (7, 6), (5, 4), (7, 6)])
    g = F.build(D, P, accents={8, 17, 27}, extra=extra)
    F.turret(g, 13, D[13] - 4)
    F.turret(g, 25, D[25] - 4)
    return g, P

regions = [("R1 poz.1-4 slab", F.r1()), ("R2 poz.5-8 zebro + wyrzutnie", F.r2()),
           ("R3 poz.9-12 gruby pas masy", r3()), ("R4 poz.13-16 armour", F.r4())]
panels = []
for name, (eg, EP) in regions:
    eb = F.budget(eg, EP)
    shared = {p for p in eb if tuple(r[::-1] for r in p) in ab and not any("3" in r for r in p)}
    tot = len(ab) + len(eb) - len(shared)
    panels.append(F.screen(F.resolve(AG, AP, "allied"), F.resolve(eg, EP, "enemy"),
                           f"{name}   sojusznik {len(ab)} + wrog {len(eb)-len(shared)} = {tot}/14"))
    print(name, len(ab), len(eb), tot)
w, h = panels[0].size
sheet = Image.new("RGB", (w * 2 + 12, h * 2 + 12), (40, 40, 40))
for i, p in enumerate(panels):
    sheet.paste(p, ((i % 2) * (w + 12), (i // 2) * (h + 12)))
sheet.save("set-B-sheet.png")
