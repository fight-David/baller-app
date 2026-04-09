"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, User, Zap, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarCropModal } from "./avatar-crop-modal";
import { supabase } from "@/lib/supabase";
import { POSITION_CN, type Position } from "@/lib/data";

interface OnboardingModalProps {
  userId: string;
  emailPrefix: string;
  onComplete: () => void;
}

const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];

const RATING_KEYS = [
  "shooting",
  "defense",
  "physical",
  "dribbling",
  "longevity",
] as const;
const RATING_LABELS: Record<(typeof RATING_KEYS)[number], string> = {
  shooting: "投射 Shooting",
  defense: "防守 Defense",
  physical: "身体 Physical",
  dribbling: "控球 Dribbling",
  longevity: "持久力 Longevity",
};

export function OnboardingModal({
  userId,
  emailPrefix,
  onComplete,
}: OnboardingModalProps) {
  const [step, setStep] = useState<"ask" | "player-form" | "loading">("ask");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState<Position>("PG");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [ratings, setRatings] = useState({
    shooting: 60,
    defense: 60,
    physical: 60,
    dribbling: 60,
    longevity: 60,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError(">> ERROR: 图片不能超过 10MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropConfirm = async (blob: Blob) => {
    const path = `${userId}.jpg`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, blob, {
      upsert: true,
      contentType: "image/jpeg",
    });
    if (uploadErr) { setError(`>> ERROR: ${uploadErr.message}`); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    setCropSrc(null);
  };

  const handleObserver = async () => {
    setIsSubmitting(true);
    await supabase.from("profiles").insert({
      id: userId,
      email_prefix: emailPrefix,
      full_name: emailPrefix,
      is_player: false,
    });
    setIsSubmitting(false);
    onComplete();
  };

  const handlePlayerSubmit = async () => {
    if (!fullName.trim()) {
      setError(">> ERROR: 请输入姓名");
      return;
    }
    setIsSubmitting(true);
    setError("");

    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId,
      email_prefix: emailPrefix,
      full_name: fullName.trim(),
      position,
      is_player: true,
      height: height ? Number(height) : null,
      weight: weight ? Number(weight) : null,
      avatar_url: avatarUrl || null,
    });

    if (profileErr) {
      setError(`>> ERROR: ${profileErr.message}`);
      setIsSubmitting(false);
      return;
    }

    const { error: ratingErr } = await supabase.from("ratings").insert({
      player_id: userId,
      rater_id: userId,
      ...ratings,
    });

    if (ratingErr) {
      setError(`>> ERROR: ${ratingErr.message}`);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onComplete();
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-lg glass-panel rounded-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div className="scanning-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            </div>

            <div className="p-6">
              {step === "ask" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mb-4">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold neon-text font-mono">
                      {">> 身份识别"}
                    </h2>
                    <p className="text-muted-foreground text-sm mt-2 font-mono">
                      检测到新用户{" "}
                      <span className="text-primary">{emailPrefix}</span>
                    </p>
                    <p className="text-muted-foreground text-sm mt-1 font-mono">
                      是否激活球员档案？
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => setStep("player-form")}
                      className="h-12 bg-gradient-to-r from-primary to-accent text-primary-foreground font-mono uppercase tracking-wider"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      激活档案
                    </Button>
                    <Button
                      onClick={handleObserver}
                      disabled={isSubmitting}
                      variant="outline"
                      className="h-12 border-primary/30 text-muted-foreground font-mono uppercase tracking-wider hover:bg-secondary/50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "观察员模式"
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === "player-form" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5 max-h-[80vh] overflow-y-auto pr-1"
                >
                  <h2 className="text-lg font-bold neon-text font-mono">
                    {">> 球员档案初始化"}
                  </h2>

                  {/* 头像上传 */}
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <Avatar className="w-16 h-16 border-2 border-primary/50">
                        <AvatarImage src={avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-bold text-xl">
                          {fullName ? fullName.slice(0, 2) : emailPrefix.slice(0, 2)}
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
                      <p className="text-xs font-mono text-muted-foreground">点击头像上传照片，支持裁剪</p>
                      <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">支持 JPG / PNG，最大 10MB</p>
                    </div>
                  </div>

                  {/* 姓名 */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      {">"} 姓名
                    </label>
                    <Input
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        setError("");
                      }}
                      placeholder="输入你的名字"
                      className="bg-secondary/50 border-primary/30 focus:border-primary font-mono placeholder:text-slate-500"
                    />
                  </div>

                  {/* 位置 */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      {">"} 位置
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {POSITIONS.map((p) => (
                        <button
                          key={p}
                          onClick={() => setPosition(p)}
                          className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${
                            position === p
                              ? "bg-primary/20 border-primary text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {POSITION_CN[p]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 身高体重 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 身高 (cm)</label>
                      <Input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="175"
                        min={140}
                        max={230}
                        className="bg-secondary/50 border-primary/30 focus:border-primary font-mono placeholder:text-slate-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 体重 (kg)</label>
                      <Input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="70"
                        min={40}
                        max={200}
                        className="bg-secondary/50 border-primary/30 focus:border-primary font-mono placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {/* 初始自评 */}
                  <div className="space-y-3">
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      {">"} 初始自评
                    </label>
                    {RATING_KEYS.map((key) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs font-mono text-muted-foreground">
                            {RATING_LABELS[key]}
                          </span>
                          <span className="text-xs font-bold text-primary">
                            {ratings[key]}
                          </span>
                        </div>
                        <Slider
                          value={[ratings[key]]}
                          onValueChange={([v]) =>
                            setRatings((prev) => ({ ...prev, [key]: v }))
                          }
                          min={1}
                          max={100}
                          step={1}
                          className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
                        />
                      </div>
                    ))}
                  </div>

                  {error && (
                    <p className="text-destructive text-xs font-mono">{error}</p>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => setStep("ask")}
                      className="flex-1 font-mono border border-border"
                    >
                      返回
                    </Button>
                    <Button
                      onClick={handlePlayerSubmit}
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground font-mono"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "提交激活"
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
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
  );
}
