"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, username }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Ошибка регистрации");
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(
          mode === "register"
            ? "Аккаунт создан, но вход не удался. Попробуйте войти."
            : "Неверный email или пароль"
        );
      } else {
        window.location.href = "/learn";
      }
    } catch {
      setError("Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-rice">
      <div className="card max-w-md w-full p-8 sm:p-10 flex flex-col items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/icon.svg" alt="" width={36} height={36} />
          <span className="text-2xl font-display font-semibold tracking-tight">
            Minzi
          </span>
        </Link>

        <h1 className="text-2xl font-display font-medium text-center">
          {mode === "login" ? "Вход в аккаунт" : "Создать аккаунт"}
        </h1>

        <p className="text-[var(--foreground-muted)] text-sm text-center max-w-sm">
          {mode === "login"
            ? "Войдите, чтобы сохранить прогресс и синхронизировать между устройствами"
            : "Зарегистрируйтесь, чтобы сохранить свой прогресс изучения"
          }
        </p>

        {error && (
          <div className="w-full px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="text-xs text-[var(--foreground-muted)] mb-1.5 block">
                  Имя
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ваше имя"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green)]/20 focus:border-[var(--green)] transition-shadow"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--foreground-muted)] mb-1.5 block">
                  Юзернейм
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="username"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green)]/20 focus:border-[var(--green)] transition-shadow font-mono"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-[var(--foreground-muted)] mb-1.5 block">
              Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-soft)]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green)]/20 focus:border-[var(--green)] transition-shadow"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--foreground-muted)] mb-1.5 block">
              Пароль
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-soft)]" />
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "Минимум 6 символов" : "Ваш пароль"}
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green)]/20 focus:border-[var(--green)] transition-shadow"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-soft)] hover:text-[var(--foreground)] transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {mode === "login" ? "Войти" : "Зарегистрироваться"}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="w-full border-t border-[var(--border)] pt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            className="text-sm text-[var(--green)] hover:underline"
          >
            {mode === "login"
              ? "Нет аккаунта? Зарегистрироваться"
              : "Уже есть аккаунт? Войти"
            }
          </button>
        </div>

        <Link href="/learn" className="btn btn-ghost text-sm">
          Продолжить как гость →
        </Link>
      </div>
    </div>
  );
}
