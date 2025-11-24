export const FHEVM_CONFIG = {
  aclContractAddress: '0x687820221192C5B662b25367F70076A37bc79b6c',
  kmsContractAddress: '0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC',
  inputVerifierContractAddress: '0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4',
  verifyingContractAddressDecryption: '0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1',
  verifyingContractAddressInputVerification: '0x7048C39f048125eDa9d678AEbaDfB22F7900a29F',
  chainId: 11155111,
  gatewayChainId: 55815,
  relayerUrl: 'https://relayer.testnet.zama.cloud',
} as const

export interface EncryptedInput {
  add64(value: number | bigint): EncryptedInput
  addAddress(address: string): EncryptedInput
  encrypt(): Promise<{
    handles: string[]
    inputProof: string
  }>
}

export type FhevmInstance = {
  publicDecrypt: (handles: (string | Uint8Array)[]) => Promise<{
    clearValues: Record<`0x${string}`, bigint | boolean | `0x${string}`>
    abiEncodedClearValues: `0x${string}`
    decryptionProof: `0x${string}`
  }>
  encrypt64: (value: number | bigint) => Promise<{
    handles: string[]
    inputProof: string
  }>
  createEncryptedInput: (contractAddress: string, userAddress: string) => EncryptedInput
  generateToken: () => Promise<string>
}

declare global {
  interface Window {
    RelayerSDK?: {
      initSDK: () => Promise<void>
      createInstance: (config: typeof FHEVM_CONFIG & { network: unknown }) => Promise<FhevmInstance>
      SepoliaConfig: typeof FHEVM_CONFIG
    }
    relayerSDK?: {
      initSDK: () => Promise<void>
      createInstance: (config: typeof FHEVM_CONFIG & { network: unknown }) => Promise<FhevmInstance>
      SepoliaConfig: typeof FHEVM_CONFIG
    }
    zamaRelayerSDK?: {
      initSDK: () => Promise<void>
      createInstance: (config: typeof FHEVM_CONFIG & { network: unknown }) => Promise<FhevmInstance>
      SepoliaConfig: typeof FHEVM_CONFIG
    }
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on?: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
      isMetaMask?: boolean
    }
  }
}
