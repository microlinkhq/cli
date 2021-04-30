'use strict'

const chalk = require('chalk')

const print = require('./print')

module.exports = async (promise, { flags }) => {
  try {
    await promise
    process.exit()
  } catch (error) {
    const id = error.headers && error.headers['x-request-id']

    if (flags.pretty) {
      console.log(
        ' ',
        print.label((error.status || 'fail').toUpperCase(), 'red'),
        chalk.gray(error.message.replace(`${error.code}, `, ''))
      )
      console.log()
      if (error.data) {
        console.log(print.keyValue('   ', JSON.stringify(error.data)))
        console.log()
      }
      id && console.log('    ', print.keyValue(chalk.red('id'), id))
      error.url &&
        console.log('   ', print.keyValue(chalk.red('uri'), error.url))
      error.code &&
        console.log(
          '  ',
          print.keyValue(
            chalk.red('code'),
            `${error.code} ${error.statusCode ? `(${error.statusCode})` : ''}`
          )
        )
      error.more &&
        console.log(
          '  ',
          print.keyValue(
            chalk.red('more'),
            print.link('click to report', error.report)
          )
        )

      process.exit(1)
    }
  }
}
