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

  orderings () {
    let nodes = this._nodes.map(({ id, deps }) => [id, deps])

    return permute(nodes).map((order) => {
      return order.map((id) => this._nodes[id - 1].value)
    })
  }
}

function permute (nodes) {
  if (nodes.length === 0) return [[]]

  let available = nodes.filter(([id, deps]) => deps.length === 0)

  return available.flatMap(([action]) => {
    let remaining = nodes
        .filter(([id]) => id !== action)
        .map(([id, deps]) => [id, deps.filter((dep) => dep !== action)])

    return permute(remaining).map((others) => [action, ...others])
  })
}
