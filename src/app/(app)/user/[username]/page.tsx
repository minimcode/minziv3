"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Award,

  BookOpen,
  UserPlus,
  UserCheck,
  Clock,
  ArrowLeft,
  Send,
} from "lucide-react";

interface PublicProfile {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  bio: string | null;
  createdAt: string;
  level: string;
  streak: number;
  charsLearned: number;
  totalReviews: number;
  friendsCount: number;
  friendshipStatus: string | null;
  isOwnProfile: boolean;
}

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [friendAction, setFriendAction] = useState("");
  const [friendLoading, setFriendLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/users/${username}`);
        if (!res.ok) {
          setError("Пользователь не найден");
          return;
        }
        const data = await res.json();
        if (data.isOwnProfile) {
          router.replace("/profile");
          return;
        }
        setProfile(data);
      } catch {
        setError("Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    })();
  }, [username, router]);

  const sendFriendRequest = async () => {
    setFriendLoading(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: profile?.username }),
      });
      const data = await res.json();
      if (res.ok) {
        setFriendAction("sent");
        setProfile((p) => p ? { ...p, friendshipStatus: "request_sent" } : p);
      } else {
        setFriendAction(data.error || "Ошибка");
      }
    } catch {
      setFriendAction("Ошибка сети");
    } finally {
      setFriendLoading(false);
    }
  };

  const acceptFriendRequest = async () => {
    if (!profile) return;
    setFriendLoading(true);
    try {
      const res = await fetch(`/api/users/${username}/accept-friend`, {
        method: "POST",
      });
      if (res.ok) {
        setProfile((p) => p ? { ...p, friendshipStatus: "friends" } : p);
      }
    } catch { /* ignore */ }
    finally { setFriendLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="w-6 h-6 border-2 border-[var(--green)]/30 border-t-[var(--green)] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4">
          <User size={28} className="text-[var(--foreground-soft)]" />
        </div>
        <h1 className="text-2xl font-display font-medium mb-2">Пользователь не найден</h1>
        <p className="text-sm text-[var(--foreground-muted)] mb-6">
          Пользователь @{username} не существует или был удалён
        </p>
        <Link href="/profile" className="btn btn-primary h-10 text-sm inline-flex items-center gap-2">
          <ArrowLeft size={14} /> Назад
        </Link>
      </div>
    );
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  const friendBtn = () => {
    if (status !== "authenticated") {
      return (
        <Link
          href="/login"
          className="btn btn-primary h-10 text-sm flex items-center gap-2"
        >
          <UserPlus size={14} /> Войдите, чтобы добавить
        </Link>
      );
    }

    switch (profile.friendshipStatus) {
      case "friends":
        return (
          <div className="h-10 px-4 text-sm rounded-xl bg-[var(--green-soft)] text-[var(--green)] font-medium flex items-center gap-2 border border-[var(--green)]/20">
            <UserCheck size={14} /> Друзья
          </div>
        );
      case "request_sent":
        return (
          <div className="h-10 px-4 text-sm rounded-xl bg-amber-50 text-amber-700 font-medium flex items-center gap-2 border border-amber-200">
            <Send size={14} /> Заявка отправлена
          </div>
        );
      case "request_received":
        return (
          <button
            type="button"
            onClick={acceptFriendRequest}
            disabled={friendLoading}
            className="btn btn-primary h-10 text-sm flex items-center gap-2"
          >
            <UserCheck size={14} /> Принять заявку
          </button>
        );
      default:
        return (
          <button
            type="button"
            onClick={sendFriendRequest}
            disabled={friendLoading}
            className="btn btn-primary h-10 text-sm flex items-center gap-2"
          >
            {friendLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><UserPlus size={14} /> Добавить в друзья</>
            )}
          </button>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8">
      {/* Back link */}
      <Link
        href="/profile"
        className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] flex items-center gap-1.5 mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> Назад к профилю
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-6 sm:p-8 mb-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile.image && profile.image.length <= 4 ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center text-4xl sm:text-5xl">
                {profile.image}
              </div>
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[var(--green-soft)] to-[var(--surface-2)] flex items-center justify-center">
                <User size={32} className="text-[var(--green)]" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-xl sm:text-2xl font-display font-medium truncate">
              {profile.name || profile.username || "—"}
            </h1>
            {profile.username && (
              <div className="text-sm text-[var(--green)] font-medium mt-0.5">
                @{profile.username}
              </div>
            )}
            {profile.bio && (
              <p className="text-sm text-[var(--foreground-muted)] mt-2 line-clamp-3 leading-relaxed">
                {profile.bio}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-[var(--foreground-muted)]">
              <span>{profile.friendsCount} друзей</span>
              <span>{profile.charsLearned} иероглифов</span>
              <span className="flex items-center gap-1">
                <Clock size={10} /> {memberSince}
              </span>
            </div>
          </div>
        </div>

        {/* Friend action */}
        <div className="mt-5 pt-5 border-t border-[var(--border)]">
          {friendBtn()}
          {friendAction && friendAction !== "sent" && (
            <div className="text-sm text-red-600 mt-2">{friendAction}</div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen size={13} className="text-[var(--foreground-soft)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">Уровень</span>
          </div>
          <div className="text-lg font-semibold">{profile.level}</div>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Award size={13} className="text-[var(--foreground-soft)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">Иероглифов</span>
          </div>
          <div className="text-lg font-semibold tabular-nums">{profile.charsLearned}</div>
        </div>
        <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen size={13} className="text-[var(--foreground-soft)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">Повторений</span>
          </div>
          <div className="text-lg font-semibold tabular-nums">{profile.totalReviews}</div>
        </div>
      </div>
    </div>
  );
}
