'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AuthGuard from '@/components/AuthGuard'

export default function AdminPage() {
  return (
    <AuthGuard>
      {(profile) => profile.role === 'admin'
        ? <AdminContent me={profile} />
        : <div style={{ padding:40, textAlign:'center', color:'#c0392b',
            fontFamily:'"Hiragino Kaku Gothic ProN",sans-serif' }}>
            管理者のみアクセスできます
          </div>
      }
    </AuthGuard>
  )
}

function AdminContent({ me }) {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState(null)
  const [modal,   setModal]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState({
    name:'', email:'', password:'', role:'partner', company:''
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('users').select('*').order('created_at', { ascending:false })
    setLoading(false)
    setUsers(data || [])
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.email || !form.password) {
      showToast('メールアドレスとパスワードは必須です', 'error')
      return
    }
    setSaving(true)
    const { data, error } = await supabase.auth.admin.createUser({
      email: form.email,
      password: form.password,
      email_confirm: true
    })
    if (error) {
      showToast('作成失敗: ' + error.message, 'error')
      setSaving(false)
      return
    }
    await supabase.from('users').insert({
      id: data.user.id,
      email: form.email,
      name: form.name || null,
      role: form.role,
      company: form.company || null
    })
    setSaving(false)
    setModal(false)
    setForm({ name:'', email:'', password:'', role:'partner', company:'' })
    showToast('ユーザーを作成しました', 'success')
    load()
  }

  const handleRoleChange = async (userId, newRole) => {
    if (userId === me.id) {
      showToast('自分のロールは変更できません', 'error')
      return
    }
    const { error } = await supabase
      .from('users').update({ role: newRole }).eq('id', userId)
    if (error) { showToast('更新失敗', 'error'); return }
    showToast('ロールを変更しました', 'success')
    load()
  }

  const handleDelete = async (userId, userName) => {
    if (userId === me.id) {
      showToast('自分自身は削除できません', 'error')
      return
    }
    if (!confirm('「' + userName + '」を削除しますか？')) return
    await supabase.from('users').delete().eq('id', userId)
    showToast('削除しました', 'success')
    load()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const showToast = (msg, type) => {
    type = type || 'success'
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <>
      <nav style={{
        background:'#fff',
        borderBottom:'.5px solid rgba(0,0,0,.12)',
        padding:'0 24px',
        display:'flex',
        alignItems:'center',
        justifyContent:'space-between',
        height:56,
        position:'sticky',
        top:0,
        zIndex:100,
        fontFamily:'"Hiragino Kaku Gothic ProN",sans-serif'
      }}>
        <div style={{ fontSize:15, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
          📋 遺産分割協議書
          <span style={{ fontSize:11, color:'#9a9a94', fontWeight:400 }}>案件管理システム</span>
        </div>
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          <Link href="/cases" style={{
            padding:'6px 12px', borderRadius:6, fontSize:13,
            color:'#5a5a56', textDecoration:'none'
          }}>
            案件一覧
          </Link>
          <Link href="/admin" style={{
            padding:'6px 12px', borderRadius:6, fontSize:13,
            color:'#185fa5', background:'#e6f1fb',
            textDecoration:'none', fontWeight:500
          }}>
            ユーザー管理
          </Link>
          <button onClick={handleLogout} style={{
            background:'none',
            border:'.5px solid rgba(0,0,0,.2)',
            borderRadius:6,
            padding:'5px 10px',
            fontSize:12,
            color:'#5a5a56',
            cursor:'pointer'
          }}>
            ログアウト
          </button>
        </div>
      </nav>

      <div style={{
        padding:24,
        maxWidth:1000,
        margin:'0 auto',
        fontFamily:'"Hiragino Kaku Gothic ProN",sans-serif'
      }}>
        <div style={{
          display:'flex',
          justifyContent:'space-between',
          alignItems:'center',
          marginBottom:20
        }}>
          <div>
            <div style={{ fontSize:18, fontWeight:600 }}>ユーザー管理</div>
            <div style={{ fontSize:12, color:'#9a9a94', marginTop:2 }}>
              全 {users.length} 名
            </div>
          </div>
          <button onClick={() => setModal(true)} style={{
            padding:'9px 16px',
            background:'#1B4F72',
            color:'#fff',
            border:'none',
            borderRadius:8,
            fontSize:13,
            cursor:'pointer',
            fontWeight:500
          }}>
            ＋ ユーザーを追加
          </button>
        </div>

        <div style={{
          background:'#fff',
          border:'.5px solid rgba(0,0,0,.12)',
          borderRadius:12,
          overflow:'hidden',
          boxShadow:'0 1px 4px rgba(0,0,0,.06)'
        }}>
          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:'#9a9a94', fontSize:13 }}>
              読み込み中...
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f5f4f0' }}>
                  {['名前','メールアドレス','ロール','会社名','登録日','操作'].map(function(h) {
                    return (
                      <th key={h} style={{
                        padding:'10px 14px',
                        textAlign:'left',
                        fontWeight:500,
                        fontSize:12,
                        color:'#5a5a56',
                        borderBottom:'.5px solid rgba(0,0,0,.15)',
                        whiteSpace:'nowrap'
                      }}>{h}</th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {users.map(function(u) {
                  return (
                    <tr key={u.id} style={{ borderBottom:'.5px solid rgba(0,0,0,.08)' }}>
                      <td style={{ padding:'12px 14px', fontWeight:500 }}>
                        {u.name || '-'}
                        {u.id === me.id && (
                          <span style={{
                            fontSize:10,
                            background:'#e6f1fb',
                            color:'#185fa5',
                            padding:'2px 6px',
                            borderRadius:8,
                            marginLeft:6
                          }}>自分</span>
                        )}
                      </td>
                      <td style={{ padding:'12px 14px', color:'#5a5a56' }}>
                        {u.email}
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <select
                          value={u.role || 'partner'}
                          onChange={function(e) { handleRoleChange(u.id, e.target.value) }}
                          disabled={u.id === me.id}
                          style={{
                            border:'.5px solid rgba(0,0,0,.2)',
                            borderRadius:6,
                            padding:'4px 8px',
                            fontSize:12,
                            background: u.role==='admin' ? '#fdecea'
                              : u.role==='staff' ? '#e6f1fb' : '#eaf3de',
                            color: u.role==='admin' ? '#c0392b'
                              : u.role==='staff' ? '#185fa5' : '#2d6a4f',
                            cursor: u.id===me.id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <option value="admin">管理者</option>
                          <option value="staff">事務局</option>
                          <option value="partner">協力企業</option>
                        </select>
                      </td>
                      <td style={{ padding:'12px 14px', color:'#5a5a56' }}>
                        {u.company || '-'}
                      </td>
                      <td style={{ padding:'12px 14px', color:'#9a9a94', whiteSpace:'nowrap' }}>
                        {u.created_at ? u.created_at.slice(0,10) : '-'}
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <button
                          onClick={function() { handleDelete(u.id, u.name || u.email) }}
                          disabled={u.id === me.id}
                          style={{
                            padding:'5px 10px',
                            background: u.id===me.id ? '#f0f0f0' : '#c0392b',
                            color: u.id===me.id ? '#9a9a94' : '#fff',
                            border:'none',
                            borderRadius:6,
                            fontSize:12,
                            cursor: u.id===me.id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div style={{
          position:'fixed',
          inset:0,
          background:'rgba(0,0,0,.4)',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          zIndex:200,
          padding:16
        }} onClick={() => setModal(false)}>
          <div style={{
            background:'#fff',
            borderRadius:12,
            padding:28,
            width:'100%',
            maxWidth:480,
            position:'relative',
            fontFamily:'"Hiragino Kaku Gothic ProN",sans-serif'
          }} onClick={function(e) { e.stopPropagation() }}>
            <button onClick={() => setModal(false)} style={{
              position:'absolute',
              top:16,
              right:16,
              background:'none',
              border:'none',
              fontSize:20,
              cursor:'pointer',
              color:'#9a9a94'
            }}>×</button>
            <h2 style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>
              ユーザーを追加
            </h2>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, color:'#5a5a56', marginBottom:4, fontWeight:500 }}>名前</label>
              <input type="text" value={form.name} placeholder="山田太郎"
                onChange={function(e) { setForm(function(p) { return {...p, name:e.target.value} }) }}
                style={{ width:'100%', padding:'8px 10px', border:'.5px solid rgba(0,0,0,.22)', borderRadius:8, fontSize:13, boxSizing:'border-box' }} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, color:'#5a5a56', marginBottom:4, fontWeight:500 }}>メールアドレス *</label>
              <input type="email" value={form.email} placeholder="example@email.com"
                onChange={function(e) { setForm(function(p) { return {...p, email:e.target.value} }) }}
                style={{ width:'100%', padding:'8px 10px', border:'.5px solid rgba(0,0,0,.22)', borderRadius:8, fontSize:13, boxSizing:'border-box' }} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, color:'#5a5a56', marginBottom:4, fontWeight:500 }}>初期パスワード *</label>
              <input type="password" value={form.password} placeholder="8文字以上"
                onChange={function(e) { setForm(function(p) { return {...p, password:e.target.value} }) }}
                style={{ width:'100%', padding:'8px 10px', border:'.5px solid rgba(0,0,0,.22)', borderRadius:8, fontSize:13, boxSizing:'border-box' }} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, color:'#5a5a56', marginBottom:4, fontWeight:500 }}>会社名</label>
              <input type="text" value={form.company} placeholder="〇〇行政書士事務所"
                onChange={function(e) { setForm(function(p) { return {...p, company:e.target.value} }) }}
                style={{ width:'100%', padding:'8px 10px', border:'.5px solid rgba(0,0,0,.22)', borderRadius:8, fontSize:13, boxSizing:'border-box' }} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:11, color:'#5a5a56', marginBottom:4, fontWeight:500 }}>ロール</label>
              <select value={form.role}
                onChange={function(e) { setForm(function(p) { return {...p, role:e.target.value} }) }}
                style={{ width:'100%', padding:'8px 10px', border:'.5px solid rgba(0,0,0,.22)', borderRadius:8, fontSize:13, boxSizing:'border-box', background:'#fff' }}>
                <option value="admin">管理者（admin）</option>
                <option value="staff">事務局（staff）</option>
                <option value="partner">協力企業（partner）</option>
              </select>
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button onClick={() => setModal(false)} style={{
                padding:'9px 16px',
                border:'.5px solid rgba(0,0,0,.2)',
                borderRadius:8,
                background:'#fff',
                fontSize:13,
                cursor:'pointer'
              }}>キャンセル</button>
              <button onClick={handleCreate} disabled={saving} style={{
                padding:'9px 16px',
                background:'#1B4F72',
                color:'#fff',
                border:'none',
                borderRadius:8,
                fontSize:13,
                fontWeight:500,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1
              }}>
                {saving ? '作成中...' : '作成する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:'fixed', bottom:20, right:20, zIndex:300 }}>
          <div style={{
            background: toast.type==='success' ? '#2d6a4f' : '#c0392b',
            color:'#fff',
            padding:'12px 18px',
            borderRadius:8,
            fontSize:13,
            boxShadow:'0 4px 20px rgba(0,0,0,.12)'
          }}>
            {toast.msg}
          </div>
        </div>
      )}
    </>
  )
}
