import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { generateReport, getSharedReport, type Finding } from "@/lib/synthesis.functions";
import { getRetroBundle, saveActionItem } from "@/lib/retros.functions";
import { revealFinding } from "@/lib/attribution.functions";
import { RetroNav } from "@/components/RetroNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/retros/$retroId/report")({
  head: () => ({
    meta: [
      { title: "Retro report — Debrief" },
      {
        name: "description",
        content: "One honest report: what happened, where people disagreed, what to do next.",
      },
      { property: "og:title", content: "Retro report — Debrief" },
      {
        property: "og:description",
        content: "One honest report: what happened, where people disagreed, what to do next.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportPage,
});

type RevealTarget = { section: string; index: number; label: string };

function ReportPage() {
  const { retroId } = Route.useParams();
  const qc = useQueryClient();
  const { data: bundle } = useQuery({
    queryKey: ["retro", retroId],
    queryFn: () => getRetroBundle({ data: { retroId } }),
  });
  const { data: report } = useQuery({
    queryKey: ["report", retroId],
    queryFn: () => getSharedReport({ data: { retroId } }),
  });

  const [target, setTarget] = useState<RevealTarget | null>(null);
  const [sources, setSources] = useState<Awaited<ReturnType<typeof revealFinding>>["sources"] | null>(
    null,
  );

  const generate = useMutation({
    mutationFn: () => generateReport({ data: { retroId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report", retroId] });
      qc.invalidateQueries({ queryKey: ["retro", retroId] });
      toast.success("Report generated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not generate the report"),
  });

  const reveal = useMutation({
    mutationFn: () =>
      revealFinding({ data: { retroId, section: target!.section, index: target!.index } }),
    onSuccess: (res) => setSources(res.sources),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not reveal sources"),
  });

  const action = useMutation({
    mutationFn: (item: {
      id: string;
      description: string;
      owner_name: string | null;
      due_date: string | null;
      status: "open" | "done" | "dropped";
    }) => saveActionItem({ data: { retroId, ...item } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["retro", retroId] }),
  });

  const s = report?.synthesis;
  const participants = bundle?.participants ?? [];
  const complete = participants.filter((p) => p.status === "complete").length;

  const copyText = () => {
    if (!s) return;
    const lines = [
      `${bundle?.retro?.name} — retro report`,
      "",
      s.executiveSummary,
      "",
      "Against stated goals",
      s.againstStatedGoals,
      "",
      "What worked",
      ...(s.whatWorked ?? []).map((f) => `- ${f.finding} (${f.evidenceStrength})\n  ${f.detail}`),
      "",
      "What didn't work",
      ...(s.whatDidntWork ?? []).map((f) => `- ${f.finding} (${f.evidenceStrength})\n  ${f.detail}`),
      "",
      "Where people disagreed",
      ...(s.disagreements ?? []).map((d) => `- ${d.topic}: ${d.splitDescription}`),
      "",
      "Heard once",
      ...(s.singleSourceObservations ?? []).map((o) => `- ${o.observation}`),
      "",
      "Decisions on the table",
      ...(s.decisionInputs ?? []).map((d) => `- ${d.decision}: ${d.whatTheEvidenceSays}`),
      "",
      "Recommended actions",
      ...(s.recommendedActions ?? []).map((a) => `- ${a.action} — ${a.rationale}`),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Report copied. No names are included.");
  };

  const FindingBlock = ({
    f,
    section,
    index,
  }: {
    f: Finding;
    section: string;
    index: number;
  }) => (
    <div className="rounded-md border bg-card p-4 print:break-inside-avoid">
      <div className="flex flex-wrap items-baseline gap-3">
        <p className="flex-1 text-lg leading-snug">{f.finding}</p>
        <Badge variant="outline">{f.evidenceStrength} evidence</Badge>
        <span className="text-xs text-muted-foreground">{f.mentionCount} interviews</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.detail}</p>
      {bundle?.isAttributionAdmin ? (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 print:hidden"
          onClick={() => {
            setSources(null);
            setTarget({ section, index, label: f.finding });
            reveal.mutate();
          }}
        >
          Reveal sources
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      <RetroNav retroId={retroId} name={bundle?.retro?.name ?? undefined} />
      <main className="mx-auto max-w-3xl space-y-10 px-6 py-10">
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? "Reading every interview…" : report ? "Regenerate" : "Generate report"}
          </Button>
          {report ? (
            <>
              <Button variant="outline" onClick={copyText}>
                Copy as text
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                Export PDF
              </Button>
            </>
          ) : null}
          <span className="text-sm text-muted-foreground">
            {complete} of {participants.length} completed
          </span>
        </div>

        {!s ? (
          <p className="text-sm text-muted-foreground">
            No report yet. Generate one once interviews are in — it reads every transcript and the
            numbers you entered.
          </p>
        ) : (
          <>
            <section>
              <p className="eyebrow">Executive summary</p>
              <p className="mt-3 text-xl leading-relaxed">{s.executiveSummary}</p>
            </section>

            <section className="rule-top pt-8">
              <p className="eyebrow">Against stated goals</p>
              <p className="mt-3 leading-relaxed">{s.againstStatedGoals}</p>
            </section>

            {bundle?.metrics?.length ? (
              <section className="rule-top pt-8">
                <p className="eyebrow">The numbers</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {bundle.metrics.map((m) => (
                    <div key={m.id} className="rounded-md border bg-card p-4">
                      <p className="text-sm text-muted-foreground">{m.label}</p>
                      <p className="text-2xl">{m.value}</p>
                      {m.prior_year_value ? (
                        <p className="text-xs text-muted-foreground">
                          last time {m.prior_year_value}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rule-top pt-8">
              <p className="eyebrow">What worked</p>
              <div className="mt-4 space-y-3">
                {(s.whatWorked ?? []).map((f, i) => (
                  <FindingBlock key={i} f={f} section="whatWorked" index={i} />
                ))}
              </div>
            </section>

            <section className="rule-top pt-8">
              <p className="eyebrow">What didn't work</p>
              <div className="mt-4 space-y-3">
                {(s.whatDidntWork ?? []).map((f, i) => (
                  <FindingBlock key={i} f={f} section="whatDidntWork" index={i} />
                ))}
              </div>
            </section>

            {s.disagreements?.length ? (
              <section className="rule-top pt-8">
                <p className="eyebrow">Where people disagreed</p>
                <div className="mt-4 space-y-3">
                  {s.disagreements.map((d, i) => (
                    <div key={i} className="rounded-md border bg-card p-4">
                      <p className="text-lg">{d.topic}</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {d.splitDescription}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {s.singleSourceObservations?.length ? (
              <section className="rule-top pt-8">
                <p className="eyebrow">Heard once</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Raised in a single interview. Not yet a pattern, still worth reading.
                </p>
                <ul className="mt-4 space-y-2">
                  {s.singleSourceObservations.map((o, i) => (
                    <li key={i} className="rounded-md border bg-card p-3 text-sm">
                      {o.observation}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {s.decisionInputs?.length ? (
              <section className="rule-top pt-8">
                <p className="eyebrow">Decisions on the table</p>
                <div className="mt-4 space-y-3">
                  {s.decisionInputs.map((d, i) => (
                    <div key={i} className="rounded-md border bg-card p-4">
                      <p className="text-lg">{d.decision}</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {d.whatTheEvidenceSays}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rule-top pt-8">
              <p className="eyebrow">Actions</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Give each one an owner and a date. They come back at the start of the next retro.
              </p>
              <div className="mt-4 space-y-3">
                {(bundle?.actions ?? []).map((a) => (
                  <div key={a.id} className="rounded-md border bg-card p-4">
                    <p className="leading-snug">{a.description}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3 print:hidden">
                      <Input
                        placeholder="Owner"
                        defaultValue={a.owner_name ?? ""}
                        onBlur={(e) =>
                          action.mutate({
                            id: a.id,
                            description: a.description,
                            owner_name: e.target.value || null,
                            due_date: a.due_date,
                            status: a.status as "open",
                          })
                        }
                      />
                      <Input
                        type="date"
                        defaultValue={a.due_date ?? ""}
                        onChange={(e) =>
                          action.mutate({
                            id: a.id,
                            description: a.description,
                            owner_name: a.owner_name,
                            due_date: e.target.value || null,
                            status: a.status as "open",
                          })
                        }
                      />
                      <Select
                        value={a.status}
                        onValueChange={(v) =>
                          action.mutate({
                            id: a.id,
                            description: a.description,
                            owner_name: a.owner_name,
                            due_date: a.due_date,
                            status: v as "open" | "done" | "dropped",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                          <SelectItem value="dropped">Dropped</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <p className="rule-top pt-8 text-xs leading-relaxed text-muted-foreground">
              This report describes what happened. It never names who said what, and neither do
              exports. A theme appears here only when it came up in at least two separate
              interviews.
            </p>
          </>
        )}
      </main>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reveal who said this</DialogTitle>
            <DialogDescription>
              This view is recorded quietly with your name and the time. Only the admin can open it.
            </DialogDescription>
          </DialogHeader>
          {sources ? (
            <div className="max-h-96 space-y-4 overflow-y-auto">
              {sources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sources recorded for this finding.</p>
              ) : null}
              {sources.map((src) => (
                <div key={src.id} className="rounded-md border p-3">
                  <p className="text-lg">
                    {src.name}{" "}
                    <span className="text-xs text-muted-foreground">{src.role_at_event}</span>
                  </p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {src.excerpts.map((e, i) => (
                      <li key={i}>
                        <p className="text-muted-foreground">{e.question}</p>
                        <p>{e.answer}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Finding the sources…</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
