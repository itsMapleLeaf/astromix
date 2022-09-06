import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/main.ts"],
  target: "node16",
  format: "esm",
  sourcemap: true,
  dts: true,
  tsconfig: resolve(fileURLToPath(import.meta.url), "../../../tsconfig.json"),
})
