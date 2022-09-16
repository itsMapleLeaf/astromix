import type { APIRoute } from "astro"

declare const __astro_actions: Record<string, () => unknown>

export const post: APIRoute = async ({ request, params }) => {
  const actionFn = __astro_actions[params.key!]
  if (!actionFn) throw new Error(`Action not found: ${params.key}`)

  request.headers.set(
    "content-type",
    request.headers.get("content-type") || "application/x-www-form-urlencoded",
  )

  const body = Object.fromEntries(await request.formData())
  const response = await actionFn(body)
  if (!(response instanceof Response)) {
    throw new TypeError(`Action did not return a Response: ${params.key}`)
  }

  return response
}
