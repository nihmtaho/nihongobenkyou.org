import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { markProgressReset } from '../../api/profiles'
import { supabase } from '../../api/supabase'
import { db } from '../../db/schema'
import { useAuthStore } from '../../stores/authStore'

const RESET_CONFIRM_PHRASE = 'ĐẶT LẠI'

export function DangerZoneSection() {
  const queryClient = useQueryClient()
  const { userId, email } = useAuthStore()
  const isRealUser = email !== null && userId !== null

  const [showResetModal, setShowResetModal] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  async function handleResetProgress() {
    if (resetConfirmText !== RESET_CONFIRM_PHRASE)
      return
    setIsResetting(true)
    try {
      const now = new Date().toISOString()

      if (userId) {
        await db.user_cards.where('userId').equals(userId).delete()
        await db.kanji_cards.where('userId').equals(userId).delete()
        await db.active_vocab_srs.toCollection().filter(c => c.userId === userId).delete()
        await db.active_kanji_srs.toCollection().filter(c => c.userId === userId).delete()
        await db.custom_deck_srs.filter(c => c.userId === userId).delete()
        await db.streaks.where('userId').equals(userId).delete()
        await db.review_log.toCollection().filter(r => r.userId === userId).delete()
      }
      else {
        await db.user_cards.clear()
        await db.kanji_cards.clear()
        await db.active_vocab_srs.clear()
        await db.active_kanji_srs.clear()
        await db.custom_deck_srs.clear()
        await db.streaks.clear()
        await db.review_log.clear()
      }

      await db.sync_queue.clear()
      await db.settings.put({ key: 'progress_reset_at', value: now })
      await db.settings.delete('review_log_cursor')
      await db.settings.delete('sync_package_version')

      if (isRealUser) {
        await Promise.allSettled([
          markProgressReset(userId!),
          supabase.from('user_card_snapshots').delete().eq('user_id', userId),
          supabase.from('user_sync_packages').delete().eq('user_id', userId),
          supabase.from('user_cards').delete().eq('user_id', userId),
          supabase.from('kanji_cards').delete().eq('user_id', userId),
        ])

        try {
          const { data } = await supabase
            .from('review_log')
            .select('id')
            .eq('user_id', userId)
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (data?.id)
            await db.settings.put({ key: 'review_log_cursor', value: data.id })
        }
        catch {
          // Offline — progress_reset_at filter in downloadNewReviews handles this
        }
      }

      queryClient.invalidateQueries({ queryKey: ['due-cards', userId] })
      queryClient.invalidateQueries({ queryKey: ['kanji-srs-due', userId] })
      queryClient.invalidateQueries({ queryKey: ['user-cards', userId] })
      queryClient.invalidateQueries({ queryKey: ['streak', userId] })
      queryClient.invalidateQueries({ queryKey: ['total-user-cards', userId] })
      queryClient.invalidateQueries({ queryKey: ['future-due-cards', userId] })
      queryClient.invalidateQueries({ queryKey: ['active-deck-due', userId] })
      queryClient.invalidateQueries({ queryKey: ['custom-deck-progress', userId] })
      queryClient.invalidateQueries({ queryKey: ['all-custom-deck-srs-summary', userId] })
      queryClient.invalidateQueries({ queryKey: ['started-deck-ids', userId] })
      queryClient.invalidateQueries({ queryKey: ['unified-due-stats', userId] })

      setShowResetModal(false)
      setResetConfirmText('')
    }
    catch (err) {
      console.error(err)
    }
    finally {
      setIsResetting(false)
    }
  }

  function handleOpenResetModal() {
    setShowResetModal(true)
    setResetConfirmText('')
  }

  return (
    <>
      <Card className="border-l-4 border-l-destructive p-4">
        <CardContent className="p-0">
          <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">
            DANGER ZONE
          </h2>
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenResetModal}
            className="border-warning text-warning hover:bg-warning/10 w-full font-[var(--br-heading-font)] uppercase"
          >
            Đặt lại tiến trình
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showResetModal} onOpenChange={open => !isResetting && setShowResetModal(open)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-[var(--br-heading-font)] text-xl uppercase">
              ĐẶT LẠI TIẾN TRÌNH
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/70 mb-2">Hành động này sẽ xóa:</p>
          <ul className="text-sm text-foreground/70 mb-4 list-disc list-inside font-[var(--br-mono-font)] space-y-1">
            <li>Toàn bộ thẻ ôn tập từ vựng và kanji</li>
            <li>Lịch sử streak học tập</li>
            {isRealUser && <li>Dữ liệu đồng bộ trên Supabase</li>}
          </ul>
          <p className="text-xs text-warning font-[var(--br-mono-font)] uppercase mb-4">
            Nhập &quot;
            {RESET_CONFIRM_PHRASE}
            &quot; để xác nhận.
          </p>
          <Input
            type="text"
            value={resetConfirmText}
            onChange={e => setResetConfirmText(e.target.value.toUpperCase())}
            placeholder={RESET_CONFIRM_PHRASE}
            className="mb-4 font-[var(--br-mono-font)] uppercase"
            disabled={isResetting}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowResetModal(false)}
              className="font-[var(--br-mono-font)] uppercase"
              disabled={isResetting}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleResetProgress}
              disabled={resetConfirmText !== RESET_CONFIRM_PHRASE || isResetting}
              className="border-warning text-warning hover:bg-warning/10 font-[var(--br-heading-font)] uppercase"
              variant="outline"
            >
              {isResetting
                ? <Loader2 className="animate-spin h-4 w-4" />
                : 'Xác nhận đặt lại'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
