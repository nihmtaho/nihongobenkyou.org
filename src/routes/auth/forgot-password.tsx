import { createFileRoute, Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
        <div className="bg-background border border-border/10 w-full max-w-sm">
          <div className="p-6 flex flex-col gap-4 text-center">
            <h1 className="font-[var(--br-heading-font)] text-2xl uppercase tracking-tight">
              KIỂM TRA HỘP THƯ
            </h1>
            <p className="text-sm text-foreground/70">
              Nếu email
              {' '}
              <strong>{email}</strong>
              {' '}
              tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu.
            </p>
            <Button variant="ghost" size="sm" asChild className="font-[var(--br-mono-font)] uppercase">
              <Link to="/auth/login">
                Quay lại đăng nhập
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="bg-background border border-border/10 w-full max-w-sm">
        <div className="p-6 flex flex-col gap-4">
          <h1 className="font-[var(--br-heading-font)] text-2xl uppercase tracking-tight">
            QUÊN MẬT KHẨU
          </h1>
          <p className="text-sm text-foreground/70">
            Nhập email của bạn để nhận liên kết đặt lại mật khẩu.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="font-[var(--br-mono-font)] text-[11px] uppercase">
                Email
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

            <Button
              type="submit"
              className="w-full font-[var(--br-heading-font)] uppercase"
              disabled={isLoading}
            >
              {isLoading
                ? <Loader2 className="animate-spin h-4 w-4" />
                : 'Gửi liên kết đặt lại'}
            </Button>
          </form>

          <Link to="/auth/login" className="text-sm text-center font-[var(--br-mono-font)] text-primary underline">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  )
}
