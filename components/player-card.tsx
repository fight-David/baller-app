"use client"

import { motion } from "framer-motion"
import { Trophy, Medal, Award } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MiniRadarSparkline } from "./radar-chart"
import { getPlayerTags, type Player } from "@/lib/data"

interface PlayerCardProps {
  player: Player
  rank: number
  onClick: () => void
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />
  return <span className="text-sm font-mono text-muted-foreground">#{rank}</span>
}

export function PlayerCard({ player, rank, onClick }: PlayerCardProps) {
  const initials = player.name
    .split("")
    .slice(0, 2)
    .join("")

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="glass-panel rounded-xl p-5 cursor-pointer group relative overflow-hidden"
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5" />

      {/* Rank badge */}
      <div className="absolute top-2 right-2">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${rank <= 3 ? "bg-accent/20 border border-accent/50" : "bg-secondary/50"
          }`}>
          <RankIcon rank={rank} />
        </div>
      </div>

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar className="w-16 h-16 border-2 border-primary/30">
          <AvatarImage src={player.avatar_url ?? undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground truncate text-base">{player.name}</h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{player.position}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{player.email}</p>

          {/* OVR Score */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">OVR</span>
            <span className={`text-xl font-bold ${player.overall >= 90 ? "text-yellow-400 neon-text" :
                player.overall >= 80 ? "text-primary" :
                  player.overall >= 70 ? "text-accent" :
                    "text-foreground"
              }`}>
              {player.overall}
            </span>
          </div>
        </div>
      </div>

      {/* Tags */}
      {(() => {
        const tags = getPlayerTags(player.attributes)
        return tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag.label} className={`text-[10px] font-mono px-2 py-0.5 rounded bg-secondary/60 border border-border ${tag.color}`}>
                {tag.label}
              </span>
            ))}
          </div>
        ) : null
      })()}

      {/* Mini radar */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground uppercase">属性趋势</span>
        <MiniRadarSparkline data={player.attributes} />
      </div>
    </motion.div>
  )
}
