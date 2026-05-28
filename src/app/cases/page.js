'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase, getStatusStyle, STATUS_LIST, fmtDate } from '@/lib/supabase'
import AuthGuard from '@/components/AuthGuard'

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

  const loadStats = useCallback(async () => {
    const { data } = await supabase.from('cases').select('status')
    if (!data) return
    const s = {}
    data.forEach(r => { s[r.status] = (s[r.status] || 0) + 1 })
    s['合計'] = data.length
    setStats(s)
  }, [])

  useEffect(() => { load(); loadStats() }, [load, loadStats])

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

  const handleDelete = async () => {
    if (!delId) return
    const { error } = await supabase.from('cases').delete().eq('id', delId)
    setDelId(null)
    if (error) { showToast('削除失敗: ' + error.message, 'error'); return }
    showToast('案件を削除しました', 'success')
    load(); loadStats()
  }

  const handleLogout = async () => { await supabase.auth.signOut() }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <>
      <nav style={{
        background: '#fff',
        borderBottom: '.5px solid rgba(0,0,0,.12)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        fontFamily: '"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif'
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          📋 遺産分割協議書
          <span style={{ fontSize: 11, color: '#9a9a94', fontWeight: 400 }}>案件管理システム</span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Link href="/cases" style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 13,
            color: '#185fa5', background: '#e6f1fb',
            textDecoration: 'none', fontWeight: 500
          }}>案件一覧</Link>

          {me && me.role === 'admin' && (
            <Link href="/admin" style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 13,
              color: '#5a5a56', textDecoration: 'none'
            }}>ユーザー管理</Link>
          )}

          <a href="https://sozokuexpert.github.io/isanbunkatsu-app/"
            target="_blank" rel="noopener noreferrer"
            style={{ padding: '6px 12px', borderRadius: 6, fontSize: 13, color: '#5a5a56', textDecoration: 'none' }}>
            ✏ 協議書作成アプリ
          </a>
          <button onClick={handleLogout} style={{
            background: 'none', border: '.5px solid rgba(0,0,0,.2)',
            borderRadius: 6, padding: '5px 10px',
            fontSize: 12, color: '#5a5a56', cursor: 'pointer'
          }}>ログアウト</button>
        </div>
      </nav>

      <div style={{
        padding: 24, maxWidth: 1200, margin: '0 auto',
        fontFamily: '"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif'
      }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>案件一覧</div>
          <div style={{ fontSize: 12, color: '#9a9a94', marginTop: 2 }}>
            全 {stats['合計'] || 0} 件　／　
            ログイン中: {me && (me.name || me.email)}（
            {me && me.role === 'admin' ? '管理者' : me && me.role === 'staff' ? '事務局' : '協力企業'}
            ）
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
          {STATUS_LIST.map(s => (
            <div key={s.value}
              onClick={() => setStatusF(prev => prev === s.value ? '' : s.value)}
              style={{
                background: '#fff', border: `.5px solid ${statusF === s.value ? s.color : 'rgba(0,0,0,.12)'}`,
                borderRadius: 12, padding: 16, textAlign: 'center', cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,.06)'
              }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: 4 }}>
                {stats[s.value] || 0}
              </div>
              <div style={{ fontSize: 11, color: '#5a5a56' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{
          background: '#fff', border: '.5px solid rgba(0,0,0,.12)',
          borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)'
        }}>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
            padding: '14px 20px', borderBottom: '.5px solid rgba(0,0,0,.10)',
            background: '#f5f4f0'
          }}>
            <input type="text" placeholder="🔍 被相続人名で検索..."
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
              style={{
                flex: 1, minWidth: 160, padding: '7px 10px',
                border: '.5px solid rgba(0,0,0,.2)', borderRadius: 8,
                fontSize: 13, fontFamily: 'inherit'
              }} />
            <select value={statusF} onChange={e => setStatusF(e.target.value)}
              style={{
                padding: '7px 10px', border: '.5px solid rgba(0,0,0,.2)',
                borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff'
              }}>
              <option value="">全ステータス</option>
              {STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
            </select>
            <button onClick={load} style={{
              padding: '7px 14px', border: '.5px solid rgba(0,0,0,.2)',
              borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
            }}>検索</button>
            <button onClick={() => { setSearch(''); setStatusF('') }} style={{
              padding: '7px 14px', border: '.5px solid rgba(0,0,0,.2)',
              borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
            }}>リセット</button>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9a9a94', fontSize: 13 }}>読み込み中...</div>
          ) : cases.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9a9a94' }}>
              <p style={{ fontSize: 14, marginBottom: 16 }}>案件がありません</p>
              <a href="https://sozokuexpert.github.io/isanbunkatsu-app/"
                target="_blank" rel="noopener noreferrer"
                style={{
                  padding: '9px 16px', background: '#1B4F72', color: '#fff',
                  borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500
                }}>
                協議書作成アプリで案件を作成
              </a>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f5f4f0' }}>
                    {['被相続人', 'ステータス', '担当者', '作成日', '更新日', ''].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left', fontWeight: 500,
                        fontSize: 12, color: '#5a5a56', borderBottom: '.5px solid rgba(0,0,0,.15)',
                        whiteSpace: 'nowrap'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => {
                    const st = getStatusStyle(c.status)
                    return (
                      <tr key={c.id}
                        onClick={() => window.location.href = `/cases/${c.id}`}
                        style={{ borderBottom: '.5px solid rgba(0,0,0,.08)', cursor: 'pointer' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 500 }}>
                          {c.deceased_name || '-'}
                        </td>
                        <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                          <select value={c.status || '入力中'}
                            onChange={e => changeStatus(e, c.id)}
                            style={{
                              background: st.bg, color: st.color,
                              border: `1px solid ${st.color}`,
                              borderRadius: 10, padding: '3px 8px',
                              fontSize: 11, fontWeight: 500, cursor: 'pointer'
                            }}>
                            {STATUS_LIST.map(s => (
                              <option key={s.value} value={s.value}>{s.value}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#5a5a56' }}>
                          {c.assigned_to || '-'}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#9a9a94', whiteSpace: 'nowrap' }}>
                          {fmtDate(c.created_at)}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#9a9a94', whiteSpace: 'nowrap' }}>
                          {fmtDate(c.updated_at)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}
                          onClick={e => e.stopPropagation()}>
                          <Link href={`/cases/${c.id}`}
                            style={{
                              padding: '5px 10px', border: '.5px solid rgba(0,0,0,.2)',
                              borderRadius: 6, fontSize: 12, color: '#1a1a18',
                              textDecoration: 'none', marginRight: 6
                            }}>詳細</Link>
                          {me && me.role === 'admin' && (
                            <button
                              onClick={() => { setDelId(c.id); setDelName(c.deceased_name) }}
                              style={{
                                padding: '5px 10px', background: '#c0392b', color: '#fff',
                                border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer'
                              }}>削除</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {delId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }} onClick={() => setDelId(null)}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 28, maxWidth: 400, width: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>案件を削除しますか？</h2>
            <p style={{ color: '#5a5a56', fontSize: 13, marginBottom: 20 }}>
              「{delName}」の案件を削除します。この操作は取り消せません。
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDelId(null)} style={{
                padding: '8px 16px', border: '.5px solid rgba(0,0,0,.2)',
                borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer'
              }}>キャンセル</button>
              <button onClick={handleDelete} style={{
                padding: '8px 16px', background: '#c0392b', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer'
              }}>削除する</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 300 }}>
          <div style={{
            background: toast.type === 'success' ? '#2d6a4f' : '#c0392b',
            color: '#fff', padding: '12px 18px', borderRadius: 8, fontSize: 13,
            boxShadow: '0 4px 20px rgba(0,0,0,.12)'
          }}>{toast.msg}</div>
        </div>
      )}
    </>
  )
}
