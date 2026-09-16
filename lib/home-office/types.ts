export type DemoDocumentStatus = "awaiting_analysis" | "analyzing" | "needs_review" | "reviewed"

export type DemoDocument = {
  id: string
  name: string
  size: number
  type: string
  status: DemoDocumentStatus
  createdAt: string
}

export type DemoAnalysis = {
  documentType: string
  sender: string
  recipient: string
  customerNumber: string
  contractNumber: string
  referenceNumber: string
  issueDate: string
  receivedDate: string
  deadline: string
  amounts: string[]
  currency: string
  summaryBg: string
  summaryDe: string
  facts: Array<{ label: string; value: string; confidence: number }>
  risks: string[]
  missingInformation: string[]
  recommendedNextSteps: string[]
  confidence: number
  evidenceSnippets: string[]
}

export type DemoReview = { analysis: DemoAnalysis; reviewedAt: string }

export type DemoStore = {
  documents: DemoDocument[]
  analyses: Record<string, DemoAnalysis>
  reviews: Record<string, DemoReview>
}

export type DocumentRepository = {
  list(): DemoDocument[]
  add(document: DemoDocument): void
  remove(id: string): void
  saveAnalysis(id: string, analysis: DemoAnalysis): void
  saveReview(id: string, review: DemoReview): void
  reset(): void
}
