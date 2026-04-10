"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Power, User, Wifi, Settings, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProfileEditModal } from "./profile-edit-modal"
import { UserEditModal } from "./user-edit-modal"
import type { Profile } from "@/lib/data"

interface StatusBarProps {
  email: string
  profile: Profile | null
  onLogout: () => void
  onProfileUpdated: (p: Profile) => void
}

export function StatusBar({ email, profile, onLogout, onProfileUpdated }: StatusBarProps) {
  const [showEdit, setShowEdit] = useState(false)
  const [showUserEdit, setShowUserEdit] = useState(false)
  const agentName = profile?.full_name ?? email

  return (
    <>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 p-3"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between glass-panel rounded-lg px-4 py-2">
          {/* Left */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-xs font-mono text-muted-foreground hidden sm:inline">SYSTEM ONLINE</span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Wifi className="w-3 h-3 text-primary" />
              <span>CAS-NET</span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 border border-border">
              <User className="w-3 h-3 text-primary" />
              <span className="text-xs font-mono text-foreground">
                Agent: <span className="text-primary">{agentName}</span>
              </span>
            </div>
            {profile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEdit(true)}
                className="h-8 px-3 text-xs font-mono text-muted-foreground cursor-pointer hover:bg-secondary/50 border border-border"
              >
                <Settings className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">{profile.is_player ? "档案" : "注册球员"}</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUserEdit(true)}
              className="h-8 px-3 text-xs font-mono text-muted-foreground cursor-pointer hover:bg-secondary/50 border border-border"
            >
              <KeyRound className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">账号安全</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="h-8 px-3 text-xs font-mono text-destructive hover:bg-destructive/10 cursor-pointer hover:text-destructive border border-destructive/30"
            >
              <Power className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">SHUTDOWN</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {showEdit && profile && (
        <ProfileEditModal
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { onProfileUpdated(updated); setShowEdit(false) }}
        />
      )}

      {showUserEdit && (
        <UserEditModal
          currentEmail={profile?.email ?? email}
          onClose={() => setShowUserEdit(false)}
        />
      )}
    </>
  )
}
