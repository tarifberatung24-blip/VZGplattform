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
  // The guide, under its German name.
  "/behoerden": "/ratgeber",
  "/aemter": "/ratgeber",
  "/hilfe": "/ratgeber",
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
