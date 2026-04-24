import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="card bg-base-100 shadow-xl w-full max-w-sm">
        <div className="card-body">
          <h1 className="card-title text-2xl">Login</h1>
          <p className="text-base-content/60">Authentication coming in Phase 2.</p>
        </div>
      </div>
    </div>
  )
}
