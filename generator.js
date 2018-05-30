// const Abi = require('ethereumjs-abi')

/**
 * @typedef MethodInfo
 *
 * @typedef ContractInfo
 */

/** Generate JS function code for one method.
 *
 * @param {MethodInfo} method The method definition from the ABI
 * @param {string} [prefix] An optional prefix for the generated function
 * @returns {string} the JS code that checks and encodes calls to the specified method
 */
exports.generate1 = function (method, prefix = 'encode_') {
  if (method.type !== 'function') {
    throw Error('Not a function: ' + method.name)
  }
  // const parameters = method.inputs.map(input => `${input.type} ${input.name}`).join(',')
  const onlyTypes = JSON.stringify(method.inputs.map(input => input.type))
  const paramDoc = method.inputs.map(input => `\n * @param {${input.type}} ${input.name}`)
  return `/** Method that encodes calls to ${method.name}${paramDoc}
 * @returns {Buffer} buffer with encoded arguments
 */
function ${prefix}${method.name} (...args) {
  if (args.length !== ${method.inputs.length}) {
    throw Error('TODO: handle overloads')
  }
  const Abi = require('ethereumjs-abi')
  return Buffer.concat([Abi.methodID('${method.name}', ${onlyTypes}), Abi.rawEncode(${onlyTypes}, args)])
}
`
// return Abi.rawEncode(${JSON.stringify(abi)}, "${method.name}(${parameters})", args)
}

/** Generate JS function code for all methods in an ABI definition.
 * @param {ContractInfo} abi
 * @param {string} [prefix] An optional prefix for the generated functions
 * @returns {string} the JS code that checks and encodes calls to all contract methods
 */
exports.generateFunctions = function (abi, prefix) {
  let code = ''
  for (var method of abi) {
    if (method.type === 'function') {
      code += exports.generate1(method, prefix)
    }
  }
  return code
}

/** Generate JS object for all methods in an ABI definition.
 * @param {ContractInfo} abi
 * @returns {string} the JS code that checks and encodes calls to all contract methods
 */
exports.generateObject = function (abi) {
  let code = '({\n'
  for (var method of abi) {
    if (method.type === 'function') {
      code += method.name + ': ' + exports.generate1(method, '') + ',\n'
    }
  }
  return code + '})'
}
