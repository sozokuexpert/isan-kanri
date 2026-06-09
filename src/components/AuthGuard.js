'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthGuard({ children }) {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChange だけに一本化する
    // （initializeとの競合を完全になくす）
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        if (event === 'SIGNED_OUT' || !session) {
          setProfile(null)
          setLoading(false)
          router.replace('/login')
          return
        }

        // SIGNED_IN / INITIAL_SESSION / TOKEN_REFRESHED すべてで取得
        if (session) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (error || !data) {
            // usersテーブルにレコードがない場合もログインへ
            setLoading(false)
            router.replace('/login')
            return
          }

          setProfile(data)
          setLoading(false)
        }
      }
    )

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

  if (!profile) {
    return null
  }

  return typeof children === 'function' ? children(profile) : children
}
