/**
 * German synonyms for routes that only exist under an English or Bulgarian name.
 *
 * The site is bilingual, and a German-speaking reader types the German word: the
 * office is a `Bürgeramt`, not a `contact`; `Dokumente` are what you upload, not
 * `documents`. Before this map those German paths returned a 404, so the most
 * likely guess from a German speaker was the one that failed.
 *
 * Each entry redirects to the page that already answers the request. The targets
 * are existing routes on purpose: this map adds a name, not a second page, so there
 * is one place where each topic is maintained.
 *
 * Matching is exact on the locale-stripped path. A synonym with real children would
 * need its own entry per child, which is the signal that it should be a real route
 * instead — so none is added here.
 */
export const pathAliases: Readonly<Record<string, string>> = {
  // The town hall counter and its offices.
  "/buergeramt": "/contact",
  "/meldeamt": "/contact",
  "/einwohnermeldeamt": "/contact",
  "/kontakt": "/contact",
  // Documents and uploads.
  "/dokumente": "/documents",
  "/unterlagen": "/documents",
  // The guide, under its German name. It lives inside the Learning Center now, so
  // the synonym lands on that numbered path rather than the old index.
  "/behoerden": "/learning-center#guides",
  "/aemter": "/learning-center#guides",
  "/hilfe": "/learning-center#guides",
  // The letters, under the names a German speaker types. Someone who needs a
  // Mängelanzeige searches for "Mängelanzeige", not "vorlagen", so the letter's own
  // German name has to be a reachable URL rather than a 404. The index synonyms point
  // at the Learning Center path; the letter's own name still reaches its detail page.
  "/briefe": "/learning-center#letters",
  "/briefvorlagen": "/learning-center#letters",
  "/musterschreiben": "/learning-center#letters",
  "/vorlage": "/learning-center#letters",
  "/mangelanzeige": "/vorlagen/mangelanzeige",
  "/maengelanzeige": "/vorlagen/mangelanzeige",
  "/widerspruch": "/vorlagen/widerspruch",
  "/urlaubsantrag": "/vorlagen/urlaubsantrag",
  "/arbeitszeugnis": "/vorlagen/arbeitszeugnis-anfordern",
  // Insurance and the financial topics.
  "/versicherung": "/versicherungen",
  "/finanzen": "/finanzbildung",
  "/finanzwissen": "/finanzbildung",
  // Work, benefits and tax.
  "/arbeitslos": "/ratgeber/agentur-fuer-arbeit",
  "/arbeitslosengeld": "/ratgeber/agentur-fuer-arbeit",
  "/buergergeld": "/ratgeber/jobcenter",
  "/grundsicherung": "/ratgeber/jobcenter",
  "/steuern": "/steuer",
  "/steuererklaerung": "/steuer",
  "/kindergeld-beantragen": "/kindergeld",
  "/familienkasse": "/ratgeber/familienkasse",
  // Everyday registrations, each to the guide that explains it.
  "/anmeldung": "/ratgeber/anmeldung",
  "/wohnung": "/ratgeber/mietvertrag",
  "/miete": "/ratgeber/mietvertrag",
  "/konto": "/ratgeber/bankkonto",
  "/krankenversicherung": "/ratgeber/krankenkasse",
  "/aufenthalt": "/ratgeber/auslaenderbehoerde",
  "/rente": "/ratgeber/rentenversicherung",
  "/rundfunkbeitrag": "/ratgeber/rundfunkbeitrag",
}

/** The canonical destination for a synonym, or null when the path is not one. */
export function pathAliasTarget(pathname: string): string | null {
  return pathAliases[pathname] ?? null
}
