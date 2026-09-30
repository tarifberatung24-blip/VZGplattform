# HORIZON Offer Request — Automation Plan

## Decision

For the first revenue-focused integration, FinanzBG stops using complex AI document processing as the primary intake path.

The first working product is:

```text
Facebook ad / landing page
→ short conversational request
→ automation webhook (Activepieces)
→ manual offer preparation
→ customer receives offer or a clear follow-up question within 2 hours
→ chatbot explains the prepared offer after it exists
→ customer signs or uploads files in the client panel
```

This keeps the service operational while the platform matures. AI remains useful as an explanation layer after a human-prepared offer exists. It must not invent prices, approvals, savings, or contract conclusions.

## Active Intake Routes

| Area | Public BG route | Public DE route | Service key | Current destination |
|---|---|---|---|---|
| Ток / Газ | `/bg/zayavka?service=energy` | `/de/anfrage?service=energy` | `energy` | `/api/service-requests` → automation webhook |
| Kfz застраховка | `/bg/zayavka?service=kfz` | `/de/anfrage?service=kfz` | `kfz` | `/api/service-requests` → automation webhook |
| Потребителски кредит | `/bg/zayavka?service=credit` | `/de/anfrage?service=credit` | `credit` | `/api/service-requests` → automation webhook |
| SCHUFA | `/bg/zayavka?service=schufa` | `/de/anfrage?service=schufa` | `schufa` | `/api/service-requests` → automation webhook |

## Information Collection

The form asks one question group at a time. The goal is to collect enough information for a human to act, not to complete every possible insurance or bank field.

| Area | Minimum data | Helpful extra | Manual action |
|---|---|---|---|
| Ток / Газ | PLZ, yearly consumption, Strom/Gas/Both | current provider, monthly payment, deadline | check tariff calculator / broker system and send offer |
| Kfz | car or HSN/TSN, desired coverage | SF class, start date, existing policy | prepare comparison and clarify missing vehicle data |
| Credit | amount, income, employment status, SCHUFA expectation | term, purpose, existing obligations | decide whether to send CHECK24 partner path or request more data |
| SCHUFA | purpose, urgency, existing report status | rental/credit/general context | send the right SCHUFA path or explain next step |

## Activepieces Flow v1

One Activepieces flow named `horizon_offer_request_v1`.

| Step | Node | Purpose |
|---|---|---|
| 1 | Webhook | Receive `POST` payload from FinanzBG |
| 2 | Header auth / IF | Check `X-Horizon-Webhook-Secret` |
| 3 | Edit Fields | Normalize customer, service, SLA, answers |
| 4 | IF by `request.kind` | Route to Energy, Kfz, Credit, SCHUFA branch |
| 5 | Slack | Post a task in the operational channel |
| 6 | Email / Gmail / SMTP | Send receipt to the customer |
| 7 | Manual work | Owner prepares offer in partner/broker tools |
| 8 | Email / client panel link | Send offer or missing-info request |
| 9 | Status update | Mark queued, in_review, sent, waiting_customer, closed |

The flow must be active before `AUTOMATION_WEBHOOK_URL` is configured in the site environment.

## Callback — NOT YET IMPLEMENTED

The intended full loop is:

```text
HORIZON → automation webhook → manual work → callback to HORIZON
```

**Only the outbound half exists today.** `/api/service-requests` returns `202`
with a `requestId`, but there is no endpoint that accepts a status callback and
no storage table for request status. Consequences:

- the customer-facing status of a request cannot currently be shown in HORIZON;
- the operator marks status inside the orchestrator, not in the platform;
- `/api/service-requests` does not persist the request at all — it only
  forwards it. If webhook delivery fails, the request is lost.

This is an open gap, not delivered functionality. Closing it needs a new
endpoint, a storage table, and an owner-approved design for inbound
authentication. Do not describe the loop as complete until that exists.

## Payload Contract

The site sends:

```json
{
  "requestId": "hz_uuid",
  "workflow": {
    "name": "horizon_offer_request_v1",
    "mode": "manual_offer_preparation",
    "slaMinutes": 120,
    "promisedResponseBy": "ISO_DATE"
  },
  "request": {
    "kind": "energy",
    "locale": "bg",
    "source": "service_request_wizard",
    "landingUrl": "https://www.finanzberaterbg.de/bg/zayavka?service=energy",
    "referrer": "https://www.finanzberaterbg.de/bg/produkte",
    "userAgent": "browser",
    "receivedAt": "ISO_DATE"
  },
  "customer": {
    "name": "Customer Name",
    "email": "customer@example.com",
    "phone": "+49..."
  },
  "answers": {
    "energyType": "strom",
    "postcode": "60311",
    "annualConsumption": "2500"
  },
  "compliance": {
    "customerConsent": true,
    "noAutomatedDecision": true,
    "noGuaranteedPriceOrApproval": true
  }
}
```

## Slack / Eve Team Operating Plan

Create or reuse one channel:

```text
#horizon-offer-desk
```

Slack task format:

```text
NEW OFFER REQUEST: {{requestId}}
Service: {{request.kind}}
SLA: {{workflow.promisedResponseBy}}
Customer: {{customer.name}} / {{customer.email}} / {{customer.phone}}
Landing: {{request.landingUrl}}

Answers:
{{answers}}

Next manual action:
1. Check required data.
2. Prepare offer or missing-info question.
3. Send answer to customer.
4. Mark status.
```

Marketing/Eve Team should use the public landing URLs as campaign destinations. Do not send paid traffic directly to raw affiliate links in this phase.

## Claim Rules

| Area | Allowed claim | Forbidden claim |
|---|---|---|
| Energy | "До 2 часа ще получиш оферта или ясен отговор." | "Гарантирано спестяване" |
| Kfz | "Ще проверим цена, покритие и самоучастие." | "Винаги най-евтината застраховка" |
| Credit | "Ще подготвим реалистична кредитна заявка." | "Лесно одобрение" or "кредит гарантирано" |
| SCHUFA | "Ще ти покажем коя справка е подходяща." | "Ще поправим SCHUFA резултата" |

## Paid Services After v1

Paid services should start only after the first offer request flow is stable. Suggested paid services:

| Paid service | Scope | Suggested trigger |
|---|---|---|
| Vertragswechsel Begleitung | manual help with switching tariff/insurance | customer accepts offer |
| Dokumentenservice | customer uploads unclear document and requests explanation | missing document or confusing bill |
| Kündigungsservice Vorbereitung | prepare cancellation letter and next steps | customer has deadline |
| Kredit-Vorcheck | manual checklist before partner application | credit request has enough data |

Each paid service needs its own price, legal boundary, delivery promise, and refund/cancellation rule before activation.

## Environment Variables

```bash
AUTOMATION_WEBHOOK_URL=https://your-activepieces.example/webhook/horizon-offer-request
AUTOMATION_WEBHOOK_SECRET=change-me
```

Affiliate deeplinks remain configured separately and should be activated after the manual workflow and paid-service layer are tested.
