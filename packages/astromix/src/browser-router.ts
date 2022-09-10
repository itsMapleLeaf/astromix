import type { Location } from "history"
import { createBrowserHistory } from "history"
import morphdom from "morphdom"
import { atom } from "nanostores"
import type { Router, RouterState } from "./router.js"

type BrowserRouterState = RouterState & {
  controller?: AbortController
}

export class BrowserRouter implements Router {
  routerState = atom<BrowserRouterState>({ status: "idle" })
  history = createBrowserHistory()
  domParser = new DOMParser()

  executedScriptUrls = new Set(
    [...document.scripts].map((script) => script.src),
  )

  observer = new MutationObserver((mutations) => {
    for (const node of mutations.flatMap((m) => [...m.addedNodes])) {
      this.addListeners(node)
    }
  })

  init = () => {
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    this.history.listen(({ location }) => this.renderPage(location))

    for (const node of document.body.querySelectorAll("a, form")) {
      this.addListeners(node)
    }
  }

  getState = (): RouterState => this.routerState.get()

  subscribe = (callback: (state: RouterState) => void) =>
    this.routerState.subscribe(callback)

  private addListeners = (node: Node) => {
    if (node instanceof HTMLAnchorElement) {
      node.addEventListener("click", this.handleLinkClick)
      node.addEventListener("mouseenter", BrowserRouter.triggerPrefetch)
      node.addEventListener("focus", BrowserRouter.triggerPrefetch)
    }
    if (node instanceof HTMLFormElement) {
      node.addEventListener("submit", this.handleFormSubmit)
    }
  }

  private renderPage = async (location: Location) => {
    try {
      this.routerState.get().controller?.abort()

      const controller = new AbortController()

      this.routerState.set({
        status: "navigating",
        navigation: { location },
        controller,
      })

      const response = await fetch(
        location.pathname + location.search + location.hash,
        { mode: "same-origin", signal: controller.signal },
      )

      const newDocument = this.domParser.parseFromString(
        await response.text(),
        "text/html",
      )

      morphdom(document.head, newDocument.head)
      morphdom(document.body, newDocument.body)

      this.routerState.off()

      for (const script of document.scripts) {
        if (script.src && this.executedScriptUrls.has(script.src)) continue
        if (script.src) this.executedScriptUrls.add(script.src)

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
      const state = this.routerState.get()
      if (state.navigation?.location.key === location.key) {
        this.routerState.set({ status: "idle" })
      }
    }
  }

  private static triggerPrefetch = (event: Event) => {
    if (event.defaultPrevented) return

    const link = event.currentTarget
    if (!(link instanceof HTMLAnchorElement)) return
    if (!link.rel.includes("prefetch")) return
    if (link.href === window.location.href) return

    for (const existingPrefetch of document.querySelectorAll(
      "link[rel=prefetch]",
    )) {
      if (
        existingPrefetch instanceof HTMLLinkElement &&
        existingPrefetch.href === link.href
      ) {
        existingPrefetch.remove()
      }
    }

    const linkPrefetch = document.createElement("link")
    linkPrefetch.rel = "prefetch"
    linkPrefetch.href = link.href
    link.after(linkPrefetch)
  }

  private handleLinkClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return
    event.preventDefault()

    const link = event.currentTarget
    if (!(link instanceof HTMLAnchorElement)) return
    if (link.href === window.location.href) return

    this.history.push(link.href)
  }

  private handleFormSubmit = async (event: SubmitEvent) => {
    if (event.defaultPrevented) return
    event.preventDefault()

    const form = event.currentTarget
    if (!(form instanceof HTMLFormElement)) return

    const submitKey = crypto.randomUUID()

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

      this.routerState.get().controller?.abort()

      this.routerState.set({
        status: "submitting",
        controller,
        submission: { key: submitKey, action: form.action, method, formData },
      })

      const response = await fetch(url, init)
      if (response.redirected) {
        this.history.push(response.url)
      }
    } catch (error) {
      console.error(error)
    }
  }
}
