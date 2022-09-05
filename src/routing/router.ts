import { createBrowserHistory, Location } from "history"
import morphdom from "morphdom"
import { atom } from "nanostores"

declare global {
  var routerInitialized: boolean | undefined
}

if (!window.routerInitialized) {
  window.routerInitialized = true
  initRouter()
}

function initRouter() {
  type RouterState =
    | { status: "idle" }
    | { status: "navigating"; location: Location; controller: AbortController }
    | { status: "submitting"; key: string; controller: AbortController }

  const routerState = atom<RouterState>({ status: "idle" })
  const history = createBrowserHistory()
  const domParser = new DOMParser()

  routerState.listen(console.info)

  const executedScriptUrls = new Set(
    [...document.scripts].map((script) => script.src),
  )

  history.listen(async ({ location }) => {
    try {
      const state = routerState.get()
      if ("controller" in state) {
        state.controller.abort()
      }

      const controller = new AbortController()

      routerState.set({ status: "navigating", controller, location })

      const response = await fetch(
        location.pathname + location.search + location.hash,
        { signal: controller.signal },
      )

      const newDocument = domParser.parseFromString(
        await response.text(),
        "text/html",
      )

      morphdom(document.head, newDocument.head)
      morphdom(document.body, newDocument.body)

      for (const script of document.scripts) {
        if (script.src && executedScriptUrls.has(script.src)) continue
        if (script.src) executedScriptUrls.add(script.src)

        const newScript = document.createElement("script")
        if (script.type) newScript.type = script.type
        if (script.src) newScript.src = script.src
        if (script.async) newScript.async = script.async
        if (script.defer) newScript.defer = script.defer
        newScript.innerHTML = script.innerHTML
        document.body.append(newScript)
        script.remove()
      }
    } catch (error) {
      console.error(error)
    } finally {
      const state = routerState.get()
      if (
        state.status === "navigating" &&
        state.location.key === location.key
      ) {
        routerState.set({ status: "idle" })
      }
    }
  })

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented) return

    const link = event.composedPath().find((el): el is HTMLAnchorElement => {
      return (
        el instanceof HTMLAnchorElement &&
        el.href.startsWith(window.location.origin) &&
        el.target !== "_blank"
      )
    })
    if (!link) return

    event.preventDefault()

    let linkUrl: URL
    try {
      linkUrl = new URL(link.href, window.location.origin)
    } catch (error) {
      console.error(error)
      return
    }

    if (linkUrl.href === window.location.href) {
      return
    }

    history.push(link.href)
  })

  document.addEventListener("submit", async (event) => {
    const key = crypto.randomUUID()

    try {
      if (event.defaultPrevented) return

      const form = event.composedPath().find((el): el is HTMLFormElement => {
        return el instanceof HTMLFormElement
      })
      if (!form) return

      event.preventDefault()

      const formData = new FormData(form)
      const searchParams = new URLSearchParams()
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
          searchParams.append(key, value)
        }
      }

      const method = form.method.toUpperCase()
      const controller = new AbortController()
      const init: RequestInit = { method, signal: controller.signal }
      let url = new URL(form.action, window.location.origin).href
      if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
        url += "?" + searchParams.toString()
      } else {
        init.body = searchParams
        init.headers = {
          "content-type": "application/x-www-form-urlencoded",
        }
      }

      const state = routerState.get()
      if ("controller" in state) {
        state.controller.abort()
      }

      routerState.set({ status: "submitting", controller, key })

      const response = await fetch(url, init)
      if (response.redirected) {
        history.push(response.url)
      }
    } catch (error) {
      console.error(error)
    }
  })

  window.dispatchEvent(new Event("router:ready"))
}
