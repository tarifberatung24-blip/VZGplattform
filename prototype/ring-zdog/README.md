# HORIZON — 3D circular block chain

Standalone page for reviewing the hero graphic, with the language and theme
switches wired up.

```bash
cd prototype/ring-zdog && python3 -m http.server 12001
```

## What this is

Blocks linked into a chain, arranged around a circle, seen in 3D. Six blocks
carrying the six platform areas, joined by six links with packets travelling
between them. The ring stands upright and turns, so the links always read as a
chain and never collapse into a row of boxes.

## Why plain canvas

The blocks, their faces, and the packets all need per-frame control, which a
retained 3D scene graph fights. The projection is a few lines of trigonometry
and there is no dependency.

## How the 3D works

A block is eight corners in its own local space. The ring position, the upright
lean, and the spin are all applied at projection time, so one set of corner data
serves every block and every frame.

Two things make it read as 3D rather than as flat shapes:

- **Lean.** The ring tilts back about X, so a circle of blocks still reads as a
  circle under perspective instead of as a line.
- **Perspective.** Near blocks are drawn up to 32% larger than far ones. The
  first version used a weak factor and the result looked flat — the depth spread
  was only 11%, which the eye reads as a flat ring.

Every face and every link is collected into one list with a depth value and
sorted before painting, so the whole scene draws back to front in a single pass.
Back faces are drawn dim rather than culled, so a block still reads as a solid
object when it turns edge-on.

## What is inside a block

A stack of bars whose height is the block's fill level, plus a hash strip along
the bottom. Enough to read as data without being busy. The fill level drifts
between targets over time, so the chain looks like it is confirming rather than
sitting still.

## Theme

Colour comes from the site's `--thread-*` tokens, the same ones the Layer 0
background layer uses: blue on white, orange on black. The tokens are cached
rather than read from `getComputedStyle` every frame, which would force a style
recalc at 60fps.

## Motion

Slow rotation, drag to turn it, hover to hold it still so a label can be read,
click to pause. `prefers-reduced-motion: reduce` starts it paused.

Labels are projected from each block's own centre, so they follow the chain as
it turns and dim with depth instead of sitting on a fixed ring.
