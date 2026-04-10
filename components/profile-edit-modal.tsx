"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarCropModal } from "./avatar-crop-modal";
import { supabase } from "@/lib/supabase";
import { POSITION_CN, type Position, type Profile } from "@/lib/data";

interface ProfileEditModalProps {
  profile: Profile;
  onClose: () => void;
  onSaved: (updated: Profile) => void;
}

const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];

export function ProfileEditModal({
  profile,
  onClose,
  onSaved,
}: ProfileEditModalProps) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [position, setPosition] = useState<Position | null>(profile.position);
  const [height, setHeight] = useState(profile.height?.toString() ?? "");
  const [weight, setWeight] = useState(profile.weight?.toString() ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNewPlayer = !profile.is_player;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("图片不能超过 2MB，请选择更小的图片", { duration: 3000 });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropConfirm = async (blob: Blob) => {
    const path = `${profile.id}.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (uploadErr) {
      toast.error("头像上传失败，请稍后重试", {
        description: uploadErr.message,
        duration: 3500,
      });
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    setCropSrc(null);
  };

  const getErrorMessage = (message: string): string => {
    if (message.includes("duplicate key") && message.includes("full_name"))
      return `姓名"${fullName.trim()}"已被其他人使用，请换一个姓名`;
    if (message.includes("duplicate key")) return "数据重复，请检查填写内容";
    if (message.includes("violates not-null constraint")) return "有必填项未填写，请检查";
    if (message.includes("invalid input syntax")) return "输入格式有误，请检查数字字段";
    if (message.includes("network") || message.includes("fetch")) return "网络连接异常，请检查网络后重试";
    return message;
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("姓名不能为空", { duration: 3000 });
      return;
    }
    setIsSubmitting(true);

    const updates: Partial<Profile> = {
      full_name: fullName.trim(),
      position,
      bio: bio.trim() || null,
      height: height ? Number(height) : null,
      weight: weight ? Number(weight) : null,
      avatar_url: avatarUrl || null,
      ...(isNewPlayer ? { is_player: true } : {}),
    };

    const { error: err } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);
    setIsSubmitting(false);
    if (err) {
      toast.error(getErrorMessage(err.message), { duration: 4000 });
      return;
    }

    onSaved({ ...profile, ...updates });
    onClose();

    if (isNewPlayer) {
      toast.success("档案已激活！你已正式进入 [CAS] Baller 数据库", {
        duration: 6000,
        description: "欢迎加入！请刷新页面以正式加载你的球员档案，并完成首次自评分。",
        action: { label: "立即刷新", onClick: () => window.location.reload() },
      });
    } else {
      toast.success("信息已修改！", { duration: 2500 });
    }
  };

  return (
    <>
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
            className="w-full sm:max-w-md glass-panel sm:rounded-2xl rounded-t-2xl relative overflow-hidden max-h-[92dvh] flex flex-col"
          >
            {/* scanning line */}
            <div className="absolute inset-0 overflow-hidden sm:rounded-2xl rounded-t-2xl pointer-events-none">
              <div className="scanning-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            </div>

            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-secondary/50 cursor-pointer hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* 移动端拖拽条 */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="overflow-y-auto flex-1 p-5 sm:p-8 space-y-4 sm:space-y-6">
              {/* Avatar upload */}
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-primary/50">
                    <AvatarImage
                      onClick={() => fileInputRef.current?.click()}
                      src={avatarUrl || undefined}
                    />
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
                <div>
                  <h2 className="font-bold text-foreground font-mono">
                    {isNewPlayer ? "激活球员档案" : "编辑球员档案"}
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono">{profile.email_prefix}</p>
                  {isNewPlayer ? (
                    <p className="text-[11px] text-primary/70 font-mono mt-0.5">填写信息后保存即可正式激活</p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">点击头像更换图片，支持裁剪</p>
                  )}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 姓名</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-secondary/50 border-primary/30 focus:border-primary font-mono h-10"
                />
              </div>

              {/* Email (readonly) */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 邮箱</label>
                <Input
                  value={profile.email}
                  disabled
                  className="bg-secondary/30 border-primary/20 font-mono text-muted-foreground cursor-not-allowed opacity-60 h-10"
                />
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 位置</label>
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

              {/* Height & Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 身高 (cm)</label>
                  <Input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="175"
                    min={140}
                    max={230}
                    className="bg-secondary/50 border-primary/30 focus:border-primary font-mono placeholder:text-slate-500 h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 体重 (kg)</label>
                  <Input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="70"
                    min={40}
                    max={200}
                    className="bg-secondary/50 border-primary/30 focus:border-primary font-mono placeholder:text-slate-500 h-10"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 简介</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="说点什么..."
                  rows={2}
                  className="w-full rounded-md bg-secondary/50 border border-primary/30 focus:border-primary focus:outline-none px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1 pb-safe">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1 border border-border font-mono"
                >
                  取消
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground font-mono"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isNewPlayer ? (
                    "激活档案"
                  ) : (
                    "保存"
                  )}
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
  );
}
