'use strict'

const { humanizeApiKey, toPlainHeaders, stringify } = require('./util')

module.exports = ({
  requestUrl,
  requestOptions,
  response,
  full = false,
  pretty = true
}) => {
  const { responseType, ...requestOptionsWithoutResponseType } = requestOptions
  const headers = { ...requestOptionsWithoutResponseType.headers }

  if (!full && headers['x-api-key']) {
    headers['x-api-key'] = humanizeApiKey(headers['x-api-key'])
  }

  return stringify(
    {
      request: {
        url: requestUrl,
        ...requestOptionsWithoutResponseType,
        headers
      },
      response: {
        ...response,
        headers: toPlainHeaders(response.headers)
      }
    },
    { pretty }
  )
}
