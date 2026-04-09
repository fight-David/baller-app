"use client"

import { motion } from "framer-motion"
import { Trophy, Medal, Award } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { MiniRadarSparkline } from "./radar-chart"
import type { Player } from "@/lib/data"

interface PlayerTableProps {
  players: Player[]
  onPlayerClick: (player: Player) => void
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400/20 border border-yellow-400/50">
        <Trophy className="w-4 h-4 text-yellow-400" />
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-300/20 border border-gray-300/50">
        <Medal className="w-4 h-4 text-gray-300" />
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-600/20 border border-amber-600/50">
        <Award className="w-4 h-4 text-amber-600" />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center w-8 h-8">
      <span className="text-sm font-mono text-muted-foreground">#{rank}</span>
    </div>
  )
}

export function PlayerTable({ players, onPlayerClick }: PlayerTableProps) {
  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-secondary/30">
            <th className="text-left p-4 text-xs font-mono text-muted-foreground uppercase tracking-wider">排名</th>
            <th className="text-left p-4 text-xs font-mono text-muted-foreground uppercase tracking-wider">球员</th>
            <th className="text-left p-4 text-xs font-mono text-muted-foreground uppercase tracking-wider hidden lg:table-cell">邮箱</th>
            <th className="text-left p-4 text-xs font-mono text-muted-foreground uppercase tracking-wider hidden sm:table-cell">位置</th>
            <th className="text-center p-4 text-xs font-mono text-muted-foreground uppercase tracking-wider">OVR</th>
            <th className="text-right p-4 text-xs font-mono text-muted-foreground uppercase tracking-wider hidden md:table-cell">属性曲线</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => {
            const rank = index + 1
            const initials = player.name.split("").slice(0, 2).join("")

            return (
              <motion.tr
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onPlayerClick(player)}
                className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-colors group"
              >
                <td className="p-4">
                  <RankBadge rank={rank} />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-primary/30 group-hover:border-primary/60 transition-colors">
                      <AvatarImage src={player.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground text-sm font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{player.name}</span>
                  </div>
                </td>
                <td className="p-4 hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground font-mono">{(player as any).email ?? '—'}</span>
                </td>
                <td className="p-4 hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground font-mono">{player.position}</span>
                </td>
                <td className="p-4 text-center">
                  <span className={`text-lg font-bold ${player.overall >= 90 ? "text-yellow-400 neon-text" :
                    player.overall >= 80 ? "text-primary" :
                      player.overall >= 70 ? "text-accent" :
                        "text-foreground"
                    }`}>
                    {player.overall}
                  </span>
                </td>
                <td className="p-4 hidden md:table-cell">
                  <div className="flex justify-end">
                    <MiniRadarSparkline data={player.attributes} />
                  </div>
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
