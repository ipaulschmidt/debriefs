import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import {
  getInterview,
  interviewNext,
  updateInterviewAnswer,
} from "@/lib/interview.functions";
import { SPINE } from "@/config/spine";
import { VoiceAnswer } from "@/components/VoiceAnswer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedAnswer, setEditedAnswer] = useState("");

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
    onSuccess: async (res) => {
      setDraft("");
      if (res.done) setClosing(res.closing ?? "That's everything. Thank you.");
      await qc.invalidateQueries({ queryKey: ["interview", token] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
  });

  const saveEdit = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error("Choose an answer to edit.");
      return updateInterviewAnswer({ data: { token, turnId: editingId, answer: editedAnswer } });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["interview", token] });
      setEditingId(null);
      setEditedAnswer("");
      toast.success("Answer updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update the answer"),
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
  const sectionsLeft = Math.max(1, SPINE.length - currentArea + 1);
  const showProgress = (started || turns.length > 0) && !done;
  const previousTurns = turns.filter((turn) => Boolean(turn.answer_text));

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 pb-32 sm:pb-12">
      <p className="eyebrow">{data.retro.name}</p>
      <h1 className="mt-2 text-4xl">Hi {data.participant.name}</h1>

      {showProgress ? (
        <>
          <div className="mt-6 hidden space-y-2 sm:block">
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

          {/* Always-visible gauge on a phone, pinned to the bottom of the screen. */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur sm:hidden">
            <div className="mx-auto max-w-2xl space-y-2">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium">
                  {sectionsLeft} {sectionsLeft === 1 ? "section" : "sections"} left
                  {currentAreaTitle ? ` · now: ${currentAreaTitle}` : ""}
                </span>
                <span className="text-muted-foreground">~{minutesLeft} min</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-foreground transition-all"
                  style={{ width: `${Math.round(((currentArea - 1) / SPINE.length) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}

      {!started && turns.length === 0 ? (
        <>
          <div className="mt-6 space-y-3 text-base leading-relaxed">
            <p>
              A private conversation about how the event actually went. About ten minutes — type
              or speak, stop and come back anytime.
            </p>
            <p className="text-sm text-muted-foreground">
              Nobody sees your individual answers — the report describes what happened without
              naming anyone. Be straight and specific: a moment, a number or an example is worth
              more than a summary.
            </p>
            {data.retro.interview_deadline ? (
              <p className="text-sm text-muted-foreground">
                Please finish by {data.retro.interview_deadline}.
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

      <div className="mt-10">
        {done ? (
          <div className="rule-top animate-in fade-in slide-in-from-bottom-2 pt-8 duration-300">
            <p className="text-xl leading-relaxed">
              {closing ?? "You've finished this interview. Thank you."}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Once everyone has finished{data.retro.interview_deadline ? ` or the ${data.retro.interview_deadline} deadline passes` : ""}, the answers are
              combined into one report and shared with the team. It describes what happened, not who
              said it.
            </p>
          </div>
        ) : awaitingAnswer && current ? (
          <section
            key={current.id}
            aria-labelledby={`question-${current.id}`}
            className="animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
          >
            <p className="eyebrow">
              {current.was_probe ? "A quick follow-up" : currentAreaTitle || `Section ${currentArea}`}
            </p>
            <h2 id={`question-${current.id}`} className="mt-3 text-3xl leading-snug sm:text-4xl">
              {current.question_text}
            </h2>
            <div className="mt-7 space-y-4">
              <VoiceAnswer
                value={draft}
                onChange={(v, m) => {
                  setDraft(v);
                  setMode(m);
                }}
                disabled={next.isPending}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => next.mutate()} disabled={!draft.trim() || next.isPending}>
                  {next.isPending ? "Preparing the next question…" : "Submit answer"}
                </Button>
                {previousTurns.length ? (
                  <Button variant="ghost" onClick={() => setReviewOpen(true)} disabled={next.isPending}>
                    Review previous answers
                  </Button>
                ) : null}
              </div>
              <p aria-live="polite" className="min-h-5 text-xs text-muted-foreground">
                {next.isPending ? "Your answer is saved. Preparing what comes next." : ""}
              </p>
            </div>
          </section>
        ) : null}
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review previous answers</DialogTitle>
            <DialogDescription>
              You can correct an earlier answer. Questions already asked will not change.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-2">
            {previousTurns.map((turn) => (
              <div key={turn.id} className="rule-top space-y-2 pt-4 first:border-t-0 first:pt-0">
                <div className="flex items-start gap-3">
                  <p className="flex-1 text-sm font-medium leading-relaxed">{turn.question_text}</p>
                  {editingId !== turn.id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Edit this answer"
                      title="Edit this answer"
                      onClick={() => {
                        setEditingId(turn.id);
                        setEditedAnswer(turn.answer_text ?? "");
                      }}
                    >
                      <Pencil />
                    </Button>
                  ) : null}
                </div>
                {editingId === turn.id ? (
                  <div className="space-y-2">
                    <Textarea
                      autoFocus
                      value={editedAnswer}
                      onChange={(event) => setEditedAnswer(event.target.value)}
                      disabled={saveEdit.isPending}
                      className="min-h-28 bg-card text-base leading-relaxed"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveEdit.mutate()}
                        disabled={!editedAnswer.trim() || saveEdit.isPending}
                      >
                        {saveEdit.isPending ? "Saving…" : "Save answer"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        disabled={saveEdit.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">{turn.answer_text}</p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
