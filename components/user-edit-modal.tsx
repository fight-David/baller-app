"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Mail, Lock, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

interface UserEditModalProps {
  currentEmail: string;
  onClose: () => void;
}

type Step = "menu" | "email-confirm" | "email-new" | "email-done" | "password-confirm" | "password-new" | "password-done";

export function UserEditModal({ currentEmail, onClose }: UserEditModalProps) {
  const [step, setStep] = useState<Step>("menu");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmNewEmail, setConfirmNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const resetState = () => {
    setConfirmEmail(""); setNewEmail(""); setConfirmNewEmail("");
    setNewPassword(""); setConfirmPassword(""); setError(""); setIsSubmitting(false);
  };

  const goTo = (s: Step) => { resetState(); setStep(s); };

  const handleEmailConfirm = () => {
    if (confirmEmail.trim().toLowerCase() !== currentEmail.toLowerCase()) {
      setError(">> ERROR: 邮箱地址不匹配，请重新输入"); return;
    }
    setError(""); setStep("email-new");
  };

  const handleEmailUpdate = async () => {
    if (!newEmail.trim()) { setError(">> ERROR: 请输入新邮箱"); return; }
    if (newEmail.trim() !== confirmNewEmail.trim()) { setError(">> ERROR: 两次输入的邮箱不一致"); return; }
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setError(">> ERROR: 新邮箱与当前邮箱相同"); return;
    }
    setIsSubmitting(true); setError("");
    const { error: err } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setIsSubmitting(false);
    if (err) { setError(`>> ERROR: ${err.message}`); return; }
    setStep("email-done");
  };

  const handlePasswordConfirm = () => {
    if (confirmEmail.trim().toLowerCase() !== currentEmail.toLowerCase()) {
      setError(">> ERROR: 邮箱地址不匹配，请重新输入"); return;
    }
    setError(""); setStep("password-new");
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword) { setError(">> ERROR: 请输入新密码"); return; }
    if (newPassword.length < 8) { setError(">> ERROR: 密码至少需要 8 位字符"); return; }
    if (newPassword !== confirmPassword) { setError(">> ERROR: 两次输入的密码不一致"); return; }
    setIsSubmitting(true); setError("");
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setIsSubmitting(false);
    if (err) { setError(`>> ERROR: ${err.message}`); return; }
    setStep("password-done");
    toast.success("密码已更新！", { duration: 3000 });
  };

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
          className="w-full sm:max-w-md glass-panel sm:rounded-2xl rounded-t-2xl relative overflow-hidden max-h-[85dvh] flex flex-col"
        >
          {/* scanning line */}
          <div className="absolute inset-0 overflow-hidden sm:rounded-2xl rounded-t-2xl pointer-events-none">
            <div className="scanning-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>

          {/* 移动端拖拽条 */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-secondary/50 cursor-pointer hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="overflow-y-auto flex-1 p-5 sm:p-8 space-y-4 sm:space-y-5">
            {/* ── MENU ── */}
            {step === "menu" && (
              <>
                <div>
                  <h2 className="font-bold text-foreground font-mono text-base">账号安全设置</h2>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    当前账号：<span className="text-primary">{currentEmail}</span>
                  </p>
                </div>
                <div className="space-y-2.5">
                  <button
                    onClick={() => goTo("email-confirm")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50 border border-border hover:border-primary/50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-mono font-medium text-foreground">修改邮箱</p>
                      <p className="text-xs font-mono text-muted-foreground">更换绑定的登录邮箱地址</p>
                    </div>
                  </button>
                  <button
                    onClick={() => goTo("password-confirm")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50 border border-border hover:border-primary/50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-mono font-medium text-foreground">修改密码</p>
                      <p className="text-xs font-mono text-muted-foreground">设置或更新账号登录密码</p>
                    </div>
                  </button>
                </div>
                <Button variant="ghost" onClick={onClose} className="w-full border border-border font-mono">取消</Button>
              </>
            )}

            {/* ── EMAIL: 确认当前邮箱 ── */}
            {step === "email-confirm" && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <h2 className="font-bold text-foreground font-mono">身份验证</h2>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">修改邮箱前，请先确认当前邮箱地址</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 输入当前邮箱进行确认</label>
                  <Input
                    type="email"
                    placeholder={currentEmail}
                    value={confirmEmail}
                    onChange={(e) => { setConfirmEmail(e.target.value); setError(""); }}
                    className="bg-secondary/50 border-primary/30 focus:border-primary font-mono h-10"
                  />
                </div>
                {error && <ErrorBox message={error} />}
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => goTo("menu")} className="flex-1 border border-border font-mono">返回</Button>
                  <Button onClick={handleEmailConfirm} className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground font-mono">下一步</Button>
                </div>
              </>
            )}

            {/* ── EMAIL: 输入新邮箱 ── */}
            {step === "email-new" && (
              <>
                <div>
                  <h2 className="font-bold text-foreground font-mono">输入新邮箱</h2>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">新邮箱需为 CAS/UCAS 官方域名</p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 新邮箱地址</label>
                    <Input type="email" placeholder="new@xxx.ac.cn" value={newEmail}
                      onChange={(e) => { setNewEmail(e.target.value); setError(""); }}
                      className="bg-secondary/50 border-primary/30 focus:border-primary font-mono h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 再次确认新邮箱</label>
                    <Input type="email" placeholder="new@xxx.ac.cn" value={confirmNewEmail}
                      onChange={(e) => { setConfirmNewEmail(e.target.value); setError(""); }}
                      className="bg-secondary/50 border-primary/30 focus:border-primary font-mono h-10" />
                  </div>
                </div>
                {error && <ErrorBox message={error} />}
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => goTo("email-confirm")} className="flex-1 border border-border font-mono">返回</Button>
                  <Button onClick={handleEmailUpdate} disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground font-mono">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "确认修改"}
                  </Button>
                </div>
              </>
            )}

            {/* ── EMAIL: 完成 ── */}
            {step === "email-done" && (
              <>
                <div className="text-center space-y-3 py-2">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/30 mx-auto">
                    <ShieldCheck className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground font-mono">验证邮件已发送</h2>
                    <p className="text-xs text-muted-foreground font-mono mt-1.5 leading-relaxed">
                      请检查新邮箱 <span className="text-primary">{newEmail}</span> 中的确认邮件，点击链接后邮箱将正式更新。
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-[11px] font-mono text-muted-foreground">在点击确认链接之前，旧邮箱仍可正常登录。</p>
                  </div>
                </div>
                <Button onClick={onClose} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-mono">知道了</Button>
              </>
            )}

            {/* ── PASSWORD: 确认当前邮箱 ── */}
            {step === "password-confirm" && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <h2 className="font-bold text-foreground font-mono">身份验证</h2>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">修改密码前，请先确认当前邮箱地址</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 输入当前邮箱进行确认</label>
                  <Input type="email" placeholder={currentEmail} value={confirmEmail}
                    onChange={(e) => { setConfirmEmail(e.target.value); setError(""); }}
                    className="bg-secondary/50 border-primary/30 focus:border-primary font-mono h-10" />
                </div>
                {error && <ErrorBox message={error} />}
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => goTo("menu")} className="flex-1 border border-border font-mono">返回</Button>
                  <Button onClick={handlePasswordConfirm} className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground font-mono">下一步</Button>
                </div>
              </>
            )}

            {/* ── PASSWORD: 输入新密码 ── */}
            {step === "password-new" && (
              <>
                <div>
                  <h2 className="font-bold text-foreground font-mono">设置新密码</h2>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">密码至少 8 位字符</p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 新密码</label>
                    <Input type="password" placeholder="••••••••" value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                      className="bg-secondary/50 border-primary/30 focus:border-primary font-mono h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{">"} 再次确认新密码</label>
                    <Input type="password" placeholder="••••••••" value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                      className="bg-secondary/50 border-primary/30 focus:border-primary font-mono h-10" />
                  </div>
                </div>
                {error && <ErrorBox message={error} />}
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => goTo("password-confirm")} className="flex-1 border border-border font-mono">返回</Button>
                  <Button onClick={handlePasswordUpdate} disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground font-mono">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "确认修改"}
                  </Button>
                </div>
              </>
            )}

            {/* ── PASSWORD: 完成 ── */}
            {step === "password-done" && (
              <>
                <div className="text-center space-y-3 py-2">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/30 mx-auto">
                    <ShieldCheck className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground font-mono">密码已更新</h2>
                    <p className="text-xs text-muted-foreground font-mono mt-1">下次登录时请使用新密码</p>
                  </div>
                </div>
                <Button onClick={onClose} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-mono">完成</Button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-3 rounded-lg bg-destructive/10 border border-destructive/30"
    >
      <p className="text-destructive text-xs font-mono">{message}</p>
    </motion.div>
  );
}
