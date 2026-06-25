import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogFooter as DialogFooter,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from '@/components/ui/responsive-dialog'
import { deleteAccount, signOut } from '../../api/auth'
import { db } from '../../db/schema'
import { useTranslation } from '../../hooks/useTranslation'
import { useAuthStore } from '../../stores/authStore'

const DELETE_CONFIRM_PHRASE = 'XÓA'

export function AccountSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { userId, email } = useAuthStore()
  const isRealUser = email !== null && userId !== null

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

  async function handleDeleteAccount() {
    if (deleteConfirmText !== DELETE_CONFIRM_PHRASE || !userId)
      return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await db.vocabulary.clear()
      await db.srs_cards.clear()
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
          <h2 className="text-xl font-bold uppercase font-[var(--br-heading-font)] mb-4">{t('settings.account.title')}</h2>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="w-full font-[var(--br-heading-font)] uppercase"
            >
              {t('settings.account.logout')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenDeleteModal}
              className="border-destructive text-destructive hover:bg-destructive/10 w-full font-[var(--br-heading-font)] uppercase"
            >
              {t('settings.account.delete')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteModal} onOpenChange={open => !isDeleting && setShowDeleteModal(open)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-[var(--br-heading-font)] text-xl uppercase">
              {t('settings.account.deleteConfirmTitle')}
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
              {t('common.cancel')}
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
                : t('settings.account.deletePermanent')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
