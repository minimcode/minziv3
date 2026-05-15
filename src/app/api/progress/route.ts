/**
 * Authenticated progress sync endpoint.
 *
 * GET  → returns the user's full state (per-character SRS + lessons + daily
 *        + streak) in the same shape the client store uses.
 * POST → accepts a snapshot from the client, merges it with the server
 *        state (last-write-wins per character via `lastSeen`, union for
 *        lesson IDs, per-date max for daily aggregates, max for streak)
 *        and returns the merged snapshot.
 *
 * Guests (no session) are not supported here — they continue to use
 * localStorage only. The store-side hook only mounts sync when a session
 * exists, so this route returns 401 for them.
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CharProgress, DailyEntry } from "@/store/progress";

type SnapshotPayload = {
  chars: Record<string, CharProgress>;
  completedLessons: string[];
  daily: DailyEntry[];
  streak: number;
  streakUpdated: string | null;
};

function dbRowToCharProgress(r: {
  hanzi: string;
  ease: number;
  interval: number;
  reps: number;
  lapses: number;
  due: Date;
  attempts: number;
  correct: number;
  favorite: boolean;
  status: string;
  lastSeen: Date | null;
}): CharProgress {
  return {
    hanzi: r.hanzi,
    status: (["new", "learning", "known", "weak"] as const).includes(
      r.status as CharProgress["status"],
    )
      ? (r.status as CharProgress["status"])
      : "new",
    reps: r.reps,
    ease: r.ease,
    intervalDays: r.interval,
    due: r.due.getTime(),
    lapses: r.lapses,
    attempts: r.attempts,
    correct: r.correct,
    favorite: r.favorite,
    lastSeen: r.lastSeen ? r.lastSeen.getTime() : undefined,
  };
}

async function readSnapshot(userId: string): Promise<SnapshotPayload> {
  const [states, profile] = await Promise.all([
    prisma.characterState.findMany({ where: { userId } }),
    prisma.userProfile.findUnique({ where: { userId } }),
  ]);
  const chars: Record<string, CharProgress> = {};
  for (const s of states) chars[s.hanzi] = dbRowToCharProgress(s);
  let completedLessons: string[] = [];
  let daily: DailyEntry[] = [];
  try {
    completedLessons = profile?.completedLessons
      ? (JSON.parse(profile.completedLessons) as string[])
      : [];
  } catch {
    completedLessons = [];
  }
  try {
    daily = profile?.dailyJson
      ? (JSON.parse(profile.dailyJson) as DailyEntry[])
      : [];
  } catch {
    daily = [];
  }
  return {
    chars,
    completedLessons,
    daily,
    streak: profile?.streakCount ?? 0,
    streakUpdated: profile?.streakUpdated
      ? profile.streakUpdated.toISOString().slice(0, 10)
      : null,
  };
}

function mergeChar(local: CharProgress, server: CharProgress): CharProgress {
  // Last-write-wins on lastSeen — both `recordOutcome` and `toggleFavorite`
  // update lastSeen, so whichever device made the most recent change is
  // the source of truth (including the `favorite` flag, so unfavorite
  // propagates correctly).
  const localT = local.lastSeen ?? local.due;
  const serverT = server.lastSeen ?? server.due;
  return localT >= serverT ? local : server;
}

function mergeDaily(a: DailyEntry[], b: DailyEntry[]): DailyEntry[] {
  const byDate = new Map<string, DailyEntry>();
  for (const e of a) byDate.set(e.date, e);
  for (const e of b) {
    const cur = byDate.get(e.date);
    if (!cur) {
      byDate.set(e.date, e);
    } else {
      byDate.set(e.date, {
        date: e.date,
        reviewed: Math.max(cur.reviewed, e.reviewed),
        learned: Math.max(cur.learned, e.learned),
        correct: Math.max(cur.correct, e.correct),
        total: Math.max(cur.total, e.total),
      });
    }
  }
  return Array.from(byDate.values())
    .sort((x, y) => x.date.localeCompare(y.date))
    .slice(-90);
}

function dateStrToDate(d: string | null): Date | null {
  if (!d) return null;
  // YYYY-MM-DD → midnight UTC
  return new Date(d + "T00:00:00.000Z");
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const snap = await readSnapshot(session.user.id);
  return Response.json(snap);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: SnapshotPayload;
  try {
    body = (await req.json()) as SnapshotPayload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !body.chars) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const server = await readSnapshot(userId);

  // Merge per-character.
  const mergedChars: Record<string, CharProgress> = { ...server.chars };
  for (const [hanzi, local] of Object.entries(body.chars)) {
    const cur = server.chars[hanzi];
    mergedChars[hanzi] = cur ? mergeChar(local, cur) : local;
  }

  // Merge lessons (union) + daily (per-date max) + streak (max).
  const mergedLessons = Array.from(
    new Set([...server.completedLessons, ...(body.completedLessons ?? [])]),
  );
  const mergedDaily = mergeDaily(server.daily, body.daily ?? []);
  const mergedStreak = Math.max(server.streak, body.streak ?? 0);
  const mergedStreakUpdated =
    body.streakUpdated && server.streakUpdated
      ? body.streakUpdated.localeCompare(server.streakUpdated) >= 0
        ? body.streakUpdated
        : server.streakUpdated
      : (body.streakUpdated ?? server.streakUpdated);

  // Persist. Use transaction so server snapshot stays consistent.
  await prisma.$transaction(async (tx) => {
    // CharacterState — upsert each merged hanzi. Only writes if the
    // merged value differs from what's in `server` to keep writes small.
    for (const [hanzi, c] of Object.entries(mergedChars)) {
      const cur = server.chars[hanzi];
      if (
        cur &&
        cur.lastSeen === c.lastSeen &&
        cur.ease === c.ease &&
        cur.intervalDays === c.intervalDays &&
        cur.reps === c.reps &&
        cur.due === c.due &&
        cur.lapses === c.lapses &&
        cur.attempts === c.attempts &&
        cur.correct === c.correct &&
        cur.favorite === c.favorite &&
        cur.status === c.status
      ) {
        continue;
      }
      await tx.characterState.upsert({
        where: { userId_hanzi: { userId, hanzi } },
        update: {
          ease: c.ease,
          interval: c.intervalDays,
          reps: c.reps,
          lapses: c.lapses,
          due: new Date(c.due),
          attempts: c.attempts,
          correct: c.correct,
          favorite: c.favorite,
          status: c.status,
          lastSeen: c.lastSeen ? new Date(c.lastSeen) : null,
        },
        create: {
          userId,
          hanzi: c.hanzi,
          ease: c.ease,
          interval: c.intervalDays,
          reps: c.reps,
          lapses: c.lapses,
          due: new Date(c.due),
          attempts: c.attempts,
          correct: c.correct,
          favorite: c.favorite,
          status: c.status,
          lastSeen: c.lastSeen ? new Date(c.lastSeen) : null,
        },
      });
    }

    await tx.userProfile.upsert({
      where: { userId },
      update: {
        completedLessons: JSON.stringify(mergedLessons),
        dailyJson: JSON.stringify(mergedDaily),
        streakCount: mergedStreak,
        streakUpdated: dateStrToDate(mergedStreakUpdated),
      },
      create: {
        userId,
        completedLessons: JSON.stringify(mergedLessons),
        dailyJson: JSON.stringify(mergedDaily),
        streakCount: mergedStreak,
        streakUpdated: dateStrToDate(mergedStreakUpdated),
      },
    });
  });

  return Response.json({
    chars: mergedChars,
    completedLessons: mergedLessons,
    daily: mergedDaily,
    streak: mergedStreak,
    streakUpdated: mergedStreakUpdated,
  } satisfies SnapshotPayload);
}
