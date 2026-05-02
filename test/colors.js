'use strict'

const path = require('path')
const test = require('ava')

const { loadFresh, withModuleMocks } = require('./helpers/module-mocks')

test.serial(
  'colors helpers call node:util.styleText with expected styles',
  async t => {
    const calls = []

    await withModuleMocks(
      {
        'node:util': {
          styleText: (style, text) => {
            calls.push([style, text])
            return `${text}`
          }
        }
      },
      async () => {
        const colors = loadFresh(path.join(process.cwd(), 'src/colors.js'))

        colors.gray('g')
        colors.white('w')
        colors.green('gr')
        colors.red('r')
        colors.yellow('y')
        colors.label('ok', 'green')
      }
    )

    t.deepEqual(calls, [
      ['gray', 'g'],
      ['white', 'w'],
      ['green', 'gr'],
      ['red', 'r'],
      ['yellow', 'y'],
      [['inverse', 'bold', 'green'], ' OK ']
    ])
  }
)
