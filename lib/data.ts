// Types matching Supabase schema exactly

export type Position = "PG" | "SG" | "SF" | "PF" | "C"

export interface Profile {
  id: string
  full_name: string
  email_prefix: string
  avatar_url: string | null
  position: Position | null
  is_player: boolean
  bio: string | null
  height: number | null  // cm
  weight: number | null  // kg
}

export interface LeaderboardEntry {
  id: string
  full_name: string
  position: Position
  avatar_url: string | null
  avg_shooting: number
  avg_defense: number
  avg_physical: number
  avg_dribbling: number
  avg_longevity: number
  overall: number
  vote_count: number
}

export interface TrashTalkRow {
  id: string
  player_id: string
  user_id: string
  message: string
  created_at: string
}

// Legacy shape used by UI components — mapped from LeaderboardEntry
export interface Player {
  id: string
  name: string
  position: string
  overall: number
  vote_count: number
  avatar_url: string | null
  attributes: {
    shooting: number
    defense: number
    physical: number
    dribbling: number
    longevity: number
  }
}

export interface TrashTalk {
  id: string
  playerId: string
  userId: string
  message: string
  timestamp: string
  likeCount: number
  likedByMe: boolean
}

export interface PlayerTag {
  label: string
  color: string // tailwind text color class
}

export function getPlayerTags(attrs: Player["attributes"]): PlayerTag[] {
  const tags: PlayerTag[] = []
  const { shooting, defense, physical, dribbling, longevity } = attrs

  // 球风标签
  if (shooting > 85) tags.push({ label: "中关村准星", color: "text-yellow-400" })
  if (defense > 85) tags.push({ label: "外线锁死", color: "text-blue-400" })
  if (dribbling > 85) tags.push({ label: "脚踝终结者", color: "text-orange-400" })
  if (physical > 85) tags.push({ label: "禁区野兽", color: "text-red-400" })
  if (longevity > 85) tags.push({ label: "铁人", color: "text-green-400" })
  if (shooting > 80 && dribbling > 80) tags.push({ label: "双能卫", color: "text-purple-400" })
  if (defense > 80 && physical > 80) tags.push({ label: "护框机器", color: "text-cyan-400" })
  if (shooting < 60 && defense > 80 && physical > 80) tags.push({ label: "纯防守型", color: "text-slate-400" })
  if (longevity > 90) tags.push({ label: "持久力大师", color: "text-emerald-400" })
  if (shooting > 90) tags.push({ label: "神射手", color: "text-yellow-300" })
  if (dribbling > 90) tags.push({ label: "控球宗师", color: "text-pink-400" })

  return tags.slice(0, 3) // max 3 tags per card
}

export const POSITION_CN: Record<Position, string> = {
  PG: "控球后卫",
  SG: "得分后卫",
  SF: "小前锋",
  PF: "大前锋",
  C: "中锋",
}

export function leaderboardToPlayer(e: LeaderboardEntry): Player {
  return {
    id: e.id,
    name: e.full_name,
    position: POSITION_CN[e.position] ?? e.position,
    overall: Math.round(e.overall),
    vote_count: e.vote_count,
    avatar_url: e.avatar_url,
    attributes: {
      shooting: Math.round(e.avg_shooting),
      defense: Math.round(e.avg_defense),
      physical: Math.round(e.avg_physical),
      dribbling: Math.round(e.avg_dribbling),
      longevity: Math.round(e.avg_longevity),
    },
  }
}
