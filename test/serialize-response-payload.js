'use strict'

const test = require('ava')

const serialize = require('../src/print-json')

test('serialize request and response payload', t => {
  const output = JSON.parse(
    serialize({
      requestUrl: 'https://api.microlink.io?url=https://example.com',
      requestOptions: { headers: { 'x-test': '1' }, responseType: 'json' },
      response: {
        statusCode: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        url: 'https://api.microlink.io',
        body: { status: 'success' }
      }
    })
  )

  t.deepEqual(output, {
    request: {
      url: 'https://api.microlink.io?url=https://example.com',
      headers: { 'x-test': '1' }
    },
    response: {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      url: 'https://api.microlink.io',
      body: { status: 'success' }
    }
  })
})

test('serialize headers from Headers constructor', t => {
  const output = JSON.parse(
    serialize({
      requestUrl: 'https://api.microlink.io?url=https://example.com',
      requestOptions: {},
      response: {
        headers: new Headers({
          'content-type': 'application/json',
          'x-test': 'yes'
        })
      }
    })
  )

  t.deepEqual(output.response.headers, {
    'content-type': 'application/json',
    'x-test': 'yes'
  })
})

test('mask api key by default', t => {
  const output = JSON.parse(
    serialize({
      requestUrl: 'https://api.microlink.io?url=https://example.com',
      requestOptions: {
        headers: { 'x-api-key': '1234567890' },
        responseType: 'json'
      },
      response: {
        headers: new Headers()
      }
    })
  )

  t.is(output.request.headers['x-api-key'], '12345…')
})

test('show full api key in full mode', t => {
  const output = JSON.parse(
    serialize({
      requestUrl: 'https://api.microlink.io?url=https://example.com',
      requestOptions: {
        headers: { 'x-api-key': '1234567890' },
        responseType: 'json'
      },
      response: {
        headers: new Headers()
      },
      full: true
    })
  )

  t.is(output.request.headers['x-api-key'], '1234567890')
})

test('serialize minified payload when pretty is false', t => {
  const output = serialize({
    requestUrl: 'https://api.microlink.io?url=https://example.com',
    requestOptions: { headers: {} },
    response: {
      statusCode: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      url: 'https://api.microlink.io',
      body: { status: 'success' }
    },
    pretty: false
  })

  t.false(output.includes('\n'))
  t.deepEqual(JSON.parse(output).response.body, { status: 'success' })
})
