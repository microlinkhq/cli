#!/usr/bin/env node

'use strict'

const escapeStringRegexp = require('escape-string-regexp')
const terminalLink = require('terminal-link')
const prettyBytes = require('pretty-bytes')
const querystring = require('querystring')
const mql = require('@microlink/mql')
const termImg = require('term-img')
const chalk = require('chalk')
const meow = require('meow')

const jsome = require('./jsome')

const ALL_ENDPOINTS = [
  'api.microlink.io',
  'next.microlink.io',
  'pro.microlink.io',
  'localhost:3000'
].reduce(
  (acc, endpoint) => [
    ...acc,
    escapeStringRegexp(`http://${endpoint}`),
    escapeStringRegexp(`https://${endpoint}`)
  ],
  []
)

const createEndpointRegex = endpoints =>
  new RegExp(`^(${endpoints.map(endpoint => endpoint).join('|')})`, 'i')

const sanetizeInput = (input, endpoint) => {
  if (!input) return input
  const difference = ALL_ENDPOINTS.filter(elem => ![endpoint].includes(elem))
  const endpointRegex = createEndpointRegex(difference)
  return input.replace(endpointRegex, endpoint)
}

const print = (payload, { color }) => {
  color ? jsome(payload) : console.log(payload)
}

const printLabel = (text, color) =>
  chalk.inverse.bold[color](` ${text.toUpperCase()} `)

const pretty = (label, value) => {
  return value ? label + ' ' + chalk.gray(value) : undefined
}

const moreLink = (link = '') => {
  return link.startsWith('mailto')
    ? terminalLink('Click to report', link)
    : link
}

const main = async endpoint => {
  const cli = meow({
    description: false,
    help: require('./help'),
    flags: {
      printBody: {
        type: 'boolean',
        default: true
      },
      printResume: {
        type: 'boolean',
        default: true
      },
      color: {
        type: 'boolean',
        default: true
      }
    }
  })

  let [cliInput] = cli.input
  const input = sanetizeInput(cliInput, endpoint)
  const stringifyInput = input.includes(endpoint) ? input : `url=${input}`

  let { url, ...opts } = querystring.parse(stringifyInput)

  const mqlOpts = {
    encoding: null,
    json: false,
    endpoint,
    ...opts
  }

  try {
    const { response } = await mql(url, mqlOpts)
    return { ...response, flags: cli.flags }
  } catch (err) {
    err.flags = cli.flags
    throw err
  }
}

module.exports = apiEndpoint =>
  main(apiEndpoint)
    .then(({ body, headers, flags }) => {
      const contentType = headers['content-type'].toLowerCase()
      const isUTF = contentType.includes('utf')
      const isText = contentType.includes('text/plain')
      const json = JSON.parse(body.toString())

      if (flags.printBody) {
        if (!isUTF) termImg(body)
        else print(isText ? json.data : json, flags)
      }

      if (flags.printResume) {
        const cache = headers['x-cache-status']
        const expiredAt =
          cache === 'HIT' ? `(${headers['x-cache-expired-at']})` : ''
        const fetchMode = headers['x-fetch-mode']
        const fetchTime = `(${headers['x-fetch-time']})`
        const time = headers['x-response-time']
        const size = Number(headers['content-length'])
        console.log()
        console.log(
          ' ',
          printLabel('success', 'green'),
          chalk.gray(`${prettyBytes(size)} in ${time}`)
        )
        console.log()
        console.log(
          '  ',
          pretty(chalk.green('cache'), cache),
          chalk.gray(expiredAt)
        )
        console.log(
          '  ',
          pretty(chalk.green(' mode'), fetchMode),
          chalk.gray(fetchTime)
        )
      }
      process.exit(0)
    })
    .catch(err => {
      if (err.flags.printResume) {
        console.log()
        console.log(
          ` `,
          printLabel((err.status || 'fail').toUpperCase(), 'red'),
          chalk.gray(err.message.replace(`${err.code}, `, ''))
        )
        console.log()
        err.url && console.log('  ', pretty(chalk.red(' uri'), err.url))
        console.log(
          '  ',
          pretty(
            chalk.red('code'),
            `${err.code} ${err.statusCode ? `(${err.statusCode})` : ''}`
          )
        )
        err.more &&
          console.log('  ', pretty(chalk.red('more'), moreLink(err.more)))
      }

      process.exit(1)
    })
