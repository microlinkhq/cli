#!/usr/bin/env node

'use strict'

const escapeStringRegexp = require('escape-string-regexp')
const beautyError = require('beauty-error')
const querystring = require('querystring')
const mql = require('@microlink/mql')
const termImg = require('term-img')
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

const API_ENDPOINT_REGEX = new RegExp(
  `^(${ALL_ENDPOINTS.map(endpoint => endpoint).join('|')})`,
  'i'
)

const sanetizeInput = input =>
  input
    .replace(API_ENDPOINT_REGEX, '')
    .replace(/^\?/i, '')
    .replace(/^url=/i, '')

const print = (payload, { color }) => {
  color ? jsome(payload) : console.log(payload)
}

const printHeaders = (payload, opts) => {
  if (opts.printHeaders) print(payload, opts)
}

const printBody = (payload, opts) => {
  if (opts.printBody) print(payload, opts)
}

const main = async endpoint => {
  const cli = meow({
    description: false,
    help: require('./help'),
    flags: {
      printHeaders: {
        type: 'boolean',
        default: true
      },
      printBody: {
        type: 'boolean',
        default: true
      },
      color: {
        type: 'boolean',
        default: true
      }
    }
  })

  let [input] = cli.input
  input = `url=${sanetizeInput(input)}`

  const { url, ...opts } = querystring.parse(input)

  const mqlOpts = {
    encoding: null,
    json: false,
    endpoint,
    ...opts
  }

  const { response } = await mql(url, mqlOpts)

  const { body } = response

  printHeaders(response.headers, cli.flags)

  const contentType = response.headers['content-type'].toLowerCase()
  const isUTF = contentType.includes('utf')
  if (!isUTF) return termImg(body)
  const isText = contentType.includes('text/plain')
  const json = JSON.parse(body.toString())
  printBody(isText ? json.data : json, cli.flags)
}

module.exports = apiEndpoint =>
  main(apiEndpoint).catch(err => {
    console.error(beautyError(err))
    process.exit(1)
  })
