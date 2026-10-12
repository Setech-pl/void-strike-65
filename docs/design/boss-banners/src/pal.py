import math
def atari(c):
    hue, lum = c >> 4, c & 0x0E
    Y = 0.06 + 0.88 * (lum / 14.0)
    if hue == 0:
        v = Y
        return tuple(int(max(0, min(1, v)) * 255) for _ in range(3))
    ang = math.radians(-58 + hue * 24.0)
    s = 0.24
    I, Q = s * math.cos(ang), s * math.sin(ang)
    r = Y + 0.956 * I + 0.621 * Q
    g = Y - 0.272 * I - 0.647 * Q
    b = Y - 1.106 * I + 1.703 * Q
    return tuple(int(max(0, min(1, x)) * 255) for x in (r, g, b))
