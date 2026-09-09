import { AuthResponse, LoginDTO } from '../types/auth.types';
import { tokenStorage } from '../utils/token-storage';

const API_BASE_URL = '/api/v1/auth';

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.map(cb => cb(token));
  refreshSubscribers = [];
}

export const authApi = {
  async login(payload: LoginDTO): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Invalid credentials');
    
    const data: AuthResponse = await res.json();
    tokenStorage.setToken(data.accessToken);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/logout`, { method: 'POST' });
    } finally {
      tokenStorage.clearToken();
    }
  },

  async refreshToken(): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/refresh`, { method: 'POST' });
    if (!res.ok) {
      tokenStorage.clearToken();
      throw new Error('Session expired');
    }
    const data = await res.json();
    tokenStorage.setToken(data.accessToken);
    return data.accessToken;
  }
};

/**
 * Interceptor logic for fetch API.
 * Wraps native fetch to automatically attach tokens and handle 401s.
 */
export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let token = tokenStorage.getToken();
  
  const requestInit = init || {};
  requestInit.headers = new Headers(requestInit.headers);
  if (token) {
    requestInit.headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(input, requestInit);

  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await authApi.refreshToken();
        isRefreshing = false;
        onRefreshed(newToken);
      } catch (err) {
        isRefreshing = false;
        // Broadcast failure or force logout
        refreshSubscribers = [];
        window.dispatchEvent(new Event('auth:logout'));
        throw err;
      }
    }

    // Queue the retry
    return new Promise(resolve => {
      refreshSubscribers.push((newToken: string) => {
        (requestInit.headers as Headers).set('Authorization', `Bearer ${newToken}`);
        resolve(fetch(input, requestInit));
      });
    });
  }

  if (response.status === 403) {
    window.dispatchEvent(new Event('auth:logout'));
  }

  return response;
}
