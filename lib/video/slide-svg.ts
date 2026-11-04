/** Draws one 1280x720 recap-video frame as SVG. Text left, picture right; all pictures are code-drawn. */
import type { MathVisual } from "@/lib/content/recaps-math";
import type { SymbolName, VideoSlide, VideoVisual } from "@/lib/video/recap-video";

export const FRAME_W = 1280;
export const FRAME_H = 720;
const TEXT_X = 64;
const TEXT_W = 640;
const PIC = { x: 736, y: 110, size: 500 };
const FONT = "Nunito, 'DejaVu Sans', sans-serif";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function wrap(text: string, maxChars: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && (line + " " + word).length > maxChars) {
      out.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
}

export type TextLayout = { titleSize: number; size: number; title: string[]; body: string[][] };

/** Largest font that fits the text column; throws if even the smallest size overflows. */
export function layoutText(slide: VideoSlide): TextLayout {
  for (const size of [48, 44, 40, 36, 32]) {
    const titleSize = Math.min(54, size + 8);
    const per = (s: number) => Math.floor(TEXT_W / (s * 0.55));
    const title = slide.title ? wrap(slide.title, per(titleSize)) : [];
    const body = slide.lines.map((l) => wrap(l, per(size)));
    const h = title.length * titleSize * 1.25 + (title.length ? 24 : 0) + body.reduce((n, b) => n + b.length * size * 1.35 + 18, 0);
    if (h <= 560) return { titleSize, size, title, body };
  }
  throw new Error(`slide text too long: ${slide.title ?? ""} ${slide.lines.join(" ")}`);
}

function textSvg(slide: VideoSlide): string {
  const L = layoutText(slide);
  const parts: string[] = [];
  const total = L.title.length * L.titleSize * 1.25 + (L.title.length ? 24 : 0) + L.body.reduce((n, b) => n + b.length * L.size * 1.35 + 18, 0);
  let y = Math.max(90, (FRAME_H - total) / 2) + L.titleSize * 0.9;
  for (const t of L.title) {
    parts.push(`<text x="${TEXT_X}" y="${y.toFixed(1)}" font-family="${FONT}" font-weight="900" font-size="${L.titleSize}" fill="#1F3A68">${esc(t)}</text>`);
    y += L.titleSize * 1.25;
  }
  if (L.title.length) {
    parts.push(`<rect x="${TEXT_X}" y="${(y - L.titleSize * 0.85).toFixed(1)}" width="120" height="8" rx="4" fill="#E8A33D"/>`);
    y += 24;
  }
  y += L.size * 0.2;
  for (const block of L.body) {
    for (const line of block) {
      parts.push(`<text x="${TEXT_X}" y="${y.toFixed(1)}" font-family="${FONT}" font-weight="700" font-size="${L.size}" fill="#222">${esc(line)}</text>`);
      y += L.size * 1.35;
    }
    y += 18;
  }
  return parts.join("\n");
}

// ---------- math ----------
const BLUE = "#3E6FB0";
const RED = "#C8553D";
const INK = "#24324A";

function dot(cx: number, cy: number, r: number, fill: string, opacity = 1): string {
  return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" stroke="${INK}" stroke-width="${Math.max(1.5, r / 8).toFixed(1)}" opacity="${opacity}"/>`;
}

function arraySvg(rows: number, cols: number, colorRow: (r: number) => [string, number] = () => [BLUE, 1]): string {
  const S = PIC.size - 60;
  const cell = Math.min(S / cols, S / rows, 70);
  const w = cell * cols;
  const h = cell * rows;
  const ox = (PIC.size - w) / 2;
  const oy = (PIC.size - h) / 2;
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    const [fill, op] = colorRow(r);
    for (let c = 0; c < cols; c++) out.push(dot(ox + cell * (c + 0.5), oy + cell * (r + 0.5), cell * 0.38, fill, op));
  }
  return out.join("");
}

function groupsSvg(groups: number, each: number): string {
  const gc = groups <= 3 ? groups : groups <= 4 ? 2 : groups <= 6 ? 3 : groups <= 9 ? 3 : 4;
  const gr = Math.ceil(groups / gc);
  const S = PIC.size - 30;
  const box = Math.min(S / gc, S / gr);
  const ox = (PIC.size - box * gc) / 2;
  const oy = (PIC.size - box * gr) / 2;
  const out: string[] = [];
  for (let g = 0; g < groups; g++) {
    const cx = ox + box * ((g % gc) + 0.5);
    const cy = oy + box * (Math.floor(g / gc) + 0.5);
    const R = box * 0.44;
    out.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${R.toFixed(1)}" fill="#FFF7E3" stroke="${INK}" stroke-width="3"/>`);
    const dc = Math.ceil(Math.sqrt(each));
    const dr = Math.ceil(each / dc);
    const cell = (R * 1.3) / Math.max(dc, dr);
    for (let i = 0; i < each; i++) {
      const row = Math.floor(i / dc);
      const inRow = row === dr - 1 ? each - dc * (dr - 1) : dc;
      const col = i % dc;
      const x = cx + (col - (inRow - 1) / 2) * cell;
      const y = cy + (row - (dr - 1) / 2) * cell;
      out.push(dot(x, y, cell * 0.36, BLUE));
    }
  }
  return out.join("");
}

function rodsSvg(tens: number): string {
  const cube = 40;
  const gap = Math.min(18, (PIC.size - 40 - tens * cube) / Math.max(1, tens - 1));
  const w = tens * cube + (tens - 1) * gap;
  const ox = (PIC.size - w) / 2;
  const oy = (PIC.size - cube * 10) / 2;
  const out: string[] = [];
  for (let t = 0; t < tens; t++) {
    for (let k = 0; k < 10; k++) out.push(`<rect x="${(ox + t * (cube + gap)).toFixed(1)}" y="${(oy + k * cube).toFixed(1)}" width="${cube}" height="${cube}" fill="#F2B544" stroke="${INK}" stroke-width="2.5"/>`);
  }
  return out.join("");
}

function hopsSvg(step: number, count: number): string {
  const max = step * count;
  const x0 = 30;
  const x1 = PIC.size - 30;
  const y = 330;
  const sx = (v: number) => x0 + ((x1 - x0) * v) / max;
  const fs = count > 8 ? 20 : 26;
  const out = [`<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${INK}" stroke-width="4"/>`];
  for (let i = 0; i <= count; i++) {
    const x = sx(i * step);
    out.push(`<line x1="${x.toFixed(1)}" y1="${y - 14}" x2="${x.toFixed(1)}" y2="${y + 14}" stroke="${INK}" stroke-width="4"/>`);
    out.push(`<text x="${x.toFixed(1)}" y="${y + 48}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${fs}" fill="${INK}">${i * step}</text>`);
    if (i > 0) {
      const xa = sx((i - 1) * step);
      const mid = (xa + x) / 2;
      const hgt = Math.min(120, (x - xa) * 0.9);
      out.push(`<path d="M${xa.toFixed(1)},${y - 6} Q${mid.toFixed(1)},${(y - hgt * 2).toFixed(1)} ${x.toFixed(1)},${y - 6}" fill="none" stroke="${RED}" stroke-width="5"/>`);
      out.push(`<polygon points="${x.toFixed(1)},${y - 6} ${(x - 12).toFixed(1)},${y - 20} ${(x - 2).toFixed(1)},${y - 24}" fill="${RED}"/>`);
    }
  }
  return out.join("");
}

function stripSvg(step: number): string {
  const out: string[] = [];
  const w = 88;
  const h = 88;
  const gap = 8;
  const ox = (PIC.size - (5 * w + 4 * gap)) / 2;
  const oy = (PIC.size - (2 * h + gap)) / 2;
  for (let i = 0; i < 10; i++) {
    const x = ox + (i % 5) * (w + gap);
    const y = oy + Math.floor(i / 5) * (h + gap);
    const v = step * (i + 1);
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${i % 2 ? "#FCE3B0" : "#D6E6FA"}" stroke="${INK}" stroke-width="3"/>`);
    out.push(`<text x="${x + w / 2}" y="${y + h / 2 + 14}" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="${v >= 100 ? 34 : 40}" fill="${INK}">${v}</text>`);
  }
  return out.join("");
}

export function mathVisualSvg(v: MathVisual | { kind: "strip"; step: number }): string {
  switch (v.kind) {
    case "array":
      return arraySvg(v.rows, v.cols);
    case "groups":
      return groupsSvg(v.groups, v.each);
    case "split":
      return arraySvg(v.rows, v.cols, (r) => (r < v.first ? [BLUE, 1] : v.fade ? ["#BBBBBB", 0.25] : [RED, 1]));
    case "rods":
      return rodsSvg(v.tens);
    case "hops":
      return hopsSvg(v.step, v.count);
    case "strip":
      return stripSvg(v.step);
  }
}

// ---------- religion: stained-glass symbols ----------
const GLASS = ["#1D4E89", "#2E7D9A", "#7A2E3A", "#2F6B3F", "#5B3A86", "#C27C1E"];
const GOLD = "#F5CF5A";
const LEAD = "#1E1E1E";
const ARCH = "M50,480 L50,210 A200,200 0 0 1 450,210 L450,480 Z";

function glassBackground(seed: number): string {
  const out: string[] = [];
  const cx = 250;
  const cy = 300;
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const R = 420;
    const c = GLASS[(i + seed) % GLASS.length];
    out.push(`<path d="M${cx},${cy} L${(cx + R * Math.cos(a0)).toFixed(1)},${(cy + R * Math.sin(a0)).toFixed(1)} L${(cx + R * Math.cos(a1)).toFixed(1)},${(cy + R * Math.sin(a1)).toFixed(1)} Z" fill="${c}" stroke="${LEAD}" stroke-width="4"/>`);
  }
  out.push(`<circle cx="${cx}" cy="${cy}" r="150" fill="#F7EBC8" fill-opacity="0.35" stroke="${LEAD}" stroke-width="5"/>`);
  return out.join("");
}

const S = `stroke="${LEAD}" stroke-width="5" stroke-linejoin="round"`;

const SYMBOLS: Record<SymbolName, string> = {
  cross: `<rect x="228" y="165" width="44" height="270" fill="${GOLD}" ${S}/><rect x="170" y="225" width="160" height="44" fill="${GOLD}" ${S}/>`,
  dove: `<path d="M150,320 Q220,260 300,300 Q340,250 360,260 Q350,290 330,310 Q320,370 240,370 Q190,370 150,320 Z" fill="#FFFFFF" ${S}/><path d="M230,305 Q250,200 330,180 Q300,250 280,310 Z" fill="#F2F2F2" ${S}/><circle cx="345" cy="272" r="5" fill="${LEAD}"/><polygon points="360,262 385,268 360,276" fill="${GOLD}" ${S}/><path d="M385,272 Q410,300 400,330" fill="none" stroke="#2F6B3F" stroke-width="6"/><ellipse cx="400" cy="300" rx="10" ry="5" fill="#59A35A" ${S}/>`,
  candle: `<circle cx="250" cy="200" r="70" fill="${GOLD}" fill-opacity="0.45"/><rect x="215" y="245" width="70" height="200" rx="6" fill="#FFF8E7" ${S}/><path d="M250,150 Q285,200 250,235 Q215,200 250,150 Z" fill="#FF9F1C" ${S}/><path d="M250,185 Q262,205 250,225 Q238,205 250,185 Z" fill="#FFE066"/><line x1="250" y1="235" x2="250" y2="248" stroke="${LEAD}" stroke-width="4"/>`,
  church: `<rect x="160" y="300" width="180" height="140" fill="#F4E3C1" ${S}/><polygon points="145,305 250,225 355,305" fill="#9B3D3D" ${S}/><rect x="225" y="170" width="50" height="80" fill="#F4E3C1" ${S}/><polygon points="215,175 250,130 285,175" fill="#9B3D3D" ${S}/><rect x="245" y="95" width="10" height="40" fill="${GOLD}" ${S}/><rect x="235" y="105" width="30" height="10" fill="${GOLD}" ${S}/><path d="M228,440 L228,385 A22,22 0 0 1 272,385 L272,440 Z" fill="#6B4226" ${S}/><circle cx="250" cy="335" r="20" fill="#2E7D9A" ${S}/>`,
  bible: `<path d="M110,240 Q180,215 250,250 L250,420 Q180,385 110,410 Z" fill="#FFF8E7" ${S}/><path d="M390,240 Q320,215 250,250 L250,420 Q320,385 390,410 Z" fill="#FFF8E7" ${S}/><g stroke="#8A7A5A" stroke-width="4"><line x1="135" y1="275" x2="225" y2="282"/><line x1="135" y1="305" x2="225" y2="312"/><line x1="135" y1="335" x2="225" y2="342"/><line x1="275" y1="282" x2="365" y2="275"/><line x1="275" y1="312" x2="365" y2="305"/><line x1="275" y1="342" x2="365" y2="335"/></g><rect x="240" y="160" width="20" height="60" fill="${GOLD}" ${S}/><rect x="222" y="175" width="56" height="16" fill="${GOLD}" ${S}/>`,
  tablets: `<path d="M120,440 L120,230 A60,60 0 0 1 240,230 L240,440 Z" fill="#D8D2C4" ${S}/><path d="M260,440 L260,230 A60,60 0 0 1 380,230 L380,440 Z" fill="#D8D2C4" ${S}/><g font-family="'DejaVu Serif', serif" font-weight="700" font-size="30" fill="#3A3A3A" text-anchor="middle"><text x="180" y="260">I</text><text x="180" y="300">II</text><text x="180" y="340">III</text><text x="180" y="380">IV</text><text x="180" y="420">V</text><text x="320" y="260">VI</text><text x="320" y="300">VII</text><text x="320" y="340">VIII</text><text x="320" y="380">IX</text><text x="320" y="420">X</text></g>`,
  star: `<polygon points="250,140 275,255 390,280 275,305 250,420 225,305 110,280 225,255" fill="${GOLD}" ${S}/><polygon points="250,200 300,230 330,280 300,330 250,360 200,330 170,280 200,230" fill="#FFF3B0" ${S}/><path d="M130,450 L250,380 L370,450 Z" fill="#3B2F5C" ${S}/>`,
  heart: `<path d="M250,430 C120,340 130,220 200,215 C230,213 245,235 250,250 C255,235 270,213 300,215 C370,220 380,340 250,430 Z" fill="#D6455B" ${S}/><path d="M250,140 L250,185 M180,160 L200,195 M320,160 L300,195 M140,215 L170,225 M360,215 L330,225" stroke="${GOLD}" stroke-width="8" stroke-linecap="round"/>`,
  chalice: `<circle cx="250" cy="185" r="45" fill="#FFFBF0" ${S}/><path d="M235,185 h30 M250,170 v30" stroke="#B88A2B" stroke-width="5"/><path d="M175,245 L325,245 Q320,320 250,335 Q180,320 175,245 Z" fill="${GOLD}" ${S}/><rect x="240" y="335" width="20" height="65" fill="${GOLD}" ${S}/><path d="M190,440 Q250,390 310,440 Z" fill="${GOLD}" ${S}/>`,
  keys: `<g transform="rotate(-35 250 300)"><circle cx="250" cy="175" r="38" fill="none" stroke="${GOLD}" stroke-width="16"/><circle cx="250" cy="175" r="38" fill="none" ${S}/><rect x="241" y="210" width="18" height="220" fill="${GOLD}" ${S}/><rect x="259" y="385" width="34" height="14" fill="${GOLD}" ${S}/><rect x="259" y="410" width="26" height="14" fill="${GOLD}" ${S}/></g><g transform="rotate(35 250 300)"><circle cx="250" cy="175" r="38" fill="none" stroke="#E8E8E8" stroke-width="16"/><circle cx="250" cy="175" r="38" fill="none" ${S}/><rect x="241" y="210" width="18" height="220" fill="#E8E8E8" ${S}/><rect x="207" y="385" width="34" height="14" fill="#E8E8E8" ${S}/><rect x="215" y="410" width="26" height="14" fill="#E8E8E8" ${S}/></g>`,
  lily: `<path d="M250,450 L250,260" stroke="#2F6B3F" stroke-width="10"/><path d="M250,390 Q200,360 190,320 Q235,340 250,380" fill="#59A35A" ${S}/><path d="M250,360 Q300,330 315,290 Q265,310 250,350" fill="#59A35A" ${S}/><path d="M250,270 Q200,230 205,170 Q240,200 250,260 Z" fill="#FFFFFF" ${S}/><path d="M250,270 Q300,230 295,170 Q260,200 250,260 Z" fill="#FFFFFF" ${S}/><path d="M250,265 Q225,200 250,140 Q275,200 250,265 Z" fill="#FFFFFF" ${S}/><circle cx="250" cy="255" r="8" fill="${GOLD}" ${S}/>`,
  sunrise: `<rect x="50" y="340" width="400" height="140" fill="#3F7D4E" ${S}/><path d="M160,340 A90,90 0 0 1 340,340 Z" fill="${GOLD}" ${S}/><g stroke="${GOLD}" stroke-width="9" stroke-linecap="round"><line x1="250" y1="200" x2="250" y2="160"/><line x1="160" y1="240" x2="130" y2="210"/><line x1="340" y1="240" x2="370" y2="210"/><line x1="120" y1="310" x2="85" y2="300"/><line x1="380" y1="310" x2="415" y2="300"/></g><rect x="244" y="380" width="12" height="60" fill="#FFF8E7" ${S}/><rect x="228" y="395" width="44" height="12" fill="#FFF8E7" ${S}/>`,
  mountain: `<polygon points="70,450 220,200 370,450" fill="#7D8B9E" ${S}/><polygon points="220,450 330,270 440,450" fill="#5F6E80" ${S}/><polygon points="220,200 252,253 230,245 205,262 188,253" fill="#FFFFFF" ${S}/><circle cx="380" cy="190" r="34" fill="${GOLD}" ${S}/><rect x="50" y="440" width="400" height="40" fill="#3F7D4E" ${S}/>`,
  path: `<rect x="50" y="300" width="400" height="180" fill="#4E8F57" ${S}/><path d="M180,480 Q230,400 230,360 Q230,320 250,300 L262,300 Q250,330 262,360 Q275,410 330,480 Z" fill="#E2C48E" ${S}/><rect x="244" y="215" width="12" height="70" fill="${GOLD}" ${S}/><rect x="228" y="232" width="44" height="12" fill="${GOLD}" ${S}/><circle cx="250" cy="245" r="60" fill="${GOLD}" fill-opacity="0.3"/>`,
  bread: `<path d="M100,400 Q105,470 250,470 Q395,470 400,400 Z" fill="#A86B32" ${S}/><ellipse cx="190" cy="370" rx="85" ry="45" fill="#E0A458" ${S}/><ellipse cx="310" cy="370" rx="85" ry="45" fill="#D9963F" ${S}/><path d="M150,355 l20,-15 M185,360 l20,-15 M220,365 l20,-15 M270,355 l20,-15 M305,360 l20,-15 M340,365 l20,-15" stroke="#8A5520" stroke-width="5"/><ellipse cx="250" cy="300" rx="70" ry="28" fill="#9FC3D8" ${S}/><polygon points="320,300 355,278 355,322" fill="#9FC3D8" ${S}/>`,
  house: `<rect x="150" y="280" width="200" height="160" fill="#F4E3C1" ${S}/><polygon points="125,290 250,180 375,290" fill="#9B3D3D" ${S}/><rect x="225" y="360" width="50" height="80" fill="#6B4226" ${S}/><path d="M250,345 C215,320 215,290 235,290 C243,290 248,297 250,302 C252,297 257,290 265,290 C285,290 285,320 250,345 Z" fill="#D6455B" ${S}/>`,
  sheep: `<g fill="#FFFFFF" ${S}><circle cx="200" cy="310" r="45"/><circle cx="250" cy="290" r="50"/><circle cx="300" cy="310" r="45"/><circle cx="230" cy="345" r="40"/><circle cx="280" cy="345" r="40"/></g><ellipse cx="350" cy="295" rx="30" ry="24" fill="#3A3A3A" ${S}/><g stroke="${LEAD}" stroke-width="12" stroke-linecap="round"><line x1="210" y1="380" x2="210" y2="430"/><line x1="290" y1="380" x2="290" y2="430"/></g><path d="M120,440 L120,220 Q120,170 160,175 Q190,180 185,215" fill="none" stroke="#8A5520" stroke-width="12" stroke-linecap="round"/>`,
  gift: `<rect x="150" y="280" width="200" height="160" fill="#2E7D9A" ${S}/><rect x="135" y="240" width="230" height="50" fill="#2E7D9A" ${S}/><rect x="235" y="240" width="30" height="200" fill="${GOLD}" ${S}/><path d="M250,240 Q190,170 180,225 Q190,250 250,240 Q310,250 320,225 Q310,170 250,240 Z" fill="${GOLD}" ${S}/>`,
  bell: `<path d="M250,160 Q170,170 170,300 L150,370 L350,370 L330,300 Q330,170 250,160 Z" fill="${GOLD}" ${S}/><circle cx="250" cy="395" r="22" fill="#B88A2B" ${S}/><rect x="238" y="135" width="24" height="30" rx="6" fill="#B88A2B" ${S}/><path d="M110,260 Q95,300 110,340 M390,260 Q405,300 390,340" fill="none" stroke="#FFF3B0" stroke-width="7" stroke-linecap="round"/>`,
  crown: `<polygon points="140,400 140,250 195,310 250,220 305,310 360,250 360,400" fill="${GOLD}" ${S}/><rect x="140" y="390" width="220" height="40" fill="${GOLD}" ${S}/><circle cx="250" cy="350" r="18" fill="#C0392B" ${S}/><circle cx="190" cy="355" r="13" fill="#2E7D9A" ${S}/><circle cx="310" cy="355" r="13" fill="#2F6B3F" ${S}/>`,
};

export const SYMBOL_NAMES = Object.keys(SYMBOLS) as SymbolName[];

export function symbolSvg(name: SymbolName): string {
  const seed = SYMBOL_NAMES.indexOf(name);
  return `<defs><clipPath id="arch"><path d="${ARCH}"/></clipPath></defs><g clip-path="url(#arch)">${glassBackground(seed)}${SYMBOLS[name]}</g><path d="${ARCH}" fill="none" stroke="#5A4632" stroke-width="16"/><path d="${ARCH}" fill="none" stroke="${LEAD}" stroke-width="4"/>`;
}

function visualSvg(v: VideoVisual): string {
  if (v.kind === "symbol") return symbolSvg(v.name);
  return `<rect x="0" y="0" width="${PIC.size}" height="${PIC.size}" rx="28" fill="#FFFFFF" stroke="#E2D8C3" stroke-width="3"/>${mathVisualSvg(v)}`;
}

export function slideSvg(slide: VideoSlide): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${FRAME_W}" height="${FRAME_H}" viewBox="0 0 ${FRAME_W} ${FRAME_H}">
<rect width="${FRAME_W}" height="${FRAME_H}" fill="#FBF6EC"/>
${textSvg(slide)}
<g transform="translate(${PIC.x},${PIC.y})">${visualSvg(slide.visual)}</g>
</svg>`;
}
