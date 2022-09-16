import type { AstroIntegration } from "astro"
import { createRequire } from "node:module"
import { dirname, relative } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)

// babel modules are still commonjs
/* eslint-disable @typescript-eslint/consistent-type-imports */
const { parseAsync, transformFromAstAsync, types } =
  require("@babel/core") as typeof import("@babel/core")
const { default: traverse } =
  require("@babel/traverse") as typeof import("@babel/traverse")
/* eslint-enable @typescript-eslint/consistent-type-imports */

const __dirname = dirname(fileURLToPath(import.meta.url))

export default function astroActionsIntegration(): AstroIntegration {
  return {
    name: "astro-actions",
    hooks: {
      "astro:config:setup": async (options) => {
        options.config.vite.plugins ??= []

        options.config.vite.plugins.push({
          name: "astro-actions:transform-action-calls",
          intro() {
            return `const __astro_actions = {}`
          },
          async transform(source, id) {
            try {
              if (/node_modules/.test(id)) return

              const sourceRegex = /\.(js|ts|jsx|tsx|mjs|cjs|mts|cts|astro)$/i
              if (!sourceRegex.test(id)) return

              const parseResult = await parseAsync(source)
              if (!parseResult) return

              const actionAssignments = []

              traverse(parseResult, {
                CallExpression: (path) => {
                  if (!path.isCallExpression()) return

                  const callee = path.get("callee")

                  const isAstroActionCall =
                    callee.isIdentifier({ name: "action$" }) &&
                    callee.referencesImport("astro-actions/runtime", "action$")

                  if (!isAstroActionCall) return

                  const callArgument = path.get("arguments").at(0)
                  if (!callArgument?.isExpression()) return

                  const { start, end } = callArgument.node
                  if (start == undefined || end == undefined) {
                    throw new Error(
                      "Could not determine location of action source",
                    )
                  }

                  const actionKey =
                    relative(fileURLToPath(options.config.root), id).replaceAll(
                      /\W+/g,
                      "_",
                    ) +
                    "_" +
                    actionAssignments.length

                  // add action source to the top of this file,
                  // assigning to __astro_actions
                  actionAssignments.push(
                    types.expressionStatement(
                      types.assignmentExpression(
                        "=",
                        types.memberExpression(
                          types.identifier("__astro_actions"),
                          types.stringLiteral(actionKey),
                          true,
                        ),
                        callArgument.node,
                      ),
                    ),
                  )

                  path.replaceWithSourceString(`
                    {
                      form: {
                        action: ${JSON.stringify(`/__actions__/${actionKey}`)},
                        method: "POST",
                      },
                      input: (name) => ({name})
                    }
                  `)
                },
              })

              if (actionAssignments.length === 0) return

              parseResult.program.body.push(...actionAssignments)

              const result = await transformFromAstAsync(
                parseResult,
                undefined,
                {
                  filename: id,
                  sourceMaps: true,
                  configFile: false,
                  babelrc: false,
                  presets: [
                    [
                      require.resolve("@babel/preset-typescript"),
                      { isTSX: true, allExtensions: true },
                    ],
                  ],
                },
              )

              return {
                code: result?.code ?? undefined,
                map: result?.map ?? undefined,
              }
            } catch (error) {
              console.error(error)
            }
          },
        })

        options.injectRoute({
          pattern: "/__actions__/[key]",
          entryPoint: "astro-actions/api",
        })
      },
    },
  }
}
