from PIL import Image, ImageDraw, ImageFont
from pal import atari
COLS, ROWS = 48, 5
PW, PH = COLS * 4, ROWS * 8           # mode-4 pixels
img = [[0] * PW for _ in range(PH)]
def fill(c0, r0, c1, r1, v):          # char-cell rectangle, inclusive
    for y in range(r0 * 8, r1 * 8 + 8):
        for x in range(c0 * 4, c1 * 4 + 4): img[y][x] = v
def px(x, y, v): img[y][x] = v
def mirror_fill(c0, r0, c1, r1, v):
    fill(c0, r0, c1, r1, v); fill(COLS - 1 - c1, r0, COLS - 1 - c0, r1, v)
DK, MG, WH = 1, 2, 3
# far spars (row 1), near spars (row 3): lattice
for c in range(4, 20):
    for side in (0, 1):
        cc = c if side == 0 else COLS - 1 - c
        for y in range(10, 14):
            for x in range(cc * 4, cc * 4 + 4):
                img[y][x] = MG if (x + y) % 4 else DK
        for x in range(cc * 4, cc * 4 + 4): img[10][x] = WH
for c in range(13, 20):
    for side in (0, 1):
        cc = c if side == 0 else COLS - 1 - c
        for y in range(26, 31):
            for x in range(cc * 4, cc * 4 + 4):
                img[y][x] = MG if (x - y) % 4 else DK
        for x in range(cc * 4, cc * 4 + 4): img[26][x] = WH
# hub: rounded block cols 19..28
mirror_fill(21, 0, 23, 0, MG); mirror_fill(19, 1, 23, 3, MG); mirror_fill(21, 4, 21, 4, MG)
for y in range(0, 40):                 # shading: left lit, right dark
    for x in range(19 * 4, 29 * 4):
        if img[y][x] == MG and x >= 25 * 4 and (x + y) % 2: img[y][x] = DK
for x in range(21 * 4, 27 * 4): img[0][x] = WH
for y in range(8, 32): img[y][19 * 4] = WH
# core C: cols 23-24 rows 1-2, white ring
fill(23, 1, 24, 2, DK)
for y in range(10, 22):
    for x in range(93, 99):
        if (x - 95.5) ** 2 / 9 + (y - 15.5) ** 2 / 30 <= 1: img[y][x] = WH
# hangar-door plate P: cols 22-25 rows 3-4 (shields the core from below)
fill(22, 3, 25, 4, MG)
for y in range(24, 40):
    for x in range(88, 104):
        if y in (24, 39) or x in (88, 103): img[y][x] = WH
        elif y % 4 == 0: img[y][x] = DK
# gun pods: outer G1/G4 cols 1-4 rows 0-2; inner G2/G3 cols 9-12 rows 2-4
def pod(c0, r0):
    for side in (0, 1):
        a = c0 if side == 0 else COLS - 4 - c0
        fill(a, r0, a + 3, r0 + 2, MG)
        for y in range(r0 * 8, r0 * 8 + 24):
            for x in range(a * 4, a * 4 + 16):
                if y == r0 * 8 or x in (a * 4, a * 4 + 15): img[y][x] = WH
                elif y >= r0 * 8 + 12: img[y][x] = DK if (x + y) % 2 else MG
        for x in range(a * 4 + 6, a * 4 + 10):     # lens
            for y in range(r0 * 8 + 20, r0 * 8 + 24): img[y][x] = WH
pod(1, 0); pod(9, 2)
PAL = [atari(0x00), atari(0x52), atari(0x56), atari(0x0E)]
S = 5
band = Image.new("RGB", (PW * 2 * S, PH * S))
d = ImageDraw.Draw(band)
for y in range(PH):
    for x in range(PW):
        d.rectangle([x * 2 * S, y * S, x * 2 * S + 2 * S - 1, y * S + S - 1], fill=PAL[img[y][x]])
# canvas with char grid, laser beams, labels
pad_t, pad_b = 70, 150
out = Image.new("RGB", (band.width + 40, band.height + pad_t + pad_b), (18, 18, 22))
out.paste(band, (20, pad_t))
o = ImageDraw.Draw(out)
for c in range(COLS + 1):
    o.line([(20 + c * 8 * S, pad_t), (20 + c * 8 * S, pad_t + band.height)], fill=(60, 60, 70))
for r in range(ROWS + 1):
    o.line([(20, pad_t + r * 8 * S), (20 + band.width, pad_t + r * 8 * S)], fill=(60, 60, 70))
# visible window: 40 columns
o.rectangle([20 + 4 * 8 * S, pad_t - 8, 20 + 44 * 8 * S, pad_t + band.height + 8], outline=(110, 200, 110), width=2)
f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
fs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
o.text((20, 12), "BASTION w pasie bossa: tryb 4, 48 x 5 znakow, przesuw w poziomie (ramka = 40 widocznych kolumn)", font=f, fill=(230, 230, 230))
by = pad_t + band.height
red = atari(0x46)
def beam(col):
    x = 20 + col * 8 * S + 4 * S
    for y in range(by + 4, by + 70, 14): o.rectangle([x - 3, y, x + 3, y + 8], fill=red)
for c in (2.5, 10.5, 36.5, 44.5): beam(c)
def label(col, txt):
    x = 20 + col * 8 * S
    o.text((x, by + 78), txt, font=f, fill=(240, 240, 240), anchor="mt")
for col, t in ((3, "G1"), (11, "G2"), (37, "G3"), (45, "G4"), (24, "P + C")):
    label(col, t)
o.text((20, by + 112), "G = dzialo laserowe (wiazka pionowa w dol)   P = wrota hangaru = pancerz nad rdzeniem   C = rdzen   ramiona = kadlub", font=fs, fill=(190, 190, 200))
out.save("bastion-band.png")
