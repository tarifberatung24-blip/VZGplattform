"use client"

import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import {
  ChartContainer,
  ChartConfig,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/i18n/language-context"
import { groupContractsByCategory, type ContractLike } from "@/lib/dashboard/contracts-data"

/** Cap the bar so a single category never renders as one full-width block. */
const MAX_BAR_SIZE = 48

export function ContractsChart({ contracts }: { contracts: ContractLike[] }) {
  const { locale } = useLanguage()
  const de = locale === "de"

  // The tooltip renders `config[key].label`, so the labels are built per locale instead of using
  // one hardcoded language.
  const config = useMemo(
    () => ({ amount: { label: de ? "Betrag" : "Сума", color: "var(--chart-1)" } }) satisfies ChartConfig,
    [de],
  )

  // The previous expression `c.category || de ? "Sonstige" : "Различни"` evaluated
  // `(c.category || de)` as the condition, so every real category collapsed into one fallback
  // bar. Grouping by the actual category is handled by groupContractsByCategory.
  const data = useMemo(() => groupContractsByCategory(contracts, locale), [contracts, locale])

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight">
          {de ? "Monatliche Kosten nach Kategorie" : "Месечни разходи по категория"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="flex h-[300px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
            {de
              ? "Noch keine Beträge erfasst. Kategorien erscheinen, sobald Verträge Beträge haben."
              : "Още няма въведени суми. Категориите се показват, когато договорите имат суми."}
          </p>
        ) : (
          <ChartContainer config={config} className="h-[300px] w-full">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -10 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis
                dataKey="category"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) => `${v} €`}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="amount"
                fill="var(--color-amount)"
                radius={[4, 4, 0, 0]}
                maxBarSize={MAX_BAR_SIZE}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
