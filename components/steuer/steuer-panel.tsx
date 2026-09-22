"use client"

import { useActionState } from "react"
import { selectSteuerYear, type SteuerYearState } from "@/lib/horizon/steuer/actions"
import { getSteuerCopy } from "@/lib/horizon/steuer/copy"
import {
  TAX_YEAR_AVAILABILITY,
  anlagenForConfirmedFacts,
  formSupportForTemplate,
  resolveTaxYear,
  steuerYearDefinition,
  supportedTaxYears,
  templateSupportsSignature,
} from "@/lib/horizon/steuer/registry"
import { findTemplateById } from "@/lib/horizon/pdf/registry"
import { readFormOutputSha } from "@/lib/horizon/pdf/manifest"
import type { CaseApproval, CaseDraft } from "@/lib/horizon/case/contract"

const initialState: SteuerYearState = { error: null, ok: false, taxYear: null }

type Fact = { key: string; value?: string | null; confirmedAt?: string | null }

/**
 * P15 — the Steuererklärung entry inside a case.
 *
 * Four jobs, and nothing more:
 *
 * 1. Let the user record which tax year the case is about. That selection is what
 *    makes the form set and the missing-information list year-specific, and an
 *    unsupported year is refused with its reason.
 * 2. Show only the forms verified for *that* year. A year with no verified set
 *    says so; it never shows another year's forms.
 * 3. List only the Anlagen activated by the user's *confirmed* facts.
 * 4. State plainly whether a signature placement is verified for each form, and
 *    that HORIZON has no ELSTER connection.
 *
 * It decides no eligibility, no threshold, no amount and no refund.
 */
export function SteuerPanel({
  caseId,
  locale,
  module,
  selectedYear,
  facts,
  drafts,
  approvals,
}: {
  caseId: string
  locale: string
  module: string
  selectedYear: number | null
  facts: readonly Fact[]
  drafts: readonly CaseDraft[]
  approvals: readonly CaseApproval[]
}) {
  const [state, action, pending] = useActionState(selectSteuerYear, initialState)
  const copy = getSteuerCopy(locale === "de" ? "de" : "bg")

  if (module !== "steuererklaerung") return null

  const years = supportedTaxYears()
  const definition = selectedYear !== null ? steuerYearDefinition(selectedYear) : null
  const anlagen = selectedYear !== null ? anlagenForConfirmedFacts(selectedYear, facts) : []
  const availableYears = TAX_YEAR_AVAILABILITY

  // The newest generated form draft: identified by the output hash its body
  // carries, so a letter draft in the same case is never mistaken for the form.
  const formDraft = drafts.find((draft) => readFormOutputSha(draft.body) !== null) ?? null
  const formApproval = formDraft
    ? (approvals.find((entry) => entry.draftId === formDraft.id) ?? null)
    : null
  // Download is offered only for the exact content that was approved.
  const downloadReady =
    formDraft !== null && formApproval !== null && formApproval.approvedHash === formDraft.contentHash

  const errorText =
    state.error === "unsupported_year"
      ? copy.errorUnsupportedYear
      : state.error === "unknown_year"
        ? copy.errorUnknownYear
        : state.error === "unauthorized"
          ? copy.errorUnauthorized
          : state.error === "case_not_found"
            ? copy.errorCaseNotFound
            : state.error
              ? copy.errorFailed
              : null

  return (
    <section className="rounded-md border border-border bg-card p-4 sm:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {copy.heading}
      </h2>
      <p className="mt-3 text-xs text-muted-foreground">{copy.intro}</p>

      {definition ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-primary">{copy.currentYear}</p>
            <p className="mt-1 text-sm font-medium">{definition.taxYear}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {copy.yearStates.supported}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold">{copy.formsHeading}</p>
            {definition.forms.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                {copy.noFormForYear}
              </p>
            ) : (
              <ul className="space-y-3">
                {definition.forms.map((form) => {
                  const template = findTemplateById(form.templateId)
                  // Re-read support from the registry rather than trusting the
                  // stored value, so the panel cannot claim fillability the
                  // engine would refuse.
                  const support = formSupportForTemplate(form.templateId)
                  const signable = templateSupportsSignature(form.templateId)
                  return (
                    <li key={form.templateId} className="space-y-1">
                      <p className="text-xs font-medium">
                        {template?.formName ?? form.templateId}
                        {template?.formId ? ` (${template.formId})` : ""}
                        {template?.version ? ` · ${template.version}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {support === "fillable" ? copy.formFillable : copy.formManualOnly}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {copy.signatureHeading}:{" "}
                        {signable ? copy.signatureAvailable : copy.signatureUnavailable}
                      </p>
                      {template ? (
                        <a
                          href={template.officialSource}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-block text-xs font-medium text-primary hover:underline"
                        >
                          {copy.formOpenLabel}
                        </a>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">{copy.formsBlankNote}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold">{copy.anlagenHeading}</p>
            {anlagen.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                {copy.anlagenNone}
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{copy.anlagenIntro}</p>
                <ul className="space-y-1">
                  {anlagen.map((anlage) => (
                    <li key={anlage.id} className="text-xs">
                      <a
                        href={anlage.officialSource}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-medium text-primary hover:underline"
                      >
                        {anlage.formName} ({anlage.formId})
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="space-y-1 border-t border-border pt-3">
            <p className="text-xs font-semibold">{copy.officialRouteHeading}</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <a
                href={definition.officialOnline.url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-primary hover:underline"
              >
                {copy.officialOnlineLabel}: {definition.officialOnline.label}
              </a>
              <a
                href={definition.officialFormsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-primary hover:underline"
              >
                {copy.officialFormsLabel}
              </a>
            </div>
            <p className="text-xs text-muted-foreground">{copy.noElsterNote}</p>
          </div>
        </div>
      ) : null}

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="caseId" value={caseId} />
        <input type="hidden" name="locale" value={locale} />

        <div>
          <label htmlFor="steuer-year" className="text-xs font-medium">
            {selectedYear !== null ? copy.changeYear : copy.chooseLabel}
          </label>
          <select
            id="steuer-year"
            name="taxYear"
            defaultValue={selectedYear !== null ? String(selectedYear) : String(years[0])}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          >
            {/* Only supported years are selectable. A year the authority has not
                published is shown as disabled with its state, so the refusal is
                visible before the user tries rather than after. */}
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year} · {copy.yearStates.supported}
              </option>
            ))}
            {availableYears
              .filter((entry) => entry.state !== "supported")
              .map((entry) => (
                <option key={entry.taxYear} value={String(entry.taxYear)} disabled>
                  {entry.taxYear} · {copy.yearStates[entry.state]}
                </option>
              ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? copy.choosePending : copy.choose}
        </button>
      </form>

      {state.ok && state.taxYear !== null ? (
        <p role="status" className="mt-2 text-xs text-primary">
          {copy.currentYear}: {resolveTaxYear(state.taxYear).ok ? state.taxYear : "—"}
        </p>
      ) : null}

      <div className="mt-3 space-y-1 border-t border-border pt-3">
        <p className="text-xs font-semibold">{copy.downloadHeading}</p>
        {downloadReady ? (
          <a
            href={`/api/horizon/cases/${caseId}/tax-form`}
            className="inline-block text-xs font-medium text-primary hover:underline"
          >
            {copy.downloadHeading}
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">{copy.downloadHint}</p>
        )}
      </div>

      {errorText ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {errorText}
        </p>
      ) : null}
    </section>
  )
}
