'use strict'

const path = require('path')
const test = require('ava')

const { loadFresh, withModuleMocks } = require('./helpers/module-mocks')

test.serial('json prints with jsome when color is enabled', async t => {
  let payloadReceived

  const jsome = payload => {
    payloadReceived = payload
  }
  jsome.colors = {}

  await withModuleMocks(
    {
      jsome,
      nanospinner: { createSpinner: () => ({}) },
      'restore-cursor': () => {},
      'terminal-link': () => '',
      'pretty-bytes': () => '',
      'pretty-ms': () => '',
      'term-img': () => '',
      './colors': {
        gray: value => value,
        yellow: value => value,
        label: value => value
      }
    },
    async () => {
      const printText = loadFresh(path.join(process.cwd(), 'src/print-text.js'))
      printText.json({ ok: true }, { color: true })
    }
  )

  t.deepEqual(payloadReceived, { ok: true })
})

test.serial('json logs payload when color is disabled', async t => {
  const originalLog = console.log
  const calls = []
  console.log = value => calls.push(value)

  const jsome = () => {}
  jsome.colors = {}

  try {
    await withModuleMocks(
      {
        jsome,
        nanospinner: { createSpinner: () => ({}) },
        'restore-cursor': () => {},
        'terminal-link': () => '',
        'pretty-bytes': () => '',
        'pretty-ms': () => '',
        'term-img': () => '',
        './colors': {
          gray: value => value,
          yellow: value => value,
          label: value => value
        }
      },
      async () => {
        const printText = loadFresh(
          path.join(process.cwd(), 'src/print-text.js')
        )
        printText.json({ ok: true }, { color: false })
      }
    )
  } finally {
    console.log = originalLog
  }

  t.deepEqual(calls, [{ ok: true }])
})

test.serial('spinner starts, updates, stops, and handles SIGINT', async t => {
  let startCall
  const updates = []
  let clearCalls = 0
  let restoreCalls = 0
  let sigintHandler
  let intervalHandler
  let clearIntervalId

  const originalError = console.error
  const originalOn = process.on
  const originalExit = process.exit
  const originalSetInterval = global.setInterval
  const originalClearInterval = global.clearInterval

  console.error = () => {}
  process.on = (event, handler) => {
    if (event === 'SIGINT') sigintHandler = handler
  }

  const exitCalls = []
  process.exit = code => {
    exitCalls.push(code)
  }

  global.setInterval = (handler, interval) => {
    intervalHandler = handler
    t.is(interval, 50)
    return 99
  }

  global.clearInterval = id => {
    clearIntervalId = id
  }

  const jsome = () => {}
  jsome.colors = {}

  try {
    await withModuleMocks(
      {
        jsome,
        nanospinner: {
          createSpinner: () => ({
            start: payload => {
              startCall = payload
            },
            update: payload => updates.push(payload),
            clear: () => {
              clearCalls++
            }
          })
        },
        'restore-cursor': () => {
          restoreCalls++
        },
        'terminal-link': () => '',
        'pretty-bytes': () => '',
        'pretty-ms': value => `${value}ms`,
        'term-img': () => '',
        './colors': {
          gray: value => value,
          yellow: value => value,
          label: value => value
        }
      },
      async () => {
        const printText = loadFresh(
          path.join(process.cwd(), 'src/print-text.js')
        )
        const spinner = printText.spinner()

        spinner.start()
        t.truthy(startCall)
        t.truthy(sigintHandler)

        intervalHandler()
        t.true(updates.length >= 1)

        spinner.stop()
        t.is(clearCalls, 1)
        t.is(clearIntervalId, 99)
        t.is(restoreCalls, 1)

        sigintHandler()
        t.deepEqual(exitCalls, [130])
        t.is(restoreCalls, 2)
      }
    )
  } finally {
    console.error = originalError
    process.on = originalOn
    process.exit = originalExit
    global.setInterval = originalSetInterval
    global.clearInterval = originalClearInterval
  }
})

test.serial('keyValue formats with gray value', async t => {
  const jsome = () => {}
  jsome.colors = {}

  await withModuleMocks(
    {
      jsome,
      nanospinner: { createSpinner: () => ({}) },
      'restore-cursor': () => {},
      'terminal-link': () => '',
      'pretty-bytes': () => '',
      'pretty-ms': () => '',
      'term-img': () => '',
      './colors': {
        gray: value => `[gray:${value}]`,
        yellow: value => value,
        label: value => value
      }
    },
    async () => {
      const printText = loadFresh(path.join(process.cwd(), 'src/print-text.js'))
      t.is(printText.keyValue('key', 'value'), 'key [gray:value]')
    }
  )
})

test.serial(
  'image prints rendered terminal image and builds fallback',
  async t => {
    const originalLog = console.log
    const logs = []
    console.log = value => logs.push(value)

    let fallbackOutput

    const jsome = () => {}
    jsome.colors = {}

    try {
      await withModuleMocks(
        {
          jsome,
          nanospinner: { createSpinner: () => ({}) },
          'restore-cursor': () => {},
          'terminal-link': () => '',
          'pretty-bytes': () => '',
          'pretty-ms': () => '',
          'term-img': (filepath, options) => {
            fallbackOutput = options.fallback()
            return `IMAGE:${filepath}`
          },
          './colors': {
            gray: value => `[gray:${value}]`,
            yellow: value => `[yellow:${value}]`,
            label: value => value
          }
        },
        async () => {
          const printText = loadFresh(
            path.join(process.cwd(), 'src/print-text.js')
          )
          printText.image('preview.png')
        }
      )
    } finally {
      console.log = originalLog
    }

    t.deepEqual(logs, ['IMAGE:preview.png'])
    t.true(fallbackOutput.includes('[yellow:  tip:]'))
    t.true(fallbackOutput.includes('iTerm >=3'))
  }
)

test.serial('link uses terminal-link fallback', async t => {
  const jsome = () => {}
  jsome.colors = {}

  await withModuleMocks(
    {
      jsome,
      nanospinner: { createSpinner: () => ({}) },
      'restore-cursor': () => {},
      'terminal-link': (text, url, options) => options.fallback(),
      'pretty-bytes': value => `${value}B`,
      'pretty-ms': () => '',
      'term-img': () => '',
      './colors': {
        gray: value => value,
        yellow: value => value,
        label: value => value
      }
    },
    async () => {
      const printText = loadFresh(path.join(process.cwd(), 'src/print-text.js'))
      t.is(
        printText.link('docs', 'https://microlink.io'),
        'https://microlink.io'
      )
      t.is(printText.bytes(20), '20B')
    }
  )
})
