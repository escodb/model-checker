'use strict'

module.exports = class Store {
  constructor (seq = 0, data = null) {
    this._data = data || new Map()
    this.seq = seq
  }

  read (key) {
    let record = this._data.get(key)

    if (record) {
      return { rev: record.rev, value: JSON.parse(record.value) }
    } else {
      return null
    }
  }

  write (key, rev, value) {
    let record = this._data.get(key)

    if (record && rev !== record.rev) {
      return { ok: false, reason: 'conflict' }
    }

    if (!record) {
      record = { rev: 0 }
      this._data.set(key, record)
    }
    record.rev += 1
    record.value = value ? JSON.stringify(value) : null
    this.seq += 1

    return { ok: true, rev: record.rev }
  }

  keys () {
    return Array.from(this._data.keys())
  }

  clone () {
    let cloneData = new Map()

    for (let [key, { rev, value }] of this._data) {
      cloneData.set(key, { rev, value })
    }
    return new Store(this.seq, cloneData)
  }
}
