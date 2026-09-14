import { FinanceModulePage } from "@/components/finance/module-page"
import { getDictionary } from "@/lib/i18n/dictionaries"

export default function ServicesPage() {
  const text = getDictionary("de").cleanup
  return <FinanceModulePage title={text.services.title} description={text.services.description} items={text.documents.items} />
}
