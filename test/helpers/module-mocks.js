'use strict'

const Module = require('module')

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)

const withModuleMocks = async (mocks, fn) => {
  const originalLoad = Module._load

  Module._load = function (request, parent, isMain) {
    if (hasOwn(mocks, request)) return mocks[request]
    return originalLoad.apply(this, arguments)
  }

  try {
    return await fn()
  } finally {
    Module._load = originalLoad
  }
}

const loadFresh = modulePath => {
  const resolved = require.resolve(modulePath, { paths: [process.cwd()] })
  delete require.cache[resolved]
  return require(resolved)
}

module.exports = { loadFresh, withModuleMocks }
