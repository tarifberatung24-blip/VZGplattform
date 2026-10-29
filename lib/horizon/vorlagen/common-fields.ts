/**
 * The fields every letter shares, so a template only declares what is its own.
 *
 * A letter needs a sender, an addressee, a place and a date before it needs
 * anything else. Declaring those once means the four templates cannot ask for
 * them under four different names, and a change to how the sender is collected
 * happens in one place.
 */

import type { Locale } from "@/lib/i18n/dictionaries"
import type { VorlageField } from "./types"

export const COMMON_FIELD_KEYS = {
  senderName: "sender_name",
  senderAddress: "sender_address",
  recipientName: "recipient_name",
  recipientAddress: "recipient_address",
  place: "place",
  date: "letter_date",
} as const

export const commonFields: readonly VorlageField[] = [
  {
    key: COMMON_FIELD_KEYS.senderName,
    kind: "text",
    required: true,
    label: { bg: "Твоето име", de: "Dein Name" },
    hint: { bg: "Както е в договора.", de: "Wie im Vertrag angegeben." },
  },
  {
    key: COMMON_FIELD_KEYS.senderAddress,
    kind: "multiline",
    required: true,
    label: { bg: "Твоят адрес", de: "Deine Adresse" },
    hint: { bg: "Улица, номер, пощенски код и град.", de: "Straße, Hausnummer, PLZ und Ort." },
  },
  {
    key: COMMON_FIELD_KEYS.recipientName,
    kind: "text",
    required: true,
    label: { bg: "Име на получателя", de: "Name des Empfängers" },
    hint: { bg: "Фирма, наемодател или служба.", de: "Firma, Vermieter oder Behörde." },
  },
  {
    key: COMMON_FIELD_KEYS.recipientAddress,
    kind: "multiline",
    required: true,
    label: { bg: "Адрес на получателя", de: "Adresse des Empfängers" },
    hint: {
      bg: "Адресът от договора или от тяхното писмо.",
      de: "Die Adresse aus dem Vertrag oder aus deren Schreiben.",
    },
  },
  {
    key: COMMON_FIELD_KEYS.place,
    kind: "text",
    required: false,
    label: { bg: "Място", de: "Ort" },
    hint: { bg: "Градът, в който пишеш.", de: "Der Ort, an dem du schreibst." },
  },
  {
    key: COMMON_FIELD_KEYS.date,
    kind: "date",
    required: true,
    label: { bg: "Дата", de: "Datum" },
    hint: {
      bg: "Датата на писмото. Не се попълва автоматично, за да остане писмото възпроизводимо.",
      de: "Das Datum des Briefes. Wird nicht automatisch gesetzt, damit der Brief reproduzierbar bleibt.",
    },
  },
]

/** The field keys a template owns, excluding the shared ones. */
export function ownFieldKeys(template: { fields: readonly VorlageField[] }): string[] {
  const common = new Set<string>(Object.values(COMMON_FIELD_KEYS))
  return template.fields.filter((field) => !common.has(field.key)).map((field) => field.key)
}

export function fieldLabelFor(
  template: { fields: readonly VorlageField[] },
  key: string,
  locale: Locale,
): string {
  return template.fields.find((field) => field.key === key)?.label[locale] ?? key
}
