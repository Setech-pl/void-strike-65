from PIL import Image, ImageDraw
import numpy as np
W, H = 160, 64
B4 = np.array([[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]) / 16.0 + 1/32.0

class Canvas:
    def __init__(s):
        s.g = Image.new("L", (W, H), 0)      # shade 0..255 (0 = empty)
        s.d = ImageDraw.Draw(s.g)
        s.hard = Image.new("L", (W, H), 0)   # 255 = force on, 1 = force off
        s.h = ImageDraw.Draw(s.hard)
    # mirrored helpers: draw on left, mirror to right (x' = W-1-x)
    def poly(s, pts, shade, mirror=True):
        s.d.polygon(pts, fill=shade)
        if mirror: s.d.polygon([(W-1-x, y) for x, y in pts], fill=shade)
    def rect(s, x0, y0, x1, y1, shade, mirror=True):
        s.d.rectangle([x0, y0, x1, y1], fill=shade)
        if mirror: s.d.rectangle([W-1-x1, y0, W-1-x0, y1], fill=shade)
    def ell(s, x0, y0, x1, y1, shade, mirror=True, outline=None):
        s.d.ellipse([x0, y0, x1, y1], fill=shade, outline=outline)
        if mirror: s.d.ellipse([W-1-x1, y0, W-1-x0, y1], fill=shade, outline=outline)
    def on(s, pts, mirror=True):   # hard white pixels/lines
        s.h.line(pts, fill=255)
        if mirror: s.h.line([(W-1-x, y) for x, y in pts], fill=255)
    def off(s, pts, mirror=True):  # hard black lines (panel seams)
        s.h.line(pts, fill=1)
        if mirror: s.h.line([(W-1-x, y) for x, y in pts], fill=1)
    def onrect(s, x0, y0, x1, y1, v=255, mirror=True):
        s.h.rectangle([x0, y0, x1, y1], fill=v)
        if mirror: s.h.rectangle([W-1-x1, y0, W-1-x0, y1], fill=v)
    def bits(s):
        g = np.asarray(s.g, dtype=float) / 255.0
        thr = np.tile(B4, (H // 4, W // 4))
        out = (g > thr) & (g > 0)
        hd = np.asarray(s.hard)
        out[hd == 255] = True
        out[hd == 1] = False
        return out.astype(np.uint8)
