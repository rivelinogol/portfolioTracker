import { promises as fs } from 'fs'
import path from 'path'
import Link from 'next/link'

type Tx = {
  ticker: string
  date: string // ISO yyyy-mm-dd
  type: 'buy' | 'sell' | 'dividend'
  quantity?: number
  price?: number
  cash?: number
  fees?: number
}

type Transactions = { transactions: Tx[] }
type Prices = { prices: Record<string, number> }

async function readJson<T>(...segments: string[]): Promise<T> {
  const filePath = path.join(process.cwd(), 'public', ...segments)
  const file = await fs.readFile(filePath, 'utf8')
  return JSON.parse(file) as T
}

function formatNumber(n: number, opts: Intl.NumberFormatOptions = {}) {
  return n.toLocaleString('es-AR', {
    maximumFractionDigits: 6,
    ...opts,
  })
}

function daysBetween(iso: string) {
  const ms = Date.now() - new Date(iso + 'T00:00:00Z').getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

export default async function TickerPage({ params }: { params: { ticker: string } }) {
  const ticker = decodeURIComponent(params.ticker)
  const { transactions } = await readJson<Transactions>('data', 'transactions.json')
  const { prices } = await readJson<Prices>('data', 'prices.json')

  const txs = transactions.filter((t) => t.ticker === ticker)
  const currentPrice = prices[ticker]

  if (!txs.length) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-4 text-lg font-semibold">{ticker}</h1>
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-4 text-gray-300">
          No hay transacciones para este ticker.
        </div>
        <div className="mt-4">
          <Link href="/cartera" className="text-blue-400 hover:underline">
            ← Volver a Cartera
          </Link>
        </div>
      </main>
    )
  }

  // Calcular PnL realizado vs no realizado y lista detallada
  const asc = [...txs].sort((a, b) => (a.date < b.date ? -1 : 1))
  let qty = 0
  let avgCost = 0
  let realized = 0
  const cur = currentPrice ?? 0

  type Row = {
    date: string
    type: Tx['type']
    quantity: number
    price: number
    invested: number
    value: number
    pnl: number
    pct?: number
    realized: boolean
  }

  const rows: Row[] = asc.map((t) => {
    if (t.type === 'buy') {
      const q = t.quantity ?? 0
      const p = t.price ?? 0
      const fees = t.fees ?? 0
      const totalCost = avgCost * qty + q * p + fees
      qty += q
      avgCost = qty > 0 ? totalCost / qty : 0
      const invested = q * p + fees
      const value = q * cur
      const pnl = value - invested
      const pct = invested ? pnl / invested : 0
      return { date: t.date, type: t.type, quantity: q, price: p, invested, value, pnl, pct, realized: false }
    } else if (t.type === 'sell') {
      const q = t.quantity ?? 0
      const p = t.price ?? 0
      const fees = t.fees ?? 0
      const pnl = (p - avgCost) * q - fees
      realized += pnl
      qty = Math.max(0, qty - q)
      const invested = q * avgCost
      const value = q * p
      const pct = invested ? pnl / invested : 0
      return { date: t.date, type: t.type, quantity: q, price: p, invested, value, pnl, pct, realized: true }
    } else {
      const cash = t.cash ?? 0
      realized += cash
      return { date: t.date, type: t.type, quantity: 0, price: 0, invested: 0, value: cash, pnl: cash, pct: undefined, realized: true }
    }
  })

  const unrealized = (cur - avgCost) * qty
  const investedOpen = avgCost * qty
  const valueOpen = cur * qty
  const totalPnl = realized + unrealized

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-2 flex items-baseline gap-3">
        <h1 className="text-lg font-semibold">{ticker}</h1>
        {currentPrice != null && (
          <span className="text-sm text-gray-400">Precio actual: {formatNumber(currentPrice)}</span>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
          <div className="text-xs text-gray-400">PnL realizado</div>
          <div className={`mt-1 text-lg [font-variant-numeric:tabular-nums] ${realized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatNumber(realized)}</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
          <div className="text-xs text-gray-400">PnL no realizado</div>
          <div className={`mt-1 text-lg [font-variant-numeric:tabular-nums] ${unrealized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatNumber(unrealized)}</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
          <div className="text-xs text-gray-400">PnL total</div>
          <div className={`mt-1 text-lg [font-variant-numeric:tabular-nums] ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatNumber(totalPnl)}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg ring-1 ring-gray-800">
        <table className="table-dense w-full text-[13px]">
          <thead>
            <tr className="text-left">
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300">
                Fecha
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300">Tipo</th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">
                Cantidad
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">
                Precio
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">
                Inversión
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">
                Valor hoy
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">
                PnL
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">
                PnL %
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">
                Días
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rows
              .slice()
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((r, i) => {
                const pct = r.pct ?? (r.invested ? r.pnl / r.invested : 0)
                return (
                  <tr key={`${r.date}-${i}`} className="odd:bg-gray-950 even:bg-gray-900/30 hover:bg-gray-800/50 transition-colors">
                    <td className="text-gray-300 whitespace-nowrap">{r.date}</td>
                    <td className="text-gray-300 uppercase">{r.type}</td>
                    <td className="[font-variant-numeric:tabular-nums] text-right">{formatNumber(r.quantity)}</td>
                    <td className="[font-variant-numeric:tabular-nums] text-right">{r.price ? formatNumber(r.price) : '-'}</td>
                    <td className="[font-variant-numeric:tabular-nums] text-right">{formatNumber(r.invested)}</td>
                    <td className="[font-variant-numeric:tabular-nums] text-right">{formatNumber(r.value)}</td>
                    <td className={`[font-variant-numeric:tabular-nums] text-right ${r.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatNumber(r.pnl)}</td>
                    <td className={`[font-variant-numeric:tabular-nums] text-right ${r.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{isFinite(pct) ? formatNumber(pct * 100, { maximumFractionDigits: 2 }) + '%' : '-'}</td>
                    <td className="[font-variant-numeric:tabular-nums] text-right">{daysBetween(r.date)}</td>
                  </tr>
                )
              })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-800 bg-gray-900/40">
              <td className="text-right font-medium text-gray-300">Abierto</td>
              <td className="[font-variant-numeric:tabular-nums] text-right font-semibold text-gray-100">{formatNumber(qty)}</td>
              <td></td>
              <td className="[font-variant-numeric:tabular-nums] text-right">{formatNumber(investedOpen)}</td>
              <td className="[font-variant-numeric:tabular-nums] text-right">{formatNumber(valueOpen)}</td>
              <td className={`[font-variant-numeric:tabular-nums] text-right ${unrealized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatNumber(unrealized)}</td>
              <td className="[font-variant-numeric:tabular-nums] text-right">{formatNumber((unrealized / (investedOpen || 1)) * 100, { maximumFractionDigits: 2 })}%</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4">
        <Link href="/cartera" className="text-blue-400 hover:underline">
          ← Volver a Cartera
        </Link>
      </div>
    </main>
  )
}
