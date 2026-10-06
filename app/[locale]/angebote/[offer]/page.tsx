export { default } from "@/app/angebote/[offer]/page"

export const dynamicParams = false

export function generateStaticParams() {
  return ["business-insurance", "kfz", "energy", "credit", "schufa"].map((offer) => ({ offer }))
}
