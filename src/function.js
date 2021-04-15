'use strict'

const { readFile } = require('fs').promises
const resolveUp = require('resolve-up')
const prettyMs = require('pretty-ms')
const { statSync } = require('fs')
const execa = require('execa')
const chalk = require('chalk')
const path = require('path')

const print = require('./print')
const exit = require('./exit')

const installDependencies = [
  '@browserless/function',
  'browserless',
  'lodash',
  'metascraper-amazon',
  'metascraper-audio',
  'metascraper-author',
  'metascraper-clearbit',
  'metascraper-date',
  'metascraper-description',
  'metascraper-iframe',
  'metascraper-image',
  'metascraper-lang',
  'metascraper-logo-favicon',
  'metascraper-logo',
  'metascraper-media-provider',
  'metascraper-publisher',
  'metascraper-readability',
  'metascraper-soundcloud',
  'metascraper-spotify',
  'metascraper-telegram',
  'metascraper-title',
  'metascraper-uol',
  'metascraper-url',
  'metascraper-video',
  'metascraper-youtube',
  'metascraper',
  'p-reflect',
  'p-retry'
]

const vmOpts = {
  require: {
    external: {
      builtin: ['path', 'url'],
      modules: [
        'p-reflect',
        'p-retry',
        'browserless',
        'metascraper',
        'metascraper-',
        '@metascraper',
        'lodash'
      ]
    }
  }
}

const npmFlags = ['--silent', '--no-progress', '--no-audit', '--force']

const npmInstall = pkg =>
  execa(['npm', 'install', ...pkg, ...npmFlags], {
    execPath: path.resolve(__dirname, '../..')
  })

const resolveDependency = async () => {
  const [dependencyPath] = resolveUp('@browserless/function')
  if (dependencyPath) return require(dependencyPath)

  const spinner = print.spinner(
    'Creating local environment (only needed the first time)'
  )

  spinner.start()
  await npmInstall(installDependencies)
  spinner.stop()

  require(resolveUp('@browserless/function')[0])
}

module.exports = async cli => {
  const [filepath, url] = cli.input

  const [browserlessFunction, code] = await Promise.all([
    resolveDependency(),
    readFile(filepath)
  ])

  const myFn = browserlessFunction(code, { vmOpts })
  const spinner = print.spinner()

  console.log()
  spinner.start()

  const main = async () => {
    const { isFulfilled, value, reason } = await myFn(url, cli.flags)
    const duration = spinner.stop()
    const info = chalk.gray(
      `${print.bytes(statSync(filepath).size)} in ${prettyMs(duration)}`
    )

    if (isFulfilled) {
      print.json(value, cli.flags)
      console.log()
      console.log(print.label('success', 'green'), info)
    } else {
      if (reason.stack) print.json(reason.stack, cli.flags)
      else print.json(reason.message, cli.flags)
      console.log()
      console.log(print.label('fail', 'red'), info)
    }
  }

  return exit(main(), cli)
}
