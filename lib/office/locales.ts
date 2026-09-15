export const locales = ['bg', 'de', 'ru', 'pl', 'sr', 'ro'] as const
export type AppLocale = (typeof locales)[number]
