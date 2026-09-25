# Layer 0 & Service Landing Page Architecture

Status: PLANNED / owner-approved concept. Documentation only; no route, UI, backend or affiliate behavior is changed by this document.

## Product decision

The public acquisition and affiliate experience stays **inside VZGplattform / HORIZON by VZG**. We do **not** build a second standalone affiliate site.

AI agents, social posts and campaigns should share the canonical landing pages that already belong to the platform. Those pages then guide the visitor to the appropriate product flow and, where approved, to the existing affiliate redirect layer.

## Layer 0 direction

Layer 0 must evolve from a short static entry page into a **scrollable, useful public information surface**.

The page should:

- explain clearly what HORIZON by VZG does;
- contain useful educational content instead of only marketing copy;
- introduce the main service categories;
- provide clear paths to dedicated service landing pages;
- remain simple enough for a first-time visitor to understand without financial or insurance knowledge;
- support the multilingual acquisition strategy and SEO;
- act as the canonical page an AI agent can recommend/share instead of sending users to a separate mini-site.

Layer 0 remains the public entry point. Deep product education and conversion happen on dedicated service pages.

## Dedicated service landing pages

Each important service gets its **own landing page inside the platform**.

Examples:

- Kfz-Versicherung
- Strom & Gas
- Ratenkredit
- Firmenversicherung
- future approved partner services

Existing route families such as `/{locale}/angebote/kfz`, `/{locale}/angebote/business-insurance` and `/{locale}/angebote/[offer]` should be extended rather than replaced.

## Standard service-page structure

Each service landing page should combine four layers:

### 1. Simple service explanation

Explain in plain language:

- what the product/service is;
- who normally needs it;
- what information is required;
- what happens before, during and after the comparison/application;
- what the platform does and what the external provider/insurer ultimately decides.

The copy must be understandable for users who do not know German tariff, insurance or contract terminology.

### 2. Innovative guided calculator / preparation tool

Where the service benefits from calculation or structured input, the landing page should include an easy guided calculator.

For **Kfz-Versicherung**, the calculator should:

- ask only understandable questions;
- explain why each value is needed;
- explain unfamiliar fields and abbreviations directly beside the input;
- help the user find the requested value where possible;
- make the process feel step-by-step rather than like a traditional dense comparison form;
- prepare the user before handing off to the approved partner comparison/offer flow.

The calculator must not invent prices or guarantees that only the insurer/partner can determine.

### 3. Educational content blocks

Below and around the calculator, add useful blocks that explain the difficult parts of the contract process.

For Kfz this can include, for example:

- Haftpflicht / Teilkasko / Vollkasko;
- Selbstbeteiligung;
- SF-Klasse;
- HSN / TSN;
- Versicherungsnehmer vs. Fahrer;
- Kündigungsfrist and switching timing;
- which details can influence the premium;
- what should be checked before the final contract is submitted.

The same pattern should be adapted to every other service.

### 4. Clear conversion path

The visitor should always understand the next action:

`Layer 0 → service landing page → guided explanation/calculator → approved partner flow`

Affiliate handoff continues through the existing canonical redirect mechanism (`/go/[offer]`) so approved deeplinks remain centrally controlled.

## AI-agent distribution

The AI agent should distribute/share the **platform landing pages**, not raw affiliate links and not a separate affiliate microsite.

Example:

`AI Agent → /bg/angebote/kfz → explanation + calculator → /go/kfz → approved partner`

This gives the user context before leaving the platform and lets the public content, SEO value and affiliate conversion path stay in one product.

## Multilingual + SEO requirement

The landing-page system is intended to be multilingual and SEO-oriented.

At minimum, every supported language version should keep:

- one canonical service intent per page;
- useful original explanatory content;
- clear internal links from Layer 0 and related services;
- consistent page titles/descriptions;
- language-specific copy rather than untranslated placeholders.

Technical SEO implementation (canonical/hreflang, structured data, sitemap and metadata) should be handled as an implementation phase, without creating duplicate competing sites.

## UX principle

The public side should feel less like a classic affiliate catalogue and more like an **AI-assisted explanation and preparation layer**.

Core rule:

> First help the user understand the service and the required data; only then send them to the tariff/partner flow.

## Relationship to current affiliate architecture

This plan extends the existing affiliate infrastructure; it does not replace it.

Current concepts to preserve:

- approved offers remain centrally configured;
- unconfigured/unapproved offers must not be presented as live partner products;
- partner deeplinks remain exact and centrally controlled;
- affiliate disclosure remains visible;
- no guessed tracking parameters are appended to partner links.

See also:

- `docs/AFFILIATE_LAUNCH_PLAN.md`
- `docs/FINAL_SITE_MAP.md`
- `lib/affiliate-offers.ts`
- `app/go/[offer]/route.ts`

## Initial implementation order

1. Expand Layer 0 into the scrollable public information/entry surface.
2. Define the reusable service-landing-page template.
3. Build Kfz-Versicherung as the first reference implementation.
4. Add its guided calculator + explanatory blocks.
5. Apply the same architecture to the next approved services.
6. Add/verify multilingual SEO and internal-linking rules.
7. Configure AI-agent sharing to use the canonical platform landing URLs.

Kfz is the reference page because it demonstrates the full model: explanation → guided inputs → education → tariff/partner handoff.
