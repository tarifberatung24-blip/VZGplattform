"use client"

import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Download, 
  FileText, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

const revenueComparisonData = [
  { month: "Jan", thisYear: 42000, lastYear: 35000 },
  { month: "Feb", thisYear: 38000, lastYear: 32000 },
  { month: "Mar", thisYear: 45000, lastYear: 38000 },
  { month: "Apr", thisYear: 52000, lastYear: 42000 },
  { month: "May", thisYear: 61000, lastYear: 48000 },
  { month: "Jun", thisYear: 58000, lastYear: 52000 },
]

const salesByCategory = [
  { name: "Electronics", value: 42, color: "#B4D4A5" },
  { name: "Footwear", value: 28, color: "#3D3D3D" },
  { name: "Accessories", value: 18, color: "#6B7280" },
  { name: "Apparel", value: 12, color: "#D1D5DB" },
]

const availableReports = [
  { 
    name: "Monthly Sales Report", 
    description: "Complete breakdown of sales by product, region, and channel",
    date: "Generated Jan 15, 2026",
    size: "2.4 MB"
  },
  { 
    name: "Customer Analytics Report", 
    description: "Customer acquisition, retention, and lifetime value metrics",
    date: "Generated Jan 14, 2026",
    size: "1.8 MB"
  },
  { 
    name: "Inventory Status Report", 
    description: "Stock levels, reorder alerts, and inventory turnover",
    date: "Generated Jan 13, 2026",
    size: "956 KB"
  },
  { 
    name: "Financial Summary Q4", 
    description: "Revenue, expenses, profit margins, and cash flow",
    date: "Generated Jan 10, 2026",
    size: "3.1 MB"
  },
]

const performanceMetrics = [
  { label: "Conversion Rate", value: "3.24%", change: "+0.5%", isPositive: true },
  { label: "Avg Order Value", value: "$127.50", change: "+$12.30", isPositive: true },
  { label: "Cart Abandonment", value: "68.2%", change: "-2.1%", isPositive: true },
  { label: "Return Rate", value: "4.8%", change: "+0.3%", isPositive: false },
]

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate, view, and download detailed analytics reports."
      >
        <Button variant="outline" className="flex items-center gap-2 bg-transparent text-sm">
          <Calendar className="w-4 h-4" />
          Jan 2026
        </Button>
        <Button className="flex items-center gap-2 bg-foreground text-background hover:bg-foreground/90">
          <FileText className="w-4 h-4" />
          Generate Report
        </Button>
      </PageHeader>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {performanceMetrics.map((metric) => (
          <Card key={metric.label} className="bg-card border border-border">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-semibold">{metric.value}</p>
                <span className={`text-xs font-medium flex items-center gap-0.5 ${
                  metric.isPositive ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"
                }`}>
                  {metric.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {metric.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue Comparison Chart */}
        <Card className="lg:col-span-2 bg-card border border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Revenue Comparison
                </CardTitle>
                <CardDescription>This year vs last year</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--color-accent)]" />
                  <span className="text-muted-foreground">2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted" />
                  <span className="text-muted-foreground">2025</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                    contentStyle={{ 
                      backgroundColor: "white", 
                      border: "1px solid #E5E5E5",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="lastYear" 
                    stroke="#D1D5DB" 
                    fill="#F3F4F6" 
                    strokeWidth={2}
                    name="2025"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="thisYear" 
                    stroke="#B4D4A5" 
                    fill="#B4D4A5" 
                    fillOpacity={0.3}
                    strokeWidth={2}
                    name="2026"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card className="bg-card border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Sales by Category
            </CardTitle>
            <CardDescription>Distribution of revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={salesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {salesByCategory.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, ""]}
                    contentStyle={{ 
                      backgroundColor: "white", 
                      border: "1px solid #E5E5E5",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {salesByCategory.map((cat) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs text-muted-foreground">{cat.name}</span>
                  <span className="text-xs font-medium ml-auto">{cat.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Reports */}
      <Card className="bg-card border border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium">Available Reports</CardTitle>
              <CardDescription>Download or schedule automated reports</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="bg-transparent">
              View All Reports
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {availableReports.map((report) => (
              <div 
                key={report.name} 
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{report.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {report.date}
                      </span>
                      <span className="text-xs text-muted-foreground">{report.size}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="bg-transparent flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
