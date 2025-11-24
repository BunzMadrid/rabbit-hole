/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error'
  
  const errorStr = error instanceof Error ? error.message : String(error)
  
  // User cancelled transaction
  if (errorStr.includes('User denied') || 
      errorStr.includes('User rejected') || 
      errorStr.includes('denied request') ||
      errorStr.includes('rejected request')) {
    return 'Transaction cancelled'
  }
  
  // Insufficient balance
  if (errorStr.includes('insufficient funds') || 
      errorStr.includes('insufficient balance')) {
    return 'Insufficient balance'
  }
  
  // Network error
  if (errorStr.includes('network') || 
      errorStr.includes('Network')) {
    return 'Network error, please check connection'
  }
  
  // Contract execution failed
  if (errorStr.includes('execution reverted') || 
      errorStr.includes('contract execution')) {
    return 'Contract execution failed'
  }
  
  // Gas related
  if (errorStr.includes('gas') || 
      errorStr.includes('Gas')) {
    return 'Gas estimation failed'
  }
  
  // Other errors, return simplified message
  if (errorStr.length > 100) {
    return 'Operation failed, please retry'
  }
  
  return errorStr
}
