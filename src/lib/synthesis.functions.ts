import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SYNTHESIS_SYSTEM } from "@/config/spine";

export type Finding = {
  finding: string;
  mentionCount: number;
  evidenceStrength: "strong" | "moderate" | "weak";
  detail: string;
  sourceParticipantIds?: string[];
};

export type Synthesis = {
  executiveSummary: string;
  againstStatedGoals: string;
  whatWorked: Finding[];
  whatDidntWork: Finding[];
  disagreements: { topic: string; splitDescription: string; sourceParticipantIds?: string[] }[];
  singleSourceObservations: { observation: string; sourceParticipantId?: string }[];
  decisionInputs: { decision: string; whatTheEvidenceSays: string }[];
  recommendedActions: { action: string; rationale: string }[];
};

/** Strips every attribution field. Used for anything a non-admin can see. */
export function stripAttribution(s: Synthesis): Synthesis {
  return {
    ...s,
    whatWorked: (s.whatWorked ?? []).map(({ sourceParticipantIds: _ignored, ...f }) => f),
    whatDidntWork: (s.whatDidntWork ?? []).map(({ sourceParticipantIds: _ignored, ...f }) => f),
    disagreements: (s.disagreements ?? []).map(({ sourceParticipantIds: _ignored, ...d }) => d),
    singleSourceObservations: (s.singleSourceObservations ?? []).map(
      ({ sourceParticipantId: _ignored, ...o }) => o,
    ),
  };
}

export const generateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { retroId: string }) => input)
  .handler(async ({ data, context }) => {
    const { runJson } = await import("./ai.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: isAdmin } = await context.supabase
      .from("retro_admins")
      .select("role")
      .eq("retro_id", data.retroId)
      .eq("user_id", context.userId)
      .eq("role", "organizer")
      .maybeSingle();
    if (!isAdmin) throw new Error("Only an organizer can generate the report.");

    const { data: retro } = await supabaseAdmin
      .from("retros")
      .select("name, event_date, intake_summary")
      .eq("id", data.retroId)
      .single();
    const { data: participants } = await supabaseAdmin
      .from("participants")
      .select("id, role_at_event, status, completeness_score, low_completeness_flag")
      .eq("retro_id", data.retroId);
    const { data: metrics } = await supabaseAdmin
      .from("retro_metrics")
      .select("label, value, prior_year_value, notes")
      .eq("retro_id", data.retroId);

    const ids = (participants ?? []).map((p) => p.id);
    const { data: turns } = await supabaseAdmin
      .from("interview_turns")
      .select("participant_id, spine_area, question_text, answer_text, answer_quality, marked_sensitive")
      .in("participant_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
      .order("sequence");

    const transcripts = (participants ?? [])
      .map((p) => {
        const own = (turns ?? []).filter((t) => t.participant_id === p.id && t.answer_text);
        if (!own.length) return null;
        return `PARTICIPANT ${p.id} (role: ${p.role_at_event ?? "n/a"}, completeness: ${p.completeness_score ?? "n/a"}${p.low_completeness_flag ? ", mostly thin answers" : ""})
${own
  .map(
    (t) =>
      `- [area ${t.spine_area}, quality ${t.answer_quality ?? "unrated"}${t.marked_sensitive ? ", MARKED SENSITIVE — never quote or surface" : ""}] Q: ${t.question_text}\n  A: ${t.answer_text}`,
  )
  .join("\n")}`;
      })
      .filter(Boolean)
      .join("\n\n");

    if (!transcripts) throw new Error("No completed interviews yet.");

    const synthesis = await runJson<Synthesis>({
      system: SYNTHESIS_SYSTEM,
      effort: "medium",
      schemaHint: `{"executiveSummary":"3-4 honest sentences","againstStatedGoals":"...","whatWorked":[{"finding":"...","mentionCount":2,"evidenceStrength":"strong|moderate|weak","detail":"...","sourceParticipantIds":["..."]}],"whatDidntWork":[{"finding":"...","mentionCount":2,"evidenceStrength":"strong|moderate|weak","detail":"...","sourceParticipantIds":["..."]}],"disagreements":[{"topic":"...","splitDescription":"...","sourceParticipantIds":["..."]}],"singleSourceObservations":[{"observation":"...","sourceParticipantId":"..."}],"decisionInputs":[{"decision":"...","whatTheEvidenceSays":"..."}],"recommendedActions":[{"action":"...","rationale":"..."}]}`,
      messages: [
        {
          role: "user",
          content: `Event: ${retro?.name}
Organizer intake summary (BACKGROUND ONLY — never a finding):
${JSON.stringify(retro?.intake_summary ?? {}, null, 2)}

Manual metrics:
${JSON.stringify(metrics ?? [], null, 2)}

Participant transcripts:
${transcripts}`,
        },
      ],
    });

    const { data: existing } = await supabaseAdmin
      .from("reports")
      .select("version")
      .eq("retro_id", data.retroId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: report } = await supabaseAdmin
      .from("reports")
      .insert({
        retro_id: data.retroId,
        synthesis_json: synthesis as never,
        version: (existing?.version ?? 0) + 1,
      })
      .select("id")
      .single();

    await supabaseAdmin.from("retros").update({ status: "reported" }).eq("id", data.retroId);

    // Seed recommended actions so the organizer can assign owners.
    if (synthesis.recommendedActions?.length) {
      await supabaseAdmin.from("action_items").insert(
        synthesis.recommendedActions.map((a) => ({
          retro_id: data.retroId,
          description: a.action,
          status: "open",
        })),
      );
    }

    return { reportId: report?.id };
  });

/** Shared report view: attribution stripped server-side, so it is never in the payload. */
export const getSharedReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { retroId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: report } = await context.supabase
      .from("reports")
      .select("id, synthesis_json, generated_at, version")
      .eq("retro_id", data.retroId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!report) return null;
    return {
      id: report.id,
      generated_at: report.generated_at,
      version: report.version,
      synthesis: stripAttribution(report.synthesis_json as unknown as Synthesis),
    };
  });
