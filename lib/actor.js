'use strict'

const Cache = require('./cache')
const Path = require('./path')

module.exports = class Actor {
  constructor (store) {
    this._cache = new Cache(store)
    this._crashed = false
    this._unlinks = new Set()
  }

  _write (path, value) {
    let { ok } = this._cache.write(path, value)
    if (!ok) {
      this._crashed = true
    }
  }

  get (path) {
    if (!this._crashed) {
      return this._cache.read(path)
    }
  }

  put (path, fn) {
    if (!this._crashed) {
      let doc = fn(this._cache.read(path))
      this._write(path, doc)
    }
  }

  rm (path) {
    if (!this._crashed) {
      if (!this._cache.read(path)) {
        return
      }

      this._unlinks = new Set()

      for (let [dir, name] of new Path(path).links().reverse()) {
        this._unlinks.add(dir)
        let record = this._cache.read(dir)

        if (record?.length !== 1 || record[0] !== name) {
          break
        }
      }

      this.put(path, () => null)
    }
  }

  list (path) {
    return this.get(path)
  }

  link (path, child) {
    if (!this._crashed) {
      let dir = this._cache.read(path) || []
      dir = Array.from(new Set([...dir, child])).sort()
      this._write(path, dir)
    }
  }

  unlink (path, child) {
    if (!this._crashed) {
      if (this._unlinks.has(path)) {
        let dir = this._cache.read(path) || []
        dir = dir.filter((name) => name !== child)
        this._write(path, dir)
      }
    }
  }
}
