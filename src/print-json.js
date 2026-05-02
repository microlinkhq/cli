'use strict'

const toJSONHeaders = headers => Object.fromEntries(new Headers(headers))

const humanizeApiKey = apiKey => `${apiKey.substring(0, 5)}…`

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

  return JSON.stringify(
    {
      request: {
        url: requestUrl,
        ...requestOptionsWithoutResponseType,
        headers
      },
      response: {
        ...response,
        headers: toJSONHeaders(response.headers)
      }
    },
    null,
    pretty ? 2 : 0
  )
}
