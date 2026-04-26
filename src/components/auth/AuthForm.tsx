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
      <div className="form-control">
        <label className="label" htmlFor="email">
          <span className="label-text font-[var(--br-mono-font)] text-[11px] uppercase">Email</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input input-bordered w-full"
          disabled={isLoading}
        />
      </div>

      <div className="form-control">
        <label className="label" htmlFor="password">
          <span className="label-text font-[var(--br-mono-font)] text-[11px] uppercase">Mật khẩu</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={showConfirmPassword ? 'new-password' : 'current-password'}
          className="input input-bordered w-full"
          disabled={isLoading}
        />
      </div>

      {showConfirmPassword && (
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
      )}

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
          : submitLabel}
      </button>
    </form>
  )
}
