'use strict'

const { inspect } = require('util')

const Actor = require('./actor')
const Checker = require('./checker')
const Graph = require('./graph')
const Planner = require('./planner')
const Store = require('./store')

const SPLIT = '========================================================================'

function colour (n, string) {
  if (process.stdout.isTTY) {
    return `\x1B[1;${n}m${string}\x1B[0m`
  } else {
    return string
  }
}

const PASS = colour(32, 'PASS')
const FAIL = colour(31, 'FAIL')

module.exports = class Runner {
  constructor () {
    this._configs = []
    this._scenarios = []
    this._results = []
  }

  configs (configs) {
    this._configs = this._configs.concat(configs)
  }

  add (name, scenario) {
    this._scenarios.push({ name, ...scenario })
  }

  run () {
    for (let config of this._configs) {
      let runner = new RunnerConfig(config, this._scenarios)
      let results = runner.run()
      this._results.push([config, results])
    }
    this._printSummary()
  }

  _printSummary () {
    console.log(SPLIT)
    console.log('SUMMARY')
    console.log(SPLIT)
    console.log('')

    for (let [config, results] of this._results) {
      console.log(`Configuration: ${inspect(config)}`)
      for (let [name, { count, errors }] of results) {
        console.log(`    - ${errors ? FAIL : PASS} (${_format(count)}): ${name}`)
      }
      console.log('')
    }
  }
}

class RunnerConfig {
  constructor (config, scenarios) {
    this._config = config
    this._scenarios = scenarios
    this._results = []
  }

  run () {
    console.log(SPLIT)
    console.log('')
    console.log('Configuration:')

    for (let [key, value] of Object.entries(this._config)) {
      console.log(`    - ${key} = ${inspect(value)}`)
    }
    console.log('')

    for (let scenario of this._scenarios) {
      console.log(`Scenario: ${scenario.name}`)
      this._runScenario(scenario)
    }
    return this._results
  }

  _runScenario (scenario) {
    let store = this._createStore(scenario)

    let graph = new Graph()
    let planner = new Planner(graph, this._config)
    scenario.run(planner)

    let result = this._checkExecution(store, planner.clients(), graph)
    this._results.push([scenario.name, result])
    this._printResult(result)
  }

  _createStore ({ setup }) {
    let graph = new Graph()
    let planner = new Planner(graph, this._config)

    setup(planner.client('tmp'))

    let { value: commands } = graph.orderings().next()
    let store = new Store()
    let actor = new Actor(store)

    for (let [_, method, ...args] of commands) {
      actor[method](...args)
    }
    return store
  }

  _checkExecution (store, clients, graph) {
    let count = 0

    for (let plan of graph.orderings()) {
      count += 1

      let state = store.clone()
      let checker = new Checker(state)

      let actors = Object.fromEntries(clients.map((name) => {
        return [name, new Actor(state)]
      }))

      for (let step of plan) {
        let [id, method, ...args] = step
        actors[id][method](...args)

        let errors = checker.check()
        if (errors) {
          return { count, errors, state, plan, step }
        }
      }
    }
    return { count }
  }

  _printResult (result) {
    let { count, errors, state, plan, step } = result

    console.log(`    checked executions: ${_format(count)}`)
    console.log(`    result: ${errors ? FAIL : PASS}`)

    if (errors) {
      console.log('    errors:')
      for (let error of errors) {
        console.log(`        - ${error}`)
      }
      console.log('    state:')
      for (let key of state.keys().sort()) {
        console.log(`        ${inspect(key)} => ${inspect(state.read(key))}`)
      }
      console.log('    execution:')
      for (let op of plan) {
        let ptr = (op === step) ? '==>' : '   '
        console.log(`    ${ptr} ${this._formatStep(op)}`)
      }
    }
    console.log('')
  }

  _formatStep ([id, method, ...args]) {
    return `${id}.${method}(${args.map(inspect).join(', ')})`
  }
}

function _format (number) {
  let parts = []
  let f = 1000
  let pad = Math.round(Math.log(f) / Math.log(10))

  while (number >= f) {
    let part = String(number % f)
    while (part.length < pad) part = '0' + part
    parts.push(part)
    number = Math.floor(number / f)
  }
  parts.push(number)
  return parts.reverse().join(',')
}
