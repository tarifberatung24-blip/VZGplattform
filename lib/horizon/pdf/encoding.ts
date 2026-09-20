/**
 * P9 — character-set guard for written values.
 *
 * Official forms are drawn with pdf-lib's standard Helvetica face, which is
 * encoded as WinAnsi (CP1252). Most of what appears on a German official form is
 * inside CP1252 — Umlaute, ß and the Latin-1 letters Ø/å all are — but Polish,
 * Cyrillic and Greek letters are not, and the profile languages include pl/ru/bg.
 *
 * This matters twice over. pdf-lib does not degrade gracefully: asking it to
 * measure or draw text outside WinAnsi *throws*. So the check has to run before
 * any measurement, or a user with a non-CP1252 name would hit an exception during
 * planning instead of a clear refusal. And it must be a refusal rather than a
 * transliteration, because silently rewriting a person's name on an official
 * document is a worse outcome than declining to generate it.
 *
 * Kept as its own module so both the planner and the writer apply exactly the
 * same rule, with no dependency between them.
 */

/**
 * Characters present in WinAnsi (CP1252), the encoding pdf-lib applies to the
 * standard fonts. CP1252 defines 0x81, 0x8D, 0x8F, 0x90 and 0x9D as unassigned.
 */
const WINANSI_SINGLE_BYTE = new Set<string>(
  Array.from({ length: 0x100 }, (_, i) => String.fromCharCode(i)).filter(
    (character) => ![0x81, 0x8d, 0x8f, 0x90, 0x9d].includes(character.charCodeAt(0)),
  ),
)

/** Characters >= 0x100 that CP1252 still defines. */
const WINANSI_HIGH: ReadonlySet<string> = new Set([
  "\u0160", "\u0161", "\u017D", "\u017E", "\u0152", "\u0153", "\u0178",
  "\u20AC", "\u201A", "\u0192", "\u201E", "\u2026", "\u2020", "\u2021",
  "\u02C6", "\u2030", "\u0160", "\u2039", "\u2018", "\u2019", "\u201C",
  "\u201D", "\u2022", "\u2013", "\u2014", "\u02DC", "\u2122", "\u0161",
  "\u203A",
])

export function isWinAnsiRepresentable(text: string): boolean {
  for (const character of text) {
    if (WINANSI_SINGLE_BYTE.has(character)) continue
    if (WINANSI_HIGH.has(character)) continue
    return false
  }
  return true
}