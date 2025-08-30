"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type RowProps = {
  ticker: string
  name: string
  quantity: number
  currency: string
  value: number
  pnl: number
  pnlPct: number
}

type Tx = {
  ticker: string
  date: string
  type: "buy" | "sell" | "dividend"
  quantity?: number
  price?: number
  cash?: number
  fees?: number
}

export default function Row(props: RowProps) {
  const { ticker, name, quantity, currency, value, pnl, pnlPct } = props
  const [open, setOpen] = useState(false)
  const [txs, setTxs] = useState<Tx[] | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 5

  const fmtQty = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 6 })
  const fmtMoney = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(n)

  useEffect(() => {
    if (!open || txs) return
    fetch("/data/transactions.json")
      .then((r) => r.json())
      .then((data: { transactions: Tx[] }) => {
        const list = data.transactions
          .filter((t) => t.ticker === ticker)
          .sort((a, b) => (a.date < b.date ? 1 : -1))
        setTxs(list)
      })
      .catch(() => setTxs([]))
  }, [open, txs, ticker])

  const totalPages = useMemo(() => {
    return txs ? Math.max(1, Math.ceil(txs.length / pageSize)) : 1
  }, [txs])

  const view = useMemo(() => {
    if (!txs) return []
    const start = (page - 1) * pageSize
    return txs.slice(start, start + pageSize)
  }, [txs, page])

  return (
    <>
      <tr className="odd:bg-gray-950 even:bg-gray-900/30 hover:bg-gray-800/50 transition-colors">
        <td className="whitespace-nowrap font-medium text-gray-100">
          <Link href={`/cartera/${encodeURIComponent(ticker)}`} className="hover:underline">
            {ticker}
          </Link>
        </td>
        <td className="text-gray-300">{name}</td>
        <td className="[font-variant-numeric:tabular-nums] text-right">{fmtQty(quantity)}</td>
        <td className="[font-variant-numeric:tabular-nums] text-right">{fmtMoney(value)}</td>
        <td className={`[font-variant-numeric:tabular-nums] text-right ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtMoney(pnl)}</td>
        <td className={`[font-variant-numeric:tabular-nums] text-right ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{(pnlPct * 100).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%</td>
        <td className="text-right">
          <button
            type="button"
            aria-label="Ver movimientos"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-md px-2 py-1 text-gray-300 hover:bg-gray-800/60 hover:text-gray-100"
          >
            ⋯
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="px-3 pb-3 pt-2 bg-gray-900/40">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">Movimientos de {ticker}</div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded border border-gray-700 px-2 py-0.5 text-xs text-gray-300 hover:bg-gray-800"
                    disabled={!txs || page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    « Prev
                  </button>
                  <span className="text-xs text-gray-400">
                    {page}/{totalPages}
                  </span>
                  <button
                    className="rounded border border-gray-700 px-2 py-0.5 text-xs text-gray-300 hover:bg-gray-800"
                    disabled={!txs || page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next »
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left">
                      <th className="text-gray-300">Fecha</th>
                      <th className="text-gray-300">Tipo</th>
                      <th className="text-right text-gray-300">Cantidad</th>
                      <th className="text-right text-gray-300">Precio</th>
                      <th className="text-right text-gray-300">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {view.map((t, i) => {
                      const qty = t.quantity ?? 0
                      const price = t.price ?? 0
                      const amount = t.type === "dividend" ? (t.cash ?? 0) : qty * price
                      return (
                        <tr key={`${t.date}-${i}`} className="odd:bg-gray-950 even:bg-gray-900/30">
                          <td className="text-gray-300 whitespace-nowrap">{t.date}</td>
                          <td className="text-gray-300 uppercase">{t.type}</td>
                          <td className="[font-variant-numeric:tabular-nums] text-right">{qty ? fmtQty(qty) : "-"}</td>
                          <td className="[font-variant-numeric:tabular-nums] text-right">{price ? fmtMoney(price) : "-"}</td>
                          <td className="[font-variant-numeric:tabular-nums] text-right">{fmtMoney(amount)}</td>
                        </tr>
                      )
                    })}
                    {!txs && (
                      <tr>
                        <td colSpan={5} className="text-center py-3 text-gray-400">Cargando…</td>
                      </tr>
                    )}
                    {txs && txs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-3 text-gray-400">Sin movimientos</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

