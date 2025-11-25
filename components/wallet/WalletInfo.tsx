"use client"

import React, { FC, useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WalletInfoProps {
  className?: string
  showBalance?: boolean
  showAddress?: boolean
}

export const WalletInfo: FC<WalletInfoProps> = ({ 
  className = '',
  showBalance = true,
  showAddress = true
}) => {
  const { connection } = useConnection()
  const { publicKey, connected } = useWallet()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchBalance = async () => {
    if (!publicKey || !connected) return
    
    setLoading(true)
    try {
      const balance = await connection.getBalance(publicKey)
      setBalance(balance / LAMPORTS_PER_SOL)
    } catch (error) {
      console.error('Error fetching balance:', error)
      setBalance(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [publicKey, connected, connection])

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  if (!connected || !publicKey) {
    return null
  }

  return (
    <Card className={`bg-white/5 border-white/10 ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-cyan-400" />
              <span className="text-white font-medium text-sm">Wallet Info</span>
            </div>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
              Connected
            </Badge>
          </div>

          {showAddress && (
            <div className="space-y-1">
              <div className="text-slate-400 text-xs">Address</div>
              <div className="bg-slate-800/50 rounded-lg p-2 text-white text-sm font-mono">
                {formatAddress(publicKey.toString())}
              </div>
            </div>
          )}

          {showBalance && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-slate-400 text-xs">Balance</div>
                <Button
                  onClick={fetchBalance}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                  disabled={loading}
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2">
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                    <span className="text-slate-400 text-sm">Loading...</span>
                  </div>
                ) : balance !== null ? (
                  <div className="text-cyan-400 font-bold text-lg">
                    {balance.toFixed(4)} SOL
                  </div>
                ) : (
                  <div className="text-red-400 text-sm">Failed to load</div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
