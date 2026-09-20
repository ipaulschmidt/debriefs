import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RetroSummary = {
  id: string;
  name: string;
  status: string;
  event_date: string | null;
  interview_deadline: string | null;
  invited: number;
  complete: number;
  inProgress: number;
  notStarted: number;
  avgCompleteness: number | null;
  thinFlagged: number;
  hasReport: boolean;
};

export type CrossFinding = {
  finding: string;
  kind: "worked" | "didnt";
  retroId: string;
  retroName: string;
  evidenceStrength?: string | null;
};

export type RecurringTheme = {
  label: string;
  kind: "worked" | "didnt";
  occurrences: { retroId: string; retroName: string; finding: string }[];
};

const STOP = new Set([
  "the","a","an","and","or","of","to","in","on","for","with","was","were","is","are","we","our",
  "they","that","this","it","at","as","by","from","not","no","but","had","have","has","been","be",
  "people","team","event","booth","more","less","than","some","most","many","there","their","about",
  "did","didnt","doesn","dont","too","very","much","when","what","who","how","into","out","up","down",
]);

function keywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP.has(w)),
    ),
  );
}

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: retros } = await context.supabase
      .from("retros")
      .select("id, name, status, event_date, interview_deadline, created_at")
      .order("event_date", { ascending: false, nullsFirst: false });

    const list = retros ?? [];
    const ids = list.map((r) => r.id);
    if (!ids.length) {
      return { retros: [] as RetroSummary[], findings: [] as CrossFinding[], recurring: [] as RecurringTheme[] };
    }

    const { data: participants } = await context.supabase
      .from("participants")
      .select("retro_id, status, completeness_score, low_completeness_flag")
      .in("retro_id", ids);

    const { data: reports } = await context.supabase
      .from("reports")
      .select("retro_id, synthesis_json, generated_at, version")
      .in("retro_id", ids)
      .order("version", { ascending: false });

    const latestReport = new Map<string, any>();
    for (const r of reports ?? []) {
      if (!latestReport.has(r.retro_id)) latestReport.set(r.retro_id, r.synthesis_json);
    }

    const summaries: RetroSummary[] = list.map((r) => {
      const own = (participants ?? []).filter((p) => p.retro_id === r.id);
      const scores = own
        .map((p) => p.completeness_score)
        .filter((s): s is number => typeof s === "number");
      return {
        id: r.id,
        name: r.name,
        status: r.status,
        event_date: r.event_date,
        interview_deadline: r.interview_deadline,
        invited: own.length,
        complete: own.filter((p) => p.status === "complete").length,
        inProgress: own.filter((p) => p.status === "in_progress").length,
        notStarted: own.filter((p) => p.status === "not_started").length,
        avgCompleteness: scores.length
          ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
          : null,
        thinFlagged: own.filter((p) => p.low_completeness_flag).length,
        hasReport: latestReport.has(r.id),
      };
    });

    const findings: CrossFinding[] = [];
    for (const r of list) {
      const s = latestReport.get(r.id);
      if (!s) continue;
      for (const f of (s.whatWorked ?? []) as any[]) {
        if (f?.finding)
          findings.push({
            finding: f.finding,
            kind: "worked",
            retroId: r.id,
            retroName: r.name,
            evidenceStrength: f.evidenceStrength ?? null,
          });
      }
      for (const f of (s.whatDidntWork ?? []) as any[]) {
        if (f?.finding)
          findings.push({
            finding: f.finding,
            kind: "didnt",
            retroId: r.id,
            retroName: r.name,
            evidenceStrength: f.evidenceStrength ?? null,
          });
      }
    }

    // Recurring themes: findings of the same kind from different events that share
    // at least two meaningful words.
    const used = new Set<number>();
    const recurring: RecurringTheme[] = [];
    findings.forEach((f, i) => {
      if (used.has(i)) return;
      const kw = keywords(f.finding);
      const group = [{ retroId: f.retroId, retroName: f.retroName, finding: f.finding }];
      findings.forEach((g, j) => {
        if (j <= i || used.has(j) || g.kind !== f.kind || g.retroId === f.retroId) return;
        const shared = keywords(g.finding).filter((w) => kw.includes(w));
        if (shared.length >= 2) {
          used.add(j);
          group.push({ retroId: g.retroId, retroName: g.retroName, finding: g.finding });
        }
      });
      if (group.length > 1) {
        used.add(i);
        recurring.push({
          label: f.finding,
          kind: f.kind,
          occurrences: group,
        });
      }
    });

    return { retros: summaries, findings, recurring };
  });
