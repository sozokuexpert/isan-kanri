import { NextResponse } from 'next/server'

// SendGridのAPIキー（環境変数から読み込む）
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const NOTIFY_TO        = process.env.NOTIFY_EMAIL  // 通知先メールアドレス
const SEND_FROM        = process.env.SEND_FROM_EMAIL // 送信元メールアドレス

export async function POST(request) {
  try {
    const { name, email, phone, content } = await request.json()

    // 必須項目チェック
    if (!name || !email || !content) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    // SendGridでメール送信
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: NOTIFY_TO }],
        }],
        from: { email: SEND_FROM },
        subject: `【相談申込】${name} 様よりお申込みがありました`,
        content: [{
          type: 'text/plain',
          value: [
            '新しい相談申込がありました。',
            '',
            '─────────────────────',
            `お名前　　：${name}`,
            `メール　　：${email}`,
            `電話番号　：${phone || '未記入'}`,
            '',
            '【ご相談内容】',
            content,
            '─────────────────────',
            '',
            '管理画面で確認してください：',
            process.env.NEXT_PUBLIC_APP_URL + '/cases',
          ].join('\n'),
        }],
      }),
    })

    if (!response.ok) {
      // メール送信失敗はログに残すが、申込自体は成功扱いにする
      // （メールが届かなくてもDBには保存済みのため）
      console.error('SendGrid送信失敗:', await response.text())
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('notify-apply エラー:', err)
    // メール通知の失敗は申込者に見せない
    return NextResponse.json({ ok: true })
  }
}
