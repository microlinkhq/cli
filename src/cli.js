'use strict'

const mri = require('mri')

const { _, ...flags } = mri(process.argv.slice(2), {
  default: {
    apiKey: {
      default: process.env.MICROLINK_API_KEY
    },
    pretty: {
      type: 'boolean',
      default: true
    },
    color: {
      type: 'boolean',
      default: true
    },
    copy: {
      type: 'boolean',
      default: false
    }
  }
})

module.exports = {
  flags,
  input: _,
  showHelp: () => console.log(require('./help'))
}
