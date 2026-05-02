'use strict'

const { createSpinner } = require('nanospinner')
const restoreCursor = require('restore-cursor')
const terminalLink = require('terminal-link')
const prettyBytes = require('pretty-bytes')
const prettyMs = require('pretty-ms')
const termImg = require('term-img')
const jsome = require('jsome')

const { gray, yellow, label } = require('./colors')

const TICK_INTERVAL = 50

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
  spinner: () => {
    const now = Date.now()
    const elapsedTime = () => prettyMs(Date.now() - now)
    const spinner = createSpinner(elapsedTime(), { color: 'white' })
    let timer

    const start = () => {
      console.error()
      spinner.start({ text: elapsedTime() })
      process.on('SIGINT', () => {
        restoreCursor()
        process.exit(130)
      })
      timer = setInterval(
        () => spinner.update({ text: elapsedTime() }),
        TICK_INTERVAL
      )
    }

    const stop = () => {
      clearInterval(timer)
      spinner.clear()
      restoreCursor()
    }

    return { start, stop }
  },
  json: (payload, { color: colorize = true } = {}) =>
    colorize ? jsome(payload) : console.log(payload),

  label,

  bytes: prettyBytes,

  keyValue: (key, value) => key + ' ' + gray(value),

  image: filepath =>
    console.log(
      termImg(filepath, {
        width: '50%',
        fallback: () =>
          `\n${yellow('  tip:')} ${gray(
            'use iTerm >=3 to see the image here!'
          )}`
      })
    ),

  link: (text, url) => terminalLink(text, url, { fallback: () => url })
}
