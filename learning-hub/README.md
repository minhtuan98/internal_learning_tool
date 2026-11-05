# Learning Hub — Internal Learning Platform

Next.js 15 (App Router) · Ant Design 6.7 · Prisma 6 + SQLite · Claude API (`claude-opus-5-5`).
Spec: Notion "Internal Learning Platform — Product Docs" (PRD DEC-001…DEC-059). Design: Figma file `2DXccwpK15yRxR5dBHCajq`.

## Run locally

```bash
npm install                 # npm 11: approve install scripts once: npm approve-scripts prisma @prisma/client @prisma/engines esbuild
cp .env.example .env        # then set SESSION_SECRET (>= 32 chars)
npm run setup               # create SQLite DB + sample data
npm run build && npm start  # http://localhost:3000
```

`npm run db:reset` wipes the database and reloads the sample data.

### Sign in
- **Local quick sign-in** (`AUTH_DEV_LOGIN=true`): pick a seeded user on `/login`. The same allowlist and lock rules apply as with Google.
- **Google** — set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`; redirect URI `<APP_URL>/api/auth/google/callback`.

| Email | Role | Shows |
|---|---|---|
| minhanh@acme.vn | Admin | everything admin |
| lananh@acme.vn | Member (Nhân sự) | course due in 2 days, completed course, passed quiz |
| long@acme.vn | Member (Kỹ thuật) | overdue course locked (DEC-059), assigned course without access (DEC-056) |
| khoa@acme.vn | Member (Kinh doanh) | overdue, failed attempt |
| ha@acme.vn | Locked | "account locked" screen |
| any other email | — | "not on the allowlist" screen |

### AI question generation
Set `ANTHROPIC_API_KEY` to use Claude (`claude-opus-5-5`, structured JSON output validated with zod, server-side refusal fallback enabled, every call logged in `AiCallLog`).
Without a key the app uses a **sample generator** so the review flow can be tried; those questions are labelled "Câu hỏi mẫu".
Prompt: `src/prompts/question-generation.v1.ts` (bump `PROMPT_VERSION` when it changes).

## Structure

```
prisma/schema.prisma        data model (Notion Step 2 + decisions)
prisma/seed.ts              sample data matching the Figma designs
src/theme/tokens.ts         antd theme tokens (from the Figma palette, light + dark)
src/components/             design-system components: Shells, ui (PageHeader, KpiCard, tags, charts), editors, NoAccess
src/lib/                    auth, access rules, quiz scoring, AI, stats
src/server/*-actions.ts     server actions (all writes; each checks role)
src/app/admin/...           admin screens (F2–F5, F7, F9, F10)
src/app/learn/...           member screens (F6, F8)
```

## Business rules implemented (by decision)
- Allowlist sign-in, locked accounts keep results — DEC-011/012/028
- Course access by member or group; follows group changes — DEC-021/022/033/049
- Draft/Published; cannot unpublish during an attempt; delete only unused drafts — DEC-037/042/046
- Quiz settings: pass score, time limit, attempts, time window; full edit after publish — DEC-016/057
- AI drafts only; admin approves; scoring and timer by code; "edited" flag feeds AI-quality KPI — DEC-014, HLD §6
- Assign whole courses with deadline; notification for people without access; lock after deadline — DEC-055/056/059

## Open items (marked "Giả định" in the UI)
- Buttons on the "no access" notification when assigning (DEC-056: TBD).
- "Completed" assignment = all lessons learned + every published quiz passed.
- An attempt still open at the assignment deadline is auto-submitted at the deadline.
- Automatic transcript (HLD-Q7) is not wired: the button shows the error state and the admin pastes by hand.
- Language switch (EN) is not implemented; light/dark theme is.
