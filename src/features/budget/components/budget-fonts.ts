import { Manrope, JetBrains_Mono } from 'next/font/google'

// Scoped to the Budget Dashboard subtree to match the approved design (Manrope body +
// JetBrains Mono for figures). Applied via inline fontFamily on the page root — this does
// not touch the app-wide font set in src/app/layout.tsx.
export const budgetSans = Manrope({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

export const budgetMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'],
})
