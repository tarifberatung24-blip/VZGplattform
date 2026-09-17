"use client"

export type LeadSubmitResult = { ok: boolean } | { error: true } | null

export async function submitLead(
  form: HTMLFormElement,
  locale: string,
  setState: (next: LeadSubmitResult) => void,
): Promise<void> {
  setState(null)
  try {
    const data = new FormData(form)
    const payload = {
      name: data.get("name"),
      email: data.get("email"),
      message: data.get("message"),
      locale,
      origin: data.get("origin"),
    }
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      setState({ error: true })
      return
    }
    setState({ ok: true })
    form.reset()
  } catch {
    setState({ error: true })
  }
}
