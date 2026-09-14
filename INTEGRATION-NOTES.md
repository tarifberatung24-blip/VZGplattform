# First Layer integration notes

The public First Layer is implemented in `components/public/public-site.tsx` and is routed through `app/[locale]/[[...slug]]/page.tsx`. The available public routes are `/de`, `/de/funktionen`, `/de/kontakt`, `/de/preise`, `/de/registrierung`, and `/de/login`, with equivalent `/bg` routes. The proxy redirects the unprefixed paths to the selected locale; German is now the default locale.

`PublicSite` provides the shared public shell, header, footer, responsive navigation, language switcher, pricing cards, contact form UI, and login/registration UI. The forms currently validate required fields in the browser and show an explicit pending-integration notice; they do not claim to have sent a message, created an account, or authenticated a user. The existing Supabase auth routes remain available and can be connected to these public forms in a later bounded change.

The global gold cable background is implemented as `GoldCableBackground` inside `PublicSite`. It uses lightweight inline SVG paths, `pointer-events: none`, responsive opacity, a shared shell placement, and `prefers-reduced-motion` support. If the component is later extracted for private application routes, place it in the authenticated app shell rather than copying the SVG into individual pages.

The public layer uses the existing React, Next.js, Tailwind, Lucide, and language-provider dependencies. No new dependency or secret was added. Run `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm i18n:check`, and `pnpm build` from the repository root.

Legal links in the public footer are currently presented as non-action text to avoid inventing legal content. Existing legal routes remain available in the repository and can be linked after the final legal information and language copy are approved.
