'use strict'

const Graph = require('../lib/graph')
const Planner = require('../lib/planner')
const assert = require('assert').strict
const { inspect } = require('util')

const FN = (doc) => doc

describe('Planner', () => {
  let graph, planner

  beforeEach(() => {
    graph = new Graph()
    planner = new Planner(graph)
  })

  function arrayEqual (a, b) {
    if (a.length !== b.length) {
      return false
    }
    for (let [i, value] of a.entries()) {
      if (value !== b[i]) return false
    }
    return true
  }

  function checkGraph (nodes) {
    let { _nodes } = graph
    let mapping = new Map()

    assert.equal(_nodes.length, Object.keys(nodes).length)

    for (let [key, { deps, action }] of Object.entries(nodes)) {
      let node = _nodes.find(({ value }) => arrayEqual(value, action))
      assert(node, `no graph node found matching action ${inspect(action)}`)
      mapping.set(key, node.id)

      let ids = deps.map((dep) => mapping.get(dep))
      assert.deepEqual(
        node.deps.slice().sort(),
        ids.slice().sort(),
        `dependencies do not match for action ${inspect(action)}`
      )
    }
    assert.equal(_nodes.length, mapping.size)
  }

  describe('update_reads_before_links', () => {
    it('plans a top-level document update', () => {
      planner.client('A').update_reads_before_links('/x.json', FN)
      checkGraph({
        get:  { action: ['A', 'get', '/x.json'], deps: [] },
        list: { action: ['A', 'list', '/'], deps: [] },
        link: { action: ['A', 'link', '/', 'x.json'], deps: ['get', 'list'] },
        put:  { action: ['A', 'put', '/x.json', FN], deps: ['link'] }
      })
    })

    it('plans an update in a top-level directory', () => {
      planner.client('A').update_reads_before_links('/path/x.json', FN)
      checkGraph({
        get:    { action: ['A', 'get', '/path/x.json'], deps: [] },

        list1:  { action: ['A', 'list', '/'], deps: [] },
        list2:  { action: ['A', 'list', '/path/'], deps: [] },

        link1:  { action: ['A', 'link', '/', 'path/'], deps: ['get', 'list1', 'list2'] },
        link2:  { action: ['A', 'link', '/path/', 'x.json'], deps: ['get', 'list1', 'list2'] },

        put:    { action: ['A', 'put', '/path/x.json', FN], deps: ['link1', 'link2'] }
      })
    })

    it('plans an update in a nested directory', () => {
      planner.client('A').update_reads_before_links('/path/to/x.json', FN)
      checkGraph({
        get:    { action: ['A', 'get', '/path/to/x.json'], deps: [] },

        list1:  { action: ['A', 'list', '/'], deps: [] },
        list2:  { action: ['A', 'list', '/path/'], deps: [] },
        list3:  { action: ['A', 'list', '/path/to/'], deps: [] },

        link1:  { action: ['A', 'link', '/', 'path/'], deps: ['get', 'list1', 'list2', 'list3'] },
        link2:  { action: ['A', 'link', '/path/', 'to/'], deps: ['get', 'list1', 'list2', 'list3'] },
        link3:  { action: ['A', 'link', '/path/to/', 'x.json'], deps: ['get', 'list1', 'list2', 'list3'] },

        put:    { action: ['A', 'put', '/path/to/x.json', FN], deps: ['link1', 'link2', 'link3'] }
      })
    })
  })

  describe('update_get_before_put', () => {
    it('plans an update in a top-level directory', () => {
      planner.client('A').update_get_before_put('/path/x.json', FN)
      checkGraph({
        list1:  { action: ['A', 'list', '/'], deps: [] },
        link1:  { action: ['A', 'link', '/', 'path/'], deps: ['list1'] },

        list2:  { action: ['A', 'list', '/path/'], deps: [] },
        link2:  { action: ['A', 'link', '/path/', 'x.json'], deps: ['list2'] },

        get:    { action: ['A', 'get', '/path/x.json'], deps: [] },
        put:    { action: ['A', 'put', '/path/x.json', FN], deps: ['get', 'link1', 'link2'] }
      })
    })
  })

  describe('remove_unlink_reverse_sequential', () => {
    it('plans a top-level document deletion', () => {
      planner.client('B').remove_unlink_reverse_sequential('/y.json')
      checkGraph({
        get:    { action: ['B', 'get', '/y.json'], deps: [] },
        list:   { action: ['B', 'list', '/'], deps: [] },
        rm:     { action: ['B', 'rm', '/y.json'], deps: ['get', 'list'] },
        unlink: { action: ['B', 'unlink', '/', 'y.json'], deps: ['rm'] }
      })
    })

    it('plans a deletion in a nested directory', () => {
      planner.client('B').remove_unlink_reverse_sequential('/path/to/y.json')
      checkGraph({
        get:      { action: ['B', 'get', '/path/to/y.json'], deps: [] },

        list1:    { action: ['B', 'list', '/'], deps: [] },
        list2:    { action: ['B', 'list', '/path/'], deps: [] },
        list3:    { action: ['B', 'list', '/path/to/'], deps: [] },

        rm:       { action: ['B', 'rm', '/path/to/y.json'], deps: ['get', 'list1', 'list2', 'list3'] },

        unlink1:  { action: ['B', 'unlink', '/path/to/', 'y.json'], deps: ['rm'] },
        unlink2:  { action: ['B', 'unlink', '/path/', 'to/'], deps: ['unlink1'] },
        unlink3:  { action: ['B', 'unlink', '/', 'path/'], deps: ['unlink2'] }
      })
    })
  })

  describe('remove_unlink_parallel', () => {
    it('plans a deletion in a nested directory', () => {
      planner.client('B').remove_unlink_parallel('/path/to/y.json')
      checkGraph({
        get:      { action: ['B', 'get', '/path/to/y.json'], deps: [] },

        list1:    { action: ['B', 'list', '/'], deps: [] },
        list2:    { action: ['B', 'list', '/path/'], deps: [] },
        list3:    { action: ['B', 'list', '/path/to/'], deps: [] },

        rm:       { action: ['B', 'rm', '/path/to/y.json'], deps: ['get', 'list1', 'list2', 'list3'] },

        unlink1:  { action: ['B', 'unlink', '/path/to/', 'y.json'], deps: ['rm'] },
        unlink2:  { action: ['B', 'unlink', '/path/', 'to/'], deps: ['rm'] },
        unlink3:  { action: ['B', 'unlink', '/', 'path/'], deps: ['rm'] }
      })
    })
  })
})
