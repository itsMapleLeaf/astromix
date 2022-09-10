import node from "@astrojs/node"
import preact from "@astrojs/preact"
import { defineConfig } from "astro/config"

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node(),
  integrations: [preact()],
})
