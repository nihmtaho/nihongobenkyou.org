import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { sendPasswordResetEmail } from '../../api/auth'

export const Route = createFileRoute('/auth/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    await sendPasswordResetEmail(email)
    setIsLoading(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card bg-base-100 border border-base-content/10 w-full max-w-sm">
          <div className="card-body gap-4 text-center">
            <h1 className="card-title font-[var(--br-heading-font)] text-2xl uppercase tracking-tight justify-center">
              KIỂM TRA HỘP THƯ
            </h1>
            <p className="text-sm text-base-content/70">
              Nếu email
              {' '}
              <strong>{email}</strong>
              {' '}
              tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu.
            </p>
            <Link to="/auth/login" className="btn btn-ghost btn-sm font-[var(--br-mono-font)] uppercase">
              Quay lại đăng nhập
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
            QUÊN MẬT KHẨU
          </h1>
          <p className="text-sm text-base-content/70">
            Nhập email của bạn để nhận liên kết đặt lại mật khẩu.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-control">
              <label className="label" htmlFor="email">
                <span className="label-text font-[var(--br-mono-font)] text-[11px] uppercase">Email</span>
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input input-bordered w-full"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full font-[var(--br-heading-font)] uppercase"
              disabled={isLoading}
            >
              {isLoading
                ? <span className="loading loading-spinner loading-sm" />
                : 'Gửi liên kết đặt lại'}
            </button>
          </form>

          <Link to="/auth/login" className="text-sm text-center font-[var(--br-mono-font)] text-primary underline">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  )
}
