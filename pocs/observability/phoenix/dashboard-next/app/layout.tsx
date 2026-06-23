import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AnSu Phoenix Dashboard',
  description: 'Mini dashboard Next.js branché sur l’API REST Phoenix'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
