import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { deleteAccount, signOut } from '../../api/auth'
import { markProgressReset } from '../../api/profiles'
import { supabase } from '../../api/supabase'
import { db } from '../../db/schema'
import { useAuthStore } from '../../stores/authStore'

const RESET_CONFIRM_PHRASE = 'ĐẶT LẠI'
const DELETE_CONFIRM_PHRASE = 'XÓA'

export function AccountSection() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { userId, email } = useAuthStore()
  const isRealUser = email !== null && userId !== null

  const [showResetModal, setShowResetModal] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleLogout() {
    await signOut()
    useAuthStore.setState({
      userId: null,
      email: null,
      isAuthenticated: false,
      isLoading: false,
      displayName: null,
      avatarUrl: null,
      reactivationBannerVisible: false,
    })
    queryClient.clear()
    navigate({ to: '/auth/login' })
  }

  async function handleResetProgress() {
    if (!userId || resetConfirmText !== RESET_CONFIRM_PHRASE)
      return
    setIsResetting(true)
    try {
      await db.user_cards.where('userId').equals(userId).delete()
      await db.kanji_cards.where('userId').equals(userId).delete()
      await db.active_vocab_srs.toCollection().filter(c => c.userId === userId).delete()
      await db.active_kanji_srs.toCollection().filter(c => c.userId === userId).delete()
      await db.streaks.where('userId').equals(userId).delete()
      await db.sync_queue.clear()
      await db.review_log.where('userId').equals(userId).delete()

      const now = new Date().toISOString()
      await db.settings.put({ key: 'progress_reset_at', value: now })
      await db.settings.delete('review_log_cursor')
      await db.settings.delete('sync_package_version')

      if (isRealUser) {
        // Mark reset in Supabase so new-device onboarding skips pre-reset events
        await Promise.allSettled([
          markProgressReset(userId),
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

  async function handleDeleteAccount() {
    if (deleteConfirmText !== DELETE_CONFIRM_PHRASE || !userId)
      return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await db.vocabulary.clear()
      await db.user_cards.clear()
      await db.kanji_cards.clear()
      await db.sessions.clear()
      await db.streaks.clear()
      await db.review_log.clear()
      await db.settings.clear()

      await deleteAccount()

      useAuthStore.setState({
        userId: null,
        email: null,
        isAuthenticated: false,
        isLoading: false,
        displayName: null,
        avatarUrl: null,
        reactivationBannerVisible: false,
      })
      queryClient.clear()
      navigate({ to: '/auth/login' })
    }
    catch (err) {
      setDeleteError((err as Error).message ?? 'Xóa tài khoản thất bại')
    }
    finally {
      setIsDeleting(false)
    }
  }

  function handleOpenResetModal() {
    setShowResetModal(true)
    setResetConfirmText('')
  }

  function handleOpenDeleteModal() {
    setShowDeleteModal(true)
    setDeleteConfirmText('')
    setDeleteError(null)
  }

  if (!isRealUser)
    return null

  return (
    <>
      <Card className="p-4">
        <CardContent className="p-0">
          <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">TÀI KHOẢN</h2>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenResetModal}
              className="border-[var(--warning)] text-[var(--warning)] hover:bg-[var(--warning)]/10 w-full font-[var(--br-heading-font)] uppercase"
            >
              Đặt lại tiến trình
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="w-full font-[var(--br-heading-font)] uppercase"
            >
              Đăng xuất
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenDeleteModal}
              className="border-destructive text-destructive hover:bg-destructive/10 w-full font-[var(--br-heading-font)] uppercase"
            >
              Xóa tài khoản
            </Button>
          </div>
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
            <li>Dữ liệu đồng bộ trên Supabase</li>
          </ul>
          <p className="text-xs text-[var(--warning)] font-[var(--br-mono-font)] uppercase mb-4">
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
              className="border-[var(--warning)] text-[var(--warning)] hover:bg-[var(--warning)]/10 font-[var(--br-heading-font)] uppercase"
              variant="outline"
            >
              {isResetting
                ? <Loader2 className="animate-spin h-4 w-4" />
                : 'Xác nhận đặt lại'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={open => !isDeleting && setShowDeleteModal(open)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-[var(--br-heading-font)] text-xl uppercase">
              XÁC NHẬN XÓA TÀI KHOẢN
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/70 mb-4">
            Xóa vĩnh viễn — không thể khôi phục. Nhập
            {' '}
            <strong className="font-[var(--br-mono-font)]">{DELETE_CONFIRM_PHRASE}</strong>
            {' '}
            để xác nhận.
          </p>
          <Input
            type="text"
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value.toUpperCase())}
            placeholder={DELETE_CONFIRM_PHRASE}
            className="border-destructive mb-4 font-[var(--br-mono-font)] uppercase"
            disabled={isDeleting}
          />
          {deleteError && (
            <Alert variant="destructive" className="py-2 mb-4">
              <AlertDescription className="text-sm font-[var(--br-mono-font)]">{deleteError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="font-[var(--br-mono-font)] uppercase"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive/10 font-[var(--br-heading-font)] uppercase"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== DELETE_CONFIRM_PHRASE || isDeleting}
            >
              {isDeleting
                ? <Loader2 className="animate-spin h-3 w-3" />
                : 'Xóa vĩnh viễn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
