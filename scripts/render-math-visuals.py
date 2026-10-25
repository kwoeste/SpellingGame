"""Draw the multiplication recap pictures (no digits) from MATH_SEEDS.
Usage: npx tsx -e 'import {MATH_SEEDS} from "./lib/content/recaps-math"; console.log(JSON.stringify(MATH_SEEDS))' > m.json
       python3 scripts/render-math-visuals.py m.json
"""
import json, sys, os
from PIL import Image, ImageDraw

W, H, S = 800, 600, 2  # draw at 2x then downsample for smooth edges
BGS = ["#FFF6E0", "#E8F6FF", "#F0FFE8", "#FFEFF5", "#F3EEFF", "#FFF0E3"]
DOTS = ["#FF6B6B", "#4D96FF", "#6BCB77", "#FFB830", "#B15EFF", "#FF8FB1", "#2EC4B6"]
RING = ["#FFD3D3", "#CFE3FF", "#D5F2DA", "#FFE7B8", "#E7D3FF", "#FFD9E6", "#C9F1EC"]

def dot(d, x, y, r, c):
    d.ellipse([x - r, y - r, x + r, y + r], fill=c, outline="#33334D", width=3 * S)
    d.ellipse([x - r * .45, y - r * .55, x - r * .05, y - r * .2], fill="#FFFFFF90")

def grid(d, rows, cols, box, colorf):
    x0, y0, x1, y1 = box
    cell = min((x1 - x0) / cols, (y1 - y0) / rows)
    r = cell * .36
    ox = x0 + ((x1 - x0) - cell * cols) / 2 + cell / 2
    oy = y0 + ((y1 - y0) - cell * rows) / 2 + cell / 2
    for i in range(rows):
        for j in range(cols):
            c = colorf(i, j)
            if c: dot(d, ox + j * cell, oy + i * cell, r, c)

def draw(v, k):
    im = Image.new("RGB", (W * S, H * S), BGS[k % len(BGS)])
    d = ImageDraw.Draw(im, "RGBA")
    M = 50 * S
    kind = v["kind"]
    if kind == "array":
        c = DOTS[k % len(DOTS)]
        grid(d, v["rows"], v["cols"], (M, M, W * S - M, H * S - M), lambda i, j: c)
    elif kind == "split":
        c1, c2 = DOTS[1], DOTS[0]
        if v.get("fade"):
            grid(d, v["rows"], v["cols"], (M, M, W * S - M, H * S - M), lambda i, j: c1 if i < v["first"] else "#33334D22")
        else:
            grid(d, v["rows"], v["cols"], (M, M, W * S - M, H * S - M), lambda i, j: c1 if i < v["first"] else c2)
    elif kind == "groups":
        n, e = v["groups"], v["each"]
        cols = n if n <= 4 else (n + 1) // 2
        rows = 1 if n <= 4 else 2
        cw, ch = (W * S - 2 * M) / cols, (H * S - 2 * M) / rows
        for gi in range(n):
            gx, gy = M + (gi % cols) * cw, M + (gi // cols) * ch
            pad = 14 * S
            col = gi % len(DOTS)
            d.ellipse([gx + pad, gy + pad, gx + cw - pad, gy + ch - pad], fill=RING[col], outline="#33334D", width=3 * S)
            gc = 2 if e <= 4 else (3 if e <= 9 else 4)
            gr = -(-e // gc)
            inset = 0.2
            box = (gx + cw * inset, gy + ch * inset, gx + cw * (1 - inset), gy + ch * (1 - inset))
            grid(d, gr, gc, box, lambda i, j, gc=gc, col=col: DOTS[col] if i * gc + j < e else None)
    elif kind == "rods":
        n = v["tens"]
        bw = (W * S - 2 * M) / n
        cube = min(bw * .7, (H * S - 2 * M) / 10)
        for t in range(n):
            x = M + t * bw + (bw - cube) / 2
            y0 = (H * S - cube * 10) / 2
            for q in range(10):
                d.rounded_rectangle([x, y0 + q * cube, x + cube, y0 + (q + 1) * cube], radius=4 * S, fill=DOTS[t % len(DOTS)], outline="#33334D", width=3 * S)
    elif kind == "hops":
        step, cnt = v["step"], v["count"]
        total = step * cnt
        x0, x1, y = M, W * S - M, H * S * .72
        d.line([x0, y, x1, y], fill="#33334D", width=6 * S)
        unit = (x1 - x0) / total
        for t in range(total + 1):
            big = t % step == 0
            hgt = (22 if big else 10) * S
            d.line([x0 + t * unit, y - hgt, x0 + t * unit, y + hgt], fill="#33334D", width=(5 if big else 2) * S)
        for hi in range(cnt):
            a, b = x0 + hi * step * unit, x0 + (hi + 1) * step * unit
            hh = min(220 * S, (b - a) * .9)
            d.arc([a, y - hh, b, y + hh], 180, 360, fill=DOTS[hi % len(DOTS)], width=9 * S)
            dot(d, b, y, 16 * S, DOTS[hi % len(DOTS)])
        dot(d, x0, y, 16 * S, "#FFFFFF")
    return im.resize((W, H), Image.LANCZOS)

seeds = json.load(open(sys.argv[1]))
for cid, seed in seeds.items():
    os.makedirs(f"public/study/{cid}", exist_ok=True)
    for i, s in enumerate(seed["slides"]):
        draw(s["visual"], i + sum(map(ord, cid)) % 3).save(f"public/study/{cid}/{i+1}.webp", quality=80)
    print(cid, len(seed["slides"]))
