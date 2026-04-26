import type { AuthState } from '../types/user'
import { create } from 'zustand'

export const useAuthStore = create<AuthState>()(() => ({
  userId: null,
  email: null,
  isAuthenticated: false,
  isLoading: false,
  displayName: null,
  avatarUrl: null,
}))
