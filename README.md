# Minzi — Учите иероглифы правильно

Production-quality Chinese learning platform built around real writing,
real stroke order, real spaced repetition, and HSK 3.0 progression.

> **Foundation PR.** Landing + auth + design system + app shell + Learning
> flow with real Hanzi Writer stroke order & writing validation + Dictionary
> + Review (SRS) + Statistics + Profile, all in Russian.

---

## Stack

- **Next.js 16** (App Router, Turbopack, async params) · React 19 · TypeScript
- **Tailwind CSS v4** + custom design tokens (rice-paper palette, sumi-e accents)
- **Framer Motion** for micro-interactions
- **Zustand** + persist for client-side progress (localStorage)
- **NextAuth v5 (Auth.js)** + Prisma adapter, Google provider
- **Prisma + SQLite** for user/SRS persistence
- **[Hanzi Writer](https://hanziwriter.org/docs.html)** for stroke animation +
  guided-writing **quiz** with real validation (order, direction, position)
- **HSK 3.0 dataset** (`ivankra/hsk30`) — drives lesson progression
- **CC-CEDICT** — additional meanings / distractor pool
- **MakeMeAHanzi** — referenced for stroke metadata fallback

## Data sources

| Source | Used for |
| --- | --- |
| [`ivankra/hsk30`](https://github.com/ivankra/hsk30) | Vocabulary, levels, character order, grammar |
| [`chanind/hanzi-writer`](https://github.com/chanind/hanzi-writer) + [`hanzi-writer-data`](https://github.com/chanind/hanzi-writer-data) | Stroke rendering, animation, quiz/writing validation |
| [`skishore/makemeahanzi`](https://github.com/skishore/makemeahanzi) | Stroke metadata, decomposition |
| [CC-CEDICT (MDBG)](https://www.mdbg.net/chinese/dictionary?page=cedict) | English meanings, dictionary enrichment |

The build pipeline (`npm run build:data`) reads these and writes
`src/data/{characters,lessons,grammar,showcase}.json`. A small hand-curated
Russian translation table covers the most common HSK1 characters.

## Getting started

```bash
# 1. Install
npm install

# 2. Configure env (copy .env.example → .env, fill secrets)
cp .env.example .env

# 3. Build the database
DATABASE_URL="file:./dev.db" npx prisma migrate dev

# 4. (Optional) regenerate the HSK data files. The committed JSON works
#    out of the box — only re-run if you change the source CSVs.
npm run build:data

# 5. Dev server
npm run dev
```

Open <http://localhost:3000>.

### Environment variables

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma datasource (defaults to local SQLite) |
| `AUTH_SECRET` | Auth.js JWT/session secret. Generate with `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` when running behind a proxy / on a deployment platform |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials. Optional — when unset the Google sign-in button is hidden but the app still works in guest mode |

## Project layout

```
src/
  app/
    page.tsx                # Landing
    layout.tsx              # Root layout (Inter + Cormorant fonts, RU)
    api/auth/[...nextauth]/ # NextAuth handlers
    (app)/                  # Authenticated app shell
      layout.tsx            # Sidebar (desktop) + bottom nav (mobile)
      learn/page.tsx        # Lesson hub
      learn/[lessonId]/     # Lesson runner
      review/page.tsx       # SRS review
      dictionary/page.tsx   # Searchable dictionary
      stats/page.tsx        # Progress stats + activity chart
      profile/page.tsx      # Profile + settings
  components/
    landing/                # Header, Hero, Features, HowItWorks, …, Footer
    app/                    # Sidebar, BottomNav
    learn/                  # StrokeAnimation, WritingQuiz, PracticeTask, LessonFlow
    ui/                     # Button, Card, Panda, StreakPill, Progress
  lib/
    auth.ts, prisma.ts, characters.ts, cn.ts
  store/
    progress.ts             # Zustand + persist (SRS state, daily activity, streak)
  data/
    characters.json         # Built from HSK + CEDICT
    lessons.json            # 60 HSK1 lessons of 5 chars each
    grammar.json            # Per-lesson grammar bits
public/
  panda/, bg/, fire/, category/, bamboo/   # extracted assets
  asset_sheet.png                          # original reference sheet
prisma/
  schema.prisma
scripts/
  build-hsk-data.ts
```

## Architecture notes

- **Mobile-future ready.** All UI lives in dumb components; data is in JSON +
  Zustand. The DB schema mirrors the client store so a React Native client can
  reuse the same shapes.
- **Writing validation is real.** `WritingQuiz` calls `HanziWriter.quiz()`,
  which validates stroke order, direction, and position against the
  hanzi-writer-data SVG strokes. Mistakes are surfaced via callbacks; after
  two misses the writer overlays the correct stroke as a hint.
- **SRS is real.** `useProgress.recordOutcome` runs a simplified SM-2: ease
  decays on lapses, intervals grow on `easy`/`good`. Due chars surface in
  Review. State persists to localStorage; the DB schema is ready for cloud
  sync once the user logs in.
- **Lesson flow.** Each character runs through `intro → stroke order
  (autoplay) → guided writing → practice (h2m)`, then the lesson finishes
  with a tiny grammar bit and a celebration screen.
