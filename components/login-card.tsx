"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Zap, Shield, Terminal, Lock, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const PARTICLE_POSITIONS = [
  { x: 10, y: 15 },
  { x: 85, y: 25 },
  { x: 45, y: 80 },
  { x: 20, y: 60 },
  { x: 70, y: 10 },
  { x: 55, y: 45 },
  { x: 30, y: 90 },
  { x: 90, y: 70 },
  { x: 15, y: 35 },
  { x: 60, y: 55 },
  { x: 40, y: 20 },
  { x: 75, y: 85 },
  { x: 25, y: 50 },
  { x: 80, y: 40 },
  { x: 50, y: 75 },
  { x: 5, y: 95 },
  { x: 65, y: 30 },
  { x: 35, y: 65 },
  { x: 95, y: 5 },
  { x: 12, y: 88 },
];

export function LoginCard() {
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const validateEmail = (email: string): boolean => {
    const validDomains = [
      /@[a-zA-Z0-9-]+\.ac\.cn$/i,
      /@[a-zA-Z0-9-]+\ac\.cn$/i,
      /@ac\.cn$/i,
      /@ucas\.ac\.cn$/i,
      /@mails\.ucas\.edu\.cn$/i,
      /@cstnet\.cn$/i,
    ];
    return validDomains.some((pattern) => pattern.test(email));
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError(">> ERROR: 请输入邮箱地址");
      return;
    }
    if (!validateEmail(email)) {
      setError(
        ">> ACCESS DENIED: 非研究所协议检测到。仅允许 *.ac.cn / ucas.ac.cn / mails.ucas.edu.cn / cstnet.cn 域名",
      );
      return;
    }

    setIsLoading(true);

    if (mode === "otp") {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      setIsLoading(false);
      if (authError) setError(`>> ERROR: ${authError.message}`);
      else setSent(true);
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setIsLoading(false);
      if (authError) setError(`>> ERROR: ${authError.message}`);
      // on success, onAuthStateChange in page.tsx handles the redirect
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

      {isMounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {PARTICLE_POSITIONS.map((pos, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/30"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              animate={{ y: [0, -20, 20, 0], opacity: [0.2, 0.5, 0.2] }}
              transition={{
                duration: 3 + (i % 5) * 0.4,
                repeat: Infinity,
                repeatType: "reverse",
                delay: (i % 10) * 0.2,
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        <div className="absolute -inset-[1px] bg-gradient-to-r from-primary via-accent to-primary rounded-xl opacity-75 blur-sm" />

        <div className="glass-panel rounded-xl p-8 relative">
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
            <div className="scanning-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>

          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mb-4"
            >
              <Shield className="w-8 h-8 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground neon-text">
              [CAS] BALLER SYSTEM
            </h1>
            <p className="text-muted-foreground text-sm mt-2 font-mono">
              <Terminal className="inline w-3 h-3 mr-1" />
              研究所身份验证协议
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 border border-border mb-6">
            <button
              onClick={() => {
                setMode("otp");
                setError("");
                setSent(false);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-mono transition-colors ${
                mode === "otp"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="w-3 h-3" />
              邮箱验证
            </button>
              <button
              onClick={() => {
                setMode("password");
                setError("");
                setSent(false);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-mono transition-colors ${
                mode === "password"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lock className="w-3 h-3" />
              密码登录
            </button>
          </div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-4"
            >
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-primary font-mono text-sm">
                  {">> MAGIC LINK DISPATCHED"}
                </p>
                <p className="text-muted-foreground text-xs mt-2 font-mono">
                  请检查邮箱 {email}，点击链接完成登录
                </p>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  {">"} 邮箱地址
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="agent@xxx.ac.cn"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    className="bg-secondary/50 border-primary/30 focus:border-primary focus:ring-primary/30 font-mono text-foreground placeholder:text-muted-foreground/50 h-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary cursor-blink">
                    _
                  </span>
                </div>
              </div>

              {mode === "password" && (
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    {">"} 密码
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    className="bg-secondary/50 border-primary/30 focus:border-primary focus:ring-primary/30 font-mono text-foreground h-12"
                  />
                </div>
              )}

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
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-wider relative overflow-hidden group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {mode === "otp" ? "正在发送邮箱验证链接..." : "验证中..."}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    {mode === "otp" ? "发送邮箱验证链接" : "登录"}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-center text-xs text-muted-foreground font-mono">
              <span className="text-primary">●</span> 安全连接已建立
            </p>
            <p className="text-center text-[10px] text-muted-foreground/50 mt-1 font-mono">
              v2.4.7 | 中国科学院篮球评分系统
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
