export interface UserProfile {
  user_id: string
  display_name: string | null
  avatar_url: string | null // storage PATH (e.g. "{userId}/avatar.jpg"), NOT a signed URL
  created_at: string
  updated_at: string
  deleted_at: string | null
  progress_reset_at: string | null
}

export interface AuthState {
  userId: string | null
  email: string | null
  isAuthenticated: boolean
  isLoading: boolean
  displayName: string | null
  avatarUrl: string | null // signed URL derived from avatar storage path, not persisted to DB
  reactivationBannerVisible: boolean
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  avatar_url: string | null
  cards_reviewed: number
  is_current_user: boolean
}

export type OAuthProvider = 'google' | 'apple'

export interface AnonymousMigrationResult {
  cardsMigrated: number
  anonymousUserId: string
  authenticatedUserId: string
}

export interface AccountDeletionState {
  isDeleted: boolean
  deletedAt: string | null
  isWithinGracePeriod: boolean
}
