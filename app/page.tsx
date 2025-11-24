'use client'

import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { FHEVMStatus } from '@/components/wallet/FHEVMStatus'
import { MintToken } from '@/components/token/MintToken'
import { ConfidentialTransfer } from '@/components/token/ConfidentialTransfer'
import { PlainTransfer } from '@/components/token/PlainTransfer'
import { ConversionHistory } from '@/components/token/ConversionHistory'

export default function Home() {
  const { isConnected } = useAccount()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!isConnected) {
      const timer = setTimeout(() => setShowModal(true), 500)
      return () => clearTimeout(timer)
    }
  }, [isConnected])

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Minimalist color waves */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-950"></div>
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-zinc-200/20 to-transparent dark:from-zinc-800/20 animate-wave"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[400px] bg-gradient-to-t from-zinc-200/15 to-transparent dark:from-zinc-800/15 animate-wave-reverse"></div>
      </div>
      
      {showModal && !isConnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  Connect Wallet
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Please connect your Web3 wallet to experience confidential token conversion
                </p>
              </div>

              <div className="pt-4 flex justify-center">
                <ConnectKitButton />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <header className="border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-black/50 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11">
                  <Image
                    src="/rabbit-icon.svg"
                    alt="Rabbit Hole icon"
                    width={44}
                    height={44}
                    className="w-11 h-11 dark:hidden"
                    priority
                  />
                  <Image
                    src="/rabbit-icon-light.svg"
                    alt="Rabbit Hole icon (light)"
                    width={44}
                    height={44}
                    className="w-11 h-11 hidden dark:block"
                    priority
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
                    Rabbit Hole
                  </h1>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">Dual-Mode Privacy Token</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FHEVMStatus />
                <ConnectKitButton />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center mb-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-full mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Powered by Zama FHEVM</span>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-200 dark:to-white bg-clip-text text-transparent">
                Privacy-Controlled Smart Token
              </span>
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Seamlessly switch between encrypted privacy and public transparency in a single contract
            </p>
            <p className="text-base text-zinc-500 dark:text-zinc-500 max-w-xl mx-auto">
              Fully compatible with mainstream wallets like MetaMask, view token balance changes in real-time
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 relative">
            {/* Left card - left aligned */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                      Confidential Token ERC-7984
                    </h3>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 rounded-full">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Full Privacy</span>
                    </div>
                  </div>
                </div>
                <ul className="space-y-3 text-left">
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Balance fully encrypted, invisible to everyone</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Transaction amount hidden protection</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Based on FHE fully homomorphic encryption</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Infinity symbol */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-2xl opacity-20"></div>
                <svg className="relative w-24 h-24 text-zinc-400 dark:text-zinc-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.6 6.62c-1.44 0-2.8.56-3.77 1.53L12 10.66 10.48 12h.01L7.8 14.39c-.64.64-1.49.99-2.4.99-1.87 0-3.39-1.51-3.39-3.38S3.53 8.62 5.4 8.62c.91 0 1.76.35 2.44 1.03l1.13 1 1.51-1.34L9.22 8.2C8.2 7.18 6.84 6.62 5.4 6.62 2.42 6.62 0 9.04 0 12s2.42 5.38 5.4 5.38c1.44 0 2.8-.56 3.77-1.53l2.83-2.5.01.01L13.52 12h-.01l2.69-2.39c.64-.64 1.49-.99 2.4-.99 1.87 0 3.39 1.51 3.39 3.38s-1.52 3.38-3.39 3.38c-.9 0-1.76-.35-2.44-1.03l-1.14-1.01-1.51 1.34 1.27 1.12c1.02 1.01 2.37 1.57 3.82 1.57 2.98 0 5.4-2.41 5.4-5.38s-2.42-5.37-5.4-5.37z"/>
                </svg>
              </div>
            </div>

            {/* Right card - right aligned */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="flex items-start gap-4 mb-6 flex-row-reverse">
                  <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                      Transparent Token ERC-20
                    </h3>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/30 rounded-full">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Public Transparency</span>
                    </div>
                  </div>
                </div>
                <ul className="space-y-3 text-right">
                  <li className="flex items-start gap-3 flex-row-reverse">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Balance fully visible on-chain</span>
                  </li>
                  <li className="flex items-start gap-3 flex-row-reverse">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Transaction records public and transparent</span>
                  </li>
                  <li className="flex items-start gap-3 flex-row-reverse">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Standard ERC-20 compatible</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <MintToken />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div>
              <ConfidentialTransfer />
            </div>
            <div>
              <PlainTransfer />
            </div>
          </div>

          <div className="mt-8">
            <ConversionHistory />
          </div>
        </main>
      </div>
    </div>
  );
}
