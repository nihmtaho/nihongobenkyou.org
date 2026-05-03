import { Loader2 } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AuthFormProps {
  onSubmit: (email: string, password: string, confirmPassword?: string) => void
  isLoading: boolean
  error: string | null
  showConfirmPassword?: boolean
  submitLabel?: string
}

export function AuthForm({ onSubmit, isLoading, error, showConfirmPassword = false, submitLabel = 'Đăng nhập' }: AuthFormProps) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const email = data.get('email') as string
    const password = data.get('password') as string
    const confirmPassword = showConfirmPassword ? (data.get('confirmPassword') as string) : undefined
    onSubmit(email, password, confirmPassword)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <Label htmlFor="email" className="font-[var(--br-mono-font)] text-[11px] uppercase">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full"
          disabled={isLoading}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="password" className="font-[var(--br-mono-font)] text-[11px] uppercase">Mật khẩu</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={showConfirmPassword ? 'new-password' : 'current-password'}
          className="w-full"
          disabled={isLoading}
        />
      </div>

      {showConfirmPassword && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="confirmPassword" className="font-[var(--br-mono-font)] text-[11px] uppercase">Xác nhận mật khẩu</Label>
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
      )}

      {error && (
        <Alert variant="destructive">
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
          : submitLabel}
      </Button>
    </form>
  )
}
