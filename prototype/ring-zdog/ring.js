/* HORIZON — a circular block chain.
   Blocks linked into a chain, arranged around a circle, seen in 3D. The ring
   stands upright and turns, so the links are always visibly a chain and never
   flatten into a row of boxes.

   Plain canvas: the blocks, their faces, and the packets travelling the links
   all need per-frame control, which a retained 3D scene graph fights. The
   projection is a few lines of trigonometry.

   Colour comes from the site's --thread-* tokens, so the graphic follows the
   theme exactly like the Layer 0 background layer does. */

const SEGMENTS = 6;

/* Block data. The labels are the six platform areas, so the diagram reads as
   this product rather than as a generic blockchain. */
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

let colors = null;
function refreshColors() {
  const css = getComputedStyle(document.body);
  colors = {
    core: css.getPropertyValue("--thread-core").trim() || "#f97316",
    glow: css.getPropertyValue("--thread-glow").trim() || "#fb923c",
  };
}

/* ---------- geometry ----------
   A block is eight corners in its own local space. Everything else — the ring
   position, the upright tilt, the spin — is applied at projection time, so the
   same corner data works for every block and every frame. */
const BLOCK = {
  half: { x: 0.30, y: 0.30, z: 0.16 },   // half-extents; z is the thickness
  ringR: 0.74,                            // radius of the circle of blocks
  tilt: 0.52,                             // how far the ring leans back, radians
};

function blockCorners(cx, cy, cz) {
  const { x: hx, y: hy, z: hz } = BLOCK.half;
  const out = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        out.push({ x: cx + sx * hx, y: cy + sy * hy, z: cz + sz * hz });
      }
    }
  }
  return out;
}

/* Which corner pairs form the twelve edges. Indices match blockCorners order:
   bit 2 = x sign, bit 1 = y sign, bit 0 = z sign. */
const EDGES = [];
for (let a = 0; a < 8; a++) {
  for (let b = a + 1; b < 8; b++) {
    // adjacent corners differ in exactly one bit
    if ((a ^ b) === 1 || (a ^ b) === 2 || (a ^ b) === 4) EDGES.push([a, b]);
  }
}

/* The six faces, as corner indices, each with its outward normal in local
   space. Used to sort faces and to shade them by which way they point. */
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
let rot = { y: 0, x: 0 };

function buildBlocks() {
  const rand = mulberry32(77003);
  blocks = [];

  for (let i = 0; i < BLOCKS.length; i++) {
    const a = (i / BLOCKS.length) * Math.PI * 2;

    // Each block sits on the circle, facing outward along its radius.
    const cx = Math.cos(a) * BLOCK.ringR;
    const cy = Math.sin(a) * BLOCK.ringR;
    const cz = 0;

    blocks.push({
      ...BLOCKS[i],
      angle: a,
      center: { x: cx, y: cy, z: cz },
      corners: blockCorners(cx, cy, cz),
      // Height of the little tower inside the block, animated as the chain
      // "confirms". Kept in 0..1 so it can be eased.
      fill: 0.15 + rand() * 0.7,
      fillTarget: 0.15 + rand() * 0.7,
      // A small hash strip on the front face, so a block reads as a block.
      hash: Array.from({ length: 7 }, () => rand()),
    });
  }

  // Links between consecutive blocks, closing the ring. Each carries packets
  // travelling from one block to the next.
  links = [];
  for (let i = 0; i < blocks.length; i++) {
    const a = blocks[i];
    const b = blocks[(i + 1) % blocks.length];
    links.push({
      a: i,
      b: (i + 1) % blocks.length,
      packets: [
        { t: rand(), speed: 0.16 + rand() * 0.14 },
        { t: (rand() + 0.5) % 1, speed: 0.12 + rand() * 0.16 },
      ],
      // The link bows outward, which is what makes it read as a chain rather
      // than as a ring of straight spokes.
      bow: 0.16 + rand() * 0.1,
    });
  }
}

/* ---------- projection ---------- */
function project(p, cx, cy, R) {
  // Upright ring: lean it back about X so the circle reads as a circle in
  // perspective, then spin about Y.
  const tilt = BLOCK.tilt;

  // lean back (X axis)
  let y = p.y * Math.cos(tilt) - p.z * Math.sin(tilt);
  let z = p.y * Math.sin(tilt) + p.z * Math.cos(tilt);

  // spin (Y axis)
  const cy_ = Math.cos(rot.y), sy_ = Math.sin(rot.y);
  const x = p.x * cy_ + z * sy_;
  z = -p.x * sy_ + z * cy_;

  const persp = 1 / (1 - z * 0.36);
  return { x: cx + x * R * persp, y: cy + y * R * persp, z, s: persp };
}

function hexA(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || "").trim());
  if (!m) return `rgba(249,115,22,${a})`;
  const c = [1, 2, 3].map((i) => parseInt(m[i], 16));
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
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
  const col = colors;

  const cx = cssW / 2;
  const cy = cssH / 2;
  const R = Math.min(cssW, cssH) * 0.365;

  // ---- build the draw list: every block face and every link, each with a
  // depth, so the whole scene can be painted back to front in one pass.
  const items = [];

  const P = blocks.map((b) => ({
    b,
    center: project(b.center, cx, cy, R),
    corners: b.corners.map((c) => project(c, cx, cy, R)),
  }));

  for (const bp of P) {
    // face normals in world space, for shading
    const rotN = (n) => {
      const tilt = BLOCK.tilt;
      let y = n[1] * Math.cos(tilt) - n[2] * Math.sin(tilt);
      let z = n[1] * Math.sin(tilt) + n[2] * Math.cos(tilt);
      const cy_ = Math.cos(rot.y), sy_ = Math.sin(rot.y);
      const x = n[0] * cy_ + z * sy_;
      z = -n[0] * sy_ + z * cy_;
      return { x, y, z };
    };

    for (const f of FACES) {
      const pts = f.idx.map((i) => bp.corners[i]);
      const zAvg = pts.reduce((s, p) => s + p.z, 0) / pts.length;
      const n = rotN(f.n);
      // The face points away from the viewer when its normal has negative z.
      const facing = n.z;
      items.push({ kind: "face", pts, z: zAvg, facing, block: bp.b, face: f });
    }
  }

  for (const l of links) {
    const a = P[l.a].center;
    const b = P[l.b].center;
    // Bow the link outward from the ring centre.
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const outX = mx - cx;
    const outY = my - cy;
    const len = Math.hypot(outX, outY) || 1;
    const ctrl = {
      x: mx + (outX / len) * R * l.bow,
      y: my + (outY / len) * R * l.bow,
      z: (a.z + b.z) / 2,
    };

    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const u = 1 - t;
      pts.push({
        x: u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x,
        y: u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y,
        z: u * u * a.z + 2 * u * t * ctrl.z + t * t * b.z,
        t,
      });
    }
    items.push({ kind: "link", pts, z: (a.z + b.z) / 2, link: l });
  }

  items.sort((p, q) => p.z - q.z);

  // ---- paint
  for (const it of items) {
    if (it.kind === "face") {
      // Back faces are drawn dimmer rather than culled, so a block still reads
      // as a solid object when it turns edge-on.
      const lit = Math.max(0, it.facing);
      const alpha = it.facing < 0 ? 0.06 : 0.12 + lit * 0.16;
      ctx.fillStyle = hexA(col.core, alpha);
      ctx.beginPath();
      ctx.moveTo(it.pts[0].x, it.pts[0].y);
      for (let i = 1; i < it.pts.length; i++) ctx.lineTo(it.pts[i].x, it.pts[i].y);
      ctx.closePath();
      ctx.fill();

      // Edges: the wireframe that makes it a block rather than a smudge.
      ctx.strokeStyle = hexA(col.glow, it.facing < 0 ? 0.18 : 0.55);
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Front face only: the little content inside the block.
      if (it.face.n[2] === 1) {
        drawBlockContents(ctx, it, col);
      }
    } else {
      const depth = (it.z + 1) / 2;
      // The link is the chain: drawn solid, with a brighter head where it
      // meets the next block.
      ctx.strokeStyle = hexA(col.core, 0.28 + depth * 0.35);
      ctx.lineWidth = 1.6 + depth * 1.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(it.pts[0].x, it.pts[0].y);
      for (let i = 1; i < it.pts.length; i++) ctx.lineTo(it.pts[i].x, it.pts[i].y);
      ctx.stroke();

      for (const pk of it.link.packets) {
        const idx = Math.min(it.pts.length - 1, Math.floor(pk.t * (it.pts.length - 1)));
        const p0 = it.pts[idx];
        const p1 = it.pts[Math.min(idx + 1, it.pts.length - 1)];
        const frac = pk.t * (it.pts.length - 1) - idx;
        const px = p0.x + (p1.x - p0.x) * frac;
        const py = p0.y + (p1.y - p0.y) * frac;

        const g = ctx.createRadialGradient(px, py, 0, px, py, 6);
        g.addColorStop(0, hexA(col.glow, 0.9 * (0.4 + depth * 0.6)));
        g.addColorStop(0.45, hexA(col.glow, 0.3 * (0.4 + depth * 0.6)));
        g.addColorStop(1, hexA(col.glow, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = hexA("#ffffff", 0.85 * (0.4 + depth * 0.6));
        ctx.beginPath();
        ctx.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ---- the six labels, drawn as HTML chips by syncChips()
}

/* The inside of a block: a stack of "transactions" whose height is the fill
   level, plus a hash strip. Enough to read as data without being busy. */
function drawBlockContents(ctx, it, col) {
  const b = it.block;
  const pts = it.pts;
  // centre of the front face
  const fx = (pts[0].x + pts[2].x) / 2;
  const fy = (pts[0].y + pts[2].y) / 2;

  // face width/height from the projected corners
  const w = Math.abs(pts[2].x - pts[0].x);
  const h = Math.abs(pts[2].y - pts[0].y);

  // stacked bars = the block's contents filling up
  const bars = 4;
  const bw = w * 0.52;
  for (let i = 0; i < bars; i++) {
    const level = Math.min(1, Math.max(0, b.fill * bars - i));
    if (level <= 0) continue;
    const bh = (h * 0.5) / bars - 1.5;
    ctx.fillStyle = hexA(col.glow, 0.5 + level * 0.4);
    ctx.fillRect(
      fx - bw / 2,
      fy + h * 0.22 - i * (bh + 1.5) - bh,
      bw * level,
      Math.max(1, bh)
    );
  }

  // hash strip: short ticks along the bottom, so it reads as a hash
  ctx.strokeStyle = hexA(col.glow, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  const hy = fy + h * 0.30;
  for (let i = 0; i < b.hash.length; i++) {
    const x = fx - w * 0.26 + (i / (b.hash.length - 1)) * w * 0.52;
    const t = 2 + b.hash[i] * 4;
    ctx.moveTo(x, hy);
    ctx.lineTo(x, hy + t);
  }
  ctx.stroke();
}

/* ---------- loop ---------- */

function frame() {
  if (!state.paused && !drag) rot.y += 0.0016;
  if (drag) rot.y = drag.rot;

  // Blocks "confirm" over time: each drifts toward its target fill.
  if (!state.paused) {
    for (const b of blocks) {
      if (Math.abs(b.fill - b.fillTarget) < 0.01) {
        b.fillTarget = 0.15 + Math.random() * 0.7;
      }
      b.fill += (b.fillTarget - b.fill) * 0.02;
    }
    for (const l of links) {
      for (const pk of l.packets) {
        pk.t += pk.speed * 0.004;
        if (pk.t > 1) pk.t -= 1;
      }
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

/* Labels sit on their own block, projected from the block's centre, so they
   follow the chain as it turns instead of sitting on a fixed ring. */
function syncChips() {
  const canvas = document.getElementById("ring");
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.365;

  for (let i = 0; i < chipEls.length; i++) {
    if (!blocks[i]) continue;
    const p = project(blocks[i].center, cx, cy, R);
    const el = chipEls[i];
    // Push the chip out past the block so it does not cover the block itself.
    const outX = p.x - cx;
    const outY = p.y - cy;
    const len = Math.hypot(outX, outY) || 1;
    el.style.left = p.x + (outX / len) * 40 + "px";
    el.style.top = p.y + (outY / len) * 40 + "px";
    // Blocks at the back fade, which reads as depth.
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
