'use strict'

const terminalLink = require('terminal-link')
const prettyBytes = require('pretty-bytes')
const prettyMs = require('pretty-ms')
const colors = require('picocolors')
const termImg = require('term-img')
const jsome = require('jsome')
const ora = require('ora')

jsome.colors = {
  num: 'cyan',
  str: 'green',
  bool: 'red',
  regex: 'blue',
  undef: 'grey',
  null: 'grey',
  attr: 'reset',
  quot: 'gray',
  punc: 'gray',
  brack: 'gray'
}

module.exports = {
  spinner: (text = '') => {
    const spinner = ora({ color: 'white', text })
    const now = Date.now()
    const elapsedTime = () => Date.now() - now
    let interval

    const start = () => {
      interval = setInterval(() => {
        const duration = elapsedTime()
        if (duration > 500) spinner.text = `${prettyMs(duration)} ${text}`
      }, 100)
      spinner.start()
    }

    const stop = () => {
      spinner.stop()
      clearInterval(interval)
      return elapsedTime()
    }

    return { start, stop }
  },
  json: (payload, { color: colorize = true } = {}) =>
    colorize ? jsome(payload) : console.log(payload),

  label: (text, color) =>
    colors.inverse(colors.bold(colors[color](` ${text.toUpperCase()} `))),

  bytes: prettyBytes,

  keyValue: (key, value) => key + ' ' + colors.gray(value),

  image: filepath =>
    console.log(
      termImg(filepath, {
        width: '50%',
        fallback: () =>
          `\n${colors.yellow('  tip:')} ${colors.gray(
            'use iTerm >=3 to see the image here!'
          )}`
      })
    ),

  link: (text, url) => terminalLink(text, url, { fallback: () => url })
}
