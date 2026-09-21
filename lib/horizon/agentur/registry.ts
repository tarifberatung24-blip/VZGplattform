/**
 * P12 — Agentur für Arbeit process registry.
 *
 * This is not a second module framework. It is a small, data-only description of
 * the four Agentur-für-Arbeit tasks HORIZON supports, consumed by the existing
 * module/case/guide architecture. Every field here is a claim about current
 * official Bundesagentur für Arbeit (BA) practice, so each one is traceable to a
 * page on `arbeitsagentur.de` that was retrieved and read, never to memory.
 *
 * Two rules shape the data:
 *
 * 1. **Online-first is stated, not converted.** All four tasks are handled by the
 *    BA through online services. Where the official route is online-only, the
 *    entry says so and links to it — no PDF is manufactured to imitate a paper
 *    process the authority does not offer.
 * 2. **A task may name an official form, but naming it is not the same as being
 *    able to fill it.** Only forms whose fillability was measured (AcroForm fields
 *    read from the exact bytes, values verified to render) are listed as
 *    `fillable`. Everything else is `manual_only` with a link to the official
 *    source, so the user is never handed an unchanged form presented as output.
 *
 * Nothing in this file asserts eligibility, a deadline, an amount, an authority
 * address or a required supporting document. Those are decided from the user's
 * own evidence on the case, not from a registry.
 */

/** The canonical Agentur-für-Arbeit tasks in the order the BA presents them. */
export const AGENTUR_TASKS = [
  "arbeitsuchend_melden",
  "arbeitslos_melden",
  "arbeitslosengeld_beantragen",
  "veraenderungen_mitteilen",
] as const

export type AgenturTask = (typeof AGENTUR_TASKS)[number]

export function isAgenturTask(value: unknown): value is AgenturTask {
  return typeof value === "string" && (AGENTUR_TASKS as readonly string[]).includes(value)
}

/** Message-key suffix within `horizon.agentur.tasks.*`. */
export const agenturTaskKey: Record<AgenturTask, string> = {
  arbeitsuchend_melden: "arbeitsuchendMelden",
  arbeitslos_melden: "arbeitslosMelden",
  arbeitslosengeld_beantragen: "arbeitslosengeldBeantragen",
  veraenderungen_mitteilen: "veraenderungenMitteilen",
}

/**
 * How a task is actually handled today.
 *
 * `online_only` — the BA offers only the online route; there is no official form
 * to prepare offline and no PDF is offered for it.
 * `online_preferred` — an official online route exists and is the BA's recommended
 * path; a separate official paper form also exists for the underlying submission.
 * `online_with_form` — the change is reported online, and an official fillable
 * form exists for the same purpose.
 */
export const AGENTUR_ROUTE_KINDS = ["online_only", "online_preferred", "online_with_form"] as const
export type AgenturRouteKind = (typeof AGENTUR_ROUTE_KINDS)[number]

export type AgenturOfficialRoute = {
  /** The BA's own page describing the process. */
  infoUrl: string
  /** The official online service, when the BA provides one. */
  onlineUrl: string | null
  /** Free-text label for the online service, in German as the BA names it. */
  onlineLabel: string | null
  /** Alternative the BA itself names, e.g. a service number. */
  phoneNote: string | null
}

/**
 * Fillability of an official form, as measured rather than assumed.
 *
 * `fillable` — AcroForm fields were read from the exact template bytes and a
 * filled copy was verified to render the values. `manual_only` — the form exists
 * and is linked, but HORIZON does not fill it.
 */
export const AGENTUR_FORM_SUPPORT = ["fillable", "manual_only"] as const
export type AgenturFormSupport = (typeof AGENTUR_FORM_SUPPORT)[number]

export type AgenturOfficialForm = {
  /** Registry id in `lib/horizon/pdf/registry.ts`. */
  templateId: string
  support: AgenturFormSupport
  /** Which task required this form to exist at all. */
  requestedBy: AgenturTask
}

export type AgenturTaskDefinition = {
  task: AgenturTask
  routeKind: AgenturRouteKind
  official: AgenturOfficialRoute
  /**
   * Forms this task may use. Empty for online-only tasks: the BA does not offer a
   * paper equivalent, and inventing one would be fabrication.
   */
  forms: readonly AgenturOfficialForm[]
  /**
   * Fact keys this task's workflow cannot produce a correct result without.
   * Never invented here: each key corresponds to a fact the user must supply
   * because the authority's own process asks for it.
   */
  requiredFactKeys: readonly string[]
  /**
   * Facts that are useful but genuinely optional, offered as questions rather
   * than demanded. Kept separate so the UI can distinguish "must ask" from
   * "may ask".
   */
  optionalFactKeys: readonly string[]
}

/**
 * The official BA pages and services these entries cite. Kept as named constants
 * so a URL is recorded once and every task that relies on it points at the same
 * value, which is what makes a later re-verification mechanical.
 */
const BA_SOURCES = {
  steps: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/arbeitslosengeld/ihre-schritte-wenn-sie-arbeitslos-werden",
  arbeitssuchend:
    "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/arbeitslosengeld/ihre-schritte-wenn-sie-arbeitslos-werden/wie-sie-sich-arbeitsuchend-melden",
  arbeitslos:
    "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/arbeitslosengeld/ihre-schritte-wenn-sie-arbeitslos-werden/wie-sie-sich-arbeitslos-melden",
  alg: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/arbeitslosengeld/finanzielle-hilfen/arbeitslosengeld-anspruch-hoehe-dauer",
  changes: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/arbeitslosengeld/das-muessen-sie-beachten",
  arbeitssuchendOnline:
    "https://web.arbeitsagentur.de/vermittlung/oalo-ui/pd/arbeitsuchendmeldung?reglevel=pin",
  arbeitslosOnline: "https://www.arbeitsagentur.de/arbeitslos-melden/pd?reglevel=pin",
  algOnline: "https://web.arbeitsagentur.de/alg-prod/ui/pd?reglevel=pin",
  changesOnline: "https://web.arbeitsagentur.de/veronline/ver-ui/pd/",
} as const

/** Every cited BA page, for re-verification and for the audit trail. */
export const AGENTUR_OFFICIAL_SOURCES: readonly string[] = Object.values(BA_SOURCES)

export const AGENTUR_TASK_DEFINITIONS: readonly AgenturTaskDefinition[] = [
  {
    task: "arbeitsuchend_melden",
    // The BA's only published route for this step is the online
    // Arbeitsuchendmeldung; it explicitly says to report on only one channel.
    routeKind: "online_only",
    official: {
      infoUrl: BA_SOURCES.arbeitssuchend,
      onlineUrl: BA_SOURCES.arbeitssuchendOnline,
      onlineLabel: "Arbeitsuchendmeldung",
      phoneNote: "0800 4 555500 (gebührenfrei)",
    },
    forms: [],
    requiredFactKeys: ["person_first_name", "person_last_name", "employment_end_date"],
    optionalFactKeys: ["customer_number"],
  },
  {
    task: "arbeitslos_melden",
    routeKind: "online_only",
    official: {
      infoUrl: BA_SOURCES.arbeitslos,
      onlineUrl: BA_SOURCES.arbeitslosOnline,
      onlineLabel: "Arbeitslosmeldung",
      phoneNote: null,
    },
    forms: [],
    requiredFactKeys: [
      "person_first_name",
      "person_last_name",
      "unemployment_start_date",
      "already_reported_as_jobseeker",
    ],
    optionalFactKeys: ["customer_number"],
  },
  {
    task: "arbeitslosengeld_beantragen",
    routeKind: "online_preferred",
    official: {
      infoUrl: BA_SOURCES.alg,
      onlineUrl: BA_SOURCES.algOnline,
      onlineLabel: "Arbeitslosengeld beantragen (mit Kennwort)",
      phoneNote: null,
    },
    // The application itself is made through the BA's online service. No official
    // fillable ALG application PDF was verified, so none is offered.
    forms: [],
    requiredFactKeys: [
      "person_first_name",
      "person_last_name",
      "bank_iban",
      "unemployment_start_date",
    ],
    optionalFactKeys: ["customer_number", "tax_class"],
  },
  {
    task: "veraenderungen_mitteilen",
    routeKind: "online_with_form",
    official: {
      infoUrl: BA_SOURCES.changes,
      onlineUrl: BA_SOURCES.changesOnline,
      onlineLabel: "Veränderungen mitteilen (Arbeitslosengeld)",
      phoneNote: null,
    },
    // The BA publishes an official paper form for reporting changes; the same
    // form is readable, structured and verified fillable, so it is the one form
    // P12 may generate. Online remains the BA's recommended route.
    forms: [
      {
        templateId: "ba-veraenderungsmitteilung-alg",
        support: "fillable",
        requestedBy: "veraenderungen_mitteilen",
      },
    ],
    requiredFactKeys: ["person_first_name", "person_last_name"],
    optionalFactKeys: ["customer_number", "change_type"],
  },
] as const

export function agenturTaskDefinition(task: AgenturTask): AgenturTaskDefinition {
  return AGENTUR_TASK_DEFINITIONS.find((entry) => entry.task === task) as AgenturTaskDefinition
}

/**
 * Fact keys required for one task, in a stable order and without duplicates.
 *
 * A task can only ever add requirements to what the module already imposes; it
 * cannot relax them.
 */
export function requiredFactKeysForTask(task: AgenturTask): readonly string[] {
  return [...new Set(agenturTaskDefinition(task).requiredFactKeys)]
}

/**
 * Fact keys a form needs before it can be filled.
 *
 * This mirrors, but does not replace, the field mapping: a mapping names the
 * fields, this names the facts the user must confirm for those fields to receive
 * a value.
 */
export const AGENTUR_FORM_REQUIRED_FACTS: Record<string, readonly string[]> = {
  "ba-veraenderungsmitteilung-alg": ["person_first_name", "person_last_name"],
}

export function isAgenturFormFillable(templateId: string): boolean {
  return AGENTUR_TASK_DEFINITIONS.some((definition) =>
    definition.forms.some((form) => form.templateId === templateId && form.support === "fillable"),
  )
}

/** Tasks that offer at least one form HORIZON can produce. */
export function agenturTasksWithFillableForm(): readonly AgenturTask[] {
  return AGENTUR_TASK_DEFINITIONS.filter((definition) =>
    definition.forms.some((form) => form.support === "fillable"),
  ).map((definition) => definition.task)
}
