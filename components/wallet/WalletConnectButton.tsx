"use client"

import React, { FC, useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletReadyState, WalletError } from '@solana/wallet-adapter-base'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet, ChevronDown, X, ExternalLink, AlertCircle } from 'lucide-react'

interface WalletConnectButtonProps {
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
}

export const WalletConnectButton: FC<WalletConnectButtonProps> = ({ 
  className = '', 
  variant = 'default',
  size = 'default'
}) => {
  const { wallets, select, wallet, publicKey, disconnect, connecting, connected } = useWallet()
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleWalletSelect = async (walletName: string) => {
    try {
      setError(null)
      select(walletName as any)
      setIsOpen(false)
    } catch (error: any) {
      setError(error.message || 'Failed to connect wallet')
      console.error('Wallet connection error:', error)
    }
  }

  const handleDisconnect = async () => {
    try {
      setError(null)
      await disconnect()
      setIsOpen(false)
    } catch (error: any) {
      setError(error.message || 'Failed to disconnect wallet')
      console.error('Wallet disconnection error:', error)
    }
  }

  // Clear error when wallet state changes
  useEffect(() => {
    if (connected) {
      setError(null)
    }
  }, [connected])

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  if (connected && publicKey) {
    return (
      <div className="relative">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white ${className}`}
          size={size}
        >
          <Wallet className="w-4 h-4 mr-2" />
          {formatAddress(publicKey.toString())}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <Card className="absolute top-full mt-2 right-0 z-50 w-64 bg-slate-900/95 border-slate-700 backdrop-blur-md">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm">{wallet?.adapter.name}</div>
                        <div className="text-slate-400 text-xs">Connected</div>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                      Connected
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="text-slate-400 text-xs">Wallet Address</div>
                    <div className="bg-slate-800/50 rounded-lg p-2 text-white text-sm font-mono break-all">
                      {publicKey.toString()}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={handleDisconnect}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-red-500/20 text-red-400 hover:bg-red-500/10 bg-transparent"
                    >
                      Disconnect
                    </Button>
                    <Button
                      onClick={() => window.open(`https://explorer.solana.com/address/${publicKey.toString()}?cluster=devnet`, '_blank')}
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    )
  }

  if (connecting) {
    return (
      <Button disabled className={`bg-slate-600 text-slate-300 ${className}`} size={size}>
        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
        Connecting...
      </Button>
    )
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white ${className}`}
        size={size}
        variant={variant}
      >
        <Wallet className="w-4 h-4 mr-2" />
        Connect Wallet
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute top-full mt-2 right-0 z-50 w-72 bg-slate-900/95 border-slate-700 backdrop-blur-md">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">Connect Wallet</h3>
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-red-300 text-sm">{error}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {wallets.filter(wallet => wallet.readyState !== WalletReadyState.Unsupported).map((wallet) => (
                    <Button
                      key={wallet.adapter.name}
                      onClick={() => handleWalletSelect(wallet.adapter.name)}
                      variant="outline"
                      className="w-full justify-start bg-slate-800/30 border-slate-700 hover:bg-slate-700/50 text-white"
                      disabled={connecting}
                    >
                      <img 
                        src={wallet.adapter.icon} 
                        alt={wallet.adapter.name}
                        className="w-5 h-5 mr-3"
                      />
                      {wallet.adapter.name}
                      {wallet.readyState === WalletReadyState.Installed && (
                        <Badge className="ml-auto bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                          Installed
                        </Badge>
                      )}
                      {wallet.readyState === WalletReadyState.NotDetected && (
                        <Badge className="ml-auto bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">
                          Not Installed
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>

                <div className="text-slate-400 text-xs text-center">
                  Don't have a wallet? Download{' '}
                  <a 
                    href="https://phantom.app/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline"
                  >
                    Phantom
                  </a>
                  {' '}or{' '}
                  <a 
                    href="https://solflare.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline"
                  >
                    Solflare
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
