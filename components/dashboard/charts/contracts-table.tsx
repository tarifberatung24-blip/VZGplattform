"use client"

import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
  flexRender,
} from "@tanstack/react-table"
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/lib/i18n/language-context"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

type Contract = {
  id: string
  title: string
  category: string
  provider_name: string | null
  monthly_amount: number | null
  status: string | null
  end_date: string | null
  review_status?: string | null
}

export function ContractsTable({ contracts }: { contracts: Contract[] }) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 6 })

  const columns = useMemo(() => [
    {
      accessorKey: "title",
      header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{de ? "Vertrag" : "Договор"}</span>,
      cell: ({ row }: { row: any }) => <span className="font-medium">{row.getValue("title")}</span>,
    },
    {
      accessorKey: "provider_name",
      header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{de ? "Anbieter" : "Доставчик"}</span>,
      cell: ({ row }: { row: any }) => <span className="text-muted-foreground">{row.getValue("provider_name") || (de ? "Nicht angegeben" : "Не е посочен")}</span>,
    },
    {
      accessorKey: "monthly_amount",
      header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{de ? "Monatlich" : "Месечно"}</span>,
      cell: ({ row }: { row: any }) => {
        const val = row.getValue("monthly_amount")
        return <span>{val == null ? (de ? "Keine Daten" : "Няма данни") : `${Number(val).toLocaleString("bg-BG", { style: "currency", currency: "EUR" })}`}</span>
      },
    },
    {
      accessorKey: "status",
      header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{de ? "Status" : "Статус"}</span>,
      cell: ({ row }: { row: any }) => {
        const status = row.getValue("status") as string
        return <span className="whitespace-nowrap rounded-md bg-primary/5 px-2 py-1 text-xs text-primary">{status === "confirmed" ? (de ? "Bestätigt" : "Потвърден") : (de ? "Prüfung" : "Преглед")}</span>
      },
    },
    {
      accessorKey: "end_date",
      header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{de ? "Ende" : "Край"}</span>,
      cell: ({ row }: { row: any }) => {
        const val = row.getValue("end_date") as string
        return <span className="text-muted-foreground">{val ? new Date(val).toLocaleDateString(de ? "de-DE" : "bg-BG", { day: "2-digit", month: "short" }) : (de ? "Keine Daten" : "Няма данни")}</span>
      },
    },
  ], [de])

  const table = useReactTable({
    data: contracts,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualFiltering: true,
    manualPagination: true,
    rowCount: contracts.length,
  })

  const filteredData = globalFilter
    ? contracts.filter((c) =>
        c.title.toLowerCase().includes(globalFilter.toLowerCase()) ||
        c.category.toLowerCase().includes(globalFilter.toLowerCase()) ||
        (c.provider_name?.toLowerCase().includes(globalFilter.toLowerCase()) ?? false)
      )
    : contracts

  const pageRows = useMemo(() => {
    const start = table.getState().pagination.pageIndex * table.getState().pagination.pageSize
    return filteredData.slice(start, start + table.getState().pagination.pageSize)
  }, [filteredData, table.getState().pagination])

  return (
    <div className="rounded-md border border-border bg-card shadow-none">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h3 className="text-lg font-semibold tracking-tight">
          {de ? "Deine erfassten Verträge" : "Записани ангажименти"}
        </h3>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 pl-9"
            placeholder={de ? "Verträge durchsuchen…" : "Търсене в договори…"}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <ShadcnTable>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="pb-3 font-medium px-4">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {pageRows.length > 0 ? pageRows.map((contract) => (
              <TableRow key={contract.id} className="border-b border-border/70 last:border-0">
                <td className="py-3 font-medium px-4">{contract.title}</td>
                <td className="py-3 px-4 text-muted-foreground">{contract.provider_name || (de ? "Nicht angegeben" : "Не е посочен")}</td>
                <td className="py-3 px-4">{contract.monthly_amount == null ? (de ? "Keine Daten" : "Няма данни") : `${contract.monthly_amount.toLocaleString("bg-BG", { style: "currency", currency: "EUR" })}`}</td>
                <td className="py-3 px-4"><span className="whitespace-nowrap rounded-md bg-primary/5 px-2 py-1 text-xs text-primary">{contract.review_status === "confirmed" ? (de ? "Bestätigt" : "Потвърден") : (de ? "Prüfung" : "Преглед")}</span></td>
                <td className="py-3 px-4 text-muted-foreground">{contract.end_date ? new Date(contract.end_date).toLocaleDateString(de ? "de-DE" : "bg-BG", { day: "2-digit", month: "short" }) : (de ? "Keine Daten" : "Няма данни")}</td>
              </TableRow>
            )) : (
              <TableRow><td colSpan={5} className="py-8 text-center text-muted-foreground">{de ? "Keine Verträge gefunden." : "Няма намерени договори"}</td></TableRow>
            )}
          </TableBody>
        </ShadcnTable>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {de ? `${filteredData.length} Verträge gefunden` : `${filteredData.length} договора намерени`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {de ? `Seite ${table.getState().pagination.pageIndex + 1}` : `Страница ${table.getState().pagination.pageIndex + 1}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
