'use strict'

module.exports = class Graph {
  constructor () {
    this._nodes = []
  }

  add (deps = [], value = null) {
    let id = this._nodes.length + 1
    this._nodes.push({ id, deps, value })
    return id
  }

  * orderings () {
    let nodes = this._nodes.map(({ id, deps }) => [id, deps])

    for (let order of permute(nodes)) {
      yield order.map((id) => this._nodes[id - 1].value)
    }
  }
}

function * permute (nodes) {
  if (nodes.length === 0) {
    yield []
    return
  }

  let available = nodes.filter(([id, deps]) => deps.length === 0)

  for (let [action] of available) {
    let remaining = nodes
        .filter(([id]) => id !== action)
        .map(([id, deps]) => [id, deps.filter((dep) => dep !== action)])

    for (let others of permute(remaining)) {
      yield [action, ...others]
    }
  }
}
