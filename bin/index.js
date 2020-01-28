#!/usr/bin/env node

'use strict'

require('update-notifier')({ pkg: require('../package.json') }).notify()

const escapeStringRegexp = require('escape-string-regexp')

const querystring = require('querystring')
const clipboardy = require('clipboardy')
const mql = require('@microlink/mql')
const prettyMs = require('pretty-ms')
const temp = require('temperment')
const chalk = require('chalk')
const meow = require('meow')
const spinner = require('ora')({ text: '', color: 'white' })
const fs = require('fs')

const print = require('./print')

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
      },
      copy: {
        type: 'boolean',
        default: false
      }
    }
  })

  const [cliInput] = cli.input
  const input = sanetizeInput(cliInput, endpoint)

  const stringifyInput = (() => {
    if (input.includes(endpoint)) return input
    if (input.includes('url=')) return input
    return `url=${input}`
  })()

  const { url, ...opts } = querystring.parse(stringifyInput)

  const mqlOpts = {
    encoding: null,
    json: false,
    endpoint,
    ...opts
  }

  const now = Date.now()

  const interval = setInterval(() => {
    const elapsedTime = Date.now() - now
    if (elapsedTime > 500) spinner.text = `${prettyMs(elapsedTime)}`
  }, 100)

  try {
    console.log()
    spinner.start()
    const { response } = await mql(url, mqlOpts)

    const sanetizeUrl = new URL(response.url)
    ;['json', 'encoding'].forEach(key => sanetizeUrl.searchParams.delete(key))
    response.url = sanetizeUrl.toString()

    spinner.stop()
    clearInterval(interval)
    return { ...response, flags: cli.flags }
  } catch (err) {
    spinner.stop()
    clearInterval(interval)
    err.flags = cli.flags
    throw err
  }
}

module.exports = apiEndpoint =>
  main(apiEndpoint)
    .then(({ url: uri, body, headers, flags }) => {
      const contentType = headers['content-type'].toLowerCase()
      const printMode = (() => {
        if (body.toString().startsWith('data:')) return 'base64'
        if (!contentType.includes('utf')) return 'image'
      })()

      if (flags.printBody) {
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
      }

      if (flags.printResume) {
        const cache = headers['x-cache-status']
        const expiredAt =
          cache === 'HIT' ? `(${headers['x-cache-expired-at']} left)` : ''
        const fetchMode = headers['x-fetch-mode']
        const fetchTime = `(${headers['x-fetch-time']})`
        const time = headers['x-response-time']
        const size = Number(
          headers['content-length'] || Buffer.byteLength(body)
        )
        console.log()
        console.log(
          ' ',
          print.label('success', 'green'),
          chalk.gray(`${print.bytes(size)} in ${time}`)
        )
        console.log()
        console.log('    ', print.keyValue(chalk.green('uri'), uri))
        console.log(
          '  ',
          print.keyValue(
            chalk.green('cache'),
            `${cache} ${chalk.gray(expiredAt)}`
          )
        )
        console.log(
          '  ',
          print.keyValue(
            chalk.green(' mode'),
            `${fetchMode} ${chalk.gray(fetchTime)}`
          )
        )
      }

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

      process.exit(0)
    })
    .catch(err => {
      if (err.flags.printResume) {
        console.log(
          ' ',
          print.label((err.status || 'fail').toUpperCase(), 'red'),
          chalk.gray(err.message.replace(`${err.code}, `, ''))
        )
        console.log()
        if (err.data) {
          console.log(print.keyValue('   ', JSON.stringify(err.data)))
          console.log()
        }
        err.id && console.log('  ', print.keyValue(chalk.red('  id'), err.id))
        err.url && console.log('  ', print.keyValue(chalk.red(' uri'), err.url))
        console.log(
          '  ',
          print.keyValue(
            chalk.red('code'),
            `${err.code} ${err.statusCode ? `(${err.statusCode})` : ''}`
          )
        )
        err.more &&
          console.log(
            '  ',
            print.keyValue(
              chalk.red('more'),
              print.link('click to report', err.more)
            )
          )
      }

      process.exit(1)
    })
