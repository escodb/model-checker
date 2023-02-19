'use strict'

const Store = require('../lib/store')
const assert = require('assert').strict

describe('Store', () => {
  let store

  beforeEach(() => {
    store = new Store()
  })

  it('returns null for an unknown key', () => {
    assert.equal(store.seq, 0)
    assert.equal(store.read('x'), null)
  })

  it('stores a new value', () => {
    assert.deepEqual(store.write('x', null, { a: 51 }), { ok: true, rev: 1 })
    assert.equal(store.seq, 1)
    assert.deepEqual(store.read('x'), { rev: 1, value: { a: 51 } })
  })

  describe('with a stored value', () => {
    let rev

    beforeEach(() => {
      let result = store.write('x', null, { a: 51 })
      assert.deepEqual(result, { ok: true, rev: 1 })
      rev = result.rev
    })

    it('does not update a value without a rev', () => {
      assert.equal(store.write('x', null, { b: 52 }).ok, false)
      assert.equal(store.seq, 1)
      assert.deepEqual(store.read('x'), { rev: 1, value: { a: 51 } })
    })

    it('does not update a value with a bad rev', () => {
      assert.equal(store.write('x', rev + 1, { b: 52 }).ok, false)
      assert.equal(store.seq, 1)
      assert.deepEqual(store.read('x'), { rev: 1, value: { a: 51 } })
    })

    it('updates a value with a matching rev', () => {
      assert.deepEqual(store.write('x', rev, { b: 52 }), { ok: true, rev: 2 })
      assert.equal(store.seq, 2)
      assert.deepEqual(store.read('x'), { rev: 2, value: { b: 52 } })
    })

    it('returns a copy of the stored value', () => {
      store.write('x', rev, { nested: { doc: { b: 52 } } })

      let r1 = store.read('x').value
      let r2 = store.read('x').value
      assert(r1 !== r2)

      r1.nested.doc.extra = true
      assert.deepEqual(r1, { nested: { doc: { b: 52, extra: true } } })
      assert.deepEqual(r2, { nested: { doc: { b: 52 } } })
    })

    it('updates the value to null', () => {
      assert.deepEqual(store.write('x', rev, null), { ok: true, rev: 2 })
      assert.deepEqual(store.read('x'), { rev: 2, value: null })
    })

    it('updates a different key', () => {
      assert.deepEqual(store.write('y', null, { z: 0 }), { ok: true, rev: 1 })
      assert.equal(store.seq, 2)
      assert.deepEqual(store.read('x'), { rev: 1, value: { a: 51 } })
      assert.deepEqual(store.read('y'), { rev: 1, value: { z: 0} })
    })
  })

  describe('with a set of stored values', () => {
    beforeEach(() => {
      store.write('/', null, 1)
      store.write('/path/', null, 2)
      store.write('/z/doc.json', null, null)
    })

    it('returns all the keys in the store', () => {
      assert.deepEqual(store.keys(), ['/', '/path/', '/z/doc.json'])
    })

    it('clones the store', () => {
      let clone = store.clone()

      assert.deepEqual(store.write('/path/', 1, 'changed'), { ok: true, rev: 2 })
      assert.equal(store.seq, 4)
      assert.deepEqual(store.read('/path/'), { rev: 2, value: 'changed' })
      assert.equal(clone.seq, 3)
      assert.deepEqual(clone.read('/path/'), { rev: 1, value: 2 })

      assert.deepEqual(clone.write('/new', null, { hello: true }), { ok: true, rev: 1 })
      assert.equal(store.seq, 4)
      assert.deepEqual(store.read('/new'), null)
      assert.equal(clone.seq, 4)
      assert.deepEqual(clone.read('/new'), { rev: 1, value: { hello: true } })
    })
  })
})
