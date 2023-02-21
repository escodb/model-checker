'use strict'

const Cache = require('../lib/cache')
const Store = require('../lib/store')
const assert = require('assert').strict

describe('Cache', () => {
  let cache, store

  beforeEach(() => {
    store = new Store()
    cache = new Cache(store)
  })

  it('returns null for an unknown key', () => {
    assert.equal(cache.read('x'), null)
  })

  it('reads a value from the store', () => {
    assert.deepEqual(store.write('x', null, { a: 51 }), { ok: true, rev: 1 })

    assert.deepEqual(store.read('x'), { rev: 1, value: { a: 51 } })
    assert.deepEqual(cache.read('x'), { a: 51 })
  })

  it('caches a read that does not return anything', () => {
    assert.equal(cache.read('x'), null)
    assert.deepEqual(store.write('x', null, { a: 51 }), { ok: true, rev: 1 })
    assert.equal(cache.read('x'), null)
  })

  it('writes a value to the store', () => {
    assert.deepEqual(cache.write('x', { a: 51 }), { ok: true })

    assert.deepEqual(store.read('x'), { rev: 1, value: { a: 51 } })
    assert.deepEqual(cache.read('x'), { a: 51 })
  })

  it('updates a value in the store', () => {
    assert.deepEqual(cache.write('x', { a: 51 }), { ok: true })
    assert.deepEqual(cache.write('x', { b: 52 }), { ok: true })
    assert.deepEqual(cache.write('x', { c: 53 }), { ok: true })

    assert.deepEqual(store.read('x'), { rev: 3, value: { c: 53 } })
    assert.deepEqual(cache.read('x'), { c: 53 })
  })

  it('fails to update a doc it did not read first', () => {
    assert.deepEqual(store.write('x', null, { a: 51 }), { ok: true, rev: 1 })
    assert.deepEqual(cache.write('x', { b: 52 }), { ok: false })

    assert.deepEqual(store.read('x'), { rev: 1, value: { a: 51 } })
    assert.deepEqual(cache.read('x'), { a: 51 })
  })

  it('fails to update with a stale rev', () => {
    assert.deepEqual(cache.write('x', { a: 51 }), { ok: true })

    assert.deepEqual(store.write('x', 1, { c: 53 }), { ok: true, rev: 2 })
    assert.deepEqual(cache.write('x', { b: 52 }), { ok: false })

    assert.deepEqual(store.read('x'), { rev: 2, value: { c: 53 } })
  })

  it('it recovers after a failed write', () => {
    assert.deepEqual(cache.write('x', { a: 51 }), { ok: true })

    assert.deepEqual(store.write('x', 1, { c: 53 }), { ok: true, rev: 2 })
    assert.deepEqual(cache.write('x', { b: 52 }), { ok: false })

    assert.deepEqual(cache.read('x'), { c: 53 })
    assert.deepEqual(cache.write('x', { b: 52 }), { ok: true })

    assert.deepEqual(store.read('x'), { rev: 3, value: { b: 52 } })
    assert.deepEqual(cache.read('x'), { b: 52 })
  })
})
