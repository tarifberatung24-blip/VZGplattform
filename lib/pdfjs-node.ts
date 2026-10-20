import { join } from "node:path"

// pdf.js does not infer this directory in Node. Without it, PDFs that reference
// a standard font without embedding it trigger a warning and may render or
// extract text with a degraded fallback.
export const PDFJS_STANDARD_FONT_DATA_URL = `${join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts").replaceAll("\\\\", "/")}/`
