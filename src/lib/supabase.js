import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ビルド時（Vercel環境変数が未設定の静的解析フェーズ）でも
// createClient が実行されないよう、有効なURLがある場合のみ初期化する。
// 実際のユーザー操作時はVercelに環境変数が設定されているため問題なし。
export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null

/* ステータスの定義（色・ラベル） */
export const STATUS_LIST = [
  { value: '入力中',   color: '#185fa5', bg: '#e6f1fb' },
  { value: '確認中',   color: '#b07d00', bg: '#fef9e7' },
  { value: '修正依頼', color: '#c0392b', bg: '#fdecea' },
  { value: '完成',     color: '#2d6a4f', bg: '#eaf3de' },
  { value: '納品済',   color: '#6c757d', bg: '#f0f0f0' },
]

export function getStatusStyle(status) {
  return STATUS_LIST.find(s => s.value === status) || { color: '#6c757d', bg: '#f0f0f0' }
}

/* 日付フォーマット */
export function fmtDate(iso) {
  if (!iso) return '-'
  return iso.slice(0, 10)
}

/* 和暦変換 */
export function toWareki(val) {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate()
  let era, yr
  if (y >= 2019)      { era = '令和'; yr = y - 2018 }
  else if (y >= 1989) { era = '平成'; yr = y - 1988 }
  else if (y >= 1926) { era = '昭和'; yr = y - 1925 }
  else                { era = '大正'; yr = y - 1911 }
  return `${era}${yr === 1 ? '元' : yr}年${m}月${day}日`
}
