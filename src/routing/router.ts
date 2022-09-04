import { createBrowserHistory } from "history"

const history = createBrowserHistory()

function navigate(url: string) {
  history.push(url)
}

history.listen(async ({ location }) => {
  const response = await fetch(
    location.pathname + location.search + location.hash,
  )
  const html = await response.text()
  const newDocument = new DOMParser().parseFromString(html, "text/html")
  document.head.innerHTML = newDocument.head.innerHTML
  document.body.innerHTML = newDocument.body.innerHTML

  addElementListeners()
})

addElementListeners()

function addElementListeners() {
  for (const link of document.querySelectorAll("a")) {
    link.addEventListener("click", (event) => {
      event.preventDefault()
      navigate(link.href)
    })
  }

  for (const form of document.querySelectorAll("form")) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault()

      try {
        const method = form.method.toUpperCase()
        const formData = new FormData(form)
        const searchParams = new URLSearchParams()

        for (const [key, value] of formData.entries()) {
          if (typeof value === "string") {
            searchParams.append(key, value)
          }
        }

        let url = new URL(form.action, window.location.origin).href
        let init: RequestInit = { method }
        if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
          url += "?" + searchParams.toString()
        } else {
          init.body = searchParams
          init.headers = {
            "content-type": "application/x-www-form-urlencoded",
          }
        }

        const response = await fetch(url, init)
        if (response.redirected) {
          history.push(response.url)
        }
      } catch (error) {
        console.error(error)
      }
    })
  }
}
