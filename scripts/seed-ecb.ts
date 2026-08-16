import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import postgres from 'postgres'
import { createRateDatabase } from '../app/lib/db'
import { parseEcbXmlAt } from '../app/lib/sources/ecb'

const exec = promisify(execFile)
const path = process.argv[2]
if (!path) throw new Error('Usage: bun run scripts/seed-ecb.ts <ECB ZIP or XML>')
const xml = path.endsWith('.zip')
  ? (await exec('unzip', ['-p', path])).stdout
  : await readFile(path, 'utf8')
const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required')
const sql = postgres(url)
try {
  const rows = parseEcbXmlAt(xml, 'ecb.europa.eu', new Date().toISOString())
  await createRateDatabase(sql).upsertRates(rows)
  console.log(`seeded ${rows.length} rates`)
} finally {
  await sql.end()
}
