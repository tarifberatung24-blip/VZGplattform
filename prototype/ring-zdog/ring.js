/* HORIZON — 3D circular block chain, in the site's ring design language.

   The blocks use the same visual system as the Horizon3DScene ring already on
   /bg: the same --ring-0/1/2 palette, the same dark wall offset for extrusion,
   the same light bevel along the lit edge, and the same isometric tilt
   (rotateX 58deg / rotateZ -18deg) so the two graphics read as one family.

   The chain is drawn on canvas rather than as SVG, because the blocks turn and
   the packets travel: both need per-frame control, which an SVG tree fights.
   The design language is matched by using the same tokens and the same
   lighting model — each face is filled with its tone, its edges stroked with
   that tone darkened (a single shared stroke cannot work: a white outline is
   invisible on the light segment), and a wall copy sits behind it. */

const SEGMENTS = 6;

const BLOCKS = [
  { i18n: "ring.0", tone: 0 },
  { i18n: "ring.1", tone: 1 },
  { i18n: "ring.2", tone: 2 },
  { i18n: "ring.3", tone: 0 },
  { i18n: "ring.4", tone: 1 },
  { i18n: "ring.5", tone: 2 },
];

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const state = {
  lang: "bg",
  theme: "dark",
  paused: false,
  t: (k) => (window.I18N[state.lang] && window.I18N[state.lang][k]) || k,
};

/* ---------- theme tokens ----------
   Read from the site's CSS custom properties, so the graphic follows the theme
   exactly like the rest of the page. Cached rather than read every frame, which
   would force a style recalc at 60fps. */
let colors = null;
function refreshColors() {
  const css = getComputedStyle(document.body);
  const v = (n, fb) => (css.getPropertyValue(n) || "").trim() || fb;
  colors = {
    tone: [v("--ring-0", "#f97316"), v("--ring-1", "#e4e4e7"), v("--ring-2", "#18181b")],
    wall: v("--ring-wall", "#7c2d12"),
    bevel: v("--ring-bevel", "rgb(255 255 255 / 0.35)"),
    glow: v("--thread-glow", "#fb923c"),
  };
}

/* ---------- geometry ----------
   Matches the Horizon3DScene tilt so the two graphics sit in the same space. */
const TILT_X = (58 * Math.PI) / 180;
const ROLL_Z = (-18 * Math.PI) / 180;

const BLOCK = {
  half: { x: 0.30, y: 0.30, z: 0.17 },
  ringR: 0.72,
};

/* Eight corners per block, in local space. */
function blockCorners(cx, cy, cz) {
  const { x: hx, y: hy, z: hz } = BLOCK.half;
  const out = [];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) out.push({ x: cx + sx * hx, y: cy + sy * hy, z: cz + sz * hz });
  return out;
}

/* Corner index bit 2 = x sign, bit 1 = y sign, bit 0 = z sign. */
const EDGES = [];
for (let a = 0; a < 8; a++)
  for (let b = a + 1; b < 8; b++)
    if ((a ^ b) === 1 || (a ^ b) === 2 || (a ^ b) === 4) EDGES.push([a, b]);

/* The six faces, each with its outward normal in local space. */
const FACES = [
  { idx: [0, 2, 6, 4], n: [-1, 0, 0] },
  { idx: [1, 3, 7, 5], n: [1, 0, 0] },
  { idx: [0, 1, 5, 4], n: [0, -1, 0] },
  { idx: [2, 3, 7, 6], n: [0, 1, 0] },
  { idx: [0, 1, 3, 2], n: [0, 0, -1] },
  { idx: [4, 5, 7, 6], n: [0, 0, 1] },
];

let blocks = [];
let links = [];
let drag = null;
let rot = { y: 0 };

function buildBlocks() {
  const rand = mulberry32(77003);
  blocks = [];
  for (let i = 0; i < BLOCKS.length; i++) {
    const a = (i / BLOCKS.length) * Math.PI * 2;
    const c = { x: Math.cos(a) * BLOCK.ringR, y: Math.sin(a) * BLOCK.ringR, z: 0 };
    blocks.push({
      ...BLOCKS[i],
      angle: a,
      center: c,
      corners: blockCorners(c.x, c.y, c.z),
      fill: 0.2 + rand() * 0.6,
      fillTarget: 0.2 + rand() * 0.6,
      hash: Array.from({ length: 7 }, () => rand()),
    });
  }

  links = [];
  for (let i = 0; i < blocks.length; i++) {
    links.push({
      a: i,
      b: (i + 1) % blocks.length,
      packets: [
        { t: rand(), speed: 0.16 + rand() * 0.14 },
        { t: (rand() + 0.5) % 1, speed: 0.12 + rand() * 0.16 },
      ],
      bow: 0.14 + rand() * 0.1,
    });
  }
}

/* ---------- projection ----------
   The same transform the site's ring uses: tilt back about X, roll about Z,
   then spin about Y. Applying all three at projection time means one set of
   corner data serves every block and every frame. */
function project(p, cx, cy, R) {
  // spin (Y)
  const cyw = Math.cos(rot.y), syw = Math.sin(rot.y);
  let x = p.x * cyw + p.z * syw;
  let z = -p.x * syw + p.z * cyw;
  let y = p.y;

  // roll (Z)
  const cr = Math.cos(ROLL_Z), sr = Math.sin(ROLL_Z);
  const xr = x * cr - y * sr;
  const yr = x * sr + y * cr;
  x = xr;
  y = yr;

  // tilt back (X)
  const ct = Math.cos(TILT_X), st = Math.sin(TILT_X);
  const yt = y * ct - z * st;
  const zt = y * st + z * ct;
  y = yt;
  z = zt;

  const persp = 1 / (1 - z * 0.22);
  return { x: cx + x * R * persp, y: cy + y * R * persp, z, s: persp };
}

/* Rotate a local normal by the same transform, for lighting. */
function projectNormal(n) {
  const cyw = Math.cos(rot.y), syw = Math.sin(rot.y);
  let x = n[0] * cyw + n[2] * syw;
  let z = -n[0] * syw + n[2] * cyw;
  let y = n[1];
  const cr = Math.cos(ROLL_Z), sr = Math.sin(ROLL_Z);
  const xr = x * cr - y * sr, yr = x * sr + y * cr;
  x = xr; y = yr;
  const ct = Math.cos(TILT_X), st = Math.sin(TILT_X);
  const yt = y * ct - z * st, zt = y * st + z * ct;
  return { x, y: yt, z: zt };
}

/* ---------- colour helpers ---------- */

/* Parse a hex or rgb() token into channels. The site's tokens are a mix of the
   two — --ring-1 is a hex, --ring-bevel is an rgb() with alpha — so both have
   to be understood. */
function parseColor(s) {
  s = (s || "").trim();
  let m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(s);
  if (m) return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16), a: 1 };
  m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)/i.exec(s);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  return { r: 249, g: 115, b: 22, a: 1 };
}

function rgba(c, a) {
  return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${a})`;
}

/* Darken toward black, lighten toward white — the same idea as the CSS
   color-mix() strokes the site uses on its ring faces. */
function shade(c, f) {
  if (f <= 1) return { r: c.r * f, g: c.g * f, b: c.b * f, a: c.a };
  const t = f - 1;
  return { r: c.r + (255 - c.r) * t, g: c.g + (255 - c.g) * t, b: c.b + (255 - c.b) * t, a: c.a };
}

/* ---------- render ---------- */

function draw() {
  const canvas = document.getElementById("ring");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || canvas.width;
  const cssH = canvas.clientHeight || canvas.height;

  if (canvas.width !== Math.round(cssW * dpr)) {
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  if (!colors) refreshColors();
  const C = colors;
  const tones = C.tone.map(parseColor);
  const wallCol = parseColor(C.wall);
  const bevelCol = parseColor(C.bevel);
  const glowCol = parseColor(C.glow);

  const cx = cssW / 2;
  const cy = cssH / 2;
  const R = Math.min(cssW, cssH) * 0.40;

  const P = blocks.map((b) => ({
    b,
    center: project(b.center, cx, cy, R),
    corners: b.corners.map((c) => project(c, cx, cy, R)),
  }));

  const items = [];

  for (const bp of P) {
    const tone = tones[bp.b.tone];

    for (const f of FACES) {
      const pts = f.idx.map((i) => bp.corners[i]);
      const zAvg = pts.reduce((s, p) => s + p.z, 0) / pts.length;
      const n = projectNormal(f.n);
      // Light from the upper left, the same direction the site's gradients run.
      const lit = Math.max(0, n.z * 0.7 + n.y * -0.3 + n.x * -0.2);
      items.push({ kind: "face", pts, z: zAvg, facing: n.z, lit, tone, block: bp.b, face: f });
    }

    // The wall: a copy of the block pushed down in screen space, exactly as the
    // site's ring does with translateY(22px). This is what reads as thickness.
    items.push({
      kind: "wall",
      pts: bp.corners.map((c) => ({ x: c.x, y: c.y + R * 0.16, z: c.z })),
      z: bp.center.z - 0.05,
      tone,
      block: bp.b,
    });
  }

  for (const l of links) {
    const a = P[l.a].center;
    const b = P[l.b].center;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const outX = mx - cx, outY = my - cy;
    const len = Math.hypot(outX, outY) || 1;
    const ctrl = {
      x: mx + (outX / len) * R * l.bow,
      y: my + (outY / len) * R * l.bow,
      z: (a.z + b.z) / 2,
    };
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, u = 1 - t;
      pts.push({
        x: u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x,
        y: u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y,
        z: u * u * a.z + 2 * u * t * ctrl.z + t * t * b.z,
      });
    }
    items.push({ kind: "link", pts, z: (a.z + b.z) / 2 - 0.02, link: l });
  }

  items.sort((p, q) => p.z - q.z);

  for (const it of items) {
    if (it.kind === "link") {
      const depth = (it.z + 1) / 2;
      ctx.strokeStyle = rgba(glowCol, 0.3 + depth * 0.4);
      ctx.lineWidth = 1.8 + depth * 1.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(it.pts[0].x, it.pts[0].y);
      for (let i = 1; i < it.pts.length; i++) ctx.lineTo(it.pts[i].x, it.pts[i].y);
      ctx.stroke();

      for (const pk of it.link.packets) {
        const idx = Math.min(it.pts.length - 1, Math.floor(pk.t * (it.pts.length - 1)));
        const p0 = it.pts[idx], p1 = it.pts[Math.min(idx + 1, it.pts.length - 1)];
        const frac = pk.t * (it.pts.length - 1) - idx;
        const px = p0.x + (p1.x - p0.x) * frac;
        const py = p0.y + (p1.y - p0.y) * frac;
        const g = ctx.createRadialGradient(px, py, 0, px, py, 6);
        g.addColorStop(0, rgba(glowCol, 0.95 * (0.4 + depth * 0.6)));
        g.addColorStop(0.45, rgba(glowCol, 0.3 * (0.4 + depth * 0.6)));
        g.addColorStop(1, rgba(glowCol, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255," + (0.85 * (0.4 + depth * 0.6)).toFixed(2) + ")";
        ctx.beginPath();
        ctx.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      continue;
    }

    const first = it.pts[0];
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < it.pts.length; i++) ctx.lineTo(it.pts[i].x, it.pts[i].y);
      ctx.closePath();
    };

    if (it.kind === "wall") {
      path();
      ctx.fillStyle = rgba(wallCol, 0.95);
      ctx.fill();
      continue;
    }

    // Face: the tone, lit by which way it points.
    const alpha = it.facing < 0 ? 0.30 : 0.85;
    path();
    ctx.fillStyle = rgba(it.tone, alpha);
    ctx.fill();

    // Bevel: a light edge along the lit side, the same idea as the site's
    // translateY(-1.5px) light copy. Only the top edge is stroked, so it reads
    // as a lit rim rather than an outline.
    if (it.facing > 0.3) {
      ctx.strokeStyle = rgba(bevelCol, 0.55 * bevelCol.a);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(it.pts[3].x, it.pts[3].y);
      ctx.lineTo(it.pts[2].x, it.pts[2].y);
      ctx.stroke();
    }

    // Edge stroke in the tone darkened. A single shared stroke cannot work: a
    // white outline would be invisible on the light segment.
    path();
    ctx.strokeStyle = rgba(shade(it.tone, 0.6), it.facing < 0 ? 0.35 : 0.9);
    ctx.lineWidth = 1.1;
    ctx.lineJoin = "round";
    ctx.stroke();

    if (it.face.n[2] === 1) drawBlockContents(ctx, it, glowCol);
  }
}

/* Inside a block: bars whose height is the fill level, plus a hash strip. */
function drawBlockContents(ctx, it, glowCol) {
  const b = it.block;
  const pts = it.pts;
  const fx = (pts[0].x + pts[2].x) / 2;
  const fy = (pts[0].y + pts[2].y) / 2;
  const w = Math.abs(pts[2].x - pts[0].x);
  const h = Math.abs(pts[2].y - pts[0].y);

  const bars = 4;
  const bw = w * 0.5;
  for (let i = 0; i < bars; i++) {
    const level = Math.min(1, Math.max(0, b.fill * bars - i));
    if (level <= 0) continue;
    const bh = (h * 0.46) / bars - 1.4;
    ctx.fillStyle = rgba(glowCol, 0.45 + level * 0.45);
    ctx.fillRect(fx - bw / 2, fy + h * 0.2 - i * (bh + 1.4) - bh, bw * level, Math.max(1, bh));
  }

  ctx.strokeStyle = rgba(glowCol, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  const hy = fy + h * 0.28;
  for (let i = 0; i < b.hash.length; i++) {
    const x = fx - w * 0.25 + (i / (b.hash.length - 1)) * w * 0.5;
    const t = 2 + b.hash[i] * 3.5;
    ctx.moveTo(x, hy);
    ctx.lineTo(x, hy + t);
  }
  ctx.stroke();
}

/* ---------- loop ---------- */

function frame() {
  if (!state.paused && !drag) rot.y += 0.0016;
  if (drag) rot.y = drag.rot;

  if (!state.paused) {
    for (const b of blocks) {
      if (Math.abs(b.fill - b.fillTarget) < 0.01) b.fillTarget = 0.2 + Math.random() * 0.6;
      b.fill += (b.fillTarget - b.fill) * 0.02;
    }
    for (const l of links)
      for (const pk of l.packets) {
        pk.t += pk.speed * 0.004;
        if (pk.t > 1) pk.t -= 1;
      }
  }
  draw();
  requestAnimationFrame(frame);
}

/* ---------- labels ---------- */

let chipEls = [];

function makeChips() {
  const host = document.getElementById("ringLabels");
  host.innerHTML = "";
  chipEls = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const el = document.createElement("span");
    el.className = "chip";
    el.dataset.i18n = BLOCKS[i].i18n;
    host.appendChild(el);
    chipEls.push(el);
  }
}

function syncChips() {
  const canvas = document.getElementById("ring");
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const cx = w / 2, cy = h / 2;
  const R = Math.min(w, h) * 0.40;
  for (let i = 0; i < chipEls.length; i++) {
    if (!blocks[i]) continue;
    const p = project(blocks[i].center, cx, cy, R);
    const el = chipEls[i];
    const outX = p.x - cx, outY = p.y - cy;
    const len = Math.hypot(outX, outY) || 1;
    el.style.left = p.x + (outX / len) * 42 + "px";
    el.style.top = p.y + (outY / len) * 42 + "px";
    el.style.opacity = (0.35 + 0.65 * ((p.z + 1) / 2)).toFixed(2);
    el.style.zIndex = String(1000 + Math.round(p.z * 100));
  }
}

/* ---------- pointer ---------- */

function attachPointer(canvas) {
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, rot: rot.y, moved: false };
    canvas.classList.add("is-dragging");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 3) drag.moved = true;
    drag.rot = rot.y + dx * 0.006;
  });
  const end = () => {
    if (drag && !drag.moved) {
      state.paused = !state.paused;
      canvas.classList.toggle("is-paused", state.paused);
    }
    if (drag) rot.y = drag.rot;
    drag = null;
    canvas.classList.remove("is-dragging");
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("pointerenter", () => { if (!drag) state.paused = true; });
  canvas.addEventListener("pointerleave", () => { if (!drag) state.paused = false; });
}

/* ---------- i18n ---------- */

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = state.t(el.dataset.i18n);
  });
  const btn = document.querySelector("#themeBtn span");
  btn.textContent = state.theme === "dark" ? state.t("theme") : state.t("theme.other");
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-lang]").forEach((b) => {
    b.classList.toggle("on", b.dataset.lang === state.lang);
  });
}

function renderPillars() {
  const host = document.getElementById("pillars");
  host.innerHTML = "";
  [0, 1, 2].forEach((i) => {
    const el = document.createElement("span");
    el.className = "pillar";
    el.dataset.i18n = `pillars.${i}`;
    host.appendChild(el);
  });
  host.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = state.t(el.dataset.i18n);
  });
}

function setLang(lang) {
  state.lang = lang;
  applyI18n();
  renderPillars();
  applyI18n();
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  refreshColors();
  applyI18n();
}

document.querySelectorAll("[data-lang]").forEach((btn) => {
  btn.addEventListener("click", () => setLang(btn.dataset.lang));
});
document.getElementById("themeBtn").addEventListener("click", () => {
  setTheme(state.theme === "dark" ? "light" : "dark");
});

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  state.paused = true;
}

buildBlocks();
makeChips();
applyI18n();
renderPillars();
attachPointer(document.getElementById("ring"));

(function tick() {
  syncChips();
  requestAnimationFrame(tick);
})();

requestAnimationFrame(frame);
