"use client"

import { useLanguage } from "@/lib/i18n/language-context"

/**
 * HORIZON 3D hero scene — prototype.
 *
 * Design language borrowed from the reference image: one large glossy sphere
 * with a single bright specular highlight and a lit rim, a slab tilted back in
 * perspective beside it, and a soft contact shadow grounding both. The sphere
 * is pure CSS — a stack of radial gradients on a circle, no WebGL and no new
 * dependency — so it stays crisp at any size and recolours with the theme.
 *
 * Depth here is decoration. The heading and the CTAs carry the meaning, and
 * they are rendered as plain HTML beside the scene rather than inside it, so
 * nothing important lives inside a transformed, perspective-clipped box.
 */
export function Horizon3DScene() {
  const { t } = useLanguage()

  return (
    <div className="horizon-scene" aria-hidden="true">
      <div className="horizon-scene__stage">
        <div className="horizon-scene__sphere" />
        <div className="horizon-scene__slab">
          {t.home.hero.pillars.map((pillar) => (
            <span key={pillar} className="horizon-scene__pillar">
              {pillar}
            </span>
          ))}
        </div>
      </div>
      <div className="horizon-scene__shadow" />
    </div>
  )
}
