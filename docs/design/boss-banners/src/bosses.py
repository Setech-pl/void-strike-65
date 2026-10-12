import math
from core import Canvas, W, H
HL, LT, MD, DK, VD = 255, 200, 135, 75, 38

def fighter(c, x, y):          # small delta escort, nose down
    c.h.polygon([(x-4,y),(x+4,y),(x,y+5)], fill=255)
    c.h.point((x,y+1), fill=1); c.h.line([(x-5,y-1),(x-3,y-1)], fill=255); c.h.line([(x+3,y-1),(x+5,y-1)], fill=255)

def r1():   # Blockade Breaker
    c = Canvas()
    c.poly([(18,18),(79,13),(79,20),(14,24)], LT)                 # deck
    c.poly([(14,24),(79,20),(79,31),(16,33)], MD)                 # upper armour
    c.poly([(16,33),(79,31),(79,41),(20,41)], DK)                 # lower armour
    c.poly([(20,41),(79,41),(79,46),(30,45)], VD)                 # underside
    c.on([(14,24),(79,20)]); c.on([(18,18),(79,13)])
    for x in (25, 35, 45):                                    # plate seams + rivets
        c.off([(x,22),(x,40)]); c.onrect(x+3,25,x+3,25); c.onrect(x+3,35,x+3,35)
    c.off([(16,33),(55,32)])
    # end gun pods
    c.poly([(0,12),(16,10),(22,18),(22,40),(8,44),(0,42)], MD)
    c.poly([(0,12),(16,10),(22,18),(4,20)], HL)
    c.poly([(0,30),(22,28),(22,40),(8,44),(0,42)], DK)
    c.off([(0,20),(22,18)])
    for bx in (5, 13):                                            # barrels, slanted out
        c.d.polygon([(bx,40),(bx+3,40),(bx-1,55),(bx-4,55)], fill=LT)
        c.on([(bx,40),(bx-4,55)]); c.onrect(bx-4,55,bx-1,56)
        c.onrect(bx-3,56,bx-2,56,1)
    # bridge
    c.poly([(64,14),(70,4),(79,2),(79,14)], LT); c.on([(70,4),(79,2)])
    for x in (71,74,77): c.onrect(x,7,x,8,1)
    c.onrect(79,0,79,2)
    # emitter with halo
    c.d.ellipse([56,12,103,52], fill=40)
    c.d.ellipse([60,16,99,48], fill=0)
    c.d.ellipse([63,19,96,45], fill=110)
    c.d.ellipse([68,23,91,41], fill=190)
    c.d.ellipse([72,26,87,38], fill=255)
    c.h.ellipse([60,16,99,48], outline=255); c.h.ellipse([68,23,91,41], outline=255)
    for a in range(0, 360, 45):                                   # glow rays
        r0, r1_ = 9, 15
        x0 = 79.5 + r0*math.cos(math.radians(a)); y0 = 32 + r0*0.75*math.sin(math.radians(a))
        x1 = 79.5 + r1_*math.cos(math.radians(a)); y1 = 32 + r1_*0.75*math.sin(math.radians(a))
        c.h.line([(x0,y0),(x1,y1)], fill=255)
    # ram blade
    c.d.polygon([(70,48),(79,48),(79,63)], fill=LT); c.d.polygon([(80,48),(89,48),(80,63)], fill=VD)
    c.h.line([(70,48),(79,63)], fill=255); c.h.line([(70,48),(89,48)], fill=255)
    return c.bits()

def r2():   # Bastion
    c = Canvas()
    # three stepped armour tiers, sloped faces
    tiers = [(14,46,63), (28,32,46), (42,18,32)]
    for x0, y0, y1 in tiers:
        c.poly([(x0,y0),(79,y0-2),(79,y0+2),(x0-2,y0+3)], HL)          # lit top lip
        c.poly([(x0-2,y0+3),(79,y0+2),(79,y1),(x0+3,y1)], MD)
        c.poly([(x0-2,y0+3),(x0+3,y1),(x0+8,y1),(x0+4,y0+3)], DK)      # side bevel shadow
        for gx in range(x0+10, 76, 9):                                 # turret blocks on the lip
            c.onrect(gx, y0-4, gx+4, y0-1); c.onrect(gx+2, y0-6, gx+2, y0-5)
        for gx in range(x0+12, 76, 9):                                 # lit gun ports
            c.onrect(gx, y0+7, gx+2, y0+8, 1); c.onrect(gx+1, y0+7, gx+1, y0+7)
    # command keep
    c.poly([(68,18),(71,4),(79,3),(79,18)], LT); c.on([(71,4),(79,3)])
    c.onrect(73,8,74,9,1); c.onrect(79,0,79,3)
    # hangar slot with glow bars
    c.d.rectangle([66,50,93,63], fill=0); c.h.rectangle([66,50,93,63], fill=1, outline=255)
    for y in (53,56,59,62): c.h.line([(69,y),(90,y)], fill=255)
    # shield pylons at the far edges
    c.poly([(0,40),(10,36),(12,63),(0,63)], DK); c.on([(0,40),(10,36)])
    c.on([(4,38),(4,26)]); c.onrect(3,24,5,25)
    for (x, y) in ((10,10),(24,4),(136,12),(148,24)): fighter(c, x, y)
    return c.bits()

def r3():   # Siege Spine
    c = Canvas()
    for i, s in enumerate((30, 55, 80)):                           # force field shells
        c.d.ellipse([12+i*3, 4+i*3, 147-i*3, 60-i*3], fill=s)
    c.d.ellipse([24,13,135,51], fill=0)
    c.h.ellipse([12,4,147,60], outline=255)
    c.h.arc([16,8,143,56], 200, 250, fill=255); c.h.arc([16,8,143,56], 290, 340, fill=255)
    for k in range(13):                                            # vertebrae
        x = 20 + k*10
        y = 33 - int(5*math.sin(math.pi*k/12))
        c.d.polygon([(x-4,y-3),(x+4,y-4),(x+5,y+4),(x-3,y+5)], fill=MD)
        c.d.polygon([(x-3,y+2),(x+5,y+1),(x+5,y+4),(x-3,y+5)], fill=VD)
        c.h.line([(x-4,y-3),(x+4,y-4)], fill=255)
        c.h.line([(x,y-4),(x+1,y-9)], fill=255)
    c.d.line([(18,35),(141,35)], fill=DK, width=2)
    # siege cannon on the hump, pointing at the viewer (muzzle ring)
    c.poly([(64,30),(70,20),(79,18),(79,32)], LT); c.on([(70,20),(79,18)])
    c.d.ellipse([73,33,86,46], fill=DK); c.h.ellipse([73,33,86,46], outline=255)
    c.h.ellipse([76,36,83,43], fill=1, outline=255)
    # generators
    c.ell(0,19,20,41,MD); c.ell(3,22,13,32,HL)
    c.h.ellipse([0,19,20,41], outline=255); c.h.ellipse([139,19,159,41], outline=255)
    for y in (26,30,34,38): c.off([(2,y),(18,y)])
    c.on([(20,30),(24,28)]); c.on([(20,32),(24,34)])               # arcs into the field
    return c.bits()

def r4():   # Void Citadel
    c = Canvas()
    c.poly([(32,4),(56,0),(79,0),(79,63),(56,63),(32,59),(22,46),(22,17)], MD)
    c.poly([(22,17),(32,4),(56,0),(79,0),(79,5),(58,6),(36,10),(27,20)], HL)
    c.poly([(22,46),(32,59),(56,63),(79,63),(79,58),(58,58),(36,54)], VD)
    for row in range(4):                                           # 16 modules (8 per side)
        for col in range(2):
            x0 = 30 + col*12; y0 = 12 + row*11
            c.rect(x0, y0, x0+9, y0+7, LT - row*35)
            c.h.rectangle([x0-1, y0-1, x0+10, y0+8], outline=1)
            c.h.rectangle([W-1-(x0+10), y0-1, W-1-(x0-1), y0+8], outline=1)
            c.onrect(x0, y0, x0+9, y0)
            c.onrect(x0+4, y0+3, x0+5, y0+4, 1)
    c.d.ellipse([57,11,102,53], fill=0)                            # void core
    c.h.ellipse([57,11,102,53], fill=1, outline=255)
    c.h.ellipse([61,15,98,49], outline=255)
    c.h.arc([66,20,93,44], 190, 330, fill=255); c.h.arc([70,24,89,40], 20, 150, fill=255)
    c.h.point((79,32), fill=255); c.h.point((80,32), fill=255)
    for x in (6, 14):                                              # salvo spires
        c.poly([(x-3,40),(x,8),(x+3,40)], MD)
        c.h.line([(x,8),(x,40)], fill=255); c.h.line([(x-3,40),(x+3,40)], fill=255)
        c.h.line([(W-1-x,8),(W-1-x,40)], fill=255); c.h.line([(W-4-x,40),(W+2-x,40)], fill=255)
    c.on([(79,0),(79,0)])
    return c.bits()

BOSSES = [("R1", "BLOCKADE BREAKER", r1), ("R2", "BASTION", __import__("r2v3").r2),
          ("R3", "SIEGE SPINE", r3), ("R4", "VOID CITADEL", r4)]
