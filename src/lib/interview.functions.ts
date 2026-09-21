import { createServerFn } from "@tanstack/react-start";
import {
  CLOSER_QUESTION,
  PARTICIPANT_INTERVIEWER_SYSTEM,
  SPINE,
  TURN_CAP,
} from "@/config/spine";

export type PublicTurn = {
  id: string;
  sequence: number;
  spine_area: number | null;
  question_text: string;
  answer_text: string | null;
  was_probe: boolean;
};

type Probe = { question: string; spineArea: number; derivedFrom?: string };

async function loadContext(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: participant } = await supabaseAdmin
    .from("participants")
    .select("id, retro_id, name, role_at_event, status")
    .eq("invite_token", token)
    .maybeSingle();
  if (!participant) throw new Error("This interview link is not valid.");

  const { data: retro } = await supabaseAdmin
    .from("retros")
    .select("id, name, event_date, interview_deadline")
    .eq("id", participant.retro_id)
    .single();

  const { data: qs } = await supabaseAdmin
    .from("question_sets")
    .select("organizer_edited_probes, generated_probes")
    .eq("retro_id", participant.retro_id)
    .maybeSingle();

  // Only the approved question set crosses into the participant interview.
  // The organizer intake transcript is never loaded here.
  const probes = ((qs?.organizer_edited_probes ?? qs?.generated_probes ?? []) as Probe[]) || [];

  const { data: turns } = await supabaseAdmin
    .from("interview_turns")
    .select("id, sequence, spine_area, question_text, answer_text, answer_quality, was_probe")
    .eq("participant_id", participant.id)
    .order("sequence");

  return { supabaseAdmin, participant, retro, probes, turns: turns ?? [] };
}

export const getInterview = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const { participant, retro, turns } = await loadContext(data.token);
    return {
      participant: {
        name: participant.name,
        role_at_event: participant.role_at_event,
        status: participant.status,
      },
      retro: { name: retro?.name, interview_deadline: retro?.interview_deadline },
      turns: turns as PublicTurn[],
    };
  });

export const updateInterviewAnswer = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; turnId: string; answer: string }) => {
    const answer = input.answer.trim();
    if (!answer) throw new Error("Please enter an answer before saving.");
    return { ...input, answer };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin, participant, turns } = await loadContext(data.token);
    if (participant.status === "complete") {
      throw new Error("This interview has already been completed.");
    }

    const turn = turns.find((candidate) => candidate.id === data.turnId);
    if (!turn?.answer_text) throw new Error("That answer could not be found.");

    const { error } = await supabaseAdmin
      .from("interview_turns")
      .update({ answer_text: data.answer, answer_mode: "text", answer_quality: null })
      .eq("id", turn.id)
      .eq("participant_id", participant.id);
    if (error) throw new Error(error.message);

    return { id: turn.id, answer_text: data.answer };
  });

export const interviewNext = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      token: string;
      answer?: string;
      answerMode?: "text" | "voice";
    }) => input,
  )
  .handler(async ({ data }) => {
    const { runJson } = await import("./ai.server");
    const { supabaseAdmin, participant, probes, turns } = await loadContext(data.token);

    if (participant.status === "complete") {
      return { done: true, turn: null, closing: "You have already completed this interview." };
    }

    // First turn: fixed opener from spine area 1.
    if (turns.length === 0) {
      const { data: inserted } = await supabaseAdmin
        .from("interview_turns")
        .insert({
          participant_id: participant.id,
          sequence: 1,
          spine_area: 1,
          question_text: SPINE[0]!.openingQuestion,
        })
        .select("id, sequence, spine_area, question_text, answer_text, was_probe")
        .single();
      await supabaseAdmin
        .from("participants")
        .update({ status: "in_progress" })
        .eq("id", participant.id);
      return { done: false, turn: inserted as PublicTurn };
    }

    const last = turns[turns.length - 1]!;
    if (data.answer && !last.answer_text) {
      await supabaseAdmin
        .from("interview_turns")
        .update({
          answer_text: data.answer,
          answer_mode: data.answerMode ?? "text",
        })
        .eq("id", last.id);
      last.answer_text = data.answer;
    }

    const history = turns
      .map(
        (t) =>
          `[area ${t.spine_area ?? "-"}${t.was_probe ? ", probe" : ""}] Q: ${t.question_text}\nA: ${t.answer_text ?? "(no answer)"}`,
      )
      .join("\n\n");

    const currentArea = last.spine_area ?? 1;
    const areasCovered = Array.from(
      new Set(turns.filter((t) => t.answer_text && t.spine_area).map((t) => t.spine_area as number)),
    );
    const probesUsedThisArea = turns.filter((t) => t.spine_area === currentArea && t.was_probe).length;

    const result = await runJson<{
      lastAnswerAssessment: { quality: "thin" | "adequate" | "rich" | "not_applicable"; reasoning: string };
      action: "probe" | "advance" | "close";
      probeType: "example" | "comparison" | "consequence" | "counterfactual" | "clarification" | null;
      nextQuestion: string;
      currentArea: number;
      areasCovered: number[];
      probesUsedThisArea: number;
    }>({
      system: PARTICIPANT_INTERVIEWER_SYSTEM,
      effort: "low",
      schemaHint: `{"lastAnswerAssessment":{"quality":"thin|adequate|rich|not_applicable","reasoning":"one line"},"action":"probe|advance|close","probeType":"example|comparison|consequence|counterfactual|clarification|null","nextQuestion":"...","currentArea":1,"areasCovered":[1],"probesUsedThisArea":0}`,
      messages: [
        {
          role: "user",
          content: `Participant role at the event: ${participant.role_at_event ?? "not stated"}

Fixed spine areas (never reorder, never drop):
${SPINE.map((s) => `${s.id}. ${s.title} — ${s.brief}`).join("\n")}

Approved supplementary probes (attach each to its spine area, ask inside that area's flow):
${probes.length ? probes.map((p) => `- (area ${p.spineArea}) ${p.question}`).join("\n") : "- none"}

After spine area 9's three structural questions, ask this closer verbatim as area 10: "${CLOSER_QUESTION}". Then close.

Coverage state: current area ${currentArea}; areas with an answer: [${areasCovered.join(", ")}]; probes used in the current area: ${probesUsedThisArea}. Turns used: ${turns.length} of a cap of ${TURN_CAP}.

Conversation so far:
${history}

Assess the last answer, then choose your action and write the next question.`,
        },
      ],
    });

    // Record the quality assessment on the answered turn.
    if (last.answer_text) {
      await supabaseAdmin
        .from("interview_turns")
        .update({ answer_quality: result.lastAnswerAssessment?.quality ?? "adequate" })
        .eq("id", last.id);
    }

    const structuralDone = turns.some((t) => (t.spine_area ?? 0) >= 9 && t.answer_text);
    const overBudget = turns.length >= TURN_CAP + 4;
    const shouldClose = (result.action === "close" && structuralDone) || overBudget;

    if (shouldClose) {
      await finalizeInterview(supabaseAdmin, participant.id);
      return {
        done: true,
        turn: null,
        closing:
          result.action === "close"
            ? result.nextQuestion
            : "That's everything — thank you. Your answers go into a single team report.",
      };
    }

    const nextArea = Math.min(Math.max(result.currentArea || currentArea, 1), 10);
    const { data: inserted } = await supabaseAdmin
      .from("interview_turns")
      .insert({
        participant_id: participant.id,
        sequence: turns.length + 1,
        spine_area: nextArea,
        question_text: result.nextQuestion,
        was_probe: result.action === "probe",
        probe_type: result.action === "probe" ? result.probeType : null,
      })
      .select("id, sequence, spine_area, question_text, answer_text, was_probe")
      .single();

    return { done: false, turn: inserted as PublicTurn };
  });

async function finalizeInterview(
  admin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  participantId: string,
) {
  const { data: turns } = await admin
    .from("interview_turns")
    .select("spine_area, answer_quality, answer_text")
    .eq("participant_id", participantId);

  const answered = (turns ?? []).filter((t) => t.answer_text);
  const areasAsked = new Set(answered.map((t) => t.spine_area));
  const goodAreas = new Set(
    answered
      .filter((t) => ["adequate", "rich", "not_applicable"].includes(t.answer_quality ?? ""))
      .map((t) => t.spine_area),
  );
  const score = areasAsked.size ? goodAreas.size / areasAsked.size : 0;
  const thinCount = answered.filter((t) => t.answer_quality === "thin").length;

  await admin
    .from("participants")
    .update({
      status: "complete",
      completeness_score: Number(score.toFixed(2)),
      low_completeness_flag: answered.length > 0 && thinCount > answered.length / 2,
      completed_at: new Date().toISOString(),
    })
    .eq("id", participantId);
}


/**
 * Open team link: someone arrives with the shared link, gives their email and
 * (optionally) department, and gets their own private interview.
 */
export const joinRetro = createServerFn({ method: "POST" })
  .inputValidator((input: { joinToken: string; email: string; dept?: string }) => {
    const email = input.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Please enter a valid email address.");
    return { ...input, email };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: retro } = await supabaseAdmin
      .from("retros")
      .select("id, name, status")
      .eq("join_token", data.joinToken)
      .maybeSingle();
    if (!retro) throw new Error("This link is not valid.");

    const { data: existing } = await supabaseAdmin
      .from("participants")
      .select("id, invite_token, role_at_event")
      .eq("retro_id", retro.id)
      .ilike("email", data.email)
      .maybeSingle();

    if (existing) {
      if (data.dept && !existing.role_at_event) {
        await supabaseAdmin
          .from("participants")
          .update({ role_at_event: data.dept })
          .eq("id", existing.id);
      }
      return { inviteToken: existing.invite_token as string };
    }

    const { data: created, error } = await supabaseAdmin
      .from("participants")
      .insert({
        retro_id: retro.id,
        email: data.email,
        name: data.email.split("@")[0] ?? data.email,
        role_at_event: data.dept?.trim() || null,
      })
      .select("invite_token")
      .single();
    if (error) throw new Error(error.message);
    return { inviteToken: created.invite_token as string };
  });

export const getJoinInfo = createServerFn({ method: "GET" })
  .inputValidator((input: { joinToken: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: retro } = await supabaseAdmin
      .from("retros")
      .select("name, interview_deadline")
      .eq("join_token", data.joinToken)
      .maybeSingle();
    return retro ? { name: retro.name as string, interview_deadline: retro.interview_deadline as string | null } : null;
  });
