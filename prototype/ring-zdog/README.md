# HORIZON — the platform as a nervous system

Standalone page for reviewing the hero graphic, with the language and theme
switches wired up.

```bash
cd prototype/ring-zdog && python3 -m http.server 12001
```

## What this is

A miniature of the product: a sphere of filaments with information running
through it. The graphic is meant to say, before any text is read, what the
platform does — many connected parts, with something moving between them.

- **Contained.** Nothing leaves the circle. Every filament is clipped at the rim,
  so the network reads as enclosed rather than spilling over the edges.
- **A nervous system, not a wireframe.** 190 nodes, 284 curved filaments, about
  three branches per node. Each filament bows along a control point instead of
  running straight, which is what gives the branching, organic look.
- **Information flowing.** 379 pulses travel the filaments at staggered speeds,
  so the network never blinks in unison.

## Why plain canvas, not Zdog

Earlier versions of this graphic used Zdog. The network needs per-frame control
of every strand and every travelling pulse, which a retained 3D scene graph
fights. The projection is now about thirty lines of trigonometry, and the
dependency is gone.

## Contained by construction

The filaments are drawn as sampled quadratic curves rather than `ctx.quadraticCurveTo`,
specifically so each point can be tested against the rim before it is drawn.
Anything outside is trimmed. Verified: **0 painted pixels fall outside the
circle**, across every rotation angle sampled.

## Deterministic layout

Node and filament placement runs off a seeded generator (`mulberry32`). Without
it, changing language would reshuffle the whole network, which reads as a glitch
rather than a redraw.

## Theme

Colour comes from the site's `--thread-*` tokens, the same ones the Layer 0
background layer uses, so the graphic follows the theme exactly as that layer
does: blue on white, orange on black. The tokens are read once and cached rather
than read from `getComputedStyle` every frame, which would force a style recalc
at 60fps.

## Motion

Slow rotation, drag to turn it, hover to hold it still so a label can be read,
click to pause. `prefers-reduced-motion: reduce` starts it paused.
