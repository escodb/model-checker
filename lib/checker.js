'use strict'

const Path = require('./path')

module.exports = class Checker {
  constructor (store) {
    this._store = store
    this._seq = null
  }

  check () {
    if (this._seq === this._store.seq) {
      return null
    }

    let paths = this._store.keys().map((key) => new Path(key))
    let docs = paths.filter((path) => path.isDoc())
    let errors = []

    for (let doc of docs) {
      let error = this._checkDoc(doc)
      if (error) {
        errors.push(error)
      }
    }

    if (errors.length === 0) {
      this._seq = this._store.seq
      return null
    } else {
      return errors
    }
  }

  _checkDoc (doc) {
    let record = this._store.read(doc.full())
    if (!record?.value) return null

    for (let [dir, name] of doc.links()) {
      let record = this._store.read(dir)

      if (!record) {
        return `dir "${dir}", required by doc "${doc.full()}", is missing`
      }
      if (!record.value?.includes(name)) {
        return `dir "${dir}" does not include name "${name}", required by doc "${doc.full()}"`
      }
    }
    return null
  }
}
