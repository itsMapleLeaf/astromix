import { router } from "astromix"
import { useEffect, useState } from "preact/hooks"

export function PendingIndicator() {
  const [state, setState] = useState(router.getState())
  useEffect(() => router.subscribe(setState), [])
  return state.status === "idle" ? (
    <></>
  ) : (
    <p style={{ margin: 0 }}>Loading...</p>
  )
}
