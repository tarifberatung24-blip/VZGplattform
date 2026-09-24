"use client"

import { useMemo, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
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
import { ChevronLeft, ChevronRight, Search, ArrowUpDown } from "lucide-react"
import { formatMoney, formatShortDate, type ContractLike } from "@/lib/dashboard/contracts-data"

/** Columns that the global filter searches. `id` and dates stay out of the match set. */
const FILTERABLE_COLUMNS = ["title", "provider_name", "category"]

// Module-level so the column memo depends only on primitives instead of freshly created closures.
function cellMoney(value: number | null, locale: "bg" | "de") {
  return value == null ? (locale === "de" ? "Keine Daten" : "Няма данни") : formatMoney(value, locale)
}

function cellDate(value: string | null, locale: "bg" | "de") {
  return formatShortDate(value, locale) ?? (locale === "de" ? "Keine Daten" : "Няма данни")
}

function SortableHeader({ label, onToggle, sorted }: { label: string; onToggle: () => void; sorted: false | "asc" | "desc" }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
      <ArrowUpDown className="size-3" aria-hidden="true" data-state={sorted || "unsorted"} />
    </button>
  )
}

export function ContractsTable({ contracts }: { contracts: ContractLike[] }) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 6 })

  const columns = useMemo<ColumnDef<ContractLike>[]>(() => [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <SortableHeader
          label={de ? "Vertrag" : "Договор"}
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => <span className="font-medium">{row.getValue("title")}</span>,
    },
    {
      accessorKey: "provider_name",
      header: ({ column }) => (
        <SortableHeader
          label={de ? "Anbieter" : "Доставчик"}
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => <span className="text-muted-foreground">{(row.getValue("provider_name") as string | null) || (de ? "Nicht angegeben" : "Не е посочен")}</span>,
    },
    {
      accessorKey: "monthly_amount",
      header: ({ column }) => (
        <SortableHeader
          label={de ? "Monatlich" : "Месечно"}
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      // Keep missing amounts after real values in ascending order instead of surfacing unknowns first.
      sortingFn: (a, b) => {
        const left = a.original.monthly_amount
        const right = b.original.monthly_amount
        if (left == null && right == null) return 0
        if (left == null) return 1
        if (right == null) return -1
        return left - right
      },
      cell: ({ row }) => <span>{cellMoney(row.getValue("monthly_amount"), locale)}</span>,
    },
    {
      accessorKey: "review_status",
      header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{de ? "Prüfstatus" : "Статус на проверка"}</span>,
      cell: ({ row }) => (
        <span className="whitespace-nowrap rounded-md bg-primary/5 px-2 py-1 text-xs text-primary">
          {row.getValue("review_status") === "confirmed" ? (de ? "Bestätigt" : "Потвърден") : (de ? "Prüfung" : "Преглед")}
        </span>
      ),
    },
    {
      accessorKey: "end_date",
      header: () => <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{de ? "Ende" : "Край"}</span>,
      cell: ({ row }) => <span className="text-muted-foreground">{cellDate(row.getValue("end_date"), locale)}</span>,
    },
  ], [de, locale])

  // One local TanStack model: filtering, sorting and pagination all run through the table itself.
  // The previous version enabled manualFiltering/manualPagination and then sliced a separate
  // filteredData array for rendering, so the controls and the rows disagreed.
  const table = useReactTable({
    data: contracts,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const needle = String(filterValue).trim().toLowerCase()
      if (!needle) return true
      return FILTERABLE_COLUMNS.some((key) => String(row.getValue(key) ?? "").toLowerCase().includes(needle))
    },
  })

  const rows = table.getRowModel().rows
  const filteredCount = table.getFilteredRowModel().rows.length
  const pageIndex = table.getState().pagination.pageIndex
  const pageCount = table.getPageCount()

  return (
    <div className="rounded-md border border-border bg-card shadow-none">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold tracking-tight">
          {de ? "Deine erfassten Verträge" : "Записани ангажименти"}
        </h3>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 pl-9"
            placeholder={de ? "Verträge durchsuchen…" : "Търсене в договори…"}
            value={globalFilter}
            // Resetting the page here keeps pagination consistent with the new result set; the
            // table's own autoResetPageIndex also clamps after the filter narrows.
            onChange={(e) => {
              setGlobalFilter(e.target.value)
              setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }))
            }}
          />
        </div>
      </div>

      {/* Explicit min-width keeps the five columns readable and lets the container scroll
          horizontally on narrow screens instead of squeezing the cells. */}
      <div className="overflow-x-auto">
        <ShadcnTable className="min-w-[720px]">
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
            {rows.length > 0 ? rows.map((row) => (
              <TableRow key={row.id} className="border-b border-border/70 last:border-0">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3 px-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {de ? "Keine Verträge gefunden." : "Няма намерени договори"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ShadcnTable>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {de ? `${filteredCount} Verträge gefunden` : `${filteredCount} договора намерени`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            aria-label={de ? "Vorherige Seite" : "Предишна страница"}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {de
              ? `Seite ${pageCount === 0 ? 0 : pageIndex + 1} von ${pageCount}`
              : `Страница ${pageCount === 0 ? 0 : pageIndex + 1} от ${pageCount}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            aria-label={de ? "Nächste Seite" : "Следваща страница"}
            onClick={() => table.nextPage()}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
