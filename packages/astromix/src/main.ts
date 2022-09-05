import type { Location } from "history"
import { createBrowserHistory } from "history"
import morphdom from "morphdom"
import { atom } from "nanostores"

export type RouterState =
  | {
      status: "idle"
      navigation?: never
      submission?: never
      controller?: never
    }
  | {
      status: "navigating"
      navigation: Navigation
      submission?: never
      controller: AbortController
    }
  | {
      status: "submitting"
      navigation?: never
      submission: Submission
      controller: AbortController
    }

export type Navigation = {
  location: Location
}

export type Submission = {
  key: string
  action: string
  method: string
  formData: FormData
}

export type RouterApi = {
  subscribe: (callback: (state: RouterState) => void) => () => void
}

declare global {
  var Router: RouterApi
}

export const Router = (globalThis.Router ??= initRouter())

function initRouter(): RouterApi {
  const routerState = atom<RouterState>({ status: "idle" })
  const history = createBrowserHistory()
  const domParser = new DOMParser()
  const prefetchCache = new Map<
    string,
    { response: Promise<Response>; controller: AbortController }
  >()

  const executedScriptUrls = new Set(
    [...document.scripts].map((script) => script.src),
  )

  const observer = new MutationObserver((mutations) => {
    for (const node of mutations.flatMap((m) => [...m.addedNodes])) {
      addListeners(node)
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  history.listen(({ location }) => {
    void renderPage(location)
    prefetchCache.clear()
  })

  for (const node of document.body.querySelectorAll("a, form")) {
    addListeners(node)
  }

  function addListeners(node: Node) {
    if (node instanceof HTMLAnchorElement) {
      node.addEventListener("click", handleLinkClick)
      node.addEventListener("mouseenter", triggerPrefetch)
      node.addEventListener("focus", triggerPrefetch)
    }
    if (node instanceof HTMLFormElement) {
      node.addEventListener("submit", handleFormSubmit)
    }
  }

  async function renderPage(location: Location) {
    try {
      routerState.get().controller?.abort()

      const controller = new AbortController()

      routerState.set({
        status: "navigating",
        navigation: { location },
        controller,
      })

      const response = await fetch(
        location.pathname + location.search + location.hash,
        { mode: "same-origin", signal: controller.signal },
      )

      const newDocument = domParser.parseFromString(
        await response.text(),
        "text/html",
      )

      morphdom(document.head, newDocument.head)
      morphdom(document.body, newDocument.body)

      routerState.off()

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
      if (state.navigation?.location.key === location.key) {
        routerState.set({ status: "idle" })
      }
    }
  }

  async function triggerPrefetch(event: Event): Promise<void> {
    if (event.defaultPrevented) return

    const link = event.currentTarget as HTMLAnchorElement

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

    const linkPrefetch = document.createElement("link")
    linkPrefetch.rel = "prefetch"
    linkPrefetch.href = linkUrl.href
    link.after(linkPrefetch)
  }

  function handleLinkClick(event: MouseEvent): void {
    if (event.defaultPrevented) return
    event.preventDefault()

    const link = event.currentTarget as HTMLAnchorElement

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
  }

  async function handleFormSubmit(event: SubmitEvent): Promise<void> {
    if (event.defaultPrevented) return
    event.preventDefault()

    const form = event.currentTarget as HTMLFormElement
    const key = crypto.randomUUID()

    try {
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

      routerState.get().controller?.abort()

      routerState.set({
        status: "submitting",
        controller,
        submission: { key, action: form.action, method, formData },
      })

      const response = await fetch(url, init)
      if (response.redirected) {
        history.push(response.url)
      }
    } catch (error) {
      console.error(error)
    }
  }

  return {
    subscribe: (callback) => routerState.subscribe(callback),
  }
}
