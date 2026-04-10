"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { LoginCard } from "@/components/login-card"
import { Dashboard } from "@/components/dashboard"
import { OnboardingModal } from "@/components/onboarding-modal"
import { Loader2 } from "lucide-react"

type AppState = "loading" | "unauthenticated" | "onboarding" | "ready"

// 骨架屏：与 Dashboard 等高，避免闪白
function AppSkeleton() {
  return (
    <div className="min-h-screen pb-8 animate-pulse">
      {/* StatusBar 占位 */}
      <div className="fixed top-0 left-0 right-0 z-50 p-3">
        <div className="max-w-7xl mx-auto h-10 rounded-lg bg-secondary/40 border border-border" />
      </div>
      <main className="pt-20 px-4 max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-8 space-y-3">
          <div className="h-10 w-80 mx-auto rounded bg-secondary/50" />
          <div className="h-4 w-48 mx-auto rounded bg-secondary/30" />
        </div>
        {/* 搜索栏 */}
        <div className="mb-6 h-10 w-full rounded-lg bg-secondary/40" />
        {/* 表格行占位 */}
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="h-10 bg-secondary/30 border-b border-border" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-border/50">
              <div className="w-8 h-8 rounded-full bg-secondary/50" />
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-secondary/50" />
                <div className="h-4 w-24 rounded bg-secondary/50" />
              </div>
              <div className="h-6 w-12 rounded bg-secondary/40" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("loading")
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        // 立即切换到骨架屏，不再保持 "loading" 空白页
        // 后台检查 profile，完成后切换到对应状态
        checkProfile(session.user)
      } else {
        setUser(null)
        setAppState("unauthenticated")
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkProfile = async (u: User) => {
    // 先乐观地切到 ready，同时查数据库确认
    // 这样用户不会盯着空白屏等待
    setAppState("ready")
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", u.id)
      .maybeSingle()

    if (!data) {
      // 新用户，需要 onboarding
      setAppState("onboarding")
    }
    // 若有 profile 则已经是 ready，无需再切
  }

  const handleLogout = () => {
    // 立即切换 UI，不等网络
    setUser(null)
    setAppState("unauthenticated")
    // 后台执行登出，不阻塞 UI
    supabase.auth.signOut()
  }

  if (appState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-primary font-mono text-sm animate-pulse">{">> INITIALIZING..."}</p>
        </div>
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

  // 过渡态：user 已有但 state 还在切换，显示骨架屏
  if (user) {
    return <AppSkeleton />
  }

  return null
}
