/**
 * Utilities to filter and sort transaction rows for the Movimientos page.
 */

/**
 * @typedef {Object} Tx
 * @property {string} ticker
 * @property {string} date // YYYY-MM-DD
 * @property {'buy'|'sell'|'dividend'} type
 * @property {number=} quantity
 * @property {number=} price
 * @property {number=} cash
 * @property {number=} fees
 */

/**
 * @typedef {Object} Holding
 * @property {string} ticker
 * @property {string} currency
 * @property {string} name
 */

/**
 * @typedef {Object} Row
 * @property {string} ticker
 * @property {string} date
 * @property {'buy'|'sell'|'dividend'} type
 * @property {number=} quantity
 * @property {number=} price
 * @property {number} amount
 */

/**
 * @typedef {Object} Params
 * @property {string} fromISO
 * @property {string} toISO
 * @property {string=} ticker
 * @property {string=} type
 * @property {string=} qmin
 * @property {string=} qmax
 * @property {string=} pmin
 * @property {string=} pmax
 * @property {string=} amin
 * @property {string=} amax
 * @property {'date'|'ticker'|'type'|'quantity'|'price'|'amount'=} sort
 * @property {'asc'|'desc'=} dir
 */

/**
 * @param {Tx[]} transactions
 * @param {Holding[]} holdings
 * @param {Params} params
 * @returns {Row[]}
 */
export function filterAndSort(transactions, holdings, params) {
  const nameByTicker = new Map(holdings.map(h => [h.ticker, h.name]))

  const fromDate = new Date(params.fromISO + 'T00:00:00Z')
  const toDate = new Date(params.toISO + 'T23:59:59Z')

  const rows = transactions
    .filter((t) => {
      const d = new Date(t.date + 'T00:00:00Z')
      return d >= fromDate && d <= toDate
    })
    .map((t) => {
      const q = t.quantity ?? 0
      const p = t.price ?? 0
      const fees = t.fees ?? 0
      const amount = t.type === 'dividend' ? (t.cash ?? 0) : q * p + (t.type === 'buy' ? fees : -fees)
      return { ...t, amount }
    })
    .filter((t) => {
      const fTicker = (params.ticker ?? '').trim().toLowerCase()
      const fType = (params.type ?? '').trim().toLowerCase()
      const num = (v) => {
        if (v === undefined || v === '') return undefined
        const s = String(v).trim().replace(',', '.')
        const n = Number(s)
        return Number.isFinite(n) ? n : undefined
      }
      const qmin = num(params.qmin), qmax = num(params.qmax)
      const pmin = num(params.pmin), pmax = num(params.pmax)
      const amin = num(params.amin), amax = num(params.amax)

      const ticker = t.ticker.toLowerCase()
      const name = (nameByTicker.get(t.ticker) ?? '').toLowerCase()
      if (fTicker && !(ticker.includes(fTicker) || name.includes(fTicker))) return false
      if (fType && t.type.toLowerCase() !== fType) return false
      const q = t.quantity
      const p = t.price
      const a = t.amount
      // Para filtros numéricos en qty/precio, si el campo no existe, no cumple el filtro
      if (qmin !== undefined && (q === undefined || q < qmin)) return false
      if (qmax !== undefined && (q === undefined || q > qmax)) return false
      if (pmin !== undefined && (p === undefined || p < pmin)) return false
      if (pmax !== undefined && (p === undefined || p > pmax)) return false
      if (amin !== undefined && a < amin) return false
      if (amax !== undefined && a > amax) return false
      return true
    })

  const sortKey = /** @type {Required<Params>['sort']} */(params.sort || 'date')
  const dir = params.dir === 'asc' ? 'asc' : 'desc'
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
  rows.sort((a, b) => {
    let r = 0
    if (sortKey === 'date') r = cmp(a.date, b.date)
    else if (sortKey === 'ticker') r = (a.ticker || '').localeCompare(b.ticker || '')
    else if (sortKey === 'type') r = (a.type || '').localeCompare(b.type || '')
    else if (sortKey === 'quantity') r = cmp(a.quantity ?? 0, b.quantity ?? 0)
    else if (sortKey === 'price') r = cmp(a.price ?? 0, b.price ?? 0)
    else if (sortKey === 'amount') r = cmp(a.amount ?? 0, b.amount ?? 0)
    return dir === 'asc' ? r : -r
  })

  return rows
}
