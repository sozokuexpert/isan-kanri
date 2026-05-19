import './globals.css'

export const metadata = {
  title: '遺産分割協議書 案件管理',
  description: '遺産分割協議書の案件管理システム',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
