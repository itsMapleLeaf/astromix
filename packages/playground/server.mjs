// @ts-check
import express from "express"
import { handler } from "./dist/server/entry.mjs"

const app = express()
app.use(express.static("dist/client/"))
app.use(handler)

const port = process.env.PORT || 42_069
app.listen(port, () => {
  console.info(`listening on http://localhost:${port}`)
})
