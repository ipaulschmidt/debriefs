import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getAccessLog, revealTranscript } from "@/lib/attribution.functions";
import { getRetroBundle } from "@/lib/retros.functions";
import { RetroNav } from "@/components/RetroNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/retros/$retroId/access-log")({
  head: () => ({
    meta: [
      { title: "Access log — Debrief" },
      {
        name: "description",
        content: "Every time an admin looked at an individual answer, and the reason they gave.",
      },
      { property: "og:title", content: "Access log — Debrief" },
      {
        property: "og:description",
        content: "Every time an admin looked at an individual answer, and the reason they gave.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccessLog,
});

function AccessLog() {
  const { retroId } = Route.useParams();
  const { data: bundle } = useQuery({
    queryKey: ["retro", retroId],
    queryFn: () => getRetroBundle({ data: { retroId } }),
  });
  const { data: log = [], refetch } = useQuery({
    queryKey: ["accessLog", retroId],
    queryFn: () => getAccessLog({ data: { retroId } }),
  });

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [transcript, setTranscript] =
    useState<Awaited<ReturnType<typeof revealTranscript>> | null>(null);

  const reveal = useMutation({
    mutationFn: () => revealTranscript({ data: { retroId, participantId: participantId!, reason } }),
    onSuccess: (res) => {
      setTranscript(res);
      refetch();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not open the transcript"),
  });

  return (
    <>
      <RetroNav retroId={retroId} name={bundle?.retro?.name ?? undefined} />
      <main className="mx-auto max-w-3xl space-y-10 px-6 py-10">
        <section>
          <p className="eyebrow">Transparency</p>
          <h2 className="mt-2 text-3xl">Who looked at what</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Individual answers are hidden by default, even from admins. Every time someone opens
            them, it lands here with the reason they gave.
          </p>
          <div className="mt-6 space-y-2">
            {log.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nobody has opened an individual answer.</p>
            ) : null}
            {log.map((l) => (
              <div key={l.id} className="rounded-md border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{l.target_type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(l.created_at as string).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2">“{l.reason_text}”</p>
              </div>
            ))}
          </div>
        </section>

        {bundle?.isAttributionAdmin ? (
          <section className="rule-top pt-8">
            <p className="eyebrow">Full transcripts</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Opening one requires a reason and is recorded above.
            </p>
            <div className="mt-4 space-y-2">
              {(bundle.participants ?? []).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm"
                >
                  <span className="flex-1">
                    {p.name} · {p.role_at_event}
                  </span>
                  {p.low_completeness_flag ? <Badge variant="outline">mostly thin</Badge> : null}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={p.status !== "complete"}
                    onClick={() => {
                      setTranscript(null);
                      setReason("");
                      setParticipantId(p.id);
                    }}
                  >
                    View full transcript
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <Dialog open={!!participantId} onOpenChange={(o) => !o && setParticipantId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Open an individual transcript</DialogTitle>
            <DialogDescription>
              Give a reason. It is recorded with your name and the time, and shown on the access log.
            </DialogDescription>
          </DialogHeader>
          {transcript ? (
            <div className="max-h-[28rem] space-y-4 overflow-y-auto">
              {transcript.turns.map((t, i) => (
                <div key={i}>
                  <p className="text-sm text-muted-foreground">{t.question_text}</p>
                  <p className="text-sm">
                    {t.marked_sensitive
                      ? "Marked sensitive — this person asked for extra care. Not shown here."
                      : (t.answer_text ?? "—")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why do you need to read this transcript? (at least 10 characters)"
              />
              <Button
                onClick={() => reveal.mutate()}
                disabled={reason.trim().length < 10 || reveal.isPending}
              >
                {reveal.isPending ? "Recording…" : "Record reason and open"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
