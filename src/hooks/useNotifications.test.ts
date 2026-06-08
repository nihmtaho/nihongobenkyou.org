import { act, renderHook } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotifications } from './useNotifications'

// Stub VAPID key so enable() doesn't bail out before calling Notification.requestPermission
beforeAll(() => {
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'test-vapid-public-key')
})

// --- Supabase mock ---
vi.mock('../api/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
  },
}))

// --- settingsStore mock ---
// Mutable state so tests can inspect changes
const storeState = {
  notificationsEnabled: false,
  reminderTime: '20:00',
  dailyTarget: 20,
  setNotificationsEnabled: vi.fn((v: boolean) => {
    storeState.notificationsEnabled = v
  }),
  setReminderTime: vi.fn((t: string) => {
    storeState.reminderTime = t
  }),
  setDailyTarget: vi.fn((n: number) => {
    storeState.dailyTarget = n
  }),
}

vi.mock('../stores/settingsStore', () => ({
  // eslint-disable-next-line react/component-hook-factories
  useSettingsStore: () => storeState,
}))

// --- Browser API helpers ---
function mockPushSupport() {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      register: vi.fn().mockResolvedValue({
        pushManager: {
          subscribe: vi.fn().mockResolvedValue({
            endpoint: 'https://push.example.com/sub1',
            getKey: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3]).buffer),
          }),
          getSubscription: vi.fn().mockResolvedValue({
            endpoint: 'https://push.example.com/sub1',
            unsubscribe: vi.fn().mockResolvedValue(true),
          }),
        },
      }),
      getRegistration: vi.fn().mockResolvedValue({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue({
            endpoint: 'https://push.example.com/sub1',
            unsubscribe: vi.fn().mockResolvedValue(true),
          }),
        },
      }),
    },
    writable: true,
    configurable: true,
  })
  ;(window as unknown as Record<string, unknown>).PushManager = {}
}

function mockNotification(permission: NotificationPermission) {
  ;(window as unknown as Record<string, unknown>).Notification = {
    permission,
    requestPermission: vi.fn().mockResolvedValue(permission),
  }
}

beforeEach(() => {
  storeState.notificationsEnabled = false
  storeState.reminderTime = '20:00'
  storeState.dailyTarget = 20
  vi.clearAllMocks()
  // Re-assign mocks after clearAllMocks
  storeState.setNotificationsEnabled = vi.fn((v: boolean) => {
    storeState.notificationsEnabled = v
  })
  storeState.setReminderTime = vi.fn((t: string) => {
    storeState.reminderTime = t
  })
  storeState.setDailyTarget = vi.fn((n: number) => {
    storeState.dailyTarget = n
  })
})

describe('useNotifications', () => {
  describe('supported flag', () => {
    it('is true when serviceWorker and PushManager are both available', async () => {
      mockPushSupport()
      const { result } = renderHook(() => useNotifications())
      // useEffect runs after initial render
      await act(async () => {})
      expect(result.current.supported).toBe(true)
    })

    it('is false when PushManager is not available', async () => {
      delete (window as unknown as Record<string, unknown>).PushManager
      const { result } = renderHook(() => useNotifications())
      await act(async () => {})
      expect(result.current.supported).toBe(false)
    })
  })

  describe('enable()', () => {
    it('calls Notification.requestPermission and registers service worker', async () => {
      mockPushSupport()
      mockNotification('granted')
      const { result } = renderHook(() => useNotifications())
      await act(async () => {})

      await act(async () => {
        result.current.toggle()
      })

      expect((window.Notification as unknown as { requestPermission: ReturnType<typeof vi.fn> }).requestPermission).toHaveBeenCalled()
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/push-worker.js')
    })

    it('sets notificationsEnabled to true on success', async () => {
      mockPushSupport()
      mockNotification('granted')
      const { result } = renderHook(() => useNotifications())
      await act(async () => {})

      await act(async () => {
        result.current.toggle()
      })

      expect(storeState.setNotificationsEnabled).toHaveBeenCalledWith(true)
    })

    it('does not subscribe when permission is denied', async () => {
      mockPushSupport()
      mockNotification('denied')
      const { result } = renderHook(() => useNotifications())
      await act(async () => {})

      await act(async () => {
        result.current.toggle()
      })

      expect(navigator.serviceWorker.register).not.toHaveBeenCalled()
      expect(storeState.setNotificationsEnabled).not.toHaveBeenCalledWith(true)
    })
  })

  describe('disable()', () => {
    it('sets notificationsEnabled to false immediately', async () => {
      mockPushSupport()
      storeState.notificationsEnabled = true
      const { result } = renderHook(() => useNotifications())
      await act(async () => {})

      await act(async () => {
        result.current.toggle()
      })

      expect(storeState.setNotificationsEnabled).toHaveBeenCalledWith(false)
    })
  })

  describe('updateTime and updateTarget', () => {
    it('updateTime delegates to setReminderTime', async () => {
      const { result } = renderHook(() => useNotifications())
      await act(async () => {
        result.current.updateTime('08:30')
      })
      expect(storeState.setReminderTime).toHaveBeenCalledWith('08:30')
    })

    it('updateTarget delegates to setDailyTarget', () => {
      const { result } = renderHook(() => useNotifications())
      act(() => result.current.updateTarget(30))
      expect(storeState.setDailyTarget).toHaveBeenCalledWith(30)
    })
  })
})
