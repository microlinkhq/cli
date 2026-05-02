'use strict'

const path = require('path')
const test = require('ava')

const { loadFresh, withModuleMocks } = require('./helpers/module-mocks')

test.serial('humanize api key', t => {
  const { humanizeApiKey } = require('../src/util')
  t.is(humanizeApiKey('1234567890'), '12345…')
})

test.serial('stringify pretty', t => {
  const { stringify } = require('../src/util')
  const output = stringify({ hello: 'world' }, { pretty: true })

  t.true(output.includes('\n'))
  t.deepEqual(JSON.parse(output), { hello: 'world' })
})

test.serial('stringify compact', t => {
  const { stringify } = require('../src/util')
  const output = stringify({ hello: 'world' }, { pretty: false })

  t.false(output.includes('\n'))
  t.is(output, '{"hello":"world"}')
})

test.serial('to plain headers', t => {
  const { toPlainHeaders } = require('../src/util')
  const output = toPlainHeaders(new Headers({ 'x-test': '1' }))

  t.deepEqual(output, { 'x-test': '1' })
})

test.serial('to clipboard writes serialized payload', async t => {
  let written

  await withModuleMocks(
    {
      clipboardy: {
        writeSync: value => {
          written = value
        }
      }
    },
    async () => {
      const utilPath = path.join(process.cwd(), 'src/util.js')
      const { toClipboard } = loadFresh(utilPath)
      toClipboard({ hello: 'world' }, { pretty: true })
    }
  )

  t.is(written, '{\n  "hello": "world"\n}')
})

test.serial('hasColorizedOutput returns false when NO_COLOR is set', t => {
  const { hasColorizedOutput } = require('../src/util')
  const initialNoColor = process.env.NO_COLOR

  process.env.NO_COLOR = '1'

  t.false(hasColorizedOutput())

  if (initialNoColor === undefined) delete process.env.NO_COLOR
  else process.env.NO_COLOR = initialNoColor
})

test.serial('hasColorizedOutput returns false when FORCE_COLOR=0', t => {
  const { hasColorizedOutput } = require('../src/util')
  const initialNoColor = process.env.NO_COLOR
  const initialForceColor = process.env.FORCE_COLOR

  delete process.env.NO_COLOR
  process.env.FORCE_COLOR = '0'

  t.false(hasColorizedOutput())

  if (initialNoColor === undefined) delete process.env.NO_COLOR
  else process.env.NO_COLOR = initialNoColor

  if (initialForceColor === undefined) delete process.env.FORCE_COLOR
  else process.env.FORCE_COLOR = initialForceColor
})

test.serial('hasColorizedOutput delegates to process.stdout.hasColors', t => {
  const { hasColorizedOutput } = require('../src/util')
  const initialNoColor = process.env.NO_COLOR
  const initialForceColor = process.env.FORCE_COLOR
  const initialHasColors = process.stdout.hasColors

  delete process.env.NO_COLOR
  delete process.env.FORCE_COLOR
  process.stdout.hasColors = () => true

  t.true(hasColorizedOutput())

  process.stdout.hasColors = () => false
  t.false(hasColorizedOutput())

  if (initialHasColors === undefined) delete process.stdout.hasColors
  else process.stdout.hasColors = initialHasColors

  if (initialNoColor === undefined) delete process.env.NO_COLOR
  else process.env.NO_COLOR = initialNoColor

  if (initialForceColor === undefined) delete process.env.FORCE_COLOR
  else process.env.FORCE_COLOR = initialForceColor
})
