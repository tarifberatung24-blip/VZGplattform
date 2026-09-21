"use client"

import { useActionState } from "react"
import { selectJobcenterTask, type JobcenterTaskState } from "@/lib/horizon/jobcenter/actions"
import { getJobcenterCopy } from "@/lib/horizon/jobcenter/copy"
import {
  JOBCENTER_TASKS,
  anlagenForConfirmedFacts,
  jobcenterTaskDefinition,
  isJobcenterTask,
} from "@/lib/horizon/jobcenter/registry"
import { findTemplateById } from "@/lib/horizon/pdf/registry"

const initialState: JobcenterTaskState = { error: null, ok: false }

type Fact = { key: string; value?: string | null; confirmedAt?: string | null }

/**
 * P13 — the Jobcenter entry inside a case.
 *
 * Three jobs, and nothing more:
 *
 * 1. Let the user record which Jobcenter task the case is about, which is what
 *    makes the missing-information list task-specific.
 * 2. Show the current official route for that task, online-first, with the
 *    authority's own links. Where no current official PDF exists the panel says
 *    so rather than offering an invented one.
 * 3. List only the Anlagen activated by the user's *confirmed* facts. An
 *    unanswered or unconfirmed question activates nothing, so the list is never a
 *    guess about the household.
 *
 * It decides no eligibility, amount, deadline or address.
 */
export function JobcenterTaskPanel({
  caseId,
  locale,
  module,
  selectedTask,
  facts,
}: {
  caseId: string
  locale: string
  module: string
  selectedTask: string | null
  facts: readonly Fact[]
}) {
  const [state, action, pending] = useActionState(selectJobcenterTask, initialState)
  const copy = getJobcenterCopy(locale === "de" ? "de" : "bg")

  if (module !== "jobcenter") return null

  const current = selectedTask && isJobcenterTask(selectedTask) ? selectedTask : null
  const definition = current ? jobcenterTaskDefinition(current) : null
  const anlagen = anlagenForConfirmedFacts(facts)

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
                    <p className="text-xs text-primary">{copy.formFillable}</p>
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
              <p className="text-xs text-muted-foreground">{copy.formsBlankNote}</p>
            </div>
          )}

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
                        {anlage.formName} ({anlage.formId}, {anlage.printedVersion})
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      ) : null}

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="caseId" value={caseId} />
        <input type="hidden" name="locale" value={locale} />

        <div>
          <label htmlFor="jobcenter-task" className="text-xs font-medium">
            {current ? copy.changeTask : copy.chooseLabel}
          </label>
          <select
            id="jobcenter-task"
            name="task"
            defaultValue={current ?? JOBCENTER_TASKS[0]}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          >
            {JOBCENTER_TASKS.map((task) => (
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
