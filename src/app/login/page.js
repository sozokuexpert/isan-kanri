'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  const handleLogin = async () => {
  setError(''); setLoading(true)
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  setLoading(false)
  if (error) { setError('メールアドレスまたはパスワードが間違っています'); return }
  // ↓ router.replace を削除。AuthGuardのSIGNED_INイベント検知に任せる
  // （セッション確立 → onAuthStateChange発火 → fetchProfile → 自動的に/casesへ）
}

// ログイン成功を検知して /cases へ移動する
useEffect(() => {
  const { data: listener } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
      router.replace('/cases')
    }
  })
  return () => listener.subscription.unsubscribe()
}, [router])

  
  const handleReset = async () => {
    if (!email) { setError('メールアドレスを入力してください'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    })
    if (error) { setError('送信に失敗しました'); return }
    setResetMsg('パスワードリセットメールを送信しました。メールをご確認ください。')
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#b2d3a5', fontFamily:'"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif'
    }}>
      <div style={{
        background:'#fff', borderRadius:12, padding:'40px 36px',
        width:'100%', maxWidth:400, boxShadow:'0 4px 20px rgba(0,0,0,.12)'
      }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:28, marginBottom:8 }}>📋</div>
          <h1 style={{ fontSize:18, fontWeight:600, color:'#1B4F72', marginBottom:4 }}>
            遺産分割協議書
          </h1>
          <p style={{ fontSize:12, color:'#9a9a94' }}>案件管理システム</p>
        </div>

        {error && (
          <div style={{
            background:'#fdecea', color:'#c0392b', padding:'10px 14px',
            borderRadius:8, fontSize:13, marginBottom:16
          }}>
            {error}
          </div>
        )}
        {resetMsg && (
          <div style={{
            background:'#eaf3de', color:'#2d6a4f', padding:'10px 14px',
            borderRadius:8, fontSize:13, marginBottom:16
          }}>
            {resetMsg}
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:11, color:'#5a5a56', marginBottom:4, fontWeight:500 }}>
            メールアドレス
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key==='Enter' && handleLogin()}
            placeholder="example@email.com"
            style={{
              width:'100%', padding:'9px 11px', border:'.5px solid rgba(0,0,0,.22)',
              borderRadius:8, fontSize:13, boxSizing:'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', fontSize:11, color:'#5a5a56', marginBottom:4, fontWeight:500 }}>
            パスワード
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key==='Enter' && handleLogin()}
            placeholder="パスワードを入力"
            style={{
              width:'100%', padding:'9px 11px', border:'.5px solid rgba(0,0,0,.22)',
              borderRadius:8, fontSize:13, boxSizing:'border-box'
            }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width:'100%', padding:'11px', background:'#1B4F72', color:'#fff',
            border:'none', borderRadius:8, fontSize:14, fontWeight:600,
            cursor:loading?'not-allowed':'pointer', opacity:loading?.6:1,
            marginBottom:14
          }}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>

        <div style={{ textAlign:'center' }}>
          <button
            onClick={handleReset}
            style={{
              background:'none', border:'none', color:'#185fa5',
              fontSize:12, cursor:'pointer', textDecoration:'underline'
            }}
          >
            パスワードを忘れた方はこちら
          </button>
        </div>
      </div>
    </div>
  )
}
