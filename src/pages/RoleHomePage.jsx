import { LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../auth/useAuth'

export default function RoleHomePage({ role }) {
  const { profile, user, signOut } = useAuth()
  const admin = role === 'admin'
  return <div className="dashboard-page"><a className="skip-link" href="#main-content">Skip to Main Content</a><header className="dashboard-header"><div className="brand"><img src="/assets/images/logo2.png" alt="" width="44" height="44" /><span><small>BARANGAY NAPINDAN</small><strong>ILoveTaguig ECS</strong></span></div><button className="secondary-button compact" type="button" onClick={signOut}><LogOut size={17} aria-hidden="true" /> Sign Out</button></header><main className="dashboard-main" id="main-content"><div className="role-icon">{admin ? <ShieldCheck size={32} aria-hidden="true" /> : <UserRound size={32} aria-hidden="true" />}</div><p className="role-label">{admin ? 'Administrator Access' : 'Business Owner Access'}</p><h1>Welcome, {profile?.full_name || 'User'}</h1><p>{admin ? 'Your administrator account is authenticated. The review dashboard arrives in Phase 3.' : 'Your owner account is authenticated. The application dashboard arrives in Phase 2.'}</p><dl><div><dt>Signed in as</dt><dd className="break-word">{user?.email}</dd></div><div><dt>Role</dt><dd>{profile?.role}</dd></div></dl></main></div>
}
