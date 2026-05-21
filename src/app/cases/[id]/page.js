'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getStatusStyle, STATUS_LIST, fmtDate, toWareki } from '@/lib/supabase'
import AuthGuard from '@/components/AuthGuard'

export default function CaseDetailPage({ params }) {
  return (
    <AuthGuard>
      {(profile) => <CaseDetail id={params.id} me={profile} />}
    </AuthGuard>
  )
}

function CaseDetail({ id, me }) {
  const router = useRouter()
  const [caseData,     setCaseData]     = useState(null)
  const [files,        setFiles]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [editing,      setEditing]      = useState(false)
  const [toast,        setToast]        = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [delConf,      setDelConf]      = useState(false)
  const [editStatus,   setEditStatus]   = useState('')
  const [editAssigned, setEditAssigned] = useState('')
  const [editNotes,    setEditNotes]    = useState('')

  /* ---- データ取得 ---- */
  useEffect(() => {
    const load = async () => {
      setLoading(true)

      /* 案件本体 */
      const { data, error } = await supabase
        .from('cases').select('*').eq('id', id).single()

      /* ファイル一覧 */
      const { data: fileRows } = await supabase
        .from('case_files')
        .select('*')
        .eq('case_id', id)
        .order('created_at', { ascending: false })

      setLoading(false)
      if (error || !data) { showToast('案件が見つかりません', 'error'); return }
      setCaseData(data)
      setFiles(fileRows || [])
      setEditStatus(data.status || '入力中')
      setEditAssigned(data.assigned_to || '')
      setEditNotes(data.notes || '')
    }
    if (id) load()
  }, [id])

  /* ---- 更新保存 ---- */
  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('cases').update({
      status:      editStatus,
      assigned_to: editAssigned || null,
      notes:       editNotes    || null,
      updated_at:  new Date().toISOString()
    }).eq('id', id)
    setSaving(false)
    if (error) { showToast('更新失敗: ' + error.message, 'error'); return }
    setCaseData(prev => ({
      ...prev,
      status: editStatus, assigned_to: editAssigned,
      notes: editNotes,   updated_at: new Date().toISOString()
    }))
    setEditing(false)
    showToast('更新しました', 'success')
  }

  /* ---- 削除 ---- */
  const handleDelete = async () => {
    const { error } = await supabase.from('cases').delete().eq('id', id)
    if (error) { showToast('削除失敗', 'error'); return }
    router.push('/cases')
  }

  /* ---- ファイルダウンロード ---- */
  const handleDownload = async (filePath, fileName) => {
    const { data, error } = await supabase.storage
      .from('docx-files')
      .download(filePath)
    if (error) { showToast('ダウンロード失敗: ' + error.message, 'error'); return }
    const url = URL.createObjectURL(data)
    const a   = document.createElement('a')
    a.href    = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ---- ファイル削除 ---- */
  const handleFileDelete = async (fileId, filePath) => {
    if (!confirm('このファイルを削除しますか？')) return
    /* Storageから削除 */
    await supabase.storage.from('docx-files').remove([filePath])
    /* DBから削除 */
    const { error } = await supabase.from('case_files').delete().eq('id', fileId)
    if (error) { showToast('削除失敗', 'error'); return }
    setFiles(prev => prev.filter(f => f.id !== fileId))
    showToast('ファイルを削除しました', 'success')
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const parse = (json) => {
    if (!json) return []
    try { return JSON.parse(json) } catch { return [] }
  }

  /* ---- ファイルパスからファイル名を取得 ---- */
  const getFileName = (filePath) => {
    if (!filePath) return 'ファイル'
    const parts = filePath.split('/')
    return parts[parts.length - 1]
  }

  /* ---- ログアウト ---- */
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return (
    <>
      <NavBar me={me} onLogout={handleLogout} />
      <div className="page"><div className="loading">読み込み中...</div></div>
    </>
  )
  if (!caseData) return (
    <>
      <NavBar me={me} onLogout={handleLogout} />
      <div className="page">
        <div className="empty-state">
          <p>案件が見つかりません</p>
          <Link href="/cases" className="btn">一覧に戻る</Link>
        </div>
      </div>
    </>
  )

  const st    = getStatusStyle(caseData.status)
  const heirs = parse(caseData.heirs_json)
  const banks = parse(caseData.banks_json)
  const bh    = parse(caseData.bank_heirs_json)
  const re    = parse(caseData.re_json)
  const ot    = parse(caseData.other_json)
  const fu    = parse(caseData.future_json)

  return (
    <>
      <NavBar me={me} onLogout={handleLogout} />
      <div className="page">

        {/* ページヘッダー */}
        <div className="page-header">
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <Link href="/cases" style={{ color:'var(--text2)', fontSize:13 }}>← 一覧</Link>
              <span style={{ color:'var(--text3)' }}>/</span>
              <span className="page-title">{caseData.deceased_name || '（氏名未入力）'}</span>
              <span className="badge" style={{ background:st.bg, color:st.color }}>
                {caseData.status}
              </span>
            </div>
            <div className="page-subtitle">
              作成日: {fmtDate(caseData.created_at)}　
              更新日: {fmtDate(caseData.updated_at)}　
              担当: {caseData.assigned_to || '-'}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary" onClick={() => setEditing(true)}>
              ✏ 編集
            </button>
            {me.role === 'admin' && (
              <button className="btn btn-danger" onClick={() => setDelConf(true)}>
                🗑 削除
              </button>
            )}
          </div>
        </div>

        <div className="grid2" style={{ alignItems:'start' }}>

          {/* 左カラム */}
          <div>
            {/* 被相続人情報 */}
            <div className="card" style={{ marginBottom:14 }}>
              <div className="card-header">被相続人情報</div>
              <div className="card-body">
                {[
                  ['氏名',       caseData.deceased_name],
                  ['本籍地',     caseData.deceased_honseki],
                  ['住所',       caseData.deceased_address],
                  ['死亡年月日', toWareki(caseData.death_date)],
                  ['協議書作成日', toWareki(caseData.doc_date)],
                ].map(([label, value]) => (
                  <div className="detail-row" key={label}>
                    <span className="detail-label">{label}</span>
                    <span className="detail-value">{value || '-'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 相続人 */}
            {heirs.length > 0 && (
              <div className="card" style={{ marginBottom:14 }}>
                <div className="card-header">相続人（{heirs.length}名）</div>
                <div className="card-body">
                  <div className="heir-list">
                    {heirs.map((h, i) => (
                      <div className="heir-item" key={i}>
                        <div className="heir-name">{i+1}. {h.n || '（未入力）'}</div>
                        {h.a && <div className="heir-addr">{h.a}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 備考 */}
            <div className="card" style={{ marginBottom:14 }}>
              <div className="card-header">備考</div>
              <div className="card-body">
                <p style={{ fontSize:13, color:'var(--text2)', whiteSpace:'pre-wrap', minHeight:40 }}>
                  {caseData.notes || '（備考なし）'}
                </p>
              </div>
            </div>

            {/* ========== ファイル管理 ========== */}
            <div className="card">
              <div className="card-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span>📁 保存済みファイル（{files.length}件）</span>
              </div>
              <div className="card-body">
                {files.length === 0 ? (
                  <div style={{ textAlign:'center', color:'var(--text3)', padding:'20px 0', fontSize:13 }}>
                    <p style={{ marginBottom:8 }}>まだファイルがありません</p>
                    <p style={{ fontSize:11 }}>
                      協議書作成アプリで「Wordで保存」を押すと<br />自動的にここに保存されます
                    </p>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {files.map(f => {
                      const fname = getFileName(f.file_path)
                      /* パスからStorageのキー部分だけ取り出す */
                      const storageKey = f.file_path
                        ? f.file_path.replace(/^docx-files\//, '')
                        : ''
                      return (
                        <div key={f.id} style={{
                          display:'flex', alignItems:'center', gap:10,
                          padding:'10px 12px',
                          background:'var(--bg2)', borderRadius:8,
                          border:'.5px solid var(--border)',
                        }}>
                          <span style={{ fontSize:20 }}>📄</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{
                              fontSize:12, fontWeight:500,
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
                            }}>
                              {fname}
                            </div>
                            <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                              {fmtDate(f.created_at)}　{f.file_type?.toUpperCase() || 'DOCX'}
                            </div>
                          </div>
                          <button
                            className="btn btn-sm"
                            onClick={() => handleDownload(storageKey, fname)}
                            style={{ flexShrink:0 }}
                          >
                            ↓ DL
                          </button>
                          {me.role === 'admin' && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleFileDelete(f.id, storageKey)}
                              style={{ flexShrink:0 }}
                            >
                              削除
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右カラム：財産情報 */}
          <div>
            {(banks.length > 0 || bh.length > 0) && (
              <div className="card" style={{ marginBottom:14 }}>
                <div className="card-header">預貯金</div>
                <div className="card-body">
                  {bh.length > 0 && (
                    <div className="detail-section">
                      <h3>取得者・割合</h3>
                      {bh.map((x,i) => (
                        <div className="detail-row" key={i}>
                          <span className="detail-label">{x.h}</span>
                          <span className="detail-value">{x.r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {banks.length > 0 && (
                    <div className="detail-section">
                      <h3>口座情報</h3>
                      {banks.map((b,i) => (
                        <div className="detail-row" key={i}>
                          <span className="detail-label">口座 {i+1}</span>
                          <span className="detail-value">
                            {[b.bk,b.br,b.tp,b.nm].filter(Boolean).join('　')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {re.length > 0 && (
              <div className="card" style={{ marginBottom:14 }}>
                <div className="card-header">不動産（{re.length}件）</div>
                <div className="card-body">
                  {re.map((x,i) => (
                    <div key={i} style={{ marginBottom: i < re.length-1 ? 14 : 0 }}>
                      <div className="detail-row">
                        <span className="detail-label">取得者</span>
                        <span className="detail-value">
                          {(x.hs||[]).join('、') || '-'}
                          {x.rt ? `（${x.rt}）` : ''}
                        </span>
                      </div>
                      {x.info && (
                        <pre style={{
                          fontSize:12, color:'var(--text2)', marginTop:6,
                          background:'var(--bg2)', borderRadius:6,
                          padding:'8px 10px', whiteSpace:'pre-wrap', fontFamily:'inherit'
                        }}>
                          {x.info}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(ot.length > 0 || fu.length > 0) && (
              <div className="card">
                <div className="card-header">その他・後日判明財産</div>
                <div className="card-body">
                  {ot.map((x,i) => (
                    <div className="detail-row" key={'ot'+i}>
                      <span className="detail-label">その他 {i+1}</span>
                      <span className="detail-value">
                        {x.c||'-'}　→　{(x.hs||[]).join('、')||'-'}
                      </span>
                    </div>
                  ))}
                  {fu.map((x,i) => (
                    <div className="detail-row" key={'fu'+i}>
                      <span className="detail-label">後日判明 {i+1}</span>
                      <span className="detail-value">
                        {x.c||'-'}　→　{(x.hs||[]).join('、')||'-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 編集モーダル */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setEditing(false)}>×</button>
            <h2>案件情報を編集</h2>
            <div className="field">
              <label>ステータス</label>
              <select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                {STATUS_LIST.map(s => (
                  <option key={s.value} value={s.value}>{s.value}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>担当者名</label>
              <input type="text" value={editAssigned}
                onChange={e => setEditAssigned(e.target.value)} placeholder="山田太郎" />
            </div>
            <div className="field">
              <label>備考</label>
              <textarea value={editNotes}
                onChange={e => setEditNotes(e.target.value)} placeholder="メモ・特記事項など" />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setEditing(false)}>キャンセル</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {delConf && (
        <div className="modal-overlay" onClick={() => setDelConf(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDelConf(false)}>×</button>
            <h2>案件を削除しますか？</h2>
            <p style={{ color:'var(--text2)' }}>
              「{caseData.deceased_name}」の案件とすべてのファイルを削除します。この操作は取り消せません。
            </p>
            <div className="modal-footer">
              <button className="btn" onClick={() => setDelConf(false)}>キャンセル</button>
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

function NavBar({ me, onLogout }) {
  return (
    <nav className="nav">
      <div className="nav-brand">
        📋 遺産分割協議書 <span>案件管理システム</span>
      </div>
      <div className="nav-links">
        <Link href="/cases" className="nav-link">案件一覧</Link>
        {me?.role === 'admin' && (
          <Link href="/admin" className="nav-link">ユーザー管理</Link>
        )}
        <a href="https://sozokuexpert.github.io/isanbunkatsu-app/"
          target="_blank" rel="noopener noreferrer" className="nav-link">
          ✏ 協議書作成アプリ
        </a>
        <button onClick={onLogout} style={{
          background:'none', border:'.5px solid var(--border2)',
          borderRadius:6, padding:'5px 10px',
          fontSize:12, color:'var(--text2)', cursor:'pointer',
        }}>
          ログアウト
        </button>
      </div>
    </nav>
  )
}
