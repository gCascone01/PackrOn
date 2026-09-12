"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/supabase/config"

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  configured: boolean
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const CONFIGURED = isSupabaseConfigured()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!CONFIGURED) {
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setUser(data.session?.user ?? null)
    } catch {
      setSession(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!CONFIGURED) {
      setLoading(false)
      return
    }
    const supabase = createClient()
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!CONFIGURED) return
    const supabase = createClient()
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, loading, configured: CONFIGURED, signOut, refresh }),
    [user, session, loading, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
