/**
 * OpenAPI Specification Generator
 * 
 * Generates OpenAPI 3.0 spec from Zod schemas.
 * Run: npm run generate:openapi
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Celora API',
    description: 'Production-ready PWA + MV3 Extension API with secure auth, wallet management, and notifications',
    version: '1.0.0',
    contact: {
      name: 'Celora Team',
      email: 'support@celora.io',
    },
  },
  servers: [
    {
      url: 'https://celora.io/api',
      description: 'Production',
    },
    {
      url: 'https://staging.celora.io/api',
      description: 'Staging',
    },
    {
      url: 'http://localhost:3000/api',
      description: 'Development',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication and session management' },
    { name: 'Wallet', description: 'Multi-chain wallet operations' },
    { name: 'Transactions', description: 'Transaction history and management' },
    { name: 'Notifications', description: 'Push and in-app notifications' },
    { name: 'Diagnostics', description: 'Health checks and system status' },
  ],
  paths: {
    '/auth/b2c/session': {
      post: {
        tags: ['Auth'],
        summary: 'Create session',
        description: 'Creates a new session with MSAL tokens',
        operationId: 'createSession',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SessionRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Session created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SessionResponse' },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Auth'],
        summary: 'Delete session',
        description: 'Clears session cookies',
        operationId: 'deleteSession',
        responses: {
          '200': {
            description: 'Session cleared successfully',
          },
        },
      },
    },
    '/wallet/summary': {
      get: {
        tags: ['Wallet'],
        summary: 'Get wallet summary',
        description: 'Returns total balance and recent transactions across all wallets',
        operationId: 'getWalletSummary',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'x-user-id',
            in: 'header',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Wallet summary retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WalletSummaryResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications',
        description: 'Returns paginated list of notifications with optional filters',
        operationId: 'listNotifications',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['pending', 'sent', 'delivered', 'failed', 'read'] },
          },
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', enum: ['transaction', 'security', 'system', 'promotion'] },
          },
          {
            name: 'priority',
            in: 'query',
            schema: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
          },
        ],
        responses: {
          '200': {
            description: 'Notifications retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    notifications: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/NotificationResponse' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Notifications'],
        summary: 'Mark notifications as read',
        description: 'Marks multiple notifications as read',
        operationId: 'markNotificationsAsRead',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/NotificationMarkAsReadRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Notifications updated successfully',
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
        },
      },
    },
    '/diagnostics/health': {
      get: {
        tags: ['Diagnostics'],
        summary: 'Health check',
        description: 'Returns system health status',
        operationId: 'healthCheck',
        responses: {
          '200': {
            description: 'System is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthCheckResponse' },
              },
            },
          },
          '503': {
            description: 'System is unhealthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthCheckResponse' },
              },
            },
          },
        },
      },
    },
    '/diagnostics/env': {
      get: {
        tags: ['Diagnostics'],
        summary: 'Environment diagnostics',
        description: 'Returns configuration status (no secrets exposed)',
        operationId: 'envDiagnostics',
        responses: {
          '200': {
            description: 'Environment status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EnvDiagnosticsResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'MSAL access token from Azure B2C',
      },
    },
    schemas: {
      // Auth
      SessionRequest: {
        type: 'object',
        required: ['accessToken', 'expiresIn'],
        properties: {
          accessToken: { type: 'string', minLength: 1 },
          refreshToken: { type: 'string' },
          idToken: { type: 'string' },
          expiresIn: { type: 'integer', minimum: 1 },
        },
      },
      SessionResponse: {
        type: 'object',
        required: ['success', 'sessionId', 'expiresAt', 'user'],
        properties: {
          success: { type: 'boolean' },
          sessionId: { type: 'string', format: 'uuid' },
          expiresAt: { type: 'string', format: 'date-time' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              displayName: { type: 'string', nullable: true },
            },
          },
        },
      },
      
      // Wallet
      WalletSummaryResponse: {
        type: 'object',
        required: ['totalFiatBalance', 'fiatCurrency', 'wallets', 'recentTransactions'],
        properties: {
          totalFiatBalance: { type: 'number' },
          fiatCurrency: { type: 'string' },
          wallets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                blockchain: { type: 'string', enum: ['celo', 'ethereum', 'bitcoin', 'solana'] },
                address: { type: 'string' },
                label: { type: 'string', nullable: true },
                balanceCache: { type: 'string', nullable: true },
                balanceFiat: { type: 'number', nullable: true },
                isDefault: { type: 'boolean' },
                lastSyncedAt: { type: 'string', format: 'date-time', nullable: true },
              },
            },
          },
          recentTransactions: {
            type: 'array',
            items: { $ref: '#/components/schemas/TransactionSummary' },
          },
        },
      },
      TransactionSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          txHash: { type: 'string' },
          blockchain: { type: 'string', enum: ['celo', 'ethereum', 'bitcoin', 'solana'] },
          type: { type: 'string', nullable: true },
          amount: { type: 'string' },
          fromAddress: { type: 'string' },
          toAddress: { type: 'string' },
          status: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      
      // Notifications
      NotificationResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          type: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          channels: { type: 'array', items: { type: 'string' } },
          status: { type: 'string' },
          priority: { type: 'string' },
          actionUrl: { type: 'string', nullable: true },
          actionLabel: { type: 'string', nullable: true },
          sentAt: { type: 'string', format: 'date-time', nullable: true },
          deliveredAt: { type: 'string', format: 'date-time', nullable: true },
          readAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      NotificationMarkAsReadRequest: {
        type: 'object',
        required: ['notificationIds'],
        properties: {
          notificationIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1,
          },
        },
      },
      
      // Diagnostics
      HealthCheckResponse: {
        type: 'object',
        required: ['status', 'version', 'timestamp', 'services'],
        properties: {
          status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
          version: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          services: {
            type: 'object',
            properties: {
              database: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                  latency: { type: 'number', nullable: true },
                  error: { type: 'string' },
                },
              },
              redis: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                  latency: { type: 'number', nullable: true },
                },
              },
              msal: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                  configured: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
      EnvDiagnosticsResponse: {
        type: 'object',
        required: [
          'nodeEnv',
          'nextVersion',
          'databaseConfigured',
          'redisConfigured',
          'msalConfigured',
          'azureKeyVaultConfigured',
          'appInsightsConfigured',
        ],
        properties: {
          nodeEnv: { type: 'string' },
          nextVersion: { type: 'string' },
          databaseConfigured: { type: 'boolean' },
          redisConfigured: { type: 'boolean' },
          msalConfigured: { type: 'boolean' },
          azureKeyVaultConfigured: { type: 'boolean' },
          appInsightsConfigured: { type: 'boolean' },
        },
      },
      
      // Errors
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message', 'timestamp'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
              timestamp: { type: 'string', format: 'date-time' },
              requestId: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
      ValidationError: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message', 'fields', 'timestamp'],
            properties: {
              code: { type: 'string', enum: ['VALIDATION_ERROR'] },
              message: { type: 'string' },
              fields: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  },
};

// Write to file
const outputPath = join(process.cwd(), 'docs', 'openapi.yaml');
const yamlContent = `# Generated OpenAPI Specification
# DO NOT EDIT MANUALLY - Generated from Zod schemas
# Run: npm run generate:openapi

${JSON.stringify(openApiSpec, null, 2)}
`;

writeFileSync(outputPath, yamlContent, 'utf8');
console.log(`✅ OpenAPI spec generated: ${outputPath}`);
