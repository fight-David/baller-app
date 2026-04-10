"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  MessageSquare,
  Heart,
  CheckCircle,
  ChevronDown,
  BarChart2,
  Star,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { RadarChart } from "./radar-chart";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Player, TrashTalk } from "@/lib/data";

interface PlayerModalProps {
  player: Player | null;
  trashTalks: TrashTalk[];
  currentUserId: string;
  onClose: () => void;
  onAddTrashTalk: (playerId: string, message: string) => void;
  onLikeTrashTalk: (commentId: string) => void;
  onRatePlayer: (
    playerId: string,
    ratings: Player["attributes"],
  ) => Promise<void>;
}

const DEFAULT_RATINGS: Player["attributes"] = {
  shooting: 50,
  defense: 50,
  physical: 50,
  dribbling: 50,
  longevity: 50,
};

const ratingLabels = [
  { key: "shooting", label: "投射 Shooting" },
  { key: "defense", label: "防守 Defense" },
  { key: "physical", label: "身体 Physical" },
  { key: "dribbling", label: "控球 Dribbling" },
  { key: "longevity", label: "持久力 Longevity" },
] as const;

const SENSITIVE_WORDS = [
  "习近平",
  "毛泽东",
  "共产党",
  "国民党",
  "台独",
  "藏独",
  "新疆",
  "法轮功",
  "天安门",
  "六四",
  "民主运动",
  "颠覆",
  "推翻",
  "革命",
  "政变",
  "jinping",
  "ccp",
  "falun",
  "tiananmen",
];

function containsSensitiveContent(text: string): boolean {
  const lower = text.toLowerCase();
  return SENSITIVE_WORDS.some((word) => lower.includes(word.toLowerCase()));
}

function getCommentScore(talk: TrashTalk): number {
  const now = Date.now();
  const age = now - new Date(talk.timestamp).getTime();
  const day = 24 * 3600 * 1000;
  let freshBonus = 0;
  if (age < day) freshBonus = 15;
  else if (age < 3 * day) freshBonus = 8;
  else if (age < 7 * day) freshBonus = 3;
  return talk.likeCount * 10 + freshBonus;
}

const PAGE_SIZE = 10;

type Tab = "radar" | "rating" | "trash";

// ── Skeleton 占位组件 ──────────────────────────────────────────
function RatingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {ratingLabels.map(({ key }) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 w-28 bg-secondary rounded" />
            <div className="h-4 w-8 bg-secondary rounded" />
          </div>
          <div className="h-2 w-full bg-secondary rounded-full" />
        </div>
      ))}
      <div className="h-10 w-full bg-secondary rounded-lg mt-2" />
    </div>
  );
}

function TrashSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="pb-3 border-b border-border/30 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-10 bg-secondary rounded" />
            <div className="h-3 w-24 bg-secondary rounded" />
          </div>
          <div className="h-4 w-full bg-secondary rounded ml-4" />
        </div>
      ))}
    </div>
  );
}

export function PlayerModal({
  player,
  trashTalks,
  currentUserId,
  onClose,
  onAddTrashTalk,
  onLikeTrashTalk,
  onRatePlayer,
}: PlayerModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("radar");
  const [userRatings, setUserRatings] =
    useState<Player["attributes"]>(DEFAULT_RATINGS);
  const [hasRated, setHasRated] = useState<boolean | null>(null);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [ratingLoaded, setRatingLoaded] = useState(false);

  useEffect(() => {
    if (!player) return;
    setHasRated(null);
    setRatingLoaded(false);
    setRatingSuccess(false);
    setUserRatings(DEFAULT_RATINGS);
    setVisibleCount(PAGE_SIZE);
    setActiveTab("radar");

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
          });
          setHasRated(true);
        } else {
          setHasRated(false);
        }
        setRatingLoaded(true);
      });
  }, [player?.id, currentUserId]);

  const sortedTalks = useMemo(() => {
    return [...trashTalks].sort(
      (a, b) => getCommentScore(b) - getCommentScore(a),
    );
  }, [trashTalks]);

  const visibleTalks = sortedTalks.slice(0, visibleCount);
  const hasMore = visibleCount < sortedTalks.length;
  const remaining = sortedTalks.length - visibleCount;

  if (!player) return null;

  const initials = player.name.split("").slice(0, 2).join("");

  const handleSubmitRating = async () => {
    await onRatePlayer(player.id, userRatings);
    setHasRated(true);
    setRatingSuccess(true);
    setTimeout(() => setRatingSuccess(false), 3000);
  };

  const handleSubmitTrashTalk = () => {
    const msg = newMessage.trim();
    if (!msg) return;
    if (containsSensitiveContent(msg)) {
      toast.error("评论包含不当内容，无法发布", {
        description: "请避免涉及政治、宗教等敏感话题",
        duration: 3500,
      });
      return;
    }
    onAddTrashTalk(player.id, msg);
    setNewMessage("");
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "radar",
      label: "属性",
      icon: <BarChart2 className="w-3.5 h-3.5" />,
    },
    {
      key: "rating",
      label: "评分",
      icon: (
        <span className="relative">
          <Star className="w-3.5 h-3.5" />
          {hasRated === false && (
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-yellow-400" />
          )}
        </span>
      ),
    },
    {
      key: "trash",
      label: `评论${sortedTalks.length > 0 ? ` (${sortedTalks.length})` : ""}`,
      icon: <MessageSquare className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-2xl glass-panel sm:rounded-2xl rounded-t-2xl relative overflow-hidden flex flex-col max-h-[92dvh]"
        >
          {/* 扫描线 */}
          <div className="absolute inset-0 overflow-hidden sm:rounded-2xl rounded-t-2xl pointer-events-none">
            <div className="scanning-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>

          {/* 移动端拖拽条 */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-secondary/50 cursor-pointer hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* ── Header ─────────────────────────────────── */}
          <div className="flex-shrink-0 px-5 pt-4 pb-4 sm:px-8 sm:pt-6 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-primary/50 flex-shrink-0">
                <AvatarImage src={player.avatar_url ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {player.name}
                </h2>
                <p className="text-sm text-muted-foreground font-mono">
                  {player.position}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {player.height && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-muted-foreground border border-border bg-secondary/40">
                      <span className="text-primary/60">H</span>
                      {player.height} cm
                    </span>
                  )}
                  {player.weight && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-muted-foreground border border-border bg-secondary/40">
                      <span className="text-primary/60">W</span>
                      {player.weight} kg
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    OVR
                  </span>
                  <span
                    className={`text-2xl sm:text-3xl font-bold ${
                      player.overall >= 90
                        ? "text-yellow-400 neon-text"
                        : player.overall >= 80
                          ? "text-primary"
                          : player.overall >= 70
                            ? "text-accent"
                            : "text-foreground"
                    }`}
                  >
                    {player.overall}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    ({player.vote_count} 票)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tab 导航 ────────────────────────────────── */}
          <div className="flex-shrink-0 flex gap-1 p-2 border-b border-border bg-secondary/20">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-mono transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab 内容（可滚动区域）───────────────────── */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* ── 属性雷达图 ── */}
              {activeTab === "radar" && (
                <motion.div
                  key="radar"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18 }}
                  className="p-5 sm:p-8 flex flex-col items-center"
                >
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-6">
                    {">"} 综合属性雷达图
                  </p>
                  <RadarChart data={player.attributes} size={220} />
                  {/* {player.bio && (
                    <div className="mt-6 w-full p-3 rounded-lg bg-secondary/30 border border-border">
                      <p className="text-xs font-mono text-muted-foreground mb-1">{">"} 简介</p>
                      <p className="text-sm text-foreground font-mono leading-relaxed">{player.bio}</p>
                    </div>
                  )} */}
                </motion.div>
              )}

              {/* ── 你的评分 ── */}
              {activeTab === "rating" && (
                <motion.div
                  key="rating"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18 }}
                  className="p-5 sm:p-8"
                >
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      {">"} 你的评分
                    </p>
                    {ratingLoaded &&
                      (hasRated ? (
                        <span className="text-[10px] font-mono text-primary border border-primary/30 bg-primary/10 px-2 py-0.5 rounded">
                          已评分
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-yellow-400 border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 rounded">
                          尚未评分
                        </span>
                      ))}
                  </div>

                  {/* 骨架屏 or 实际内容 */}
                  {!ratingLoaded ? (
                    <RatingSkeleton />
                  ) : (
                    <div className="space-y-5">
                      {ratingLabels.map(({ key, label }) => (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-muted-foreground">
                              {label}
                            </span>
                            <span className="text-sm font-bold text-primary">
                              {userRatings[key]}
                            </span>
                          </div>
                          <Slider
                            value={[userRatings[key]]}
                            onValueChange={([value]) =>
                              setUserRatings((prev) => ({
                                ...prev,
                                [key]: value,
                              }))
                            }
                            max={100}
                            step={1}
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
                        className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-mono uppercase tracking-wider cursor-pointer hover:opacity-90"
                      >
                        {hasRated ? "更新评分" : "提交评分"}
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── 垃圾话区 ── */}
              {activeTab === "trash" && (
                <motion.div
                  key="trash"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18 }}
                  className="p-5 sm:p-8 flex flex-col gap-4"
                >
                  {/* 评论列表 */}
                  <div className="space-y-3 bg-secondary/30 rounded-lg p-3 min-h-[120px]">
                    {sortedTalks.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm font-mono py-8">
                        暂无评论，来点狠话？
                      </p>
                    ) : (
                      <>
                        {visibleTalks.map((talk) => {
                          const isNew =
                            Date.now() - new Date(talk.timestamp).getTime() <
                            24 * 3600 * 1000;
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
                                    {new Date(talk.timestamp).toLocaleString(
                                      "zh-CN",
                                      {
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </span>
                                  {isNew && (
                                    <span className="text-[9px] font-mono text-green-400 border border-green-400/30 bg-green-400/10 px-1 rounded">
                                      NEW
                                    </span>
                                  )}
                                  {talk.userId === currentUserId && (
                                    <span className="text-[10px] text-primary/60 font-mono border border-primary/30 px-1 rounded">
                                      你的
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => onLikeTrashTalk(talk.id)}
                                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${talk.likedByMe ? "text-red-400 bg-red-400/10" : "text-muted-foreground hover:text-red-400 hover:bg-red-400/10"}`}
                                >
                                  <Heart
                                    className={`w-3 h-3 ${talk.likedByMe ? "fill-current" : ""}`}
                                  />
                                  {talk.likeCount > 0 && (
                                    <span>{talk.likeCount}</span>
                                  )}
                                </button>
                              </div>
                              <p className="text-foreground pl-4 mt-1 leading-relaxed">
                                {talk.message}
                              </p>
                            </motion.div>
                          );
                        })}
                        {hasMore && (
                          <button
                            onClick={() =>
                              setVisibleCount((c) => c + PAGE_SIZE)
                            }
                            className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors py-2 border border-dashed border-border/50 hover:border-primary/30 rounded-lg"
                          >
                            <ChevronDown className="w-3 h-3" />
                            加载更多（还有 {remaining} 条）
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* 输入框 — 粘在内容末尾 */}
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSubmitTrashTalk()
                      }
                      placeholder="说点狠话... (Enter 发送)"
                      maxLength={200}
                      className="flex-1 bg-secondary/50 border-primary/30 focus:border-primary font-mono"
                    />
                    <Button
                      onClick={handleSubmitTrashTalk}
                      size="icon"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  {newMessage.length > 150 && (
                    <p className="text-[10px] font-mono text-muted-foreground/60 text-right">
                      {newMessage.length}/200
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
