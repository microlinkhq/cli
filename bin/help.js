'use strict'

const { gray } = require('chalk')
const { description } = require('../package')

module.exports = `${description}.

Usage
  ${gray('$ microlink-[api|pro] <url> [flags]')}

Flags
  ${gray(
    '--api-key       authenticate using an API key (default is `$MICROLINK_API_KEY`).'
  )}
  ${gray('--colors        colorize output (default is `true`).')}
  ${gray('--copy          copy output to clipboard (default is `false`).')}
  ${gray('--pretty        beauty response payload (default is `true`).')}


Examples
  ${gray('microlink-api https://microlink.io&palette')}
  ${gray('microlink-api --no-pretty https://microlink.io&palette')}
  ${gray('microlink-pro --api-key=MyApiKey https://microlink.io&palette')}
`
