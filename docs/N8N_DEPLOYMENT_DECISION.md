# n8n Deployment Decision

Status: APPROVED FOR IMPLEMENTATION  
Date: 2026-09-24  
Scope: HORIZON by VZG internal workflow orchestration

## Decision

HORIZON will use **self-hosted n8n Community Edition** as an **internal orchestration service only**.

n8n must not be exposed as a customer-facing editor/product and must not be used to host client-owned n8n workspaces or credentials without a fresh licensing review.

## Target infrastructure

- Provider: Hetzner Cloud
- Region: Germany, preferably NBG1 or FSN1
- Initial server: CX23
- Capacity: 2 vCPU, 4 GB RAM, 40 GB NVMe
- Deployment: Coolify + Docker
- n8n database: dedicated PostgreSQL instance/database for n8n state
- Timezone: Europe/Berlin
- TLS: HTTPS only
- Public exposure: webhook endpoint only where required; editor/admin interface restricted
- Secrets: N8N_ENCRYPTION_KEY and all provider/API credentials stored as deployment secrets
- Backups: scheduled database + persistent-volume backups
- Execution data: pruning enabled; retention kept to the minimum operationally required

## Why this option

1. Keeps workflow payloads under VZG-controlled EU/German infrastructure.
2. Lowest predictable operating cost for the current workload.
3. Sufficient starting capacity for HORIZON's internal automations and easy vertical scaling later.
4. Avoids adding n8n Cloud as another production processor before it is needed.
5. Fits the planned Coolify/Hetzner operating model.

## Current cost basis

Hetzner's price adjustment effective 15 June 2026 lists CX23 in Germany/Finland at **€6.53/month incl. 19% VAT**, excluding optional IPv4.

## Licensing boundary

Community Edition is selected for HORIZON's own internal business automation. Before any future model where external customers receive direct n8n functionality, or VZG hosts/manages client-owned workflows or client credentials inside the VZG n8n instance, licensing must be re-checked with n8n.

## Privacy / legal state

n8n is **not yet deployed or configured in production**. Until deployment exists, HORIZON legal/privacy text must not claim an active n8n processor, concrete n8n retention period, or n8n hosting location.

When deployed, the privacy data map must be updated with:
- Hetzner as infrastructure provider
- exact server location
- PostgreSQL/storage location
- workflow categories that process personal data
- retention/pruning policy
- backup retention
- any external processors called by workflows

## Initial implementation boundary

Phase 1 deployment should be single-node n8n + PostgreSQL. Do not introduce Redis/queue-mode or multi-worker scaling until measured workload requires it.
