# Rabbit Hole - Dual-Mode Privacy Token Platform

Rabbit Hole is an innovative dual-mode token system built on Zama FHEVM that supports both ERC20 (plaintext) and ERC7984 (confidential) token standards through a single smart contract. Users can seamlessly switch between the two modes based on their privacy needs, achieving a "through the rabbit hole" privacy state transition.

## Core Features

• **Dual-Mode Token System**: Single contract implementing both ERC20 and ERC7984 standards
• **Free Mode Switching**: Seamless conversion between plaintext and encrypted balances
• **Built on Zama FHEVM**: Fully homomorphic encryption technology (euint64 + ACL)
• **Three-Step Decryption Process**: Secure encrypted-to-plaintext conversion mechanism
• **Zero Initial Supply**: Fair launch - anyone can mint tokens
• **Double-Spend Protection**: Immediate source token burning during conversion ensures asset security
• **Pending Conversion Management**: Support for canceling and retrying incomplete conversions

## Technical Architecture

### Smart Contract Layer
• **RabbitHoleToken.sol**: Core contract inheriting ZamaEthereumConfig, ERC20, ERC7984
• **Dual Balance System**: _plainBalances (plaintext) + confidentialBalances (encrypted)
• **Conversion Mechanism**: convertToConfidential (plain-to-confidential), prepareConvertToPlain + finalizeConversion (confidential-to-plain)
• **Security Guarantee**: FHE.makePubliclyDecryptable + FHE.checkSignatures verification

### Frontend Technology Stack
• **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
• **Styling**: Tailwind CSS 4 + Modern UI Design
• **Wallet Connection**: ConnectKit + Wagmi v3
• **FHE Integration**: Zama Relayer SDK 0.3.0-5 (CDN global loading)
• **State Management**: React Context + Hooks

### Encryption Technology
• **On-Chain Encryption**: FHEVM euint64 type stores encrypted balances
• **Access Control**: Fine-grained permission management based on ACL
• **Decryption Process**: Gateway service + publicDecrypt API
• **Key Management**: EIP-712 signature authorization + userDecrypt

## Workflow

### Minting Tokens
1. User calls `mintTo` function
2. Contract mints 10,000 tokens (fixed amount)
3. New tokens are stored directly in encrypted form (euint64)
4. User receives confidential balance - queryable but requires decryption to view specific values

### Plaintext to Confidential (Entering the Rabbit Hole)
1. User calls `convertToConfidential(amount)`
2. Deduct corresponding plaintext balance
3. Create encrypted amount using FHE.asEuint64
4. Increase equal encrypted balance
5. Emit ConvertedToConfidential event

### Confidential to Plaintext (Leaving the Rabbit Hole)
**Step 1: Prepare Conversion**
1. User calls `prepareConvertToPlain` to submit encrypted amount
2. Contract immediately burns encrypted balance to prevent double-spending
3. Call FHE.makePubliclyDecryptable to prepare public decryption
4. Return conversionId and handle
5. Emit ConversionRequested event

**Step 2: Off-Chain Decryption**
1. Frontend uses Relayer SDK to call publicDecrypt([handle])
2. Gateway service verifies permissions and returns plaintext amount and proof
3. Handle possible timeout and retry logic

**Step 3: Complete Conversion**
1. User calls `finalizeConversion(handle, amount, proof)`
2. Contract verifies decryption result via FHE.checkSignatures
3. Increase corresponding plaintext balance
4. Mark conversion request as completed
5. Emit ConversionCompleted event

### Conversion Management
• **Query Pending**: getUserPendingConversions to get incomplete conversions
• **Retry Decryption**: Frontend can retry publicDecrypt
• **Cancel Conversion**: cancelConversion to return encrypted tokens
• **State Tracking**: Each conversion has a unique ID and status flag

## Security Guarantees

### Double-Spend Prevention
Through "burn-first, mint-later" design, ensuring token supply remains constant:
- Immediately burn source tokens during mode conversion
- Only mint target tokens after verification passes
- Failed conversions can be recovered via cancelConversion

### Access Control
- Encrypted balances protected by FHEVM ACL mechanism
- Only account owners can query and transfer their own encrypted balances
- Conversion requests can only be completed or canceled by the initiator

### Decryption Verification
- Use FHE.checkSignatures to verify decryption results returned by Gateway
- Prevent forged or tampered decryption data
- Ensure consistency between on-chain and off-chain data

## User Experience

### Intuitive Interface Design
- **Mint Card**: One-click minting of 10,000 tokens
- **Confidential Token Transfer**: Support for encrypted balance query and transfer
- **Plaintext Token Transfer**: Standard ERC20 transfer functionality
- **Pending Conversions**: Real-time display and management of incomplete conversions

### Friendly Status Indicators
- FHEVM initialization status displayed in real-time
- Transaction confirmation progress tracking
- User-friendly error messages (including user cancellation)
- Toast notification system

### Flexible Operation Options
- Support for partial balance conversion
- Cancel incomplete conversions
- Auto-retry failed decryptions
- One-click copy contract address

## Innovation Highlights

1. **Single Contract Dual-Mode**: Avoids the complexity of traditional Wrapper patterns
2. **Seamless Switching Experience**: Users can freely choose between privacy and transparency like "going through the rabbit hole"
3. **Fully Decentralized**: No trusted third parties required, fully on-chain verification
4. **Fair Launch**: Zero pre-mine, everyone can participate equally
5. **Flexible Privacy Choice**: Users can choose plaintext or encrypted mode based on scenarios

## Use Cases

• **Privacy-Protected Transactions**: Scenarios requiring hidden transaction amounts
• **Selective Disclosure**: Meeting compliance requirements while protecting privacy
• **DeFi Integration**: Providing privacy layer for DeFi protocols
• **Enterprise Applications**: Protecting business secrets while maintaining audit capability
• **Personal Privacy**: Daily privacy protection needs for ordinary users

## Deployment Information

- **Network**: Ethereum Sepolia Testnet
- **FHEVM Version**: v0.9.1
- **Contract Framework**: Hardhat + OpenZeppelin Confidential Contracts
- **Frontend Deployment**: Vercel
- **Token Decimals**: 6 decimals (compatible with uint64 range)

## Technical Details

### Why Use 6 Decimals?
Due to FHEVM's euint64 type limitation (max value ~1.8×10^19), using 6 decimals instead of the standard 18 ensures token supply stays within safe range.

### Necessity of Three-Step Decryption
FHEVM v0.9 requires:
1. On-chain call to makePubliclyDecryptable changes state
2. Off-chain Gateway decryption obtains plaintext
3. On-chain verification of decryption result authenticity

This design ensures security and verifiability of the decryption process.

## Project Vision

Rabbit Hole is not just a technical demonstration, but an exploration of future financial privacy. By providing flexible privacy choices, it enables users to:
- "Enter the rabbit hole" (switch to encrypted mode) when privacy is needed
- "Leave the rabbit hole" (switch to plaintext mode) when transparency is needed
- Truly control their own financial privacy

Just as Alice discovered a wonderful world through the rabbit hole, users can discover through Rabbit Hole a new financial world with perfect balance between privacy and transparency.

---

*Built with ❤️ using Zama FHEVM technology*