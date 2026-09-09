import { isTokenExpired } from '../../src/features/auth/utils/token-storage';

describe('Token Expiration Helper', () => {
  it('correctly identifies expired tokens', () => {
    const expiredPayload = { exp: Math.floor(Date.now() / 1000) - 3600 }; // 1 hour ago
    const b64 = btoa(JSON.stringify(expiredPayload)).replace(/\+/g, '-').replace(/\//g, '_');
    const token = `header.${b64}.signature`;
    
    expect(isTokenExpired(token)).toBe(true);
  });

  it('identifies active tokens', () => {
    const activePayload = { exp: Math.floor(Date.now() / 1000) + 3600 }; // 1 hour from now
    const b64 = btoa(JSON.stringify(activePayload)).replace(/\+/g, '-').replace(/\//g, '_');
    const token = `header.${b64}.signature`;
    
    expect(isTokenExpired(token)).toBe(false);
  });

  it('treats missing tokens as expired', () => {
    expect(isTokenExpired('')).toBe(true);
  });
});
