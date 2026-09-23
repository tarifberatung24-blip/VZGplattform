"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * One insurance product tile for the public hub. It only renders what the
 * registry and the caller state; it never invents a price, a rating or a
 * partnership. A product without an approved, configured partner is shown as
 * `planned` instead of being offered.
 */
export function InsuranceProductCard({
  title,
  description,
  icon,
  href,
  status,
  statusLabel,
  ctaLabel,
  details,
  footnote,
}: {
  title: string
  description: string
  icon: ReactNode
  href: string
  status: "active" | "planned"
  statusLabel: string
  ctaLabel: string
  details: string[]
  footnote: string
}) {
  const isActive = status === "active"
  return (
    <article className="flex flex-col border border-border bg-card p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center border border-border",
            isActive ? "text-primary" : "text-muted-foreground",
          )}
        >
          {icon}
        </span>
        <Badge variant={isActive ? "default" : "outline"} className="shrink-0">
          {!isActive && <Clock className="mr-1 size-3" aria-hidden="true" />}
          {statusLabel}
        </Badge>
      </div>

      <h3 className="mt-6 text-xl font-black tracking-[-0.03em] text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>

      <ul className="mt-6 flex flex-col gap-2">
        {details.map((detail) => (
          <li key={detail} className="flex gap-3 text-sm leading-6 text-foreground">
            <span aria-hidden="true" className="text-primary">
              ·
            </span>
            <span>{detail}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col gap-3">
        {isActive ? (
          <Button asChild size="lg">
            <Link href={href}>
              {ctaLabel}
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        ) : (
          <Button size="lg" variant="outline" disabled>
            {ctaLabel}
          </Button>
        )}
        <p className="text-xs leading-6 text-muted-foreground">{footnote}</p>
      </div>
    </article>
  )
}
