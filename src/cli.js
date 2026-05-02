'use strict'

const mri = require('mri')
const { hasColorizedOutput, parseHeaders } = require('./util')

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
