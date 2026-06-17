#!/usr/bin/env node

'use strict'

require('update-notifier')({ pkg: require('../package.json') }).notify()

const getContentType = require('@kikobeats/content-type')
const { URLSearchParams } = require('url')
const mql = require('@microlink/mql')
const prettyMs = require('pretty-ms')
const temp = require('temperment')
const fs = require('fs')
const os = require('os')

const { toClipboard, toPlainHeaders } = require('./util')
const { gray, green } = require('./colors')
const printJson = require('./print-json')
const printText = require('./print-text')
const exit = require('./exit')

const microlinkUrl = () =>
  /^https?:\/\/((?!fonts|geolocation\.)[a-z0-9-]+\.)+microlink\.io/

// Leading-host matcher for the binary's own endpoint (e.g. `microlink-dev` →
// `http://localhost:3000`, `microlink-next` → `https://next.microlink.io`).
// Each binary sets its own `cli.flags.endpoint`, so the host we strip is driven
// by that flag rather than a blanket list shared across every executable.
const endpointUrl = endpoint => {
  if (!endpoint) return null
  let host
  try {
    ;({ host } = new URL(endpoint))
  } catch {
    return null
  }
  // Require a host boundary (path/query/fragment or end-of-string) after the
  // host so a longer host that merely *starts with* it isn't matched (e.g.
  // endpoint `localhost:3000` must not strip a prefix of `localhost:30001`).
  const escapedHost = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^https?://${escapedHost}(?=[/?#]|$)`)
}

const normalizeInput = (input, endpoint) => {
  if (!input) return input
  let normalized = input

  // Recognize API-shaped input (full endpoint URL, or a bare `?url=`/`url=`
  // query string) so a bare target URL is left untouched.
  let isApiInput = /^\??url=/.test(input) || input.startsWith('?')

  // Always strip a canonical `*.microlink.io` host (users paste these into any
  // binary), plus the binary's own endpoint host when it isn't on microlink.io.
  const sanitizers = [microlinkUrl()]
  const endpointRegex = endpointUrl(endpoint)
  if (endpointRegex) sanitizers.push(endpointRegex)

  for (const regex of sanitizers) {
    const next = normalized.replace(regex, '')
    if (next !== normalized) {
      isApiInput = true
      normalized = next
    }
  }

  if (!isApiInput) return normalized

  // Drop the leftover path/query separators after the host (e.g. `/?url=…`).
  normalized = normalized.replace(/^\/+/, '').replace(/^\?/, '')

  // Lift the `url=` param to the front so the caller's `url=${…}`
  // reconstruction keeps every other param intact regardless of their order
  // (e.g. `data.markdown.attr=markdown&embed=markdown&url=…`).
  const params = normalized.split('&')
  const urlIndex = params.findIndex(p => p === 'url' || p.startsWith('url='))
  if (urlIndex === -1) return normalized

  const urlValue = params[urlIndex].replace(/^url=?/, '')
  return [urlValue, ...params.filter((_, index) => index !== urlIndex)].join(
    '&'
  )
}

const getInput = input => {
  const collection = input.length === 1 ? input[0].split(os.EOL) : input
  return collection.map(item => item.trim()).join('')
}

const toPlainObject = input => Object.fromEntries(new URLSearchParams(input))

const fetch = async (cli, gotOpts) => {
  const {
    pretty,
    copy,
    json,
    'json-full': jsonFull,
    endpoint,
    ...flags
  } = cli.flags
  const isJson = json || jsonFull
  const input = getInput(cli.input, endpoint)
  const { url, ...queryParams } = toPlainObject(
    `url=${normalizeInput(input, endpoint)}`
  )
  const mqlOpts = { endpoint, ...queryParams, ...flags }
  const spinner = printText.spinner()
  const shouldSpin = !isJson && pretty

  let mergedGotOpts = gotOpts
  if (Object.keys(cli.headers).length > 0) {
    mergedGotOpts = {
      ...gotOpts,
      headers: { ...gotOpts.headers, ...cli.headers }
    }
  }

  const [requestUrl, requestOptions] = mql.getApiUrl(
    url,
    mqlOpts,
    mergedGotOpts
  )

  try {
    if (shouldSpin) spinner.start()

    const start = Date.now()
    const request = isJson ? mql : mql.buffer
    const mqlResponse = await request(url, mqlOpts, mergedGotOpts)
    const duration = Date.now() - start

    let response = mqlResponse
    if (isJson) {
      response = printJson({
        requestUrl,
        requestOptions,
        response: mqlResponse.response,
        full: jsonFull,
        pretty
      })
    }

    return { response, duration, flags: { copy, pretty, json: isJson } }
  } catch (error) {
    error.flags = cli.flags
    throw error
  } finally {
    if (shouldSpin) spinner.stop()
  }
}

const render = ({ response, duration, flags }) => {
  const { headers, requestUrl, url: responseUrl, body } = response

  if (flags.json) {
    if (flags.copy) toClipboard(JSON.parse(response), flags)
    if (!flags.pretty) return console.log(response)

    return printText.json(JSON.parse(response), { color: true })
  }

  const plainHeaders = toPlainHeaders(headers)

  const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body)
  const bodyText = bodyBuffer.toString()

  if (!flags.pretty) return console.log(bodyText)

  const contentType = getContentType(plainHeaders['content-type'])
  const time = Number.isFinite(duration) ? prettyMs(duration) : 'unknown'
  const serverTiming = plainHeaders['server-timing']
  const id = plainHeaders['x-request-id']

  if (bodyText.startsWith('data:')) {
    const extension = contentType
      ? contentType.split('/')[1].split(';')[0]
      : 'png'
    const filepath = temp.file({ extension })
    fs.writeFileSync(filepath, bodyText.split(',')[1], 'base64')
    printText.image(filepath)
  } else if (contentType !== 'application/json') {
    printText.image(bodyBuffer)
    console.log()
  } else {
    const isText = contentType === 'text/plain'
    const isHtml = contentType === 'text/html'
    const output = isText || isHtml ? bodyText : JSON.parse(bodyText)
    printText.json(output, flags)
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
    toClipboard(JSON.parse(bodyText), flags)
    console.error(`\n   ${gray('Copied to clipboard!')}`)
  }
}

module.exports = (cli, gotOpts = {}) =>
  exit(fetch(cli, gotOpts).then(render), cli)

module.exports.normalizeInput = normalizeInput
