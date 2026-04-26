import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthForm } from '../../components/auth/AuthForm'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../stores/authStore'

export const Route = createFileRoute('/auth/register')({
  component: RegisterPage,
})

const EMAIL_RE = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/

function RegisterPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const { registerMutation } = useAuth()
  const [validationError, setValidationError] = useState<string | null>(null)

  if (isAuthenticated) {
    navigate({ to: '/' })
    return null
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
      onSuccess: () => navigate({ to: '/' }),
    })
  }

  const error = validationError ?? registerMutation.error?.message ?? null

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card bg-base-100 border border-base-content/10 w-full max-w-sm">
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

          <p className="text-sm text-center text-base-content/60">
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
