/* HORIZON 3D ring — Zdog.
   Zdog is a pseudo-3D engine: geometry lives in 3D space but is drawn as flat
   vector shapes. A torus is a ring of circles, which is exactly the look in the
   reference. Each segment is its own Zdog Shape so it can be coloured and
   labelled independently.

   Labels are drawn as HTML overlay chips rather than into the canvas. Canvas
   text cannot be selected, cannot be styled by the theme, and would not be
   picked up by a screen reader — as HTML they inherit all three for free. */

const RING_LABELS = 6;

/* Tunable geometry. Overridable via window.RING_TUNING so the tilt and depth
   can be dialled in from a console without editing this file. */
function tuning() {
  return Object.assign(
    { tilt: 0.14, roll: 0.05, depth: 55, layers: 14, radius: 70, stroke: 34, gap: 0.045 },
    window.RING_TUNING || {}
  );
}

const state = {
  lang: "bg",
  theme: "dark",
  t: (k) => (window.I18N[state.lang] && window.I18N[state.lang][k]) || k,
};

/* Darken a hex colour. Used for the extrusion's lower layers so the wall reads
   as shaded rather than a flat slab of the same tone. */
function shade(hex, f) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const c = [1, 2, 3].map((i) => Math.round(parseInt(m[i], 16) * f));
  return "rgb(" + c.join(",") + ")";
}

/* ---------- Zdog scene ---------- */

let illo = null;
let labelEls = [];

function ringColors() {
  const css = getComputedStyle(document.body);
  return {
    seg: [0, 1, 2].map((i) => css.getPropertyValue(`--ring-${i}`).trim()),
    tick: css.getPropertyValue("--ring-tick").trim(),
  };
}

function buildRing() {
  const T = tuning();
  const canvas = document.getElementById("ring");
  const { seg, tick } = ringColors();
  const box = canvas.parentElement.getBoundingClientRect();
  const size = Math.max(260, Math.min(box.width, box.height || box.width));

  canvas.width = size;
  canvas.height = size;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";

  illo = new Zdog.Illustration({
    element: canvas,
    zoom: size / 320,
    // Drag-to-rotate is off on purpose: the labels are HTML positioned in
    // screen space, so rotating the model would slide them off their segments.
    resize: false,
  });

  const radius = T.radius;
  const stroke = T.stroke;
  const gap = T.gap; // radians of empty space between segments
  const STEPS = 18;
  const LAYERS = T.layers; // stacked copies that fake the extrusion
  const DEPTH = T.depth;

  for (let i = 0; i < RING_LABELS; i++) {
    const a0 = (i / RING_LABELS) * Zdog.TAU + gap / 2;
    const a1 = ((i + 1) / RING_LABELS) * Zdog.TAU - gap / 2;

    // Each segment is a polyline along its arc. Zdog's `arc` command needs a
    // corner point *and* a following end point, and treats the first path
    // command as a move — feeding it a single arc point silently draws nothing.
    // A stroked polyline with round joins gives the same pill-shaped segment
    // with no such trap.
    const path = [];
    for (let s = 0; s <= STEPS; s++) {
      const a = a0 + ((a1 - a0) * s) / STEPS;
      path.push({ x: radius * Math.cos(a), y: radius * Math.sin(a) });
    }

    // Zdog has no extruded geometry, so thickness is a stack of the same path
    // stepped along z. Zdog depth-sorts the stack, so the edges read as a solid
    // wall. Lower layers are darkened to stand in for the shading a real
    // extrusion would get.
    for (let L = 0; L < LAYERS; L++) {
      const t = L / (LAYERS - 1);
      new Zdog.Shape({
        addTo: illo,
        path,
        closed: false,
        stroke,
        color: shade(seg[i % 3], 0.45 + 0.55 * t),
        translate: { z: -DEPTH / 2 + DEPTH * t },
      });
    }
  }

  // The ring lies flat and is viewed at an angle: the isometric look.
  illo.rotate.x = -Zdog.TAU * T.tilt;
  illo.rotate.z = -Zdog.TAU * T.roll;

  layoutLabels(radius, stroke);
  illo.updateRenderGraph();
}

/* ---------- HTML labels over the canvas ---------- */

function layoutLabels(radius, stroke) {
  const host = document.getElementById("ringLabels");
  host.innerHTML = "";
  labelEls = [];

  const r = radius + stroke / 2 + 16;

  for (let i = 0; i < RING_LABELS; i++) {
    const mid = ((i + 0.5) / RING_LABELS) * 360 - 90;
    const rad = (mid * Math.PI) / 180;

    const el = document.createElement("span");
    el.className = "chip";
    el.dataset.i18n = `ring.${i}`;
    el.style.setProperty("--angle", mid + "deg");
    // Position on the ring's projected ellipse. The ring is tilted, so the
    // vertical axis is squashed to match how Zdog foreshortens it.
    // The ring projects to roughly 32% x 18% of the canvas. The chips use the
    // same ratio, so they trace the ring instead of a circle and stop drifting
    // off it vertically.
    el.style.left = 50 + 32 * Math.cos(rad) + "%";
    el.style.top = 50 + 18 * Math.sin(rad) + "%";
    host.appendChild(el);
    labelEls.push(el);
  }
}

/* ---------- i18n ---------- */

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = state.t(el.dataset.i18n);
  });
  const themeBtn = document.querySelector("#themeBtn span");
  themeBtn.textContent = state.theme === "dark" ? state.t("theme") : state.t("theme.other");
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
  // The ring's own labels are part of the translation, so the scene is rebuilt
  // rather than just re-rendered.
  buildRing();
  applyI18n();
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  buildRing();
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
  resizeTimer = setTimeout(buildRing, 150);
});

applyI18n();
renderPillars();
buildRing();
applyI18n();
