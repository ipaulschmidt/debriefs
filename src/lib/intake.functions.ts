import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { INTAKE_AREAS, INTAKE_CAP, INTAKE_SYSTEM, PROBE_GENERATION_SYSTEM } from "@/config/spine";

type IntakeTurn = {
  id: string;
  sequence: number;
  question_text: string;
  answer_text: string | null;
  answer_mode: string;
};

const FIRST_INTAKE_QUESTION =
  "Let's start simple. What was the event, how many days did it run, and who from the team was there and in what role?";

export const getIntake = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { retroId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: turns } = await context.supabase
      .from("organizer_intake_turns")
      .select("id, sequence, question_text, answer_text, answer_mode")
      .eq("retro_id", data.retroId)
      .order("sequence");
    const { data: retro } = await context.supabase
      .from("retros")
      .select("id, name, status, intake_summary")
      .eq("id", data.retroId)
      .single();
    return { turns: (turns ?? []) as IntakeTurn[], retro };
  });

export const intakeNext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { retroId: string; answer?: string; answerMode?: "text" | "voice" }) => input,
  )
  .handler(async ({ data, context }) => {
    const { runJson } = await import("./ai.server");
    const { data: turns } = await context.supabase
      .from("organizer_intake_turns")
      .select("id, sequence, question_text, answer_text, answer_mode")
      .eq("retro_id", data.retroId)
      .order("sequence");

    const list = (turns ?? []) as IntakeTurn[];

    if (list.length === 0) {
      const { data: inserted } = await context.supabase
        .from("organizer_intake_turns")
        .insert({
          retro_id: data.retroId,
          sequence: 1,
          question_text: FIRST_INTAKE_QUESTION,
        })
        .select("id, sequence, question_text, answer_text, answer_mode")
        .single();
      await context.supabase.from("retros").update({ status: "intake" }).eq("id", data.retroId);
      return { turn: inserted, done: false };
    }

    const last = list[list.length - 1]!;
    if (data.answer && !last.answer_text) {
      await context.supabase
        .from("organizer_intake_turns")
        .update({ answer_text: data.answer, answer_mode: data.answerMode ?? "text" })
        .eq("id", last.id);
      last.answer_text = data.answer;
    }

    const history = list
      .map((t) => `Q${t.sequence}: ${t.question_text}\nA${t.sequence}: ${t.answer_text ?? "(no answer)"}`)
      .join("\n\n");

    const result = await runJson<{
      action: "probe" | "advance" | "close";
      nextQuestion: string;
    }>({
      system: INTAKE_SYSTEM,
      schemaHint: `{"lastAnswerAssessment":{"quality":"thin|adequate|rich|not_applicable","reasoning":"one line"},"action":"probe|advance|close","nextQuestion":"the exact question to ask next, or a short closing message if action is close"}`,
      messages: [
        {
          role: "user",
          content: `Areas to cover, in order:\n${INTAKE_AREAS.map((a, i) => `${i + 1}. ${a}`).join("\n")}

Turns used: ${list.length} of a cap of ${INTAKE_CAP}.

Conversation so far:
${history}

Decide the next move and write the next question.`,
        },
      ],
    });

    const done = result.action === "close" || list.length >= INTAKE_CAP;

    if (done) {
      return { turn: null, done: true, closing: result.nextQuestion };
    }

    const { data: inserted } = await context.supabase
      .from("organizer_intake_turns")
      .insert({
        retro_id: data.retroId,
        sequence: list.length + 1,
        question_text: result.nextQuestion,
      })
      .select("id, sequence, question_text, answer_text, answer_mode")
      .single();

    return { turn: inserted, done: false };
  });

export type IntakeSummary = {
  goals: string[];
  goals_were_documented: boolean;
  what_changed: string[];
  investments: string[];
  concerns: string[];
  decisions_pending: string[];
  sensitive_areas: string[];
  people_mentioned: { name: string; role_at_event: string }[];
};

export const finishIntake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { retroId: string }) => input)
  .handler(async ({ data, context }) => {
    const { runJson } = await import("./ai.server");
    const { data: turns } = await context.supabase
      .from("organizer_intake_turns")
      .select("sequence, question_text, answer_text")
      .eq("retro_id", data.retroId)
      .order("sequence");

    const transcript = (turns ?? [])
      .map((t) => `Q: ${t.question_text}\nA: ${t.answer_text ?? "(skipped)"}`)
      .join("\n\n");

    const summary = await runJson<IntakeSummary>({
      system:
        "You summarize a private organizer intake interview for an event retro into structured context. Be faithful; do not invent. If goals were never written down before the event, set goals_were_documented to false.",
      schemaHint: `{"goals":["..."],"goals_were_documented":true,"what_changed":["..."],"investments":["..."],"concerns":["..."],"decisions_pending":["..."],"sensitive_areas":["..."],"people_mentioned":[{"name":"...","role_at_event":"..."}]}`,
      messages: [{ role: "user", content: transcript }],
    });

    await context.supabase
      .from("retros")
      .update({ intake_summary: summary, status: "questions_review" })
      .eq("id", data.retroId);

    return summary;
  });

export type Probe = { question: string; spineArea: number; derivedFrom: string };

export const generateProbes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { retroId: string }) => input)
  .handler(async ({ data, context }) => {
    const { runJson } = await import("./ai.server");
    const { data: turns } = await context.supabase
      .from("organizer_intake_turns")
      .select("sequence, question_text, answer_text")
      .eq("retro_id", data.retroId)
      .order("sequence");

    const transcript = (turns ?? [])
      .map((t) => `Q: ${t.question_text}\nA: ${t.answer_text ?? "(skipped)"}`)
      .join("\n\n");

    const out = await runJson<{ probes: Probe[] }>({
      system: PROBE_GENERATION_SYSTEM,
      effort: "medium",
      schemaHint: `{"probes":[{"question":"...","spineArea":1,"derivedFrom":"the organizer statement this came from"}]}`,
      messages: [{ role: "user", content: `Organizer intake transcript:\n\n${transcript}` }],
    });

    const probes = (out.probes ?? []).slice(0, 6);

    const { data: existing } = await context.supabase
      .from("question_sets")
      .select("id")
      .eq("retro_id", data.retroId)
      .maybeSingle();

    if (existing) {
      await context.supabase
        .from("question_sets")
        .update({ generated_probes: probes, organizer_edited_probes: probes, approved_at: null })
        .eq("id", existing.id);
    } else {
      await context.supabase.from("question_sets").insert({
        retro_id: data.retroId,
        generated_probes: probes,
        organizer_edited_probes: probes,
      });
    }

    return probes;
  });

export const saveProbes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { retroId: string; probes: Probe[]; approve?: boolean }) => input)
  .handler(async ({ data, context }) => {
    const update: Record<string, unknown> = { organizer_edited_probes: data.probes };
    if (data.approve) {
      update["approved_at"] = new Date().toISOString();
      update["approved_by"] = context.userId;
    }
    await context.supabase.from("question_sets").update(update).eq("retro_id", data.retroId);
    if (data.approve) {
      await context.supabase.from("retros").update({ status: "collecting" }).eq("id", data.retroId);
    }
    return { ok: true };
  });

export const getQuestionSet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { retroId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: qs } = await context.supabase
      .from("question_sets")
      .select("*")
      .eq("retro_id", data.retroId)
      .maybeSingle();
    return qs;
  });
