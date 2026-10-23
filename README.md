# Debrief

Group retros after a trade show or conference tend to go the same way: the loudest voice sets the tone, quieter people hold back, and someone still has to write it all up afterward. Debrief replaces the meeting with short private AI interviews, one per person, and turns them into a single honest report with action items that each have an owner.

**Live app:** [debriefs.lovable.app](https://debriefs.lovable.app)

---

## How It Works

1. **Create a retro.** The organizer enters the event name, event date and interview deadline.
2. **Intake interview.** Instead of filling in a form, the organizer goes through a short AI interview covering goals, what changed from last time, what the team bet on, worries going in and what they've already heard.
3. **Review the question set.** Debrief drafts the participant questions, built on a fixed 10-area structure plus probes specific to this event. The organizer can edit, delete or add questions, or re-draft without losing their own edits.
4. **Invite the team.** Share one team link. Each person enters their email (and department, if they want to) and gets their own private interview.
5. **Private interviews.** Participants answer one question at a time, by typing or speaking. The AI asks a follow-up when an answer is thin. People can stop, come back later and edit earlier answers.
6. **Synthesis.** Once interviews are in, Debrief writes a process-level report with themes, evidence and owned action items. The report never names who said what.

## Key Capabilities

- **Collect independently, synthesize centrally.** No participant ever sees another person's answers, a running summary or any hint of what others said.
- **Honest privacy model.** Debrief doesn't claim anonymity. The report never names people, and only the admin can see individual responses. Each time they do, it's quietly logged.
- **Single shareable team link.** One link for the whole team. Returning participants pick up where they left off, matched by email.
- **Voice or text answers.** Every interview step accepts either.
- **Adaptive probing.** Each answer is rated thin, adequate or rich, and that rating decides whether the AI asks a follow-up or moves to the next area. A completeness score flags interviews with low coverage.
- **Progress tracking.** The People & numbers tab shows who has started and who has finished.
- **Manual metrics.** Organizers enter objective numbers (leads, meetings, spend) so the report can use them alongside the interviews.
- **Source reveal and export.** The admin can open the sources behind any finding, view a single person's answers, or export all transcripts as Markdown and CSV.
- **Admin dashboard.** An overview of all retros and how far along each one is.

## Tech Stack & Architecture

| Layer | Technology |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, SSR) on Vite |
| Server logic | TanStack `createServerFn` server functions, deployed to an edge (Cloudflare Workers) runtime |
| Database & auth | Postgres with row-level security and email/password auth (Lovable Cloud / Supabase) |
| AI | Lovable AI Gateway through the Vercel AI SDK, with structured JSON responses and retry/repair |
| Styling | Tailwind CSS v4 and shadcn/ui components |
| Data fetching | TanStack Query |

**Project layout**

```text
src/
  config/        Interview structure (spine areas, turn caps, system prompts), departments
  lib/           Server functions: intake, interview, retros, synthesis, attribution, dashboard
  routes/        Pages: retro workspace (_authenticated/), participant interview (i.$token), team join link (j.$token)
  components/    Shared UI, including voice answer capture
supabase/
  migrations/    Database schema, row-level security policies and triggers
```

Participant interview links use a token and run through server functions, so participants never get direct access to the database. The organizer's intake transcript never enters the participant interview context. Only the approved question set does.

## Local Development

**Prerequisites:** [Bun](https://bun.sh) (or Node 20+), and a Supabase project with the migrations in `supabase/migrations` applied.

```bash
git clone <your-repo-url> debrief
cd debrief
bun install
cp .env.example .env   # fill in your Supabase URL, publishable key and project ID
bun run dev            # http://localhost:8080
```

Server-only secrets (`LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are runtime environment variables. Never put them in client code or commit them.

| Script | Purpose |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run preview` | Preview the production build |
| `bun run lint` | Run ESLint |
| `bun run format` | Format with Prettier |

## Roadmap

- **More retro types.** Campaigns, projects and client offboarding. The data model already has a `type` field for this.
- **Integrations.** Optional email and Slack invites and reminders, plus calendar-aware deadlines.
- **Trends across retros.** Compare themes and action-item follow-through from one event to the next.
- **Team workspaces and billing.** Multiple organizers per organization, role-based access and paid plans.
