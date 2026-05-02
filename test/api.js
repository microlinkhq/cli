'use strict'

const path = require('path')
const test = require('ava')

const { loadFresh, withModuleMocks } = require('./helpers/module-mocks')

const createMqlStub = ({
  mqlResponse,
  bufferResponse,
  rejectOnBuffer
} = {}) => {
  const calls = { mql: [], buffer: [], getApiUrl: [] }

  const mql = async (...args) => {
    calls.mql.push(args)
    return mqlResponse
  }

  mql.buffer = async (...args) => {
    calls.buffer.push(args)
    if (rejectOnBuffer) throw rejectOnBuffer
    return bufferResponse
  }

  mql.getApiUrl = (...args) => {
    calls.getApiUrl.push(args)
    return ['https://api.microlink.io?url=https://example.com', { headers: {} }]
  }

  return { mql, calls }
}

const createCli = flags => ({
  flags: {
    pretty: true,
    copy: false,
    json: false,
    'json-full': false,
    endpoint: undefined,
    ...flags
  },
  headers: {},
  input: ['https://example.com']
})

test.serial('api json pretty flow parses and colorizes output', async t => {
  const toClipboardCalls = []
  const printJsonCalls = []
  const printTextJsonCalls = []
  const spinnerCalls = { start: 0, stop: 0 }

  const { mql, calls } = createMqlStub({
    mqlResponse: {
      response: {
        headers: new Headers({ 'content-type': 'application/json' }),
        body: { ok: true }
      }
    }
  })

  await withModuleMocks(
    {
      'update-notifier': () => ({ notify: () => {} }),
      '@kikobeats/content-type': value => value,
      '@microlink/mql': mql,
      'pretty-ms': value => `${value}ms`,
      temperment: { file: () => '/tmp/image.png' },
      fs: { writeFileSync: () => {} },
      './util': {
        toClipboard: value => toClipboardCalls.push(value),
        toPlainHeaders: headers => Object.fromEntries(headers.entries())
      },
      './colors': {
        gray: value => value,
        green: value => value
      },
      './print-json': payload => {
        printJsonCalls.push(payload)
        return '{"status":"success"}'
      },
      './print-text': {
        spinner: () => ({
          start: () => {
            spinnerCalls.start++
          },
          stop: () => {
            spinnerCalls.stop++
          }
        }),
        json: (...args) => printTextJsonCalls.push(args),
        image: () => {},
        label: () => '',
        bytes: value => `${value}b`,
        keyValue: () => ''
      },
      './exit': async promise => promise
    },
    async () => {
      const api = loadFresh(path.join(process.cwd(), 'src/api.js'))
      await api(createCli({ json: true, copy: true, pretty: true }))
    }
  )

  t.is(calls.mql.length, 1)
  t.is(calls.buffer.length, 0)
  t.is(spinnerCalls.start, 0)
  t.is(spinnerCalls.stop, 0)
  t.is(printJsonCalls.length, 1)
  t.deepEqual(toClipboardCalls, [{ status: 'success' }])
  t.deepEqual(printTextJsonCalls, [[{ status: 'success' }, { color: true }]])
})

test.serial('api merges cli headers into got options', async t => {
  const { mql, calls } = createMqlStub({
    mqlResponse: {
      response: {
        headers: new Headers({ 'content-type': 'application/json' }),
        body: { ok: true }
      }
    }
  })

  await withModuleMocks(
    {
      'update-notifier': () => ({ notify: () => {} }),
      '@kikobeats/content-type': value => value,
      '@microlink/mql': mql,
      'pretty-ms': value => `${value}ms`,
      temperment: { file: () => '/tmp/image.png' },
      fs: { writeFileSync: () => {} },
      './util': {
        toClipboard: () => {},
        toPlainHeaders: headers => Object.fromEntries(headers.entries())
      },
      './colors': {
        gray: value => value,
        green: value => value
      },
      './print-json': () => '{"ok":true}',
      './print-text': {
        spinner: () => ({ start: () => {}, stop: () => {} }),
        json: () => {},
        image: () => {},
        label: () => '',
        bytes: value => `${value}b`,
        keyValue: () => ''
      },
      './exit': async promise => promise
    },
    async () => {
      const api = loadFresh(path.join(process.cwd(), 'src/api.js'))
      const cli = createCli({ json: true, pretty: false })
      cli.headers = { 'x-user-cookie': '1' }
      await api(cli, { headers: { authorization: 'Bearer token' } })
    }
  )

  t.deepEqual(calls.getApiUrl[0][2].headers, {
    authorization: 'Bearer token',
    'x-user-cookie': '1'
  })
})

test.serial('api json compact flow prints raw response', async t => {
  const originalLog = console.log
  const logs = []
  console.log = value => logs.push(value)

  const printTextJsonCalls = []
  const { mql } = createMqlStub({ mqlResponse: { response: {} } })

  try {
    await withModuleMocks(
      {
        'update-notifier': () => ({ notify: () => {} }),
        '@kikobeats/content-type': value => value,
        '@microlink/mql': mql,
        'pretty-ms': value => `${value}ms`,
        temperment: { file: () => '/tmp/image.png' },
        fs: { writeFileSync: () => {} },
        './util': {
          toClipboard: () => {},
          toPlainHeaders: headers => Object.fromEntries(headers.entries())
        },
        './colors': {
          gray: value => value,
          green: value => value
        },
        './print-json': () => '{"status":"compact"}',
        './print-text': {
          spinner: () => ({ start: () => {}, stop: () => {} }),
          json: (...args) => printTextJsonCalls.push(args),
          image: () => {},
          label: () => '',
          bytes: value => `${value}b`,
          keyValue: () => ''
        },
        './exit': async promise => promise
      },
      async () => {
        const api = loadFresh(path.join(process.cwd(), 'src/api.js'))
        await api(createCli({ json: true, pretty: false }))
      }
    )
  } finally {
    console.log = originalLog
  }

  t.deepEqual(logs, ['{"status":"compact"}'])
  t.deepEqual(printTextJsonCalls, [])
})

test.serial(
  'api non-json pretty flow prints parsed body and summary',
  async t => {
    const originalError = console.error
    const errorLogs = []
    console.error = (...args) => errorLogs.push(args)

    const toClipboardCalls = []
    const printTextJsonCalls = []
    const spinnerCalls = { start: 0, stop: 0 }

    const now = Date.now()

    const { mql, calls } = createMqlStub({
      bufferResponse: {
        headers: new Headers({
          'content-type': 'application/json',
          'server-timing': 'edge;dur=10',
          'x-request-id': 'req-1',
          'cf-cache-status': 'HIT',
          'x-cache-status': 'MISS',
          'x-timestamp': String(now),
          'x-cache-ttl': '2000',
          'x-fetch-mode': 'browser',
          'x-fetch-time': '20ms',
          'content-length': '17'
        }),
        requestUrl: 'https://api.microlink.io?url=https://example.com',
        url: 'https://api.microlink.io',
        body: Buffer.from('{"hello":"world"}')
      }
    })

    try {
      await withModuleMocks(
        {
          'update-notifier': () => ({ notify: () => {} }),
          '@kikobeats/content-type': () => 'application/json',
          '@microlink/mql': mql,
          'pretty-ms': value => `${value}ms`,
          temperment: { file: () => '/tmp/image.png' },
          fs: { writeFileSync: () => {} },
          './util': {
            toClipboard: value => toClipboardCalls.push(value),
            toPlainHeaders: headers => Object.fromEntries(headers.entries())
          },
          './colors': {
            gray: value => `[gray:${value}]`,
            green: value => `[green:${value}]`
          },
          './print-json': () => '',
          './print-text': {
            spinner: () => ({
              start: () => {
                spinnerCalls.start++
              },
              stop: () => {
                spinnerCalls.stop++
              }
            }),
            json: (...args) => printTextJsonCalls.push(args),
            image: () => {},
            label: () => '[SUCCESS]',
            bytes: value => `${value}b`,
            keyValue: (key, value) => `${key}=${value}`
          },
          './exit': async promise => promise
        },
        async () => {
          const api = loadFresh(path.join(process.cwd(), 'src/api.js'))
          await api(createCli({ json: false, copy: true, pretty: true }))
        }
      )
    } finally {
      console.error = originalError
    }

    t.is(calls.mql.length, 0)
    t.is(calls.buffer.length, 1)
    t.is(spinnerCalls.start, 1)
    t.is(spinnerCalls.stop, 1)
    t.deepEqual(printTextJsonCalls, [
      [
        { hello: 'world' },
        {
          copy: true,
          pretty: true,
          json: false
        }
      ]
    ])
    t.deepEqual(toClipboardCalls, [{ hello: 'world' }])

    const flat = errorLogs.map(args => args.join(' ')).join('\n')
    t.true(flat.includes('[SUCCESS]'))
    t.true(flat.includes('[green:timing]=edge;dur=10'))
    t.true(flat.includes('[green:cache]=HIT'))
    t.true(flat.includes('[green:mode]=browser'))
  }
)

test.serial('api data uri flow writes image to temp file', async t => {
  const written = []
  const imageCalls = []

  const { mql } = createMqlStub({
    bufferResponse: {
      headers: new Headers({ 'content-type': 'image/png' }),
      requestUrl: 'https://api.microlink.io?url=https://example.com',
      url: 'https://api.microlink.io',
      body: Buffer.from('data:image/png;base64,QUJD')
    }
  })

  await withModuleMocks(
    {
      'update-notifier': () => ({ notify: () => {} }),
      '@kikobeats/content-type': () => 'image/png',
      '@microlink/mql': mql,
      'pretty-ms': value => `${value}ms`,
      temperment: { file: () => '/tmp/image.png' },
      fs: {
        writeFileSync: (...args) => written.push(args)
      },
      './util': {
        toClipboard: () => {},
        toPlainHeaders: headers => Object.fromEntries(headers.entries())
      },
      './colors': {
        gray: value => value,
        green: value => value
      },
      './print-json': () => '',
      './print-text': {
        spinner: () => ({ start: () => {}, stop: () => {} }),
        json: () => {},
        image: value => imageCalls.push(value),
        label: () => '',
        bytes: value => `${value}b`,
        keyValue: () => ''
      },
      './exit': async promise => promise
    },
    async () => {
      const api = loadFresh(path.join(process.cwd(), 'src/api.js'))
      await api(createCli({ json: false, pretty: true }))
    }
  )

  t.deepEqual(imageCalls, ['/tmp/image.png'])
  t.deepEqual(written, [['/tmp/image.png', 'QUJD', 'base64']])
})

test.serial('api text payload flow renders image fallback branch', async t => {
  const originalLog = console.log
  const logs = []
  const imageCalls = []

  console.log = (...args) => logs.push(args)

  const { mql } = createMqlStub({
    bufferResponse: {
      headers: new Headers({ 'content-type': 'text/plain' }),
      requestUrl: 'https://api.microlink.io?url=https://example.com',
      url: 'https://api.microlink.io',
      body: Buffer.from('plain response')
    }
  })

  try {
    await withModuleMocks(
      {
        'update-notifier': () => ({ notify: () => {} }),
        '@kikobeats/content-type': () => 'text/plain',
        '@microlink/mql': mql,
        'pretty-ms': value => `${value}ms`,
        temperment: { file: () => '/tmp/image.png' },
        fs: { writeFileSync: () => {} },
        './util': {
          toClipboard: () => {},
          toPlainHeaders: headers => Object.fromEntries(headers.entries())
        },
        './colors': {
          gray: value => value,
          green: value => value
        },
        './print-json': () => '',
        './print-text': {
          spinner: () => ({ start: () => {}, stop: () => {} }),
          json: () => {},
          image: value => imageCalls.push(value),
          label: () => '',
          bytes: value => `${value}b`,
          keyValue: () => ''
        },
        './exit': async promise => promise
      },
      async () => {
        const api = loadFresh(path.join(process.cwd(), 'src/api.js'))
        await api(createCli({ json: false, pretty: true }))
      }
    )
  } finally {
    console.log = originalLog
  }

  t.deepEqual(imageCalls, [Buffer.from('plain response')])
  t.deepEqual(logs, [[]])
})

test.serial('api attaches flags to thrown errors', async t => {
  const spinnerCalls = { start: 0, stop: 0 }

  const error = new Error('upstream failed')

  const { mql } = createMqlStub({ rejectOnBuffer: error })

  const result = await withModuleMocks(
    {
      'update-notifier': () => ({ notify: () => {} }),
      '@kikobeats/content-type': () => 'application/json',
      '@microlink/mql': mql,
      'pretty-ms': value => `${value}ms`,
      temperment: { file: () => '/tmp/image.png' },
      fs: { writeFileSync: () => {} },
      './util': {
        toClipboard: () => {},
        toPlainHeaders: headers => Object.fromEntries(headers.entries())
      },
      './colors': {
        gray: value => value,
        green: value => value
      },
      './print-json': () => '',
      './print-text': {
        spinner: () => ({
          start: () => {
            spinnerCalls.start++
          },
          stop: () => {
            spinnerCalls.stop++
          }
        }),
        json: () => {},
        image: () => {},
        label: () => '',
        bytes: value => `${value}b`,
        keyValue: () => ''
      },
      './exit': promise =>
        promise.then(
          () => ({ ok: true }),
          error => ({ ok: false, error })
        )
    },
    async () => {
      const api = loadFresh(path.join(process.cwd(), 'src/api.js'))
      return api(createCli({ json: false, pretty: true }))
    }
  )

  t.false(result.ok)
  t.truthy(result.error.flags)
  t.is(result.error.flags.pretty, true)
  t.is(spinnerCalls.start, 1)
  t.is(spinnerCalls.stop, 1)
})
