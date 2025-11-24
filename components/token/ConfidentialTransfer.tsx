'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAccount, useWalletClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'
import { parseUnits, isAddress, bytesToHex, parseEventLogs } from 'viem'
import { useFHEVM } from '@/components/providers/FHEVMProvider'
import { usePublicClient } from 'wagmi'
import { getErrorMessage } from '@/lib/utils'
import { conversionEvents } from '@/lib/events'
import { ConversionProgressModal } from '@/components/ui/ConversionProgressModal'

export function ConfidentialTransfer() {
  const { address, isConnected } = useAccount()
  const { instance } = useFHEVM()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [convertAmount, setConvertAmount] = useState('')
  const [balance, setBalance] = useState<string>('Encrypting...')
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [isConverting, setIsConverting] = useState(false)
  const isProcessingRef = useRef(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [conversionStep, setConversionStep] = useState(0)
  const [conversionError, setConversionError] = useState<string | undefined>()
  const [currentConversionHash, setCurrentConversionHash] = useState<`0x${string}` | null>(null)

  const { writeContractAsync, data: hash, isPending, error: writeError } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    if (writeError) {
      const message = getErrorMessage(writeError)
      setToastMessage(message)
      setToastType(message === 'Transaction cancelled' ? 'success' : 'error')
      setShowToast(true)
      setIsConverting(false)
      setShowProgressModal(false)  // Close progress modal
      setConversionError(undefined)
      setTimeout(() => setShowToast(false), 3000)
    }
  }, [writeError])

  const handleQueryBalance = async () => {
    if (!instance || !address || !publicClient || !walletClient) {
      setToastMessage('Please connect wallet and initialize FHEVM')
      setToastType('error')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
      return
    }

    setIsLoadingBalance(true)
    try {
      const balanceHandle = await publicClient.readContract({
        address: CONTRACTS.RABBITHOLE_TOKEN.address,
        abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
        functionName: 'confidentialBalanceOf',
        args: [address],
      }) as string
      
      // If handle is all zeros, balance is 0, no decryption needed
      if (!balanceHandle || balanceHandle === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        setBalance('0.00')
        setIsLoadingBalance(false)
        return
      }
      
      let decryptedBalance: bigint | number
      
      try {
        const maybeSimple = (instance as any).userDecrypt as (
          encryptedValue: string,
          contractAddress: string
        ) => Promise<number | bigint>
        
        decryptedBalance = await maybeSimple(balanceHandle, CONTRACTS.RABBITHOLE_TOKEN.address)
      } catch {
        const keypair = (instance as any).generateKeypair()
        const startTimeStamp = Math.floor(Date.now() / 1000).toString()
        const durationDays = '1'
        
        const eip712 = (instance as any).createEIP712(
          keypair.publicKey,
          [CONTRACTS.RABBITHOLE_TOKEN.address],
          startTimeStamp,
          durationDays
        )
        
        const signature = await walletClient.signTypedData({
          account: walletClient.account!,
          domain: eip712.domain as any,
          types: eip712.types as any,
          primaryType: 'UserDecryptRequestVerification',
          message: eip712.message as any,
        })
        
        const handleContractPairs = [{ handle: balanceHandle, contractAddress: CONTRACTS.RABBITHOLE_TOKEN.address }]
        const userDecryptLegacy = (instance as any).userDecrypt as (
          handleContractPairs: Array<{ handle: unknown; contractAddress: string }>,
          privateKey: string,
          publicKey: string,
          signature: string,
          contractAddresses: string[],
          userAddress: string,
          startTimeStamp: string,
          durationDays: string
        ) => Promise<Record<string, bigint | string>>
        
        const result = await userDecryptLegacy(
          handleContractPairs,
          keypair.privateKey,
          keypair.publicKey,
          signature.replace('0x', ''),
          [CONTRACTS.RABBITHOLE_TOKEN.address],
          address,
          startTimeStamp,
          durationDays
        )
        
        decryptedBalance = result[balanceHandle] as bigint
      }
      
      const balanceInTokens = (Number(decryptedBalance) / 1_000_000).toFixed(2)
      setBalance(balanceInTokens)
    } catch (error) {
      const message = getErrorMessage(error)
      setToastMessage(message)
      setToastType('error')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
      setBalance('Query failed')
    } finally {
      setIsLoadingBalance(false)
    }
  }

  const handleTransfer = async () => {
    if (!instance || !address) {
      setToastMessage('Please connect wallet and initialize FHEVM')
      setToastType('error')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
      return
    }

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
      
      const encryptedInput = await (instance as any)
        .createEncryptedInput(CONTRACTS.RABBITHOLE_TOKEN.address, address)
        .add64(Number(amountInWei))
        .encrypt()

      const handle = encryptedInput.handles[0] instanceof Uint8Array 
        ? bytesToHex(encryptedInput.handles[0])
        : encryptedInput.handles[0]

      const proof = encryptedInput.inputProof instanceof Uint8Array
        ? bytesToHex(encryptedInput.inputProof)
        : encryptedInput.inputProof

      await writeContractAsync({
        address: CONTRACTS.RABBITHOLE_TOKEN.address,
        abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
        functionName: 'confidentialTransfer',
        args: [toAddress, handle, proof],
      } as any)
    } catch (error) {
      const message = getErrorMessage(error)
      setToastMessage(message)
      setToastType(message === 'Transaction cancelled' ? 'success' : 'error')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  const handleConvertToPlain = async () => {
    if (!instance || !address || !publicClient) {
      setToastMessage('Please connect wallet and initialize FHEVM')
      setToastType('error')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
      return
    }

    if (!convertAmount || parseFloat(convertAmount) <= 0) {
      setToastMessage('Please enter a valid conversion amount')
      setToastType('error')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 5000)
      return
    }

    // Show modal immediately, starting from step 1
    setIsConverting(true)
    setShowProgressModal(true)
    setConversionStep(1)
    setConversionError(undefined)
    
    // Use small delay to ensure modal renders, faster than before
    setTimeout(async () => {
      try {
        const amountInWei = parseUnits(convertAmount, 6)
        
        // Step 1: Frontend encryption
        const encryptedInput = await (instance as any)
          .createEncryptedInput(CONTRACTS.RABBITHOLE_TOKEN.address, address)
          .add64(Number(amountInWei))
          .encrypt()

        const handleHex = encryptedInput.handles[0] instanceof Uint8Array 
          ? bytesToHex(encryptedInput.handles[0])
          : encryptedInput.handles[0]

        const proofHex = encryptedInput.inputProof instanceof Uint8Array
          ? bytesToHex(encryptedInput.inputProof)
          : encryptedInput.inputProof

        
        if (!CONTRACTS.RABBITHOLE_TOKEN.address) {
          throw new Error('Contract address not configured! Please check environment variable NEXT_PUBLIC_CONFIDENTIAL_CLUB_ADDRESS')
        }
        
        // Step 2: Submit to blockchain
        setConversionStep(2)
        
        const txHash = await writeContractAsync({
          address: CONTRACTS.RABBITHOLE_TOKEN.address,
          abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
          functionName: 'prepareConvertToPlain',
          args: [handleHex, proofHex],
        } as any)
        
        // Save current conversion transaction hash
        setCurrentConversionHash(txHash)
        
        // Conversion submitted, waiting for processing
      } catch (error) {
        const message = getErrorMessage(error)
        setConversionError(message)
        setIsConverting(false)
        if (message === 'Transaction cancelled') {
          setShowProgressModal(false)
          setToastMessage(message)
          setToastType('success')
          setShowToast(true)
          setTimeout(() => setShowToast(false), 3000)
        }
      }
    }, 50) // 50ms delay to ensure modal renders, half of the previous 100ms
  }

  const handleConversionFlow = useCallback(async (txHash: `0x${string}`) => {
    if (!instance || !publicClient) {
      return
    }
    
    if (isProcessingRef.current) {
      return
    }
    
    isProcessingRef.current = true
    
    try {
      // Step 2 submitted, waiting for transaction confirmation
      setToastMessage('Step 1/3: Waiting for transaction confirmation...')
      setToastType('success')
      setShowToast(true)

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      
      const logs = parseEventLogs({
        abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
        logs: receipt.logs,
        eventName: 'ConversionRequested'
      })

      if (logs.length === 0) {
        throw new Error('Conversion event not found')
      }

      const handle = logs[0].args.handle as `0x${string}`
      
      // Step 3: Decryption processing
      setConversionStep(3)
      setToastMessage('Step 3/3: Public decryption...')
      
      let decryptResult
      let retries = 0
      const maxRetries = 3
      
      while (retries < maxRetries) {
        try {
          // Direct call, not using Promise.race timeout
          decryptResult = await (instance as any).publicDecrypt([handle])
          break
        } catch {
          retries++
          
          if (retries >= maxRetries) {
            
            setToastMessage(`Decryption failed, please use cancel button to recover tokens`)
            setToastType('error')
            setShowToast(true)
            
            setIsConverting(false)
            isProcessingRef.current = false
            return
          }
          
          await new Promise(resolve => setTimeout(resolve, 5000))
        }
      }
      
      if (!decryptResult) {
        throw new Error('Decryption failed: unable to get result')
      }
      
      // v0.9 specification: clearValues is a Record<handle, value>
      // May need to try different key formats
      let cleartextAmount: bigint
      if (decryptResult.clearValues[handle]) {
        cleartextAmount = decryptResult.clearValues[handle] as bigint
      } else if (decryptResult.clearValues[`0x${handle.slice(2).toLowerCase()}`]) {
        cleartextAmount = decryptResult.clearValues[`0x${handle.slice(2).toLowerCase()}`] as bigint
      } else {
        // If neither works, try to get the first value
        const firstKey = Object.keys(decryptResult.clearValues)[0]
        cleartextAmount = decryptResult.clearValues[firstKey] as bigint
      }
      
      // Ensure amount is within uint64 range
      if (cleartextAmount > BigInt(2) ** BigInt(64) - BigInt(1)) {
        throw new Error(`Amount exceeds uint64 range: ${cleartextAmount}`)
      }

      
      const decryptionProof = decryptResult.decryptionProof
      
      // Step 4: Complete conversion
      setConversionStep(4)
      setToastMessage('Transaction 2: Please confirm in wallet...')
      setToastType('success')
      setShowToast(true)
      
      const finalizeTxHash = await writeContractAsync({
        address: CONTRACTS.RABBITHOLE_TOKEN.address,
        abi: CONTRACTS.RABBITHOLE_TOKEN.abi,
        functionName: 'finalizeConversion',
        args: [
          handle,
          cleartextAmount, // Use bigint directly, wagmi will handle conversion
          decryptionProof
        ],
      } as any)
      
      // Waiting for transaction confirmation
      setToastMessage('Waiting for transaction confirmation...')
      await publicClient.waitForTransactionReceipt({ 
        hash: finalizeTxHash 
      })

      setIsConverting(false)
      setConvertAmount('')
      isProcessingRef.current = false
      
      // Show success status
      setConversionStep(0)
      
      // Successfully completed, trigger plain balance refresh
      conversionEvents.emit('refreshPlainBalance')
      
      setTimeout(() => {
        setShowProgressModal(false)
        setToastMessage('Conversion completed successfully!')
        setToastType('success')
        setShowToast(true)
        setTimeout(() => setShowToast(false), 5000)
      }, 1500)
    } catch (error) {
      const message = getErrorMessage(error)
      setConversionError(message)
      setIsConverting(false)
      isProcessingRef.current = false
      
      // Only trigger refresh when second transaction (step 4) fails or is cancelled
      if (conversionStep === 4) {
        // Second transaction failed or cancelled, trigger pending list refresh
        conversionEvents.emit('refresh')
        
        if (message === 'Transaction cancelled') {
          setShowProgressModal(false)
          setToastMessage('Second transaction cancelled, you can continue processing in pending conversions')
          setToastType('success')
          setShowToast(true)
          setTimeout(() => setShowToast(false), 3000)
        }
        // Other error cases (failures), modal will show error message
      } else if (message === 'Transaction cancelled') {
        // First transaction or other steps cancelled, do not trigger refresh
        setShowProgressModal(false)
        setToastMessage('Conversion cancelled')
        setToastType('success')
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      }
    }
  }, [instance, publicClient, writeContractAsync, conversionStep])

  useEffect(() => {
    if (!isSuccess || !hash) {
      return
    }

    // Only process current conversion transaction
    if (isConverting && currentConversionHash && hash === currentConversionHash) {
      handleConversionFlow(hash)
      setCurrentConversionHash(null) // Clear after processing
    } else if (!isConverting) {
      setToastMessage('Operation successful!')
      setToastType('success')
      setShowToast(true)
      setToAddress('')
      setAmount('')
      setTimeout(() => setShowToast(false), 5000)
    }
  }, [isSuccess, hash, isConverting, isConfirming, handleConversionFlow, currentConversionHash])

  if (!isConnected) {
    return null
  }

  return (
    // UI component
    <>
      <div className="group relative h-full">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl hover:shadow-2xl transition-all duration-300 h-full">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                Confidential Token Transfer
              </h3>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 rounded-full">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">ERC-7984</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Encrypted Balance: <span className="font-semibold">{balance}</span> RHT
                </span>
                <button
                  onClick={handleQueryBalance}
                  disabled={isLoadingBalance || !instance}
                  className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isLoadingBalance ? (
                    <>
                      <div className="w-3 h-3 border-2 border-blue-300 dark:border-blue-600 border-t-blue-600 dark:border-t-blue-300 rounded-full animate-spin"></div>
                      <span>Decrypting</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Decrypt Balance</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Convert to ERC-20 (Plain Token)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  placeholder="Conversion Amount"
                  disabled={isPending || isConfirming || isConverting}
                  className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  onClick={handleConvertToPlain}
                  disabled={!convertAmount || isPending || isConfirming || isConverting}
                  className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isConverting ? 'Processing...' : (isPending || isConfirming ? (isPending ? 'Converting...' : 'Confirming...') : 'Convert')}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-500">
                Convert confidential tokens to publicly visible ERC-20 tokens
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
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
                  className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  onClick={handleTransfer}
                  disabled={!toAddress || !amount || isPending || isConfirming || !instance}
                  className="px-5 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
              ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-3">
              {toastType === 'success' ? (
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className={`text-sm font-medium ${
                toastType === 'success'
                  ? 'text-blue-900 dark:text-blue-100'
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {toastMessage}
              </span>
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

      {/* Conversion progress modal */}
      <ConversionProgressModal
        isOpen={showProgressModal}
        onClose={() => {
          if (conversionStep === 0 || conversionError) {
            setShowProgressModal(false)
            setConversionError(undefined)
          }
        }}
        currentStep={conversionStep}
        error={conversionError}
      />
    </>
  )
}
