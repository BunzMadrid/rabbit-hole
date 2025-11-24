'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'
import { getErrorMessage } from '@/lib/utils'

export function MintToken() {
  const { address, isConnected } = useAccount()
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [copied, setCopied] = useState(false)

  const { data: tokenName } = useReadContract({
    address: CONTRACTS.RABBITHOLE_TOKEN.address,
    abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
    functionName: 'name',
  })

  const { data: tokenSymbol } = useReadContract({
    address: CONTRACTS.RABBITHOLE_TOKEN.address,
    abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
    functionName: 'symbol',
  })

  const { writeContractAsync, data: hash, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const handleMint = async () => {
    if (!address) return

    try {
      await writeContractAsync({
        address: CONTRACTS.RABBITHOLE_TOKEN.address,
        abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
        functionName: 'mintTo',
        args: [address],
      })
    } catch (error) {
      const message = getErrorMessage(error)
      setToastMessage(message)
      setToastType(message === 'Transaction cancelled' ? 'success' : 'error')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  useEffect(() => {
    if (isSuccess && hash) {
      setToastMessage('Mint successful!')
      setToastType('success')
      setShowToast(true)
      const timer = setTimeout(() => setShowToast(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess, hash])

  const copyAddress = () => {
    navigator.clipboard.writeText(CONTRACTS.RABBITHOLE_TOKEN.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (!isConnected) {
    return null
  }

  return (
    <>
      <div className="max-w-4xl mx-auto group relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {tokenName || 'RabbitHole Token'}
                  </h3>
                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-full">
                    {tokenSymbol || 'RHT'}
                  </span>
                  <button
                    onClick={copyAddress}
                    className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    title={CONTRACTS.RABBITHOLE_TOKEN.address}
                  >
                    <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">{formatAddress(CONTRACTS.RABBITHOLE_TOKEN.address)}</span>
                    {copied ? (
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Mint Amount: <span className="font-semibold text-emerald-600 dark:text-emerald-400">10,000</span> {tokenSymbol} <span className="text-xs text-zinc-500 dark:text-zinc-500">(Demo Token)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleMint}
                disabled={isPending || isConfirming}
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPending || isConfirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{isPending ? 'Mint...' : 'Confirming...'}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Mint</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5 duration-300">
          <div className={`px-6 py-3 rounded-lg shadow-lg border ${
            toastType === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-3">
              {toastType === 'success' ? (
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className={`text-sm font-medium ${
                toastType === 'success'
                  ? 'text-emerald-900 dark:text-emerald-100'
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {toastMessage}
              </span>
              <button
                onClick={() => setShowToast(false)}
                className={`ml-2 ${
                  toastType === 'success'
                    ? 'text-emerald-400 hover:text-emerald-600'
                    : 'text-red-400 hover:text-red-600'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
