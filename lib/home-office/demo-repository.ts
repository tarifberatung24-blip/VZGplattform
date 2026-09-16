import type { DemoAnalysis, DemoDocument, DemoReview, DemoStore, DocumentRepository } from "./types"

const key = "home-office-demo-v1"
const empty: DemoStore = { documents: [], analyses: {}, reviews: {} }

export function createDemoRepository(): DocumentRepository {
  let store = empty
  if (typeof window !== "undefined") {
    try { store = JSON.parse(window.localStorage.getItem(key) ?? JSON.stringify(empty)) as DemoStore } catch { store = empty }
  }
  const persist = () => { if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(store)) }
  return { list: () => store.documents, add: (document: DemoDocument) => { store = { ...store, documents: [document, ...store.documents] }; persist() }, remove: (id) => { const analyses = { ...store.analyses }; const reviews = { ...store.reviews }; delete analyses[id]; delete reviews[id]; store = { documents: store.documents.filter((d) => d.id !== id), analyses, reviews }; persist() }, saveAnalysis: (id, analysis: DemoAnalysis) => { store = { ...store, analyses: { ...store.analyses, [id]: analysis }, documents: store.documents.map((d) => d.id === id ? { ...d, status: "needs_review" } : d) }; persist() }, saveReview: (id, review: DemoReview) => { store = { ...store, reviews: { ...store.reviews, [id]: review }, documents: store.documents.map((d) => d.id === id ? { ...d, status: "reviewed" } : d) }; persist() }, reset: () => { store = empty; if (typeof window !== "undefined") window.localStorage.removeItem(key) } }
}
