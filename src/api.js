#!/usr/bin/env node

'use strict'

require('update-notifier')({ pkg: require('../package.json') }).notify()

const localhostUrl = require('localhost-url-regex')
const { URLSearchParams } = require('url')
const clipboardy = require('clipboardy')
const mql = require('@microlink/mql')
const prettyMs = require('pretty-ms')
const colors = require('picocolors')
const temp = require('temperment')
const fs = require('fs')
const os = require('os')

const print = require('./print')
const exit = require('./exit')

const microlinkUrl = () => /^https?.*\.microlink\.io/gi

const normalizeInput = input => {
  if (!input) return input
  ;[microlinkUrl, localhostUrl].forEach(
    regex => (input = input.replace(regex(), ''))
  )
  return input.replace(/^\??url=/, '')
}

const getInput = input => {
  const collection = input.length === 1 ? input[0].split(os.EOL) : input
  return collection.reduce((acc, item) => acc + item.trim(), '')
}

const toPlainObject = input => Object.fromEntries(new URLSearchParams(input))

const fetch = async (cli, gotOpts) => {
  const { pretty, color, copy, endpoint, ...flags } = cli.flags
  const input = getInput(cli.input, endpoint)
  const { url, ...queryParams } = toPlainObject(`url=${normalizeInput(input)}`)
  const mqlOpts = { endpoint, ...queryParams, ...flags }
  const spinner = print.spinner()

  try {
    console.log()
    spinner.start()
    const { body, response } = await mql.buffer(url, mqlOpts, {
      retry: 0,
      ...gotOpts
    })
    spinner.stop()
    return { body, response, flags: { copy, pretty } }
  } catch (error) {
    spinner.stop()
    error.flags = cli.flags
    throw error
  }
}

const render = ({ body, response, flags }) => {
  const { headers, timings, requestUrl: uri } = response
  if (!flags.pretty) return console.log(body.toString())

  const contentType = headers['content-type'].toLowerCase()
  const time = prettyMs(timings.phases.total)
  const serverTiming = headers['server-timing']
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
      const isHtml = contentType.includes('text/html')
      const output = isText || isHtml ? body.toString() : JSON.parse(body)
      print.json(output, flags)
      break
    }
  }

  const edgeCacheStatus = headers['cf-cache-status']
  const unifiedCacheStatus = headers['x-cache-status']

  const cacheStatus =
    unifiedCacheStatus === 'MISS' && edgeCacheStatus === 'HIT'
      ? edgeCacheStatus
      : unifiedCacheStatus

  const timestamp = Number(headers['x-timestamp'])
  const ttl = Number(headers['x-cache-ttl'])
  const expires = timestamp + ttl - Date.now()
  const expiration = prettyMs(expires)
  const expiredAt = cacheStatus === 'HIT' ? `(${expiration})` : ''
  const fetchMode = headers['x-fetch-mode']
  const fetchTime = fetchMode && `(${headers['x-fetch-time']})`
  const size = Number(headers['content-length'] || Buffer.byteLength(body))

  console.log()
  console.log(
    print.label('success', 'green'),
    colors.gray(`${print.bytes(size)} in ${time}`)
  )
  console.log()

  if (serverTiming) {
    console.log('  ', print.keyValue(colors.green('timing'), serverTiming))
  }

  if (cacheStatus) {
    console.log(
      '   ',
      print.keyValue(
        colors.green('cache'),
        `${cacheStatus} ${colors.gray(expiredAt)}`
      )
    )
  }

  if (fetchMode) {
    console.log(
      '    ',
      print.keyValue(
        colors.green('mode'),
        `${fetchMode} ${colors.gray(fetchTime)}`
      )
    )
  }

  console.log('     ', print.keyValue(colors.green('uri'), uri))
  console.log('      ', print.keyValue(colors.green('id'), id))

  if (flags.copy) {
    let copiedValue
    try {
      copiedValue = JSON.parse(body)
    } catch (err) {
      copiedValue = body
    }
    clipboardy.writeSync(JSON.stringify(copiedValue, null, 2))
    console.log(`\n   ${colors.gray('Copied to clipboard!')}`)
  }
}

module.exports = (cli, gotOpts = {}) =>
  exit(fetch(cli, gotOpts).then(render), cli)

module.exports.normalizeInput = normalizeInput
