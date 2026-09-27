import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  FileSearch,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Receipt,
  Settings,
  WalletCards,
} from "lucide-react"

const metrics = [
  { icon: WalletCards, label: "Месечни разходи", value: "186,40 €", note: "Само въведени суми" },
  { icon: Receipt, label: "Активни договори", value: "6", note: "Всички записани договори" },
  { icon: CalendarDays, label: "Следващ срок", value: "08 окт.", note: "Kündigungsfrist · DSL" },
  { icon: Bell, label: "За проверка", value: "3", note: "Документи и липсващи суми" },
]

const tasks = [
  { icon: FileText, title: "Данъчна декларация", state: "1 активен случай" },
  { icon: BriefcaseBusiness, title: "Agentur für Arbeit", state: "Не е започнато" },
  { icon: FileSearch, title: "Прекратяване на договор", state: "2 активни случая" },
  { icon: Receipt, title: "Обясни документ", state: "1 активен случай" },
  { icon: FolderKanban, title: "Друг административен случай", state: "Не е започнато" },
]

export default function Layer1PreviewPage() {
  return (
    <main className="kintex-workspace fixed inset-0 z-[100] overflow-auto bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] text-[var(--sidebar-foreground)] md:flex md:flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-[var(--sidebar-border)] px-5">
            <div className="grid size-9 place-items-center rounded-xl bg-[var(--sidebar-primary)] text-white">
              <span className="text-sm font-black">H</span>
            </div>
            <div>
              <p className="text-sm font-bold leading-none">HORIZON by VZG</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">VZG CONSULT</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {[
              [LayoutDashboard, "Преглед", true],
              [FileSearch, "Пътеводител", false],
              [FileText, "Документи", false],
              [Receipt, "Договори", false],
              [Settings, "Сигурност", false],
            ].map(([Icon, label, active]) => {
              const C = Icon as typeof LayoutDashboard
              return (
                <div
                  key={String(label)}
                  className={
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm " +
                    (active ? "bg-[var(--sidebar-accent)] font-semibold text-white" : "text-slate-300")
                  }
                >
                  <C className="size-4" />
                  <span>{String(label)}</span>
                </div>
              )
            })}
          </nav>

          <div className="border-t border-[var(--sidebar-border)] p-3">
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300">
              <LogOut className="size-4" />
              Изход
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur-md sm:px-6">
            <button className="grid size-10 place-items-center rounded-xl border border-border bg-white md:hidden" aria-label="Меню">
              <Menu className="size-4" />
            </button>
            <span className="text-sm font-semibold md:hidden">HORIZON by VZG</span>
            <div className="ml-auto rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold">Български</div>
          </header>

          <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9 lg:px-10">
            <header className="flex flex-col justify-between gap-6 border-b border-border pb-7 xl:flex-row xl:items-end">
              <div className="max-w-3xl">
                <p className="horizon-technical-label">01 / Преглед</p>
                <h1 className="horizon-hero-title mt-3 text-4xl font-semibold sm:text-5xl lg:text-6xl">
                  Добре дошъл, Vilislav
                </h1>
                <p className="horizon-hero-copy mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
                  Твоите договори, документи, срокове и административни задачи — подредени на едно място.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button className="horizon-primary-action inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground">
                  <Plus className="size-4" />
                  Започни случай
                </button>
                <button className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-white px-5 text-sm font-semibold">
                  Добави договор
                </button>
              </div>
            </header>

            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map(({ icon: Icon, label, value, note }) => (
                <article key={label} className="horizon-card p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                  </div>
                  <p className="mt-5 text-3xl font-semibold">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{note}</p>
                </article>
              ))}
            </section>

            <section className="mt-10 grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
              <article className="kintex-panel p-6 sm:p-7">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="horizon-technical-label">02 / Следваща стъпка</p>
                    <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Провери договора за интернет</h2>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Нужни са данни</span>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Липсва текущата месечна цена. HORIZON няма да я измисля автоматично — добави я от договора или последната фактура.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-white">Добави липсващата сума</button>
                  <button className="inline-flex h-11 items-center rounded-xl border border-border bg-white px-5 text-sm font-semibold">Виж договора</button>
                </div>
              </article>

              <article className="kintex-panel p-6 sm:p-7">
                <p className="horizon-technical-label">03 / Срок</p>
                <h2 className="mt-2 text-2xl font-semibold">08 октомври</h2>
                <p className="mt-2 text-sm text-muted-foreground">Kündigungsfrist · DSL Vertrag</p>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[68%] rounded-full bg-primary" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">11 дни остават до крайния срок</p>
              </article>
            </section>

            <section className="mt-10">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="horizon-technical-label">04 / Задачи</p>
                  <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">С какво да помогна?</h2>
                </div>
                <button className="text-sm font-semibold text-primary">Виж всички пътища</button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {tasks.map(({ icon: Icon, title, state }) => (
                  <article key={title} className="horizon-card flex min-h-28 items-center gap-4 p-5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold">{title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{state}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-10 grid gap-5 lg:grid-cols-2">
              <article className="kintex-panel p-6">
                <p className="horizon-technical-label">05 / Документи</p>
                <h2 className="mt-2 text-2xl font-semibold">Последни документи</h2>
                <div className="mt-5 space-y-3">
                  {["E.ON Jahresabrechnung.pdf", "Agentur für Arbeit Schreiben.pdf", "DSL Vertrag.pdf"].map((name, i) => (
                    <div key={name} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white px-4 py-3">
                      <div className="flex items-center gap-3">
                        <FileText className="size-4 text-primary" />
                        <span className="text-sm font-medium">{name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{i === 0 ? "За проверка" : "Потвърден"}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="kintex-panel p-6">
                <p className="horizon-technical-label">06 / Контрол</p>
                <h2 className="mt-2 text-2xl font-semibold">Всичко остава под твой контрол</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  HORIZON подрежда и обяснява информацията, но важните действия остават видими и изискват твоето потвърждение.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-muted p-4">
                    <p className="text-xs font-semibold text-muted-foreground">Данни</p>
                    <p className="mt-1 text-sm font-semibold">Потвърдени източници</p>
                  </div>
                  <div className="rounded-2xl bg-muted p-4">
                    <p className="text-xs font-semibold text-muted-foreground">Действия</p>
                    <p className="mt-1 text-sm font-semibold">Без автоматично приемане</p>
                  </div>
                </div>
              </article>
            </section>

            <p className="mt-12 pb-4 text-center text-xs text-muted-foreground">
              Preview branch · Layer 1 visual prototype · main не е променен
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
