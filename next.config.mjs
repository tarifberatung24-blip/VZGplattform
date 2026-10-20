import createNextIntlPlugin from "next-intl/plugin"
import path from "node:path"
import { fileURLToPath } from "node:url"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")
const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: projectRoot },
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "tesseract.js"],
  outputFileTracingIncludes: {
    "/*": ["node_modules/pdfjs-dist/standard_fonts/**/*"],
  },
  experimental: {
    /**
     * P6 file intake allows documents up to `CASE_DOCUMENT_MAX_BYTES` (10 MB), because
     * a scanned official letter routinely exceeds a megabyte. Server actions default
     * to a 1 MB body, so any larger upload was rejected by the framework before the
     * action ran and surfaced as a raw 413/500 instead of a validation message. The
     * limit is raised to the value the application already advertises and enforces;
     * the action still re-validates size, MIME and magic bytes itself.
     */
    serverActions: { bodySizeLimit: "10mb" },
  },
}

export default withNextIntl(nextConfig)
