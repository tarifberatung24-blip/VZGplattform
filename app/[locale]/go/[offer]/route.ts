// The i18n proxy redirects an unprefixed /go/<offer> to /<locale>/go/<offer>, so
// the same handler must also exist under the locale. It is re-exported rather
// than reimplemented so the exact-deeplink behaviour has one definition.
export { GET } from "../../../go/[offer]/route"
