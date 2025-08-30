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

async function getTransactions(): Promise<Transactions> {
  const filePath = path.join(process.cwd(), 'public', 'data', 'transactions.json')
  const file = await fs.readFile(filePath, 'utf8')
  return JSON.parse(file) as Transactions
}

export default async function CarteraPage() {
  const [{ holdings }, { prices }, { transactions }] = await Promise.all([
    getPortfolio(),
    getPrices(),
    getTransactions(),
  ])

  const formatQty = (n: number) =>
    n.toLocaleString('es-AR', { maximumFractionDigits: 6 })

  const formatMoney = (n: number, currency: string) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(n)

  // Reconstruir qty abierta, avgCost y PnL realizado por ticker a partir de transacciones
  type State = { qty: number; avgCost: number; realized: number }
  const state = new Map<string, State>()
  const ascTx = [...transactions].sort((a, b) => (a.date < b.date ? -1 : 1))
  for (const t of ascTx) {
    const s = state.get(t.ticker) ?? { qty: 0, avgCost: 0, realized: 0 }
    const q = t.quantity ?? 0
    const p = t.price ?? 0
    const fees = t.fees ?? 0
    if (t.type === 'buy') {
      const totalCost = s.avgCost * s.qty + q * p + fees
      s.qty += q
      s.avgCost = s.qty > 0 ? totalCost / s.qty : 0
    } else if (t.type === 'sell') {
      const pnl = (p - s.avgCost) * q - fees
      s.realized += pnl
      s.qty = Math.max(0, s.qty - q)
      // avgCost se mantiene para la posición restante
    } else if (t.type === 'dividend') {
      const cash = t.cash ?? 0
      s.realized += cash
    }
    state.set(t.ticker, s)
  }

  const rows = holdings.map((h) => {
    const s = state.get(h.ticker)
    const qty = s ? s.qty : h.quantity
    const avgCost = s ? s.avgCost : h.avgCost
    const realized = s ? s.realized : 0
    const currentPrice = prices[h.ticker]
    const value = (currentPrice ?? 0) * qty
    const invested = avgCost * qty
    const pnlUnreal = value - invested
    const pnl = realized + pnlUnreal
    const pnlPct = invested ? pnlUnreal / (invested || 1) : 0
    return { h: { ...h, quantity: qty, avgCost }, currentPrice, value, invested, pnl, pnlPct, realized, unrealized: pnlUnreal }
  })

  const totals = rows.reduce(
    (acc, r) => {
      acc.qty += r.h.quantity
      acc.value += r.value
      acc.invested += r.invested
      acc.pnl += r.pnl
      acc.realized += r.realized
      acc.unrealized += r.unrealized
      return acc
    },
    { qty: 0, value: 0, invested: 0, pnl: 0, realized: 0, unrealized: 0 }
  )

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Cartera</h1>
        <div className="flex items-center gap-3">
          <a href="/analisis" className="text-blue-400 hover:underline text-sm">Análisis</a>
          <a href="/movimientos" className="text-blue-400 hover:underline text-sm">Histórico de movimientos →</a>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
          <div className="text-xs text-gray-400">PnL realizado</div>
          <div className={`mt-1 text-lg [font-variant-numeric:tabular-nums] ${totals.realized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatMoney(totals.realized, 'USD')}</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
          <div className="text-xs text-gray-400">PnL no realizado</div>
          <div className={`mt-1 text-lg [font-variant-numeric:tabular-nums] ${totals.unrealized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatMoney(totals.unrealized, 'USD')}</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
          <div className="text-xs text-gray-400">PnL total</div>
          <div className={`mt-1 text-lg [font-variant-numeric:tabular-nums] ${(totals.realized + totals.unrealized) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatMoney(totals.realized + totals.unrealized, 'USD')}</div>
        </div>
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
            {rows.map(({ h, value, pnl, pnlPct, currentPrice, realized, unrealized }) => (
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
                realized={realized}
                unrealized={unrealized}
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
