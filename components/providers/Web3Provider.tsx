'use client'

import { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { config } from '@/config/wagmi'
import { FHEVMProvider } from './FHEVMProvider'

const queryClient = new QueryClient()

interface Web3ProviderProps {
  children: ReactNode
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <FHEVMProvider>
            {children}
          </FHEVMProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
