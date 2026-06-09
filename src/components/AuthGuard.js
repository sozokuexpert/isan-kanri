'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthGuard({ children }) {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // ↓デバッグ用：どのイベントが来ているか確認する
        console.log('★ AuthGuard event:', event, 'session:', session?.user?.id)

        if (event === 'SIGNED_OUT' || !session) {
          console.log('★ ログインなし → /loginへ')
          setProfile(null)
          setLoading(false)
          router.replace('/login')
          return
        }

        if (session) {
          console.log('★ usersテーブル取得開始')
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          console.log('★ usersテーブル結果 data:', data, 'error:', error)

          if (error || !data) {
            console.log('★ プロフィールなし → /loginへ')
            setLoading(false)
            router.replace('/login')
            return
          }

          console.log('★ プロフィール取得成功 → 画面表示')
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

  if (!profile) return null

  return typeof children === 'function' ? children(profile) : children
}
