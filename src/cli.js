'use strict'

const meow = require('meow')

const cli = meow({
  description: false,
  help: require('./help'),
  flags: {
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

if (cli.flags.apiKey) cli.flags.endpoint = 'https://pro.microlink.io'

module.exports = cli
