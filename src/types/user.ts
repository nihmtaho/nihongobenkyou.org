export interface UserProfile {
  user_id: string
  display_name: string
  avatar_url: string | null
  created_at: string
  deleted_at: string | null
}

export interface AuthState {
  userId: string | null
  email: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LeaderboardEntry {
  user_id: string
  display_name: string
  avatar_url: string | null
  cards_reviewed: number
  current_streak: number
  rank: number
}
