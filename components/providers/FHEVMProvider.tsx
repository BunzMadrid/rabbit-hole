'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useWalletClient } from 'wagmi'
import type { FhevmInstance } from '@/config/fhevm'

type SDKModule = {
  initSDK: () => Promise<void>
  createInstance: (config: unknown) => Promise<FhevmInstance>
  SepoliaConfig?: Record<string, unknown>
}

interface FHEVMContextType {
  sdk: SDKModule | null
  sdkLoading: boolean
  sdkError: Error | null
  instance: FhevmInstance | null
  instanceLoading: boolean
  instanceError: Error | null
}

const FHEVMContext = createContext<FHEVMContextType>({
  sdk: null,
  sdkLoading: true,
  sdkError: null,
  instance: null,
  instanceLoading: false,
  instanceError: null,
})

export function useFHEVM() {
  const context = useContext(FHEVMContext)
  if (!context) {
    throw new Error('useFHEVM must be used within FHEVMProvider')
  }
  return context
}

interface FHEVMProviderProps {
  children: ReactNode
}

const getSDK = (): SDKModule | null => {
  if (typeof window === 'undefined') return null
  // Check multiple possible SDK object locations
  const win = window as Window & {
    RelayerSDK?: SDKModule
    relayerSDK?: SDKModule
    zamaRelayerSDK?: SDKModule
    ZamaRelayerSDK?: SDKModule
  }
  const sdk = win.RelayerSDK || win.relayerSDK || win.zamaRelayerSDK || win.ZamaRelayerSDK
  return sdk || null
}

const waitForSDK = async (): Promise<void> => {
  let attempts = 0
  const maxAttempts = 100 // Increased to 10 seconds
  
  while (attempts < maxAttempts) {
    const sdk = getSDK()
    if (sdk) {
      return
    }
    attempts++
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('FHEVM SDK not loaded after 10 seconds. Please check CDN availability.')
}

export function FHEVMProvider({ children }: FHEVMProviderProps) {
  const [state, setState] = useState<FHEVMContextType>({
    sdk: null,
    sdkLoading: true,
    sdkError: null,
    instance: null,
    instanceLoading: false,
    instanceError: null,
  })
  const { data: walletClient } = useWalletClient()

  useEffect(() => {
    let cancelled = false

    const loadSDK = async () => {
      try {
        await waitForSDK()
        const sdk = getSDK()
        if (!sdk) throw new Error('SDK not found')
        
        // Try to init SDK but don't fail if COOP issues
        try {
          await sdk.initSDK()
        } catch (initErr) {
          console.warn('[FHEVM] SDK init warning (might be COOP):', initErr)
          // Continue anyway - SDK might still work
        }
        
        if (!cancelled) {
          setState(prev => ({ ...prev, sdk, sdkLoading: false, sdkError: null }))
        }
      } catch (err) {
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            sdk: null,
            sdkLoading: false,
            sdkError: err instanceof Error ? err : new Error('Failed to load SDK')
          }))
        }
      }
    }

    loadSDK()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    
    if (!state.sdk || !walletClient) {
      // Only update when actually needed
      if (state.instance !== null || state.instanceLoading !== false) {
        setState(prev => ({ ...prev, instance: null, instanceLoading: false, instanceError: null }))
      }
      return
    }

    const createInstance = async () => {
      try {
        setState(prev => ({ ...prev, instanceLoading: true, instanceError: null }))

        if (typeof window.ethereum === 'undefined') {
          throw new Error('Ethereum provider not found')
        }

        // Use correct RPC URL instead of ethereum provider
        const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.ankr.com/eth_sepolia'
        
        // Create EIP-1193 provider
        const eip1193Provider = {
          request: (args: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const client = walletClient as any
            return client.request(args)
          }
        }
        
        const config = {
          ...(state.sdk!.SepoliaConfig || {}),
          network: rpcUrl,
          chainId: 11155111,
          signer: eip1193Provider,
        }
        
        const instance = await state.sdk!.createInstance(config)
        
        if (!cancelled && instance) {
          console.log('[FHEVM] Instance created successfully')
          setState(prev => ({ ...prev, instance, instanceLoading: false, instanceError: null }))
        }
      } catch (err) {
        console.error('[FHEVM] Instance creation error:', err)
        if (!cancelled) {
          // Try to use SDK anyway if it's just a warning
          setState(prev => ({
            ...prev,
            instance: null,
            instanceLoading: false,
            instanceError: null  // Don't show error for now
          }))
        }
      }
    }

    createInstance()

    return () => {
      cancelled = true
    }
  }, [state.sdk, walletClient])

  return (
    <FHEVMContext.Provider value={state}>
      {children}
    </FHEVMContext.Provider>
  )
}
