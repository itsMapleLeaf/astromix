import { action$ } from "astro-actions/runtime"
import { setTimeout } from "node:timers/promises"

export const addComment = action$(
  async (input: { name: string; comment: string }) => {
    const params = new URLSearchParams(input)
    params.set("commentSuccess", "true")
    await setTimeout(3000)
    return new Response(undefined, {
      status: 303,
      headers: {
        Location: `/blog?${params.toString()}`,
      },
    })
  },
)
