"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Lock, ShieldCheck, AlertTriangle, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    // Supabase 会将 token 以 hash fragment 形式附在 URL 上
    // onAuthStateChange 会自动处理 PASSWORD_RECOVERY 事件
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // 兼容：若已有 session（用户从邮件链接跳转回来）
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    setError("");
    if (!password) { setError(">> ERROR: 请输入新密码"); return; }
    if (password.length < 8) { setError(">> ERROR: 密码至少需要 8 位字符"); return; }
    if (password !== confirmPassword) { setError(">> ERROR: 两次输入的密码不一致"); return; }

    setIsSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (err) {
      setError(`>> ERROR: ${err.message}`);
    } else {
      setDone(true);
      setTimeout(() => router.replace("/"), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        <div className="absolute -inset-px bg-gradient-to-r from-primary via-accent to-primary rounded-xl opacity-75 blur-sm" />

        <div className="glass-panel rounded-xl p-8 relative">
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
            <div className="scanning-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>

          {/* ── 完成 ── */}
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-4"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mx-auto">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground font-mono text-xl">密码已重置</h2>
                <p className="text-xs text-muted-foreground font-mono mt-2">
                  密码更新成功，3 秒后自动跳转到登录页...
                </p>
              </div>
            </motion.div>
          ) : !sessionReady ? (
            /* ── 等待 Session ── */
            <div className="text-center space-y-4 py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mx-auto">
                <Shield className="w-8 h-8 text-primary animate-pulse" />
              </div>
              {sessionError ? (
                <>
                  <div className="flex items-center gap-2 justify-center">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <h2 className="font-bold text-destructive font-mono">链接无效或已过期</h2>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{sessionError}</p>
                  <Button
                    variant="ghost"
                    onClick={() => router.replace("/")}
                    className="w-full border border-border font-mono"
                  >
                    返回登录
                  </Button>
                </>
              ) : (
                <>
                  <h2 className="font-bold text-foreground font-mono">正在验证链接...</h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    请稍候，正在通过邮件链接验证身份
                  </p>
                  <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                </>
              )}
            </div>
          ) : (
            /* ── 重置密码表单 ── */
            <div className="space-y-6">
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring" }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mb-4"
                >
                  <Lock className="w-8 h-8 text-primary" />
                </motion.div>
                <h1 className="text-xl font-bold text-foreground font-mono neon-text">重置密码</h1>
                <p className="text-xs text-muted-foreground font-mono mt-1">请设置你的新登录密码（至少 8 位）</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    {">"} 新密码
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    className="bg-secondary/50 border-primary/30 focus:border-primary focus:ring-primary/30 font-mono text-foreground placeholder:text-muted-foreground/50 h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    {">"} 确认新密码
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                    className="bg-secondary/50 border-primary/30 focus:border-primary focus:ring-primary/30 font-mono text-foreground placeholder:text-muted-foreground/50 h-12"
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-lg bg-destructive/10 border border-destructive/30"
                >
                  <p className="text-destructive text-xs font-mono">{error}</p>
                </motion.div>
              )}

              <Button
                onClick={handleReset}
                disabled={isSubmitting}
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-wider"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />更新中...</>
                ) : (
                  <><ShieldCheck className="w-4 h-4 mr-2" />确认重置密码</>
                )}
              </Button>

              <div className="pt-2 border-t border-border">
                <p className="text-center text-xs text-muted-foreground font-mono">
                  <span className="text-primary">●</span> 安全连接已建立
                </p>
                <p className="text-center text-[10px] text-muted-foreground/50 mt-1 font-mono">
                  v2.4.7 | 中国科学院篮球评分系统
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
