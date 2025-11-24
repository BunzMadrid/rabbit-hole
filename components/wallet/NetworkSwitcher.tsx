'use client'

import { useAccount, useSwitchChain } from 'wagmi'
import { useEffect } from 'react'
import { DEFAULT_CHAIN } from '@/config/chains'

export function NetworkSwitcher() {
  const { chain, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()

  useEffect(() => {
    if (isConnected && chain && chain.id !== DEFAULT_CHAIN.id) {
      switchChain?.({ chainId: DEFAULT_CHAIN.id })
    }
  }, [isConnected, chain, switchChain])

  if (!isConnected) return null

  if (chain?.id !== DEFAULT_CHAIN.id) {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Network Error
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Current Network: {chain?.name} - Please switch to {DEFAULT_CHAIN.name}
              </p>
            </div>
            <button
              onClick={() => switchChain?.({ chainId: DEFAULT_CHAIN.id })}
              className="ml-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors"
            >
              Switch Network
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
