import type { StreakData } from '../../db/schema'

import type { ReviewLogEntry } from '../../types/review-log'
import type { SyncPackagePayload } from '../../types/sync-package'
import { describe, expectTypeOf, it } from 'vitest'

describe('syncPackagePayload shape', () => {
  it('review_log is typed as ReviewLogEntry[]', () => {
    expectTypeOf<SyncPackagePayload['review_log']>().toEqualTypeOf<ReviewLogEntry[]>()
  })

  it('streaks is typed as StreakData[]', () => {
    expectTypeOf<SyncPackagePayload['streaks']>().toEqualTypeOf<StreakData[]>()
  })
})
