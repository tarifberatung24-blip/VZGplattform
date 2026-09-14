import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["bg", "de"],
  defaultLocale: "bg",
  localePrefix: "always",
})

export type Locale = (typeof routing.locales)[number]
