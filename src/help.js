'use strict'

const { gray, white } = require('picocolors')

const code = str => `\`${str}\``

module.exports = `
${gray(`${white('microlink')} <url> [flags]`)}

Flags
  ${gray(
    `--api-key      authenticate using an API key (default is ${code(
      white('$MICROLINK_API_KEY')
    )}`
  )}
  ${gray(`--colors       colorize output (default is ${code(white('true'))}`)}
  ${gray(
    `--copy         copy output to clipboard (default is ${code(
      white('false')
    )}).`
  )}
  ${gray(
    `--pretty       beauty response payload (default is ${code(
      white('true')
    )}).`
  )}


Examples
  ${gray('microlink https://microlink.io&palette')}
  ${gray('microlink https://microlink.io&palette --no-pretty')}
  ${gray('microlink https://microlink.io&palette --api-key=MyApiKey')}
`
