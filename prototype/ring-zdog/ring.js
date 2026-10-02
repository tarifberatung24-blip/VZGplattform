/* HORIZON 3D ring — Zdog.
   Zdog is a pseudo-3D engine: geometry lives in 3D space but is drawn as flat
   vector shapes. A torus is a ring of circles, which is exactly the look in the
   reference. Each segment is its own Zdog Shape so it can be coloured and
   labelled independently.

   Labels are HTML overlay chips rather than canvas text. Canvas text cannot be
   selected, cannot be styled by the theme, and would not be picked up by a
   screen reader — as HTML they inherit all three for free.

   The ring turns. Because the chips are HTML and the segments are canvas, the
   chips are re-projected from Zdog's own transforms every frame; placed once at
   build time they would slide off their segments as soon as the ring moved. */

const RING_LABELS = 6;

/* Tunable geometry. Overridable via window.RING_TUNING so the tilt and depth
   can be dialled in from a console without editing this file. */
function tuning() {
  return Object.assign(
    { tilt: 0.14, roll: 0.05, depth: 55, layers: 14, radius: 70, stroke: 34, gap: 0.045 },
    window.RING_TUNING || {}
  );
}

/* Darken a hex colour. Used for the extrusion's lower layers so the wall reads
   as shaded rather than a flat slab of the same tone. */
function shade(hex, f) {
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

/* ---------- Zdog scene ---------- */

let illo = null;
let ringGroup = null;
let anchors = [];      // one anchor per segment, for label projection
let chipEls = [];
let drag = null;       // { x, spin, moved } while the pointer is down
let spin = -Zdog.TAU * 0.12;

function ringColors() {
  const css = getComputedStyle(document.body);
  return [0, 1, 2].map((i) => css.getPropertyValue(`--ring-${i}`).trim());
}

function buildRing() {
  const T = tuning();
  const canvas = document.getElementById("ring");
  const seg = ringColors();
  const box = canvas.parentElement.getBoundingClientRect();
  const size = Math.max(260, Math.min(box.width, box.height || box.width));

  canvas.width = size;
  canvas.height = size;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";

  illo = new Zdog.Illustration({
    element: canvas,
    zoom: size / 320,
    resize: false,
  });

  // Everything lives in one group so a single rotation spins the whole ring.
  ringGroup = new Zdog.Group({ addTo: illo });

  const STEPS = 18;
  anchors = [];

  for (let i = 0; i < RING_LABELS; i++) {
    const a0 = (i / RING_LABELS) * Zdog.TAU + T.gap / 2;
    const a1 = ((i + 1) / RING_LABELS) * Zdog.TAU - T.gap / 2;

    // Each segment is a polyline along its arc. Zdog's `arc` command needs a
    // corner point *and* a following end point, and treats the first path
    // command as a move — feeding it a single arc point silently draws nothing.
    const path = [];
    for (let s = 0; s <= STEPS; s++) {
      const a = a0 + ((a1 - a0) * s) / STEPS;
      path.push({ x: T.radius * Math.cos(a), y: T.radius * Math.sin(a) });
    }

    // Zdog has no extruded geometry, so thickness is a stack of the same path
    // stepped along z. Zdog depth-sorts the stack, so the edges read as a solid
    // wall. Lower layers are darkened to stand in for the shading a real
    // extrusion would get.
    for (let L = 0; L < T.layers; L++) {
      const t = L / (T.layers - 1);
      new Zdog.Shape({
        addTo: ringGroup,
        path,
        closed: false,
        stroke: T.stroke,
        color: shade(seg[i % 3], 0.45 + 0.55 * t),
        translate: { z: -T.depth / 2 + T.depth * t },
      });
    }

    // A marker at the segment's midpoint. It draws nothing; it exists only so
    // the label chip can be projected from a real 3D position.
    const mid = (a0 + a1) / 2;
    anchors.push(
      new Zdog.Anchor({
        addTo: ringGroup,
        translate: {
          x: (T.radius + T.stroke * 0.45) * Math.cos(mid),
          y: (T.radius + T.stroke * 0.45) * Math.sin(mid),
          z: T.depth / 2,
        },
      })
    );
  }

  illo.rotate.x = -Zdog.TAU * T.tilt;
  illo.rotate.z = -Zdog.TAU * T.roll;
  illo.rotate.y = spin;

  illo.updateRenderGraph();
  syncChips();
}

/* ---------- HTML labels, re-projected every frame ---------- */

function makeChips() {
  const host = document.getElementById("ringLabels");
  host.innerHTML = "";
  chipEls = [];
  for (let i = 0; i < RING_LABELS; i++) {
    const el = document.createElement("span");
    el.className = "chip";
    el.dataset.i18n = `ring.${i}`;
    host.appendChild(el);
    chipEls.push(el);
  }
}

function syncChips() {
  if (!illo || !anchors.length) return;
  const rect = illo.element.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  for (let i = 0; i < anchors.length; i++) {
    const p = anchors[i].renderOrigin; // 3D position after all transforms
    const el = chipEls[i];
    if (!p || !el) continue;
    el.style.left = cx + p.x + "px";
    el.style.top = cy + p.y + "px";
    // Segments that swing behind the ring fade back, which reads as depth
    // rather than as a flat overlay.
    const t = Math.max(0, Math.min(1, (p.z + 140) / 280));
    el.style.opacity = (0.4 + t * 0.6).toFixed(2);
  }
}

/* ---------- animation ---------- */

function animate() {
  if (!illo) return;
  if (!state.paused && !drag) spin += 0.0035;
  if (drag) spin = drag.spin;
  illo.rotate.y = spin;
  illo.updateRenderGraph();
  syncChips();
  requestAnimationFrame(animate);
}

/* ---------- pointer: drag to spin, click to pause ---------- */

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
    drag.spin = spin + dx * 0.012;
  });

  const end = () => {
    if (drag && !drag.moved) {
      // A press that did not drag toggles pause, so the ring can be stopped
      // without hunting for a separate control.
      state.paused = !state.paused;
      canvas.classList.toggle("is-paused", state.paused);
    }
    if (drag) spin = drag.spin;
    drag = null;
    canvas.classList.remove("is-dragging");
  };

  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);

  // Hovering holds the ring still so a label can be read without chasing it.
  canvas.addEventListener("pointerenter", () => {
    if (!drag) state.paused = true;
  });
  canvas.addEventListener("pointerleave", () => {
    if (!drag) state.paused = false;
  });
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
  // The ring's own labels are part of the translation, so the scene is rebuilt.
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

// Respect a reduced-motion preference: no auto-spin, but drag still works.
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  state.paused = true;
}

makeChips();
applyI18n();
renderPillars();
buildRing();
applyI18n();
attachPointer(document.getElementById("ring"));
animate();
