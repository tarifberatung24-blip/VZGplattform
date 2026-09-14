# Affiliate Launch: first four customer enquiries

Status: parked until the n8n manual offer request workflow and the first paid service are fully live.

For the current launch phase, Facebook traffic should go to the request routes in `docs/N8N_OFFER_REQUEST_PLAN.md`, not directly to affiliate deeplinks. Affiliate links remain useful for later campaign tests after the manual workflow can capture, answer and measure customer demand.

## Launch principle

Each Facebook campaign has one consumer problem, one bilingual landing page, one approved affiliate deeplink and one measurement name. Do not send paid traffic to a general products page.

| Campaign | Bulgarian landing page | German landing page | Conversion | Partner URL required |
| --- | --- | --- | --- | --- |
| SCHUFA check | `/bg/angebote/schufa` | `/de/angebote/schufa` | `affiliate_click` / `schufa` | Awin-approved meineSCHUFA deeplink |
| Consumer credit | `/bg/angebote/credit` | `/de/angebote/credit` | `affiliate_click` / `credit` | CHECK24 Kredit deeplink |
| Kfz insurance | `/bg/angebote/kfz` | `/de/angebote/kfz` | `affiliate_click` / `kfz` | existing Kfz affiliate deeplink |
| Electricity & gas | `/bg/angebote/energy` | `/de/angebote/energy` | `affiliate_click` / `energy` | existing electricity/gas calculator or deeplink |

All production URLs use `https://www.finanzberaterbg.de` before the paths above.

## Required activation before paid traffic

1. In Vercel, configure the exact approved URLs as production environment variables:
   - `AFFILIATE_SCHUFA_URL`
   - `AFFILIATE_CREDIT_URL`
   - `AFFILIATE_KFZ_URL`
   - `AFFILIATE_ENERGY_URL`
2. Redeploy production.
3. Open each landing page. Click its CTA and verify the final destination is the authorised partner URL, including the affiliate network’s own tracking parameters.
4. In the partner dashboard, confirm a test click appears. Do not assume that a general CHECK24 or provider URL earns commission.
5. Add each Facebook ad’s UTM parameters only to the landing-page URL, for example: `?utm_source=facebook&utm_medium=paid_social&utm_campaign=schufa_bg_de&utm_content=video_a`. The partner deeplink is not modified by the site.

## Slack handoff to the marketing team

Create one channel, `#finanzbg-affiliate-launch`, then post one task per campaign using this format:

```text
Campaign: SCHUFA check / BG audience in Germany
Landing: https://www.finanzberaterbg.de/bg/angebote/schufa
Goal: qualified partner click, not a promised score improvement
Primary message: Check your data before applying for housing or credit.
Required creatives: 3 static images + 2 short videos, each with BG headline and DE subtitle variant.
Forbidden claims: guaranteed credit, score repair, “free SCHUFA report” unless the exact linked offer is free.
Tracking URL: add Facebook UTM values to the landing URL.
Success metric: landing-page view → affiliate_click; later reconcile with approved partner transactions.
Owner / deadline: [assign]
```

Duplicate it for credit, Kfz and energy, replacing the product-specific message:

| Campaign | Primary message | Claims to avoid |
| --- | --- | --- |
| Credit | Compare possible instalment loans after you understand amount and monthly rate. | “Easy approval”, “credit despite any SCHUFA”, an interest rate before the partner shows it. |
| Kfz | Check price, cover and excess before switching your Kfz insurance. | Guaranteed saving or a price without an individual quote. |
| Energy | Use annual consumption and postal code to compare energy tariffs. | Guaranteed saving or “always the cheapest tariff”. |

## Reporting cadence

Every week, marketing reports spend, landing-page views, `affiliate_click` events and cost per affiliate click. Every month, reconcile these figures with partner clicks, pending transactions, approved transactions, cancelled transactions and payout. Revenue is counted only after the partner has approved the transaction.
