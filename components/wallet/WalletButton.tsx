'use client'

import { useState } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { WalletModal } from './WalletModal'

export function WalletButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  const handleDisconnect = () => {
    disconnect()
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-medium">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <button
          onClick={handleDisconnect}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Connect Wallet
      </button>
      <WalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
