'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { useWriteContract } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'
import { useFHEVM } from '@/components/providers/FHEVMProvider'
import { getErrorMessage } from '@/lib/utils'
import { conversionEvents } from '@/lib/events'

export function ConversionHistory() {
  const { address } = useAccount()
  const { instance } = useFHEVM()
  const publicClient = usePublicClient()
  const { writeContractAsync, isPending } = useWriteContract()
  
  const [conversionHistory, setConversionHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  
  // Load conversion history
  const loadConversionHistory = useCallback(async () => {
    if (!publicClient || !address) return
    
    setLoadingHistory(true)
    try {
      // Get user's pending conversion IDs (only returns locked ones that need processing)
      const pendingIds = await publicClient.readContract({
        address: CONTRACTS.RABBITHOLE_TOKEN.address,
        abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
        functionName: 'getUserPendingConversions',
        args: [address],
      }) as bigint[]
      
      // If no pending conversions, return empty array directly
      if (!pendingIds || pendingIds.length === 0) {
        setConversionHistory([])
        return
      }
      
      // Get details for each pending conversion
      const historyData = await Promise.all(
        pendingIds.map(async (id) => {
          const info = await publicClient.readContract({
            address: CONTRACTS.RABBITHOLE_TOKEN.address,
            abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
            functionName: 'getConversionInfo',
            args: [id],
          }) as any
          
          return {
            id: id.toString(),
            requester: info[0],
            handle: info[1],
            isPending: info[2],
            timestamp: Number(info[3]),
          }
        })
      )
      
      // Double check: only keep conversions that are truly pending
      const pendingHistory = historyData.filter(item => item.isPending === true)
      
      // Sort by time in descending order
      pendingHistory.sort((a, b) => b.timestamp - a.timestamp)
      setConversionHistory(pendingHistory)
    } catch {
      // Failed to load history, fail silently
    } finally {
      setLoadingHistory(false)
    }
  }, [publicClient, address])
  
  // Auto load history
  useEffect(() => {
    loadConversionHistory()
  }, [address, publicClient, loadConversionHistory])
  
  // Listen to refresh events
  useEffect(() => {
    const handleRefresh = () => {
      loadConversionHistory()
    }
    
    conversionEvents.on('refresh', handleRefresh)
    
    return () => {
      conversionEvents.off('refresh', handleRefresh)
    }
  }, [loadConversionHistory])
  
  if (!address) {
    return null
  }
  
  return (
    <>
      <div className="group relative h-full">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl hover:shadow-2xl transition-all duration-300 h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center shadow">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Pending Conversions</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Conversions that need retry or cancellation</p>
              </div>
            </div>
          </div>
        
        <div className="space-y-2">
          {loadingHistory ? (
            <div className="text-center py-8 text-zinc-500">Loading...</div>
          ) : conversionHistory.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <p className="text-sm">No pending conversions</p>
              <p className="text-xs mt-1 text-zinc-400">All conversions completed</p>
            </div>
          ) : (
            conversionHistory.map((conversion: any) => (
              <div key={conversion.id} className="bg-yellow-50 dark:bg-yellow-950/30 rounded p-2 border border-yellow-200 dark:border-yellow-800">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                      #{conversion.id}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                      <span>
                        <span className="font-medium">Handle:</span>{' '}
                        <code className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded">
                          {conversion.handle.slice(0, 8)}...{conversion.handle.slice(-6)}
                        </code>
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-600">|</span>
                      <span>{new Date(conversion.timestamp * 1000).toLocaleString('en-US', { 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true
                      })}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            // Get handles
                            const handles = await publicClient?.readContract({
                              address: CONTRACTS.RABBITHOLE_TOKEN.address,
                              abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
                              functionName: 'getConversionHandles',
                              args: [BigInt(conversion.id)],
                            } as any) as string[]
                            
                            // Decrypt
                            const decryptResult = await (instance as any).publicDecrypt(handles)
                            
                            let cleartextAmount: bigint
                            const handle = handles[0]
                            if (decryptResult.clearValues[handle]) {
                              cleartextAmount = decryptResult.clearValues[handle] as bigint
                            } else {
                              const firstKey = Object.keys(decryptResult.clearValues)[0]
                              cleartextAmount = decryptResult.clearValues[firstKey] as bigint
                            }
                            
                            // Complete conversion
                            await writeContractAsync({
                              address: CONTRACTS.RABBITHOLE_TOKEN.address,
                              abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
                              functionName: 'finalizeConversion',
                              args: [handle, cleartextAmount, decryptResult.decryptionProof],
                            } as any)
                            
                            setToastMessage('Conversion completed successfully')
                            setToastType('success')
                            setShowToast(true)
                            setTimeout(() => setShowToast(false), 5000)
                            
                            // Retry successful, trigger plain balance refresh
                            conversionEvents.emit('refreshPlainBalance')
                            
                            // Refresh pending list
                            await loadConversionHistory()
                          } catch (error) {
                            const message = getErrorMessage(error)
                            setToastMessage(message)
                            setToastType(message === 'Transaction cancelled' ? 'success' : 'error')
                            setShowToast(true)
                            setTimeout(() => setShowToast(false), 3000)
                          }
                        }}
                        disabled={!instance || isPending}
                        className="px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Retry
                      </button>
                      <span className="text-zinc-300 dark:text-zinc-700">|</span>
                      <button
                        onClick={async () => {
                          try {
                            await writeContractAsync({
                              address: CONTRACTS.RABBITHOLE_TOKEN.address,
                              abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
                              functionName: 'cancelConversion',
                              args: [BigInt(conversion.id)],
                            } as any)
                            
                            setToastMessage('Conversion cancelled, tokens refunded')
                            setToastType('success')
                            setShowToast(true)
                            setTimeout(() => setShowToast(false), 5000)
                            
                            // Refresh history
                            await loadConversionHistory()
                          } catch (error) {
                            const message = getErrorMessage(error)
                            setToastMessage(message)
                            setToastType(message === 'Transaction cancelled' ? 'success' : 'error')
                            setShowToast(true)
                            setTimeout(() => setShowToast(false), 3000)
                          }
                        }}
                        disabled={isPending}
                        className="px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="mt-4">
          <button
            onClick={loadConversionHistory}
            disabled={loadingHistory || !publicClient || !address}
            className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Refresh Pending List
          </button>
        </div>
        </div>
      </div>
      
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`max-w-sm rounded-lg shadow-lg p-4 ${
            toastType === 'success'
              ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
              : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start">
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  toastType === 'success'
                    ? 'text-blue-900 dark:text-blue-100'
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {toastMessage}
                </p>
              </div>
              <button
                onClick={() => setShowToast(false)}
                className={`ml-2 ${
                  toastType === 'success'
                    ? 'text-blue-400 hover:text-blue-600'
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
