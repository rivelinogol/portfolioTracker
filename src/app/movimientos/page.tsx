import { promises as fs } from 'fs'
import path from 'path'
import Link from 'next/link'

type Tx = {
  ticker: string
  date: string
  type: 'buy' | 'sell' | 'dividend'
  quantity?: number
  price?: number
  cash?: number
  fees?: number
}

type Transactions = { transactions: Tx[] }
type Prices = { prices: Record<string, number> }
type Holding = { ticker: string; currency: string; name: string }
type Portfolio = { holdings: Holding[] }

async function readJson<T>(...segments: string[]): Promise<T> {
  const filePath = path.join(process.cwd(), 'public', ...segments)
  const file = await fs.readFile(filePath, 'utf8')
  return JSON.parse(file) as T
}

function fmtQty(n: number) {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 6 })
}

function fmtMoney(n: number, currency: string) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(n)
}

function cmpDescDate(a: string, b: string) {
  return a < b ? 1 : a > b ? -1 : 0
}

export default async function MovimientosPage({ searchParams }: { searchParams?: { p?: string; range?: string; from?: string; to?: string } }) {
  const [{ transactions }, { prices }, { holdings }] = await Promise.all([
    readJson<Transactions>('data', 'transactions.json'),
    readJson<Prices>('data', 'prices.json'),
    readJson<Portfolio>('data', 'portfolio.json'),
  ])

  const currencyByTicker = new Map(holdings.map((h) => [h.ticker, h.currency]))

  // Definir rango temporal
  const todayISO = new Date().toISOString().slice(0, 10)
  const range = searchParams?.range ?? 'all'
  const toISO = searchParams?.to ?? todayISO
  const fromISO = searchParams?.from ?? (
    range === 'ytd'
      ? `${new Date(toISO).getFullYear()}-01-01`
      : range === '1m'
        ? new Date(new Date(toISO).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : '2010-01-01'
  )

  const fromDate = new Date(fromISO + 'T00:00:00Z')
  const toDate = new Date(toISO + 'T23:59:59Z')

  // Calcular PnL y avgCost por ticker recorriendo en orden ascendente, solo hasta `to`
  type State = { qty: number; avgCost: number }
  const state = new Map<string, State>()

  const asc = [...transactions]
    .filter((t) => new Date(t.date + 'T00:00:00Z') <= toDate)
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  let realizedInRange = 0

  const computed = asc.map((t) => {
    const s = state.get(t.ticker) ?? { qty: 0, avgCost: 0 }
    const cur = prices[t.ticker] ?? 0
    let pnl = 0
    let pct: number | undefined
    const q = t.quantity ?? 0
    const p = t.price ?? 0
    const fees = t.fees ?? 0

    if (t.type === 'buy') {
      const totalCost = s.avgCost * s.qty + q * p + fees
      s.qty += q
      s.avgCost = s.qty > 0 ? totalCost / s.qty : 0
      pnl = (cur - p) * q
      pct = p ? (cur - p) / p : 0
    } else if (t.type === 'sell') {
      pnl = (p - s.avgCost) * q - fees
      const denom = s.avgCost * q
      pct = denom ? pnl / denom : 0
      s.qty = Math.max(0, s.qty - q)
      // Si la venta cae en el rango, sumar al realizado del periodo
      const d = new Date(t.date + 'T00:00:00Z')
      if (d >= fromDate && d <= toDate) realizedInRange += pnl
    } else {
      const cash = t.cash ?? 0
      pnl = cash
      const base = s.avgCost * s.qty
      pct = base ? cash / base : undefined
      const d = new Date(t.date + 'T00:00:00Z')
      if (d >= fromDate && d <= toDate) realizedInRange += cash
    }

    state.set(t.ticker, s)

    return {
      ...t,
      amount: t.type === 'dividend' ? (t.cash ?? 0) : q * p + (t.type === 'buy' ? fees : -fees),
      pnl,
      pct,
    }
  })

  // Mostrar más recientes primero
  const desc = computed
    .filter((t) => {
      const d = new Date(t.date + 'T00:00:00Z')
      return d >= fromDate && d <= toDate
    })
    .sort((a, b) => cmpDescDate(a.date, b.date))

  const page = Number(searchParams?.p ?? '1') || 1
  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(desc.length / pageSize))
  const start = (page - 1) * pageSize
  const view = desc.slice(start, start + pageSize)

  // PnL no realizado al cierre del rango (toDate)
  let unrealized = 0
  for (const [ticker, s] of state) {
    const cur = prices[ticker] ?? 0
    unrealized += (cur - s.avgCost) * s.qty
  }
  const totalPnl = realizedInRange + unrealized

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Movimientos</h1>
        <Link href="/cartera" className="text-blue-400 hover:underline text-sm">← Volver a Cartera</Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 w-full sm:w-auto">
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
            <div className="text-xs text-gray-400">PnL realizado ({fromISO} → {toISO})</div>
            <div className={`mt-1 text-lg [font-variant-numeric:tabular-nums] ${realizedInRange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(realizedInRange, 'USD')}</div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
            <div className="text-xs text-gray-400">PnL no realizado (al {toISO})</div>
            <div className={`mt-1 text-lg [font-variant-numeric:tabular-nums] ${unrealized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(unrealized, 'USD')}</div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
            <div className="text-xs text-gray-400">PnL total</div>
            <div className={`mt-1 text-lg [font-variant-numeric:tabular-nums] ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(totalPnl, 'USD')}</div>
          </div>
        </div>
        <div className="text-sm text-gray-300 flex items-center gap-2">
          <span className="text-gray-400">Período:</span>
          <a className={`rounded border border-gray-700 px-2 py-1 ${range==='1m'?'bg-gray-800 text-gray-100':'hover:bg-gray-800 text-gray-300'}`} href={`/movimientos?range=1m`}>1M</a>
          <a className={`rounded border border-gray-700 px-2 py-1 ${range==='ytd'?'bg-gray-800 text-gray-100':'hover:bg-gray-800 text-gray-300'}`} href={`/movimientos?range=ytd`}>YTD</a>
          <a className={`rounded border border-gray-700 px-2 py-1 ${range==='all'&&!searchParams?.from&&!searchParams?.to?'bg-gray-800 text-gray-100':'hover:bg-gray-800 text-gray-300'}`} href={`/movimientos?range=all`}>Todo</a>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg ring-1 ring-gray-800">
        <table className="table-dense w-full text-[13px]">
          <thead>
            <tr className="text-left">
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300">Fecha</th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300">Ticker</th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300">Tipo</th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">Cantidad</th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">Precio</th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">Importe</th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">PnL</th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">PnL %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {view.map((t, idx) => {
              const currency = currencyByTicker.get(t.ticker) ?? 'USD'
              const qty = t.quantity ?? 0
              const price = t.price ?? 0
              return (
                <tr key={`${t.date}-${t.ticker}-${idx}`} className="odd:bg-gray-950 even:bg-gray-900/30 hover:bg-gray-800/50 transition-colors">
                  <td className="text-gray-300 whitespace-nowrap">{t.date}</td>
                  <td className="whitespace-nowrap font-medium text-gray-100">
                    <Link href={`/cartera/${encodeURIComponent(t.ticker)}`} className="hover:underline">{t.ticker}</Link>
                  </td>
                  <td className="text-gray-300 uppercase">{t.type}</td>
                  <td className="[font-variant-numeric:tabular-nums] text-right">{qty ? fmtQty(qty) : '-'}</td>
                  <td className="[font-variant-numeric:tabular-nums] text-right">{price ? fmtMoney(price, currency) : '-'}</td>
                  <td className="[font-variant-numeric:tabular-nums] text-right">{fmtMoney(t.amount, currency)}</td>
                  <td className={`[font-variant-numeric:tabular-nums] text-right ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(t.pnl, currency)}</td>
                  <td className={`[font-variant-numeric:tabular-nums] text-right ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t.pct === undefined ? '-' : `${(t.pct * 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-sm text-gray-400">
        <span> Página {page} de {totalPages} </span>
        <div className="ml-2 flex gap-2">
          <Link className={`rounded border border-gray-700 px-2 py-1 ${page <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-gray-800 text-gray-300'}`} href={`/movimientos?p=${Math.max(1, page - 1)}`}>« Prev</Link>
          <Link className={`rounded border border-gray-700 px-2 py-1 ${page >= totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-gray-800 text-gray-300'}`} href={`/movimientos?p=${Math.min(totalPages, page + 1)}`}>Next »</Link>
        </div>
      </div>
    </main>
  )
}
