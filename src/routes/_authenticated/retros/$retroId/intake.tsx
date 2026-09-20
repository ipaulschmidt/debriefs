import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { finishIntake, getIntake, intakeNext } from "@/lib/intake.functions";
import { RetroNav } from "@/components/RetroNav";
import { VoiceAnswer } from "@/components/VoiceAnswer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/retros/$retroId/intake")({
  head: () => ({
    meta: [
      { title: "Intake interview — Debrief" },
      {
        name: "description",
        content: "A ten-minute interview with the organizer that shapes the participant questions.",
      },
      { property: "og:title", content: "Intake interview — Debrief" },
      {
        property: "og:description",
        content: "A ten-minute interview with the organizer that shapes the participant questions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Intake,
});

function Intake() {
  const { retroId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [closing, setClosing] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["intake", retroId],
    queryFn: () => getIntake({ data: { retroId } }),
  });

  const turns = data?.turns ?? [];
  const pending = turns.find((t) => !t.answer_text);

  const next = useMutation({
    mutationFn: (answer?: string) =>
      intakeNext({
        data: { retroId, ...(answer ? { answer, answerMode: mode } : {}) },
      }),
    onSuccess: (res) => {
      setDraft("");
      if (res.done) setClosing(res.closing ?? "Thanks — that's everything I needed.");
      qc.invalidateQueries({ queryKey: ["intake", retroId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
  });

  const finish = useMutation({
    mutationFn: () => finishIntake({ data: { retroId } }),
    onSuccess: () => {
      toast.success("Intake summarized. Now build the question set.");
      navigate({ to: "/retros/$retroId/questions", params: { retroId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not summarize intake"),
  });

  return (
    <>
      <RetroNav retroId={retroId} name={data?.retro?.name ?? undefined} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="eyebrow">Organizer intake · about 10 minutes</p>
        <h2 className="mt-2 text-3xl">Tell me about the event</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This conversation is private to admins. It decides which topics get probed with your team
          — never what answer gets suggested to them. Type or speak.
        </p>

        <div className="mt-8 space-y-6">
          {turns.map((t) => (
            <div key={t.id} className="space-y-2">
              <p className="text-lg leading-snug">{t.question_text}</p>
              {t.answer_text ? (
                <p className="rounded-md border bg-card p-3 text-sm leading-relaxed text-muted-foreground">
                  {t.answer_text}
                </p>
              ) : null}
            </div>
          ))}

          {closing ? (
            <div className="rule-top space-y-4 pt-6">
              <p className="text-lg leading-snug">{closing}</p>
              <Button onClick={() => finish.mutate()} disabled={finish.isPending}>
                {finish.isPending ? "Summarizing…" : "Summarize intake and continue"}
              </Button>
            </div>
          ) : pending ? (
            <div className="space-y-3">
              <VoiceAnswer
                value={draft}
                onChange={(v, m) => {
                  setDraft(v);
                  setMode(m);
                }}
                disabled={next.isPending}
              />
              <Button onClick={() => next.mutate(draft)} disabled={!draft.trim() || next.isPending}>
                {next.isPending ? "Thinking…" : "Send answer"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button onClick={() => next.mutate(undefined)} disabled={next.isPending}>
                {next.isPending
                  ? "Thinking…"
                  : turns.length === 0
                    ? "Start the intake interview"
                    : "Next question"}
              </Button>
              {turns.length > 3 ? (
                <Button
                  variant="outline"
                  className="ml-3"
                  onClick={() => finish.mutate()}
                  disabled={finish.isPending}
                >
                  Stop here and summarize
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
