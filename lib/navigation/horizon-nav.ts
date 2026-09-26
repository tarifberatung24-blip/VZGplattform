/**
 * The single authenticated navigation model for the HORIZON workspace.
 *
 * Every destination here must be an authenticated route: the workspace shell hides the public
 * header/footer and shows account controls, so a public destination would place an anonymous
 * visitor inside the authenticated shell. `lib/navigation/horizon-nav.test.ts` enforces this
 * against `isProtectedAppPath` (the `protectedPrefixes` source of truth).
 *
 * `/security` is the public Layer 0 trust page and must not be listed; the authenticated Account
 * Security surface is `/konto/sicherheit`. `/anspruch` and `/email-generator` are public too.
 *
 * Desktop sidebar, mobile bottom bar and the mobile "More" sheet all derive from this file, so the
 * three surfaces cannot drift. See docs/HORIZON_NAVIGATION_DESIGN.md.
 */
export type NavDestinationId =
  | "dashboard"
  | "guide"
  | "documents"
  | "contracts"
  | "taxes"
  | "education"
  | "profile"
  | "security"

export type NavGroupId = "workspace" | "finance" | "account" | "services"

export type NavDestination = {
  id: NavDestinationId
  /** Unlocalized path. Always an authenticated route. */
  href: string
  /** Key into the `navItems` dictionary block. */
  labelKey: NavDestinationId
}

export type NavGroup = {
  id: NavGroupId
  /** Key into the `navGroups` dictionary block. */
  labelKey: NavGroupId
  items: readonly NavDestination[]
}

export const navGroups: readonly NavGroup[] = [
  {
    id: "workspace",
    labelKey: "workspace",
    items: [
      { id: "dashboard", href: "/dashboard", labelKey: "dashboard" },
      { id: "guide", href: "/guide", labelKey: "guide" },
      { id: "documents", href: "/documents", labelKey: "documents" },
    ],
  },
  {
    id: "finance",
    labelKey: "finance",
    items: [
      { id: "contracts", href: "/vertraege", labelKey: "contracts" },
      { id: "taxes", href: "/steuer", labelKey: "taxes" },
    ],
  },
  {
    id: "account",
    labelKey: "account",
    items: [
      { id: "profile", href: "/profil", labelKey: "profile" },
      { id: "security", href: "/konto/sicherheit", labelKey: "security" },
    ],
  },
  {
    id: "services",
    labelKey: "services",
    items: [
      { id: "education", href: "/finanzbildung", labelKey: "education" },
    ],
  },
]

/**
 * Mobile bottom bar destinations, in order. Slot 5 is the "More" trigger, which is not a
 * destination and is rendered separately. Steuern, Finanzbildung, Profil, Sicherheit and the app
 * actions live under "More". Owner decision: slot 4 is Verträge.
 */
export const mobilePrimaryIds: readonly NavDestinationId[] = [
  "dashboard",
  "guide",
  "documents",
  "contracts",
]

export const navDestinations: readonly NavDestination[] = navGroups.flatMap((group) => group.items)

export function findDestination(id: NavDestinationId): NavDestination {
  const found = navDestinations.find((item) => item.id === id)
  if (!found) throw new Error(`Unknown navigation destination: ${id}`)
  return found
}

/**
 * A destination is active when the path is the destination itself or a nested route under it.
 * `/konto/sicherheit` is matched directly; it is not under the `/protected` alias prefix.
 */
export function isDestinationActive(path: string, href: string): boolean {
  return path === href || path.startsWith(`${href}/`)
}
