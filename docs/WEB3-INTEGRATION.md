# 🌐 Web3 & DApp Integration Guide

## Overview

Celora supports WalletConnect v2 for connecting to decentralized applications (dApps) and provides a built-in dApp browser.

## WalletConnect Integration

### Features

- Connect to any dApp supporting WalletConnect v2
- Multi-chain support (Ethereum, Polygon, Arbitrum, Optimism, Solana)
- Session management
- Transaction signing

### Usage

#### In PWA

1. Navigate to `/dapps`
2. Paste WalletConnect URI from dApp
3. Review connection request
4. Approve or reject

#### In Extension

The extension automatically injects a Web3 provider into web pages.

### Supported Methods

**EIP-155 (Ethereum-compatible):**
- `eth_sendTransaction`
- `eth_signTransaction`
- `eth_sign`
- `personal_sign`
- `eth_signTypedData`
- `eth_signTypedData_v4`

**Solana:**
- `solana_signTransaction`
- `solana_signMessage`

## Supported Chains

| Chain | Chain ID | Namespace |
|-------|----------|-----------|
| Ethereum | 1 | eip155 |
| Polygon | 137 | eip155 |
| Arbitrum | 42161 | eip155 |
| Optimism | 10 | eip155 |
| Celo | 42220 | eip155 |
| Solana | mainnet-beta | solana |

## DApp Browser

### Features

- iframe-based secure browsing
- Web3 provider injection
- Transaction confirmation UI
- Session persistence

### Implementation

The dApp browser loads dApps in an isolated iframe with a custom Web3 provider.

**File**: `src/components/DAppBrowser.tsx`

### Security

- CSP (Content Security Policy) headers
- Sandboxed iframes
- User confirmation for all transactions
- Session timeout

## For dApp Developers

### Connecting to Celora

```javascript
import { Web3Wallet } from '@walletconnect/web3wallet';

// Generate WalletConnect URI
const uri = await client.connect({
  requiredNamespaces: {
    eip155: {
      methods: ['eth_sendTransaction', 'eth_sign'],
      chains: ['eip155:1'],
      events: ['chainChanged', 'accountsChanged'],
    },
  },
});

// Display QR code with URI
// User scans in Celora app
```

### Testing

Use the WalletConnect test dApp:
https://react-app.walletconnect.com/

## API Reference

### WalletConnect Client

```typescript
import { getWalletConnectClient } from '@/lib/walletconnect/client';

const client = getWalletConnectClient();
await client.initialize();

// Pair with dApp
await client.pair(uri);

// Approve session
await client.approveSession(proposal, accounts);

// Reject session
await client.rejectSession(proposal);

// Disconnect
await client.disconnectSession(topic);
```

### Chain Configuration

```typescript
import { getChainConfig } from '@/lib/walletconnect/chains';

const ethConfig = getChainConfig('eip155:1');
// {
//   id: 1,
//   name: 'Ethereum',
//   rpcUrl: 'https://eth.llamarpc.com',
//   ...
// }
```

## Troubleshooting

### Connection Fails

- Ensure Project ID is configured in `.env`
- Check network connectivity
- Verify dApp supports WalletConnect v2

### Transaction Not Signing

- Check that chain is supported
- Verify wallet has sufficient balance
- Review transaction details in UI

### Session Disconnects

- Sessions expire after 7 days by default
- Check for network interruptions
- Verify dApp is still running

## Examples

### Connect to Uniswap

1. Go to https://app.uniswap.org
2. Click "Connect Wallet"
3. Select "WalletConnect"
4. Copy the URI
5. Paste in Celora dApps page
6. Approve connection

### Sign a Message

When a dApp requests a signature:

1. Review message content
2. Verify dApp URL
3. Click "Sign" to approve
4. Transaction signed with your private key

## Best Practices

- Always review transaction details
- Only connect to trusted dApps
- Disconnect unused sessions
- Monitor transaction history
- Keep app updated

## Resources

- [WalletConnect Documentation](https://docs.walletconnect.com/)
- [EIP-155 Specification](https://eips.ethereum.org/EIPS/eip-155)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)

