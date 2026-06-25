import type { OAuthProvider } from '../../types/user'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AuthForm } from '../../components/auth/AuthForm'
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton'
import { useAuth } from '../../hooks/useAuth'
import { useTranslation } from '../../hooks/useTranslation'
import { useAuthStore } from '../../stores/authStore'

const OAUTH_PROVIDERS: OAuthProvider[] = ['google']

export const Route = createFileRoute('/auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const email = useAuthStore(s => s.email)
  const { loginMutation, oauthMutation } = useAuth()

  if (isAuthenticated && email !== null) {
    navigate({ to: '/' })
    return null
  }

  function handleSubmit(email: string, password: string) {
    loginMutation.mutate({ email, password }, {
      onSuccess: () => navigate({ to: '/' }),
    })
  }

  function handleGoogleSignIn() {
    oauthMutation.mutate('google')
  }

  const error = loginMutation.error?.message ?? null

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="bg-background border border-border/10 w-full max-w-sm">
        <div className="card-body gap-4">
          <h1 className="card-title font-[var(--br-heading-font)] text-2xl uppercase tracking-tight">
            {t('auth.login.title')}
          </h1>

          <AuthForm
            onSubmit={handleSubmit}
            isLoading={loginMutation.isPending}
            error={error}
            submitLabel={t('auth.login.submit')}
          />

          <div className="flex items-center gap-3 my-0">
            <div className="h-px flex-1 bg-border/20" />
            <span className="font-[var(--br-mono-font)] text-[11px] uppercase text-muted-foreground">{t('common.or')}</span>
            <div className="h-px flex-1 bg-border/20" />
          </div>

          {OAUTH_PROVIDERS.includes('google') && (
            <GoogleSignInButton
              onSignIn={handleGoogleSignIn}
              isLoading={oauthMutation.isPending}
              error={oauthMutation.error?.message ?? null}
            />
          )}

          <div className="flex flex-col gap-2 text-center">
            <Link
              to="/auth/forgot-password"
              className="text-sm font-[var(--br-mono-font)] text-primary underline"
            >
              {t('auth.forgotPassword')}
            </Link>
            <p className="text-sm text-foreground/60">
              {t('auth.noAccount')}
              {' '}
              <Link to="/auth/register" className="text-primary underline">
                {t('auth.register')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
