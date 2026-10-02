# Ring prototype — Zdog

Standalone page for reviewing the 3D ring against the reference image, with the
language and theme switches wired up.

Serve the folder and open it:

```bash
cd prototype/ring-zdog && python3 -m http.server 12001
```

## Where the template came from

The ring is built with **[Zdog](https://github.com/metafizzy/zdog)** — a
pseudo-3D engine for canvas and SVG, 10.6k stars, MIT. Its own documentation
describes the technique as "toruses are actually circles", which is exactly the
look in the reference: geometry in 3D space, drawn as flat vector shapes. The
library is vendored here as `zdog.dist.min.js` (v1.1.3, 29KB) so the page has no
CDN dependency.

The general approach to segmented rings follows the standard
`stroke-dasharray` / arc-segment technique used by most SVG donut charts. The
3D tilt and extrusion are ours.

## How the ring is built

- Six segments, each a polyline along its arc, stroked with a round join. That
  gives the pill-shaped segments in the reference rather than hard-cut wedges.
- Thickness is a stack of 14 copies of each segment stepped along z, with the
  lower layers darkened. Zdog depth-sorts the stack so the edges read as a wall.
  A single flat copy looks like a sticker.
- The tilt lives on the illustration, so the extrusion is foreshortened by the
  same transform as the faces.

## Motion

The ring turns continuously and can be dragged to spin. Hovering holds it still
so a label can be read without chasing it, and a click toggles pause.

`prefers-reduced-motion: reduce` starts it paused — drag still works, but nothing
moves on its own.

Because the chips are HTML and the segments are canvas, the chips are
re-projected from Zdog's own transforms every frame. Placed once at build time
they slid off their segments the moment the ring moved; that is the bug this
avoids.

## i18n

Every visible string, **including the ring's own six labels**, lives in
`i18n.js`. Switching language rebuilds the whole scene, so the labels translate
with the page rather than staying in the original language.

Labels are drawn as HTML chips over the canvas, not into it. Canvas text cannot
be selected, cannot be styled by the theme, and is not exposed to a screen
reader — as HTML they get all three for free.

## Tuning

Geometry is overridable at runtime, so the tilt and depth can be dialled in
without editing the file:

```js
window.RING_TUNING = { tilt: 0.14, depth: 55, layers: 14 };
buildRing();
```

`depth` below ~40 collapses the extrusion to a single flat layer — that was the
difference between a sticker and a solid ring.
