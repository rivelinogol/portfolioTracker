import { promises as fs } from 'fs'
import path from 'path'
import Link from 'next/link'

type Tx = {
  ticker: string
  date: string // ISO yyyy-mm-dd
  quantity: number
  price: number
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

  const totals = txs.reduce(
    (acc, t) => {
      const invested = t.quantity * t.price + (t.fees ?? 0)
      const value = t.quantity * currentPrice
      const pnl = value - invested
      acc.qty += t.quantity
      acc.invested += invested
      acc.value += value
      acc.pnl += pnl
      return acc
    },
    { qty: 0, invested: 0, value: 0, pnl: 0 }
  )

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-2 flex items-baseline gap-3">
        <h1 className="text-lg font-semibold">{ticker}</h1>
        {currentPrice != null && (
          <span className="text-sm text-gray-400">Precio actual: {formatNumber(currentPrice)}</span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg ring-1 ring-gray-800">
        <table className="table-dense w-full text-[13px]">
          <thead>
            <tr className="text-left">
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300">
                Fecha
              </th>
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
            {txs.map((t, i) => {
              const invested = t.quantity * t.price + (t.fees ?? 0)
              const value = t.quantity * currentPrice
              const pnl = value - invested
              const pnlPct = invested ? pnl / invested : 0
              return (
                <tr key={`${t.date}-${i}`} className="odd:bg-gray-950 even:bg-gray-900/30 hover:bg-gray-800/50 transition-colors">
                  <td className="text-gray-300 whitespace-nowrap">{t.date}</td>
                  <td className="[font-variant-numeric:tabular-nums] text-right">{formatNumber(t.quantity)}</td>
                  <td className="[font-variant-numeric:tabular-nums] text-right">{formatNumber(t.price)}</td>
                  <td className="[font-variant-numeric:tabular-nums] text-right">{formatNumber(invested)}</td>
                  <td className="[font-variant-numeric:tabular-nums] text-right">{formatNumber(value)}</td>
                  <td className="[font-variant-numeric:tabular-nums] text-right {pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}">{formatNumber(pnl)}</td>
                  <td className="[font-variant-numeric:tabular-nums] text-right {pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}">{formatNumber(pnlPct * 100, { maximumFractionDigits: 2 })}%</td>
                  <td className="[font-variant-numeric:tabular-nums] text-right">{daysBetween(t.date)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-800 bg-gray-900/40">
              <td className="text-right font-medium text-gray-300">Totales</td>
              <td className="[font-variant-numeric:tabular-nums] text-right font-semibold text-gray-100">{formatNumber(totals.qty)}</td>
              <td></td>
              <td className="[font-variant-numeric:tabular-nums] text-right">{formatNumber(totals.invested)}</td>
              <td className="[font-variant-numeric:tabular-nums] text-right">{formatNumber(totals.value)}</td>
              <td className="[font-variant-numeric:tabular-nums] text-right {totals.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}">{formatNumber(totals.pnl)}</td>
              <td className="[font-variant-numeric:tabular-nums] text-right">{formatNumber((totals.pnl / (totals.invested || 1)) * 100, { maximumFractionDigits: 2 })}%</td>
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

