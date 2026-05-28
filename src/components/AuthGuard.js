'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthGuard({ children }) {
  const router   = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
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
    check()

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login')
    })
    return () => listener.subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'center',
        height:'100vh', fontSize:14, color:'#9a9a94',
        fontFamily:'"Hiragino Kaku Gothic ProN",sans-serif'
      }}>
        読み込み中...
      </div>
    )
  }

  return typeof children === 'function' ? children(profile) : children
}
