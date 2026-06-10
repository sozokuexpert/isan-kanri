'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Supabaseに接続する設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function ApplyPage() {
  // フォームの入力内容を管理する
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    content: '',  // 相談内容
  })

  // 送信中・完了・エラーの状態管理
  const [status, setStatus] = useState('idle') // idle / sending / done / error
  const [errorMsg, setErrorMsg] = useState('')

  // 入力値が変わったときに状態を更新する
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // 送信ボタンを押したときの処理
  const handleSubmit = async () => {
    // 必須項目チェック
    if (!form.name || !form.email || !form.content) {
      setErrorMsg('お名前・メールアドレス・ご相談内容は必須です')
      return
    }

    // メールアドレスの簡易チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setErrorMsg('メールアドレスの形式が正しくありません')
      return
    }

    setStatus('sending')
    setErrorMsg('')

    try {
      // Step1: 顧客を登録する（customer_noは自動採番）
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name:  form.name,
          email: form.email,
          phone: form.phone || null,
        })
        .select()
        .single()

      // メールアドレスが重複している場合は既存顧客を取得
      let customerId
      if (customerError) {
        if (customerError.code === '23505') {
          // 重複エラー（unique violation）→ 既存顧客を使う
          const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('email', form.email)
            .single()
          customerId = existing?.id
        } else {
          throw customerError
        }
      } else {
        customerId = customer.id
      }

      // Step2: 案件を作成する（case_noは自動採番）
      const { error: caseError } = await supabase
        .from('cases')
        .insert({
          customer_id:   customerId,
          assigned_to:   form.name,   // 担当者名の代わりに申込者名を入れる
          notes:         form.content,
          status:        '入力中',
        })

      if (caseError) throw caseError

      // Step3: メール通知を送る
      await fetch('/api/notify-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    form.name,
          email:   form.email,
          phone:   form.phone,
          content: form.content,
        }),
      })

      setStatus('done')

    } catch (err) {
      console.error(err)
      setErrorMsg('送信中にエラーが発生しました。時間をおいて再度お試しください。')
      setStatus('error')
    }
  }

  // 送信完了画面
  if (status === 'done') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 48, textAlign: 'center' }}>✅</div>
          <h1 style={styles.title}>お申込みありがとうございます</h1>
          <p style={styles.text}>
            ご相談内容を受け付けました。<br />
            担当者より2営業日以内にご連絡いたします。
          </p>
          <p style={{ ...styles.text, color: '#666', fontSize: 14 }}>
            ご登録のメールアドレスに確認メールをお送りしました。<br />
            届かない場合は迷惑メールフォルダをご確認ください。
          </p>
        </div>
      </div>
    )
  }

  // 申込フォーム画面
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>無料相談のお申込み</h1>
        <p style={styles.text}>
          相続についてのご相談を受け付けています。<br />
          お気軽にお申込みください。
        </p>

        {/* エラーメッセージ */}
        {errorMsg && (
          <div style={styles.error}>{errorMsg}</div>
        )}

        {/* お名前 */}
        <div style={styles.field}>
          <label style={styles.label}>
            お名前 <span style={styles.required}>必須</span>
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="例：山田 太郎"
            style={styles.input}
          />
        </div>

        {/* メールアドレス */}
        <div style={styles.field}>
          <label style={styles.label}>
            メールアドレス <span style={styles.required}>必須</span>
          </label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="例：yamada@example.com"
            style={styles.input}
          />
        </div>

        {/* 電話番号 */}
        <div style={styles.field}>
          <label style={styles.label}>
            電話番号 <span style={styles.optional}>任意</span>
          </label>
          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="例：090-1234-5678"
            style={styles.input}
          />
        </div>

        {/* 相談内容 */}
        <div style={styles.field}>
          <label style={styles.label}>
            ご相談内容 <span style={styles.required}>必須</span>
          </label>
          <textarea
            name="content"
            value={form.content}
            onChange={handleChange}
            placeholder="例：父が亡くなり、相続手続きをどこから始めればいいか分からず困っています。"
            rows={5}
            style={{ ...styles.input, resize: 'vertical' }}
          />
        </div>

        {/* 送信ボタン */}
        <button
          onClick={handleSubmit}
          disabled={status === 'sending'}
          style={{
            ...styles.button,
            opacity: status === 'sending' ? 0.6 : 1,
            cursor: status === 'sending' ? 'not-allowed' : 'pointer',
          }}
        >
          {status === 'sending' ? '送信中...' : '無料相談を申し込む'}
        </button>

        <p style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 12 }}>
          送信いただいた情報は相談対応のみに使用します。
        </p>
      </div>
    </div>
  )
}

// スタイル定義
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: '40px 32px',
    maxWidth: 480,
    width: '100%',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  text: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    lineHeight: 1.7,
    marginBottom: 24,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  required: {
    backgroundColor: '#e53e3e',
    color: '#fff',
    fontSize: 11,
    padding: '1px 6px',
    borderRadius: 3,
    marginLeft: 6,
  },
  optional: {
    backgroundColor: '#718096',
    color: '#fff',
    fontSize: 11,
    padding: '1px 6px',
    borderRadius: 3,
    marginLeft: 6,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 15,
    boxSizing: 'border-box',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#2b6cb0',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  error: {
    backgroundColor: '#fff5f5',
    border: '1px solid #fc8181',
    color: '#c53030',
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: 14,
    marginBottom: 16,
  },
}
