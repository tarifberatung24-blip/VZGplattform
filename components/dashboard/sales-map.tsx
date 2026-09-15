"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

const countryData = [
  { country: "United States", value: 1245680, color: "#3b82f6" },
  { country: "Brazil", value: 684320, color: "#22c55e" },
  { country: "Finland", value: 312450, color: "#8b5cf6" },
  { country: "Bangladesh", value: 158970, color: "#f97316" },
]

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof countryData[0] }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-card px-3 py-2 rounded-lg shadow-lg text-xs font-medium border border-border">
        <p className="font-semibold">{data.country}</p>
        <p style={{ color: data.color }}>${data.value.toLocaleString()}</p>
      </div>
    )
  }
  return null
}

export function SalesMap() {
  const total = countryData.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-medium">Sales by Countries</CardTitle>
          <p className="text-xs text-muted-foreground">Revenue distribution by region</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
            All Products <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent">
            Top Countries <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Stats panel */}
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Top Performing Country</p>
              <p className="text-2xl font-semibold">$1,245,680</p>
              <p className="text-xs text-muted-foreground">United States</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Revenue Growth</p>
              <p className="text-2xl font-semibold text-[var(--color-positive)]">+34%</p>
              <p className="text-xs text-muted-foreground">United States and Canada</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-semibold">${total.toLocaleString()}</p>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="flex flex-col">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={countryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {countryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {countryData.map((item) => (
                <div key={item.country} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground truncate">{item.country}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
