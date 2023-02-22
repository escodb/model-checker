'use strict'

const Checker = require('../lib/checker')
const Store = require('../lib/store')
const assert = require('assert').strict

describe('Checker', () => {
  let store, checker

  beforeEach(() => {
    store = new Store()
    checker = new Checker(store)

    store.write('/', null, ['path/'])
    store.write('/path/', null, ['to/'])
    store.write('/path/to/', null, ['x.json'])
    store.write('/path/to/x.json', null, { a: 51 })
  })

  it('checks a valid store', () => {
    assert.equal(checker.check(), null)
  })

  it('complains if a doc is not linked', () => {
    store.write('/path/to/', 1, [])

    assert.deepEqual(checker.check(), [
      'dir "/path/to/" does not include name "x.json", required by doc "/path/to/x.json"'
    ])
  })

  it('complains if a parent dir is deleted', () => {
    store.write('/path/to/', 1, null)

    assert.deepEqual(checker.check(), [
      'dir "/path/to/" does not include name "x.json", required by doc "/path/to/x.json"'
    ])
  })

  it('complains if a parent dir is missing', () => {
    store.write('/', 1, ['other/', 'path/'])
    store.write('/other/y.json', null, { b: 52 })

    assert.deepEqual(checker.check(), [
      'dir "/other/", required by doc "/other/y.json", is missing'
    ])
  })

  it('complains if a parent dir is not linked', () => {
    store.write('/path/', 1, [])

    assert.deepEqual(checker.check(), [
      'dir "/path/" does not include name "to/", required by doc "/path/to/x.json"'
    ])
  })

  it('complains if a grandparent dir is not linked', () => {
    store.write('/', 1, [])

    assert.deepEqual(checker.check(), [
      'dir "/" does not include name "path/", required by doc "/path/to/x.json"'
    ])
  })

  it('it does not complain if an ancestor of a deleted doc is unlinked', () => {
    store.write('/', 1, [])
    store.write('/path/to/x.json', 1, null)

    assert.deepEqual(checker.check(), null)
  })
})
