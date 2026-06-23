import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'AnSu Benchmark Playground',
  description: 'Front étalon pour comparer runtimes agentiques et plateformes observability/evals.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
