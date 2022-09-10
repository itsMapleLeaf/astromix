import type { Location } from "history"

export type Router = {
  init(): void
  getState(): RouterState
  subscribe(callback: (state: RouterState) => void): () => void
}

export type RouterState =
  | {
      status: "idle"
      navigation?: never
      submission?: never
    }
  | {
      status: "navigating"
      navigation: Navigation
      submission?: never
    }
  | {
      status: "submitting"
      navigation?: never
      submission: Submission
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
