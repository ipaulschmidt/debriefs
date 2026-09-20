import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Synthesis } from "./synthesis.functions";

async function assertAttributionAdmin(
  supabase: { from: (t: string) => any },
  retroId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("retro_admins")
    .select("role")
    .eq("retro_id", retroId)
    .eq("user_id", userId)
    .eq("role", "attribution_admin")
    .maybeSingle();
  if (!data) throw new Error("You do not have attribution access on this retro.");
}

export const revealFinding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { retroId: string; section: string; index: number; reason: string }) => {
      if (!input.reason || input.reason.trim().length < 10) {
        throw new Error("Please give a reason of at least 10 characters.");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertAttributionAdmin(context.supabase, data.retroId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: report } = await supabaseAdmin
      .from("reports")
      .select("synthesis_json")
      .eq("retro_id", data.retroId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!report) throw new Error("No report yet.");

    const synthesis = report.synthesis_json as unknown as Synthesis;
    const section = (synthesis as unknown as Record<string, unknown>)[data.section] as
      | { sourceParticipantIds?: string[]; sourceParticipantId?: string }[]
      | undefined;
    const item = section?.[data.index];
    const ids = item?.sourceParticipantIds ?? (item?.sourceParticipantId ? [item.sourceParticipantId] : []);

    await supabaseAdmin.from("attribution_access_log").insert({
      retro_id: data.retroId,
      admin_user_id: context.userId,
      target_type: "finding",
      target_id: `${data.section}#${data.index}`,
      reason_text: data.reason.trim(),
    });

    if (!ids.length) return { sources: [] };

    const { data: participants } = await supabaseAdmin
      .from("participants")
      .select("id, name, role_at_event")
      .in("id", ids);
    const { data: turns } = await supabaseAdmin
      .from("interview_turns")
      .select("participant_id, question_text, answer_text, answer_quality")
      .in("participant_id", ids)
      .order("sequence");

    return {
      sources: (participants ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        role_at_event: p.role_at_event,
        excerpts: (turns ?? [])
          .filter((t) => t.participant_id === p.id && t.answer_text)
          .slice(0, 6)
          .map((t) => ({
            question: t.question_text,
            answer: t.answer_text,
            quality: t.answer_quality,
          })),
      })),
    };
  });

export const revealTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { retroId: string; participantId: string; reason: string }) => {
    if (!input.reason || input.reason.trim().length < 10) {
      throw new Error("Please give a reason of at least 10 characters.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAttributionAdmin(context.supabase, data.retroId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("attribution_access_log").insert({
      retro_id: data.retroId,
      admin_user_id: context.userId,
      target_type: "participant",
      target_id: data.participantId,
      reason_text: data.reason.trim(),
    });

    const { data: participant } = await supabaseAdmin
      .from("participants")
      .select("id, name, role_at_event, completeness_score, low_completeness_flag")
      .eq("id", data.participantId)
      .eq("retro_id", data.retroId)
      .single();

    const { data: turns } = await supabaseAdmin
      .from("interview_turns")
      .select("sequence, spine_area, question_text, answer_text, answer_quality, was_probe, probe_type")
      .eq("participant_id", data.participantId)
      .order("sequence");

    return { participant, turns: turns ?? [] };
  });

export const getAccessLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { retroId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: log } = await context.supabase
      .from("attribution_access_log")
      .select("id, admin_user_id, target_type, target_id, reason_text, created_at")
      .eq("retro_id", data.retroId)
      .order("created_at", { ascending: false });
    return log ?? [];
  });
