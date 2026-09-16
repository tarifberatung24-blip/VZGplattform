# VZGplattform — Launch Checklist

## Release and hosting

- [ ] Deploy the verified `main` commit to Render and confirm the service is live on the intended custom domain.
- [ ] Configure the custom domain and verify HTTPS, certificate renewal, canonical redirects, and `www` behavior.
- [ ] Set the Render health check to `/api/health` and confirm it returns HTTP 200.
- [ ] Verify the production build and smoke-test `/`, `/dashboard`, `/protected/home-office`, `/auth/login`, `/auth/callback`, `/impressum`, `/datenschutz`, `/agb`, and `/contact-expert`.
- [ ] Confirm no preview or staging environment is indexed by search engines.

## Environment variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL` points to the canonical Supabase project.
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or the legacy anon key is configured; never expose a service-role key to the browser.
- [ ] `CEREBRAS_API_KEY` is configured only as a server-side Render secret.
- [ ] `CEREBRAS_MODEL` is set to a provisioned vision-capable model when image analysis is enabled; the default implementation uses `qwen-3.8-27b`.
- [ ] `LEAD_NOTIFICATION_WEBHOOK_URL` is configured only if the admin webhook endpoint is trusted, authenticated, and documented.
- [ ] `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` is not used as the production OAuth redirect.

## Supabase

- [ ] Apply `supabase/migrations/20260916050000_leads_and_bescheid_analysis.sql` after reviewing it against the live schema.
- [ ] Confirm the `documents` Storage bucket exists, is private, and has the authenticated household policies.
- [ ] Confirm the `leads` table is exposed to the Data API if the project uses the restricted exposure mode.
- [ ] Verify RLS for documents, leads, and household ownership with a non-admin test account.
- [ ] Configure Google OAuth redirect URLs for both the production origin and `/auth/callback`.
- [ ] Define document retention and deletion behavior, including backups and user deletion requests.

## Bescheid Analyzer

- [ ] Test a text-based PDF from Finanzamt, Jobcenter, Familienkasse, and Wohngeldstelle.
- [ ] Test a clear JPG/PNG scan and confirm the provisioned Cerebras model accepts image input.
- [ ] Verify that explicit deadlines, dates, amounts, evidence snippets, and uncertainty are displayed correctly.
- [ ] Verify that a PDF with no extractable text returns a safe error instead of inventing facts.
- [ ] Keep the human review step mandatory; never auto-submit an objection or official form.
- [ ] Monitor Cerebras latency, errors, rate limits, payload sizes, and data-processing terms.

## Legal and commercial readiness

- [ ] Replace all `[placeholder]` values in Impressum, Datenschutz, and AGB with the real provider, contact, DPO, and complaint details.
- [ ] Have German counsel review the legal pages, AI processing, international transfers, retention, and disclaimer wording before launch.
- [ ] Execute the required data-processing agreements with Supabase and Cerebras and document the transfer mechanism where applicable.
- [ ] Add the real consultant identity, availability, response time, and pricing to the Contact Expert flow.
- [ ] Test the lead notification webhook and define who owns lead follow-up.
- [ ] Obtain consent and document the lawful basis for any marketing or follow-up communication beyond the requested contact.

## UX, accessibility, and SEO

- [ ] Test dashboard, quiz, upload, summary card, and contact form at 320px, 375px, 768px, and desktop widths.
- [ ] Verify keyboard navigation, visible focus, labels, error announcements, and color contrast.
- [ ] Verify empty states when the account has no contracts, documents, reminders, or profile data.
- [ ] Confirm title, description, OpenGraph image, language, canonical URL, sitemap, robots, and favicon on the public routes.
- [ ] Add analytics only after the privacy configuration and consent model are approved.

## Go/no-go criteria

The release is **not ready** if legal placeholders remain, the production Supabase migration is unapplied, Google OAuth redirects are untested, the analyzer can invent a deadline without evidence, or lead notifications are not owned by a named operator.
