import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { clearTokens, getAccessToken, setTokens } from '../api/client'
import { authApi, type LoginCredentials } from '../api/auth'

interface User {
  username: string | null
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    return getAccessToken() ? { username: null } : null
  })

  const login = useCallback(async (credentials: LoginCredentials) => {
    const tokens = await authApi.login(credentials)
    setTokens(tokens)
    setUser({ username: credentials.username })
  }, [])

  const register = useCallback(async (credentials: LoginCredentials) => {
    await authApi.register(credentials)
    const tokens = await authApi.login(credentials)
    setTokens(tokens)
    setUser({ username: credentials.username })
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}