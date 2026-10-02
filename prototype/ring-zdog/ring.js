/* HORIZON — the platform as a nervous system.
   A miniature of the product: a sphere of filaments with information running
   through it. Everything lives inside the circle; nothing spills past the rim.

   Plain canvas rather than a 3D library. The filaments are a branching network
   and the information is a pulse travelling along each branch, which needs
   per-frame control of every strand. A retained 3D scene graph fights that.

   Colour comes from the site's --thread-* tokens, so it follows the theme
   exactly like the Layer 0 background layer does. */

/* ---------- deterministic randomness ----------
   A seeded generator, so the network is identical on every load and on every
   language switch. Without it the layout would be reshuffled whenever the user
   changed language, which reads as a glitch rather than a redraw. */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEGMENTS = 6;

const state = {
  lang: "bg",
  theme: "dark",
  paused: false,
  t: (k) => (window.I18N[state.lang] && window.I18N[state.lang][k]) || k,
};

/* ---------- network geometry ---------- */

let nodes = [];       // { x, y, z, r } inside the unit sphere
let edges = [];       // { a, b, len } between nearby nodes
let filaments = [];   // { a, b, c, len, pulses:[{ t, speed }] }
let rot = { y: 0, x: 0 };
let drag = null;

/* Fibonacci sphere: an even spread of nodes with no poles or clumping, which is
   what makes the network read as a globe rather than a random blob. */
function seedNodes(rand, count) {
  const out = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    // Pull each node slightly off the shell so the network has depth inside the
    // circle instead of sitting on a hollow surface.
    const k = 0.55 + rand() * 0.45;
    out.push({
      x: Math.cos(th) * r * k,
      y: y * k,
      z: Math.sin(th) * r * k,
      r: 0.5 + rand() * 0.9,
    });
  }
  return out;
}

function buildNetwork() {
  const rand = mulberry32(20261001);
  const N = 190;
  nodes = seedNodes(rand, N);

  // Connect each node to its nearest few. Distances are computed in 3D, so the
  // web is a real sphere rather than a flat disc.
  edges = [];
  for (let i = 0; i < N; i++) {
    const d = [];
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dz = nodes[i].z - nodes[j].z;
      d.push({ j, d2: dx * dx + dy * dy + dz * dz });
    }
    d.sort((p, q) => p.d2 - q.d2);
    const links = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < links && k < d.length; k++) {
      const j = d[k].j;
      if (j < i) continue;             // one edge per pair
      edges.push({ a: i, b: j, len: Math.sqrt(d[k].d2) });
    }
  }

  // Each edge is drawn as a curved filament rather than a straight line: the
  // bow gives the branching, organic look of a nerve rather than a wire mesh.
  filaments = edges.map((e, idx) => {
    const bow = 0.06 + rand() * 0.14;
    const ang = rand() * Math.PI * 2;
    return {
      ...e,
      // control point for the quadratic curve, offset perpendicular to the edge
      c: { x: Math.cos(ang) * bow, y: Math.sin(ang) * bow, z: (rand() - 0.5) * bow },
      // Information travelling through: a pulse per filament, staggered so the
      // network never blinks in unison.
      pulses: [
        { t: rand(), speed: 0.10 + rand() * 0.16 },
        ...(idx % 3 === 0 ? [{ t: rand(), speed: 0.07 + rand() * 0.12 }] : []),
      ],
      w: 0.5 + rand() * 0.9,
    };
  });
}

/* ---------- projection ----------
   Rotate the point, then apply a weak perspective so the near side of the
   sphere is slightly larger. Without the perspective term the projection reads
   as flat and the "miniature globe" effect is lost. */
function project(p, cx, cy, R) {
  const cy_ = Math.cos(rot.y), sy_ = Math.sin(rot.y);
  const cx_ = Math.cos(rot.x), sx_ = Math.sin(rot.x);

  let x = p.x * cy_ + p.z * sy_;
  let z = -p.x * sy_ + p.z * cy_;
  let y = p.y * cx_ - z * sx_;
  z = p.y * sx_ + z * cx_;

  const persp = 1 / (1 - z * 0.22);
  return { x: cx + x * R * persp, y: cy + y * R * persp, z, s: persp };
}

/* Clip a filament to the circle. Anything outside the rim is trimmed, so the
   network is contained rather than spilling over the edges. */
function clipToCircle(pts, cx, cy, R) {
  const inside = (p) => {
    const dx = p.x - cx, dy = p.y - cy;
    return dx * dx + dy * dy <= R * R;
  };
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (inside(p)) {
      out.push(p);
    } else if (out.length) {
      break; // left the circle; stop the strand here
    }
  }
  return out;
}

let colors = null;

function refreshColors() {
  const css = getComputedStyle(document.body);
  colors = {
    core: css.getPropertyValue("--thread-core").trim() || "#f97316",
    glow: css.getPropertyValue("--thread-glow").trim() || "#fb923c",
  };
}

/* ---------- render ---------- */

function draw(time) {
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

  const cx = cssW / 2;
  const cy = cssH / 2;
  const R = Math.min(cssW, cssH) * 0.42;

  if (!colors) refreshColors();
  const col = colors;

  // Project every node once per frame.
  const P = nodes.map((n) => project(n, cx, cy, R));

  // Rim: the boundary the network is contained by. A soft inner glow reads as
  // glass; the crisp ring keeps the circle legible.
  const rim = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 1.02);
  rim.addColorStop(0, "transparent");
  rim.addColorStop(0.82, hexA(col.glow, 0.05));
  rim.addColorStop(1, hexA(col.glow, 0.16));
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.02, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hexA(col.glow, 0.34);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // Filaments, drawn back to front so the near strands sit on top.
  const order = filaments
    .map((f) => ({ f, z: (P[f.a].z + P[f.b].z) / 2 }))
    .sort((p, q) => p.z - q.z);

  for (const { f, z } of order) {
    const a = P[f.a];
    const b = P[f.b];
    const c = project(f.c, cx, cy, R);

    // Quadratic curve sampled into points, so it can be clipped to the circle.
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const u = 1 - t;
      pts.push({
        x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
        y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
        t,
      });
    }
    const kept = clipToCircle(pts, cx, cy, R);
    if (kept.length < 2) continue;

    const depth = (z + 1) / 2;             // 0 = far, 1 = near
    const alpha = 0.10 + depth * 0.42;

    ctx.strokeStyle = hexA(col.core, alpha);
    ctx.lineWidth = f.w * (0.6 + depth * 0.8);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(kept[0].x, kept[0].y);
    for (let i = 1; i < kept.length; i++) ctx.lineTo(kept[i].x, kept[i].y);
    ctx.stroke();

    // Information flowing: a bright pulse travelling along the filament.
    for (const pulse of f.pulses) {
      if (!state.paused) pulse.t += pulse.speed * 0.004;
      if (pulse.t > 1) pulse.t -= 1;

      // Position along the clipped run, so a pulse never lights up outside the
      // circle even when its filament is trimmed at the rim.
      const idx = Math.floor(pulse.t * (kept.length - 1));
      const p0 = kept[idx];
      const p1 = kept[Math.min(idx + 1, kept.length - 1)];
      const frac = pulse.t * (kept.length - 1) - idx;
      const px = p0.x + (p1.x - p0.x) * frac;
      const py = p0.y + (p1.y - p0.y) * frac;

      const g = ctx.createRadialGradient(px, py, 0, px, py, 7);
      g.addColorStop(0, hexA(col.glow, 0.95 * (0.4 + depth * 0.6)));
      g.addColorStop(0.4, hexA(col.glow, 0.35 * (0.4 + depth * 0.6)));
      g.addColorStop(1, hexA(col.glow, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = hexA("#ffffff", 0.85 * (0.35 + depth * 0.65));
      ctx.beginPath();
      ctx.arc(px, py, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Nodes: the synapses. Drawn last so they sit on top of the filaments.
  for (const n of P) {
    const depth = (n.z + 1) / 2;
    ctx.fillStyle = hexA(col.glow, 0.25 + depth * 0.6);
    ctx.beginPath();
    ctx.arc(n.x, n.y, 0.8 + depth * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* hex + alpha -> rgba(), so the site's hex tokens can be drawn with opacity. */
function hexA(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || "").trim());
  if (!m) return `rgba(249,115,22,${a})`;
  const c = [1, 2, 3].map((i) => parseInt(m[i], 16));
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

/* ---------- loop ---------- */

function frame() {
  if (!state.paused && !drag) rot.y += 0.0022;
  if (drag) rot.y = drag.rot;
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
    el.dataset.i18n = `ring.${i}`;
    host.appendChild(el);
    chipEls.push(el);
  }
}

/* The labels sit on the rim, evenly spaced and counter-rotating slowly with the
   network, so they read as attached to the object rather than painted on. */
function syncChips() {
  const canvas = document.getElementById("ring");
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.42;

  for (let i = 0; i < chipEls.length; i++) {
    const a = (i / SEGMENTS) * Math.PI * 2 - Math.PI / 2 + rot.y * 0.25;
    const el = chipEls[i];
    el.style.left = cx + R * 1.14 * Math.cos(a) + "px";
    el.style.top = cy + R * 1.14 * Math.sin(a) + "px";
    el.style.opacity = (0.4 + 0.6 * (0.5 + 0.5 * Math.cos(a))).toFixed(2);
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

/* ---------- wiring ---------- */

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

buildNetwork();
makeChips();
applyI18n();
renderPillars();
attachPointer(document.getElementById("ring"));

// The chips track the rotation, so they are synced from the same loop.
(function tick() {
  syncChips();
  requestAnimationFrame(tick);
})();

requestAnimationFrame(frame);
