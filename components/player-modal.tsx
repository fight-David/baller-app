"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageSquare, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { RadarChart } from "./radar-chart";
import type { Player, TrashTalk } from "@/lib/data";

interface PlayerModalProps {
  player: Player | null;
  trashTalks: TrashTalk[];
  currentUserId: string;
  onClose: () => void;
  onAddTrashTalk: (playerId: string, message: string) => void;
  onLikeTrashTalk: (commentId: string) => void;
  onRatePlayer: (playerId: string, ratings: Player["attributes"]) => void;
}

export function PlayerModal({
  player,
  trashTalks,
  onClose,
  onAddTrashTalk,
  onLikeTrashTalk,
  onRatePlayer,
}: PlayerModalProps) {
  const [userRatings, setUserRatings] = useState<Player["attributes"]>({
    shooting: 50,
    defense: 50,
    physical: 50,
    dribbling: 50,
    longevity: 50,
  });
  const [newMessage, setNewMessage] = useState("");

  if (!player) return null;

  const initials = player.name.split("").slice(0, 2).join("");

  const handleSubmitRating = () => {
    onRatePlayer(player.id, userRatings);
  };

  const handleSubmitTrashTalk = () => {
    if (newMessage.trim()) {
      onAddTrashTalk(player.id, newMessage.trim());
      setNewMessage("");
    }
  };

  const ratingLabels = [
    { key: "shooting", label: "投射 Shooting" },
    { key: "defense", label: "防守 Defense" },
    { key: "physical", label: "身体 Physical" },
    { key: "dribbling", label: "控球 Dribbling" },
    { key: "longevity", label: "持久力 Longevity" },
  ] as const;

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
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-secondary/50 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
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
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {player.name}
                  </h2>
                  <p className="text-sm text-muted-foreground font-mono mt-1">
                    {player.position}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">
                      OVERALL
                    </span>
                    <span
                      className={`text-3xl font-bold ${
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
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-6">
                  {">"} 你的评分
                </h3>
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
                          setUserRatings((prev) => ({ ...prev, [key]: value }))
                        }
                        max={100}
                        step={1}
                        className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_[role=slider]]:shadow-[0_0_10px_rgba(34,211,238,0.5)] [&_.relative]:bg-secondary [&_[data-orientation=horizontal]>span:first-child]:bg-gradient-to-r [&_[data-orientation=horizontal]>span:first-child]:from-primary [&_[data-orientation=horizontal]>span:first-child]:to-accent"
                      />
                    </div>
                  ))}
                  <Button
                    onClick={handleSubmitRating}
                    className="w-full mt-2 bg-gradient-to-r from-primary to-accent text-primary-foreground font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer hover:opacity-90"
                  >
                    提交评分
                  </Button>
                </div>
              </div>
            </div>

            {/* Trash Talk Section */}
            <div className="p-8 border-t border-border">
              <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-5 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {">"} 垃圾话区 Trash Talk
              </h3>

              <div className="h-48 overflow-y-auto mb-4 space-y-3 bg-secondary/30 rounded-lg p-4">
                {trashTalks.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm font-mono py-8">
                    暂无评论，来点狠话？
                  </p>
                ) : (
                  trashTalks.map((talk) => (
                    <motion.div
                      key={talk.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="font-mono text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-primary">[匿名]</span>{" "}
                          <span className="text-muted-foreground text-xs">
                            {new Date(talk.timestamp).toLocaleTimeString(
                              "zh-CN",
                            )}
                          </span>
                        </div>
                        <button
                          onClick={() => onLikeTrashTalk(talk.id)}
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
                            talk.likedByMe
                              ? "text-red-400 bg-red-400/10"
                              : "text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                          }`}
                        >
                          <Heart
                            className={`w-3 h-3 ${talk.likedByMe ? "fill-current" : ""}`}
                          />
                          {talk.likeCount > 0 && <span>{talk.likeCount}</span>}
                        </button>
                      </div>
                      <p className="text-foreground pl-4 mt-1">
                        {talk.message}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleSubmitTrashTalk()
                  }
                  placeholder="说点什么..."
                  className="flex-1 bg-secondary/50 border-primary/30 focus:border-primary font-mono"
                />
                <Button
                  onClick={handleSubmitTrashTalk}
                  size="icon"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 cursor-pointer hover:opacity-90 "
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
