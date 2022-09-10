import { BrowserRouter } from "./browser-router.js"
import { DummyRouter } from "./dummy-router.js"
import type { Router } from "./router.js"

export const router: Router =
  typeof window !== "undefined" ? new BrowserRouter() : new DummyRouter()

export {
  type Navigation,
  type Router,
  type RouterState,
  type Submission,
} from "./router.js"
