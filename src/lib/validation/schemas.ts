/**
 * Zod Validation Schemas
 * 
 * Centralized validation schemas for all API endpoints.
 * Auto-generates TypeScript types and enables OpenAPI spec generation.
 */

import { z } from 'zod';

// ============================================================================
// Common / Shared Schemas
// ============================================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const IdParamSchema = z.object({
  id: z.string().uuid(),
});

export const BlockchainSchema = z.enum(['celo', 'ethereum', 'bitcoin', 'solana']);

export const TimestampRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// ============================================================================
// Auth API Schemas
// ============================================================================

export const SessionRequestSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  idToken: z.string().optional(),
  expiresIn: z.number().int().positive(),
});

export const SessionResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().uuid(),
  expiresAt: z.string().datetime(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().nullable(),
  }),
});

export const TokenRefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export const TokenRefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresIn: z.number().int().positive(),
});

// ============================================================================
// Wallet API Schemas
// ============================================================================

export const WalletCreateRequestSchema = z.object({
  blockchain: BlockchainSchema,
  label: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().default(false),
  encryptedMnemonic: z.string().optional(),
  derivationPath: z.string().optional(),
});

export const WalletCreateResponseSchema = z.object({
  id: z.string().uuid(),
  blockchain: BlockchainSchema,
  address: z.string(),
  publicKey: z.string().nullable(),
  label: z.string().nullable(),
  isDefault: z.boolean(),
  balanceCache: z.string().nullable(),
  balanceFiat: z.number().nullable(),
  fiatCurrency: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const WalletSummaryResponseSchema = z.object({
  totalFiatBalance: z.number(),
  fiatCurrency: z.string(),
  wallets: z.array(
    z.object({
      id: z.string().uuid(),
      blockchain: BlockchainSchema,
      address: z.string(),
      label: z.string().nullable(),
      balanceCache: z.string().nullable(),
      balanceFiat: z.number().nullable(),
      isDefault: z.boolean(),
      lastSyncedAt: z.string().datetime().nullable(),
    })
  ),
  recentTransactions: z.array(
    z.object({
      id: z.string().uuid(),
      txHash: z.string(),
      blockchain: BlockchainSchema,
      type: z.string().nullable(),
      amount: z.string(),
      fromAddress: z.string(),
      toAddress: z.string(),
      status: z.string(),
      timestamp: z.string().datetime(),
    })
  ),
});

export const WalletUpdateRequestSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
});

export const WalletBalanceQuerySchema = z.object({
  walletId: z.string().uuid(),
  forceSync: z.coerce.boolean().default(false),
});

export const WalletBalanceResponseSchema = z.object({
  walletId: z.string().uuid(),
  blockchain: BlockchainSchema,
  address: z.string(),
  balance: z.string(),
  balanceFiat: z.number().nullable(),
  fiatCurrency: z.string(),
  lastSyncedAt: z.string().datetime(),
});

// ============================================================================
// Transaction API Schemas
// ============================================================================

export const TransactionListQuerySchema = PaginationSchema.extend({
  walletId: z.string().uuid().optional(),
  blockchain: BlockchainSchema.optional(),
  status: z.enum(['pending', 'confirmed', 'failed']).optional(),
  type: z.enum(['send', 'receive', 'swap', 'contract']).optional(),
}).merge(TimestampRangeSchema);

export const TransactionResponseSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  txHash: z.string(),
  blockchain: BlockchainSchema,
  blockNumber: z.string().nullable(),
  fromAddress: z.string(),
  toAddress: z.string(),
  amount: z.string(),
  tokenSymbol: z.string().nullable(),
  tokenAddress: z.string().nullable(),
  gasFee: z.string().nullable(),
  gasPrice: z.string().nullable(),
  gasUsed: z.string().nullable(),
  status: z.string(),
  confirmations: z.number().int(),
  type: z.string().nullable(),
  memo: z.string().nullable(),
  timestamp: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export const TransactionCreateRequestSchema = z.object({
  walletId: z.string().uuid(),
  toAddress: z.string().min(1),
  amount: z.string().regex(/^\d+$/),
  tokenAddress: z.string().optional(),
  gasPrice: z.string().optional(),
  gasLimit: z.string().optional(),
  memo: z.string().max(500).optional(),
});

// ============================================================================
// Notification API Schemas
// ============================================================================

export const NotificationListQuerySchema = PaginationSchema.extend({
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'read']).optional(),
  type: z.enum(['transaction', 'security', 'system', 'promotion']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});

export const NotificationResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  channels: z.array(z.string()),
  status: z.string(),
  priority: z.string(),
  actionUrl: z.string().nullable(),
  actionLabel: z.string().nullable(),
  sentAt: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable(),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const NotificationCreateRequestSchema = z.object({
  type: z.enum(['transaction', 'security', 'system', 'promotion']),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  channels: z.array(z.enum(['push', 'email', 'in-app'])).min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  actionUrl: z.string().url().optional(),
  actionLabel: z.string().max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const NotificationUpdateRequestSchema = z.object({
  status: z.enum(['read', 'archived']).optional(),
});

export const NotificationMarkAsReadRequestSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1),
});

// ============================================================================
// Diagnostics API Schemas
// ============================================================================

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string(),
  timestamp: z.string().datetime(),
  services: z.object({
    database: z.object({
      status: z.enum(['healthy', 'unhealthy']),
      latency: z.number().nullable(),
      error: z.string().optional(),
    }),
    redis: z.object({
      status: z.enum(['healthy', 'unhealthy']),
      latency: z.number().nullable(),
      error: z.string().optional(),
    }),
    msal: z.object({
      status: z.enum(['healthy', 'unhealthy']),
      configured: z.boolean(),
    }),
  }),
});

export const EnvDiagnosticsResponseSchema = z.object({
  nodeEnv: z.string(),
  nextVersion: z.string(),
  databaseConfigured: z.boolean(),
  redisConfigured: z.boolean(),
  msalConfigured: z.boolean(),
  azureKeyVaultConfigured: z.boolean(),
  appInsightsConfigured: z.boolean(),
});

// ============================================================================
// Virtual Card API Schemas
// ============================================================================

export const CardCreateRequestSchema = z.object({
  walletId: z.string().uuid(),
  nickname: z.string().min(1).max(50).optional(),
  brand: z.enum(['VISA', 'MASTERCARD']).default('VISA'),
  type: z.enum(['virtual', 'physical']).default('virtual'),
  spendingLimit: z.number().positive().optional(),
  dailyLimit: z.number().positive().optional(),
  monthlyLimit: z.number().positive().optional(),
});

export const CardUpdateRequestSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  status: z.enum(['active', 'frozen', 'cancelled']).optional(),
  isOnline: z.boolean().optional(),
  isContactless: z.boolean().optional(),
  isATM: z.boolean().optional(),
  spendingLimit: z.number().positive().optional(),
  dailyLimit: z.number().positive().optional(),
  monthlyLimit: z.number().positive().optional(),
});

export const CardResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  walletId: z.string().uuid(),
  nickname: z.string().nullable(),
  brand: z.enum(['VISA', 'MASTERCARD']),
  type: z.enum(['virtual', 'physical']),
  lastFourDigits: z.string(),
  cardholderName: z.string(),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int(),
  spendingLimit: z.number().nullable(),
  dailyLimit: z.number().nullable(),
  monthlyLimit: z.number().nullable(),
  totalSpent: z.number(),
  monthlySpent: z.number(),
  status: z.enum(['active', 'frozen', 'cancelled']),
  isOnline: z.boolean(),
  isContactless: z.boolean(),
  isATM: z.boolean(),
  lastUsedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CardDetailsResponseSchema = CardResponseSchema.extend({
  cardNumber: z.string(),
  cvv: z.string(),
});

export const CardListQuerySchema = PaginationSchema.extend({
  walletId: z.string().uuid().optional(),
  status: z.enum(['active', 'frozen', 'cancelled']).optional(),
});

// ============================================================================
// Hidden Vault API Schemas
// ============================================================================

export const SetVaultPinRequestSchema = z.object({
  walletId: z.string().uuid(),
  pin: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits'),
  confirmPin: z.string(),
}).refine(data => data.pin === data.confirmPin, {
  message: "PINs don't match",
  path: ['confirmPin'],
});

export const UnlockVaultRequestSchema = z.object({
  walletId: z.string().uuid(),
  pin: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits'),
});

export const UnlockVaultResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string().datetime(),
});

export const VaultStatusResponseSchema = z.object({
  isHidden: z.boolean(),
  vaultLevel: z.number().int().min(0).max(2),
  hasPinSet: z.boolean(),
  isUnlocked: z.boolean(),
});

export const UpdateVaultSettingsRequestSchema = z.object({
  isHidden: z.boolean().optional(),
  vaultLevel: z.number().int().min(0).max(2).optional(),
});

// ============================================================================
// Error Response Schemas
// ============================================================================

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    timestamp: z.string().datetime(),
    requestId: z.string().uuid().optional(),
  }),
});

export const ValidationErrorResponseSchema = z.object({
  error: z.object({
    code: z.literal('VALIDATION_ERROR'),
    message: z.string(),
    fields: z.array(
      z.object({
        field: z.string(),
        message: z.string(),
      })
    ),
    timestamp: z.string().datetime(),
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

// Auth
export type SessionRequest = z.infer<typeof SessionRequestSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type TokenRefreshRequest = z.infer<typeof TokenRefreshRequestSchema>;
export type TokenRefreshResponse = z.infer<typeof TokenRefreshResponseSchema>;

// Wallet
export type WalletCreateRequest = z.infer<typeof WalletCreateRequestSchema>;
export type WalletCreateResponse = z.infer<typeof WalletCreateResponseSchema>;
export type WalletSummaryResponse = z.infer<typeof WalletSummaryResponseSchema>;
export type WalletUpdateRequest = z.infer<typeof WalletUpdateRequestSchema>;
export type WalletBalanceQuery = z.infer<typeof WalletBalanceQuerySchema>;
export type WalletBalanceResponse = z.infer<typeof WalletBalanceResponseSchema>;

// Transaction
export type TransactionListQuery = z.infer<typeof TransactionListQuerySchema>;
export type TransactionResponse = z.infer<typeof TransactionResponseSchema>;
export type TransactionCreateRequest = z.infer<typeof TransactionCreateRequestSchema>;

// Notification
export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
export type NotificationCreateRequest = z.infer<typeof NotificationCreateRequestSchema>;
export type NotificationUpdateRequest = z.infer<typeof NotificationUpdateRequestSchema>;
export type NotificationMarkAsReadRequest = z.infer<typeof NotificationMarkAsReadRequestSchema>;

// Diagnostics
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
export type EnvDiagnosticsResponse = z.infer<typeof EnvDiagnosticsResponseSchema>;

// Virtual Card
export type CardCreateRequest = z.infer<typeof CardCreateRequestSchema>;
export type CardUpdateRequest = z.infer<typeof CardUpdateRequestSchema>;
export type CardResponse = z.infer<typeof CardResponseSchema>;
export type CardDetailsResponse = z.infer<typeof CardDetailsResponseSchema>;
export type CardListQuery = z.infer<typeof CardListQuerySchema>;

// Hidden Vault
export type SetVaultPinRequest = z.infer<typeof SetVaultPinRequestSchema>;
export type UnlockVaultRequest = z.infer<typeof UnlockVaultRequestSchema>;
export type UnlockVaultResponse = z.infer<typeof UnlockVaultResponseSchema>;
export type VaultStatusResponse = z.infer<typeof VaultStatusResponseSchema>;
export type UpdateVaultSettingsRequest = z.infer<typeof UpdateVaultSettingsRequestSchema>;

// Errors
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type ValidationErrorResponse = z.infer<typeof ValidationErrorResponseSchema>;
