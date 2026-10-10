"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { isKintexWorkspacePath, isSelfChromedPath } from "@/lib/kintex-navigation"

/**
 * Living smoke behind the public pages.
 *
 * A single WebGL fragment shader draws slow, domain-warped noise that drifts
 * like fog. The colour is read from the active theme's --thread-core token, so
 * the smoke is blue on the light theme and orange on the dark one, and it
 * follows a theme switch without a reload.
 *
 * Kept cheap on purpose: rendered at reduced resolution, capped at ~30 fps,
 * paused while the tab is hidden, drawn once and frozen under
 * prefers-reduced-motion, and skipped entirely inside the signed-in workspace.
 * Without WebGL the layer renders nothing and the page looks as before.
 */

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAGMENT = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_color;
uniform float u_strength;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = r * p * 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv * vec2(u_res.x / u_res.y, 1.0) * 1.6;
  float t = u_time * 0.035;

  // Two levels of domain warping give the curling, rising look of smoke.
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + 0.6 * t), fbm(p + 3.0 * q + vec2(8.3, 2.8) - 0.4 * t));
  float f = fbm(p + 3.2 * r);

  // Denser towards the lower part of the screen, thinning out at the top.
  float shape = smoothstep(0.35, 0.95, f) * (0.55 + 0.45 * (1.0 - uv.y));
  float alpha = clamp(shape * u_strength, 0.0, 1.0);
  gl_FragColor = vec4(u_color * alpha, alpha);
}
`

function readThemeColor(): [number, number, number] {
  const probe = document.createElement("span")
  probe.style.color = "var(--thread-core)"
  probe.style.display = "none"
  document.body.appendChild(probe)
  const rgb = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g)?.map(Number) ?? [0, 63, 136]
  probe.remove()
  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255]
}

function isDarkTheme() {
  return document.documentElement.classList.contains("dark")
}

export function SmokeLayer() {
  const pathname = usePathname() ?? "/"
  const hidden = isKintexWorkspacePath(pathname) || isSelfChromedPath(pathname)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (hidden) return
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false })
    if (!gl) return

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null
    }
    const vs = compile(gl.VERTEX_SHADER, VERTEX)
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT)
    const program = gl.createProgram()
    if (!vs || !fs || !program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, "a_pos")
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, "u_res")
    const uTime = gl.getUniformLocation(program, "u_time")
    const uColor = gl.getUniformLocation(program, "u_color")
    const uStrength = gl.getUniformLocation(program, "u_strength")

    const applyTheme = () => {
      gl.uniform3fv(uColor, readThemeColor())
      // Orange smoke on black needs a little more body to read as smoke.
      gl.uniform1f(uStrength, isDarkTheme() ? 0.55 : 0.32)
    }

    const scale = 0.5
    const resize = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth * scale))
      canvas.height = Math.max(1, Math.floor(window.innerHeight * scale))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uRes, canvas.width, canvas.height)
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const start = performance.now()
    let frame = 0
    let last = 0

    const draw = (now: number) => {
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform1f(uTime, reduceMotion ? 12 : (now - start) / 1000)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop)
      if (document.hidden || now - last < 33) return
      last = now
      draw(now)
    }

    resize()
    applyTheme()
    if (reduceMotion) draw(start)
    else frame = requestAnimationFrame(loop)

    const themeObserver = new MutationObserver(() => {
      applyTheme()
      if (reduceMotion) draw(start)
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] })
    const onResize = () => {
      resize()
      if (reduceMotion) draw(start)
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(frame)
      themeObserver.disconnect()
      window.removeEventListener("resize", onResize)
      // No loseContext() here: React may re-run this effect on the same canvas
      // (Strict Mode), and a lost context would leave the canvas blank white.
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
    }
  }, [hidden])

  if (hidden) return null
  return <canvas ref={canvasRef} className="smoke-layer" aria-hidden="true" />
}
