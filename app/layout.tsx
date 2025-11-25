import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { WalletContextProvider } from "@/components/wallet/WalletContextProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Parchi - Solana NFT Ticketing Platform",
  description:
    "Experience events like never before with secure, transparent, and tradeable NFT tickets on Solana blockchain.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  )
}
