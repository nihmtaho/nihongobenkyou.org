import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthForm } from '../../components/auth/AuthForm'
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../stores/authStore'

export const Route = createFileRoute('/auth/register')({
  component: RegisterPage,
})

const EMAIL_RE = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/

function RegisterPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const storeEmail = useAuthStore(s => s.email)
  const { registerMutation, oauthMutation } = useAuth()
  const [validationError, setValidationError] = useState<string | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  if (isAuthenticated && storeEmail !== null) {
    navigate({ to: '/' })
    return null
  }

  if (registeredEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-background border border-border/10 w-full max-w-sm">
          <div className="p-6 flex flex-col gap-4 text-center">
            <h1 className="font-[var(--br-heading-font)] text-2xl uppercase tracking-tight">
              KIỂM TRA HỘP THƯ
            </h1>
            <p className="text-sm text-foreground/70">
              Chúng tôi đã gửi email xác nhận đến
              {' '}
              <strong>{registeredEmail}</strong>
              . Nhấn vào liên kết trong email để kích hoạt tài khoản.
            </p>
            <Link to="/auth/login" className="text-sm font-[var(--br-mono-font)] text-primary underline">
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    )
  }

  function handleSubmit(email: string, password: string, confirmPassword?: string) {
    setValidationError(null)

    if (!EMAIL_RE.test(email)) {
      setValidationError('Địa chỉ email không hợp lệ')
      return
    }
    if (password.length < 8) {
      setValidationError('Mật khẩu phải có ít nhất 8 ký tự')
      return
    }
    if (password !== confirmPassword) {
      setValidationError('Mật khẩu không khớp')
      return
    }

    registerMutation.mutate({ email, password }, {
      onSuccess: () => {
        // If Supabase auto-signed-in (email confirmation disabled), storeEmail will be set
        if (!useAuthStore.getState().email) {
          setRegisteredEmail(email)
        }
        else {
          navigate({ to: '/' })
        }
      },
    })
  }

  function handleGoogleSignIn() {
    oauthMutation.mutate('google')
  }

  const error = validationError ?? registerMutation.error?.message ?? null

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="bg-background border border-border/10 w-full max-w-sm">
        <div className="card-body gap-4">
          <h1 className="card-title font-[var(--br-heading-font)] text-2xl uppercase tracking-tight">
            ĐĂNG KÝ
          </h1>

          <AuthForm
            onSubmit={handleSubmit}
            isLoading={registerMutation.isPending}
            error={error}
            showConfirmPassword
            submitLabel="Tạo tài khoản"
          />

          <div className="flex items-center gap-3 my-0">
            <div className="h-px flex-1 bg-border/20" />
            <span className="font-[var(--br-mono-font)] text-[11px] uppercase text-muted-foreground">HOẶC</span>
            <div className="h-px flex-1 bg-border/20" />
          </div>

          <GoogleSignInButton
            onSignIn={handleGoogleSignIn}
            isLoading={oauthMutation.isPending}
            error={oauthMutation.error?.message ?? null}
          />

          <p className="text-sm text-center text-foreground/60">
            Đã có tài khoản?
            {' '}
            <Link to="/auth/login" className="text-primary underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
