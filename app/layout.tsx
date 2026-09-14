import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"
import { cookies } from "next/headers"
import { Suspense } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { WorkspaceShell } from "@/components/finance/workspace-shell"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { PwaServiceWorker } from "@/components/pwa-service-worker"
import { LanguageProvider } from "@/lib/i18n/language-context"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import { LOCALE_COOKIE_KEY } from "@/lib/i18n/language-context"
import "./globals.css"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" })

export const metadata: Metadata = {
  metadataBase: new URL("https://finanzberaterbg.de"),
  title: {
    default: "KintexBG — BY VZG CONSULT",
    template: "%s · KintexBG",
  },
  description:
    "KintexBG организира договори, документи, срокове и финансови задачи за живота ти в Германия.",
  generator: "v0.app",
  applicationName: "KintexBG",
  keywords: [
    "KintexBG",
    "данъци Германия",
    "Steuererklärung",
    "Kindergeld",
    "Wohngeld",
    "Bürgergeld",
    "договори Германия",
    "българи в Германия",
  ],
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: "KintexBG",
    title: "KintexBG — BY VZG CONSULT",
    description: "Договори, документи, срокове и финансови задачи за живота ти в Германия.",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/finanzbg-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "KintexBG",
    statusBarStyle: "black-translucent",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#f7f7f5" },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const stored = cookieStore.get(LOCALE_COOKIE_KEY)?.value
  const initialLocale: Locale = isLocale(stored) ? stored : defaultLocale

  return (
    <html lang={initialLocale} suppressHydrationWarning className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <LanguageProvider initialLocale={initialLocale}>
            <Suspense fallback={null}><WorkspaceShell>{children}</WorkspaceShell></Suspense>
            <PwaInstallPrompt />
            <PwaServiceWorker />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
