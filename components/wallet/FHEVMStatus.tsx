'use client'

import { useFHEVM } from '@/components/providers/FHEVMProvider'

export function FHEVMStatus() {
  const { sdkLoading, instanceLoading, instance, sdkError, instanceError } = useFHEVM()

  const isLoading = sdkLoading || instanceLoading
  const error = sdkError || instanceError
  const isReady = !!instance

  if (!isLoading && !isReady && !error) {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-medium">
      {isLoading && (
        <>
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </div>
          <span className="text-zinc-600 dark:text-zinc-400">
            {sdkLoading ? 'SDK Loading...' : 'Creating Instance...'}
          </span>
        </>
      )}
      {isReady && !isLoading && (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-zinc-600 dark:text-zinc-400">FHEVM Ready</span>
        </>
      )}
      {error && !isLoading && (
        <>
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-zinc-600 dark:text-zinc-400" title={error.message}>FHEVM Failed</span>
        </>
      )}
    </div>
  )
}
