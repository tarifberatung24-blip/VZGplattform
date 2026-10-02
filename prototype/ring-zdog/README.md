# HORIZON — 3D circular block chain

Standalone page for reviewing the hero graphic, with the language and theme
switches wired up.

```bash
cd prototype/ring-zdog && python3 -m http.server 12001
```

## Design source

The visual language is taken from `components/marketing/horizon-3d-scene.tsx`,
the ring already on `/bg`. The blocks use the same palette (`--ring-0/1/2`), the
same dark wall offset for thickness (`--ring-wall`), the same light bevel along
the lit edge (`--ring-bevel`), and the same isometric tilt — `rotateX(58deg)
rotateZ(-18deg)` — so the two graphics read as one family rather than two
different illustrations.

Two details are copied deliberately from that component:

- Each face is stroked in **its own tone darkened**, not with one shared stroke.
  A single stroke cannot work: a white outline is invisible on the light segment.
- The wall is a **copy of the shape pushed down**, not a filter. A filter would
  be foreshortened along with the ring instead of sitting under it.

## Why canvas, not SVG

The site's ring is static, so SVG suits it. Here the blocks turn and the packets
travel, both of which need per-frame control. The design language is matched by
using the same tokens and the same lighting model, not by using the same
technology.

## Structure

Six blocks, one per platform area, joined by six links closing the circle. Each
link carries two packets, so information is visibly moving in both directions.

Inside each block: bars whose height is the fill level, plus a hash strip. The
fill drifts between targets, so the chain looks like it is confirming rather
than sitting still.

## Theme

Tokens are read from CSS custom properties and cached — reading
`getComputedStyle` every frame would force a style recalc at 60fps. The parser
understands both hex and `rgb()`, because the site's tokens are a mix of the two.

## Motion

Slow rotation, drag to turn it, hover to hold it still so a label can be read,
click to pause. `prefers-reduced-motion: reduce` starts it paused.

Labels are projected from each block's own centre, so they follow the chain and
dim with depth instead of sitting on a fixed ring.
