"""Export the owner-approved hull set (allied B + enemy R1-R4) as a data file for the repo."""
import json
import final_set as F
from allied_lines import allied
import set_b

AG, AP = allied(ribs=True)

def pack(g, P, D, faction):
    used = sorted({k for row in g for k in row if k and not k.startswith("T:")})
    return {
        "orientation": "allied (col 0 = screen edge, col 8 = corridor side); enemy is the horizontal mirror at build time" if faction == "allied"
                       else "authored in ALLIED orientation; mirror horizontally for the enemy (right) side",
        "colourDigits": "0 black, 1 white COLPF0, 2 steel COLPF1, 3 faction colour (allied amber pf2 bank / enemy burgundy pf3 bank)",
        "glyphs": {k: P[k] for k in used},
        "innerDepthCells": D,
        "map": [" ".join(k if k else "space" for k in row) for row in g],
        "turretCells": "T:<core glyph> entries use the existing core turret glyphs (not counted)",
        "surfaceCodes": len({tuple(P[k]) for k in used}),
    }

doc = {
    "formatVersion": 1,
    "title": "Capital hull set — owner-approved preview (allied B + enemy regions R1-R4)",
    "status": "DRAFT for the planning session; rendered and budget-counted by set_b.py",
    "budgetRule": "per level: allied codes + that region's enemy codes <= 14 surface codes; core 17 unchanged; blank 'deck' is shared",
    "allied": pack(AG, AP, F.A_D, "allied"),
    "enemyRegions": {},
}
for key, levels, fn in [("R1-slab", "1-4", F.r1), ("R2-rib-launchers", "5-8", F.r2),
                        ("R3-thick-band", "9-12", set_b.r3), ("R4-armour", "13-16", F.r4)]:
    g, P = fn()
    D = [sum(1 for k in row if k) for row in g]
    entry = pack(g, P, None, "enemy")
    entry["levels"] = levels
    shared = {tuple(P[k]) for row in g for k in row if k and not k.startswith("T:")} & \
             {tuple(r[::-1] for r in AP[k]) for k in AP}
    entry["sharedWithAllied"] = len([p for p in shared if not any("3" in r for r in p)])
    entry["totalWithAllied"] = doc["allied"]["surfaceCodes"] + entry["surfaceCodes"] - entry["sharedWithAllied"]
    del entry["innerDepthCells"]
    doc["enemyRegions"][key] = entry
json.dump(doc, open("hull-set-v1.json", "w"), indent=1)
print({k: v["totalWithAllied"] for k, v in doc["enemyRegions"].items()})
