import { aggregateBy, correlationMatrix, readJson, type History, type Metadata, type Portfolio, type Prices } from '@/lib/analytics'

export default async function AnalisisPage() {
  const [{ holdings }, { prices }, { metadata }] = await Promise.all([
    readJson<Portfolio>('data', 'portfolio.json'),
    readJson<Prices>('data', 'prices.json'),
    readJson<Metadata>('data', 'metadata.json'),
  ])

  let history: History | null = null
  try {
    history = await readJson<History>('data', 'history.json')
  } catch {
    history = null
  }

  const groups = [
    { key: 'sector' as const, title: 'Por sector' },
    { key: 'country' as const, title: 'Por país' },
    { key: 'currency' as const, title: 'Por moneda' },
  ]

  const groupData = groups.map((g) => ({ ...g, data: aggregateBy(holdings, prices, metadata, g.key) }))

  const tickers = holdings.map((h) => h.ticker)
  const corr = history ? correlationMatrix(history.history, tickers) : []
  const haveCorr = corr.length > 0

  const fmtPct = (x: number) => (x * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + '%'

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Análisis</h1>
        <a href="/cartera" className="text-blue-400 hover:underline text-sm">← Volver a Cartera</a>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {groupData.map(({ title, data }) => (
          <section key={title} className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
            <h2 className="mb-2 text-sm font-medium text-gray-200">{title}</h2>
            <div className="grid grid-cols-2 gap-2">
              {data.rows.map((r) => (
                <div key={r.key} className="rounded p-2 text-xs text-gray-100"
                  style={{
                    background: `linear-gradient(180deg, rgba(16,185,129,0.15) ${Math.round(r.weight*100)}%, rgba(17,24,39,0.6) 0)`,
                    border: '1px solid rgb(31 41 55)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 truncate mr-2" title={r.key}>{r.key}</span>
                    <span className="[font-variant-numeric:tabular-nums] font-semibold">{fmtPct(r.weight)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-6 rounded-lg border border-gray-800 bg-gray-900/40 p-3">
        <h2 className="mb-2 text-sm font-medium text-gray-200">Correlaciones</h2>
        {!haveCorr && (
          <div className="text-sm text-gray-400">
            Para ver correlaciones, agregá históricos en <code className="text-gray-300">public/data/history.json</code> con el formato:
            <pre className="mt-2 whitespace-pre-wrap rounded bg-gray-950/50 p-2 text-[11px] text-gray-300 border border-gray-800">{`{
  "history": {
    "SPY": [ { "date": "2024-01-01", "close": 470 }, ... ],
    "UNH": [ { "date": "2024-01-01", "close": 505 }, ... ]
  }
}`}</pre>
          </div>
        )}
        {haveCorr && (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left">
                  <th className="text-gray-300">Pair</th>
                  <th className="text-right text-gray-300">r</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {corr.map((c) => (
                  <tr key={`${c.a}-${c.b}`} className="odd:bg-gray-950 even:bg-gray-900/30">
                    <td className="text-gray-300">{c.a}—{c.b}</td>
                    <td className="[font-variant-numeric:tabular-nums] text-right font-semibold"
                      style={{ color: c.r === null ? '#9CA3AF' : (c.r >= 0 ? 'rgb(52 211 153)' : 'rgb(248 113 113)') }}
                    >
                      {c.r === null ? 'N/D' : c.r.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
