// 生成 data.json —— 重庆铜梁龙的赛季数据（赛程 + 比分 + 中超积分榜 + 战绩汇总）
//
// 数据源：FotMob 公开接口（非官方，免费、无需 key）
//   https://www.fotmob.com/api/data/teams?id=1477050
// 该接口没有 CORS 头，所以只能在构建时抓，浏览器里抓不到。
//
// 用法：node build-data.mjs
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const TEAM_ID = 1477050 // Chongqing Tongliang Long
const TEAM_EN = 'Chongqing Tongliang Long'
const H = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
  Accept: 'application/json',
}

/* 中超球队中文名（FotMob 用英文，这里做映射；没收录的回退英文） */
export const TEAM_CN = {
  'chongqing tongliang long': '重庆铜梁龙',
  'beijing guoan': '北京国安',
  'chengdu rongcheng fc': '成都蓉城',
  'dalian yingbo': '大连英博',
  'henan fc': '河南',
  'liaoning tieren': '辽宁铁人',
  'ningbo professional': '宁波',
  'qingdao hainiu': '青岛海牛',
  'qingdao west coast': '青岛西海岸',
  'shandong taishan': '山东泰山',
  'shanghai port': '上海海港',
  'shanghai shenhua': '上海申花',
  'shenzhen peng city': '深圳新鹏城',
  'tianjin jinmen tiger': '天津津门虎',
  'wuhan three towns': '武汉三镇',
  'yunnan yukun': '云南玉昆',
  'zhejiang professional': '浙江',
}

const COMP_CN = { 'super league': '中超', 'cup': '足协杯' }

const r = await fetch(`https://www.fotmob.com/api/data/teams?id=${TEAM_ID}`, { headers: H })
if (!r.ok) throw new Error(`拉取失败 HTTP ${r.status}`)
const j = await r.json()

const isMe = (n) => /Tongliang/i.test(n || '')

// ── 赛程 ─────────────────────────────────────────────────────────
const fixtures = j.fixtures?.allFixtures?.fixtures || []
const matches = fixtures
  .filter((f) => f.status?.utcTime)
  .map((f) => {
    const home = f.home?.name || ''
    const away = f.away?.name || ''
    const meHome = isMe(home)
    const finished = !!f.status?.finished
    const hs = finished ? Number(f.home?.score) : null
    const as = finished ? Number(f.away?.score) : null
    const gf = finished ? (meHome ? hs : as) : null
    const ga = finished ? (meHome ? as : hs) : null
    return {
      utc: f.status.utcTime,
      comp: 'SL',
      compName: COMP_CN[String(f.tournament?.name || '').toLowerCase()] || f.tournament?.name || '',
      home: meHome,
      opponent: meHome ? away : home,
      gf,
      ga,
      result: gf == null ? null : gf > ga ? 'W' : gf === ga ? 'D' : 'L',
      matchId: f.id,
    }
  })
  .sort((a, b) => a.utc.localeCompare(b.utc))

// ── 积分榜 ───────────────────────────────────────────────────────
const rawTable = j.table?.[0]?.data?.table?.all || []
const table = rawTable.map((r) => ({
  rank: r.idx,
  team: r.name,
  played: r.played,
  win: r.wins,
  draw: r.draws,
  loss: r.losses,
  gf: Number(String(r.scoresStr || '0-0').split('-')[0]),
  ga: Number(String(r.scoresStr || '0-0').split('-')[1]),
  pts: r.pts,
  id: r.id,
}))

// ── 赛季汇总 ─────────────────────────────────────────────────────
const played = matches.filter((m) => m.gf != null)
const league = played.filter((m) => m.compName === '中超')
const stat = (arr) => ({
  played: arr.length,
  win: arr.filter((m) => m.result === 'W').length,
  draw: arr.filter((m) => m.result === 'D').length,
  loss: arr.filter((m) => m.result === 'L').length,
  gf: arr.reduce((s, m) => s + m.gf, 0),
  ga: arr.reduce((s, m) => s + m.ga, 0),
})

const me = table.find((t) => /Tongliang/i.test(t.team))
const season = j.details?.latestSeason || new Date().getFullYear()

const out = {
  team: TEAM_EN,
  teamCn: '重庆铜梁龙',
  season: String(season),
  generatedAt: new Date().toISOString(),
  source: 'fotmob',
  // 赛季是否已结束：所有比赛都有比分
  seasonOver: matches.every((m) => m.gf != null),
  rank: me ? me.rank : null,
  leagueStats: stat(league),
  allStats: stat(played),
  matches,
  table,
}
writeFileSync(join(ROOT, 'data.json'), JSON.stringify(out, null, 1))

console.log(`data.json 已生成`)
console.log(`  赛季 ${out.season}｜比赛 ${matches.length} 场（中超 ${league.length}）`)
console.log(`  排名 第 ${out.rank} 名｜中超 ${out.leagueStats.win}胜${out.leagueStats.draw}平${out.leagueStats.loss}负 ${out.leagueStats.gf}-${out.leagueStats.ga}`)
console.log(`  赛季已结束: ${out.seasonOver}`)
