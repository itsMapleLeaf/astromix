import node from "@astrojs/node"
import preact from "@astrojs/preact"
import { defineConfig } from "astro/config"
import astromix from "astromix"

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node(),
  integrations: [preact(), astromix()],
})
