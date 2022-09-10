import type { AstroIntegration } from "astro"

export default function astromix(): AstroIntegration {
  return {
    name: "astromix",
    hooks: {
      "astro:config:setup"(options) {
        const clientInit = [
          `import { router } from "astromix/client"`,
          `router.init()`,
        ].join("\n")
        options.injectScript("page", clientInit)
      },
    },
  }
}
