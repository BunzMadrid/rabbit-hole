'use client'

interface ConversionStep {
  id: number
  title: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'error'
}

interface ConversionProgressModalProps {
  isOpen: boolean
  onClose: () => void
  currentStep: number
  error?: string
  steps?: ConversionStep[]
}

const defaultSteps: ConversionStep[] = [
  {
    id: 1,
    title: 'Prepare Data',
    description: 'Encrypt conversion amount',
    status: 'pending'
  },
  {
    id: 2,
    title: 'Submit Transaction',
    description: 'Wallet confirmation required (1st)',
    status: 'pending'
  },
  {
    id: 3,
    title: 'Decryption Processing',
    description: 'Gateway service verification',
    status: 'pending'
  },
  {
    id: 4,
    title: 'Complete Conversion',
    description: 'Wallet confirmation required (2nd)',
    status: 'pending'
  }
]

export function ConversionProgressModal({
  isOpen,
  onClose,
  currentStep,
  error,
  steps = defaultSteps
}: ConversionProgressModalProps) {
  
  // Update step status
  const getStepsWithStatus = (): ConversionStep[] => {
    return steps.map((step, index) => {
      if (error && index === currentStep - 1) {
        return { ...step, status: 'error' }
      }
      if (index < currentStep - 1) {
        return { ...step, status: 'completed' }
      }
      if (index === currentStep - 1) {
        return { ...step, status: 'processing' }
      }
      return { ...step, status: 'pending' }
    })
  }

  const stepsWithStatus = getStepsWithStatus()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={currentStep === 0 || currentStep > 4 || error ? onClose : undefined}
      />
      
      {/* Modal content */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-300">
        {/* Close button (only shown when completed or error) */}
        {(currentStep === 0 || currentStep > 4 || error) && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        <div className="space-y-6">
          {/* Title */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
              Convert Confidential Token to Plain Token
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {currentStep === 2 ? 'Please confirm the 1st transaction in wallet' : ''}
              {currentStep === 4 ? 'Please confirm the 2nd transaction in wallet' : ''}
              {currentStep === 1 || currentStep === 3 ? 'Processing, please wait...' : ''}
              {currentStep === 0 ? 'Conversion completed!' : ''}
              {error ? 'Error occurred during conversion' : ''}
            </p>
          </div>

          {/* Step indicator */}
          <div className="space-y-4">
            {stepsWithStatus.map((step, index) => (
              <div key={step.id}>
                <div className="flex items-start gap-4">
                  {/* Step icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {step.status === 'completed' ? (
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : step.status === 'processing' ? (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      </div>
                    ) : step.status === 'error' ? (
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{step.id}</span>
                      </div>
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-medium ${
                          step.status === 'completed' 
                            ? 'text-zinc-700 dark:text-zinc-300'
                            : step.status === 'processing'
                            ? 'text-blue-700 dark:text-blue-300'
                            : step.status === 'error'
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}>
                          {step.title}
                        </h4>
                        {(step.id === 2 || step.id === 4) && (
                          <svg className="w-4 h-4 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <p className={`text-xs mt-0.5 ${
                      (step.id === 2 || step.id === 4) 
                        ? 'text-amber-600 dark:text-amber-400 font-medium'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Arrow connector */}
                {index < stepsWithStatus.length - 1 && (
                  <div className="flex items-center ml-4 my-2">
                    <div className={`w-0.5 h-8 ${
                      step.status === 'completed' ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'
                    }`}>
                      <svg className={`w-4 h-4 -ml-2 mt-6 ${
                        step.status === 'completed' ? 'text-emerald-500' : 'text-zinc-300 dark:text-zinc-600'
                      }`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 10l5 5 5-5H7z"/>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="space-y-3">
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-xs text-amber-700 dark:text-amber-300">
                    <p className="font-semibold mb-1">How to handle failed conversions:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Go to &ldquo;Pending Conversions&rdquo; to check status</li>
                      <li>Click &ldquo;Retry&rdquo; to try again</li>
                      <li>Or click &ldquo;Cancel&rdquo; to restore tokens</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success message */}
          {currentStep === 0 && !error && (
            <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Conversion successful! Your plain balance has been updated.
              </p>
            </div>
          )}

          {/* Action buttons */}
          {(currentStep === 0 || error) && (
            <div className="flex justify-center mt-6">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gradient-to-r from-zinc-600 to-zinc-700 hover:from-zinc-700 hover:to-zinc-800 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                Close
              </button>
            </div>
          )}

          {/* Progress hint */}
          {currentStep > 0 && currentStep <= 4 && !error && (
            <div className="text-center space-y-2">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Do not close this window, conversion in progress...
              </p>
              <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <span className="font-semibold">Tip:</span> If conversion fails or is interrupted, you can retry or cancel in &ldquo;Pending Conversions&rdquo; to restore tokens
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
