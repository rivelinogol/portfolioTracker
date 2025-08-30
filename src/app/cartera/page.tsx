import { promises as fs } from 'fs'
import path from 'path'
import Row from './Row'

type Holding = {
  ticker: string
  name: string
  quantity: number
  avgCost: number
  currency: string
}

type Portfolio = {
  holdings: Holding[]
}

async function getPortfolio(): Promise<Portfolio> {
  const filePath = path.join(process.cwd(), 'public', 'data', 'portfolio.json')
  const file = await fs.readFile(filePath, 'utf8')
  return JSON.parse(file) as Portfolio
}

type Prices = { prices: Record<string, number> }

async function getPrices(): Promise<Prices> {
  const filePath = path.join(process.cwd(), 'public', 'data', 'prices.json')
  const file = await fs.readFile(filePath, 'utf8')
  return JSON.parse(file) as Prices
}

export default async function CarteraPage() {
  const [{ holdings }, { prices }] = await Promise.all([
    getPortfolio(),
    getPrices(),
  ])

  const formatQty = (n: number) =>
    n.toLocaleString('es-AR', { maximumFractionDigits: 6 })

  const formatMoney = (n: number, currency: string) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(n)

  const rows = holdings.map((h) => {
    const currentPrice = prices[h.ticker]
    const value = (currentPrice ?? 0) * h.quantity
    const invested = h.avgCost * h.quantity
    const pnl = value - invested
    const pnlPct = invested ? pnl / invested : 0
    return { h, currentPrice, value, invested, pnl, pnlPct }
  })

  const totals = rows.reduce(
    (acc, r) => {
      acc.qty += r.h.quantity
      acc.value += r.value
      acc.invested += r.invested
      acc.pnl += r.pnl
      return acc
    },
    { qty: 0, value: 0, invested: 0, pnl: 0 }
  )

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Cartera</h1>
        <a href="/movimientos" className="text-blue-400 hover:underline text-sm">Histórico de movimientos →</a>
      </div>

      <div className="overflow-x-auto rounded-lg ring-1 ring-gray-800">
        <table className="table-dense w-full text-[13px]">
          <thead>
            <tr className="text-left">
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300">
                Ticker
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300">
                Nombre
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">
                Cantidad
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">
                Valor
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">
                PnL
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">
                PnL %
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rows.map(({ h, value, pnl, pnlPct, currentPrice }) => (
              <Row
                key={h.ticker}
                ticker={h.ticker}
                name={h.name}
                quantity={h.quantity}
                currency={h.currency}
                value={value}
                pnl={pnl}
                pnlPct={pnlPct}
                currentPrice={currentPrice}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-800 bg-gray-900/40">
              <td colSpan={2} className="text-right font-medium text-gray-300">Total</td>
              <td className="[font-variant-numeric:tabular-nums] text-right font-semibold text-gray-100">{formatQty(totals.qty)}</td>
              <td className="[font-variant-numeric:tabular-nums] text-right font-semibold text-gray-100">{formatMoney(totals.value, 'USD')}</td>
              <td className={`[font-variant-numeric:tabular-nums] text-right font-semibold ${totals.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatMoney(totals.pnl, 'USD')}</td>
              <td className="[font-variant-numeric:tabular-nums] text-right font-semibold text-gray-100">{((totals.pnl / (totals.invested || 1)) * 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </main>
  )
}
