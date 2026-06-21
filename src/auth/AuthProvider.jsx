import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [isRecovery, setIsRecovery] = useState(false)

  const loadProfile = useCallback(async (userId) => {
    if (!supabase || !userId) {
      setProfile(null)
      return null
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, initials')
      .eq('id', userId)
      .single()

    if (error) {
      setProfile(null)
      setProfileError('Your account is signed in, but its profile could not be loaded. Try again or contact an administrator.')
      return null
    }

    setProfile(data)
    setProfileError('')
    return data
  }, [])

  useEffect(() => {
    let active = true

    async function initialize() {
      if (!supabase) {
        if (active) setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.getSession()
      if (!active) return
      if (error) setProfileError('The current session could not be restored. Sign in again.')
      const nextSession = data.session ?? null
      setSession(nextSession)
      if (nextSession?.user) await loadProfile(nextSession.user.id)
      if (active) setLoading(false)
    }

    initialize()

    const { data: listener } = supabase?.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setIsRecovery(event === 'PASSWORD_RECOVERY')
      if (!nextSession?.user) {
        setProfile(null)
        setProfileError('')
        setLoading(false)
      } else {
        setLoading(true)
        window.setTimeout(async () => {
          if (!active) return
          await loadProfile(nextSession.user.id)
          if (active) setLoading(false)
        }, 0)
      }
    }) ?? { data: { subscription: null } }

    return () => {
      active = false
      listener.subscription?.unsubscribe()
    }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
  }, [])

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    profileError,
    isRecovery,
    loadProfile,
    signOut,
  }), [session, profile, loading, profileError, isRecovery, loadProfile, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
