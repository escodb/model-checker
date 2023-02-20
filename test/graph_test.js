'use strict'

const Graph = require('../lib/graph')
const assert = require('assert').strict

describe('Graph', () => {
  let graph

  beforeEach(() => {
    graph = new Graph()
  })

  it('orders a single action', () => {
    graph.add([], 'a')

    assert.deepEqual(Array.from(graph.orderings()), [
      ['a']
    ])
  })

  it('orders two concurrent events', () => {
    graph.add([], 'a')
    graph.add([], 'b')

    assert.deepEqual(Array.from(graph.orderings()), [
      [ 'a', 'b' ],
      [ 'b', 'a' ]
    ])
  })

  it('orders two sequential events', () => {
    let a = graph.add([], 'a')
    graph.add([a], 'b')

    assert.deepEqual(Array.from(graph.orderings()), [
      [ 'a', 'b' ]
    ])
  })

  it('orders a diamond-shaped graph', () => {
    let a = graph.add([], 'a')
    let b = graph.add([a], 'b')
    let c = graph.add([a], 'c')
    let d = graph.add([b, c], 'd')

    assert.deepEqual(Array.from(graph.orderings()), [
      [ 'a', 'b', 'c', 'd' ],
      [ 'a', 'c', 'b', 'd' ]
    ])
  })

  it('orders two sets of unconnected sequences', () => {
    for (let chain of [['a', 'b'], ['c', 'd', 'e']]) {
      chain.reduce((deps, act) => [graph.add(deps, act)], [])
    }

    assert.deepEqual(Array.from(graph.orderings()), [
      [ 'a', 'b', 'c', 'd', 'e' ],
      [ 'a', 'c', 'b', 'd', 'e' ],
      [ 'a', 'c', 'd', 'b', 'e' ],
      [ 'a', 'c', 'd', 'e', 'b' ],
      [ 'c', 'a', 'b', 'd', 'e' ],
      [ 'c', 'a', 'd', 'b', 'e' ],
      [ 'c', 'a', 'd', 'e', 'b' ],
      [ 'c', 'd', 'a', 'b', 'e' ],
      [ 'c', 'd', 'a', 'e', 'b' ],
      [ 'c', 'd', 'e', 'a', 'b' ]
    ])
  })

  it('orders a top-level update() operation', () => {
    let reads = [
      graph.add([], 'LIST /'),
      graph.add([], 'GET /x')
    ]
    let link = graph.add(reads, 'LINK / x')
    graph.add([link], 'PUT /x {}')

    assert.deepEqual(Array.from(graph.orderings()), [
      [ 'LIST /', 'GET /x', 'LINK / x', 'PUT /x {}' ],
      [ 'GET /x', 'LIST /', 'LINK / x', 'PUT /x {}' ]
    ])
  })

  it('orders a top-level update() operation with deferred GET', () => {
    let list = graph.add([], 'LIST /')
    let link = graph.add([list], 'LINK / x')
    let get = graph.add([], 'GET /x')
    let put = graph.add([get, link], 'PUT /x {}')

    assert.deepEqual(Array.from(graph.orderings()), [
      [ 'LIST /', 'LINK / x', 'GET /x', 'PUT /x {}' ],
      [ 'LIST /', 'GET /x', 'LINK / x', 'PUT /x {}' ],
      [ 'GET /x', 'LIST /', 'LINK / x', 'PUT /x {}' ]
    ])
  })

  it('orders a nested update() operation', () => {
    let reads = ['GET /path/x', 'LIST /path/', 'LIST /'].map((action) => {
      return graph.add([], action)
    })
    let links = ['LINK /path/ x', 'LINK / path/'].map((action) => {
      return graph.add(reads, action)
    })
    graph.add(links, 'PUT /path/x {}')

    assert.deepEqual(Array.from(graph.orderings()), [
      [ 'GET /path/x', 'LIST /path/', 'LIST /', 'LINK /path/ x', 'LINK / path/', 'PUT /path/x {}' ],
      [ 'GET /path/x', 'LIST /path/', 'LIST /', 'LINK / path/', 'LINK /path/ x', 'PUT /path/x {}' ],
      [ 'GET /path/x', 'LIST /', 'LIST /path/', 'LINK /path/ x', 'LINK / path/', 'PUT /path/x {}' ],
      [ 'GET /path/x', 'LIST /', 'LIST /path/', 'LINK / path/', 'LINK /path/ x', 'PUT /path/x {}' ],
      [ 'LIST /path/', 'GET /path/x', 'LIST /', 'LINK /path/ x', 'LINK / path/', 'PUT /path/x {}' ],
      [ 'LIST /path/', 'GET /path/x', 'LIST /', 'LINK / path/', 'LINK /path/ x', 'PUT /path/x {}' ],
      [ 'LIST /path/', 'LIST /', 'GET /path/x', 'LINK /path/ x', 'LINK / path/', 'PUT /path/x {}' ],
      [ 'LIST /path/', 'LIST /', 'GET /path/x', 'LINK / path/', 'LINK /path/ x', 'PUT /path/x {}' ],
      [ 'LIST /', 'GET /path/x', 'LIST /path/', 'LINK /path/ x', 'LINK / path/', 'PUT /path/x {}' ],
      [ 'LIST /', 'GET /path/x', 'LIST /path/', 'LINK / path/', 'LINK /path/ x', 'PUT /path/x {}' ],
      [ 'LIST /', 'LIST /path/', 'GET /path/x', 'LINK /path/ x', 'LINK / path/', 'PUT /path/x {}' ],
      [ 'LIST /', 'LIST /path/', 'GET /path/x', 'LINK / path/', 'LINK /path/ x', 'PUT /path/x {}' ]
    ])
  })

  describe('with an example graph', () => {
    let orders

    beforeEach(() => {
      let n3 = graph.add([], 3)
      let n5 = graph.add([], 5)
      let n7 = graph.add([], 7)
      let n0 = graph.add([n3, n7], 0)
      let n1 = graph.add([n5, n7], 1)
      let n2 = graph.add([n1], 2)
      let n4 = graph.add([n1, n3], 4)
      let n6 = graph.add([n0, n1], 6)

      orders = Array.from(graph.orderings())
    })

    it('returns a unique set of orderings', () => {
      assert.equal(orders.length, 150)

      let set = new Set(orders.map((order) => order.join(':')))
      assert.equal(set.size, orders.length)
    })

    it('keeps sequential nodes in order', () => {
      let pairs = [
        [0, 3], [0, 7],
        [1, 5], [1, 7],
        [2, 1], [2, 5], [2,7],
        [4, 1], [4, 3], [4, 5], [4, 7],
        [6, 0], [6, 1], [6, 3], [6, 5], [6, 7]
      ]
      for (let [a, b] of pairs) {
        assert(
          !orders.some((order) => order.indexOf(a) < order.indexOf(b)),
          `node ${a} appears before node ${b}`
        )
      }
    })

    it('it allows concurrent nodes in any order', () => {
      assert(orders.some((order) => order.indexOf(4) < order.indexOf(6)))
      assert(orders.some((order) => order.indexOf(4) > order.indexOf(6)))
    })
  })
})
