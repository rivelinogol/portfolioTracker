import { promises as fs } from 'fs'
import path from 'path'

export type Holding = {
  ticker: string
  name: string
  quantity: number
  avgCost: number
  currency: string
}

export type Portfolio = { holdings: Holding[] }
export type Prices = { prices: Record<string, number> }
export type MetaEntry = { sector?: string; country?: string; currency?: string }
export type Metadata = { metadata: Record<string, MetaEntry> }

export async function readJson<T>(...segments: string[]): Promise<T> {
  const filePath = path.join(process.cwd(), 'public', ...segments)
  const file = await fs.readFile(filePath, 'utf8')
  return JSON.parse(file) as T
}

export type GroupKey = 'sector' | 'country' | 'currency'

export type GroupRow = {
  key: string
  weight: number
  value: number
}

export function aggregateBy(
  holdings: Holding[],
  prices: Prices['prices'],
  metadata: Metadata['metadata'],
  key: GroupKey
): { rows: GroupRow[]; total: number } {
  // compute holding values
  const values = holdings.map((h) => ({
    ticker: h.ticker,
    value: (prices[h.ticker] ?? 0) * h.quantity,
    currency: h.currency,
    sector: metadata[h.ticker]?.sector ?? 'N/D',
    country: metadata[h.ticker]?.country ?? 'N/D',
  }))

  const total = values.reduce((acc, r) => acc + r.value, 0)
  const map = new Map<string, number>()
  for (const v of values) {
    const k = key === 'currency' ? v.currency : (key === 'sector' ? v.sector : v.country)
    map.set(k, (map.get(k) ?? 0) + v.value)
  }
  const rows: GroupRow[] = Array.from(map.entries())
    .map(([k, v]) => ({ key: k, value: v, weight: total ? v / total : 0 }))
    .sort((a, b) => b.weight - a.weight)

  return { rows, total }
}

// Optional historical prices for correlations
export type HistoryPoint = { date: string; close: number }
export type History = { history: Record<string, HistoryPoint[]> }

export function computeReturns(series: HistoryPoint[]): Map<string, number> {
  // returns keyed by date ISO
  const out = new Map<string, number>()
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1]
    const cur = series[i]
    if (!prev || !cur) continue
    const r = prev.close ? (cur.close - prev.close) / prev.close : 0
    out.set(cur.date, r)
  }
  return out
}

export function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null
  const n = xs.length
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / n
  const mx = mean(xs)
  const my = mean(ys)
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    const vx = xs[i] - mx
    const vy = ys[i] - my
    num += vx * vy
    dx += vx * vx
    dy += vy * vy
  }
  const den = Math.sqrt(dx * dy)
  return den === 0 ? null : (num / den)
}

export type CorrCell = { a: string; b: string; r: number | null }

export function correlationMatrix(hist: History['history'], tickers: string[]): CorrCell[] {
  const cells: CorrCell[] = []
  const returnsByTicker = new Map<string, Map<string, number>>()
  for (const t of tickers) {
    const series = hist[t]
    if (series && series.length >= 2) returnsByTicker.set(t, computeReturns(series))
  }
  const keys = Array.from(returnsByTicker.keys())
  for (let i = 0; i < keys.length; i++) {
    for (let j = i; j < keys.length; j++) {
      const a = keys[i], b = keys[j]
      const ra = returnsByTicker.get(a)!
      const rb = returnsByTicker.get(b)!
      const commonDates = Array.from(ra.keys()).filter((d) => rb.has(d))
      const xs = commonDates.map((d) => ra.get(d)!)
      const ys = commonDates.map((d) => rb.get(d)!)
      const r = pearson(xs, ys)
      cells.push({ a, b, r })
    }
  }
  return cells
}

