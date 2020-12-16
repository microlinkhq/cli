#!/usr/bin/env node

'use strict'

require('update-notifier')({ pkg: require('../package.json') }).notify()

const spinner = require('ora')({ text: '', color: 'white' })
const escapeStringRegexp = require('escape-string-regexp')
const querystring = require('querystring')
const clipboardy = require('clipboardy')
const mql = require('@microlink/mql')
const prettyMs = require('pretty-ms')
const temp = require('temperment')
const createGot = require('got')
const chalk = require('chalk')
const meow = require('meow')
const fs = require('fs')
const os = require('os')

const print = require('./print')

const GOT_OPTS = {
  headers: {
    authorization: process.env.MICROLINK_API_AUTHORIZATION
  }
}

const got = createGot.extend(GOT_OPTS)

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

const normalizeInput = (input, endpoint) => {
  if (!input) return input
  const difference = ALL_ENDPOINTS.filter(elem => ![endpoint].includes(elem))
  const endpointRegex = createEndpointRegex(difference)
  return input.replace(endpointRegex, endpoint)
}

const prefixInput = (input, endpoint) => {
  if (input.includes(endpoint)) return input
  if (input.includes('url=')) return input
  return `url=${input}`
}

const getInput = input => {
  const collection = input.length === 1 ? input[0].split(os.EOL) : input
  return collection.reduce((acc, item) => acc + item.trim(), '')
}

const main = async endpoint => {
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

  const input = getInput(cli.input, endpoint)
  const { pretty, color, copy, ...restOpts } = cli.flags
  const normalizedInput = normalizeInput(input, endpoint)
  const prefixedInput = prefixInput(normalizedInput, endpoint)
  const { url, ...opts } = querystring.parse(prefixedInput)
  const now = Date.now()

  const interval = setInterval(() => {
    const elapsedTime = Date.now() - now
    if (elapsedTime > 500) spinner.text = `${prettyMs(elapsedTime)}`
  }, 100)

  try {
    console.log()
    spinner.start()

    const { response } = await (async () => {
      const mqlOpts = { ...opts, ...restOpts }
      if (url) return mql.buffer(url, { endpoint, ...mqlOpts }, GOT_OPTS)
      const response = await got(endpoint, mqlOpts)
      return { response }
    })()
    spinner.stop()
    clearInterval(interval)
    return {
      ...response,
      flags: { copy, pretty }
    }
  } catch (error) {
    spinner.stop()
    clearInterval(interval)
    error.flags = cli.flags
    throw error
  }
}

module.exports = apiEndpoint => {
  main(apiEndpoint)
    .then(({ url: uri, body, headers, flags, timings }) => {
      if (!flags.pretty) return console.log(body.toString())
      const time = prettyMs(timings.end - timings.start)
      const contentType = headers['content-type'].toLowerCase()
      const id = headers['x-request-id']
      const printMode = (() => {
        if (body.toString().startsWith('data:')) return 'base64'
        if (!contentType.includes('utf')) return 'image'
      })()

      switch (printMode) {
        case 'base64': {
          const extension = contentType.split('/')[1].split(';')[0]
          const filepath = temp.file({ extension })
          fs.writeFileSync(filepath, body.toString().split(',')[1], 'base64')
          print.image(filepath)
          break
        }
        case 'image':
          print.image(body)
          console.log()
          break
        default: {
          const isText = contentType.includes('text/plain')
          print.json(isText ? body.toString() : JSON.parse(body).data, flags)
          break
        }
      }

      const cache = headers['x-cache-status']
      const expiredAt =
        cache === 'HIT' ? `(${headers['x-cache-expired-at']} left)` : ''

      const fetchMode = headers['x-fetch-mode']
      const fetchTime = fetchMode && `(${headers['x-fetch-time']})`
      const size = Number(headers['content-length'] || Buffer.byteLength(body))
      console.log()
      console.log(
        print.label('success', 'green'),
        chalk.gray(`${print.bytes(size)} in ${time}`)
      )
      console.log()

      if (cache) {
        console.log(
          '',
          print.keyValue(
            chalk.green('cache'),
            `${cache || '-'} ${chalk.gray(expiredAt)}`
          )
        )
      }

      if (fetchMode) {
        console.log(
          '',
          print.keyValue(
            chalk.green(' mode'),
            `${fetchMode} ${chalk.gray(fetchTime)}`
          )
        )
      }

      console.log(cache ? '  ' : '', print.keyValue(chalk.green('uri'), uri))
      console.log(cache ? '   ' : ' ', print.keyValue(chalk.green('id'), id))

      if (flags.copy) {
        let copiedValue
        try {
          copiedValue = JSON.parse(body)
        } catch (err) {
          copiedValue = body
        }
        clipboardy.writeSync(JSON.stringify(copiedValue, null, 2))
        console.log(`\n   ${chalk.gray('Copied to clipboard!')}`)
      }
    })
    .then(process.exit)
    .catch(error => {
      const id = error.headers && error.headers['x-request-id']

      if (error.flags.pretty) {
        console.log(
          ' ',
          print.label((error.status || 'fail').toUpperCase(), 'red'),
          chalk.gray(error.message.replace(`${error.code}, `, ''))
        )
        console.log()
        if (error.data) {
          console.log(print.keyValue('   ', JSON.stringify(error.data)))
          console.log()
        }
        id && console.log('    ', print.keyValue(chalk.red('id'), id))
        error.url &&
          console.log('   ', print.keyValue(chalk.red('uri'), error.url))
        console.log(
          '  ',
          print.keyValue(
            chalk.red('code'),
            `${error.code} ${error.statusCode ? `(${error.statusCode})` : ''}`
          )
        )
        error.more &&
          console.log(
            '  ',
            print.keyValue(
              chalk.red('more'),
              print.link('click to report', error.report)
            )
          )

        process.exit(1)
      }
    })
}
