/**
 * Validation Utilities Tests
 * 
 * Tests validation helper functions
 */

import { describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  validateBody,
  validateQuery,
  validateParams,
  validationErrorResponse,
  successResponse,
} from '../validate';

describe('validateBody', () => {
  const TestSchema = z.object({
    name: z.string().min(1),
    age: z.number().positive(),
  });
  
  it('should validate valid body', async () => {
    const body = { name: 'John', age: 30 };
    const result = await validateBody(body, TestSchema);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(body);
    }
  });
  
  it('should return error for invalid body', async () => {
    const body = { name: '', age: -5 };
    const result = await validateBody(body, TestSchema);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(2);
    }
  });
  
  it('should handle missing fields', async () => {
    const body = { name: 'John' };
    const result = await validateBody(body, TestSchema);
    
    expect(result.success).toBe(false);
  });
});

describe('validateQuery', () => {
  const QuerySchema = z.object({
    limit: z.string().transform(Number).pipe(z.number().max(100)).default('20'),
    offset: z.string().transform(Number).pipe(z.number().min(0)).default('0'),
  });
  
  it('should validate valid query params', () => {
    const searchParams = new URLSearchParams('limit=10&offset=5');
    const result = validateQuery(searchParams, QuerySchema);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
      expect(result.data.offset).toBe(5);
    }
  });
  
  it('should use default values', () => {
    const searchParams = new URLSearchParams();
    const result = validateQuery(searchParams, QuerySchema);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.offset).toBe(0);
    }
  });
  
  it('should reject invalid values', () => {
    const searchParams = new URLSearchParams('limit=200&offset=-1');
    const result = validateQuery(searchParams, QuerySchema);
    
    expect(result.success).toBe(false);
  });
});

describe('validateParams', () => {
  const ParamSchema = z.object({
    id: z.string().uuid(),
  });
  
  it('should validate valid params', () => {
    const params = { id: '123e4567-e89b-12d3-a456-426614174000' };
    const result = validateParams(params, ParamSchema);
    
    expect(result.success).toBe(true);
  });
  
  it('should reject invalid UUID', () => {
    const params = { id: 'not-a-uuid' };
    const result = validateParams(params, ParamSchema);
    
    expect(result.success).toBe(false);
  });
});

describe('validationErrorResponse', () => {
  it('should format validation error correctly', () => {
    const error = new z.ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Expected string, received number',
      },
    ]);
    
    const response = validationErrorResponse(error);
    
    expect(response.status).toBe(400);
    
    // Parse response body
    const json = JSON.parse(JSON.stringify(response));
    expect(json).toMatchObject({
      error: 'Validation Error',
      message: 'Invalid request data',
    });
  });
  
  it('should include multiple validation errors', () => {
    const error = new z.ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Expected string',
      },
      {
        code: 'too_small',
        minimum: 1,
        type: 'number',
        inclusive: true,
        path: ['age'],
        message: 'Must be positive',
      },
    ]);
    
    const response = validationErrorResponse(error);
    expect(response.status).toBe(400);
  });
});

describe('successResponse', () => {
  it('should create success response with data', () => {
    const data = { id: '123', name: 'Test' };
    const response = successResponse(data);
    
    expect(response.status).toBe(200);
  });
  
  it('should support custom status code', () => {
    const data = { id: '123' };
    const response = successResponse(data, 201);
    
    expect(response.status).toBe(201);
  });
  
  it('should handle null data', () => {
    const response = successResponse(null);
    
    expect(response.status).toBe(200);
  });
});

describe('Integration: Full validation flow', () => {
  const UserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    age: z.number().int().min(18).optional(),
  });
  
  it('should validate complete user object', async () => {
    const body = {
      email: 'user@example.com',
      password: 'SecurePass123!',
      age: 25,
    };
    
    const result = await validateBody(body, UserSchema);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });
  
  it('should catch all validation errors', async () => {
    const body = {
      email: 'invalid-email',
      password: '123',
      age: 15,
    };
    
    const result = await validateBody(body, UserSchema);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});
