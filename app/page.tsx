"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { LoginCard } from "@/components/login-card"
import { Dashboard } from "@/components/dashboard"
import { OnboardingModal } from "@/components/onboarding-modal"

type AppState = "loading" | "unauthenticated" | "onboarding" | "ready"

export default function Home() {
  const [appState, setAppState] = useState<AppState>("loading")
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION immediately on mount,
    // covering both page-refresh (existing session) and magic-link callback.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        checkProfile(session.user)
      } else {
        setUser(null)
        setAppState("unauthenticated")
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkProfile = async (u: User) => {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", u.id)
      .maybeSingle()

    setAppState(data ? "ready" : "onboarding")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setAppState("unauthenticated")
  }

  if (appState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-primary font-mono animate-pulse">{">> INITIALIZING..."}</p>
      </div>
    )
  }

  if (appState === "unauthenticated") {
    return <LoginCard />
  }

  if (appState === "onboarding" && user) {
    return (
      <OnboardingModal
        userId={user.id}
        emailPrefix={user.email?.split("@")[0] ?? user.id}
        onComplete={() => setAppState("ready")}
      />
    )
  }

  if (appState === "ready" && user) {
    return <Dashboard user={user} onLogout={handleLogout} />
  }

  return null
}
