import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/client.ts", "src/integration.ts"],
  target: "node16",
  format: ["esm"],
  dts: true,
})
