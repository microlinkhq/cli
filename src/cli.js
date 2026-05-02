'use strict'

const mri = require('mri')

const hasColorizedOutput = () =>
  !process.env.NO_COLOR &&
  process.env.FORCE_COLOR !== '0' &&
  Boolean(process.stdout.hasColors?.())

const parsed = mri(process.argv.slice(2), {
  alias: { H: 'header' },
  boolean: ['copy', 'json', 'json-full', 'pretty'],
  string: ['header'],
  default: {
    apiKey: process.env.MICROLINK_API_KEY,
    pretty: hasColorizedOutput(),
    copy: false,
    json: false,
    'json-full': false
  }
})

const { _, header, ...flags } = parsed

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
