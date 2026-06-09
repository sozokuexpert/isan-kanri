'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'placeholder',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
)

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  // ↓追加：ページ読み込み中かどうか（チェック完了まで何も表示しない）
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const initialize = async () => {
      // ---- ① まず ?code= がURLにあるか確認（PKCEフロー） ----
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')

      if (code) {
        // codeをセッションに交換する（Supabase v2 PKCEフロー）
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setMessage('リンクが無効か、有効期限が切れています。もう一度パスワードリセットをお試しください。')
          setIsError(true)
          setIsChecking(false)
          return
        }
        setIsReady(true)
        setIsChecking(false)
        return
      }

      // ---- ② #access_token= がURLにあるか確認（旧フロー） ----
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        // Supabase SDKが自動処理するので少し待ってからセッション確認
        await new Promise(resolve => setTimeout(resolve, 500))
        const { data } = await supabase.auth.getSession()
        if (data?.session) {
          setIsReady(true)
          setIsChecking(false)
          return
        }
      }

      // ---- ③ どちらもない場合はエラー ----
      setMessage('リンクが無効か、有効期限が切れています。もう一度パスワードリセットをお試しください。')
      setIsError(true)
      setIsChecking(false)
    }

    initialize()
  }, [])

  const handleSubmit = async () => {
    setMessage('')
    setIsError(false)

    if (!password || !confirmPassword) {
      setMessage('パスワードを両方入力してください。')
      setIsError(true)
      return
    }
    if (password.length < 8) {
      setMessage('パスワードは8文字以上で設定してください。')
      setIsError(true)
      return
    }
    if (password !== confirmPassword) {
      setMessage('パスワードが一致しません。もう一度確認してください。')
      setIsError(true)
      return
    }

    setIsLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    setIsLoading(false)

    if (error) {
      // ↓エラーの内容も表示して原因を分かりやすくする
      setMessage(`パスワードの変更に失敗しました。（${error.message}）`)
      setIsError(true)
      return
    }

    await supabase.auth.signOut()
    setMessage('パスワードを変更しました。新しいパスワードでログインしてください。')
    setIsError(false)
    setIsReady(false)
  }

  // ---- 読み込み中は何も表示しない ----
  if (isChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <p style={{ color: '#888', fontSize: '14px' }}>確認中...</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
          パスワードの再設定
        </h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
          新しいパスワードを入力してください
        </p>

        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            backgroundColor: isError ? '#fff0f0' : '#f0fff4',
            color: isError ? '#c0392b' : '#27ae60',
            border: `1px solid ${isError ? '#f5c6cb' : '#c3e6cb'}`,
            fontSize: '14px'
          }}>
            {message}
            {!isError && !isReady && (
              <div style={{ marginTop: '12px' }}>
                <a href="/login" style={{
                  display: 'inline-block',
                  padding: '8px 20px',
                  backgroundColor: '#2c7be5',
                  color: '#fff',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '14px'
                }}>
                  ログイン画面へ
                </a>
              </div>
            )}
          </div>
        )}

        {isReady && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#555', marginBottom: '6px' }}>
                新しいパスワード（8文字以上）
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="新しいパスワード"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '15px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#555', marginBottom: '6px' }}>
                パスワードの確認
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="もう一度入力"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '15px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: isLoading ? '#aaa' : '#2c7be5',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? '変更中...' : 'パスワードを変更する'}
            </button>
          </>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a href="/login" style={{ fontSize: '13px', color: '#888', textDecoration: 'none' }}>
            ← ログイン画面に戻る
          </a>
        </div>
      </div>
    </div>
  )
}
