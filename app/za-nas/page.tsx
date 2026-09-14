import { FinanceModulePage } from "@/components/finance/module-page"
import { getDictionary } from "@/lib/i18n/dictionaries"

export default function AboutPage() {
  const text = getDictionary("de").cleanup
  return <FinanceModulePage title={text.about.title} description={text.about.description} items={text.documents.items} />
}
