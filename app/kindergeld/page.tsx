import { GuidedWizard } from "@/components/finance/guided-wizard"

export const metadata = {
  title: "Kindergeld Navigator | HORIZON by VZG",
  description: "Структурирана предварителна проверка на формулярите за Kindergeld.",
}

export default function KindergeldPage() {
  return <GuidedWizard kind="kindergeld" />
}
