# 🏦 DeFi Features Guide

## Overview

Celora integrates DeFi features including staking, token swaps, and yield positions.

## Staking

### Supported Networks

#### Solana (Native Staking)
- **APY**: ~7%
- **Lock Period**: None (warmup ~2-3 days)
- **Minimum**: 0.01 SOL

#### Ethereum (Lido)
- **APY**: ~4-5%
- **Lock Period**: None (liquid staking)
- **Minimum**: 0.01 ETH
- **Rewards**: Receive stETH

#### Celo (Native)
- **APY**: ~5%
- **Lock Period**: 3 days unlock
- **Minimum**: 1 CELO

### How to Stake

1. Navigate to Staking page
2. Select blockchain
3. Enter amount
4. For Solana: Choose validator
5. Confirm transaction
6. Rewards accrue automatically

### Unstaking

1. Go to Active Positions
2. Select position
3. Click "Unstake"
4. Wait for unlock period
5. Claim unstaked tokens

## Token Swaps

### Aggregators Used

- **Solana**: Jupiter Aggregator
- **Ethereum/EVM**: 1inch Aggregator

### Features

- Best price routing
- Slippage protection (default 0.5%)
- Gas estimation
- Price impact warning

### How to Swap

1. Navigate to Swap page
2. Select input token
3. Select output token
4. Enter amount
5. Review quote
6. Approve if needed
7. Execute swap

### Fees

- **Platform Fee**: 0% (we don't charge)
- **Network Gas**: Varies by chain
- **DEX Fees**: ~0.3% typical
- **Slippage**: User configurable

## DeFi Positions (View-Only)

Track your DeFi positions across protocols:

### Supported Protocols

**Ethereum:**
- Aave (lending/borrowing)
- Compound
- Uniswap V3 (liquidity)

**Solana:**
- Solend
- Raydium (liquidity)

**Polygon:**
- Aave V3
- QuickSwap

### Dashboard Features

- Real-time APY tracking
- Health factor monitoring
- Position value (USD)
- Rewards earned
- Risk assessment

### Auto-Refresh

Positions refresh every 5 minutes automatically.

## Safety Features

### Pre-Transaction Checks

- Balance verification
- Gas estimation
- Price impact review
- Smart contract audit status

### Risk Warnings

- ⚠️ High slippage (>2%)
- ⚠️ Unverified tokens
- ⚠️ Low liquidity
- 🔴 Possible scam

### Transaction Simulation

All transactions simulated before execution to prevent:
- Insufficient funds
- Contract errors
- Unexpected outcomes

## API Integration

### Staking Service

```typescript
import stakingService from '@/server/services/stakingService';

// Get positions
const positions = await stakingService.getStakingPositions(userId);

// Stake
const txHash = await stakingService.stakeSolana(
  userId,
  walletId,
  '10', // amount
  'validatorAddress'
);

// Unstake
await stakingService.unstake(positionId);
```

### Swap Service

```typescript
import swapService from '@/server/services/swapService';

// Get quote (Solana)
const quote = await swapService.getJupiterQuote(
  'So11111111111111111111111111111111111111112', // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  '1000000000' // 1 SOL in lamports
);

// Execute swap
const txHash = await swapService.executeJupiterSwap(
  userPublicKey,
  quote
);
```

## Best Practices

### Staking

1. Research validators (uptime, commission)
2. Don't stake 100% of holdings
3. Diversify across validators
4. Monitor rewards regularly
5. Consider unlock periods

### Swapping

1. Check price impact before confirming
2. Use appropriate slippage tolerance
3. Swap during low network congestion
4. Verify token contract addresses
5. Start with small amounts

### DeFi Positions

1. Monitor health factors daily
2. Set up alerts for liquidation risk
3. Understand protocol risks
4. Keep emergency fund for collateral
5. Use stop-loss strategies

## Troubleshooting

### Staking Failed

- Check balance includes gas fees
- Verify minimum stake amount
- For Solana: ensure rent-exemption

### Swap Failed

- Increase slippage tolerance
- Reduce swap amount
- Check token approvals
- Verify sufficient gas

### Position Not Showing

- Wait for blockchain confirmation
- Refresh manually
- Check wallet address correct
- Verify protocol supported

## Gas Optimization

### Ethereum L1

- Stake during low gas periods
- Batch transactions when possible
- Use L2s for smaller amounts

### L2 Networks

- Much cheaper gas
- Consider bridging costs
- Polygon/Arbitrum/Optimism recommended

### Solana

- Very low fees (~$0.0002)
- Priority fees optional
- No gas optimization needed

## Risks & Disclaimer

⚠️ **Important**: DeFi involves risks including:

- Smart contract bugs
- Impermanent loss (liquidity)
- Liquidation (lending)
- Slashing (staking)
- Market volatility

**Always:**
- DYOR (Do Your Own Research)
- Never invest more than you can afford to lose
- Understand protocol mechanics
- Monitor positions regularly
- Use trusted protocols

## Resources

- [Jupiter Docs](https://docs.jup.ag/)
- [1inch Docs](https://docs.1inch.io/)
- [Lido Docs](https://docs.lido.fi/)
- [Aave Docs](https://docs.aave.com/)
- [DeFi Llama](https://defillama.com/) (analytics)

