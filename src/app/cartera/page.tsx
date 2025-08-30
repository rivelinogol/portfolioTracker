import { promises as fs } from 'fs'
import path from 'path'

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

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold">Cartera</h1>

      <div className="overflow-x-auto rounded-lg ring-1 ring-gray-800">
        <table className="table-dense w-full text-sm">
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
                <td className="whitespace-nowrap font-medium text-gray-100">{h.ticker}</td>
                <td className="text-gray-300">{h.name}</td>
                <td className="[font-variant-numeric:tabular-nums] text-right">{h.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

