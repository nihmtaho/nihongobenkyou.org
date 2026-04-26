import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthError, updatePassword } from '../../api/auth'
import { supabase } from '../../api/supabase'

export const Route = createFileRoute('/auth/reset-password')({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenExpired, setTokenExpired] = useState(
    () => !window.location.hash.includes('access_token')
      && !window.location.search.includes('code='),
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const data = new FormData(form)
    const password = data.get('password') as string
    const confirm = data.get('confirmPassword') as string

    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự')
      return
    }
    if (password !== confirm) {
      setError('Mật khẩu không khớp')
      return
    }

    setIsLoading(true)
    try {
      // Exchange the hash token for a session first
      if (window.location.hash) {
        await supabase.auth.exchangeCodeForSession(window.location.href).catch(() => {})
      }
      await updatePassword(password)
      navigate({ to: '/auth/login' })
    }
    catch (err) {
      if (err instanceof AuthError && err.message.includes('hết hạn')) {
        setTokenExpired(true)
      }
      else {
        setError((err as Error).message)
      }
    }
    finally {
      setIsLoading(false)
    }
  }

  if (tokenExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card bg-base-100 border border-base-content/10 w-full max-w-sm">
          <div className="card-body gap-4 text-center">
            <h1 className="card-title font-[var(--br-heading-font)] text-2xl uppercase tracking-tight justify-center">
              LIÊN KẾT HẾT HẠN
            </h1>
            <p className="text-sm text-base-content/70">
              Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.
            </p>
            <Link to="/auth/forgot-password" className="btn btn-primary btn-sm font-[var(--br-heading-font)] uppercase">
              Yêu cầu liên kết mới
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card bg-base-100 border border-base-content/10 w-full max-w-sm">
        <div className="card-body gap-4">
          <h1 className="card-title font-[var(--br-heading-font)] text-2xl uppercase tracking-tight">
            ĐẶT MẬT KHẨU MỚI
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label" htmlFor="password">
                <span className="label-text font-[var(--br-mono-font)] text-[11px] uppercase">Mật khẩu mới</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                className="input input-bordered w-full"
                disabled={isLoading}
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor="confirmPassword">
                <span className="label-text font-[var(--br-mono-font)] text-[11px] uppercase">Xác nhận mật khẩu</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                className="input input-bordered w-full"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div role="alert" className="alert alert-error py-2">
                <span className="text-sm font-[var(--br-mono-font)]">{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full font-[var(--br-heading-font)] uppercase"
              disabled={isLoading}
            >
              {isLoading
                ? <span className="loading loading-spinner loading-sm" />
                : 'Đặt mật khẩu mới'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
