"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Users, UserPlus, UserCheck, Mail } from "lucide-react"
import Loading from "./loading"

const customers = [
  { id: 1, name: "Sarah Johnson", email: "sarah.johnson@email.com", orders: 24, spent: "$4,250.00", status: "Active", joined: "Jan 2024" },
  { id: 2, name: "Michael Chen", email: "m.chen@email.com", orders: 18, spent: "$3,120.50", status: "Active", joined: "Feb 2024" },
  { id: 3, name: "Emma Wilson", email: "emma.w@email.com", orders: 32, spent: "$6,840.00", status: "VIP", joined: "Nov 2023" },
  { id: 4, name: "James Brown", email: "james.brown@email.com", orders: 8, spent: "$890.25", status: "Active", joined: "Mar 2024" },
  { id: 5, name: "Lisa Anderson", email: "lisa.a@email.com", orders: 45, spent: "$9,312.80", status: "VIP", joined: "Aug 2023" },
  { id: 6, name: "David Martinez", email: "d.martinez@email.com", orders: 12, spent: "$1,560.00", status: "Active", joined: "Dec 2023" },
  { id: 7, name: "Jennifer Lee", email: "j.lee@email.com", orders: 3, spent: "$245.00", status: "New", joined: "Apr 2024" },
  { id: 8, name: "Robert Taylor", email: "r.taylor@email.com", orders: 0, spent: "$0.00", status: "Inactive", joined: "Jan 2024" },
]

const customerSegments = [
  { name: "VIP Customers", count: 234, percentage: 5.5, color: "bg-amber-500" },
  { name: "Active Customers", count: 2845, percentage: 66.8, color: "bg-[var(--color-accent)]" },
  { name: "New Customers", count: 892, percentage: 20.9, color: "bg-blue-500" },
  { name: "Inactive Customers", count: 292, percentage: 6.8, color: "bg-gray-400" },
]

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const searchParams = useSearchParams()

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VIP":
        return "bg-amber-100 text-amber-800"
      case "Active":
        return "bg-green-100 text-green-800"
      case "New":
        return "bg-blue-100 text-blue-800"
      case "Inactive":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Suspense fallback={<Loading />}>
      <>
        <PageHeader
          title="Customers"
          description="Manage and view your customer base."
        >
          <Button className="flex items-center gap-2 bg-foreground text-background hover:bg-foreground/90">
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </PageHeader>

        {/* Customer Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card border border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Customers</span>
                <div className="p-2 bg-muted rounded-lg">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-3xl font-semibold">4,263</p>
              <p className="text-xs text-[var(--color-positive)] mt-1">+1.8% WoW</p>
            </CardContent>
          </Card>
          <Card className="bg-card border border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">New This Month</span>
                <div className="p-2 bg-muted rounded-lg">
                  <UserPlus className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-3xl font-semibold">342</p>
              <p className="text-xs text-[var(--color-positive)] mt-1">+12.4% vs last month</p>
            </CardContent>
          </Card>
          <Card className="bg-card border border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Returning Customers</span>
                <div className="p-2 bg-muted rounded-lg">
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-3xl font-semibold">68.5%</p>
              <p className="text-xs text-[var(--color-positive)] mt-1">+2.1% vs last month</p>
            </CardContent>
          </Card>
          <Card className="bg-card border border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Avg. Lifetime Value</span>
                <div className="p-2 bg-muted rounded-lg">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-3xl font-semibold">$847</p>
              <p className="text-xs text-[var(--color-positive)] mt-1">+5.8% vs last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Customer Segments & List */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Segments */}
          <Card className="bg-card border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Customer Segments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customerSegments.map((segment) => (
                  <div key={segment.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{segment.name}</span>
                      <span className="text-sm font-medium">{segment.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${segment.color}`}
                        style={{ width: `${segment.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{segment.percentage}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customer List */}
          <Card className="lg:col-span-3 bg-card border border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">All Customers</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
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
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Customer</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Orders</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Total Spent</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback>{customer.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">{customer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="secondary" className={getStatusColor(customer.status)}>
                            {customer.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-sm text-right">{customer.orders}</td>
                        <td className="py-3 px-2 text-sm text-right font-medium">{customer.spent}</td>
                        <td className="py-3 px-2 text-sm text-right text-muted-foreground">{customer.joined}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    </Suspense>
  )
}
