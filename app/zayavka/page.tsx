import { ServiceRequestWizard } from "@/components/marketing/service-request-wizard"
import { isServiceRequestKind, type ServiceRequestKind } from "@/lib/service-request"

export const metadata = {
  title: "Заявка за оферта | FinanzBG",
  description: "Кратка заявка за ток, газ, Kfz застраховка, кредит или SCHUFA ориентация.",
}

function readKind(value: string | string[] | undefined): ServiceRequestKind | undefined {
  const candidate = Array.isArray(value) ? value[0] : value
  return isServiceRequestKind(candidate) ? candidate : undefined
}

export default async function ServiceRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string | string[] }>
}) {
  const params = await searchParams
  return <ServiceRequestWizard initialKind={readKind(params.service)} />
}
