import type { CustomDeck } from '../../types/custom-deck'
import { useRef, useState } from 'react'
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
  const dialogRef = useRef<HTMLDialogElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim())
      return
    onSave({ title: title.trim(), description: description.trim() || undefined })
  }

  const isEditing = !!deck

  return (
    <dialog ref={dialogRef} className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">
          {isEditing ? 'Chỉnh sửa bộ từ vựng' : 'Tạo bộ từ vựng mới'}
        </h3>

        {!isOnline && (
          <div className="alert alert-warning mb-4 text-sm">
            Bạn đang ngoại tuyến. Vui lòng kết nối mạng để tiếp tục.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="form-control">
            <span className="label-text mb-1">Tên bộ từ vựng *</span>
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

          <label className="form-control">
            <span className="label-text mb-1">Mô tả</span>
            <textarea
              className="textarea textarea-bordered resize-none"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={!isOnline || isPending}
            />
          </label>

          <div className="modal-action mt-2">
            {isEditing && onDelete && (
              <button
                type="button"
                className="btn btn-error btn-outline"
                onClick={onDelete}
                disabled={!isOnline || isPending}
              >
                Xóa
              </button>
            )}
            <button type="button" className="btn" onClick={onClose} disabled={isPending}>
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isOnline || !title.trim() || isPending}
            >
              {isPending ? <span className="loading loading-spinner loading-sm" /> : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  )
}
