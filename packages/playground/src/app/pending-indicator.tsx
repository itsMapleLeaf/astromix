import { router } from "astromix/client"
import { useEffect, useState } from "preact/hooks"

export function PendingIndicator() {
  const [loading, setLoading] = useState(false)
  useEffect(
    () => router.subscribe((state) => setLoading(state.status !== "idle")),
    [],
  )
  return loading ? <p style={{ margin: 0 }}>Loading...</p> : <></>
}
