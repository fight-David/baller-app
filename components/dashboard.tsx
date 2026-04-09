"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Search, LayoutGrid, List } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { StatusBar } from "./status-bar"
import { PlayerTable } from "./player-table"
import { PlayerCard } from "./player-card"
import { PlayerModal } from "./player-modal"
import { useIsMobile } from "@/hooks/use-mobile"
import { supabase } from "@/lib/supabase"
import { leaderboardToPlayer, POSITION_CN, type Player, type TrashTalk, type LeaderboardEntry, type Profile } from "@/lib/data"
import type { User } from "@supabase/supabase-js"

interface DashboardProps {
  user: User
  onLogout: () => void
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [viewMode, setViewMode] = useState<"table" | "cards">("table")
  const [players, setPlayers] = useState<Player[]>([])
  const [trashTalks, setTrashTalks] = useState<TrashTalk[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const isMobile = useIsMobile()

  const effectiveViewMode = isMobile ? "cards" : viewMode

  const fetchLeaderboard = useCallback(async () => {
    setLoadingPlayers(true)
    const { data, error } = await supabase
      .from("v_leaderboard")
      .select("*")
      .order("overall", { ascending: false })

    if (!error && data) {
      const mapped = (data as LeaderboardEntry[]).map(leaderboardToPlayer)
      setPlayers(mapped)
      // 同步更新 selectedPlayer，确保弹窗内 overall 实时刷新
      setSelectedPlayer((prev) => {
        if (!prev) return prev
        const updated = mapped.find((p) => p.id === prev.id)
        return updated ?? prev
      })
    }
    setLoadingPlayers(false)
  }, [])

  useEffect(() => {
    fetchLeaderboard()
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setProfile(data as Profile)
    })

    // Realtime: refresh leaderboard whenever ratings change
    const channel = supabase
      .channel("ratings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "ratings" }, () => {
        fetchLeaderboard()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchLeaderboard])

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players
    const query = searchQuery.toLowerCase()
    return players.filter(
      (p) => p.name.toLowerCase().includes(query) || p.position.toLowerCase().includes(query)
    )
  }, [players, searchQuery])

  const handleSelectPlayer = async (player: Player) => {
    setSelectedPlayer(player)
    const { data } = await supabase
      .from("trash_talk")
      .select("*, trash_talk_likes(count)")
      .eq("player_id", player.id)

    if (data) {
      // fetch which ones current user liked
      const ids = data.map((r) => r.id)
      const { data: myLikes } = ids.length
        ? await supabase.from("trash_talk_likes").select("comment_id").eq("user_id", user.id).in("comment_id", ids)
        : { data: [] }
      const likedSet = new Set((myLikes ?? []).map((l) => l.comment_id))

      const mapped: TrashTalk[] = data.map((r) => ({
        id: r.id,
        playerId: r.player_id,
        userId: r.user_id,
        message: r.message,
        timestamp: r.created_at,
        likeCount: r.trash_talk_likes?.[0]?.count ?? 0,
        likedByMe: likedSet.has(r.id),
      }))
      // sort by likes desc
      mapped.sort((a, b) => b.likeCount - a.likeCount)
      setTrashTalks(mapped)
    }
  }

  const handleAddTrashTalk = async (playerId: string, message: string) => {
    const optimistic: TrashTalk = {
      id: `opt-${Date.now()}`,
      playerId,
      userId: user.id,
      message,
      timestamp: new Date().toISOString(),
      likeCount: 0,
      likedByMe: false,
    }
    setTrashTalks((prev) => [...prev, optimistic])

    const { data, error } = await supabase
      .from("trash_talk")
      .insert({ player_id: playerId, user_id: user.id, message })
      .select()
      .single()

    if (!error && data) {
      setTrashTalks((prev) =>
        prev.map((t) =>
          t.id === optimistic.id
            ? { id: data.id, playerId: data.player_id, userId: data.user_id, message: data.message, timestamp: data.created_at, likeCount: 0, likedByMe: false }
            : t
        )
      )
    } else if (error) {
      setTrashTalks((prev) => prev.filter((t) => t.id !== optimistic.id))
    }
  }

  const handleLikeTrashTalk = async (commentId: string) => {
    const target = trashTalks.find((t) => t.id === commentId)
    if (!target) return

    // Optimistic toggle
    setTrashTalks((prev) =>
      prev.map((t) =>
        t.id === commentId
          ? { ...t, likedByMe: !t.likedByMe, likeCount: t.likedByMe ? t.likeCount - 1 : t.likeCount + 1 }
          : t
      ).sort((a, b) => b.likeCount - a.likeCount)
    )

    if (target.likedByMe) {
      await supabase.from("trash_talk_likes").delete().eq("user_id", user.id).eq("comment_id", commentId)
    } else {
      await supabase.from("trash_talk_likes").insert({ user_id: user.id, comment_id: commentId })
    }
  }

  const handleRatePlayer = async (playerId: string, ratings: Player["attributes"]): Promise<void> => {
    await supabase.from("ratings").upsert(
      {
        player_id: playerId,
        rater_id: user.id,
        shooting: ratings.shooting,
        defense: ratings.defense,
        physical: ratings.physical,
        dribbling: ratings.dribbling,
        longevity: ratings.longevity,
      },
      { onConflict: "player_id,rater_id" }
    )
    // 主动刷新排行榜，确保 overall 实时更新（不依赖 Realtime 延迟）
    fetchLeaderboard()
  }

  const handleProfileUpdated = async (updated: Profile) => {
    const wasObserver = !profile?.is_player
    setProfile(updated)

    // 观察员首次激活为球员时，插入默认自评分让其出现在排行榜
    if (wasObserver && updated.is_player) {
      await supabase.from("ratings").insert({
        player_id: updated.id,
        rater_id: updated.id,
        shooting: 60,
        defense: 60,
        physical: 60,
        dribbling: 60,
        longevity: 60,
      })
      // 刷新排行榜让新球员出现
      fetchLeaderboard()
      return
    }

    // Immediately sync the player entry in the leaderboard list
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === updated.id
          ? {
              ...p,
              name: updated.full_name,
              position: updated.position ? (POSITION_CN[updated.position] ?? p.position) : p.position,
              avatar_url: updated.avatar_url,
            }
          : p
      )
    )
    // Also update selectedPlayer if it's open
    setSelectedPlayer((prev) =>
      prev?.id === updated.id
        ? {
            ...prev,
            name: updated.full_name,
            position: updated.position ? (POSITION_CN[updated.position] ?? prev.position) : prev.position,
            avatar_url: updated.avatar_url,
          }
        : prev
    )
  }

  const emailPrefix = user.email?.split("@")[0] ?? user.id

  return (
    <div className="min-h-screen pb-8">
      <StatusBar email={emailPrefix} profile={profile} onLogout={onLogout} onProfileUpdated={handleProfileUpdated} />

      <main className="pt-20 px-4 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block">
            <h1 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold text-foreground neon-text">
              [CAS] Baller Hall of Fame
            </h1>
            <div className="mt-4 absolute inset-0 overflow-hidden pointer-events-none">
              <div className="scanning-line absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            </div>
          </div>
          <p className="mt-2 text-muted-foreground font-mono text-sm">中国科学院篮球运动员实力排行榜</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索球员姓名或位置..."
              className="pl-10 bg-secondary/50 border-primary/30 focus:border-primary focus:ring-primary/30 font-mono placeholder:text-slate-500"
            />
          </div>

          {!isMobile && (
            <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 border border-border">
              <Button
                variant="ghost" size="sm"
                onClick={() => setViewMode("table")}
                className={`px-3 cursor-pointer ${viewMode === "table" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
              >
                <List className="w-4 h-4 mr-2" />表格
              </Button>
              <Button
                variant="ghost" size="sm"
                onClick={() => setViewMode("cards")}
                className={`px-3 cursor-pointer ${viewMode === "cards" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />卡片
              </Button>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-4">
          <p className="text-xs font-mono text-muted-foreground">
            {">"} 共发现 <span className="text-primary">{filteredPlayers.length}</span> 名球员
            {loadingPlayers && <span className="ml-2 text-primary animate-pulse">加载中...</span>}
          </p>
        </motion.div>

        {effectiveViewMode === "table" ? (
          <PlayerTable players={filteredPlayers} onPlayerClick={handleSelectPlayer} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredPlayers.map((player, index) => (
              <PlayerCard key={player.id} player={player} rank={index + 1} onClick={() => handleSelectPlayer(player)} />
            ))}
          </motion.div>
        )}

        {!loadingPlayers && filteredPlayers.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <p className="text-muted-foreground font-mono">{">"} 未找到匹配的球员</p>
          </motion.div>
        )}
      </main>

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          trashTalks={trashTalks.filter((t) => t.playerId === selectedPlayer.id)}
          currentUserId={user.id}
          onClose={() => setSelectedPlayer(null)}
          onAddTrashTalk={handleAddTrashTalk}
          onLikeTrashTalk={handleLikeTrashTalk}
          onRatePlayer={handleRatePlayer}
        />
      )}
    </div>
  )
}
