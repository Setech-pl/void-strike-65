import math
import numpy as np
from PIL import Image
from core import Canvas, W, H
HL, LT, MD, DK, VD = 255, 200, 135, 75, 38
CX, CY, R = 79.5, 28.0, 15.0

def spar(c, x_end, y_hub, y_end, thick, shade):
    # horizontal lattice spar from the hub edge to the pod, mirrored
    x0 = CX - R + 3
    top = [(x0, y_hub - thick), (x_end, y_end - thick + 1), (x_end, y_end + thick - 1), (x0, y_hub + thick)]
    c.poly(top, shade)
    c.on([(x0, y_hub - thick), (x_end, y_end - thick + 1)])
    c.off([(x0, y_hub + thick), (x_end, y_end + thick - 1)])
    n = int((x0 - x_end) / 5)
    for k in range(1, n):                       # lattice cross struts
        x = x0 - k * 5
        t = (x0 - x) / (x0 - x_end)
        yc = y_hub + (y_end - y_hub) * t
        c.off([(x, yc - thick + 1), (x + 2, yc + thick - 1)])

def pod(c, x, y, big):
    rx, ry = (7, 6) if big else (6, 5)
    c.rect(x - rx, y - ry, x + rx, y + ry, LT)
    c.rect(x - rx, y + 1, x + rx, y + ry, DK)
    c.h.rectangle([x - rx, y - ry, x + rx, y + ry], outline=255)
    c.h.rectangle([W-1-(x + rx), y - ry, W-1-(x - rx), y + ry], outline=255)
    c.off([(x - rx + 1, y), (x + rx - 1, y)])
    # laser lens on the underside: the beam fires straight down
    c.onrect(x - 2, y + ry + 1, x + 2, y + ry + 2)
    c.onrect(x - 1, y + ry + 3, x + 1, y + ry + 3)
    c.onrect(x, y + ry + 1, x, y + ry + 1, 1)
    # warning glow: short dashed beam
    for yy in range(y + ry + 6, min(H, y + ry + 16), 3):
        c.onrect(x, yy, x, yy + 1)

def r2():
    c = Canvas()
    # far (upper) spars: longer, outer pods; near (lower) spars: shorter, inner pods
    spar(c, 12, CY - 7, 12, 3, MD)
    spar(c, 42, CY + 7, 34, 3, MD)
    # hub sphere, lambert-shaded
    g = np.asarray(c.g).copy()
    Lv = np.array([-0.55, -0.6, 0.58]); Lv /= np.linalg.norm(Lv)
    for y in range(H):
        for x in range(W):
            nx, ny = (x - CX) / R, (y - CY) / R
            d2 = nx * nx + ny * ny
            if d2 <= 1:
                nz = math.sqrt(1 - d2)
                g[y, x] = int(25 + 230 * max(0.0, nx*Lv[0] + ny*Lv[1] + nz*Lv[2]) ** 1.2)
    c.g.paste(Image.fromarray(g))
    c.h.ellipse([CX - R, CY - R, CX + R, CY + R], outline=255)
    # two curved shield plates hugging the hub (left and right)
    for side in (-1, 1):
        box = [CX - R - 5, CY - R - 3, CX + R + 5, CY + R + 3]
        a0, a1 = (130, 230) if side < 0 else (-50, 50)
        for k in range(4):
            bb = [box[0] + k, box[1] + k, box[2] - k, box[3] - k]
            c.h.arc(bb, a0, a1, fill=255 if k in (0, 3) else 1)
        c.d.pieslice(box, a0, a1, fill=MD)
        c.d.ellipse([CX - R - 1, CY - R - 1, CX + R + 1, CY + R + 1], fill=0)
    # redraw the sphere over the plate fill
    c.g.paste(Image.fromarray(np.where((np.indices((H, W))[1] - CX) ** 2 + (np.indices((H, W))[0] - CY) ** 2 <= R * R, g, np.asarray(c.g)).astype(np.uint8)))
    c.h.ellipse([CX - R, CY - R, CX + R, CY + R], outline=255)
    # core: ring + bright centre
    c.h.ellipse([CX - 6, CY - 3, CX + 6, CY + 7], fill=1, outline=255)
    c.h.ellipse([CX - 3, CY, CX + 3, CY + 4], fill=255)
    c.h.ellipse([CX - 11, CY - 12, CX - 7, CY - 9], fill=255)       # specular
    c.h.line([(CX, CY - R - 5), (CX, CY - R)], fill=255)             # mast
    # hangar bay under the hub (escort)
    c.h.rectangle([CX - 7, CY + R - 1, CX + 7, CY + R + 6], fill=1, outline=255)
    for y in (CY + R + 2, CY + R + 4): c.h.line([(CX - 5, y), (CX + 5, y)], fill=255)
    for (x, y, big) in ((12, 12, False), (42, 34, True)):
        pod(c, x, y, big)
    return c.bits()
