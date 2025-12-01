/**
 * Solana Wallet Provider
 * Wraps Solana Wallet Adapter for non-custodial wallet management
 */

'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  LedgerWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaWalletProviderProps {
  children: React.ReactNode;
}

export function SolanaWalletProvider({ children }: SolanaWalletProviderProps) {
  // Use devnet for development/testing, mainnet for production
  const network = process.env.NODE_ENV === 'development' 
    ? WalletAdapterNetwork.Devnet 
    : WalletAdapterNetwork.Mainnet;
  
  const endpoint = useMemo(() => {
    // Use Helius devnet for testing with WebSocket support
    if (process.env.NODE_ENV === 'development') {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
        'https://devnet.helius-rpc.com/?api-key=' + (process.env.NEXT_PUBLIC_HELIUS_API_KEY || '');
    }
    // Production: Use mainnet Helius
    return (
      process.env.NEXT_PUBLIC_HELIUS_RPC_URL ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      clusterApiUrl(network)
    );
  }, [network]);

  // Initialize wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new LedgerWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

