'use strict'

const { gray } = require('chalk')
const { description } = require('../package')

module.exports = `${description}.

Usage
  ${gray('$ microlink-[api|pro] <url> [flags]')}

Flags
  ${gray('--print-resume      print response resume.   [default=true]')}
  ${gray('--print-body        print response body.     [default=true]')}
  ${gray('--colors            colorize output.         [default=true]')}
  ${gray('--copy             copy output to clipboard. [default=false]')}

Examples
  ${gray('microlink-api https://microlink.io&palette')}
  ${gray('microlink-pro https://microlink.io&palette&apiKey=MyApiKey')}
`
