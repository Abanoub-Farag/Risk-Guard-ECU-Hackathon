// In a hardened production app, access tokens should ideally be kept only in memory,
// and refresh tokens in HttpOnly cookies managed by the backend.
// For the sake of this SPA implementation, we store the short-lived access token in memory.

let inMemoryAccessToken: string | null = null;

export const tokenStorage = {
  getToken: () => inMemoryAccessToken,
  setToken: (token: string) => {
    inMemoryAccessToken = token;
  },
  clearToken: () => {
    inMemoryAccessToken = null;
  }
};

/**
 * Checks if a JWT is expired (without verifying signature on client)
 */
export function isTokenExpired(token: string): boolean {
  if (!token) return true;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const payload = JSON.parse(jsonPayload);
    // Add 10 second buffer
    return (payload.exp * 1000) <= (Date.now() + 10000);
  } catch (e) {
    return true;
  }
}
