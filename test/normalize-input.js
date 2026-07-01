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

test('endpoint with trailing slash', t => {
  t.is(
    normalizeInput(
      'https://api.microlink.io/?url=https://example.com&embed=markdown'
    ),
    'https://example.com&embed=markdown'
  )
})

test('params before url= are preserved (url lifted to front)', t => {
  t.is(
    normalizeInput(
      'https://api.microlink.io/?data.markdown.attr=markdown&embed=markdown&url=https://example.com'
    ),
    'https://example.com&data.markdown.attr=markdown&embed=markdown'
  )
})

test('bare target URL is left untouched', t => {
  t.is(
    normalizeInput('https://www.msn.com/en-gb/news/ar-AA23ijAE'),
    'https://www.msn.com/en-gb/news/ar-AA23ijAE'
  )
})

test('a microlink.io content host is a valid target, not an API host', t => {
  // cdn.microlink.io (and other content hosts) carry no `url=` param, so the
  // host must not be stripped as if it were an API endpoint
  t.is(
    normalizeInput('https://cdn.microlink.io/file-examples/sample.docx'),
    'https://cdn.microlink.io/file-examples/sample.docx'
  )
  // even given a dev endpoint, and with appended flags
  t.is(
    normalizeInput(
      'https://cdn.microlink.io/file-examples/sample.docx&pdf=true&meta=false',
      'http://localhost:3000'
    ),
    'https://cdn.microlink.io/file-examples/sample.docx&pdf=true&meta=false'
  )
})

test('endpoint host is stripped when passed (microlink-dev / microlink-next)', t => {
  t.is(
    normalizeInput(
      'http://localhost:3000/?data.markdown.attr=markdown&url=https://example.com',
      'http://localhost:3000'
    ),
    'https://example.com&data.markdown.attr=markdown'
  )
  t.is(
    normalizeInput(
      'https://next.microlink.io/?url=https://example.com&embed=markdown',
      'https://next.microlink.io'
    ),
    'https://example.com&embed=markdown'
  )
})

test('a pasted *.microlink.io URL is normalized by any binary', t => {
  // e.g. pasting a prod api URL into microlink-dev (endpoint = localhost)
  t.is(
    normalizeInput(
      'https://api.microlink.io/?url=https://example.com&embed=markdown',
      'http://localhost:3000'
    ),
    'https://example.com&embed=markdown'
  )
})

test('endpoint host is not stripped from a host that merely starts with it', t => {
  // endpoint `localhost:3000` must not strip the prefix of `localhost:30001`
  // (a different port), which would leave corrupted `1/?url=…` remainder text
  t.is(
    normalizeInput(
      'http://localhost:30001/?url=https://example.com',
      'http://localhost:3000'
    ),
    'http://localhost:30001/?url=https://example.com'
  )
})

test('endpoint host is NOT stripped by an unrelated binary', t => {
  // a localhost input given to the prod binary (no endpoint) stays as a bare
  // target URL — localhost stripping is scoped to the binary that targets it
  t.is(
    normalizeInput('http://localhost:3000/?url=https://example.com'),
    'http://localhost:3000/?url=https://example.com'
  )
})
