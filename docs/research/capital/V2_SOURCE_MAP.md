# VZG Capital Source Map V2

**Status:** research-only reference pack. No application code, schema, migration, environment, or deployment changes are implied.

**Research date:** 2026-09-18. GitHub commits are point-in-time pins and mutable branches must not be treated as permanent releases.

## DIN 77230:2026-03

**SOURCE** — DIN 77230:2026-03, *Basic financial analysis for private households / Basis-Finanzanalyse für Privathaushalte*. Official DIN Media record marks the edition current; publication 2026-03, 89 pages, DOI `10.31030/3668744`. It replaces DIN 77230:2023-12.

**VERSION/COMMIT** — `DIN 77230:2026-03`; no repository commit exists. The authoritative pin is the publication designation and DOI.

**LICENSE** — Copyright-protected DIN/DIN Media standard. A normal electronic purchase is not an open-source license and generally covers one person/workstation. Reproduction, systematic extraction, external provision, adaptation, or redistribution requires the applicable permission/license.

**AI/REUSE RIGHTS** — Do not ingest the standard into an AI system, training corpus, prompt library, vector database, RAG index, or automated extraction pipeline without a separately confirmed DIN Media AI license. Independent paraphrase of high-level concepts disclosed in official metadata is the conservative boundary. No claim of DIN compliance, certification, endorsement, or affiliation may be made.

**USEFUL COMPONENTS** — Independently model a household fact-intake workflow; high-level domains of protection, provision, and wealth planning; explicit goals and priorities; transparent quantitative actual-vs-target analysis; and a separate boundary between quantitative analysis and qualitative/product recommendation.

**DO NOT USE** — Standard text, tables, formulas, thresholds, examples, definitions, distinctive wording, detailed rules, product-class lists, or unverified lifecycle rules. Do not silently implement the superseded 2023 structure or import assumptions from the standard.

**VZG MAPPING** — Household facts → `FinancialFact` intake; protection/provision/wealth planning → domain sections; goals/priorities → goal and priority records; actual-vs-target → deterministic analysis output; recommendation → separate advisor-reviewed layer. Lifecycle mapping remains an independent VZG extension, not attributed to DIN.

**INTEGRATION PRIORITY** — `P0` for an independently authored, auditable facts and quantitative-analysis framework. `DO_NOT_INTEGRATE` for standard-text ingestion until DIN Media licensing is confirmed.

**Official verification:** [DIN Media](https://www.dinmedia.de/en/standard/din-77230/398255626), [DOI](https://dx.doi.org/10.31030/3668744), [DIN AI guidance](https://support.dinmedia.de/en/support/solutions/articles/80001170855-import-and-use-of-standards-in-chatgpt-and-ai), [DIN 2026 GTC](https://www.dinmedia.de/en/general-terms-and-conditions-new-2026).

## DIN 77223:2022-07

**SOURCE** — DIN 77223:2022-07, *Financial services — Risk profiling of private investors — Comparison of the total assets and purpose-related asset components*. Official record: German original, 32 pages, DOI `10.31030/3354568`.

**VERSION/COMMIT** — `DIN 77223:2022-07` is the current edition identified in the reviewed official record. It replaces DIN SPEC 77223:2016-02. No public repository or commit exists.

**LICENSE** — Copyright-protected DIN standard. A single-workstation purchase does not grant reproduction in software, public APIs, websites, prompts, datasets, or SaaS. Permission and exact commercial terms must be obtained from DIN Media.

**AI/REUSE RIGHTS** — No AI-training, embedding, automated-extraction, dataset-publication, or derivative-implementation permission was found. Do not upload the standard to an AI system or claim DIN conformity without written permission and legal review.

**USEFUL COMPONENTS** — Keep objective risk-bearing capacity, knowledge/experience, and subjective risk tolerance as separate inputs. Add purpose-specific context such as objective, amount, duration, and liquidity. Compare the profile with the risk structure of total assets and purpose-related assets. Use a neutral capture → preparation/derivation → result presentation workflow.

**DO NOT USE** — Normative text, questionnaires, matrices, risk classes, scoring, thresholds, result layouts, examples, formulas, or claims of DIN conformity. Do not infer a legally mandated monitoring cadence or lifecycle from public metadata.

**VZG MAPPING** — Capacity → objective financial-resource/risk-structure facts; knowledge/experience → evidence-backed experience facts; tolerance → separate self-report; purpose context → goal, amount, horizon, liquidity; mismatch → neutral comparison result. Ongoing lifecycle, reassessment triggers, and retention are independent VZG design decisions.

**INTEGRATION PRIORITY** — `P1` for an independently worded risk-profile schema and comparison interface. `DO_NOT_INTEGRATE` for normative scoring/matrices until licensed and reviewed.

**Official verification:** [DIN Media](https://www.dinmedia.de/en/standard/din-77223/354206536), [DOI](https://dx.doi.org/10.31030/3354568), [DIN copyright guidance](https://support.dinmedia.de/en/support/solutions/articles/80000653476-standards-and-copyright).

## Actual Budget

**SOURCE** — [actualbudget/actual](https://github.com/actualbudget/actual), official repository and documentation. It is a local-first personal-finance system.

**VERSION/COMMIT** — `5a131c7c8821ab09a04d66226f06b616b9b2c605`, `master` HEAD verified 2026-09-18; repository package version at that commit is `0.0.1`, not a verified product release.

**LICENSE** — MIT, verified from the repository `LICENSE.txt` at the pinned commit. Third-party dependencies, bank data, trademarks, and hosted services remain separately governed.

**AI/REUSE RIGHTS** — Ordinary MIT code reuse is permitted with notice retention. No separate AI-training or data-use grant was established. Do not extend the MIT grant to bank data, third-party dependencies, or live provider responses.

**USEFUL COMPONENTS** — On-budget/off-budget accounts; transaction registers, linked transfers, splits, reconciliation, import and export; recurring schedules with approval/auto-post modes; cash-flow reporting; net-worth reporting across assets/debts; CSV, QIF, OFX, QFX, and CAMT import; imported-id and similarity-based duplicate reconciliation; local browser/desktop storage, optional self-hosting, backups, and optional E2EE with documented bank-token limits.

**DO NOT USE** — No public HTTP/REST API is exposed. Do not promise universal bank connectivity, encryption of bank-sync tokens, market valuation, tax treatment, investment advice, or durable browser storage without backups. `addTransactions` intentionally does not deduplicate; use import semantics only where appropriate.

**VZG MAPPING** — Account graph → household financial accounts; import/reconciliation → provenance-backed transaction ingestion; recurring schedules → recurring obligations/income; cash flow → deterministic cash-flow view; net worth → explicit asset/liability layer rather than silently treating all accounts as equivalent. Prefer a local-file or official Node API adapter, not a REST connector.

**INTEGRATION PRIORITY** — `P1` for architecture patterns and import reconciliation; `P2` for an optional isolated adapter. `DO_NOT_INTEGRATE` as a direct HTTP/REST service.

**Official verification:** [repository](https://github.com/actualbudget/actual), [pinned commit](https://github.com/actualbudget/actual/commit/5a131c7c8821ab09a04d66226f06b616b9b2c605), [accounts](https://actualbudget.org/docs/accounts/), [imports](https://actualbudget.org/docs/transactions/importing/), [API](https://actualbudget.org/docs/api/).

## BlackRock AladdinSDK

**SOURCE** — [blackrock/aladdinsdk](https://github.com/blackrock/aladdinsdk), official public repository. This is architecture reference only; no VZG entitlement or access is established.

**VERSION/COMMIT** — `3829ea2f38d0b0d09d4cf9c6e68cff7fb9e16e44`, `main` HEAD verified 2026-09-18. No stable release tag at this exact HEAD; `2.0.0-beta10` is the closest prior tag.

**LICENSE** — Apache License 2.0 for the source work, subject to attribution, modified-file notices, redistribution conditions, patent clause, third-party terms, and trademark exclusions. It does not grant rights to Aladdin APIs, data, services, or trademarks.

**AI/REUSE RIGHTS** — No AI-specific grant was found. Source-code reuse is governed by Apache-2.0; proprietary data, services, generated artifacts, plugins, and live responses require separate review.

**USEFUL COMPONENTS** — OpenAPI API registry; installed-plugin discovery with an allowlist; configuration precedence from defaults → user file → environment nesting → inline parameters; OAuth/basic auth and operation scopes; secret-file/keyring patterns; request IDs and origin timestamps; configurable retry, fixed-window rate limits, long-running-operation polling, pagination, and ADC/Snowflake adapter concepts.

**DO NOT USE** — Do not call this a VZG integration, provider entitlement, sandbox, security boundary, or generic Data Cloud adapter. The plugin allowlist imports trusted code into the process and does not prove signing, sandboxing, or least privilege. Do not infer service quotas, API availability, or scope grants.

**VZG MAPPING** — Use only generic patterns: capability registry, provider adapters behind explicit gates, correlation IDs, bounded retry, rate-limit policy, LRO state machine, pagination, and secret isolation. Implement VZG auth, permissions, providers, and audit semantics independently.

**INTEGRATION PRIORITY** — `P0` architecture reference only; `DO_NOT_INTEGRATE` live Aladdin service until entitlement, contract, security, and legal review exist. `P1` only for mock contract tests if an approved VZG API is later supplied.

**Official verification:** [pinned commit](https://github.com/blackrock/aladdinsdk/commit/3829ea2f38d0b0d09d4cf9c6e68cff7fb9e16e44), [README](https://github.com/blackrock/aladdinsdk/blob/3829ea2f38d0b0d09d4cf9c6e68cff7fb9e16e44/README.md), [license](https://github.com/blackrock/aladdinsdk/blob/3829ea2f38d0b0d09d4cf9c6e68cff7fb9e16e44/LICENSE).

## AladdinSDK Plugin Builder

**SOURCE** — [blackrock/aladdinsdk-plugin-builder](https://github.com/blackrock/aladdinsdk-plugin-builder), official repository and bundled Swagger specifications.

**VERSION/COMMIT** — `73df174eabc2fe50f58f9127f639d3ec5e346ae1`, also tag `2.0.0-beta.3`; builder package version is `0.0.1a1` and is distinct from the tag.

**LICENSE** — Apache License 2.0. Preserve notices and modified-file attribution; no trademark or product-name rights are granted.

**AI/REUSE RIGHTS** — No AI-specific permission was found. Generated clients, Swagger specifications, dependencies, and API responses may have additional terms. Treat the material as architecture/data-model reference unless independently cleared.

**USEFUL COMPONENTS** — Versioned API bundles and registry manifests; stable IDs and revision/effective dates; paginated lists; action endpoints; update masks; per-item RPC status; risk configuration/rules/exceptions/tasks/workflows; evaluator analytics; strategy and cash-ladder interfaces; portfolio hierarchy; compliance rules/levels/violations; users, groups, and permissions; dataset registration, facets, schema metadata, reconcile/refresh/release, and long-running operations.

**DO NOT USE** — Do not infer live endpoints, tenant access, SLA, quotas, financial advice, risk/compliance outcomes, or generic portfolio semantics. Do not copy BlackRock branding or claim affiliation.

**VZG MAPPING** — Independently design a capability registry, versioned rule/config records, effective dates, workflow states, per-item errors, approval/audit transitions, group-mediated permissions, dataset provenance, and explicit as-of dates. Do not copy API names or semantics as if they were VZG contracts.

**INTEGRATION PRIORITY** — `P1` for registry/control-plane patterns after contract review; `P2` for isolated read-only mock adapters; `DO_NOT_INTEGRATE` live APIs without entitlement and security review.

**Official verification:** [pinned commit](https://github.com/blackrock/aladdinsdk-plugin-builder/tree/73df174eabc2fe50f58f9127f639d3ec5e346ae1), [release tag](https://github.com/blackrock/aladdinsdk-plugin-builder/releases/tag/2.0.0-beta.3), [README](https://raw.githubusercontent.com/blackrock/aladdinsdk-plugin-builder/73df174eabc2fe50f58f9127f639d3ec5e346ae1/README.md), [license](https://raw.githubusercontent.com/blackrock/aladdinsdk-plugin-builder/73df174eabc2fe50f58f9127f639d3ec5e346ae1/LICENSE).

## QuantLib

**SOURCE** — [QuantLib/QuantLib](https://github.com/lballabio/QuantLib), official repository.

**VERSION/COMMIT** — `b8744affb015a5286136e5df2042d75a2f4f8d86`, exact live HEAD verified 2026-09-18; source declares `1.44-dev`, not a stable release.

**LICENSE** — Modified BSD / 3-Clause BSD. Preserve copyright, conditions, disclaimers, and bundled third-party notices. No endorsement rights are granted.

**AI/REUSE RIGHTS** — No AI-specific terms were found. Ordinary source/binary permissions apply subject to BSD conditions and file-level third-party notices; this is not a model-training or data-rights grant.

**USEFUL COMPONENTS** — Deterministic date/calendar/day-count/schedule logic; discount, zero, forward, flat, and interpolated yield curves; volatility and credit term structures; cash flows; bonds, prices/yields and duration-style analytics; deterministic discounting and plain-vanilla pricing engines; interpolation, solvers, integration, distributions, linear algebra, and optimization.

**DO NOT USE** — Do not copy stochastic/Monte Carlo/experimental modules for the deterministic-only first slice. Do not infer market-data quality, calibration correctness, regulatory approval, suitability, or production controls. Do not treat development HEAD as a stable release.

**VZG MAPPING** — Optional narrow Quant Engine adapter: date/convention layer → curve construction → cash-flow/discounting calculations → independent golden tests. Keep assumptions, market inputs, model version, and output provenance explicit.

**INTEGRATION PRIORITY** — `P2` optional future provider after release pin, license review, model validation, and dependency/security review.

**Official verification:** [pinned commit](https://github.com/lballabio/QuantLib/commit/b8744affb015a5286136e5df2042d75a2f4f8d86), [license](https://github.com/lballabio/QuantLib/blob/b8744affb015a5286136e5df2042d75a2f4f8d86/LICENSE.TXT), [official site](https://www.quantlib.org/).

## PyPortfolioOpt

**SOURCE** — [PyPortfolio/PyPortfolioOpt](https://github.com/PyPortfolio/PyPortfolioOpt), official repository and documentation.

**VERSION/COMMIT** — `a6638d2e06dae6f444fd022cfd4b3c528902a85b`, `main`/HEAD, source version `1.6.0`.

**LICENSE** — MIT. Preserve notice and permission text. Dependencies, market data, trademarks, and hosted services remain separate.

**AI/REUSE RIGHTS** — No AI-specific rights were found. The investment-advice disclaimer and uncertain expected-return behavior are material; the package is not a source of market data or advice.

**USEFUL COMPONENTS** — Mean-variance and downside efficient frontiers; HRP; Black-Litterman; expected-return models; covariance/risk models; shrinkage and PSD fixes; long/short/market-neutral and group constraints; custom objectives; CLA; discrete allocation utilities.

**DO NOT USE** — Do not treat expected returns as guarantees, optimizer output as advice, or the library as a broker/execution service. Do not invent risk-free rate, risk aversion, tau, views, benchmark, covariance, or constraints. Do not assume every objective/constraint combination is valid.

**VZG MAPPING** — Optional offline optimization adapter after an explicit input contract: validated `FinancialFact` snapshots → expected-return/risk model → constrained optimizer → reproducible weights plus assumptions and warnings. No execution path.

**INTEGRATION PRIORITY** — `P2` optional future provider, isolated from the core deterministic household engine and subject to Python/solver/dependency review.

**Official verification:** [pinned commit](https://github.com/PyPortfolio/PyPortfolioOpt/commit/a6638d2e06dae6f444fd022cfd4b3c528902a85b), [license](https://raw.githubusercontent.com/PyPortfolio/PyPortfolioOpt/a6638d2e06dae6f444fd022cfd4b3c528902a85b/LICENSE), [documentation](https://pyportfolioopt.readthedocs.io/en/latest/).

## Riskfolio-Lib

**SOURCE** — [dcajasn/Riskfolio-Lib](https://github.com/dcajasn/Riskfolio-Lib), official repository and documentation.

**VERSION/COMMIT** — `632a9e48fbaf2b9f8e83864a492332364b6ed32c`, `master` HEAD, package version `7.3.0`.

**LICENSE** — BSD 3-Clause. Preserve copyright, conditions, disclaimers, and no-endorsement condition. Solvers and dependencies have separate terms.

**AI/REUSE RIGHTS** — No AI-specific terms were found. Ordinary BSD permissions do not grant rights to third-party data, hosted services, or model training.

**USEFUL COMPONENTS** — Mean-risk and Kelly optimization; CVaR, EVaR, Tail Gini, drawdown, ulcer, and other risk measures; risk parity/budgets; HRP/HERC/NCO; Black-Litterman, factor models, Entropy Pooling; higher moments; turnover/tracking-error/leverage/cardinality/factor constraints; uncertainty sets and risk attribution.

**DO NOT USE** — Do not treat it as market data, execution, hosted API, or financial advice. Do not assume solver rights, numerical stability, or one stable API across all features. Pin the environment and test exact solver behavior. The official docs contain a count discrepancy for efficient-frontier measures; do not repeat an unverified count.

**VZG MAPPING** — Optional future Quant Engine extension for offline risk analytics, scenario views, factor attribution, and constrained optimization. Keep it behind a provider adapter with pinned environment, reproducibility tests, and no automatic customer recommendation or execution.

**INTEGRATION PRIORITY** — `P2` optional future provider; first use should be isolated/offline. Requires solver licensing, numerical validation, dependency security review, and explicit VZG contracts.

**Official verification:** [pinned commit](https://github.com/dcajasn/Riskfolio-Lib/commit/632a9e48fbaf2b9f8e83864a492332364b6ed32c), [license](https://raw.githubusercontent.com/dcajasn/Riskfolio-Lib/632a9e48fbaf2b9f8e83864a492332364b6ed32c/LICENSE.txt), [documentation](https://riskfolio-lib.readthedocs.io/en/latest/).

## Cross-source prohibitions

- No fake Aladdin service, fake provider data, fake quotes, fake market prices, fake benchmark responses, or fake BlackRock affiliation.
- No DIN standard ingestion, copied normative content, or DIN-conformity claims without explicit licensing and legal review.
- No AI-generated financial mathematics, personalized investment recommendations, trading, order execution, or account actions.
- No external-provider credentials in source, prompts, logs, browser code, or customer records.
- No source is evidence that VZG has access to any external API, tenant, entitlement, or data set.
