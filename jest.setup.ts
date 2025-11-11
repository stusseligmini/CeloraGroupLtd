/**
 * Jest Setup File
 * 
 * Global test configuration and mocks
 */

// Mock Next.js environment
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_AZURE_B2C_AUTHORITY_DOMAIN = 'test.b2clogin.com';

// Mock Web Crypto API for Node.js
if (typeof global.crypto === 'undefined') {
  const { webcrypto } = require('crypto');
  (global as any).crypto = webcrypto;
}

// Mock Buffer if not available
if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

// Suppress console errors in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
