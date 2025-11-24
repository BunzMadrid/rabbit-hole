'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { parseUnits, parseEventLogs } from 'viem'
import { CONTRACTS } from '@/config/contracts'
import { useFHEVM } from '@/components/providers/FHEVMProvider'

export function ConvertToPlain() {
  const { address, isConnected } = useAccount()
  const { instance } = useFHEVM()
  const publicClient = usePublicClient()
  const [convertAmount, setConvertAmount] = useState('')
  const [isConverting, setIsConverting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const isProcessingRef = useRef(false)

  const { writeContractAsync, data: hash, isPending, isSuccess } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

  const bytesToHex = (bytes: Uint8Array): `0x${string}` => {
    return `0x${Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')}` as `0x${string}`
  }

  const handleConvertToPlain = async () => {
    if (!instance || !address) {
      console.error('[Conversion] Missing dependencies')
      setToastMessage('Wallet not connected or FHE not initialized')
      setToastType('error')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
      return
    }

    if (!convertAmount || parseFloat(convertAmount) <= 0) {
      console.error('[Conversion] Invalid amount:', convertAmount)
      setToastMessage('Please enter a valid conversion amount')
      setToastType('error')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
      return
    }

    console.log('[Conversion] Starting conversion...', { convertAmount, address })
    setIsConverting(true)
    
    try {
      const amountInWei = parseUnits(convertAmount, 6)
      console.log('[Conversion] Amount in wei:', amountInWei.toString())
      
      setToastMessage('Step 1/3: Preparing conversion...')
      setToastType('success')
      setShowToast(true)
      
      console.log('[Conversion] Creating encrypted input...')
      const encryptedInput = await (instance as any)
        .createEncryptedInput(CONTRACTS.RABBITHOLE_TOKEN.address, address)
        .add64(Number(amountInWei))
        .encrypt()

      console.log('[Conversion] Encrypted input created:', {
        handle: encryptedInput.handles[0],
        proofLength: encryptedInput.inputProof.length
      })

      const handleHex = encryptedInput.handles[0] instanceof Uint8Array 
        ? bytesToHex(encryptedInput.handles[0])
        : encryptedInput.handles[0]

      const proofHex = encryptedInput.inputProof instanceof Uint8Array
        ? bytesToHex(encryptedInput.inputProof)
        : encryptedInput.inputProof

      console.log('[Conversion] Converted to hex:', { handle: handleHex, proofLength: proofHex.length })
      console.log('[Conversion] Sending transaction to prepareConvertToPlain...')
      
      const txHash = await writeContractAsync({
        address: CONTRACTS.RABBITHOLE_TOKEN.address,
        abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
        functionName: 'prepareConvertToPlain',
        args: [handleHex, proofHex],
      } as any)
      console.log('[Conversion] Transaction sent, hash:', txHash)
    } catch (error) {
      console.error('[Conversion] Error in handleConvertToPlain:', error)
      const message = error instanceof Error ? error.message : 'Conversion failed'
      setToastMessage(message)
      setToastType('error')
      setShowToast(true)
      setIsConverting(false)
    }
  }

  const handleConversionFlow = useCallback(async (txHash: `0x${string}`) => {
    if (!instance || !publicClient) {
      console.error('[ConversionFlow] Missing dependencies')
      return
    }
    
    if (isProcessingRef.current) {
      console.warn('[ConversionFlow] Already processing, skipping...')
      return
    }
    
    console.log('[ConversionFlow] Starting conversion flow with hash:', txHash)
    isProcessingRef.current = true
    
    try {
      setToastMessage('Step 2/3: Waiting for transaction confirmation...')
      setToastType('success')
      setShowToast(true)

      console.log('[ConversionFlow] Waiting for transaction receipt...')
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      console.log('[ConversionFlow] Transaction confirmed:', receipt.status)
      
      const events = parseEventLogs({
        abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
        logs: receipt.logs,
        eventName: 'ConversionRequested'
      })

      console.log('[ConversionFlow] Parsed events:', events.length)

      if (events.length === 0) {
        console.error('[ConversionFlow] No ConversionRequested event found')
        throw new Error('Conversion event not found')
      }

      const handle = events[0].args.handle as string
      console.log('[ConversionFlow] handle:', handle)

      setToastMessage('Step 3/3: Public decryption...')
      
      console.log('[ConversionFlow] Calling publicDecrypt with handle:', handle)
      
      let decryptResult
      try {
        decryptResult = await Promise.race([
          (instance as any).publicDecrypt([handle]),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('publicDecrypt timeout (30s)')), 30000)
          )
        ])
      } catch (decryptError) {
        console.error('[ConversionFlow] publicDecrypt error:', decryptError)
        throw new Error(`Public decryption failed: ${decryptError instanceof Error ? decryptError.message : String(decryptError)}`)
      }
      
      console.log('[ConversionFlow] Decryption result:', {
        hasAbiEncodedClearValues: !!decryptResult.abiEncodedClearValues,
        hasDecryptionProof: !!decryptResult.decryptionProof,
        clearValues: decryptResult.clearValues
      })

      const cleartextAmount = decryptResult.clearValues[handle] as bigint
      console.log('[ConversionFlow] Cleartext amount:', cleartextAmount.toString())

      console.log('[ConversionFlow] Finalizing conversion...')
      await writeContractAsync({
        address: CONTRACTS.RABBITHOLE_TOKEN.address,
        abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
        functionName: 'finalizeConversion',
        args: [
          handle,
          cleartextAmount,
          decryptResult.decryptionProof
        ],
      } as any)

      console.log('[ConversionFlow] Finalization transaction sent')
      setIsConverting(false)
      setConvertAmount('')
      isProcessingRef.current = false
      
      setToastMessage('Conversion completed successfully!')
      setToastType('success')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
    } catch (error) {
      console.error('[ConversionFlow] Error:', error)
      const message = error instanceof Error ? error.message : 'Auto-completion failed'
      setToastMessage(`Error: ${message}`)
      setToastType('error')
      setShowToast(true)
      setIsConverting(false)
      isProcessingRef.current = false
    }
  }, [instance, publicClient, writeContractAsync])

  useEffect(() => {
    if (isSuccess && hash && isConverting) {
      console.log('[Effect] Triggering conversion flow...')
      handleConversionFlow(hash)
    }
  }, [isSuccess, hash, isConverting, handleConversionFlow])

  if (!isConnected) {
    return null
  }

  return (
    <>
      <div className="group relative h-full">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl hover:shadow-2xl transition-all duration-300 h-full">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                Convert to Plain Token
              </h3>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/30 rounded-full">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">ERC-7984 → ERC-20</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Conversion Amount
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  placeholder="Enter confidential token amount"
                  disabled={isPending || isConfirming || isConverting}
                  className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                />
                <button
                  onClick={handleConvertToPlain}
                  disabled={!convertAmount || isPending || isConfirming || isConverting || !instance}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isConverting ? 'Converting...' : (isPending || isConfirming ? 'Confirming...' : 'Start Conversion')}
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Convert confidential tokens (ERC-7984) to publicly visible ERC-20 tokens
              </p>
            </div>
          </div>
        </div>
      </div>

      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5 duration-300">
          <div className={`px-6 py-3 rounded-lg shadow-lg border ${
            toastType === 'success'
              ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-3">
              {toastType === 'success' ? (
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className={`text-sm font-medium ${
                toastType === 'success'
                  ? 'text-purple-900 dark:text-purple-100'
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {toastMessage}
              </span>
              <button
                onClick={() => setShowToast(false)}
                className={`ml-2 ${
                  toastType === 'success'
                    ? 'text-purple-400 hover:text-purple-600'
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