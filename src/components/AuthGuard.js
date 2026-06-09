'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthGuard({ children }) {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // プロフィール取得を関数として切り出す（イベント検知時にも使い回す）
    const fetchProfile = async (session) => {
      if (!session) {
        router.replace('/login')
        return
      }
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (!data) {
        router.replace('/login')
        return
      }
      setProfile(data)
      setLoading(false)
    }

    // 最初の確認
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      await fetchProfile(session)
    }
    initialize()

    // ↓ここが今回の修正の核心
    // 認証状態の変化を監視する（ログイン・ログアウト両方に対応）
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        // ログイン成功を検知したらプロフィールを取得する
        await fetchProfile(session)
      }
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setLoading(true)
        router.replace('/login')
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontSize: 14, color: '#9a9a94',
        fontFamily: '"Hiragino Kaku Gothic ProN",sans-serif'
      }}>
        読み込み中...
      </div>
    )
  }

  return typeof children === 'function' ? children(profile) : children
}
