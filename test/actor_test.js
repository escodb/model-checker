'use strict'

const Actor = require('../lib/actor')
const Store = require('../lib/store')
const assert = require('assert').strict

describe('Actor', () => {
  let actor, store, x_path, y_path

  beforeEach(() => {
    store = new Store()
    actor = new Actor(store)

    store.write('/', null, ['path/'])
    store.write('/path/', null, ['to/', 'x.json'])
    store.write('/path/to/', null, ['y.json'])

    store.write('/path/x.json', null, { a: 51 })
    store.write('/path/to/y.json', null, { z: 61 })

    x_path = '/path/x.json'
    y_path = '/path/to/y.json'
  })

  it('gets an existing document', () => {
    let doc = actor.get(x_path)
    assert.deepEqual(doc, { a: 51 })
  })

  it('returns null for a missing document', () => {
    assert.equal(actor.get('/y.json'), null)
  })

  it('updates a document', () => {
    actor.get(x_path)
    actor.put(x_path, (doc) => ({ b: doc.a + 1 }))

    let rec = store.read(x_path)
    assert.deepEqual(rec, { rev: 2, value: { b: 52 } })

    let doc = actor.get(x_path)
    assert.deepEqual(doc, { b: 52 })
  })

  it('updates a document multiple times', () => {
    actor.get(x_path)
    actor.put(x_path, (doc) => ({ b: doc.a + 1 }))
    actor.put(x_path, (doc) => ({ c: doc.b + 1 }))

    let rec = store.read(x_path)
    assert.deepEqual(rec, { rev: 3, value: { c: 53 } })

    let doc = actor.get(x_path)
    assert.deepEqual(doc, { c: 53 })
  })

  it('fails to write a conflicting update', () => {
    actor.get(x_path)
    assert.deepEqual(store.write(x_path, 1, { z: 0 }), { ok: true, rev: 2 })
    actor.put(x_path, (doc) => ({ b: doc.a + 1 }))

    let rec = store.read(x_path)
    assert.deepEqual(rec, { rev: 2, value: { z: 0 } })
  })

  it('does not perform more actions after a failed write', () => {
    actor.get(x_path)
    assert.deepEqual(store.write(x_path, 1, { z: 0 }), { ok: true, rev: 2 })
    actor.put(x_path, (doc) => ({ b: doc.a + 1 }))

    assert.equal(actor.get(x_path), undefined)
    actor.put(x_path, () => ({ no: 'way' }))

    let rec = store.read(x_path)
    assert.deepEqual(rec, { rev: 2, value: { z: 0 } })
  })

  it('creates links', () => {
    actor.link('/path/', 'a.txt')
    actor.link('/path/', 'z.txt')

    let rec = store.read('/path/')
    assert.deepEqual(rec, { rev: 3, value: ['a.txt', 'to/', 'x.json', 'z.txt'] })
  })

  it('creates links that already exist', () => {
    actor.link('/path/', 'x.json')

    let rec = store.read('/path/')
    assert.deepEqual(rec, { rev: 2, value: ['to/', 'x.json'] })
  })

  it('can skip creating links that already exist', () => {
    let skipper = new Actor(store, { skip_links: true })
    skipper.link('/path/', 'x.json')

    let rec = store.read('/path/')
    assert.deepEqual(rec, { rev: 1, value: ['to/', 'x.json'] })
  })

  it('does not skip creating links that do not already exist', () => {
    let skipper = new Actor(store, { skip_links: true })
    skipper.link('/path/', 'a.json')

    let rec = store.read('/path/')
    assert.deepEqual(rec, { rev: 2, value: ['a.json', 'to/', 'x.json'] })
  })

  it('removes a document', () => {
    actor.rm(x_path)

    let rec = store.read(x_path)
    assert.deepEqual(rec, { rev: 2, value: null })
  })

  it('allows empty parent directories to be removed', () => {
    actor.rm('/path/to/y.json')
    actor.unlink('/path/to/', 'y.json')
    actor.unlink('/path/', 'to/')
    actor.unlink('/', 'path/')

    assert.deepEqual(store.read('/'), { rev: 1, value: ['path/'] })
    assert.deepEqual(store.read('/path/'), { rev: 2, value: ['x.json'] })
    assert.deepEqual(store.read('/path/to/'), { rev: 2, value: [] })
    assert.deepEqual(store.read('/path/to/y.json'), { rev: 2, value: null })
  })

  it('prevents non-empty parent directories being removed', () => {
    actor.rm('/path/x.json')
    actor.unlink('/path/', 'x.json')
    actor.unlink('/', 'path/')

    assert.deepEqual(store.read('/'), { rev: 1, value: ['path/'] })
    assert.deepEqual(store.read('/path/'), { rev: 2, value: ['to/'] })
    assert.deepEqual(store.read('/path/x.json'), { rev: 2, value: null })
  })

  it('does not decide to remove directories by default', () => {
    actor.unlink('/path/to/', 'y.json')
    actor.unlink('/path/', 'to/')
    actor.unlink('/', 'path/')

    assert.deepEqual(store.read('/'), { rev: 1, value: ['path/'] })
    assert.deepEqual(store.read('/path/'), { rev: 1, value: ['to/', 'x.json'] })
    assert.deepEqual(store.read('/path/to/'), { rev: 1, value: ['y.json'] })
  })
})
