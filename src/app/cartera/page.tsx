import { promises as fs } from 'fs'
import path from 'path'
import Link from 'next/link'

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

export default async function CarteraPage() {
  const { holdings } = await getPortfolio()

  const formatQty = (n: number) =>
    n.toLocaleString('es-AR', { maximumFractionDigits: 6 })

  const totalQty = holdings.reduce((sum, h) => sum + h.quantity, 0)

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold">Cartera</h1>

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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {holdings.map((h) => (
              <tr
                key={h.ticker}
                className="odd:bg-gray-950 even:bg-gray-900/30 hover:bg-gray-800/50 transition-colors"
              >
                <td className="whitespace-nowrap font-medium text-gray-100">
                  <Link href={`/cartera/${encodeURIComponent(h.ticker)}`} className="hover:underline">
                    {h.ticker}
                  </Link>
                </td>
                <td className="text-gray-300">{h.name}</td>
                <td className="[font-variant-numeric:tabular-nums] text-right">{formatQty(h.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-800 bg-gray-900/40">
              <td colSpan={2} className="text-right font-medium text-gray-300">Total</td>
              <td className="[font-variant-numeric:tabular-nums] text-right font-semibold text-gray-100">{formatQty(totalQty)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </main>
  )
}
