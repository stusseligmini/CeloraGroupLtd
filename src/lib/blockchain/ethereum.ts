/**
 * Ethereum Blockchain Client
 * Supports Ethereum mainnet and EIP-1559 transactions
 */

import { ethers, JsonRpcProvider, Wallet, TransactionRequest, FeeData } from 'ethers';
import { logger } from '../logger';

export interface RPCConfig {
  primary: string;
  fallbacks: string[];
  chainId: number;
}

export interface TransactionOptions {
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
}

export class EthereumClient {
  private provider: JsonRpcProvider | null = null;
  private fallbackProviders: JsonRpcProvider[] = [];
  private currentProviderIndex = 0;
  private config: RPCConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isHealthy = true;

  constructor(config: RPCConfig) {
    this.config = config;
    this.initializeProviders();
    this.startHealthCheck();
  }

  private initializeProviders(): void {
    try {
      this.provider = new JsonRpcProvider(this.config.primary);
      
      this.fallbackProviders = this.config.fallbacks.map(
        url => new JsonRpcProvider(url)
      );
      
      logger.info('Ethereum RPC providers initialized', {
        primary: this.config.primary,
        fallbacks: this.config.fallbacks.length,
      });
    } catch (error) {
      logger.error('Failed to initialize Ethereum providers', error);
      throw error;
    }
  }

  private async checkProviderHealth(provider: JsonRpcProvider): Promise<boolean> {
    try {
      const blockNumber = await provider.getBlockNumber();
      return blockNumber > 0;
    } catch {
      return false;
    }
  }

  private async getHealthyProvider(): Promise<JsonRpcProvider> {
    // Check primary first
    if (this.provider && await this.checkProviderHealth(this.provider)) {
      return this.provider;
    }

    // Try fallbacks
    for (let i = 0; i < this.fallbackProviders.length; i++) {
      const index = (this.currentProviderIndex + i) % this.fallbackProviders.length;
      const provider = this.fallbackProviders[index];
      
      if (await this.checkProviderHealth(provider)) {
        this.currentProviderIndex = index;
        this.isHealthy = true;
        return provider;
      }
    }

    // If all fail, throw error
    throw new Error('All Ethereum RPC providers are unhealthy');
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const provider = await this.getHealthyProvider();
        this.isHealthy = true;
      } catch {
        this.isHealthy = false;
        logger.warn('Ethereum RPC health check failed');
      }
    }, 30000); // Check every 30 seconds
  }

  async getBalance(address: string): Promise<string> {
    const provider = await this.getHealthyProvider();
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  async getTransactionCount(address: string): Promise<number> {
    const provider = await this.getHealthyProvider();
    return await provider.getTransactionCount(address);
  }

  async estimateGas(tx: TransactionRequest): Promise<bigint> {
    const provider = await this.getHealthyProvider();
    return await provider.estimateGas(tx);
  }

  async getProvider(): Promise<JsonRpcProvider> {
    return await this.getHealthyProvider();
  }

  getChainId(): number {
    return this.config.chainId;
  }

  async getFeeData(): Promise<FeeData> {
    const provider = await this.getHealthyProvider();
    return await provider.getFeeData();
  }

  async sendTransaction(
    fromAddress: string,
    toAddress: string,
    amount: string,
    privateKey: string,
    options?: TransactionOptions
  ): Promise<{ txHash: string; blockNumber?: number }> {
    const provider = await this.getHealthyProvider();
    const wallet = new Wallet(privateKey, provider);

    // Get nonce
    const nonce = await provider.getTransactionCount(fromAddress, 'pending');

    // Get fee data (EIP-1559)
    const feeData = await this.getFeeData();

    // Build transaction
    const tx: TransactionRequest = {
      to: toAddress,
      value: ethers.parseEther(amount),
      nonce,
      chainId: this.config.chainId,
    };

    // Use provided gas settings or estimate
    if (options?.gasPrice) {
      tx.gasPrice = options.gasPrice;
    } else if (options?.maxFeePerGas && options?.maxPriorityFeePerGas) {
      tx.maxFeePerGas = options.maxFeePerGas;
      tx.maxPriorityFeePerGas = options.maxPriorityFeePerGas;
    } else if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      // Use EIP-1559
      tx.maxFeePerGas = feeData.maxFeePerGas;
      tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    } else if (feeData.gasPrice) {
      // Fallback to legacy gas price
      tx.gasPrice = feeData.gasPrice;
    }

    // Estimate gas if not provided
    if (!options?.gasLimit) {
      tx.gasLimit = await this.estimateGas(tx);
    } else {
      tx.gasLimit = options.gasLimit;
    }

    // Send transaction
    const response = await wallet.sendTransaction(tx);
    
    logger.info('Ethereum transaction sent', {
      txHash: response.hash,
      from: fromAddress,
      to: toAddress,
      amount,
    });

    // Wait for confirmation (optional - can be done async)
    const receipt = await response.wait(1); // Wait for 1 confirmation

    return {
      txHash: response.hash,
      blockNumber: receipt?.blockNumber,
    };
  }

  async getTransactionReceipt(txHash: string): Promise<{
    status: 'success' | 'failed';
    blockNumber: number;
    confirmations: number;
    gasUsed: bigint;
  } | null> {
    const provider = await this.getHealthyProvider();
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) return null;

    return {
      status: receipt.status === 1 ? 'success' : 'failed',
      blockNumber: receipt.blockNumber,
      confirmations: await receipt.confirmations(),
      gasUsed: receipt.gasUsed,
    };
  }

  async getBlockNumber(): Promise<number> {
    const provider = await this.getHealthyProvider();
    return await provider.getBlockNumber();
  }

  getHealthStatus(): { healthy: boolean; currentProvider: string } {
    return {
      healthy: this.isHealthy,
      currentProvider: this.currentProviderIndex === 0 
        ? this.config.primary 
        : this.config.fallbacks[this.currentProviderIndex - 1],
    };
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Singleton instances for different EVM chains
const ETHEREUM_CONFIG: RPCConfig = {
  primary: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
  fallbacks: [
    'https://rpc.ankr.com/eth',
    'https://cloudflare-eth.com',
    'https://eth-mainnet.public.blastapi.io',
  ],
  chainId: 1,
};

export const ethereumClient = new EthereumClient(ETHEREUM_CONFIG);


