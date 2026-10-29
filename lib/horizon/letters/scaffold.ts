/**
 * The skeleton every generated German business letter shares.
 *
 * German correspondence has a fixed shape — sender block, recipient block, place
 * and date, subject, salutation, body, closing, signature — and getting it wrong
 * is the first thing a reader notices about a letter they did not write
 * themselves. Assembling that shape in one place means a new letter only supplies
 * its own paragraphs, and none of them can drift into a different layout.
 *
 * The blocks degrade the same way everywhere: an absent name or address leaves
 * the block out and records the key, so the gap is visible on the page rather
 * than filled with an invented value. A blank line where an address should be is
 * honest; a guessed address is a letter sent to the wrong place.
 */

/** A block of text lines, any of which may be absent. */
export type AddressBlock = {
  name?: string | null
  address?: string | null
}

export type GermanLetterInput = {
  sender: AddressBlock
  recipient: AddressBlock
  /** Already formatted, e.g. `Berlin, 23.10.2026`. */
  placeDate: string
  subject: string
  paragraphs: readonly string[]
  signatureName: string | null
  /** Keys collected by the caller, extended with the address keys found missing here. */
  omitted: string[]
  /** Field keys whose absence should be reported when the sender block is empty. */
  senderKeys?: { name: string; address: string }
  /** Field keys whose absence should be reported when the recipient block is empty. */
  recipientKeys?: { name: string; address: string }
}

/** Renders a name/address block, or nothing when both are absent. */
function renderBlock(block: AddressBlock): string[] {
  const lines: string[] = []
  if (block.name) lines.push(block.name)
  if (block.address) lines.push(...block.address.split("\n").map((line) => line.trim()).filter(Boolean))
  return lines
}

/**
 * Assembles the letter.
 *
 * Empty paragraphs are dropped rather than printed as blank lines: a builder that
 * omits a sentence returns an empty string for it, and a stray gap in the middle
 * of a letter reads as a mistake.
 */
export function germanBusinessLetter(input: GermanLetterInput): string {
  const omitted = input.omitted

  const senderLines = renderBlock(input.sender)
  if (!input.sender.name && input.senderKeys) omitted.push(input.senderKeys.name)
  if (!input.sender.address && input.senderKeys) omitted.push(input.senderKeys.address)

  const recipientLines = renderBlock(input.recipient)
  if (!input.recipient.name && input.recipientKeys) omitted.push(input.recipientKeys.name)
  if (!input.recipient.address && input.recipientKeys) omitted.push(input.recipientKeys.address)

  const lines: string[] = []

  if (senderLines.length > 0) {
    lines.push(...senderLines)
    lines.push("")
  }

  if (recipientLines.length > 0) {
    lines.push(...recipientLines)
    lines.push("")
  }

  lines.push(input.placeDate)
  lines.push("")
  lines.push(input.subject)
  lines.push("")
  lines.push("Sehr geehrte Damen und Herren,")
  lines.push("")

  for (const paragraph of input.paragraphs) {
    if (paragraph.trim().length === 0) continue
    lines.push(paragraph)
    lines.push("")
  }

  lines.push("Mit freundlichen Grüßen")
  lines.push("")
  lines.push(input.signatureName ?? "")

  return lines.join("\n")
}

/** Joins a place and a date into the German header line, tolerating either being absent. */
export function placeDateLine(place: string | null, germanDate: string): string {
  const city = place?.trim() ?? ""
  const date = germanDate.trim()
  if (city && date) return `${city}, ${date}`
  // A lone "Berlin, " reads as a typo on a letter, so a missing half is dropped
  // rather than left behind with its separator.
  return city || date
}
