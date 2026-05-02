'use strict'

const path = require('path')
const test = require('ava')

const { loadFresh, withModuleMocks } = require('./helpers/module-mocks')

test.serial('index exports cli, api, exit and print modules', async t => {
  const exports = await withModuleMocks(
    {
      './cli': { name: 'cli' },
      './api': { name: 'api' },
      './exit': { name: 'exit' },
      './print': { name: 'print' }
    },
    async () => loadFresh(path.join(process.cwd(), 'src/index.js'))
  )

  t.deepEqual(exports, {
    cli: { name: 'cli' },
    api: { name: 'api' },
    exit: { name: 'exit' },
    print: { name: 'print' }
  })
})
