"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navItems = [
  { label: "Преглед", href: "/" },
  { label: "Помощи", href: "/anspruch" },
  { label: "Документи", href: "/workspace" },
  { label: "Профил", href: "/profile" },
]

export function Header() {
  const pathname = usePathname()

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <header className="mb-8 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex flex-col gap-1" aria-hidden="true">
          <div className="h-0.5 w-5 bg-foreground" />
          <div className="h-0.5 w-5 bg-foreground" />
          <div className="h-0.5 w-3 bg-foreground" />
        </div>
        <span className="text-xl font-semibold">VZGplattform</span>
      </Link>

      <nav aria-label="Основна навигация" className="hidden items-center rounded-full border border-border bg-card px-2 py-1.5 md:flex">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${isActive(item.href) ? "bg-[var(--color-accent)] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Известия"><Bell className="size-5" /></Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex cursor-pointer items-center gap-2" aria-label="Отвори меню на профила">
              <Avatar className="size-9"><AvatarFallback>ВЗ</AvatarFallback></Avatar>
              <div className="hidden text-left sm:block"><p className="text-sm font-medium">Моят профил</p><p className="text-xs text-muted-foreground">Лични данни</p></div>
              <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild><Link href="/profile">Профил</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/workspace">Моят преглед</Link></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
