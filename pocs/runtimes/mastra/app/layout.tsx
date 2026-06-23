import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'AnSu Mastra POC',
  description: 'POC Mastra runtime + Next dashboard + Studio/evals/observability pour AnSu v2'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
