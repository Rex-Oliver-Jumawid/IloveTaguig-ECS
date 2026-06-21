import { CircleCheck, CircleAlert } from 'lucide-react'

export default function FormMessage({ children, type = 'error' }) {
  if (!children) return null
  const Icon = type === 'success' ? CircleCheck : CircleAlert
  return <div className={`form-message ${type}`} role={type === 'error' ? 'alert' : 'status'} aria-live="polite"><Icon size={18} aria-hidden="true" /><span>{children}</span></div>
}
