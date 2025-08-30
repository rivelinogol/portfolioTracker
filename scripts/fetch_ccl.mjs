#!/usr/bin/env node
// Descarga serie histórica CCL desde Ámbito y guarda en public/data/ccl.json
import fs from 'node:fs/promises'
import path from 'node:path'

function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseNumberAR(s) {
  if (typeof s === 'number') return s
  if (!s) return NaN
  return Number(String(s).replace(/\./g, '').replace(',', '.'))
}

function toDMY(date) {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}-${m}-${y}`
}

async function fetchRange(fromISO, toISO) {
  // Intenta ISO (yyyy-mm-dd) y si falla prueba dd-mm-yyyy
  const urls = [
    `https://mercados.ambito.com/dolarrava/cl/historico-general/${fromISO}/${toISO}`,
    (() => {
      const f = toDMY(new Date(fromISO))
      const t = toDMY(new Date(toISO))
      return `https://mercados.ambito.com/dolarrava/cl/historico-general/${f}/${t}`
    })(),
  ]
  let lastErr
  for (const url of urls) {
    const res = await fetch(url, { headers: { accept: 'application/json, text/plain, */*' } })
    if (!res.ok) { lastErr = new Error(`HTTP ${res.status} for ${url}`); continue }
    const data = await res.json()
    const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
    if (!Array.isArray(rows) || rows.length === 0) return []
    const startIdx = Array.isArray(rows[0]) && rows[0][0] === 'Fecha' ? 1 : 0
    return rows.slice(startIdx).map((r) => ({ date: r[0], value: parseNumberAR(r[1]) }))
      .filter((x) => x.date && Number.isFinite(x.value))
  }
  throw lastErr || new Error('Failed to fetch range')
}

async function fetchAmbitoCCL(from, to) {
  // Para evitar 500, pedimos por año
  const start = new Date(from)
  const end = new Date(to)
  const out = []
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    const fromY = `${y}-01-01`
    const toY = `${y}-12-31`
    const part = await fetchRange(fromY, toY).catch(() => [])
    out.push(...part)
  }
  // Filtra por el to real
  return out.filter((p) => new Date(p.date) <= end)
}

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const [from = '2010-01-01', to = toISO(new Date())] = args.filter((a) => !a.startsWith('--'))
  const outPath = path.join(process.cwd(), 'public', 'data', 'ccl.json')

  // Si ya existe y no se fuerza, no volver a descargar
  try {
    if (!force) {
      await fs.access(outPath)
      console.log(`Skip: ${outPath} ya existe. Usa --force para regenerar.`)
      return
    }
  } catch (_) {
    // no existe, continuamos
  }

  const series = await fetchAmbitoCCL(from, to)
  const out = {
    source: 'Ambito - dolarrava/cl historico-general',
    updatedAt: toISO(new Date()),
    from,
    to,
    series,
  }
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8')
  console.log(`Saved ${series.length} rows to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
