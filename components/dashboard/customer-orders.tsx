"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { month: "May", orders: 1800 },
  { month: "Jun", orders: 1600 },
  { month: "Jul", orders: 1400 },
  { month: "Aug", orders: 2345 },
  { month: "Sep", orders: 1900 },
  { month: "Oct", orders: 1700 },
  { month: "Nov", orders: 2100 },
  { month: "Dec", orders: 2000 },
]

export function CustomerOrders() {
  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-medium">Customer Orders</CardTitle>
          <p className="text-xs text-muted-foreground">1 Jan - 12 Dec 2026</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-3xl font-semibold">45,6370</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-[var(--color-accent)]/30 text-foreground px-2 py-0.5 rounded-full">
              +9.4% ↗
            </span>
            <span className="text-xs text-muted-foreground">+245</span>
          </div>
        </div>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="orderGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#737373" }} />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [value.toLocaleString(), "Orders"]}
              />
              <Area type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={2} fill="url(#orderGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
