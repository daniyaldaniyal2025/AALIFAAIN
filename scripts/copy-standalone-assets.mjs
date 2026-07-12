import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const standalone = join(root, '.next', 'standalone')
const standaloneNext = join(standalone, '.next')

if (!existsSync(standalone)) {
  console.error('Missing .next/standalone — next build did not produce a standalone output.')
  process.exit(1)
}

mkdirSync(standaloneNext, { recursive: true })

const staticSrc = join(root, '.next', 'static')
const publicSrc = join(root, 'public')

if (!existsSync(staticSrc)) {
  console.error('Missing .next/static')
  process.exit(1)
}

cpSync(staticSrc, join(standaloneNext, 'static'), { recursive: true })
console.log('Copied .next/static -> .next/standalone/.next/static')

if (existsSync(publicSrc)) {
  cpSync(publicSrc, join(standalone, 'public'), { recursive: true })
  console.log('Copied public -> .next/standalone/public')
}
