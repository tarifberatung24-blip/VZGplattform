"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, ShoppingCart, Package, Truck, CheckCircle, Clock, XCircle } from "lucide-react"
import Loading from "./loading"

const orders = [
  { id: "ORD-7829", customer: "Sarah Johnson", email: "sarah.johnson@email.com", items: 3, total: "$245.00", status: "Completed", date: "Jan 15, 2024", payment: "Credit Card" },
  { id: "ORD-7828", customer: "Michael Chen", email: "m.chen@email.com", items: 2, total: "$189.50", status: "Processing", date: "Jan 15, 2024", payment: "PayPal" },
  { id: "ORD-7827", customer: "Emma Wilson", email: "emma.w@email.com", items: 5, total: "$432.00", status: "Shipped", date: "Jan 14, 2024", payment: "Credit Card" },
  { id: "ORD-7826", customer: "James Brown", email: "james.brown@email.com", items: 1, total: "$67.25", status: "Completed", date: "Jan 14, 2024", payment: "Debit Card" },
  { id: "ORD-7825", customer: "Lisa Anderson", email: "lisa.a@email.com", items: 4, total: "$312.80", status: "Pending", date: "Jan 13, 2024", payment: "Credit Card" },
  { id: "ORD-7824", customer: "David Martinez", email: "d.martinez@email.com", items: 2, total: "$156.00", status: "Shipped", date: "Jan 13, 2024", payment: "PayPal" },
  { id: "ORD-7823", customer: "Jennifer Lee", email: "j.lee@email.com", items: 1, total: "$89.99", status: "Cancelled", date: "Jan 12, 2024", payment: "Credit Card" },
  { id: "ORD-7822", customer: "Robert Taylor", email: "r.taylor@email.com", items: 6, total: "$567.00", status: "Completed", date: "Jan 12, 2024", payment: "Bank Transfer" },
]

const orderStats = [
  { label: "Total Orders", value: "12,485", change: "+3.1%", icon: ShoppingCart },
  { label: "Processing", value: "234", change: "+12", icon: Clock },
  { label: "Shipped", value: "1,892", change: "+45", icon: Truck },
  { label: "Completed", value: "10,124", change: "+2.8%", icon: CheckCircle },
]

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800"
      case "Processing":
        return "bg-blue-100 text-blue-800"
      case "Shipped":
        return "bg-purple-100 text-purple-800"
      case "Pending":
        return "bg-amber-100 text-amber-800"
      case "Cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="w-3 h-3" />
      case "Processing":
        return <Clock className="w-3 h-3" />
      case "Shipped":
        return <Truck className="w-3 h-3" />
      case "Pending":
        return <Package className="w-3 h-3" />
      case "Cancelled":
        return <XCircle className="w-3 h-3" />
      default:
        return null
    }
  }

  return (
    <Suspense fallback={<Loading />}>
      <>
        <PageHeader
          title="Orders"
          description="Track and manage customer orders."
        >
          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </PageHeader>

        {/* Order Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {orderStats.map((stat) => (
            <Card key={stat.label} className="bg-card border border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <div className="p-2 bg-muted rounded-lg">
                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-3xl font-semibold">{stat.value}</p>
                <p className="text-xs text-[var(--color-positive)] mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <Button
            variant={statusFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(null)}
            className={statusFilter === null ? "bg-foreground text-background" : "bg-transparent"}
          >
            All Orders
          </Button>
          {["Pending", "Processing", "Shipped", "Completed", "Cancelled"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status ? "bg-foreground text-background" : "bg-transparent"}
            >
              {status}
            </Button>
          ))}
        </div>

        {/* Orders Table */}
        <Card className="bg-card border border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">All Orders</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Order ID</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Customer</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Items</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Payment</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer">
                      <td className="py-3 px-2">
                        <span className="text-sm font-medium">{order.id}</span>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="text-sm font-medium">{order.customer}</p>
                          <p className="text-xs text-muted-foreground">{order.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">{order.date}</td>
                      <td className="py-3 px-2 text-sm text-center">{order.items}</td>
                      <td className="py-3 px-2 text-sm">{order.payment}</td>
                      <td className="py-3 px-2">
                        <Badge variant="secondary" className={`${getStatusColor(order.status)} flex items-center gap-1 w-fit`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-sm text-right font-medium">{order.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </>
    </Suspense>
  )
}
