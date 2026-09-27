"use client"

import { useState } from 'react'

// ─── Utilities ────────────────────────────────────────────────────────────────

const fr = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#005FCC] focus-visible:ring-offset-1'

// ─── Icons ────────────────────────────────────────────────────────────────────

function ArrowRight({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7h10M8 3l4 4-4 4" />
    </svg>
  )
}

function IconMenu({ open }: { open: boolean }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M3 8h18M3 16h18" />
    </svg>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const NAV = [
  { label: 'Как работи', href: '#how' },
  { label: 'Функции', href: '#features' },
  { label: 'Сигурност', href: '#trust' },
  { label: 'Контакт', href: '#contact' },
]

const TABS = [
  {
    id: 'docs',
    label: 'Документи',
    headline: 'Разбери всяко официално писмо.',
    body: 'Качи документ или опиши съдържанието. HORIZON обяснява на ясен Bulgarian или немски — без юридически жаргон, без излишна информация.',
  },
  {
    id: 'tax',
    label: 'Данъци',
    headline: 'Ориентирай се в данъчните формуляри и срокове.',
    body: 'HORIZON разбива данъчни документи на конкретни стъпки и показва само релевантното за твоята конкретна ситуация.',
  },
  {
    id: 'contract',
    label: 'Договори',
    headline: 'Разбери какво подписваш.',
    body: 'Обяснение на клаузи, задължения и права в немски договори — наем, работа, услуги, застраховки — на твоя език.',
  },
  {
    id: 'admin',
    label: 'Административни',
    headline: 'Стъпка по стъпка през немската система.',
    body: 'Anmeldung, Krankenversicherung, Elterngeld — HORIZON те ориентира какво следва и кои документи са нужни за теб.',
  },
]

// ─── Hero Product Mockup ──────────────────────────────────────────────────────

function HorizonMockup() {
  return (
    <div
      className="w-full overflow-hidden rounded-2xl relative"
      style={{
        border: '1px solid rgba(23,74,126,0.13)',
        boxShadow: '0 4px 6px rgba(23,74,126,0.04), 0 24px 64px rgba(23,74,126,0.09)',
        background: '#fff',
      }}
    >
      {/* Browser bar */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid rgba(122,134,153,0.13)', background: '#FAFBFC' }}
      >
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: '#E2E8F0' }} />
          ))}
        </div>
        <div
          className="mx-auto flex items-center justify-center gap-1.5 h-6 rounded text-[10.5px]"
          style={{ background: '#EEF2F6', width: 220, color: '#7A8699' }}
        >
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="2" width="10" height="8" rx="1.5" />
            <path d="M4 2V1M8 2V1" strokeLinecap="round" />
          </svg>
          horizon.vzg.de
        </div>
        <div className="w-[52px]" />
      </div>

      {/* App shell */}
      <div className="flex" style={{ height: 440 }}>

        {/* Sidebar */}
        <div
          className="flex flex-col shrink-0"
          style={{ width: 196, borderRight: '1px solid rgba(122,134,153,0.12)', background: '#FAFBFC' }}
        >
          <div className="px-4 py-5">
            {/* Logo */}
            <div className="flex items-center gap-1.5 mb-7">
              <div className="w-4 h-4 rounded-sm" style={{ background: '#174A7E' }} />
              <span className="text-[11px] font-bold tracking-[-0.02em]" style={{ color: '#174A7E' }}>HORIZON</span>
            </div>

            {/* Nav */}
            <div className="mb-6">
              <div className="px-2 text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#7A8699' }}>Категории</div>
              {['Документи', 'Данъци', 'Договори', 'Административни'].map((item, i) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded mb-0.5"
                  style={{
                    background: i === 1 ? 'rgba(23,74,126,0.08)' : 'transparent',
                    color: i === 1 ? '#174A7E' : '#475467',
                    fontSize: 11.5,
                    fontWeight: i === 1 ? 600 : 400,
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: i === 1 ? '#174A7E' : 'rgba(122,134,153,0.35)' }}
                  />
                  {item}
                </div>
              ))}
            </div>

            {/* Deadlines */}
            <div>
              <div className="px-2 text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#7A8699' }}>Срокове</div>
              {[
                { label: '15 февр.', tag: 'Данък', urgent: true },
                { label: '31 май', tag: 'Krankenkasse', urgent: false },
              ].map(d => (
                <div
                  key={d.label}
                  className="flex items-center justify-between px-2 py-1.5 rounded mb-0.5"
                  style={{ background: d.urgent ? 'rgba(181,71,8,0.07)' : 'transparent' }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: d.urgent ? '#B54708' : '#CBD5E1' }} />
                    <span style={{ color: d.urgent ? '#B54708' : '#475467', fontSize: 10.5, fontWeight: d.urgent ? 600 : 400 }}>{d.label}</span>
                  </div>
                  <span style={{ fontSize: 9.5, color: '#7A8699', background: '#EEF2F6', padding: '1px 5px', borderRadius: 3 }}>{d.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat thread */}
          <div className="flex-1 px-6 py-5 flex flex-col gap-4 overflow-hidden">

            {/* Document chip */}
            <div className="self-start flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
              style={{ border: '1px solid rgba(122,134,153,0.2)', background: '#F7F9FC', color: '#475467' }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#174A7E" strokeWidth="1.75">
                <rect x="2" y="1" width="12" height="14" rx="1.5" />
                <path d="M5 5h6M5 8h6M5 11h4" strokeLinecap="round" />
              </svg>
              <span className="font-medium" style={{ color: '#17202A' }}>Steuerbescheid_2023.pdf</span>
              <span style={{ color: '#94A3B8' }}>· 4 стр.</span>
            </div>

            {/* User bubble */}
            <div className="flex justify-end">
              <div
                className="max-w-[260px] px-4 py-3 rounded-2xl text-[11.5px] leading-relaxed text-white"
                style={{ background: '#174A7E', borderBottomRightRadius: 4 }}
              >
                Какво означава Nachzahlung и трябва ли да плащам сега?
              </div>
            </div>

            {/* Assistant bubble */}
            <div className="flex items-start gap-2.5">
              <div
                className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 text-[8px] font-bold text-white"
                style={{ background: '#174A7E' }}
              >
                H
              </div>
              <div
                className="max-w-[300px] px-4 py-3 rounded-2xl text-[11.5px] leading-relaxed"
                style={{ background: '#EEF2F6', color: '#17202A', borderBottomLeftRadius: 4 }}
              >
                <strong>Nachzahlung</strong> означава, че дължиш допълнителна сума данъци. В твоя случай:{' '}
                <strong style={{ color: '#174A7E' }}>842 €</strong> до{' '}
                <strong>15 февруари 2024 г.</strong>
                <br /><br />
                Плащането се прави чрез Überweisung към Finanzamt Berlin-Mitte.
              </div>
            </div>

            {/* Steps card */}
            <div
              className="ml-[30px] px-4 py-3.5 rounded-xl text-[11px] max-w-[290px]"
              style={{ border: '1.5px solid rgba(23,74,126,0.15)', background: '#fff' }}
            >
              <div className="text-[9.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#174A7E' }}>
                Следващи стъпки
              </div>
              {[
                { done: true, text: 'Провери размера: 842 €' },
                { done: false, text: 'Запази срока: 15.02.2024' },
                { done: false, text: 'Направи Überweisung до Finanzamt' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: s.done ? '#174A7E' : 'rgba(122,134,153,0.2)' }}
                  >
                    {s.done && <span style={{ color: '#fff', fontSize: 7, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ color: s.done ? '#94A3B8' : '#17202A', textDecoration: s.done ? 'line-through' : 'none', fontSize: 11 }}>
                    {s.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Input bar */}
          <div className="px-5 py-3.5" style={{ borderTop: '1px solid rgba(122,134,153,0.12)' }}>
            <div
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[11.5px]"
              style={{ border: '1px solid rgba(122,134,153,0.22)', background: '#FAFBFC', color: '#94A3B8' }}
            >
              <span className="flex-1">Задай следващ въпрос или качи документ...</span>
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                style={{ background: '#174A7E', fontSize: 13 }}
              >
                ↑
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Feature Tab Panels ───────────────────────────────────────────────────────

function DocsPanel() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ height: 380, display: 'flex', flexDirection: 'column', border: '1px solid rgba(122,134,153,0.18)', background: '#fff' }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(122,134,153,0.12)', background: '#FAFBFC' }}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#174A7E" strokeWidth="1.75">
          <rect x="2" y="1" width="12" height="14" rx="1.5" /><path d="M5 5h6M5 8h6M5 11h4" strokeLinecap="round" />
        </svg>
        <span className="text-[11px] font-medium" style={{ color: '#17202A' }}>Anmeldebestätigung_Berlin.pdf</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 px-5 py-4 text-[11px] leading-relaxed" style={{ color: '#475467', background: '#FAFBFC', borderRight: '1px solid rgba(122,134,153,0.12)' }}>
          <div className="text-[9.5px] font-bold uppercase tracking-widest mb-3" style={{ color: '#174A7E' }}>Оригинален текст (DE)</div>
          <p>Hiermit wird bescheinigt, dass{' '}
            <span className="px-1 rounded" style={{ background: 'rgba(23,74,126,0.1)', color: '#174A7E', fontWeight: 600 }}>Ivan Petrov</span>
            {' '}mit Wirkung vom{' '}
            <span className="px-1 rounded" style={{ background: 'rgba(23,74,126,0.1)', color: '#174A7E', fontWeight: 600 }}>01.01.2024</span>
            {' '}unter der Adresse{' '}
            <span className="px-1 rounded" style={{ background: 'rgba(23,74,126,0.1)', color: '#174A7E', fontWeight: 600 }}>Musterstraße 12, 10115 Berlin</span>
            {' '}angemeldet ist.
          </p>
          <p className="mt-3">Diese Bescheinigung gilt als offizielles Dokument im Sinne des Bundesmeldegesetzes.</p>
        </div>
        <div className="flex flex-col gap-3 px-4 py-4 shrink-0" style={{ width: 176 }}>
          <div className="text-[9.5px] font-bold uppercase tracking-widest mb-1" style={{ color: '#174A7E' }}>Обяснение (BG)</div>
          {[
            { label: 'Какво е', val: 'Официална регистрация' },
            { label: 'Кой', val: 'Ivan Petrov' },
            { label: 'От кога', val: '01.01.2024' },
            { label: 'Адрес', val: 'Musterstraße 12, Berlin' },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="text-[9.5px] font-medium mb-0.5" style={{ color: '#7A8699' }}>{label}</div>
              <div className="text-[11px] font-semibold" style={{ color: '#17202A' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TaxPanel() {
  const items = [
    { date: '15 февр. 2024', label: 'Einkommensteuer Nachzahlung', amount: '842 €', urgent: true, note: 'Überweisung до Finanzamt Berlin-Mitte' },
    { date: '31 май 2024', label: 'Steuererklärung 2023', amount: null, urgent: false, note: 'Подаване на данъчна декларация' },
    { date: '15 юни 2024', label: 'Vorauszahlung Q2', amount: '210 €', urgent: false, note: 'Авансова вноска' },
  ]
  return (
    <div className="rounded-xl overflow-hidden" style={{ height: 380, display: 'flex', flexDirection: 'column', border: '1px solid rgba(122,134,153,0.18)', background: '#fff' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(122,134,153,0.12)', background: '#FAFBFC' }}>
        <span className="text-[11px] font-medium" style={{ color: '#17202A' }}>Данъчни срокове 2024</span>
        <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded" style={{ background: 'rgba(23,74,126,0.08)', color: '#174A7E' }}>Персонализирано</span>
      </div>
      <div className="flex-1 px-5 py-4 flex flex-col gap-3">
        {items.map(item => (
          <div
            key={item.label}
            className="flex items-start gap-3 px-3.5 py-3 rounded-lg"
            style={{
              border: item.urgent ? '1.5px solid rgba(181,71,8,0.28)' : '1px solid rgba(122,134,153,0.15)',
              background: item.urgent ? 'rgba(181,71,8,0.04)' : '#FAFBFC',
            }}
          >
            <div className="flex flex-col items-center shrink-0 mt-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: item.urgent ? '#B54708' : '#CBD5E1' }} />
              <div className="w-px flex-1 mt-1 min-h-[24px]" style={{ background: 'rgba(122,134,153,0.2)' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10.5px] font-semibold" style={{ color: item.urgent ? '#B54708' : '#17202A' }}>{item.date}</span>
                {item.amount && <span className="text-[10.5px] font-bold" style={{ color: '#17202A' }}>{item.amount}</span>}
              </div>
              <div className="text-[10.5px] font-medium mb-0.5" style={{ color: '#17202A' }}>{item.label}</div>
              <div className="text-[9.5px]" style={{ color: '#7A8699' }}>{item.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ContractPanel() {
  const clauses = [
    { type: 'neutral', label: 'Наем', val: '1.250 € / месец + 180 € Nebenkosten' },
    { type: 'warn', label: 'Kündigungsfrist', val: '3 месеца предизвестие (§ 573c BGB)' },
    { type: 'neutral', label: 'Kaution', val: '3.750 € (3 наема), платим при подписване' },
    { type: 'warn', label: 'Renovierung', val: 'Клауза за ремонт при изнасяне — виж §11' },
    { type: 'ok', label: 'Haustiere', val: 'Разрешени с писмено съгласие на наемодателя' },
  ]
  const dot = { ok: '#067647', warn: '#B54708', neutral: '#174A7E' } as const
  return (
    <div className="rounded-xl overflow-hidden" style={{ height: 380, display: 'flex', flexDirection: 'column', border: '1px solid rgba(122,134,153,0.18)', background: '#fff' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(122,134,153,0.12)', background: '#FAFBFC' }}>
        <span className="text-[11px] font-medium" style={{ color: '#17202A' }}>Mietvertrag_Wohnung.pdf</span>
        <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded" style={{ background: 'rgba(6,118,71,0.08)', color: '#067647' }}>Анализиран</span>
      </div>
      <div className="flex-1 px-5 py-4 flex flex-col gap-2.5 overflow-hidden">
        <div className="text-[9.5px] font-bold uppercase tracking-widest mb-1" style={{ color: '#174A7E' }}>Ключови клаузи</div>
        {clauses.map(({ type, label, val }) => (
          <div key={label} className="flex items-start gap-2 px-3 py-2 rounded-lg"
            style={{ background: '#FAFBFC', border: '1px solid rgba(122,134,153,0.13)' }}>
            <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: dot[type as keyof typeof dot] }} />
            <div>
              <span className="text-[10.5px] font-semibold" style={{ color: '#17202A' }}>{label}:{' '}</span>
              <span className="text-[10.5px]" style={{ color: '#475467' }}>{val}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminPanel() {
  const steps = [
    { n: '01', title: 'Anmeldung', sub: 'Регистрация на адрес в Bürgeramt', done: true },
    { n: '02', title: 'Krankenversicherung', sub: 'Регистрация при здравна каса', done: true },
    { n: '03', title: 'Steuer-ID', sub: 'Получаване на данъчен номер (по пощата)', done: false },
    { n: '04', title: 'Bankkonto', sub: 'Открийте немска банкова сметка', done: false },
    { n: '05', title: 'Rundfunkbeitrag', sub: 'Медийна такса (17,50 € / месец)', done: false },
  ]
  return (
    <div className="rounded-xl overflow-hidden" style={{ height: 380, display: 'flex', flexDirection: 'column', border: '1px solid rgba(122,134,153,0.18)', background: '#fff' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(122,134,153,0.12)', background: '#FAFBFC' }}>
        <span className="text-[11px] font-medium" style={{ color: '#17202A' }}>Пристигане в Германия — Чеклист</span>
        <span className="text-[9.5px]" style={{ color: '#7A8699' }}>2 от 5 завършени</span>
      </div>
      <div className="flex-1 px-5 py-4 flex flex-col gap-2 overflow-hidden">
        {steps.map(s => (
          <div key={s.n} className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
            style={{ border: '1px solid rgba(122,134,153,0.13)', background: s.done ? 'rgba(6,118,71,0.04)' : '#FAFBFC' }}>
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{
                border: s.done ? 'none' : '1.5px solid rgba(122,134,153,0.35)',
                background: s.done ? '#067647' : 'transparent',
                color: s.done ? '#fff' : '#7A8699',
                fontSize: 8,
                fontWeight: 700,
              }}
            >
              {s.done ? '✓' : s.n}
            </div>
            <div>
              <div className="text-[11px] font-semibold"
                style={{ color: s.done ? '#7A8699' : '#17202A', textDecoration: s.done ? 'line-through' : 'none' }}>
                {s.title}
              </div>
              <div className="text-[9.5px]" style={{ color: '#94A3B8' }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const PANELS = [DocsPanel, TaxPanel, ContractPanel, AdminPanel]

// ─── App ──────────────────────────────────────────────────────────────────────

export function Layer0Homepage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const Panel = PANELS[activeTab]

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Skip link */}
      <a href="#main" className={`sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg text-sm font-medium ${fr}`}>
        Към съдържанието
      </a>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(247,249,252,0.85)',
          backdropFilter: 'saturate(180%) blur(14px)',
          borderBottom: '1px solid rgba(122,134,153,0.16)',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 sm:px-10 h-[60px] flex items-center justify-between relative">

          {/* Wordmark */}
          <a href="#" className={`flex flex-col leading-none shrink-0 rounded-sm ${fr}`} aria-label="HORIZON — начало">
            <span className="text-[9px] font-semibold tracking-[0.22em] uppercase" style={{ color: '#94A3B8' }}>by VZG</span>
            <span className="text-[1.125rem] font-bold tracking-[-0.03em]" style={{ color: '#174A7E' }}>HORIZON</span>
          </a>

          {/* Nav — centered */}
          <nav
            className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2"
            aria-label="Основна навигация"
          >
            {NAV.map(link => (
              <a
                key={link.label}
                href={link.href}
                className={`px-4 py-2 text-[13.5px] font-medium rounded-lg transition-colors duration-150 ${fr}`}
                style={{ color: '#475467' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0A1628' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#475467' }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <a
              href="#"
              className={`px-4 py-2 text-[13.5px] font-medium rounded-lg transition-colors duration-150 ${fr}`}
              style={{ color: '#475467' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#0A1628' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#475467' }}
            >
              Вход
            </a>
            <a
              href="#"
              className={`px-4 py-2 text-[13.5px] font-semibold text-white rounded-lg transition-colors duration-150 ${fr}`}
              style={{ background: '#174A7E' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#123B65' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#174A7E' }}
            >
              Намери решение
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            className={`md:hidden p-2 -mr-1 rounded-lg ${fr}`}
            style={{ color: '#17202A' }}
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Затвори менюто' : 'Отвори менюто'}
          >
            <IconMenu open={menuOpen} />
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div style={{ borderTop: '1px solid rgba(122,134,153,0.14)', background: 'rgba(247,249,252,0.97)' }}>
            <nav className="max-w-[1280px] mx-auto px-6 py-3 flex flex-col gap-0.5">
              {NAV.map(link => (
                <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}
                  className={`px-3 py-3 text-sm font-medium rounded-lg transition-colors ${fr}`}
                  style={{ color: '#475467' }}>
                  {link.label}
                </a>
              ))}
              <div className="flex gap-2 pt-3 mt-1" style={{ borderTop: '1px solid rgba(122,134,153,0.14)' }}>
                <a href="#" className={`flex-1 text-center py-2.5 text-sm font-medium rounded-lg ${fr}`}
                  style={{ border: '1px solid rgba(122,134,153,0.3)', color: '#174A7E' }}>Вход</a>
                <a href="#" className={`flex-1 text-center py-2.5 text-sm font-semibold rounded-lg text-white ${fr}`}
                  style={{ background: '#174A7E' }}>Намери решение</a>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="main">

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <section aria-labelledby="hero-h" style={{ background: '#F7F9FC' }}>
          <div className="max-w-[1280px] mx-auto px-6 sm:px-10 pt-28 pb-0 md:pt-36">

            {/* Eyebrow */}
            <div className="flex justify-center mb-7">
              <span
                className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase"
                style={{ color: '#174A7E', opacity: 0.75 }}
              >
                <span className="w-5 h-px" style={{ background: '#174A7E', opacity: 0.5 }} />
                Цифров асистент · България × Германия
                <span className="w-5 h-px" style={{ background: '#174A7E', opacity: 0.5 }} />
              </span>
            </div>

            {/* H1 — editorial scale */}
            <h1
              id="hero-h"
              className="font-bold text-center mx-auto"
              style={{
                fontSize: 'clamp(2.5rem, 6.2vw, 5.25rem)',
                lineHeight: 1.06,
                letterSpacing: '-0.038em',
                color: '#0A1628',
                maxWidth: 860,
                textWrap: 'balance',
                marginBottom: '1.75rem',
              }}
            >
              Разбери какво е релевантно за твоята ситуация в Германия.
            </h1>

            {/* Subtext */}
            <p
              className="text-center mx-auto"
              style={{
                fontSize: 'clamp(1rem, 1.5vw, 1.1875rem)',
                lineHeight: 1.75,
                color: '#475467',
                maxWidth: 540,
                marginBottom: '2.75rem',
              }}
            >
              HORIZON ти помага да разбереш документи, договори, данъци и административни задачи — и те води стъпка по стъпка към следващото действие.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20">
              <a
                href="#features"
                className={`inline-flex items-center gap-2 px-7 py-3.5 font-semibold text-white rounded-xl transition-colors duration-150 ${fr}`}
                style={{ background: '#174A7E', fontSize: 14.5 }}
                onMouseEnter={e => { e.currentTarget.style.background = '#123B65' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#174A7E' }}
              >
                Намери решение <ArrowRight size={14} />
              </a>
              <a
                href="#how"
                className={`inline-flex items-center gap-1.5 px-7 py-3.5 font-medium rounded-xl transition-colors duration-150 ${fr}`}
                style={{ color: '#475467', fontSize: 14.5 }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0A1628' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#475467' }}
              >
                Как работи
              </a>
            </div>

            {/* Product screenshot */}
            <HorizonMockup />
          </div>
        </section>

        {/* ── Feature tabs ───────────────────────────────────────────────────── */}
        <section
          id="features"
          aria-labelledby="features-h"
          className="py-36"
          style={{ background: '#fff', borderTop: '1px solid rgba(122,134,153,0.14)' }}
        >
          <div className="max-w-[1280px] mx-auto px-6 sm:px-10">

            {/* Section eyebrow */}
            <div className="mb-4">
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ color: '#174A7E', opacity: 0.75 }}>
                Функции
              </span>
            </div>

            <h2
              id="features-h"
              className="font-bold mb-16"
              style={{
                fontSize: 'clamp(1.875rem, 3.5vw, 3.25rem)',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                color: '#0A1628',
                maxWidth: 540,
              }}
            >
              Всичко, от което се нуждаеш.
            </h2>

            {/* Tab bar */}
            <div
              className="flex items-center gap-0 mb-12"
              style={{ borderBottom: '1px solid rgba(122,134,153,0.18)' }}
              role="tablist"
              aria-label="Категории функции"
            >
              {TABS.map((tab, i) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === i}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setActiveTab(i)}
                  className={`px-5 py-3 text-[13.5px] -mb-px transition-all duration-150 ${fr} rounded-t-sm`}
                  style={{
                    color: activeTab === i ? '#174A7E' : '#7A8699',
                    fontWeight: activeTab === i ? 600 : 400,
                    borderBottom: `2px solid ${activeTab === i ? '#174A7E' : 'transparent'}`,
                    background: 'transparent',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div
              className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start"
              id={`panel-${TABS[activeTab].id}`}
              role="tabpanel"
            >
              {/* Text side */}
              <div className="pt-2">
                <h3
                  className="font-bold mb-5 leading-[1.1]"
                  style={{
                    fontSize: 'clamp(1.5rem, 2.5vw, 2.125rem)',
                    letterSpacing: '-0.025em',
                    color: '#0A1628',
                  }}
                >
                  {TABS[activeTab].headline}
                </h3>
                <p style={{ fontSize: '1.0625rem', lineHeight: 1.75, color: '#475467' }}>
                  {TABS[activeTab].body}
                </p>
                <a
                  href="#"
                  className={`inline-flex items-center gap-1.5 mt-8 font-semibold rounded-sm ${fr}`}
                  style={{ fontSize: 13.5, color: '#174A7E' }}
                >
                  Разбери повече <ArrowRight />
                </a>
              </div>

              {/* Panel */}
              <div>
                <Panel />
              </div>
            </div>

          </div>
        </section>

        {/* ── How it works ───────────────────────────────────────────────────── */}
        <section
          id="how"
          aria-labelledby="how-h"
          className="py-36"
          style={{ background: '#F7F9FC', borderTop: '1px solid rgba(122,134,153,0.14)' }}
        >
          <div className="max-w-[1280px] mx-auto px-6 sm:px-10">

            <div className="mb-4">
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ color: '#174A7E', opacity: 0.75 }}>
                Процес
              </span>
            </div>

            <h2
              id="how-h"
              className="font-bold mb-24"
              style={{
                fontSize: 'clamp(1.875rem, 3.5vw, 3.25rem)',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                color: '#0A1628',
                maxWidth: 440,
              }}
            >
              Три стъпки до яснота.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
              {[
                {
                  n: '01',
                  title: 'Опиши ситуацията',
                  body: 'Разкажи с какво се занимаваш — документ, срок, писмо или въпрос. Не е нужен специален формат или предварително познание.',
                },
                {
                  n: '02',
                  title: 'Получи ясен отговор',
                  body: 'HORIZON обяснява на Bulgarian или немски — само релевантното за твоята ситуация, без жаргон и без излишна информация.',
                },
                {
                  n: '03',
                  title: 'Действай информирано',
                  body: 'Получаваш конкретни следващи стъпки. Разбираш какво следва и вземаш решенията напълно самостоятелно.',
                },
              ].map(step => (
                <div key={step.n}>
                  <div className="text-[11px] font-bold tracking-[0.18em] uppercase mb-5" style={{ color: '#174A7E', opacity: 0.55 }}>
                    {step.n}
                  </div>
                  <div className="w-full h-px mb-7" style={{ background: 'rgba(23,74,126,0.14)' }} />
                  <h3 className="font-semibold mb-3" style={{ fontSize: '1.125rem', color: '#0A1628', letterSpacing: '-0.015em' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: '0.9375rem', lineHeight: 1.8, color: '#475467' }}>
                    {step.body}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── Trust / Security ───────────────────────────────────────────────── */}
        <section
          id="trust"
          aria-labelledby="trust-h"
          className="py-36"
          style={{ background: '#0D2240' }}
        >
          <div className="max-w-[1280px] mx-auto px-6 sm:px-10">

            <div className="mb-4">
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.38)' }}>
                Поверителност и контрол
              </span>
            </div>

            {/* Header row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-end mb-20">
              <h2
                id="trust-h"
                className="font-bold leading-[1.08]"
                style={{
                  fontSize: 'clamp(1.875rem, 3.5vw, 3.25rem)',
                  letterSpacing: '-0.03em',
                  color: '#fff',
                }}
              >
                Твоите данни са твои — не ресурс за платформата.
              </h2>
              <p style={{ fontSize: '1.0625rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.55)' }}>
                HORIZON е проектиран с поверителността на преден план — в съответствие с GDPR и немското законодателство за защита на личните данни.
              </p>
            </div>

            {/* Trust grid */}
            <div className="grid grid-cols-1 md:grid-cols-3">
              {[
                {
                  n: '01',
                  title: 'Пълен контрол',
                  body: 'Не съхраняваме лични документи без твое изрично съгласие. Имаш контрол над всичко, което споделяш с платформата.',
                },
                {
                  n: '02',
                  title: 'Прозрачни обяснения',
                  body: 'Всеки отговор показва основата си. Знаеш защо и откъде идва информацията — никога не остава скрита.',
                },
                {
                  n: '03',
                  title: 'GDPR съответствие',
                  body: 'Изградена в съответствие с GDPR и Bundesdatenschutzgesetz. Данните ти не се продават и не се предоставят на трети страни.',
                },
              ].map((item, i) => (
                <div
                  key={item.n}
                  className="px-0 md:px-8 py-8"
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    paddingLeft: i === 0 ? 0 : undefined,
                  }}
                >
                  <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-5" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    {item.n}
                  </div>
                  <h3 className="font-semibold mb-3" style={{ fontSize: '1.0625rem', color: '#fff', letterSpacing: '-0.01em' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.9375rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.5)' }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div
              className="mt-12 flex items-start gap-3 px-5 py-4 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
              role="note"
            >
              <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.75" strokeLinecap="round">
                <circle cx="8" cy="8" r="7" />
                <path d="M8 11V7.5M8 5h.01" />
              </svg>
              <p style={{ fontSize: 12.5, lineHeight: 1.75, color: 'rgba(255,255,255,0.45)' }}>
                <strong style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Важно: </strong>
                HORIZON не изпраща документи до институции и не предприема действия от твое име. Всички стъпки вземаш самостоятелно. Платформата предоставя информация и ориентация — не правна, финансова или данъчна консултация.
              </p>
            </div>

          </div>
        </section>

        {/* ── Final CTA ──────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="cta-h"
          className="py-48"
          style={{ background: '#F7F9FC', borderTop: '1px solid rgba(122,134,153,0.14)' }}
        >
          <div className="max-w-[1280px] mx-auto px-6 sm:px-10 text-center">
            <h2
              id="cta-h"
              className="font-bold mx-auto mb-6"
              style={{
                fontSize: 'clamp(2.25rem, 5.5vw, 4.75rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.04em',
                color: '#0A1628',
                maxWidth: 700,
                textWrap: 'balance',
              }}
            >
              Готов да разбереш своята ситуация?
            </h2>
            <p
              className="mx-auto mb-10"
              style={{
                fontSize: '1.125rem',
                lineHeight: 1.75,
                color: '#475467',
                maxWidth: 420,
              }}
            >
              Започни с конкретен въпрос или документ — HORIZON те ориентира каква е следващата стъпка.
            </p>
            <a
              href="#"
              className={`inline-flex items-center gap-2 px-8 py-4 font-semibold text-white rounded-xl transition-colors duration-150 ${fr}`}
              style={{ background: '#174A7E', fontSize: 15 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#123B65' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#174A7E' }}
            >
              Намери решение <ArrowRight size={14} />
            </a>
          </div>
        </section>

      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer
        id="contact"
        style={{ background: '#fff', borderTop: '1px solid rgba(122,134,153,0.18)' }}
        aria-label="Footer"
      >
        <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

            {/* Brand */}
            <div className="col-span-2">
              <div className="mb-4">
                <span className="block text-[9px] font-semibold tracking-[0.22em] uppercase" style={{ color: '#94A3B8' }}>by VZG</span>
                <span className="block font-bold tracking-[-0.03em]" style={{ fontSize: '1.125rem', color: '#174A7E' }}>HORIZON</span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.75, color: '#94A3B8', maxWidth: 260 }}>
                Цифров асистент за хора в Германия. Документи, данъци, договори и административни задачи — на твой език.
              </p>
              <div className="flex gap-1.5 mt-5">
                {['BG', 'DE'].map(l => (
                  <span key={l} className="px-2 py-0.5 text-[10px] font-semibold rounded" style={{ background: '#EEF2F6', color: '#7A8699', border: '1px solid rgba(122,134,153,0.2)' }}>
                    {l}
                  </span>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <h3 className="text-[10px] font-semibold tracking-[0.16em] uppercase mb-5" style={{ color: '#17202A' }}>Платформа</h3>
              <ul className="space-y-3">
                {[
                  { label: 'Как работи', href: '#how' },
                  { label: 'Функции', href: '#features' },
                  { label: 'Сигурност', href: '#trust' },
                  { label: 'Вход', href: '#' },
                ].map(item => (
                  <li key={item.label}>
                    <a href={item.href} className={`text-[13px] rounded transition-colors duration-150 ${fr}`}
                      style={{ color: '#94A3B8' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#17202A' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8' }}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-[10px] font-semibold tracking-[0.16em] uppercase mb-5" style={{ color: '#17202A' }}>Rechtliches</h3>
              <ul className="space-y-3">
                {['Datenschutz', 'Impressum', 'AGB'].map(item => (
                  <li key={item}>
                    <a href="#" className={`text-[13px] rounded transition-colors duration-150 ${fr}`}
                      style={{ color: '#94A3B8' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#17202A' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8' }}>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Bottom bar */}
          <div
            className="pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
            style={{ borderTop: '1px solid rgba(122,134,153,0.14)' }}
          >
            <p style={{ fontSize: 12, color: '#94A3B8' }}>
              © {new Date().getFullYear()} HORIZON by VZG. Всички права запазени.
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8' }}>
              Информация и ориентация — не правна консултация.
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}