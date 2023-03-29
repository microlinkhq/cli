'use strict'

const test = require('ava')

const { normalizeInput } = require('../src/api')

test('clean API endpoint', t => {
  t.is(
    normalizeInput('https://api.microlink.io?url=https://example.com&force'),
    'https://example.com&force'
  )
  t.is(
    normalizeInput('?url=https://example.com&force'),
    'https://example.com&force'
  )
  t.is(
    normalizeInput('url=https://example.com&force'),
    'https://example.com&force'
  )
  t.is(
    normalizeInput('url=https://example.com&force&ping'),
    'https://example.com&force&ping'
  )
  t.is(
    normalizeInput('url=https://example.com&force&ping.url=false'),
    'https://example.com&force&ping.url=false'
  )
})
