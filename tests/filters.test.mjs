import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { filterAndSort } from '../src/lib/filters.mjs'

const transactions = JSON.parse(await readFile(new URL('../public/data/transactions.json', import.meta.url))).transactions
const holdings = JSON.parse(await readFile(new URL('../public/data/portfolio.json', import.meta.url))).holdings

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function minusDays(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// 1) Presets 1M/3M/6M/1Y should yield rows
for (const [label, days] of [['1M', 30], ['3M', 90], ['6M', 180], ['1Y', 365]]) {
  const rows = filterAndSort(transactions, holdings, {
    fromISO: minusDays(days),
    toISO: todayISO(),
    sort: 'date',
    dir: 'desc',
  })
  assert.ok(rows.length > 0, `${label} should have rows`)
}

// 1b) YTD: todas las filas pertenecen al año actual
{
  const year = new Date().getFullYear()
  const rows = filterAndSort(transactions, holdings, {
    fromISO: `${year}-01-01`,
    toISO: todayISO(),
  })
  assert.ok(rows.length > 0, 'YTD should have rows')
  assert.ok(rows.every(r => r.date.startsWith(String(year))))
}

// 1c) ALL: desde 2010-01-01 hasta hoy equivale a todas las transacciones con fecha <= hoy
{
  const rows = filterAndSort(transactions, holdings, {
    fromISO: '2010-01-01',
    toISO: todayISO(),
  })
  const expected = transactions.filter(t => t.date <= todayISO()).length
  assert.equal(rows.length, expected)
}

// 2) Ticker filter matches by symbol or name (case-insensitive)
{
  const rows = filterAndSort(transactions, holdings, {
    fromISO: '2010-01-01',
    toISO: todayISO(),
    ticker: 'unitedhealth',
  })
  assert.ok(rows.every(r => r.ticker === 'UNH'))
}

// 3) Type filter: only dividends
{
  const rows = filterAndSort(transactions, holdings, {
    fromISO: '2010-01-01',
    toISO: todayISO(),
    type: 'dividend',
  })
  assert.ok(rows.length > 0)
  assert.ok(rows.every(r => r.type === 'dividend'))
}

// 4) Numeric ranges - quantity min/max
{
  const rows = filterAndSort(transactions, holdings, {
    fromISO: '2010-01-01',
    toISO: todayISO(),
    qmin: '2',
  })
  assert.ok(rows.every(r => (r.quantity ?? 0) >= 2))
}

{
  const rows = filterAndSort(transactions, holdings, {
    fromISO: '2010-01-01',
    toISO: todayISO(),
    qmax: '1',
  })
  assert.ok(rows.every(r => (r.quantity ?? 0) <= 1))
}

// 5) Numeric ranges - price min/max
{
  const rows = filterAndSort(transactions, holdings, {
    fromISO: '2010-01-01',
    toISO: todayISO(),
    pmin: '500',
  })
  assert.ok(rows.every(r => (r.price ?? 0) >= 500))
}

{
  const rows = filterAndSort(transactions, holdings, {
    fromISO: '2010-01-01',
    toISO: todayISO(),
    pmax: '100',
  })
  assert.ok(rows.every(r => (r.price ?? 0) <= 100))
}

// 6) Numeric ranges - amount min/max
{
  const rows = filterAndSort(transactions, holdings, {
    fromISO: '2010-01-01',
    toISO: todayISO(),
    amin: '1000',
  })
  assert.ok(rows.every(r => r.amount >= 1000))
}

{
  const rows = filterAndSort(transactions, holdings, {
    fromISO: '2010-01-01',
    toISO: todayISO(),
    amax: '100',
  })
  assert.ok(rows.every(r => r.amount <= 100))
}

// 7) Combined filters (ticker + type + ranges)
{
  const rows = filterAndSort(transactions, holdings, {
    fromISO: '2010-01-01',
    toISO: todayISO(),
    ticker: 'SPY',
    type: 'buy',
    qmin: '1',
    pmin: '400',
  })
  assert.ok(rows.length > 0)
  assert.ok(rows.every(r => r.ticker === 'SPY' && r.type === 'buy' && (r.quantity ?? 0) >= 1 && (r.price ?? 0) >= 400))
}

// 8) Sorting checks
function isSorted(arr, get, dir = 'asc') {
  for (let i = 1; i < arr.length; i++) {
    const a = get(arr[i - 1])
    const b = get(arr[i])
    if (dir === 'asc' ? a > b : a < b) return false
  }
  return true
}

{
  const rows = filterAndSort(transactions, holdings, {
    fromISO: '2010-01-01',
    toISO: todayISO(),
    sort: 'date',
    dir: 'asc',
  })
  assert.ok(isSorted(rows, r => r.date, 'asc'))
}

{
  const rows = filterAndSort(transactions, holdings, {
    fromISO: '2010-01-01',
    toISO: todayISO(),
    sort: 'amount',
    dir: 'desc',
  })
  assert.ok(isSorted(rows, r => r.amount, 'desc'))
}

console.log('filters.test.mjs: All tests passed')
