"use client"

import { useEffect, useState } from "react"
import { CalendarDays, KeyRound, Mail, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await createClient().auth.getUser()
      setEmail(data.user?.email ?? null)
      setCreatedAt(data.user?.created_at ?? null)
      setLoading(false)
    }
    void load()
  }, [])

  return (
    <section className="space-y-6">
      <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Профил</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Вашият профил</h1><p className="mt-2 text-muted-foreground">Управлявайте достъпа до личните си данни.</p></div>
      <Card className="max-w-2xl"><CardHeader><CardTitle>Данни за профила</CardTitle></CardHeader><CardContent className="space-y-5">
        {loading ? <p className="text-sm text-muted-foreground">Зареждаме профила...</p> : email ? <>
          <div className="flex items-center gap-3"><Mail className="size-5 text-primary" /><div><p className="text-sm text-muted-foreground">Имейл</p><p className="font-medium">{email}</p></div></div>
          {createdAt && <div className="flex items-center gap-3"><CalendarDays className="size-5 text-primary" /><div><p className="text-sm text-muted-foreground">Профилът е създаден</p><p className="font-medium">{new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date(createdAt))}</p></div></div>}
          <div className="flex items-center gap-3"><ShieldCheck className="size-5 text-primary" /><div><p className="text-sm text-muted-foreground">Сигурност</p><Badge variant="secondary">Защитен профил</Badge></div></div>
          <div className="flex items-center gap-3 border-t pt-5"><KeyRound className="size-5 text-primary" /><div><p className="text-sm font-medium">Паролата се управлява през системата за вход.</p><p className="text-sm text-muted-foreground">За промяна на достъпа използвайте входа в профила си.</p></div><Button variant="outline" className="ml-auto" disabled>Управление</Button></div>
        </> : <p className="text-sm text-muted-foreground">Влезте в профила си, за да видите данните.</p>}
      </CardContent></Card>
    </section>
  )
}
