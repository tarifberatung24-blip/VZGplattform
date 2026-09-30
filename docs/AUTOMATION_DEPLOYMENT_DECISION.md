# Automation Deployment Decision

## Decision

HORIZON uses **Activepieces Cloud** as its automation/orchestration service,
and only as an **internal operational service**.

It is not a customer-facing product, and it must not be used to host
client-owned workspaces or client credentials without a fresh licensing and
DPA review.

## Why Activepieces Cloud rather than self-hosted n8n

| Consideration | Activepieces Cloud | Self-hosted n8n Community |
|---|---|---|
| Fixed infrastructure cost | none (hosted tier) | server + dedicated PostgreSQL |
| Secrets to manage | one webhook URL + one shared secret | `N8N_ENCRYPTION_KEY`, DB credentials, TLS, backups |
| Operational surface | vendor-hosted | VZG-hosted, must be patched and monitored |
| Fit for the v1 need (webhook to notify to manual work) | sufficient | more than needed |

The v1 need is a bounded intake fan-out: receive a signed payload, notify a
human, and track a manual status. A hosted orchestrator covers this without VZG
operating another stateful service.

## Provider-neutrality requirement

The application must never hard-code the vendor:

- the only vendor-specific values are `AUTOMATION_WEBHOOK_URL` and
  `AUTOMATION_WEBHOOK_SECRET`;
- request/response codes use the `AUTOMATION_WEBHOOK_*` prefix;
- the shared secret travels in `X-Horizon-Webhook-Secret`, a HORIZON header,
  not a vendor header;
- the flow name is `horizon_offer_request_v1`.

Swapping the orchestrator is therefore a configuration change, not a code
change. Any future proposal to reintroduce a vendor name into application code
should be rejected.

## Scope limits

Activepieces is for bounded orchestration only:

- approved webhooks
- notifications
- email workflow coordination
- delivery-status handling
- scheduled follow-ups

It must never bypass application authorization, RLS, or user approval, and it
must never be the system of record for customer data.

## Compliance boundary

Activepieces is **not yet configured in production**. Until it is deployed and
a DPA/transfer review is complete, HORIZON legal text must not claim an active
automation processor, a concrete retention period, or a hosting location for it.
The current privacy text therefore refers to an unnamed external automation
service and states that none is active.

## Deployment shape (when activated)

1. One Activepieces Cloud project dedicated to VZG operations.
2. One flow: `horizon_offer_request_v1`.
3. Webhook URL and shared secret stored as deployment secrets only.
4. Manual status tracking lives in the orchestrator until a HORIZON callback
   endpoint and storage table exist (see `docs/AUTOMATION_OFFER_REQUEST_PLAN.md`).

## Open item

The inbound half of the loop (callback from the orchestrator to HORIZON) is not
implemented. See the "Callback - NOT YET IMPLEMENTED" section of
`docs/AUTOMATION_OFFER_REQUEST_PLAN.md`. Until it exists, HORIZON cannot show a
request status to the customer, and a failed webhook delivery loses the request
because nothing is persisted.
