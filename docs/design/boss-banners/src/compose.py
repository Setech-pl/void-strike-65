from PIL import Image
import numpy as np
from pal import atari
from font import glyph
from bosses import BOSSES

SW, SH = 320, 192
HUES = {"R1": 0x5, "R2": 0x2, "R3": 0x8, "R4": 0x6}

def text(scr, s, y, colour, tall):
    w = len(s) * 16
    x0 = (SW - w) // 2
    for i, ch in enumerate(s):
        g = glyph(ch)
        for ry in range(8):
            for rx in range(8):
                if g[ry][rx]:
                    for dy in range(2 if tall else 1):
                        yy = y + ry * (2 if tall else 1) + dy
                        scr[yy, x0 + i*16 + rx*2: x0 + i*16 + rx*2 + 2] = atari(colour)

def screen(tag, name, bits, variant, progress=5):
    scr = np.zeros((SH, SW, 3), np.uint8); scr[:, :] = atari(0x00)
    hue = HUES[tag]
    # banner: mode F, narrow playfield x 32..287, graphic centred at 80..239, lines 8..71
    for y in range(64):
        band = y // 8                          # one DLI every 8 lines
        if variant == "mono":
            bg, fg = 0x00, 0x0E
        else:
            bg = (hue << 4)
            fg = (hue << 4) | [14, 14, 12, 12, 10, 10, 8, 8][band]
        scr[8+y, 32:288] = atari(bg)
        row = bits[y]
        for x in range(160):
            if row[x]: scr[8+y, 80+x] = atari(fg)
    accent = (hue << 4) | 0xA if variant == "colour" else 0x58
    text(scr, "WARNING", 84, 0x46, tall=True)
    lines = [name] if len(name) <= 16 else [name]
    text(scr, name, 108, accent, tall=False)
    text(scr, "INCOMING", 120, 0x0E, tall=False)
    # loader bar: 12 mode-6 cells, 16x8 each, centred
    x0 = (SW - 12*16) // 2
    for i in range(12):
        col = accent if i < progress else 0x04
        scr[148:155, x0 + i*16 + 1: x0 + i*16 + 15] = atari(col)
    return scr

def to_tv(scr, sx=3, sy=3, border=24):
    im = Image.fromarray(scr).resize((SW*sx, SH*sy), Image.NEAREST)
    out = Image.new("RGB", (SW*sx + 2*border, SH*sy + 2*border), atari(0x00))
    out.paste(im, (border, border))
    return out

def lzss_size(data, win=256, minm=3, maxm=18):
    i, n, out_bits = 0, len(data), 0
    while i < n:
        best = 0
        for j in range(max(0, i - win), i):
            l = 0
            while l < maxm and i + l < n and data[j + l] == data[i + l]: l += 1
            if l > best: best = l
        if best >= minm: out_bits += 1 + 16; i += best
        else: out_bits += 1 + 8; i += 1
    return (out_bits + 7) // 8

if __name__ == "__main__":
    sheet_tiles = []
    for tag, name, fn in BOSSES:
        bits = fn()
        raw = np.packbits(bits, axis=1).tobytes()
        print(tag, name, "raw", len(raw), "B, lzss~", lzss_size(raw), "B")
        for v in ("mono", "colour"):
            scr = screen(tag, name, bits, v)
            tv = to_tv(scr)
            tv.save(f"{tag}-{v}.png")
            sheet_tiles.append((tag, v, to_tv(scr, 2, 2, 12)))
    tw, th = sheet_tiles[0][2].size
    sheet = Image.new("RGB", (tw*2 + 16, th*4 + 48), (40, 40, 40))
    for k, (tag, v, im) in enumerate(sheet_tiles):
        sheet.paste(im, ((k % 2) * (tw + 16), (k // 2) * (th + 16)))
    sheet.save("sheet.png")
