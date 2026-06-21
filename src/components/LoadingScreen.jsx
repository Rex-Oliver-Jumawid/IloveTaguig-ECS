import { LoaderCircle, TriangleAlert } from 'lucide-react'

export default function LoadingScreen({ message, error = false }) {
  const Icon = error ? TriangleAlert : LoaderCircle
  return (
    <main className="loading-screen" id="main-content">
      <Icon className={error ? '' : 'spinner'} size={30} aria-hidden="true" />
      <p role="status" aria-live="polite">{message}</p>
      {error && <a className="text-link" href="/auth">Return to Sign In</a>}
    </main>
  )
}
