/**
 * Zod Schema Validation Tests
 * 
 * Tests all validation schemas for API contracts
 */

import { describe, expect, it } from '@jest/globals';
import {
  // Auth schemas
  SessionRequestSchema,
  SessionResponseSchema,
  SignInRequestSchema,
  SignOutRequestSchema,
  
  // Wallet schemas
  WalletSummaryResponseSchema,
  WalletCreateRequestSchema,
  WalletBalanceSchema,
  
  // Transaction schemas
  TransactionListQuerySchema,
  TransactionCreateRequestSchema,
  TransactionResponseSchema,
  
  // Notification schemas
  NotificationListQuerySchema,
  NotificationResponseSchema,
  NotificationCreateRequestSchema,
  
  // Error schemas
  ErrorResponseSchema,
  ValidationErrorResponseSchema,
} from '../schemas';

describe('Auth Schemas', () => {
  describe('SessionRequestSchema', () => {
    it('should validate valid session request', () => {
      const data = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresOn: '2025-12-31T23:59:59Z',
        account: {
          homeAccountId: 'test-id',
          environment: 'login.microsoftonline.com',
          tenantId: 'tenant-id',
          username: 'user@example.com',
          localAccountId: 'local-id',
        },
      };
      
      const result = SessionRequestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it('should reject missing accessToken', () => {
      const data = {
        expiresOn: '2025-12-31T23:59:59Z',
      };
      
      const result = SessionRequestSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
  
  describe('SignInRequestSchema', () => {
    it('should validate empty object (redirects handle auth)', () => {
      const result = SignInRequestSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe('Wallet Schemas', () => {
  describe('WalletSummaryResponseSchema', () => {
    it('should validate valid wallet summary', () => {
      const data = {
        totalBalanceCUSD: '1000.50',
        wallets: [
          {
            id: 'wallet-1',
            address: '0x1234567890abcdef',
            network: 'celo',
            balance: '500.25',
            currency: 'CUSD',
          },
        ],
        recentTransactions: [
          {
            id: 'tx-1',
            hash: '0xabcdef',
            from: '0x123',
            to: '0x456',
            amount: '10.00',
            currency: 'CUSD',
            status: 'confirmed',
            timestamp: '2025-11-09T12:00:00Z',
          },
        ],
      };
      
      const result = WalletSummaryResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid balance format', () => {
      const data = {
        totalBalanceCUSD: 'not-a-number',
        wallets: [],
        recentTransactions: [],
      };
      
      const result = WalletSummaryResponseSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
  
  describe('WalletCreateRequestSchema', () => {
    it('should validate valid create request', () => {
      const data = {
        network: 'celo',
        name: 'My Wallet',
      };
      
      const result = WalletCreateRequestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid network', () => {
      const data = {
        network: 'invalid-network',
        name: 'My Wallet',
      };
      
      const result = WalletCreateRequestSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
    
    it('should use default name if not provided', () => {
      const data = {
        network: 'celo',
      };
      
      const result = WalletCreateRequestSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('My Wallet');
      }
    });
  });
  
  describe('WalletBalanceSchema', () => {
    it('should validate string balance', () => {
      const result = WalletBalanceSchema.safeParse('123.45');
      expect(result.success).toBe(true);
    });
    
    it('should reject non-numeric string', () => {
      const result = WalletBalanceSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });
});

describe('Transaction Schemas', () => {
  describe('TransactionListQuerySchema', () => {
    it('should validate valid query params', () => {
      const data = {
        limit: '10',
        offset: '0',
        status: 'confirmed',
      };
      
      const result = TransactionListQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(0);
      }
    });
    
    it('should use default values', () => {
      const result = TransactionListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });
    
    it('should enforce max limit', () => {
      const data = { limit: '200' };
      const result = TransactionListQuerySchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
  
  describe('TransactionCreateRequestSchema', () => {
    it('should validate valid transaction', () => {
      const data = {
        walletId: 'wallet-1',
        to: '0x1234567890abcdef',
        amount: '10.50',
        currency: 'CUSD',
        memo: 'Payment for services',
      };
      
      const result = TransactionCreateRequestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it('should reject negative amount', () => {
      const data = {
        walletId: 'wallet-1',
        to: '0x123',
        amount: '-10.00',
        currency: 'CUSD',
      };
      
      const result = TransactionCreateRequestSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

describe('Notification Schemas', () => {
  describe('NotificationListQuerySchema', () => {
    it('should validate query with all params', () => {
      const data = {
        limit: '5',
        offset: '10',
        unreadOnly: 'true',
      };
      
      const result = NotificationListQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(5);
        expect(result.data.offset).toBe(10);
        expect(result.data.unreadOnly).toBe(true);
      }
    });
    
    it('should handle string boolean', () => {
      const data = { unreadOnly: 'false' };
      const result = NotificationListQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.unreadOnly).toBe(false);
      }
    });
  });
  
  describe('NotificationResponseSchema', () => {
    it('should validate notification with all fields', () => {
      const data = {
        id: 'notif-1',
        userId: 'user-1',
        title: 'Test Notification',
        body: 'This is a test',
        type: 'transaction',
        read: false,
        createdAt: '2025-11-09T12:00:00Z',
        data: { txId: 'tx-123' },
      };
      
      const result = NotificationResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});

describe('Error Schemas', () => {
  describe('ErrorResponseSchema', () => {
    it('should validate basic error', () => {
      const data = {
        error: 'Not Found',
        message: 'Resource not found',
      };
      
      const result = ErrorResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it('should validate error with details', () => {
      const data = {
        error: 'Bad Request',
        message: 'Invalid input',
        details: { field: 'email', issue: 'Invalid format' },
      };
      
      const result = ErrorResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
  
  describe('ValidationErrorResponseSchema', () => {
    it('should validate validation errors', () => {
      const data = {
        error: 'Validation Error',
        message: 'Invalid input',
        errors: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'amount', message: 'Must be positive' },
        ],
      };
      
      const result = ValidationErrorResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});

describe('Edge Cases', () => {
  it('should handle empty strings', () => {
    const data = { network: '' };
    const result = WalletCreateRequestSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
  
  it('should trim whitespace in addresses', () => {
    const data = {
      walletId: 'wallet-1',
      to: '  0x123  ',
      amount: '10',
      currency: 'CUSD',
    };
    
    const result = TransactionCreateRequestSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.to).toBe('0x123');
    }
  });
  
  it('should enforce string types for numeric fields', () => {
    const data = {
      totalBalanceCUSD: 1000.50, // number instead of string
      wallets: [],
      recentTransactions: [],
    };
    
    const result = WalletSummaryResponseSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
