'use strict'

const mri = require('mri')

const supportsColorOutput = () => {
  if (process.env.NO_COLOR) return false
  if (process.env.FORCE_COLOR === '0') return false

  if (process.stdout && typeof process.stdout.hasColors === 'function') {
    return process.stdout.hasColors()
  }

  return Boolean(process.stdout && process.stdout.isTTY)
}

const parsed = mri(process.argv.slice(2), {
  alias: { H: 'header' },
  boolean: ['copy', 'json', 'jsonFull', 'pretty'],
  string: ['header'],
  default: {
    apiKey: process.env.MICROLINK_API_KEY,
    pretty: supportsColorOutput(),
    copy: false,
    json: false,
    jsonFull: false
  }
})

const { _, header, 'json-full': jsonFullDashed, ...flags } = parsed

flags.jsonFull = Boolean(flags.jsonFull || jsonFullDashed)

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

const headers = parseHeaders(header)

module.exports = {
  flags,
  headers,
  input: _,
  showHelp: () => {
    console.log(require('./help'))
    process.exit(0)
  }
}

module.exports.parseHeaders = parseHeaders
