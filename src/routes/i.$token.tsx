import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getInterview, interviewNext } from "@/lib/interview.functions";
import { SPINE } from "@/config/spine";
import { VoiceAnswer } from "@/components/VoiceAnswer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/i/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your retro interview — Debrief" },
      {
        name: "description",
        content: "A private ten-minute conversation about how the event actually went.",
      },
      { property: "og:title", content: "Your retro interview — Debrief" },
      {
        property: "og:description",
        content: "A private ten-minute conversation about how the event actually went.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Interview,
});

function Interview() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [closing, setClosing] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["interview", token],
    queryFn: () => getInterview({ data: { token } }),
  });

  const turns = data?.turns ?? [];
  const current = turns.length ? turns[turns.length - 1] : null;
  const awaitingAnswer = current && !current.answer_text;

  const next = useMutation({
    mutationFn: () =>
      interviewNext({
        data: {
          token,
          ...(draft ? { answer: draft, answerMode: mode } : {}),
        },
      }),
    onSuccess: (res) => {
      setDraft("");
      if (res.done) setClosing(res.closing ?? "That's everything. Thank you.");
      qc.invalidateQueries({ queryKey: ["interview", token] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
  });

  if (isLoading) {
    return <main className="mx-auto max-w-2xl px-6 py-20 text-muted-foreground">Loading…</main>;
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <h1 className="text-3xl">This link isn't valid</h1>
        <p className="mt-3 text-muted-foreground">
          Ask whoever invited you to send a fresh one.
        </p>
      </main>
    );
  }

  const done = data.participant.status === "complete" || closing;

  const currentArea = Math.min(Math.max(current?.spine_area ?? 1, 1), SPINE.length);
  const currentAreaTitle = SPINE[currentArea - 1]?.title ?? "";
  const minutesLeft = Math.max(1, Math.round((SPINE.length - currentArea + 1) * 1.2));
  const showProgress = (started || turns.length > 0) && !done;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="eyebrow">{data.retro.name}</p>
      <h1 className="mt-2 text-4xl">Hi {data.participant.name}</h1>

      {showProgress ? (
        <div className="mt-6 space-y-2">
          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
            <span>
              Section {currentArea} of {SPINE.length}
              {currentAreaTitle ? ` · ${currentAreaTitle}` : ""}
            </span>
            <span>about {minutesLeft} min to go</span>
          </div>
          <div className="h-1 w-full rounded-full bg-muted">
            <div
              className="h-1 rounded-full bg-foreground transition-all"
              style={{ width: `${Math.round(((currentArea - 1) / SPINE.length) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {!started && turns.length === 0 ? (
        <>
          <div className="mt-6 space-y-4 text-base leading-relaxed">
            <p>
              This is a private conversation about how the event actually went. Ten to fifteen
              minutes. You can type or speak.
            </p>
            <div className="space-y-2 rounded-md border bg-card p-5 text-sm leading-relaxed">
              <p>Before we start, exactly how this works:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>The report describes what happened. It never names who said it.</li>
                <li>
                  Something only appears in the report once it has come up in two separate
                  interviews.
                </li>
                <li>Your colleagues never see anyone's individual answers, including yours.</li>
                <li>
                  So be straight with me. Specific, honest answers are the whole point — there is
                  nothing to soften here.
                </li>
                <li>
                  An admin can review individual responses for a specific reason, and every one of
                  those reviews is recorded.
                </li>
              </ul>
              <p>
                I'll ask follow-up questions. That's normal and expected — it doesn't mean your
                first answer was wrong, just that specifics are more useful than summaries.
              </p>
            </div>
            {data.retro.interview_deadline ? (
              <p className="text-sm text-muted-foreground">
                Please finish by {data.retro.interview_deadline}. You can stop and come back — this
                link remembers where you were.
              </p>
            ) : null}
          </div>
          <Button
            className="mt-8"
            onClick={() => {
              setStarted(true);
              next.mutate();
            }}
            disabled={next.isPending}
          >
            {next.isPending ? "Starting…" : "Start the interview"}
          </Button>
        </>
      ) : null}

      <div className="mt-10 space-y-8">
        {turns.map((t) => (
          <div key={t.id} className="space-y-2">
            <p className="text-xl leading-snug">{t.question_text}</p>
            {t.answer_text ? (
              <div className="rounded-md border bg-card p-3">
                <p className="text-sm leading-relaxed text-muted-foreground">{t.answer_text}</p>
              </div>
            ) : null}
          </div>
        ))}

        {done ? (
          <div className="rule-top pt-8">
            <p className="text-xl leading-relaxed">
              {closing ?? "You've finished this interview. Thank you."}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Once everyone has finished{data.retro.interview_deadline ? ` or the ${data.retro.interview_deadline} deadline passes` : ""}, the answers are
              combined into one report and shared with the team. It describes what happened, not who
              said it.
            </p>
          </div>
        ) : awaitingAnswer ? (
          <div className="space-y-3">
            <VoiceAnswer
              value={draft}
              onChange={(v, m) => {
                setDraft(v);
                setMode(m);
              }}
              disabled={next.isPending}
            />
            <Button onClick={() => next.mutate()} disabled={!draft.trim() || next.isPending}>
              {next.isPending ? "Thinking…" : "Send answer"}
            </Button>
          </div>
        ) : turns.length ? (
          <Button onClick={() => next.mutate()} disabled={next.isPending}>
            {next.isPending ? "Thinking…" : "Next question"}
          </Button>
        ) : null}
      </div>
    </main>
  );
}
