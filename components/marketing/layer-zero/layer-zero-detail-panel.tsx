"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
import { LAYER_ZERO_MODULES, type LayerZeroModuleId } from "./layer-zero-data"

type PanelCopy = {
  title: string
  description: string
  features: { title: string; detail: string }[]
  cta: string
  unavailable: string
}

/**
 * The detail sheet below the orbit. One reusable component fed by the selected
 * capability's copy, so nine capabilities do not become nine bespoke panels.
 */
export function LayerZeroDetailPanel({
  active,
  copy,
}: {
  active: LayerZeroModuleId
  copy: Record<LayerZeroModuleId, PanelCopy>
}) {
  const { locale } = useLanguage()
  const mod = LAYER_ZERO_MODULES.find((m) => m.id === active)!
  const panel = copy[active]
  const Icon = mod.icon

  return (
    <section
      className="layer-zero-panel"
      aria-live="polite"
      aria-label={panel.title}
      key={active}
    >
      <span className="layer-zero-panel__handle" aria-hidden="true" />

      <div className="layer-zero-panel__head">
        <span className="layer-zero-panel__icon" aria-hidden="true">
          <Icon className="size-5" />
        </span>
        <div>
          <h3 className="layer-zero-panel__title">{panel.title}</h3>
          <p className="layer-zero-panel__subtitle">{panel.description}</p>
        </div>
      </div>

      <ul className="layer-zero-panel__features">
        {panel.features.map((feature) => (
          <li key={feature.title} className="layer-zero-panel__feature">
            <span className="layer-zero-panel__feature-title">{feature.title}</span>
            <span className="layer-zero-panel__feature-detail">{feature.detail}</span>
          </li>
        ))}
      </ul>

      {mod.route ? (
        <Link
          href={localizedPath(mod.route, locale)}
          className="layer-zero-panel__cta"
        >
          {panel.cta}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          className="layer-zero-panel__cta layer-zero-panel__cta--off"
          aria-disabled="true"
        >
          {panel.unavailable}
        </span>
      )}
    </section>
  )
}
