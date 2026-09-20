import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listRetros = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("retros")
      .select("id, name, type, event_date, interview_deadline, status, created_at")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const createRetro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      name: string;
      eventDate: string | null;
      interviewDeadline: string | null;
      previousRetroId: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { data: retro, error } = await context.supabase
      .from("retros")
      .insert({
        name: data.name,
        type: "event",
        event_date: data.eventDate,
        interview_deadline: data.interviewDeadline,
        previous_retro_id: data.previousRetroId,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Carry forward open action items from the previous retro of the same type.
    if (data.previousRetroId) {
      const { data: prior } = await context.supabase
        .from("action_items")
        .select("description, owner_name, status")
        .eq("retro_id", data.previousRetroId);
      if (prior?.length) {
        await context.supabase.from("action_items").insert(
          prior
            .filter((a) => a.status === "open")
            .map((a) => ({
              retro_id: retro.id,
              description: a.description,
              owner_name: a.owner_name,
              status: "open",
              carried_from_retro_id: data.previousRetroId,
            })),
        );
      }
    }
    return retro;
  });

export const getRetroBundle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { retroId: string }) => input)
  .handler(async ({ data, context }) => {
    const [retro, participants, metrics, actions, report, roles, prevActions] = await Promise.all([
      context.supabase.from("retros").select("*").eq("id", data.retroId).single(),
      context.supabase
        .from("participants")
        .select("id, name, email, role_at_event, status, invite_token, completeness_score, low_completeness_flag, completed_at")
        .eq("retro_id", data.retroId)
        .order("created_at"),
      context.supabase.from("retro_metrics").select("*").eq("retro_id", data.retroId).order("created_at"),
      context.supabase.from("action_items").select("*").eq("retro_id", data.retroId).order("created_at"),
      context.supabase
        .from("reports")
        .select("*")
        .eq("retro_id", data.retroId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      context.supabase
        .from("retro_admins")
        .select("role")
        .eq("retro_id", data.retroId)
        .eq("user_id", context.userId),
      context.supabase.from("action_items").select("*").eq("carried_from_retro_id", data.retroId),
    ]);

    return {
      retro: retro.data,
      participants: participants.data ?? [],
      metrics: metrics.data ?? [],
      actions: actions.data ?? [],
      report: report.data,
      isAttributionAdmin: (roles.data ?? []).some((r) => r.role === "attribution_admin"),
      isOrganizer: (roles.data ?? []).some((r) => r.role === "organizer"),
      carriedForward: prevActions.data ?? [],
    };
  });

export const upsertParticipants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      retroId: string;
      participants: { id?: string; name: string; email: string; role_at_event: string }[];
    }) => input,
  )
  .handler(async ({ data, context }) => {
    for (const p of data.participants) {
      if (p.id) {
        await context.supabase
          .from("participants")
          .update({ name: p.name, email: p.email, role_at_event: p.role_at_event })
          .eq("id", p.id);
      } else {
        await context.supabase.from("participants").insert({
          retro_id: data.retroId,
          name: p.name,
          email: p.email,
          role_at_event: p.role_at_event,
        });
      }
    }
    return { ok: true };
  });

export const removeParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await context.supabase.from("participants").delete().eq("id", data.id);
    return { ok: true };
  });

export const saveMetric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      retroId: string;
      id?: string;
      label: string;
      value: string;
      prior_year_value: string | null;
      notes: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      await context.supabase
        .from("retro_metrics")
        .update({
          label: data.label,
          value: data.value,
          prior_year_value: data.prior_year_value,
          notes: data.notes,
        })
        .eq("id", data.id);
    } else {
      await context.supabase.from("retro_metrics").insert({
        retro_id: data.retroId,
        label: data.label,
        value: data.value,
        prior_year_value: data.prior_year_value,
        notes: data.notes,
      });
    }
    return { ok: true };
  });

export const removeMetric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await context.supabase.from("retro_metrics").delete().eq("id", data.id);
    return { ok: true };
  });

export const saveActionItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      retroId: string;
      id?: string;
      description: string;
      owner_name: string | null;
      due_date: string | null;
      status: "open" | "done" | "dropped";
    }) => input,
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      await context.supabase
        .from("action_items")
        .update({
          description: data.description,
          owner_name: data.owner_name,
          due_date: data.due_date,
          status: data.status,
        })
        .eq("id", data.id);
    } else {
      await context.supabase.from("action_items").insert({
        retro_id: data.retroId,
        description: data.description,
        owner_name: data.owner_name,
        due_date: data.due_date,
        status: data.status,
      });
    }
    return { ok: true };
  });

export const sendInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { retroId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: participants } = await context.supabase
      .from("participants")
      .select("id, name, email, invite_token, status")
      .eq("retro_id", data.retroId);
    await context.supabase.from("retros").update({ status: "collecting" }).eq("id", data.retroId);
    return participants ?? [];
  });
