import type { CustomDeck } from '../../types/custom-deck'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

interface Props {
  deck?: CustomDeck
  onSave: (data: { title: string, description?: string }) => void
  onDelete?: () => void
  onClose: () => void
  isPending?: boolean
}

export function DeckEditor({ deck, onSave, onDelete, onClose, isPending }: Props) {
  const { isOnline } = useOnlineStatus()
  const [title, setTitle] = useState(deck?.title ?? '')
  const [description, setDescription] = useState(deck?.description ?? '')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim())
      return
    onSave({ title: title.trim(), description: description.trim() || undefined })
  }

  const isEditing = !!deck

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Chỉnh sửa bộ từ vựng' : 'Tạo bộ từ vựng mới'}
          </DialogTitle>
        </DialogHeader>

        {!isOnline && (
          <Alert className="bg-warning/10 border-warning/50 mb-4 text-sm">
            <AlertDescription>
              Bạn đang ngoại tuyến. Vui lòng kết nối mạng để tiếp tục.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm mb-1">Tên bộ từ vựng *</span>
            <input
              type="text"
              className="input input-bordered"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
              required
              disabled={!isOnline || isPending}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm mb-1">Mô tả</span>
            <textarea
              className="textarea textarea-bordered resize-none"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={!isOnline || isPending}
            />
          </label>

          <DialogFooter className="mt-2">
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={onDelete}
                disabled={!isOnline || isPending}
              >
                Xóa
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={!isOnline || !title.trim() || isPending}
            >
              {isPending ? <Loader2 className="animate-spin h-4 w-4" /> : 'Lưu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
