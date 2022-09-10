/* eslint-disable class-methods-use-this */
import type { Router, RouterState } from "./router.js"

export class DummyRouter implements Router {
  init() {}
  getState(): RouterState {
    return { status: "idle" }
  }
  subscribe() {
    return () => {}
  }
}
