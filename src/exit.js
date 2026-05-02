'use strict'

const { gray, red } = require('./colors')

const print = require('./print-text')

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
        gray(error.message.replace(`${error.code}, `, ''))
      )
      console.log()
      if (error.data) {
        console.log(print.keyValue('   ', JSON.stringify(error.data)))
        console.log()
      }
      id && console.log('    ', print.keyValue(red('id'), id))
      error.url && console.log('   ', print.keyValue(red('uri'), error.url))
      error.code &&
        console.log(
          '  ',
          print.keyValue(
            red('code'),
            `${error.code} ${error.statusCode ? `(${error.statusCode})` : ''}`
          )
        )
      error.more &&
        console.log(
          '  ',
          print.keyValue(red('more'), print.link('click to report', error.more))
        )

      process.exit(1)
    }
  }
}
