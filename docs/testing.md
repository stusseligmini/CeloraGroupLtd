# Testing Guide

Comprehensive test suite for Celora PWA with unit and integration tests.

## Test Structure

```
src/
├── lib/
│   ├── validation/
│   │   └── __tests__/
│   │       ├── schemas.test.ts      # Zod schema validation tests
│   │       └── validate.test.ts      # Validation utilities tests
│   └── security/
│       └── __tests__/
│           └── security.test.ts      # CSP, CSRF tests
└── app/
    └── api/
        └── __tests__/
            └── handlers.test.ts       # API handler integration tests
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Integration Tests Only
```bash
npm run test:integration
```

### Coverage Report
```bash
npm test -- --coverage
```

### Single Test File
```bash
npm test -- schemas.test.ts
```

### Specific Test Suite
```bash
npm test -- --testNamePattern="Wallet Schemas"
```

## Test Coverage Goals

Target: **70%+ coverage** across all metrics

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

View coverage report:
```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

## What's Tested

### 1. Zod Schema Validation (`schemas.test.ts`)
✅ Auth schemas (Session, SignIn, SignOut)
✅ Wallet schemas (Summary, Create, Balance)
✅ Transaction schemas (List, Create, Response)
✅ Notification schemas (List, Create, Response)
✅ Error schemas (ValidationError, ErrorResponse)
✅ Edge cases (empty strings, whitespace, type coercion)

### 2. Validation Utilities (`validate.test.ts`)
✅ validateBody() with valid/invalid data
✅ validateQuery() with URL parameters
✅ validateParams() with route params
✅ validationErrorResponse() formatting
✅ successResponse() with custom status codes

### 3. Security Middleware (`security.test.ts`)
✅ CSP nonce generation (uniqueness, base64 encoding)
✅ CSP directive building (restricted to required Firebase/first-party domains)
✅ CSRF token generation (cryptographic security)
✅ Security integration tests

### 4. API Handlers (`handlers.test.ts`)
✅ Wallet API (GET summary, POST create)
✅ Transaction API (GET paginated, POST create, filtering)
✅ Notification API (GET list, PATCH mark read)
✅ Error handling (DB errors, constraints, network)
✅ Authorization (user ownership verification)

## Mocking Strategy

### Prisma Client
```typescript
jest.mock('../../server/db/client', () => ({
  prisma: {
    wallet: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));
```

### Next.js Request/Response
```typescript
import { NextRequest, NextResponse } from 'next/server';
// Use actual Next.js test utilities
```

### Environment Variables
```typescript
// Set in jest.setup.ts
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
```

## Writing New Tests

### Test Structure
```typescript
import { describe, expect, it, beforeEach } from '@jest/globals';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
    jest.clearAllMocks();
  });
  
  describe('Function Name', () => {
    it('should handle valid input', () => {
      // Arrange
      const input = { data: 'test' };
      
      // Act
      const result = functionToTest(input);
      
      // Assert
      expect(result).toBe(expected);
    });
    
    it('should reject invalid input', () => {
      const input = { invalid: true };
      
      expect(() => functionToTest(input)).toThrow();
    });
  });
});
```

### Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
2. **One Assertion Per Test**: Focus on single behavior
3. **Descriptive Names**: `should return error when email is invalid`
4. **Mock External Dependencies**: Database, APIs, file system
5. **Test Edge Cases**: Empty strings, null, undefined, large inputs
6. **Use TypeScript**: Catch type errors at compile time

## Common Test Scenarios

### Testing Zod Schemas
```typescript
it('should validate email format', () => {
  const schema = z.string().email();
  
  expect(schema.safeParse('valid@email.com').success).toBe(true);
  expect(schema.safeParse('invalid').success).toBe(false);
});
```

### Testing API Handlers
```typescript
it('should return 400 for invalid body', async () => {
  const request = new NextRequest('http://localhost/api/test', {
    method: 'POST',
    body: JSON.stringify({ invalid: true }),
  });
  
  const response = await handler(request);
  
  expect(response.status).toBe(400);
});
```

### Testing Async Functions
```typescript
it('should handle database errors', async () => {
  mockPrisma.findMany.mockRejectedValue(new Error('DB Error'));
  
  await expect(fetchData()).rejects.toThrow('DB Error');
});
```

### Testing Middleware
```typescript
it('should set CSRF cookie', () => {
  const response = setCsrfTokenCookie(NextResponse.next());
  
  const cookie = response.cookies.get('celora-csrf-token');
  expect(cookie).toBeDefined();
});
```

## Debugging Tests

### Run Single Test
```bash
npm test -- --testNamePattern="should validate email"
```

### Verbose Output
```bash
npm test -- --verbose
```

### Debug in VS Code
Add breakpoint and run "Jest: Debug" from command palette

### Check Why Test Failed
```bash
npm test -- --detectOpenHandles
```

## CI/CD Integration

Tests run automatically in a neutral CI pipeline (e.g., GitHub Actions):

```yaml
name: tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test -- --coverage --ci
```

Quality gates:
- ✅ All tests must pass
- ✅ Coverage ≥70% on all metrics
- ✅ No unexpected console errors/warnings

## Troubleshooting

### Tests Timeout
Increase timeout in jest.config:
```json
{
  "testTimeout": 10000
}
```

### Mock Not Working
Clear mocks before each test:
```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Type Errors
Ensure `@types/jest` is installed:
```bash
npm install --save-dev @types/jest
```

### Coverage Too Low
Check uncovered lines:
```bash
npm test -- --coverage --verbose
```

Focus on:
- Error paths
- Edge cases
- Input validation
- State changes

## Next Steps

1. ✅ Run all tests: `npm test`
2. ✅ Check coverage: `npm test -- --coverage`
3. ✅ Add tests for new features
4. ✅ Maintain 70%+ coverage
5. ✅ Review failed tests in CI/CD
6. ✅ Update tests when refactoring

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Zod Testing Guide](https://zod.dev/)
- [Next.js Testing](https://nextjs.org/docs/testing)
