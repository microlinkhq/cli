#!/usr/bin/env node

'use strict'

require('update-notifier')({ pkg: require('../package.json') }).notify()

const getContentType = require('@kikobeats/content-type')
const { URLSearchParams } = require('url')
const clipboardy = require('clipboardy')
const mql = require('@microlink/mql')
const prettyMs = require('pretty-ms')
const temp = require('temperment')
const fs = require('fs')
const os = require('os')

const { gray, green } = require('./colors')
const printJson = require('./print-json')
const printText = require('./print-text')
const exit = require('./exit')

const microlinkUrl = () =>
  /^https?:\/\/((?!fonts|geolocation\.)[a-z0-9-]+\.)+microlink\.io/

const normalizeInput = input => {
  if (!input) return input
  ;[
    microlinkUrl,
    () => require('is-local-address/ipv4').regex,
    () => require('is-local-address/ipv6').regex
  ].forEach(regex => {
    return (input = input.replace(regex(), ''))
  })
  return input.replace(/^\??url=/, '')
}

const getInput = input => {
  const collection = input.length === 1 ? input[0].split(os.EOL) : input
  return collection.reduce((acc, item) => acc + item.trim(), '')
}

const toPlainObject = input => Object.fromEntries(new URLSearchParams(input))

const fetch = async (cli, gotOpts) => {
  const { pretty, copy, json, jsonFull, endpoint, ...flags } = cli.flags
  const isJson = json || jsonFull
  const input = getInput(cli.input, endpoint)
  const { url, ...queryParams } = toPlainObject(`url=${normalizeInput(input)}`)
  const mqlOpts = { endpoint, ...queryParams, ...flags }
  const spinner = printText.spinner()
  const shouldSpin = !isJson && pretty

  const mergedGotOpts =
    Object.keys(cli.headers).length > 0
      ? { ...gotOpts, headers: { ...gotOpts.headers, ...cli.headers } }
      : gotOpts
  const [requestUrl, requestOptions] = mql.getApiUrl(
    url,
    mqlOpts,
    mergedGotOpts
  )

  try {
    if (shouldSpin) spinner.start()
    const start = Date.now()
    const mqlResponse = isJson
      ? await mql(url, mqlOpts, mergedGotOpts)
      : await mql.buffer(url, mqlOpts, mergedGotOpts)
    const duration = Date.now() - start
    const response = isJson
      ? printJson({
        requestUrl,
        requestOptions,
        response: mqlResponse.response,
        full: jsonFull,
        pretty
      })
      : mqlResponse
    if (shouldSpin) spinner.stop()
    return { response, duration, flags: { copy, pretty, json: isJson } }
  } catch (error) {
    if (shouldSpin) spinner.stop()
    error.flags = cli.flags
    throw error
  }
}

const render = ({ response, duration, flags }) => {
  const { headers, requestUrl, url: responseUrl, body } = response
  if (flags.json) {
    if (flags.copy) clipboardy.writeSync(response)
    if (!flags.pretty) return console.log(response)
    try {
      return printText.json(JSON.parse(response), { color: true })
    } catch (error) {
      return console.log(response)
    }
  }

  const plainHeaders =
    headers && typeof headers.entries === 'function'
      ? Object.fromEntries(headers.entries())
      : headers

  const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body)
  const bodyText = bodyBuffer.toString()

  if (!flags.pretty) return console.log(bodyText)

  const contentType = getContentType(plainHeaders['content-type'])
  const time = Number.isFinite(duration) ? prettyMs(duration) : 'unknown'
  const serverTiming = plainHeaders['server-timing']
  const id = plainHeaders['x-request-id']

  const printMode = (() => {
    if (bodyText.startsWith('data:')) return 'base64'
    if (contentType !== 'application/json') return 'image'
  })()

  switch (printMode) {
    case 'base64': {
      const extension = contentType
        ? contentType.split('/')[1].split(';')[0]
        : 'png'
      const filepath = temp.file({ extension })
      fs.writeFileSync(filepath, bodyText.split(',')[1], 'base64')
      printText.image(filepath)
      break
    }
    case 'image':
      printText.image(bodyBuffer)
      console.log()
      break
    default: {
      const isText = contentType === 'text/plain'
      const isHtml = contentType === 'text/html'
      const output = isText || isHtml ? bodyText : JSON.parse(bodyText)
      printText.json(output, flags)
      break
    }
  }

  const edgeCacheStatus = plainHeaders['cf-cache-status']
  const unifiedCacheStatus = plainHeaders['x-cache-status']

  const cacheStatus =
    unifiedCacheStatus === 'MISS' && edgeCacheStatus === 'HIT'
      ? edgeCacheStatus
      : unifiedCacheStatus

  const timestamp = Number(plainHeaders['x-timestamp'])
  const ttl = Number(plainHeaders['x-cache-ttl'])
  const expires = timestamp + ttl - Date.now()
  const expiration = prettyMs(expires)
  const expiredAt = cacheStatus === 'HIT' ? `(${expiration})` : ''
  const fetchMode = plainHeaders['x-fetch-mode']
  const fetchTime = fetchMode && `(${plainHeaders['x-fetch-time']})`
  const size = Number(plainHeaders['content-length'] || bodyBuffer.length)
  const uri = requestUrl || responseUrl

  console.error()
  console.error(
    printText.label('success', 'green'),
    gray(`${printText.bytes(size)} in ${time}`)
  )
  console.error()

  if (serverTiming) {
    console.error('  ', printText.keyValue(green('timing'), serverTiming))
  }

  if (cacheStatus) {
    console.error(
      '   ',
      printText.keyValue(green('cache'), `${cacheStatus} ${gray(expiredAt)}`)
    )
  }

  if (fetchMode) {
    console.error(
      '    ',
      printText.keyValue(green('mode'), `${fetchMode} ${gray(fetchTime)}`)
    )
  }

  console.error('     ', printText.keyValue(green('uri'), uri))
  console.error('      ', printText.keyValue(green('id'), id))

  if (flags.copy) {
    let copiedValue
    try {
      copiedValue = JSON.parse(bodyText)
    } catch (err) {
      copiedValue = bodyText
    }
    clipboardy.writeSync(JSON.stringify(copiedValue, null, 2))
    console.error(`\n   ${gray('Copied to clipboard!')}`)
  }
}

module.exports = (cli, gotOpts = {}) =>
  exit(fetch(cli, gotOpts).then(render), cli)

module.exports.normalizeInput = normalizeInput
