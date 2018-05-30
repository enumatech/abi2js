/* eslint-env mocha */
/* eslint no-eval: off */
/* global encode_Method encode_Event */
const Assert = require('assert')
const Generator = require('../generator')

describe('Generator', () => {
  const ABI = {
    'constant': true,
    'inputs': [{'name': 'x', 'type': 'uint256'}],
    'name': 'Method',
    'outputs': [{'name': '', 'type': 'uint256'}],
    'payable': false,
    'stateMutability': 'view',
    'type': 'function'
  }
  const BIN = '0x608060405234801561001057600080fd5b5060b88061001f6000396000f300608060405260043610603f576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff16806306f7365f146044575b600080fd5b348015604f57600080fd5b50606c600480360381019080803590602001909291905050506082565b6040518082815260200191505060405180910390f35b60008190509190505600a165627a7a723058202f536ac8c6053852ea3d406528d4fbf7dc55aeab97efb2195f436423684e482d0029'

  context('generates JS code for one method', () => {

    it('doesn\'t support event', () => {
      Assert.throws(() => Generator.generate1({name: 'EventX', type: 'event'}), /^Error: Not a function: EventX$/)
    })

    context('function', () => {
      let code

      before(() => {
        code = Generator.generate1(ABI)
      })

      it('with JSDoc', () => {
        Assert.deepStrictEqual(code.match(/\/\*\*(?:.|\n|\r)+\*\//)[0], `/** Method that encodes calls to Method
 * @param {uint256} x
 * @returns {Buffer} buffer with encoded arguments
 */`)
      })

      it('can eval()', () => {
        eval(code)
      })

      it('refers to correct method ID', () => {
        eval(code)
        Assert.strictEqual(encode_Method('asdf').toString('hex').slice(0, 8), '06f7365f')
      })

      it('can generate valid payload', () => {
        eval(code)
        Assert.strictEqual(encode_Method(257).toString('hex'), '06f7365f0000000000000000000000000000000000000000000000000000000000000101')
      })

      it('throws on too many arguments', () => {
        eval(code)
        Assert.throws(() => encode_Method(1, 2))
      })

      it('throws on too few arguments', () => {
        eval(code)
        Assert.throws(() => encode_Method())
      })

      it.skip('throws on invalid param types', () => {
        eval(code)
        Assert.throws(() => encode_Method('asdf'))
      })
    })
  })

  context('generate JS code for ABI', () => {
    const ABI = [
      {
        'constant': true,
        'inputs': [{'name': 'x', 'type': 'uint256'}, {'name': 'y', 'type': 'uint256'}],
        'name': 'Method',
        'outputs': [{'name': '', 'type': 'uint256'}],
        'payable': false,
        'stateMutability': 'view',
        'type': 'function'
      },
      {
        'constant': true,
        'inputs': [{'name': 'x', 'type': 'uint256'}],
        'name': 'Method',
        'outputs': [{'name': '', 'type': 'uint256'}],
        'payable': false,
        'stateMutability': 'view',
        'type': 'function'
      },
      {
        'name': 'Event',
        'anonymous': false,
        'type': 'event',
        'inputs': []
      }
    ]

    context('functions', () => {
      const code = Generator.generateFunctions(ABI)
      eval(code)

      it('can generate valid payload', () => {
        Assert.strictEqual(encode_Method(257).toString('hex'), '06f7365f0000000000000000000000000000000000000000000000000000000000000101')
      })

      it('handles overloading', () => {
        Assert.strictEqual(encode_Method(257, 2).toString('hex'), '1f6e054f00000000000000000000000000000000000000000000000000000000000001010000000000000000000000000000000000000000000000000000000000000002')
      })

      it('throws on too few arguments', () => {
        Assert.throws(() => encode_Method())
      })

      it('no method for events', () => {
        Assert.throws(() => encode_Event(), /^ReferenceError: encode_Event is not defined$/)
      })
    })

    context('object', () => {
      let code

      before(() => {
        code = Generator.generateObject(ABI)
      })

      it('can eval()', () => {
        const encode = eval(code)
        Assert.strictEqual(typeof encode, 'object')
      })

      it('can generate valid payload', () => {
        const encode = eval(code)
        Assert.strictEqual(encode.Method(258).toString('hex'), '06f7365f0000000000000000000000000000000000000000000000000000000000000102')
      })

      it('no method for events', () => {
        const encode = eval(code)
        Assert.throws(() => encode.Event(), /^TypeError: encode.Event is not a function$/)
      })
    })
  })

  context('Ganache Core', () => {
    let provider
    let from
    const data = '0x00000000'

    before(done => {
      const GanacheCore = require('ganache-core')
      provider = GanacheCore.provider()

      provider.send({id: 2, method: 'personal_listAccounts', params: []}, (err, response) => {
        from = response.result[0]
        done(err)
      })
    })

    function send (...args) {
      return new Promise((resolve, reject) => {
        provider.send(args, (err, response) => err || response.error ? reject(err || Error(response.error.message)) : resolve(response[0].result))
      })
    }

    after(done => {
      provider.close(done)
    })

    it('can send eth_call', async () => {
      await send({id: 3, method: 'eth_call', params: [{from, data}]})
    })

    it('can send eth_sendTransaction', async () => {
      await send({id: 4, method: 'eth_sendTransaction', params: [{from, data}]})
    })

    context('deploy contract', () => {
      let to

      before(async () => {
        const gas = 1e6
        const transactionHash = await send({id: 5, method: 'eth_sendTransaction', params: [{from, data: BIN, gas}]})

        const receipt = await send({id: 5, method: 'eth_getTransactionReceipt', params: [transactionHash]})
        Assert.equal(receipt.status, 1)
        to = receipt.contractAddress
      })

      it('can invoke method', async () => {
        const code = Generator.generate1(ABI)
        eval(code)
        const value = 1234

        const data = encode_Method(value)
        const response = await send({id: 6, method: 'eth_call', params: [{from, data, to}]})
        Assert.equal(response, value)
      })
    })
  })
})
