'use strict'

const path = require('path')
const test = require('ava')

const { loadFresh, withModuleMocks } = require('./helpers/module-mocks')

test.serial('cli parses args, flags and headers', async t => {
  const originalArgv = process.argv
  const initialApiKey = process.env.MICROLINK_API_KEY

  const parseHeadersCalls = []

  process.argv = [
    'node',
    'microlink',
    'https://example.com',
    '-H',
    'x-user-cookie: 1',
    '--json'
  ]
  process.env.MICROLINK_API_KEY = 'api-key-test'

  try {
    await withModuleMocks(
      {
        './util': {
          hasColorizedOutput: () => false,
          parseHeaders: header => {
            parseHeadersCalls.push(header)
            return { parsed: true }
          }
        }
      },
      async () => {
        const cli = loadFresh(path.join(process.cwd(), 'src/cli.js'))

        t.deepEqual(parseHeadersCalls, ['x-user-cookie: 1'])
        t.deepEqual(cli.headers, { parsed: true })
        t.deepEqual(cli.input, ['https://example.com'])

        t.is(cli.flags.apiKey, 'api-key-test')
        t.is(cli.flags.pretty, false)
        t.is(cli.flags.json, true)
      }
    )
  } finally {
    process.argv = originalArgv

    if (initialApiKey === undefined) delete process.env.MICROLINK_API_KEY
    else process.env.MICROLINK_API_KEY = initialApiKey
  }
})

test.serial('cli showHelp prints help and exits 0', async t => {
  const originalArgv = process.argv
  const originalLog = console.log
  const originalExit = process.exit

  process.argv = ['node', 'microlink']

  const logs = []
  const exits = []

  console.log = value => logs.push(value)
  process.exit = code => exits.push(code)

  try {
    await withModuleMocks(
      {
        './util': {
          hasColorizedOutput: () => true,
          parseHeaders: () => ({})
        },
        './help': 'HELP CONTENT'
      },
      async () => {
        const cli = loadFresh(path.join(process.cwd(), 'src/cli.js'))
        cli.showHelp()
      }
    )
  } finally {
    process.argv = originalArgv
    console.log = originalLog
    process.exit = originalExit
  }

  t.deepEqual(logs, ['HELP CONTENT'])
  t.deepEqual(exits, [0])
})
