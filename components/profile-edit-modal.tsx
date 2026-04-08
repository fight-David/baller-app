"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AvatarCropModal } from "./avatar-crop-modal"
import { supabase } from "@/lib/supabase"
import { POSITION_CN, type Position, type Profile } from "@/lib/data"

interface ProfileEditModalProps {
  profile: Profile
  onClose: () => void
  onSaved: (updated: Profile) => void
}

const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"]

export function ProfileEditModal({ profile, onClose, onSaved }: ProfileEditModalProps) {
  const [fullName, setFullName] = useState(profile.full_name)
  const [position, setPosition] = useState<Position | null>(profile.position)
  const [height, setHeight] = useState(profile.height?.toString() ?? "")
  const [weight, setWeight] = useState(profile.weight?.toString() ?? "")
  const [bio, setBio] = useState(profile.bio ?? "")
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "")
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError(">> ERROR: 图片不能超过 10MB"); return }
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.readAsDataURL(file)
    // reset input so same file can be re-selected
    e.target.value = ""
  }

  const handleCropConfirm = async (blob: Blob) => {
    const path = `${profile.id}.jpg`
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, blob, {
      upsert: true,
      contentType: "image/jpeg",
    })
    if (uploadErr) { setError(`>> ERROR: ${uploadErr.message}`); return }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path)
    // bust cache with timestamp
    setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`)
    setCropSrc(null)
  }

  const handleSave = async () => {
    if (!fullName.trim()) { setError(">> ERROR: 姓名不能为空"); return }
    setIsSubmitting(true)
    setError("")

    const updates: Partial<Profile> = {
      full_name: fullName.trim(),
      position,
      bio: bio.trim() || null,
      height: height ? Number(height) : null,
      weight: weight ? Number(weight) : null,
      avatar_url: avatarUrl || null,
    }

    const { error: err } = await supabase.from("profiles").update(updates).eq("id", profile.id)
    setIsSubmitting(false)
    if (err) { setError(`>> ERROR: ${err.message}`); return }
    onSaved({ ...profile, ...updates })
    onClose()
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md glass-panel rounded-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div className="scanning-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-secondary/50 cursor-pointer hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8 space-y-6">
              {/* Avatar upload */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16 border-2 border-primary/50">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-bold text-xl">
                      {profile.full_name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors"
                  >
                    <Camera className="w-3 h-3 text-primary-foreground" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                </div>
                <div>
                  <h2 className="font-bold text-foreground font-mono">编辑球员档案</h2>
                  <p className="text-xs text-muted-foreground font-mono">{profile.email_prefix}</p>
                  <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">点击头像更换图片，支持裁剪</p>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 姓名</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-secondary/50 border-primary/30 focus:border-primary font-mono"
                />
              </div>

              {/* Position */}
              {profile.is_player && (
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 位置</label>
                  <div className="flex gap-2 flex-wrap">
                    {POSITIONS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPosition(p)}
                        className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${position === p
                            ? "bg-primary/20 border-primary text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                          }`}
                      >
                        {POSITION_CN[p]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Height & Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 身高 (cm)</label>
                  <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" min={140} max={230} className="bg-secondary/50 border-primary/30 focus:border-primary font-mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 体重 (kg)</label>
                  <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" min={40} max={200} className="bg-secondary/50 border-primary/30 focus:border-primary font-mono" />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 简介</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="说点什么..."
                  rows={3}
                  className="w-full rounded-md bg-secondary/50 border border-primary/30 focus:border-primary focus:outline-none px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 resize-none"
                />
              </div>

              {error && <p className="text-destructive text-xs font-mono">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={onClose} className="flex-1 border border-border font-mono">取消</Button>
                <Button onClick={handleSave} disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground font-mono">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存"}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onClose={() => setCropSrc(null)}
        />
      )}
    </>
  )
}

