import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  resolve: {
    // Mirrors the `@/*` -> project root mapping in tsconfig.json. Without it a
    // module under test that imports `@/...` at runtime cannot be loaded, so such
    // tests were forced to mock every internal dependency, including pure helpers
    // that should be exercised for real.
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
})
