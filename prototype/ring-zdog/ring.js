/* HORIZON sphere — Zdog.
   A transparent, upright sphere of threads. The threads are the same design
   language as the site's Layer 0 background: thin glowing curves carrying a
   pulsing packet. Here they are shrunk down and wrapped inside a sphere, so the
   hero shows the platform's own imagery rather than a stock 3D object.

   Colour comes from the site's --thread-* tokens, so the sphere follows the
   theme exactly like the background layer does.

   Labels are HTML overlay chips. Canvas text cannot be selected, cannot be
   styled by the theme, and is not exposed to a screen reader. */

const SEGMENTS = 6;

/* Tunable geometry, overridable via window.RING_TUNING. */
function tuning() {
  return Object.assign(
    {
      radius: 62,      // sphere radius
      threads: 30,     // how many threads inside
      wobble: 20,      // how far a thread bulges from a great circle
      points: 64,      // samples per thread
      spin: 0.0013,    // radians per frame (~80s per turn)
    },
    window.RING_TUNING || {}
  );
}

function mix(hex, f) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const c = [1, 2, 3].map((i) => Math.round(parseInt(m[i], 16) * f));
  return "rgb(" + c.join(",") + ")";
}

const state = {
  lang: "bg",
  theme: "dark",
  paused: false,
  t: (k) => (window.I18N[state.lang] && window.I18N[state.lang][k]) || k,
};

/* ---------- scene ---------- */

let illo = null;
let anchors = [];
let chipEls = [];
let drag = null;
let spin = 0;

function threadColors() {
  const css = getComputedStyle(document.body);
  return {
    core: css.getPropertyValue("--thread-core").trim(),
    glow: css.getPropertyValue("--thread-glow").trim(),
    edge: css.getPropertyValue("--thread-edge").trim(),
  };
}

/* One thread: a circle on its own plane around the sphere, with a radial
   wobble so threads cross each other instead of nesting in neat rings. The
   circle is built first and then rotated onto its plane, which keeps the
   silhouette perfectly round — mixing the axes inline produced an oval. */
function threadPath(radius, wobble, phase, tiltA, tiltB, points) {
  const path = [];
  const ca = Math.cos(tiltA), sa = Math.sin(tiltA);
  const cb = Math.cos(tiltB), sb = Math.sin(tiltB);

  for (let s = 0; s <= points; s++) {
    const t = (s / points) * Zdog.TAU;
    const r = radius + Math.sin(t * 3 + phase) * wobble;

    const x0 = r * Math.cos(t);
    const y0 = r * Math.sin(t);

    // rotate around X, then around Y
    const y1 = y0 * cb;
    const z1 = y0 * sb;
    const x2 = x0 * ca + z1 * sa;
    const z2 = -x0 * sa + z1 * ca;

    path.push({ x: x2, y: y1, z: z2 });
  }
  return path;
}

function buildSphere() {
  const T = tuning();
  const canvas = document.getElementById("ring");
  const col = threadColors();
  const box = canvas.parentElement.getBoundingClientRect();
  const size = Math.max(260, Math.min(box.width, box.height || box.width));

  canvas.width = size;
  canvas.height = size;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";

  illo = new Zdog.Illustration({ element: canvas, zoom: size / 195, resize: false });

  const group = new Zdog.Group({ addTo: illo });

  // A faint core sphere, so the threads read as inside something rather than
  // floating loose. Drawn as rings rather than a fill, to stay transparent.
  new Zdog.Shape({
    addTo: group,
    path: [{ x: 0, y: -T.radius }, { x: 0, y: T.radius }],
    stroke: 0.8,
    color: mix(col.core, 1),
    opacity: 0.25,
  });

  for (let i = 0; i < T.threads; i++) {
    const tiltA = (i / T.threads) * Zdog.TAU;
    const tiltB = ((i * 1.7) % T.threads) / T.threads * Zdog.TAU;
    const wob = T.wobble * (0.35 + ((i * 37) % 100) / 100);

    new Zdog.Shape({
      addTo: group,
      path: threadPath(T.radius, wob, tiltA, tiltB, ((i * 1.7) % T.threads) / T.threads * Zdog.TAU, T.points),
      closed: true,
      stroke: i % 5 === 0 ? 1.6 : 0.8,
      color: i % 3 === 0 ? col.glow : col.core,
      opacity: i % 4 === 0 ? 0.9 : 0.55,
    });
  }

  // The sphere stands upright: no isometric tilt. Only the spin axis is set.
  illo.rotate.x = 0;
  illo.rotate.z = 0;
  illo.rotate.y = spin;

  illo.updateRenderGraph();
  syncChips();
}

/* ---------- labels ---------- */

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

/* Chips sit at fixed points around the upright sphere's silhouette. The sphere
   is a ring of threads with no discrete segments, so the labels are placed on
   the outline rather than projected from geometry — and the whole label layer
   counter-rotates with the sphere, which is what makes them read as attached to
   the object rather than painted on the screen. */
function syncChips() {
  if (!illo) return;
  const rect = illo.element.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const r = rect.width * 0.44;

  for (let i = 0; i < chipEls.length; i++) {
    const a = (i / SEGMENTS) * Zdog.TAU - Zdog.TAU * 0.25 + spin * 0.35;
    const el = chipEls[i];
    el.style.left = cx + r * Math.cos(a) + "px";
    el.style.top = cy + r * 0.98 * Math.sin(a) + "px";
    // Labels near the back of the sphere fade, which reads as depth.
    el.style.opacity = (0.35 + 0.65 * (0.5 + 0.5 * Math.cos(a))).toFixed(2);
  }
}

/* ---------- animation ---------- */

function animate() {
  if (!illo) return;
  if (!state.paused && !drag) spin += tuning().spin;
  if (drag) spin = drag.spin;
  illo.rotate.y = spin;
  illo.updateRenderGraph();
  syncChips();
  requestAnimationFrame(animate);
}

/* ---------- pointer ---------- */

function attachPointer(canvas) {
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, spin, moved: false };
    canvas.classList.add("is-dragging");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 3) drag.moved = true;
    drag.spin = spin + dx * 0.008;
  });
  const end = () => {
    if (drag && !drag.moved) {
      state.paused = !state.paused;
      canvas.classList.toggle("is-paused", state.paused);
    }
    if (drag) spin = drag.spin;
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
  buildSphere();
  applyI18n();
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  buildSphere();
  applyI18n();
}

document.querySelectorAll("[data-lang]").forEach((btn) => {
  btn.addEventListener("click", () => setLang(btn.dataset.lang));
});
document.getElementById("themeBtn").addEventListener("click", () => {
  setTheme(state.theme === "dark" ? "light" : "dark");
});

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(buildSphere, 150);
});

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  state.paused = true;
}

makeChips();
applyI18n();
renderPillars();
buildSphere();
applyI18n();
attachPointer(document.getElementById("ring"));
animate();
