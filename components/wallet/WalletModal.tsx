'use client'

import { useConnect } from 'wagmi'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
}

const WALLET_ICONS: Record<string, React.ReactNode> = {
  injected: (
    <svg viewBox="0 0 256 256" className="w-6 h-6">
      <path fill="#E17726" d="M255.805 218.207l-6.303-85.337-64.185-24.775 28.476-98.595L127.928 0 42.206 9.499 70.68 108.095 6.498 132.87l-6.303 85.337L127.928 256l127.877-37.793z"/>
      <path fill="#E2761B" d="M127.928 211.027l-53.935-31.626 28.553-56.314 25.382 16.305 25.385-16.305 28.553 56.314-53.938 31.626z"/>
    </svg>
  ),
  metaMask: (
    <svg viewBox="0 0 256 256" className="w-6 h-6">
      <path fill="#E17726" d="M255.805 218.207l-6.303-85.337-64.185-24.775 28.476-98.595L127.928 0 42.206 9.499 70.68 108.095 6.498 132.87l-6.303 85.337L127.928 256l127.877-37.793z"/>
      <path fill="#E2761B" d="M127.928 211.027l-53.935-31.626 28.553-56.314 25.382 16.305 25.385-16.305 28.553 56.314-53.938 31.626z"/>
    </svg>
  ),
}

const DEFAULT_ICON = (
  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
)

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connectors, connect, isPending, isSuccess, error } = useConnect()

  useEffect(() => {
    if (isSuccess) {
      onClose()
    }
  }, [isSuccess, onClose])

  const handleConnect = async (connectorId: string) => {
    const connector = connectors.find(c => c.id === connectorId)
    if (connector) {
      try {
        await connect({ connector })
      } catch (err) {
        console.error('Failed to connect wallet:', err)
      }
    }
  }

  const getIcon = (id: string, name: string) => {
    if (WALLET_ICONS[id]) return WALLET_ICONS[id]
    
    const lowerName = name.toLowerCase()
    if (lowerName.includes('metamask')) return WALLET_ICONS.metaMask
    if (lowerName.includes('injected')) return WALLET_ICONS.injected
    
    return DEFAULT_ICON
  }
  
  const getDisplayName = (connector: typeof connectors[0]) => {
    if (connector.id === 'injected' && typeof window !== 'undefined' && window.ethereum) {
      const eth = window.ethereum as { isMetaMask?: boolean; isTrust?: boolean }
      if (eth.isMetaMask) return 'MetaMask'
      if (eth.isTrust) return 'Trust Wallet'
    }
    return connector.name
  }

  if (!isOpen || typeof window === 'undefined') return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Connect Wallet
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error.message}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => handleConnect(connector.id)}
              disabled={isPending}
              className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center overflow-hidden">
                  {connector.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={connector.icon} alt={connector.name} className="w-6 h-6" />
                  ) : (
                    getIcon(connector.id, connector.name)
                  )}
                </div>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {getDisplayName(connector)}
                </span>
              </div>
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {connectors.length === 0 && (
          <div className="text-center py-8">
            <p className="text-zinc-500 dark:text-zinc-400">
              No available wallets detected
            </p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">
              Please install MetaMask or other Web3 wallet
            </p>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

