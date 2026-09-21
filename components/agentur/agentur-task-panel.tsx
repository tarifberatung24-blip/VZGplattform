"use client"

import { useActionState } from "react"
import { selectAgenturTask, type AgenturTaskState } from "@/lib/horizon/agentur/actions"
import { getAgenturCopy } from "@/lib/horizon/agentur/copy"
import { AGENTUR_TASKS, agenturTaskDefinition, isAgenturTask } from "@/lib/horizon/agentur/registry"
import { findTemplateById } from "@/lib/horizon/pdf/registry"

const initialState: AgenturTaskState = { error: null, ok: false }

/**
 * P12 — the Agentur-für-Arbeit entry inside a case.
 *
 * This panel does two things and claims nothing more:
 *
 * 1. It lets the user record which BA task the case is about, which is what makes
 *    the missing-information list task-specific.
 * 2. It shows the *current official route* for that task, online-first, with the
 *    authority's own links. Where the BA offers no paper form, the panel says so
 *    instead of offering an invented one.
 *
 * It does not decide eligibility, a deadline or an amount. Those depend on the
 * user's own evidence, which lives on the case, not in this component.
 */
export function AgenturTaskPanel({
  caseId,
  locale,
  module,
  selectedTask,
}: {
  caseId: string
  locale: string
  module: string
  selectedTask: string | null
}) {
  const [state, action, pending] = useActionState(selectAgenturTask, initialState)
  const copy = getAgenturCopy(locale === "de" ? "de" : "bg")

  if (module !== "agentur_fuer_arbeit") return null

  const current = selectedTask && isAgenturTask(selectedTask) ? selectedTask : null
  const definition = current ? agenturTaskDefinition(current) : null

  const errorText =
    state.error === "unauthorized"
      ? copy.errorUnauthorized
      : state.error === "unknown_task"
        ? copy.errorUnknownTask
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
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-primary">{copy.currentTask}</p>
            <p className="mt-1 text-sm font-medium">{copy.tasks[definition.task].title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {copy.routeLabel}: {copy.routeKinds[definition.routeKind]}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            {definition.official.onlineUrl ? (
              <a
                href={definition.official.onlineUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-primary hover:underline"
              >
                {copy.onlineLabel}
                {definition.official.onlineLabel ? `: ${definition.official.onlineLabel}` : ""}
              </a>
            ) : null}
            <a
              href={definition.official.infoUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-primary hover:underline"
            >
              {copy.infoLabel}
            </a>
            {definition.official.phoneNote ? (
              <span className="text-muted-foreground">
                {copy.phoneLabel}: {definition.official.phoneNote}
              </span>
            ) : null}
          </div>

          {definition.forms.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
              {copy.noPaperForm}
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold">{copy.formHeading}</p>
              {definition.forms.map((form) => {
                const template = findTemplateById(form.templateId)
                return (
                  <div key={form.templateId} className="space-y-1">
                    <p
                      className={
                        form.support === "fillable"
                          ? "text-xs text-primary"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {form.support === "fillable" ? copy.formFillable : copy.formManualOnly}
                    </p>
                    {template ? (
                      <a
                        href={template.officialSource}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-block text-xs font-medium text-primary hover:underline"
                      >
                        {template.formId
                          ? `${copy.formOpenLabel}: ${template.formName} (${template.formId})`
                          : `${copy.formOpenLabel}: ${template.formName}`}
                      </a>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="caseId" value={caseId} />
        <input type="hidden" name="locale" value={locale} />

        <div>
          <label htmlFor="agentur-task" className="text-xs font-medium">
            {current ? copy.changeTask : copy.chooseLabel}
          </label>
          <select
            id="agentur-task"
            name="task"
            defaultValue={current ?? AGENTUR_TASKS[0]}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          >
            {AGENTUR_TASKS.map((task) => (
              <option key={task} value={task}>
                {copy.tasks[task].title}
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

      {state.ok ? (
        <p role="status" className="mt-2 text-xs text-primary">
          {copy.currentTask}
        </p>
      ) : null}

      {errorText ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {errorText}
        </p>
      ) : null}
    </section>
  )
}
