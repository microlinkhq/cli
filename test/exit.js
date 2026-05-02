'use strict'

const path = require('path')
const test = require('ava')

const { loadFresh, withModuleMocks } = require('./helpers/module-mocks')

test.serial('exit with success calls process.exit()', async t => {
  const originalExit = process.exit
  const calls = []

  process.exit = code => {
    calls.push(code)
  }

  try {
    await withModuleMocks(
      {
        './colors': { gray: value => value, red: value => value },
        './print-text': {
          label: () => '',
          keyValue: () => '',
          link: () => ''
        }
      },
      async () => {
        const exit = loadFresh(path.join(process.cwd(), 'src/exit.js'))
        await exit(Promise.resolve(), { flags: { pretty: true } })
      }
    )
  } finally {
    process.exit = originalExit
  }

  t.deepEqual(calls, [undefined])
})

test.serial(
  'exit with pretty error prints details and exits with code 1',
  async t => {
    const originalExit = process.exit
    const originalLog = console.log

    const exitCalls = []
    const logs = []

    process.exit = code => {
      exitCalls.push(code)
    }
    console.log = (...args) => logs.push(args)

    try {
      await withModuleMocks(
        {
          './colors': {
            gray: value => `[gray:${value}]`,
            red: value => `[red:${value}]`
          },
          './print-text': {
            label: text => `[label:${text}]`,
            keyValue: (key, value) => `${key}=${value}`,
            link: (text, url) => `${text}:${url}`
          }
        },
        async () => {
          const exit = loadFresh(path.join(process.cwd(), 'src/exit.js'))
          const error = new Error('ERR_TEST, failure happened')

          error.code = 'ERR_TEST'
          error.status = 'bad'
          error.statusCode = 502
          error.data = { reason: 'upstream' }
          error.more = 'https://microlink.io/report'
          error.url = 'https://api.microlink.io'
          error.headers = { 'x-request-id': 'request-1' }

          await exit(Promise.reject(error), { flags: { pretty: true } })
        }
      )
    } finally {
      process.exit = originalExit
      console.log = originalLog
    }

    t.deepEqual(exitCalls, [1])

    const flatOutput = logs.map(args => args.join(' ')).join('\n')
    t.true(flatOutput.includes('[label:BAD]'))
    t.true(flatOutput.includes('failure happened'))
    t.true(flatOutput.includes('reason'))
    t.true(flatOutput.includes('[red:id]=request-1'))
    t.true(flatOutput.includes('[red:uri]=https://api.microlink.io'))
    t.true(flatOutput.includes('[red:code]=ERR_TEST (502)'))
    t.true(flatOutput.includes('click to report:https://microlink.io/report'))
  }
)

test.serial(
  'exit with non-pretty error does not call process.exit',
  async t => {
    const originalExit = process.exit
    const calls = []

    process.exit = code => {
      calls.push(code)
    }

    try {
      await withModuleMocks(
        {
          './colors': { gray: value => value, red: value => value },
          './print-text': {
            label: () => '',
            keyValue: () => '',
            link: () => ''
          }
        },
        async () => {
          const exit = loadFresh(path.join(process.cwd(), 'src/exit.js'))
          await exit(Promise.reject(new Error('boom')), {
            flags: { pretty: false }
          })
        }
      )
    } finally {
      process.exit = originalExit
    }

    t.deepEqual(calls, [])
  }
)
