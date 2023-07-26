'use strict'

const mri = require('mri')

const { _, ...flags } = mri(process.argv.slice(2), {
  boolean: ['color', 'copy', 'pretty'],
  default: {
    apiKey: process.env.MICROLINK_API_KEY,
    pretty: true,
    color: true,
    copy: false,
    retry: 0
  }
})

module.exports = {
  flags,
  input: _,
  showHelp: () => {
    console.log(require('./help'))
    process.exit(0)
  }
}
