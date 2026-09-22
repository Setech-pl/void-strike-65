import json
import final_set as F
import mass_set as M

AG, AP = M.AG, M.AP

def pack(g, P, D, faction):
    used = sorted({k for row in g for k in row if k and not k.startswith("T:")})
    d = {
        "orientation": "allied (col 0 = screen edge, col 8 = corridor side); enemy is the horizontal mirror at build time"
                       if faction == "allied" else
                       "authored in ALLIED orientation; mirror horizontally for the enemy (right) side",
        "colourDigits": "0 black, 1 white COLPF0, 2 steel COLPF1, 3 faction colour (allied amber pf2 bank / enemy burgundy pf3 bank)",
        "glyphs": {k: P[k] for k in used},
        "map": [" ".join(k if k else "space" for k in row) for row in g],
        "turretCells": "T:<core glyph> entries use the existing core turret glyphs (not counted)",
        "surfaceCodes": len({tuple(P[k]) for k in used}),
    }
    if D:
        d["innerDepthCells"] = D
    return d

doc = {
    "formatVersion": 2,
    "supersedes": "hull-set-v1.json",
    "title": "Capital hull set v2 — FULL MASS (owner-approved 2026-09-22 after the step-1 smoke)",
    "changeFromV1": [
        "the hull is solid mass from the wall out to the screen edge; no black gap behind it",
        "the detached frame line and rib of v1 are gone; texture is now grooves cut INTO the mass",
        "allied: transverse seams every 10 rows; R4 keeps its own seams every 8 rows",
        "accents roughly every 7 rows instead of every 11",
        "chamfers carry mass behind the lit/shadow face, so the white triangles read smaller",
        "profile, turret positions, colours and the collision convention are UNCHANGED from v1",
    ],
    "budgetRule": "per level: allied codes + that region's enemy codes <= 14 surface codes; core 17 unchanged",
    "allied": pack(AG, AP, F.A_D, "allied"),
    "enemyRegions": {},
}
ab = F.budget(AG, AP)
for key, lv, fn in [("R1-slab", "1-4", M.r1_mass), ("R2-rib-launchers", "5-8", M.r2_mass),
                    ("R3-heavy-plates", "9-12", M.r3_mass), ("R4-armour", "13-16", M.r4_mass)]:
    g, P = fn()
    e = pack(g, P, None, "enemy")
    e["levels"] = lv
    eb = F.budget(g, P)
    shared = {p for p in eb if tuple(r[::-1] for r in p) in ab and not any("3" in r for r in p)}
    e["sharedWithAllied"] = len(shared)
    e["totalWithAllied"] = len(ab) + len(eb) - len(shared)
    doc["enemyRegions"][key] = e
json.dump(doc, open("hull-set-v2.json", "w"), indent=1)
print({k: v["totalWithAllied"] for k, v in doc["enemyRegions"].items()}, doc["allied"]["surfaceCodes"])
