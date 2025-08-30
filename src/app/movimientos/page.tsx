import { promises as fs } from 'fs'
import path from 'path'
import Link from 'next/link'
import { filterAndSort } from '@/lib/filters.mjs'

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



export default async function MovimientosPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const [{ transactions }, { holdings }] = await Promise.all([
    readJson<Transactions>('data', 'transactions.json'),
    readJson<Portfolio>('data', 'portfolio.json'),
  ])

  const currencyByTicker = new Map(holdings.map((h) => [h.ticker, h.currency]))
  const nameByTicker = new Map(holdings.map((h) => [h.ticker, h.name]))

  const sp = (await searchParams) ?? {}

  // Definir rango temporal
  const todayISO = new Date().toISOString().slice(0, 10)
  const range = sp.range ?? 'all'
  const validISO = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined)
  const toParam = validISO(sp.to)
  const fromParam = validISO(sp.from)
  // Siempre anclar los presets a "hoy" si no se especifica `to`
  const toISO = toParam ?? todayISO
  const fromISO = fromParam ?? (
    range === 'ytd'
      ? `${new Date(toISO).getFullYear()}-01-01`
      : range === '1m'
        ? new Date(new Date(toISO).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : range === '3m'
          ? new Date(new Date(toISO).getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
          : range === '6m'
            ? new Date(new Date(toISO).getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
            : range === '1y'
              ? new Date(new Date(toISO).getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
              : '2010-01-01'
  )

  // Asegurar from <= to
  const fromDateRaw = new Date(fromISO + 'T00:00:00Z')
  const toDateRaw = new Date(toISO + 'T23:59:59Z')
  const fromDate = fromDateRaw <= toDateRaw ? fromDateRaw : new Date(toISO + 'T00:00:00Z')
  const toDate = fromDateRaw <= toDateRaw ? toDateRaw : new Date(fromISO + 'T23:59:59Z')


  // Filtrar y ordenar usando util reutilizable
  const rows = filterAndSort(transactions, holdings, {
    fromISO,
    toISO,
    ticker: sp.ticker,
    type: sp.type,
    qmin: sp.qmin,
    qmax: sp.qmax,
    pmin: sp.pmin,
    pmax: sp.pmax,
    amin: sp.amin,
    amax: sp.amax,
    sort: (sp.sort as any) || 'date',
    dir: (sp.dir as any) || 'desc',
  })

  const page = Number(sp.p ?? '1') || 1
  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const start = (page - 1) * pageSize
  const view = rows.slice(start, start + pageSize)

  // Helper para construir hrefs preservando filtros/orden
  function hrefWith(overrides: Record<string, string | undefined>) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (v) qs.set(k, v)
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === '') qs.delete(k)
      else qs.set(k, v)
    }
    return `/movimientos?${qs.toString()}`
  }

  type SortKey = 'date' | 'ticker' | 'type' | 'quantity' | 'price' | 'amount'
  const sortKey: SortKey = (sp.sort as SortKey) || 'date'
  const dir = sp.dir === 'asc' ? 'asc' : 'desc'
  const sortArrow = (key: SortKey) => (sortKey === key ? (dir === 'asc' ? ' ▲' : ' ▼') : '')

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Movimientos</h1>
        <Link href="/cartera" className="text-blue-400 hover:underline text-sm">← Volver a Cartera</Link>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <form id="filters" className="flex flex-wrap gap-2 items-end text-sm" method="get" action="/movimientos">
          <input type="hidden" name="p" value="1" />
          <div className="flex flex-col">
            <label className="text-xs text-gray-400" htmlFor="ticker">Ticker/Nombre</label>
            <input id="ticker" name="ticker" defaultValue={sp.ticker ?? ''} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-gray-100" placeholder="AAPL" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-400" htmlFor="type">Tipo</label>
            <select id="type" name="type" defaultValue={sp.type ?? ''} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-gray-100">
              <option value="">Todos</option>
              <option value="buy">buy</option>
              <option value="sell">sell</option>
              <option value="dividend">dividend</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-400" htmlFor="from">Desde</label>
            <input id="from" name="from" type="date" defaultValue={sp.from ?? ''} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-gray-100" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-400" htmlFor="to">Hasta</label>
            <input id="to" name="to" type="date" defaultValue={sp.to ?? ''} className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-gray-100" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-400" htmlFor="qmin">Qty min</label>
            <input id="qmin" name="qmin" type="number" step="any" defaultValue={sp.qmin ?? ''} className="w-24 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-gray-100" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-400" htmlFor="qmax">Qty max</label>
            <input id="qmax" name="qmax" type="number" step="any" defaultValue={sp.qmax ?? ''} className="w-24 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-gray-100" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-400" htmlFor="pmin">Precio min</label>
            <input id="pmin" name="pmin" type="number" step="any" defaultValue={sp.pmin ?? ''} className="w-28 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-gray-100" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-400" htmlFor="pmax">Precio max</label>
            <input id="pmax" name="pmax" type="number" step="any" defaultValue={sp.pmax ?? ''} className="w-28 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-gray-100" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-400" htmlFor="amin">Importe min</label>
            <input id="amin" name="amin" type="number" step="any" defaultValue={sp.amin ?? ''} className="w-28 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-gray-100" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-400" htmlFor="amax">Importe max</label>
            <input id="amax" name="amax" type="number" step="any" defaultValue={sp.amax ?? ''} className="w-28 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-gray-100" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded border border-gray-700 px-2 py-1 text-sm hover:bg-gray-800 text-gray-300">Filtrar</button>
            <a href="/movimientos" className="rounded border border-gray-700 px-2 py-1 text-sm hover:bg-gray-800 text-gray-300">Limpiar</a>
          </div>
        </form>

        <div className="flex items-center gap-2 text-sm text-gray-300">
          <span className="text-gray-400">Período:</span>
          <form method="get" action="/movimientos" className="contents">
            <input type="hidden" name="p" value="1" />
            {/* Mantener los valores ya tipeados al usar presets */}
            <input type="hidden" name="ticker" value={sp.ticker ?? ''} />
            <input type="hidden" name="type" value={sp.type ?? ''} />
            <input type="hidden" name="from" value={sp.from ?? ''} />
            <input type="hidden" name="to" value={sp.to ?? ''} />
            <input type="hidden" name="qmin" value={sp.qmin ?? ''} />
            <input type="hidden" name="qmax" value={sp.qmax ?? ''} />
            <input type="hidden" name="pmin" value={sp.pmin ?? ''} />
            <input type="hidden" name="pmax" value={sp.pmax ?? ''} />
            <input type="hidden" name="amin" value={sp.amin ?? ''} />
            <input type="hidden" name="amax" value={sp.amax ?? ''} />
            <button name="range" value="1m" className={`rounded border border-gray-700 px-2 py-1 ${range==='1m'?'bg-gray-800 text-gray-100':'hover:bg-gray-800 text-gray-300'}`}>1M</button>
            <button name="range" value="3m" className={`rounded border border-gray-700 px-2 py-1 ${range==='3m'?'bg-gray-800 text-gray-100':'hover:bg-gray-800 text-gray-300'}`}>3M</button>
            <button name="range" value="6m" className={`rounded border border-gray-700 px-2 py-1 ${range==='6m'?'bg-gray-800 text-gray-100':'hover:bg-gray-800 text-gray-300'}`}>6M</button>
            <button name="range" value="1y" className={`rounded border border-gray-700 px-2 py-1 ${range==='1y'?'bg-gray-800 text-gray-100':'hover:bg-gray-800 text-gray-300'}`}>1Y</button>
            <button name="range" value="ytd" className={`rounded border border-gray-700 px-2 py-1 ${range==='ytd'?'bg-gray-800 text-gray-100':'hover:bg-gray-800 text-gray-300'}`}>YTD</button>
            <button name="range" value="all" className={`rounded border border-gray-700 px-2 py-1 ${range==='all'&&!sp.from&&!sp.to?'bg-gray-800 text-gray-100':'hover:bg-gray-800 text-gray-300'}`}>Todo</button>
            <button name="to" value={todayISO} className="ml-2 rounded border border-gray-700 px-2 py-1 hover:bg-gray-800 text-gray-300">Hoy</button>
          </form>
          <span className="ml-2 text-gray-500">{fromISO} → {toISO}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg ring-1 ring-gray-800">
        <table className="table-dense w-full text-[13px]">
          <thead>
            <tr className="text-left">
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300">
                <Link href={hrefWith({ sort: 'date', dir: (sp.sort === 'date' && sp.dir === 'asc') ? 'desc' : 'asc', p: '1' })} className="hover:underline">Fecha{sortArrow('date')}</Link>
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300">
                <Link href={hrefWith({ sort: 'ticker', dir: (sp.sort === 'ticker' && sp.dir === 'asc') ? 'desc' : 'asc', p: '1' })} className="hover:underline">Ticker{sortArrow('ticker')}</Link>
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300">
                <Link href={hrefWith({ sort: 'type', dir: (sp.sort === 'type' && sp.dir === 'asc') ? 'desc' : 'asc', p: '1' })} className="hover:underline">Tipo{sortArrow('type')}</Link>
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">
                <Link href={hrefWith({ sort: 'quantity', dir: (sp.sort === 'quantity' && sp.dir === 'asc') ? 'desc' : 'asc', p: '1' })} className="hover:underline">Cantidad{sortArrow('quantity')}</Link>
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">
                <Link href={hrefWith({ sort: 'price', dir: (sp.sort === 'price' && sp.dir === 'asc') ? 'desc' : 'asc', p: '1' })} className="hover:underline">Precio{sortArrow('price')}</Link>
              </th>
              <th className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 font-medium text-gray-300 text-right">
                <Link href={hrefWith({ sort: 'amount', dir: (sp.sort === 'amount' && sp.dir === 'asc') ? 'desc' : 'asc', p: '1' })} className="hover:underline">Importe{sortArrow('amount')}</Link>
              </th>
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-sm text-gray-400">
        <span> Página {page} de {totalPages} </span>
        <div className="ml-2 flex gap-2">
          <Link className={`rounded border border-gray-700 px-2 py-1 ${page <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-gray-800 text-gray-300'}`} href={hrefWith({ p: String(Math.max(1, page - 1)) })}>« Prev</Link>
          <Link className={`rounded border border-gray-700 px-2 py-1 ${page >= totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-gray-800 text-gray-300'}`} href={hrefWith({ p: String(Math.min(totalPages, page + 1)) })}>Next »</Link>
        </div>
      </div>
    </main>
  )
}
