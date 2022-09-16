export function action$<Input>(
  fn: (input: Input) => Response | PromiseLike<Response>,
): {
  form: { action: string; method: string }
  input: (name: keyof Input) => { name: string }
} {
  const error = new Error(
    "Attempted to call action$() at runtime. Did you forget to include the integration?",
  )
  Error.captureStackTrace(error, action$)
  throw error
}
