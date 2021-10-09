'use strict'

const colors = require('picocolors')

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
        colors.gray(error.message.replace(`${error.code}, `, ''))
      )
      console.log()
      if (error.data) {
        console.log(print.keyValue('   ', JSON.stringify(error.data)))
        console.log()
      }
      id && console.log('    ', print.keyValue(colors.red('id'), id))
      error.url &&
        console.log('   ', print.keyValue(colors.red('uri'), error.url))
      error.code &&
        console.log(
          '  ',
          print.keyValue(
            colors.red('code'),
            `${error.code} ${error.statusCode ? `(${error.statusCode})` : ''}`
          )
        )
      error.more &&
        console.log(
          '  ',
          print.keyValue(
            colors.red('more'),
            print.link('click to report', error.more)
          )
        )

      process.exit(1)
    }
  }
}
