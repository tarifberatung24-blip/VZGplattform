/**
 * P13 — Jobcenter (SGB II) process registry.
 *
 * A data-only description of the Jobcenter tasks HORIZON supports, consumed by the
 * existing module/case/guide architecture. It adds no framework layer: the case
 * spine, PDF engine, review/approval and send paths are the same ones every other
 * module uses.
 *
 * Three rules shape the data:
 *
 * 1. **The online-first fact is recorded, not converted.** The BA handles the
 *    first application and the continuation through online services and states the
 *    application is not tied to a form. The German paper forms are offered
 *    alongside, not instead.
 * 2. **No form is manufactured.** The current Jobcenter Veränderungsmitteilung has
 *    no public PDF — the BA points to the online service or to the responsible
 *    Jobcenter for a paper copy. This entry therefore has no form and says so,
 *    rather than reusing the retired Arbeitslosengeld change form as if it were a
 *    current SGB II form.
 * 3. **Anlagen are conditional, never universal.** An Anlage is listed as required
 *    only when a confirmed fact on the case says the situation it covers exists.
 *    The registry never asserts eligibility, an amount, a deadline or an address.
 *
 * Terminology: `Grundsicherung für Arbeitsuchende` is the SGB II framework and
 * `Grundsicherungsgeld` the cash benefit since 01.07.2026. The 04/2026 official
 * forms still print "Bürgergeld"; the BA keeps them valid, so the printed titles
 * are used where they identify a form.
 */

/** The canonical Jobcenter tasks, in the order a claim normally encounters them. */
export const JOBCENTER_TASKS = [
  "erstantrag",
  "weiterbewilligung",
  "veraenderung_mitteilen",
] as const

export type JobcenterTask = (typeof JOBCENTER_TASKS)[number]

export function isJobcenterTask(value: unknown): value is JobcenterTask {
  return typeof value === "string" && (JOBCENTER_TASKS as readonly string[]).includes(value)
}

/** Message-key suffix within `horizon.jobcenter.tasks.*`. */
export const jobcenterTaskKey: Record<JobcenterTask, string> = {
  erstantrag: "erstantrag",
  weiterbewilligung: "weiterbewilligung",
  veraenderung_mitteilen: "veraenderungMitteilen",
}

/** How a task is actually handled today. Mirrors the Agentur route vocabulary. */
export const JOBCENTER_ROUTE_KINDS = ["online_preferred", "online_only"] as const
export type JobcenterRouteKind = (typeof JOBCENTER_ROUTE_KINDS)[number]

export type JobcenterOfficialRoute = {
  /** The BA's own page describing the process. */
  infoUrl: string
  /** The official online service, when the BA provides one. */
  onlineUrl: string | null
  /** Free-text label for the online service, in German as the BA names it. */
  onlineLabel: string | null
  /** Alternative the BA itself names. */
  phoneNote: string | null
}

/** Fillability of an official form, as measured rather than assumed. */
export const JOBCENTER_FORM_SUPPORT = ["fillable", "manual_only"] as const
export type JobcenterFormSupport = (typeof JOBCENTER_FORM_SUPPORT)[number]

export type JobcenterOfficialForm = {
  /** Registry id in `lib/horizon/pdf/registry.ts`. */
  templateId: string
  support: JobcenterFormSupport
}

export type JobcenterTaskDefinition = {
  task: JobcenterTask
  routeKind: JobcenterRouteKind
  official: JobcenterOfficialRoute
  /**
   * Forms this task may use. Empty for online-only tasks: the BA does not offer a
   * current official form, and inventing one would be fabrication.
   */
  forms: readonly JobcenterOfficialForm[]
  /** Fact keys the workflow cannot produce a correct result without. */
  requiredFactKeys: readonly string[]
  /** Facts that are useful but genuinely optional. */
  optionalFactKeys: readonly string[]
}

const JC_SOURCES = {
  antrag: "https://www.arbeitsagentur.de/grundsicherung/grundsicherungsgeld-beantragen",
  wba: "https://www.arbeitsagentur.de/grundsicherung/weiterbewilligungsantrag",
  changes:
    "https://www.arbeitsagentur.de/grundsicherung/pflichten-verstehen-und-beachten/aenderungen-nachweise",
  antragOnline: "https://web.arbeitsagentur.de/sgb2ha/sgb2ha-ui/pd?reglevel=email",
  wbaOnline: "https://www.jobcenter.digital/weiterbewilligungsantrag",
  changesOnline: "https://www.jobcenter.digital/ver%C3%A4nderungsmitteilung",
} as const

/** Every cited official page, for re-verification and for the audit trail. */
export const JOBCENTER_OFFICIAL_SOURCES: readonly string[] = Object.values(JC_SOURCES)

export const JOBCENTER_TASK_DEFINITIONS: readonly JobcenterTaskDefinition[] = [
  {
    task: "erstantrag",
    // The BA states the application is not tied to a form and offers online,
    // written, telephone and in-person routes. The online service is its
    // recommended path; the 04/2026 Hauptantrag is the official paper route.
    routeKind: "online_preferred",
    official: {
      infoUrl: JC_SOURCES.antrag,
      onlineUrl: JC_SOURCES.antragOnline,
      onlineLabel: "Grundsicherungsgeld online beantragen",
      phoneNote: null,
    },
    forms: [{ templateId: "jobcenter-hauptantrag", support: "fillable" }],
    requiredFactKeys: ["person_first_name", "person_last_name", "recipient_institution"],
    optionalFactKeys: ["person_birth_date", "bank_iban", "applicant_city"],
  },
  {
    task: "weiterbewilligung",
    routeKind: "online_preferred",
    official: {
      infoUrl: JC_SOURCES.wba,
      onlineUrl: JC_SOURCES.wbaOnline,
      onlineLabel: "Grundsicherungsgeld online verlängern",
      phoneNote: null,
    },
    // The BA notes the WBA is form-free and that VM additionally applies to
    // continuation periods starting on or after 01.07.2026; the paper WBA remains
    // valid under the transition rule.
    forms: [{ templateId: "jobcenter-weiterbewilligung", support: "fillable" }],
    requiredFactKeys: ["person_first_name", "person_last_name", "recipient_institution"],
    optionalFactKeys: ["bg_number", "wba_period"],
  },
  {
    task: "veraenderung_mitteilen",
    // No current public SGB II change PDF exists: the BA offers the change
    // through jobcenter.digital and directs paper users to the responsible
    // Jobcenter. There is deliberately no form entry here.
    routeKind: "online_only",
    official: {
      infoUrl: JC_SOURCES.changes,
      onlineUrl: JC_SOURCES.changesOnline,
      onlineLabel: "Veränderungsmitteilung online abgeben",
      phoneNote: null,
    },
    forms: [],
    requiredFactKeys: ["person_first_name", "person_last_name", "recipient_institution"],
    optionalFactKeys: ["change_type"],
  },
] as const

export function jobcenterTaskDefinition(task: JobcenterTask): JobcenterTaskDefinition {
  return JOBCENTER_TASK_DEFINITIONS.find(
    (entry) => entry.task === task,
  ) as JobcenterTaskDefinition
}

/**
 * Fact keys required for one task, deduplicated.
 *
 * A task can only add requirements to what the module already imposes.
 */
export function requiredFactKeysForJobcenterTask(task: JobcenterTask): readonly string[] {
  return [...new Set(jobcenterTaskDefinition(task).requiredFactKeys)]
}

/**
 * A conditionally required Jobcenter Anlage.
 *
 * `activatorFactKeys` are confirmed facts on the case that mean this Anlage
 * covers the user's situation. The Anlage is *selected* from those facts, not
 * from a template of who is normally eligible: a key that is absent or
 * unconfirmed does not activate anything, so the user is never told to attach an
 * Anlage that their evidence does not support.
 */
export type JobcenterAnlage = {
  id: string
  /** Printed form identifier, e.g. `Jobcenter-EK`. */
  formId: string
  formName: string
  officialSource: string
  printedVersion: string
  /** Any one of these confirmed facts makes this Anlage apply. */
  activatorFactKeys: readonly string[]
}

export const JOBCENTER_ANLAGEN: readonly JobcenterAnlage[] = [
  {
    id: "anlage-ek",
    formId: "Jobcenter-EK",
    formName: "Anlage zum Einkommen einer Person der Bedarfsgemeinschaft ab 15 Jahren",
    officialSource: "https://www.arbeitsagentur.de/datei/anlageek_ba032960.pdf",
    printedVersion: "04/2026",
    activatorFactKeys: ["has_income_15plus"],
  },
  {
    id: "anlage-eks",
    formId: "Jobcenter-EKS",
    formName: "Anlage zum Einkommen aus selbständiger/freiberuflicher Tätigkeit",
    officialSource: "https://www.arbeitsagentur.de/datei/anlageeks_ba033540.pdf",
    printedVersion: "04/2026",
    activatorFactKeys: ["has_self_employment"],
  },
  {
    id: "anlage-kdu",
    formId: "Jobcenter-KDU",
    formName: "Anlage zu den Bedarfen für Unterkunft und Heizung",
    officialSource: "https://www.arbeitsagentur.de/datei/anlagekdu_ba032980.pdf",
    printedVersion: "04/2026",
    activatorFactKeys: ["has_housing_costs"],
  },
  {
    id: "anlage-vm",
    formId: "Jobcenter-VM",
    formName: "Anlage zur Selbstauskunft über das Vermögen",
    officialSource: "https://www.arbeitsagentur.de/datei/anlagevm_ba033055.pdf",
    printedVersion: "04/2026",
    activatorFactKeys: ["has_assets"],
  },
  {
    id: "anlage-wep",
    formId: "Jobcenter-WEP",
    formName: "Anlage für eine weitere Person ab 15 Jahren in der Bedarfsgemeinschaft",
    officialSource: "https://www.arbeitsagentur.de/datei/anlagewep_ba033100.pdf",
    printedVersion: "04/2026",
    activatorFactKeys: ["has_additional_person_15plus"],
  },
  {
    id: "anlage-ki",
    formId: "Jobcenter-KI",
    formName: "Anlage für ein Kind unter 15 Jahren in der Bedarfsgemeinschaft",
    officialSource: "https://www.arbeitsagentur.de/datei/anlageki_ba033000.pdf",
    printedVersion: "04/2026",
    activatorFactKeys: ["has_child_under_15"],
  },
] as const

/**
 * Which Anlagen the confirmed facts activate.
 *
 * Truthy string values only. A fact that is absent, empty or set to a negative
 * value activates nothing, so an unanswered question can never be read as "yes".
 */
export function anlagenForConfirmedFacts(
  facts: readonly { key: string; value?: string | null; confirmedAt?: string | null }[],
): readonly JobcenterAnlage[] {
  const confirmedTrue = new Set(
    facts
      .filter((fact) => Boolean(fact.confirmedAt))
      .filter((fact) => {
        const value = (fact.value ?? "").trim().toLowerCase()
        return value === "true" || value === "yes" || value === "ja" || value === "да"
      })
      .map((fact) => fact.key),
  )

  return JOBCENTER_ANLAGEN.filter((anlage) =>
    anlage.activatorFactKeys.some((key) => confirmedTrue.has(key)),
  )
}

/** Every fact key that can activate an Anlage, for the UI's question list. */
export const JOBCENTER_ANLAGE_ACTIVATOR_KEYS: readonly string[] = [
  ...new Set(JOBCENTER_ANLAGEN.flatMap((anlage) => anlage.activatorFactKeys)),
]

export function isJobcenterFormFillable(templateId: string): boolean {
  return JOBCENTER_TASK_DEFINITIONS.some((definition) =>
    definition.forms.some((form) => form.templateId === templateId && form.support === "fillable"),
  )
}
