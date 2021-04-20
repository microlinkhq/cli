'use strict'

const { readFile } = require('fs').promises
const prettyMs = require('pretty-ms')
const { statSync } = require('fs')
const execa = require('execa')
const chalk = require('chalk')
const path = require('path')
const fs = require('fs')

const print = require('./print')
const exit = require('./exit')

const DEPENDENCIES = ['browserless', '@browserless/function', 'puppeteer']

const VM_OPTS = {
  require: {
    external: {
      builtin: ['path', 'url'],
      modules: [
        '@aws-sdk/client-s3',
        '@metascraper',
        'async',
        'browserless',
        'got',
        'ioredis',
        'lodash',
        'metascraper-',
        'metascraper',
        'p-reflect',
        'p-retry',
        'p-timeout'
      ]
    }
  }
}

const EXEC_PATH = path.resolve(__dirname, '..')
const DEPENDENCY_PATH = path.resolve(
  EXEC_PATH,
  'node_modules/@browserless/function'
)

const NPM_FLAGS = [
  '--silent',
  '--no-progress',
  '--no-audit',
  '--force',
  `--prefix=${EXEC_PATH}`
]

const install = pkg => execa('npm', ['install', ...pkg, ...NPM_FLAGS])

const getDependencyPath = () => {
  try {
    return fs.statSync(DEPENDENCY_PATH) && DEPENDENCY_PATH
  } catch (_) {
    return undefined
  }
}

const resolveDependency = async ({ force }) => {
  const dependencyPath = getDependencyPath()

  if (!force && dependencyPath) return require(dependencyPath)

  const spinner = print.spinner(
    'Creating local environment (only needed the first time)'
  )

  spinner.start()
  await install(DEPENDENCIES)
  spinner.stop()
  console.log()

  return require(getDependencyPath())
}

module.exports = async cli => {
  const [filepath, url] = cli.input

  const [browserlessFunction, code] = await Promise.all([
    resolveDependency(cli.flags),
    readFile(filepath)
  ])

  const myFn = browserlessFunction(code, { vmOpts: VM_OPTS })
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
