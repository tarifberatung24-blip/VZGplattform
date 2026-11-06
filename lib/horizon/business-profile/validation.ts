import { z } from "zod"

export const BUSINESS_LEGAL_FORMS = ["einzelunternehmen","freiberufler","gbr","ug","gmbh","gmbh_co_kg","ag","other"] as const
export const BUSINESS_REVENUE_BANDS = ["unknown","under_22k","22k_50k","50k_100k","100k_250k","250k_500k","over_500k"] as const
export const BUSINESS_BOOKKEEPING_METHODS = ["unknown","euer","bilanz","not_sure"] as const
export const BUSINESS_E_INVOICE_STATUSES = ["not_started","preparing","ready","using","not_sure"] as const
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional().transform((value) => value || null)

export const businessProfileInputSchema = z.object({
  business_name: z.string().trim().min(2).max(160),
  legal_form: z.enum(BUSINESS_LEGAL_FORMS),
  industry: z.string().trim().min(2).max(120),
  activity_description: optionalText(1200),
  street_address: optionalText(200),
  postal_code: optionalText(20),
  city: optionalText(120),
  vat_id: optionalText(40),
  tax_number: optionalText(40),
  trade_register_number: optionalText(40),
  founded_on: z.string().date().nullable().optional().transform((value) => value || null),
  employee_count: z.number().int().min(0).max(1000000).nullable().optional(),
  annual_revenue_band: z.enum(BUSINESS_REVENUE_BANDS).nullable().optional(),
  bookkeeping_method: z.enum(BUSINESS_BOOKKEEPING_METHODS).nullable().optional(),
  e_invoice_status: z.enum(BUSINESS_E_INVOICE_STATUSES).nullable().optional(),
  business_goals: z.array(z.string().trim().min(1).max(80)).max(6).default([]),
  business_challenges: z.array(z.string().trim().min(1).max(80)).max(6).default([]),
}).strict()
