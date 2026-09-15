"use client"

import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Download, TrendingUp, DollarSign, ShoppingBag, CreditCard } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Line, LineChart } from "recharts"
import Image from "next/image"

const salesData = [
  { month: "Jan", sales: 32000, revenue: 42000 },
  { month: "Feb", sales: 28000, revenue: 38000 },
  { month: "Mar", sales: 45000, revenue: 55000 },
  { month: "Apr", sales: 52000, revenue: 62000 },
  { month: "May", sales: 73940, revenue: 87373 },
  { month: "Jun", sales: 58000, revenue: 68000 },
  { month: "Jul", sales: 42000, revenue: 52000 },
  { month: "Aug", sales: 48000, revenue: 58000 },
  { month: "Sep", sales: 55000, revenue: 65000 },
  { month: "Oct", sales: 62000, revenue: 72000 },
  { month: "Nov", sales: 68000, revenue: 78000 },
  { month: "Dec", sales: 75000, revenue: 85000 },
]

const topProducts = [
  { name: "Adidas Ultraboost 22", category: "Running Shoes", price: "$180", sales: 1243, image: "/adidas-ultraboost-running-shoe.jpg" },
  { name: "Samsung Galaxy Watch 6", category: "Smartwatch", price: "$299", sales: 892, image: "/samsung-galaxy-watch-smartwatch.jpg" },
  { name: "Sony WH-1000XM5", category: "Noise-Canceling Headphones", price: "$399", sales: 756, image: "/sony-wh1000xm5-headphones.jpg" },
  { name: "Apple AirPods Pro", category: "Wireless Earbuds", price: "$249", sales: 634, image: "/apple-airpods-pro-earbuds.jpg" },
]

const salesByChannel = [
  { channel: "Direct Website", sales: 45200, percentage: 38 },
  { channel: "Amazon", sales: 35800, percentage: 30 },
  { channel: "Shopify", sales: 24500, percentage: 20 },
  { channel: "Retail Partners", sales: 14500, percentage: 12 },
]

export default function SalesPage() {
  return (
    <>
      <PageHeader
        title="Sales Analytics"
        description="Track your sales performance and product metrics."
      >
        <Button variant="outline" className="flex items-center gap-2 bg-transparent text-sm">
          <Calendar className="w-4 h-4" />
          This Year
        </Button>
        <Button variant="outline" className="flex items-center gap-2 bg-transparent">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </PageHeader>

      {/* Sales Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-card border border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Sales</span>
              <div className="p-2 bg-muted rounded-lg">
                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-3xl font-semibold">$658,940</p>
            <p className="text-xs text-[var(--color-positive)] mt-1">+12.5% vs last year</p>
          </CardContent>
        </Card>
        <Card className="bg-card border border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Average Order Value</span>
              <div className="p-2 bg-muted rounded-lg">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-3xl font-semibold">$127.45</p>
            <p className="text-xs text-[var(--color-positive)] mt-1">+5.2% vs last year</p>
          </CardContent>
        </Card>
        <Card className="bg-card border border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Conversion Rate</span>
              <div className="p-2 bg-muted rounded-lg">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-3xl font-semibold">3.24%</p>
            <p className="text-xs text-[var(--color-positive)] mt-1">+0.8% vs last year</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 bg-card border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Sales & Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e5e5", borderRadius: "8px" }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                  />
                  <Bar dataKey="sales" fill="#B4D4A5" radius={[4, 4, 0, 0]} name="Sales" />
                  <Bar dataKey="revenue" fill="#F97316" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Channel */}
        <Card className="bg-card border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Sales by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesByChannel.map((item) => (
                <div key={item.channel}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{item.channel}</span>
                    <span className="text-sm font-medium">{item.percentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-accent)] rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">${item.sales.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card className="bg-card border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Product</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Category</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Price</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Sales</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product) => (
                  <tr key={product.name} className="border-b border-border last:border-0">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted">
                          <Image src={product.image || "/placeholder.svg"} alt={product.name} width={40} height={40} className="object-cover" />
                        </div>
                        <span className="text-sm font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">{product.category}</td>
                    <td className="py-3 px-2 text-sm text-right">{product.price}</td>
                    <td className="py-3 px-2 text-sm text-right">{product.sales.toLocaleString()}</td>
                    <td className="py-3 px-2 text-sm text-right font-medium">
                      ${(product.sales * Number.parseFloat(product.price.replace("$", ""))).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
