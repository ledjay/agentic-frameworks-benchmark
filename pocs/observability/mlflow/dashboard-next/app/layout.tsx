import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AnSu MLflow Dashboard',
  description: 'Façade Next.js expérimentale au-dessus de MLflow GenAI'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
