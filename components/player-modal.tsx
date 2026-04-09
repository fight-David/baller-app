"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, MessageSquare, Heart, CheckCircle, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { RadarChart } from "./radar-chart"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import type { Player, TrashTalk } from "@/lib/data"

interface PlayerModalProps {
  player: Player | null
  trashTalks: TrashTalk[]
  currentUserId: string
  onClose: () => void
  onAddTrashTalk: (playerId: string, message: string) => void
  onLikeTrashTalk: (commentId: string) => void
  onRatePlayer: (playerId: string, ratings: Player["attributes"]) => Promise<void>
}

const DEFAULT_RATINGS: Player["attributes"] = { shooting: 50, defense: 50, physical: 50, dribbling: 50, longevity: 50 }

const ratingLabels = [
  { key: "shooting", label: "投射 Shooting" },
  { key: "defense", label: "防守 Defense" },
  { key: "physical", label: "身体 Physical" },
  { key: "dribbling", label: "控球 Dribbling" },
  { key: "longevity", label: "持久力 Longevity" },
] as const

// 政治/敏感词过滤列表
const SENSITIVE_WORDS = [
  "习近平", "毛泽东", "共产党", "国民党", "台独", "藏独", "新疆", "法轮功",
  "天安门", "六四", "民主运动", "颠覆", "推翻", "革命", "政变",
  "jinping", "ccp", "falun", "tiananmen",
]

function containsSensitiveContent(text: string): boolean {
  const lower = text.toLowerCase()
  return SENSITIVE_WORDS.some(word => lower.includes(word.toLowerCase()))
}

// 智能排序：综合赞数和时间新鲜度
// 算法：score = likeCount * 10 + freshness_bonus
// freshness_bonus: 24h内 +15, 72h内 +8, 7天内 +3, 超过7天 0
function getCommentScore(talk: TrashTalk): number {
  const now = Date.now()
  const age = now - new Date(talk.timestamp).getTime()
  const hour = 3600 * 1000
  const day = 24 * hour

  let freshBonus = 0
  if (age < day) freshBonus = 15
  else if (age < 3 * day) freshBonus = 8
  else if (age < 7 * day) freshBonus = 3

  return talk.likeCount * 10 + freshBonus
}

const PAGE_SIZE = 10

export function PlayerModal({ player, trashTalks, currentUserId, onClose, onAddTrashTalk, onLikeTrashTalk, onRatePlayer }: PlayerModalProps) {
  const [userRatings, setUserRatings] = useState<Player["attributes"]>(DEFAULT_RATINGS)
  const [hasRated, setHasRated] = useState<boolean | null>(null)
  const [ratingSuccess, setRatingSuccess] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    if (!player) return
    setHasRated(null)
    setRatingSuccess(false)
    setUserRatings(DEFAULT_RATINGS)
    setVisibleCount(PAGE_SIZE)

    supabase
      .from("ratings")
      .select("shooting,defense,physical,dribbling,longevity")
      .eq("player_id", player.id)
      .eq("rater_id", currentUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUserRatings({
            shooting: data.shooting,
            defense: data.defense,
            physical: data.physical,
            dribbling: data.dribbling,
            longevity: data.longevity,
          })
          setHasRated(true)
        } else {
          setHasRated(false)
        }
      })
  }, [player?.id, currentUserId])

  // 智能排序后的评论列表
  const sortedTalks = useMemo(() => {
    return [...trashTalks].sort((a, b) => getCommentScore(b) - getCommentScore(a))
  }, [trashTalks])

  const visibleTalks = sortedTalks.slice(0, visibleCount)
  const hasMore = visibleCount < sortedTalks.length
  const remaining = sortedTalks.length - visibleCount

  if (!player) return null

  const initials = player.name.split("").slice(0, 2).join("");

  const handleSubmitRating = async () => {
    await onRatePlayer(player.id, userRatings)
    setHasRated(true)
    setRatingSuccess(true)
    setTimeout(() => setRatingSuccess(false), 3000)
  }

  const handleSubmitTrashTalk = () => {
    const msg = newMessage.trim()
    if (!msg) return

    // 政治/敏感词过滤
    if (containsSensitiveContent(msg)) {
      toast.error("评论包含不当内容，无法发布", {
        description: "请避免涉及政治、宗教等敏感话题",
        duration: 3500,
      })
      return
    }

    onAddTrashTalk(player.id, msg)
    setNewMessage("")
  }

  return (
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
          className="w-full max-w-3xl max-h-[90vh] overflow-hidden glass-panel rounded-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-secondary/50 cursor-pointer hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div className="scanning-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>

          <div className="overflow-y-auto max-h-[90vh]">
            {/* Header */}
            <div className="p-8 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
              <div className="flex items-center gap-5">
                <Avatar className="w-24 h-24 border-2 border-primary/50">
                  <AvatarImage src={player.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground text-2xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-foreground">
                    {player.name}
                  </h2>
                  <p className="text-sm text-muted-foreground font-mono mt-1">
                    {player.position}
                  </p>
                  {/* 邮箱 / 身高 / 体重 信息 */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {player.email && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-muted-foreground border border-border bg-secondary/40">
                        <span className="text-primary/60">@</span>{player.email}
                      </span>
                    )}
                    {player.height && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-muted-foreground border border-border bg-secondary/40">
                        <span className="text-primary/60">H</span>{player.height} cm
                      </span>
                    )}
                    {player.weight && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-muted-foreground border border-border bg-secondary/40">
                        <span className="text-primary/60">W</span>{player.weight} kg
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">OVERALL</span>
                    <span className={`text-3xl font-bold ${player.overall >= 90 ? "text-yellow-400 neon-text" :
                        player.overall >= 80 ? "text-primary" :
                          player.overall >= 70 ? "text-accent" : "text-foreground"
                      }`}>
                      {player.overall}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">({player.vote_count} 票)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content grid */}
            <div className="p-8 grid md:grid-cols-2 gap-8">
              {/* Radar Chart */}
              <div className="flex flex-col items-center">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-6">
                  {">"} 属性雷达图
                </h3>
                <RadarChart data={player.attributes} size={220} />
              </div>

              {/* User Rating */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                    {">"} 你的评分
                  </h3>
                  {hasRated === false && (
                    <span className="text-[10px] font-mono text-yellow-400 border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 rounded">
                      尚未评分
                    </span>
                  )}
                  {hasRated === true && !ratingSuccess && (
                    <span className="text-[10px] font-mono text-primary border border-primary/30 bg-primary/10 px-2 py-0.5 rounded">
                      已评分
                    </span>
                  )}
                </div>

                {hasRated === null ? (
                  <p className="text-muted-foreground text-xs font-mono animate-pulse">加载中...</p>
                ) : (
                  <div className="space-y-5">
                    {ratingLabels.map(({ key, label }) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-muted-foreground">{label}</span>
                          <span className="text-sm font-bold text-primary">{userRatings[key]}</span>
                        </div>
                        <Slider
                          value={[userRatings[key]]}
                          onValueChange={([value]) => setUserRatings((prev) => ({ ...prev, [key]: value }))}
                          max={100} step={1}
                          className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_[role=slider]]:shadow-[0_0_10px_rgba(34,211,238,0.5)] [&_.relative]:bg-secondary [&_[data-orientation=horizontal]>span:first-child]:bg-gradient-to-r [&_[data-orientation=horizontal]>span:first-child]:from-primary [&_[data-orientation=horizontal]>span:first-child]:to-accent"
                        />
                      </div>
                    ))}

                    <AnimatePresence>
                      {ratingSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 text-green-400 text-xs font-mono bg-green-400/10 border border-green-400/30 rounded-lg px-3 py-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          评分提交成功！
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button
                      onClick={handleSubmitRating}
                      className="w-full mt-2 bg-gradient-to-r from-primary to-accent text-primary-foreground font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer hover:opacity-90"
                    >
                      {hasRated ? "更新评分" : "提交评分"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Trash Talk Section */}
            <div className="p-8 border-t border-border">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {">"} 垃圾话区 Trash Talk
                </h3>
                {sortedTalks.length > 0 && (
                  <span className="text-[10px] font-mono text-muted-foreground/60 border border-border px-2 py-0.5 rounded">
                    共 {sortedTalks.length} 条
                  </span>
                )}
              </div>

              {/* 评论列表 */}
              <div className="mb-4 space-y-3 bg-secondary/30 rounded-lg p-4 max-h-72 overflow-y-auto">
                {sortedTalks.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm font-mono py-8">暂无评论，来点狠话？</p>
                ) : (
                  <>
                    {visibleTalks.map((talk) => {
                      const isNew = Date.now() - new Date(talk.timestamp).getTime() < 24 * 3600 * 1000
                      return (
                        <motion.div
                          key={talk.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="font-mono text-sm pb-3 border-b border-border/30 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-primary">[匿名]</span>
                              <span className="text-muted-foreground text-xs">
                                {new Date(talk.timestamp).toLocaleString("zh-CN", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {isNew && (
                                <span className="text-[9px] font-mono text-green-400 border border-green-400/30 bg-green-400/10 px-1 rounded">NEW</span>
                              )}
                              {talk.userId === currentUserId && (
                                <span className="text-[10px] text-primary/60 font-mono border border-primary/30 px-1 rounded">你的评论</span>
                              )}
                            </div>
                            <button
                              onClick={() => onLikeTrashTalk(talk.id)}
                              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${talk.likedByMe ? "text-red-400 bg-red-400/10" : "text-muted-foreground hover:text-red-400 hover:bg-red-400/10"}`}
                            >
                              <Heart className={`w-3 h-3 ${talk.likedByMe ? "fill-current" : ""}`} />
                              {talk.likeCount > 0 && <span>{talk.likeCount}</span>}
                            </button>
                          </div>
                          <p className="text-foreground pl-4 mt-1 leading-relaxed">
                            {talk.message}
                          </p>
                        </motion.div>
                      )
                    })}

                    {/* 懒加载更多 */}
                    {hasMore && (
                      <button
                        onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors py-2 border border-dashed border-border/50 hover:border-primary/30 rounded-lg"
                      >
                        <ChevronDown className="w-3 h-3" />
                        加载更多（还有 {remaining} 条）
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* 输入框 */}
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitTrashTalk()}
                  placeholder="说点狠话... (Enter 发送)"
                  maxLength={200}
                  className="flex-1 bg-secondary/50 border-primary/30 focus:border-primary font-mono"
                />
                <Button onClick={handleSubmitTrashTalk} size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {newMessage.length > 150 && (
                <p className="text-[10px] font-mono text-muted-foreground/60 mt-1 text-right">{newMessage.length}/200</p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
