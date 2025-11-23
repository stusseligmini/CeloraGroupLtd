import axios from 'axios';
import { logger } from '@/lib/logger';

const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';
const ONE_INCH_API_URL = 'https://api.1inch.dev/swap/v6.0';
const ONE_INCH_API_KEY = process.env.ONE_INCH_API_KEY;

export interface SwapQuote {
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  estimatedGas?: string;
  route?: any;
}

export class SwapService {
  /**
   * Get swap quote from Jupiter (Solana)
   */
  async getJupiterQuote(
    inputMint: string,
    outputMint: string,
    amount: string
  ): Promise<SwapQuote> {
    try {
      const response = await axios.get(`${JUPITER_API_URL}/quote`, {
        params: {
          inputMint,
          outputMint,
          amount,
          slippageBps: 50, // 0.5% slippage
        },
      });

      const quote = response.data;

      return {
        inputToken: inputMint,
        outputToken: outputMint,
        inputAmount: amount,
        outputAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct,
        route: quote.routePlan,
      };
    } catch (error) {
      logger.error('Error getting Jupiter quote', error);
      throw error;
    }
  }

  /**
   * Get swap quote from 1inch (Ethereum/EVM chains)
   */
  async get1InchQuote(
    chainId: number,
    fromToken: string,
    toToken: string,
    amount: string
  ): Promise<SwapQuote> {
    try {
      if (!ONE_INCH_API_KEY) {
        throw new Error('1inch API key not configured');
      }

      const response = await axios.get(
        `${ONE_INCH_API_URL}/${chainId}/quote`,
        {
          params: {
            src: fromToken,
            dst: toToken,
            amount,
          },
          headers: {
            'Authorization': `Bearer ${ONE_INCH_API_KEY}`,
          },
        }
      );

      const quote = response.data;

      return {
        inputToken: fromToken,
        outputToken: toToken,
        inputAmount: amount,
        outputAmount: quote.toAmount,
        priceImpact: 0, // 1inch doesn't always provide this
        estimatedGas: quote.estimatedGas,
      };
    } catch (error) {
      logger.error('Error getting 1inch quote', error);
      throw error;
    }
  }

  /**
   * Broadcast signed Jupiter swap transaction (Non-Custodial)
   * Transaction must be signed client-side before calling this method
   */
  async broadcastSignedJupiterSwap(
    userPublicKey: string,
    quoteResponse: any,
    signedTransaction: string // Base64 encoded signed transaction
  ): Promise<string> {
    try {
      const { Connection, VersionedTransaction } = await import('@solana/web3.js');
      
      // Deserialize signed transaction
      const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
      const transaction = VersionedTransaction.deserialize(Buffer.from(signedTransaction, 'base64'));
      
      // Send already-signed transaction
      const signature = await connection.sendTransaction(transaction, {
        skipPreflight: false,
        maxRetries: 3,
      });
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      logger.info('Signed Jupiter swap broadcast', { signature, userPublicKey });
      return signature;
    } catch (error) {
      logger.error('Error broadcasting signed Jupiter swap', error);
      throw error;
    }
  }

  /**
   * Execute Jupiter swap (DEPRECATED - Use broadcastSignedJupiterSwap)
   * @deprecated Use broadcastSignedJupiterSwap instead. This method will be removed in future versions.
   */
  async executeJupiterSwap(
    userPublicKey: string,
    quoteResponse: any,
    privateKey: Uint8Array
  ): Promise<string> {
    try {
      // Get swap transaction
      const response = await axios.post(`${JUPITER_API_URL}/swap`, {
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
      });

      const { swapTransaction } = response.data;

      // Sign and send transaction using Solana client
      const { Connection, VersionedTransaction, Keypair } = await import('@solana/web3.js');
      
      // Deserialize transaction
      const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
      const transaction = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));
      
      // Create keypair from private key
      const keypair = Keypair.fromSecretKey(privateKey);
      
      // Sign transaction
      transaction.sign([keypair]);
      
      // Send transaction
      const signature = await connection.sendTransaction(transaction, {
        skipPreflight: false,
        maxRetries: 3,
      });
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      logger.info('Jupiter swap executed', { signature, userPublicKey });
      return signature;
    } catch (error) {
      logger.error('Error executing Jupiter swap', error);
      throw error;
    }
  }

  /**
   * Broadcast signed 1inch swap transaction (Non-Custodial)
   * Transaction must be signed client-side before calling this method
   */
  async broadcastSigned1InchSwap(
    chainId: number,
    fromToken: string,
    toToken: string,
    amount: string,
    fromAddress: string,
    signedTransaction: string // Hex encoded signed transaction
  ): Promise<string> {
    try {
      const { ethers } = await import('ethers');
      const { ethereumClient } = await import('@/lib/blockchain/ethereum');
      
      // Get provider
      const provider = await ethereumClient['getHealthyProvider']();
      
      // Broadcast signed transaction
      const txResponse = await provider.broadcastTransaction(signedTransaction);
      
      // Wait for confirmation
      const receipt = await txResponse.wait(1);
      if (!receipt) throw new Error('Transaction receipt not available');
      
      logger.info('Signed 1inch swap broadcast', { 
        txHash: receipt.hash, 
        chainId, 
        fromToken, 
        toToken 
      });
      return receipt.hash;
    } catch (error) {
      logger.error('Error broadcasting signed 1inch swap', error);
      throw error;
    }
  }

  /**
   * Execute 1inch swap (DEPRECATED - Use broadcastSigned1InchSwap)
   * @deprecated Use broadcastSigned1InchSwap instead. This method will be removed in future versions.
   */
  async execute1InchSwap(
    chainId: number,
    fromToken: string,
    toToken: string,
    amount: string,
    fromAddress: string,
    privateKey: string,
    slippage: number = 1
  ): Promise<string> {
    try {
      if (!ONE_INCH_API_KEY) {
        throw new Error('1inch API key not configured');
      }

      const response = await axios.get(
        `${ONE_INCH_API_URL}/${chainId}/swap`,
        {
          params: {
            src: fromToken,
            dst: toToken,
            amount,
            from: fromAddress,
            slippage,
          },
          headers: {
            'Authorization': `Bearer ${ONE_INCH_API_KEY}`,
          },
        }
      );

      const { tx } = response.data;

      // Get appropriate blockchain client based on chainId
      const chainMap: Record<number, string> = {
        1: 'ethereum',
        137: 'polygon',
        42161: 'arbitrum',
        10: 'optimism',
        42220: 'celo',
      };

      const blockchain = chainMap[chainId];
      if (!blockchain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      // Send transaction using ethers.js directly (for contract calls)
      const { ethers } = await import('ethers');
      const { ethereumClient } = await import('@/lib/blockchain/ethereum');
      
      // Get provider
      const provider = await ethereumClient['getHealthyProvider']();
      const wallet = new ethers.Wallet(privateKey, provider);
      
      // Send transaction with data
      const txResponse = await wallet.sendTransaction({
        to: tx.to,
        value: tx.value ? BigInt(tx.value) : 0n,
        data: tx.data,
        gasLimit: tx.gas ? BigInt(tx.gas) : undefined,
        gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined,
        maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : undefined,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? BigInt(tx.maxPriorityFeePerGas) : undefined,
      });
      
      // Wait for confirmation
      const receipt = await txResponse.wait(1);
      if (!receipt) throw new Error('Transaction receipt not available');
      
      logger.info('1inch swap executed', { txHash: receipt.hash, chainId, fromToken, toToken });
      return receipt.hash;
    } catch (error) {
      logger.error('Error executing 1inch swap', error);
      throw error;
    }
  }
}

export default new SwapService();

