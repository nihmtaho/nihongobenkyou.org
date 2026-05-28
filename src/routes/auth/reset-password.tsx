import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
        <div className="bg-background border border-border/10 w-full max-w-sm">
          <div className="p-6 flex flex-col gap-4 text-center">
            <h1 className="font-[var(--br-heading-font)] text-2xl uppercase tracking-tight">
              LIÊN KẾT HẾT HẠN
            </h1>
            <p className="text-sm text-foreground/70">
              Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.
            </p>
            <Button size="sm" asChild className="font-[var(--br-heading-font)] uppercase">
              <Link to="/auth/forgot-password">
                Yêu cầu liên kết mới
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
            ĐẶT MẬT KHẨU MỚI
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="password" className="font-[var(--br-mono-font)] text-[11px] uppercase">
                Mật khẩu mới
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                className="w-full"
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="confirmPassword" className="font-[var(--br-mono-font)] text-[11px] uppercase">
                Xác nhận mật khẩu
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                className="w-full"
                disabled={isLoading}
              />
            </div>

            {error && (
              <Alert role="alert" className="bg-destructive/10 border-destructive/50 py-2">
                <AlertDescription className="text-sm font-[var(--br-mono-font)]">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full font-[var(--br-heading-font)] uppercase"
              disabled={isLoading}
            >
              {isLoading
                ? <Loader2 className="animate-spin h-4 w-4" />
                : 'Đặt mật khẩu mới'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
