'use strict'

const test = require('ava')

const { parseHeaders } = require('../src/cli')

test('single header', t => {
  t.deepEqual(parseHeaders('x-user-cookie: 1'), { 'x-user-cookie': '1' })
})

test('multiple headers as array', t => {
  t.deepEqual(
    parseHeaders(['x-user-cookie: 1', 'authorization: Bearer token123']),
    { 'x-user-cookie': '1', authorization: 'Bearer token123' }
  )
})

test('header with colons in value', t => {
  t.deepEqual(parseHeaders('authorization: Bearer a:b:c'), {
    authorization: 'Bearer a:b:c'
  })
})

test('trims whitespace', t => {
  t.deepEqual(parseHeaders('  X-Custom :  value  '), { 'x-custom': 'value' })
})

test('skips entries without colon', t => {
  t.deepEqual(parseHeaders(['valid: yes', 'nocolon']), { valid: 'yes' })
})

test('returns empty object for undefined', t => {
  t.deepEqual(parseHeaders(undefined), {})
})

test('returns empty object for empty string', t => {
  t.deepEqual(parseHeaders(''), {})
})
