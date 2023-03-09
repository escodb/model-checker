'use strict'

const Runner = require('./lib/runner')

let runner = new Runner()

runner.configs([
  { update: 'get_before_put' },
  { remove: 'unlink_parallel' },
  {}
])

runner.add('update/update conflict', {
  setup (db) {
    db.update('/path/x', () => ({ x: 1 }))
  },
  run (planner) {
    planner.client('A').update('/path/x', () => ({ x: 'A' }))
    planner.client('B').update('/path/x', () => ({ x: 'B' }))
  }
})

runner.add('update/update conflict (missing)', {
  setup (db) {
    db.update('/path/x', () => ({ x: 1 }))
  },
  run (planner) {
    planner.client('A').update('/path/y', () => ({ y: 'A' }))
    planner.client('B').update('/path/y', () => ({ y: 'B' }))
  }
})

runner.add('update/delete conflict', {
  setup (db) {
    db.update('/path/x', () => ({ x: 1 }))
  },
  run (planner) {
    planner.client('A').update('/path/x', () => ({ x: 'A' }))
    planner.client('B').remove('/path/x')
  }
})

runner.add('update/delete conflict (missing)', {
  setup (db) {
    db.update('/path/x', () => ({ x: 1 }))
  },
  run (planner) {
    planner.client('A').update('/path/y', () => ({ y: 'A' }))
    planner.client('B').remove('/path/y')
  }
})

runner.add('delete, create sibling', {
  setup (db) {
    db.update('/path/x', () => ({ x: 1 }))
  },
  run (planner) {
    planner.client('A').remove('/path/x')
    planner.client('B').update('/path/y', () => ({ y: 1 }))
  }
})

runner.add('delete, create in parent', {
  setup (db) {
    db.update('/path/to/x', () => ({ x: 1 }))
  },
  run (planner) {
    planner.client('A').remove('/path/to/x')
    planner.client('B').update('/path/y', () => ({ y: 1 }))
  }
})

runner.add('delete, create in grandparent', {
  setup (db) {
    db.update('/path/to/x', () => ({ x: 1 }))
  },
  run (planner) {
    planner.client('A').remove('/path/to/x')
    planner.client('B').update('/y', () => ({ y: 1 }))
  }
})

runner.add('delete, create in child', {
  setup (db) {
    db.update('/path/x', () => ({ x: 1 }))
  },
  run (planner) {
    planner.client('A').remove('/path/x')
    planner.client('B').update('/path/to/y', () => ({ y: 1 }))
  }
})

runner.add('delete, create in grandchild', {
  setup (db) {
    db.update('/x', () => ({ x: 1 }))
  },
  run (planner) {
    planner.client('A').remove('/x')
    planner.client('B').update('/path/to/y', () => ({ y: 1 }))
  }
})

runner.add('delete, update sibling', {
  setup (db) {
    db.update('/path/x', () => ({ x: 1 }))
    db.update('/path/y', () => ({ y: 1 }))
  },
  run (planner) {
    planner.client('A').remove('/path/x')
    planner.client('B').update('/path/y', ({ y }) => ({ y: y + 1 }))
  }
})

runner.add('delete, update in parent', {
  setup (db) {
    db.update('/path/to/x', () => ({ x: 1 }))
    db.update('/path/y', () => ({ y: 1 }))
  },
  run (planner) {
    planner.client('A').remove('/path/to/x')
    planner.client('B').update('/path/y', ({ y }) => ({ y: y + 1 }))
  }
})

runner.add('delete, update in grandparent', {
  setup (db) {
    db.update('/path/to/x', () => ({ x: 1 }))
    db.update('/y', () => ({ y: 1 }))
  },
  run (planner) {
    planner.client('A').remove('/path/to/x')
    planner.client('B').update('/y', ({ y }) => ({ y: y + 1 }))
  }
})

runner.add('delete, update in child', {
  setup (db) {
    db.update('/path/x', () => ({ x: 1 }))
    db.update('/path/to/y', () => ({ y: 1 }))
  },
  run (planner) {
    planner.client('A').remove('/path/x')
    planner.client('B').update('/path/to/y', ({ y }) => ({ y: y + 1 }))
  }
})

runner.add('delete, update in grandchild', {
  setup (db) {
    db.update('/x', () => ({ x: 1 }))
    db.update('/path/to/y', () => ({ y: 1 }))
  },
  run (planner) {
    planner.client('A').remove('/x')
    planner.client('B').update('/path/to/y', ({ y }) => ({ y: y + 1 }))
  }
})

runner.run()
