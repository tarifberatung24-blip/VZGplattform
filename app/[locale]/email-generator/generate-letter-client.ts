"use client"

export type Recipient =
  | "Finanzamt"
  | "Jobcenter"
  | "Familienkasse"
  | "Health Insurance"
  | "Other"

export type LetterResult =
  | { error: true; message?: string }
  | {
      german: string
      bulgarian: string
      placeholders: {
        name: string
        address: string
        date: string
        customerNumber: string
      }
    }

export async function requestLetter({
  description,
  recipient,
  locale,
}: {
  description: string
  recipient: Recipient
  locale: string
}): Promise<LetterResult> {
  const response = await fetch("/api/generate-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description,
      recipient,
      userLanguage: locale === "bg" ? "bg" : "de",
    }),
  })

  if (!response.ok) {
    let message = "Letter generation failed."
    try {
      const json = (await response.json()) as { error?: string }
      if (json.error) message = json.error
    } catch {
      // ignore
    }
    return { error: true, message }
  }

  const json = (await response.json()) as {
    german?: string
    bulgarian?: string
    placeholders?: {
      name?: string
      address?: string
      date?: string
      customerNumber?: string
    }
  }

  return {
    german: json.german ?? "",
    bulgarian: json.bulgarian ?? "",
    placeholders: {
      name: json.placeholders?.name ?? "[Name]",
      address: json.placeholders?.address ?? "[Your Address]",
      date: json.placeholders?.date ?? "[Date]",
      customerNumber: json.placeholders?.customerNumber ?? "[Customer Number]",
    },
  }
}
