'use strict'

const path = require('path')
const test = require('ava')

const { loadFresh, withModuleMocks } = require('./helpers/module-mocks')

test.serial('help includes documented flags and examples', async t => {
  const help = await withModuleMocks(
    {
      './colors': {
        gray: value => value,
        white: value => value
      }
    },
    async () => loadFresh(path.join(process.cwd(), 'src/help.js'))
  )

  t.true(help.includes('--api-key'))
  t.true(help.includes('--copy'))
  t.true(help.includes('--json'))
  t.true(help.includes('--json-full'))
  t.true(help.includes('--pretty'))
  t.true(help.includes('-H <header>'))
  t.true(help.includes('microlink https://microlink.io&palette --json-full'))
})
