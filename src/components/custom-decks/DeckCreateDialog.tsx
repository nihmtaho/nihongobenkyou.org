import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogFooter as DialogFooter,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from '@/components/ui/responsive-dialog'

interface Props {
  open: boolean
  isPending?: boolean
  onSave: (data: { title: string, description?: string }) => void
  onClose: () => void
}

export function DeckCreateDialog({ open, isPending, onSave, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim())
      return
    onSave({ title: title.trim(), description: description.trim() || undefined })
    setTitle('')
    setDescription('')
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo bộ từ vựng mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
          <Input
            placeholder="Tên deck *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            required
            autoFocus
          />
          <Input
            placeholder="Mô tả (tùy chọn)"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Hủy
            </Button>
            <Button type="submit" disabled={!title.trim() || isPending}>
              {isPending ? 'Đang tạo…' : 'Tạo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
