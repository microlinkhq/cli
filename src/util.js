'use strict'

const clipboardy = require('clipboardy')

const toPlainHeaders = headers => Object.fromEntries(headers.entries())

const humanizeApiKey = apiKey => `${apiKey.substring(0, 5)}…`

const stringify = (value, { pretty }) =>
  JSON.stringify(value, null, pretty ? 2 : 0)

const toClipboard = (value, flags) =>
  clipboardy.writeSync(stringify(value, flags))

const hasColorizedOutput = () =>
  !process.env.NO_COLOR &&
  process.env.FORCE_COLOR !== '0' &&
  Boolean(process.stdout?.hasColors?.())

const parseHeaders = raw => {
  if (!raw) return {}

  const entries = Array.isArray(raw) ? raw : [raw]
  const headers = {}

  for (const entry of entries) {
    const idx = entry.indexOf(':')
    if (idx === -1) continue
    headers[entry.slice(0, idx).trim().toLowerCase()] = entry
      .slice(idx + 1)
      .trim()
  }

  return headers
}

module.exports = {
  hasColorizedOutput,
  humanizeApiKey,
  parseHeaders,
  stringify,
  toClipboard,
  toPlainHeaders
}
