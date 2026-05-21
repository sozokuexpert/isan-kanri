'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase, getStatusStyle, STATUS_LIST, fmtDate } from '@/lib/supabase'
import AuthGuard from '@/components/AuthGuard'

/* ---- ページ本体（AuthGuardでラップ） ---- */
export default function CasesPage() {
  return (
    <AuthGuard>
      {(profile) => <CasesContent me={profile} />}
    </AuthGuard>
  )
}

function CasesContent({ me }) {
  const [cases,   setCases]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [statusF, setStatusF] = useState('')
  const [stats,   setStats]   = useState({})
  const [toast,   setToast]   = useState(null)
  const [delId,   setDelId]   = useState(null)
  const [delName, setDelName] = useState('')

  /* ---- データ取得 ---- */
  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('cases')
      .select('id,deceased_name,doc_date,status,assigned_to,created_at,updated_at')
      .order('updated_at', { ascending: false })
      .limit(200)

    if (statusF) q = q.eq('status', statusF)
    if (search)  q = q.ilike('deceased_name', `%${search}%`)

    const { data, error } = await q
    setLoading(false)
    if (error) { showToast('読み込みエラー: ' + error.message, 'error'); return }
    setCases(data || [])
  }, [search, statusF])

  /* ---- 統計 ---- */
  const loadStats = useCallback(async () => {
    const { data } = await supabase.from('cases').select('status')
    if (!data) return
    const s = {}
    data.forEach(r => { s[r.status] = (s[r.status] || 0) + 1 })
    s['合計'] = data.length
    setStats(s)
  }, [])

  useEffect(() => { load(); loadStats() }, [load, loadStats])

  /* ---- ステータスクイック変更 ---- */
  const changeStatus = async (e, id) => {
    e.stopPropagation()
    const { error } = await supabase
      .from('cases')
      .update({ status: e.target.value, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { showToast('更新失敗', 'error'); return }
    showToast('ステータスを更新しました', 'success')
    load(); loadStats()
  }

  /* ---- 削除 ---- */
  const handleDelete = async () => {
    if (!delId) return
    const { error } = await supabase.from('cases').delete().eq('id', delId)
    setDelId(null)
    if (error) { showToast('削除失敗: ' + error.message, 'error'); return }
    showToast('案件を削除しました', 'success')
    load(); loadStats()
  }

  /* ---- ログアウト ---- */
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <>
      {/* ナビゲーション */}
      <nav className="nav">
        <div className="nav-brand">
          📋 遺産分割協議書
          <span>案件管理システム</span>
        </div>
        <div className="nav-links">
          <Link href="/cases" className="nav-link active">案件一覧</Link>
          {me.role === 'admin' && (
            <Link href="/admin" className="nav-link">ユーザー管理</Link>
          )}
          <a
            href="https://sozokuexpert.github.io/isanbunkatsu-app/"
            target="_blank" rel="noopener noreferrer"
            className="nav-link"
          >
            ✏ 協議書作成アプリ
          </a>
          <button
            onClick={handleLogout}
            style={{
              background: 'none', border: '.5px solid var(--border2)',
              borderRadius: 6, padding: '5px 10px',
              fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
            }}
          >
            ログアウト
          </button>
        </div>
      </nav>

      <div className="page">
        <div className="page-header">
          <div>
            <div className="page-title">案件一覧</div>
            <div className="page-subtitle">
              全 {stats['合計'] || 0} 件　／　
              ログイン中: {me.name || me.email}（
              {me.role === 'admin' ? '管理者' : me.role === 'staff' ? '事務局' : '協力企業'}
              ）
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div className="stats-grid">
          {STATUS_LIST.map(s => (
            <div
              key={s.value}
              className="stat-card"
              style={{ cursor: 'pointer', borderColor: statusF === s.value ? s.color : '' }}
              onClick={() => setStatusF(prev => prev === s.value ? '' : s.value)}
            >
              <div className="stat-num" style={{ color: s.color }}>
                {stats[s.value] || 0}
              </div>
              <div className="stat-label">{s.value}</div>
            </div>
          ))}
        </div>

        {/* テーブル */}
        <div className="card">
          <div className="filter-bar">
            <input
              type="text"
              placeholder="🔍 被相続人名で検索..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
            />
            <select value={statusF} onChange={e => setStatusF(e.target.value)}>
              <option value="">全ステータス</option>
              {STATUS_LIST.map(s => (
                <option key={s.value} value={s.value}>{s.value}</option>
              ))}
            </select>
            <button className="btn" onClick={load}>検索</button>
            <button className="btn" onClick={() => { setSearch(''); setStatusF('') }}>
              リセット
            </button>
          </div>

          <div className="table-wrap">
            {loading ? (
              <div className="loading">読み込み中...</div>
            ) : cases.length === 0 ? (
              <div className="empty-state">
                <p>案件がありません</p>
                <a
                  href="https://sozokuexpert.github.io/isanbunkatsu-app/"
                  target="_blank" rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  協議書作成アプリで案件を作成
                </a>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>被相続人</th>
                    <th>ステータス</th>
                    <th>担当者</th>
                    <th>作成日</th>
                    <th>更新日</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => {
                    const st = getStatusStyle(c.status)
                    return (
                      <tr key={c.id} onClick={() => window.location.href = `/cases/${c.id}`}>
                        <td style={{ fontWeight: 500 }}>{c.deceased_name || '-'}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <select
                            value={c.status || '入力中'}
                            onChange={e => changeStatus(e, c.id)}
                            style={{
                              background: st.bg, color: st.color,
                              border: `1px solid ${st.color}`,
                              borderRadius: 10, padding: '3px 8px',
                              fontSize: 11, fontWeight: 500, cursor: 'pointer',
                            }}
                          >
                            {STATUS_LIST.map(s => (
                              <option key={s.value} value={s.value}>{s.value}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ color: 'var(--text2)' }}>{c.assigned_to || '-'}</td>
                        <td style={{ color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {fmtDate(c.created_at)}
                        </td>
                        <td style={{ color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {fmtDate(c.updated_at)}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                          onClick={e => e.stopPropagation()}>
                          <Link href={`/cases/${c.id}`} className="btn btn-sm"
                            style={{ marginRight: 6 }}>
                            詳細
                          </Link>
                          {(me.role === 'admin') && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => { setDelId(c.id); setDelName(c.deceased_name) }}
                            >
                              削除
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {delId && (
        <div className="modal-overlay" onClick={() => setDelId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDelId(null)}>×</button>
            <h2>案件を削除しますか？</h2>
            <p style={{ color: 'var(--text2)', marginBottom: 8 }}>
              「{delName}」の案件を削除します。この操作は取り消せません。
            </p>
            <div className="modal-footer">
              <button className="btn" onClick={() => setDelId(null)}>キャンセル</button>
              <button className="btn btn-danger" onClick={handleDelete}>削除する</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </>
  )
}
