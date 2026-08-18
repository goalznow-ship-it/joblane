import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Joblane - İş elanları və karyera portalı',
  description: 'Joblane - Azərbaycanın iş elanları portalı. Vakansiyalar, şirkətlər, CV yaratma və karyera imkanları.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="az" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  )
}