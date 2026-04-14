'use strict'

const mri = require('mri')

const { _, header, ...flags } = mri(process.argv.slice(2), {
  alias: { H: 'header' },
  boolean: ['color', 'copy', 'pretty'],
  string: ['header'],
  default: {
    apiKey: process.env.MICROLINK_API_KEY,
    pretty: true,
    color: true,
    copy: false
  }
})

const parseHeaders = raw => {
  if (!raw) return {}
  const entries = Array.isArray(raw) ? raw : [raw]
  const headers = {}
  for (const entry of entries) {
    const idx = entry.indexOf(':')
    if (idx === -1) continue
    headers[entry.slice(0, idx).trim().toLowerCase()] = entry.slice(idx + 1).trim()
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
