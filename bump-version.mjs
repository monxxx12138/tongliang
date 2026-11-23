// 把 sw.js 里的缓存版本号 +1（GitHub Actions 每次自动更新时调用）
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const file = join(ROOT, 'sw.js')
const before = readFileSync(file, 'utf8')
const after = before.replace(/tll-v(\d+)/, (_, n) => `tll-v${Number(n) + 1}`)

if (after === before) {
  console.log('没找到版本号，跳过')
} else {
  writeFileSync(file, after)
  console.log('版本号：', after.match(/tll-v\d+/)[0])
}
