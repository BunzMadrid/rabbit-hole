'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'
import { parseUnits, isAddress } from 'viem'
import { getErrorMessage } from '@/lib/utils'
import { conversionEvents } from '@/lib/events'

export function PlainTransfer() {
  const { address, isConnected } = useAccount()
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [convertAmount, setConvertAmount] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.RABBITHOLE_TOKEN.address,
    abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  const { writeContract, data: hash, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const formatBalance = (bal: bigint | undefined) => {
    if (!bal) return '0.00'
    return (Number(bal) / 1_000_000).toFixed(2)
  }

  const handleConvertToConfidential = async () => {
    if (!convertAmount || parseFloat(convertAmount) <= 0) {
      setToastMessage('Please enter a valid conversion amount')
      setToastType('error')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
      return
    }

    try {
      const amountInWei = parseUnits(convertAmount, 6)
      
      writeContract({
        address: CONTRACTS.RABBITHOLE_TOKEN.address,
        abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
        functionName: 'convertToConfidential',
        args: [amountInWei] as any,
      })
    } catch (error) {
      const message = getErrorMessage(error)
      setToastMessage(message)
      setToastType(message === 'Transaction cancelled' ? 'success' : 'error')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  const handleTransfer = async () => {
    if (!toAddress || !isAddress(toAddress)) {
      setToastMessage('Please enter a valid address')
      setToastType('error')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setToastMessage('Please enter a valid amount')
      setToastType('error')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
      return
    }

    try {
      const amountInWei = parseUnits(amount, 6)
      
      writeContract({
        address: CONTRACTS.RABBITHOLE_TOKEN.address,
        abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
        functionName: 'transfer',
        args: [toAddress, amountInWei],
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
      // Use setTimeout to avoid synchronous setState
      setTimeout(() => {
        setToastMessage('Operation successful!')
        setToastType('success')
        setShowToast(true)
        setToAddress('')
        setAmount('')
        setConvertAmount('')
      }, 0)
      
      const timer = setTimeout(() => {
        setShowToast(false)
        refetchBalance()
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [isSuccess, hash, refetchBalance])
  
  useEffect(() => {
    const handleRefreshBalance = () => {
      refetchBalance()
    }
    
    conversionEvents.on('refreshPlainBalance', handleRefreshBalance)
    
    return () => {
      conversionEvents.off('refreshPlainBalance', handleRefreshBalance)
    }
  }, [refetchBalance])

  if (!isConnected) {
    return null
  }

  return (
    <>
      <div className="group relative h-full">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl hover:shadow-2xl transition-all duration-300 h-full">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                Plain Token Transfer
              </h3>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">ERC-20</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Plain Balance: <span className="font-semibold">{formatBalance(balance as bigint)}</span> RHT
                </span>
                <button
                  onClick={async () => {
                    setIsRefreshing(true)
                    await refetchBalance()
                    setTimeout(() => setIsRefreshing(false), 1000)
                  }}
                  disabled={isRefreshing}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors disabled:cursor-not-allowed"
                  title="Refresh balance"
                >
                  <svg 
                    className={`w-4 h-4 text-zinc-500 dark:text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Convert to ERC-7984 (Confidential Token)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  placeholder="Conversion amount"
                  disabled={isPending || isConfirming}
                  className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                />
                <button
                  onClick={handleConvertToConfidential}
                  disabled={!convertAmount || isPending || isConfirming}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isPending || isConfirming ? (isPending ? 'Converting...' : 'Confirming...') : 'Convert'}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-500">
                Convert plain tokens to encrypted confidential tokens
              </p>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Recipient Address</label>
              <input
                type="text"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="0x..."
                disabled={isPending || isConfirming}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Transfer Amount</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={isPending || isConfirming}
                  className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                />
                <button
                  onClick={handleTransfer}
                  disabled={!toAddress || !amount || isPending || isConfirming}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isPending || isConfirming ? (isPending ? 'Sending...' : 'Confirming...') : 'Transfer'}
                </button>
              </div>
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
