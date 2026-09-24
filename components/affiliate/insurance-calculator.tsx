"use client"

import { useState } from "react"
import { ArrowRight, CircleAlert, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export type InsuranceCalculatorField = {
  id: string
  label: string
  type: "text" | "number" | "select"
  options?: string[]
  placeholder?: string
  hint?: string
}

export type InsuranceCalculatorCopy = {
  title: string
  intro: string
  summaryTitle: string
  summaryEmpty: string
  limits: string
  privacy: string
  cta: string
  unavailable: string
}

const inputClassName =
  "h-9 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-foreground"

/**
 * Input preparation helper for the affiliate journey. It collects only what the
 * user chooses to type, keeps it in component state, and never sends or stores
 * it. It does not calculate a price or decide acceptance; the partner does.
 */
export function InsuranceCalculator({
  offerId,
  fields,
  copy,
  isOffered,
  configuredCta,
}: {
  offerId: string
  fields: InsuranceCalculatorField[]
  copy: InsuranceCalculatorCopy
  isOffered: boolean
  configuredCta?: string
}) {
  const [values, setValues] = useState<Record<string, string>>({})

  const setValue = (id: string, value: string) => {
    setValues((current) => {
      if (value !== "") return { ...current, [id]: value }
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  const entered = fields.flatMap((field) => {
    const value = values[field.id]
    return value ? [{ id: field.id, label: field.label, value }] : []
  })

  return (
    <section className="border border-border bg-card p-6 sm:p-8" aria-labelledby={`calculator-${offerId}`}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center border border-border text-primary">
          <ClipboardList className="size-5" />
        </span>
        <div>
          <h2 id={`calculator-${offerId}`} className="text-xl font-black tracking-[-0.03em] text-foreground">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{copy.intro}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.id} className="flex flex-col gap-2">
            <Label htmlFor={`${offerId}-${field.id}`}>{field.label}</Label>
            {field.type === "select" ? (
              <select
                id={`${offerId}-${field.id}`}
                className={cn(inputClassName, "appearance-none")}
                value={values[field.id] ?? ""}
                onChange={(event) => setValue(field.id, event.target.value)}
              >
                <option value="" />
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={`${offerId}-${field.id}`}
                type={field.type}
                inputMode={field.type === "number" ? "numeric" : undefined}
                placeholder={field.placeholder}
                value={values[field.id] ?? ""}
                onChange={(event) => setValue(field.id, event.target.value)}
              />
            )}
            {field.hint && <p className="text-xs leading-5 text-muted-foreground">{field.hint}</p>}
          </div>
        ))}
      </div>

      <div className="mt-8 border border-border bg-background p-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {copy.summaryTitle}
        </h3>
        {entered.length === 0 ? (
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.summaryEmpty}</p>
        ) : (
          <dl className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {entered.map((item) => (
              <div key={item.id} className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="text-sm font-medium text-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {isOffered ? (
          <Button asChild size="lg">
            <a href={`/go/${offerId}`} rel="sponsored noopener">
              {configuredCta ?? copy.cta}
              <ArrowRight data-icon="inline-end" />
            </a>
          </Button>
        ) : (
          <p className="max-w-xl text-sm leading-7 text-muted-foreground">{copy.unavailable}</p>
        )}
      </div>

      <div className="mt-6 flex items-start gap-3 border-l-2 border-border pl-4">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-col gap-2">
          <p className="text-xs leading-6 text-muted-foreground">{copy.limits}</p>
          <p className="text-xs leading-6 text-muted-foreground">{copy.privacy}</p>
        </div>
      </div>
    </section>
  )
}
