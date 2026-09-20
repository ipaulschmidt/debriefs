import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { generateProbes, getQuestionSet, saveProbes, type Probe } from "@/lib/intake.functions";
import { SPINE, CLOSER_QUESTION } from "@/config/spine";
import { RetroNav } from "@/components/RetroNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/retros/$retroId/questions")({
  head: () => ({
    meta: [
      { title: "Question set — Debrief" },
      {
        name: "description",
        content: "The fixed interview spine plus the probes drawn from your intake.",
      },
      { property: "og:title", content: "Question set — Debrief" },
      {
        property: "og:description",
        content: "The fixed interview spine plus the probes drawn from your intake.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Questions,
});

function Questions() {
  const { retroId } = Route.useParams();
  const qc = useQueryClient();
  const { data: qs } = useQuery({
    queryKey: ["questionSet", retroId],
    queryFn: () => getQuestionSet({ data: { retroId } }),
  });

  const [probes, setProbes] = useState<Probe[]>([]);
  useEffect(() => {
    if (qs) setProbes((qs.organizer_edited_probes ?? []) as unknown as Probe[]);
  }, [qs]);

  const generate = useMutation({
    mutationFn: () => generateProbes({ data: { retroId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questionSet", retroId] });
      toast.success("Probes drafted from your intake.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not draft probes"),
  });

  const save = useMutation({
    mutationFn: (approve: boolean) => saveProbes({ data: { retroId, probes, approve } }),
    onSuccess: (_r, approve) => {
      qc.invalidateQueries({ queryKey: ["questionSet", retroId] });
      toast.success(approve ? "Approved. Now add your people." : "Saved.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <>
      <RetroNav retroId={retroId} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="eyebrow">Question set</p>
        <h2 className="mt-2 text-3xl">Eight fixed areas, plus your probes</h2>
        <div className="mt-4 rounded-md border-l-2 border-accent bg-card p-4 text-sm leading-relaxed">
          Avoid questions that suggest an answer. If a question tells someone what you think, it
          will shape what eight people tell you back.
        </div>

        <div className="mt-8 flex gap-3">
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending
              ? "Drafting…"
              : probes.length
                ? "Re-draft probes from intake"
                : "Draft probes from intake"}
          </Button>
          {qs?.approved_at ? <Badge variant="secondary">Approved</Badge> : null}
        </div>

        <div className="mt-10 space-y-8">
          {SPINE.map((area) => {
            const areaProbes = probes
              .map((p, i) => ({ p, i }))
              .filter(({ p }) => Number(p.spineArea) === area.id);
            return (
              <section key={area.id} className="rule-top pt-6">
                <div className="flex items-baseline gap-3">
                  <span className="eyebrow">{area.id}</span>
                  <h3 className="text-2xl">{area.title}</h3>
                  <Badge variant="outline" className="ml-auto">
                    Fixed
                  </Badge>
                </div>
                <p className="mt-2 text-base leading-relaxed">{area.openingQuestion}</p>
                <p className="mt-1 text-xs text-muted-foreground">{area.brief}</p>

                {areaProbes.map(({ p, i }) => (
                  <div key={i} className="mt-4 rounded-md border bg-card p-4">
                    <p className="eyebrow">Your probe</p>
                    <Input
                      className="mt-2"
                      value={p.question}
                      onChange={(e) =>
                        setProbes((prev) =>
                          prev.map((x, xi) => (xi === i ? { ...x, question: e.target.value } : x)),
                        )
                      }
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      From what you said: “{p.derivedFrom}”
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => setProbes((prev) => prev.filter((_x, xi) => xi !== i))}
                    >
                      Remove probe
                    </Button>
                  </div>
                ))}
              </section>
            );
          })}

          <section className="rule-top pt-6">
            <h3 className="text-2xl">Closer</h3>
            <p className="mt-2 text-base">{CLOSER_QUESTION}</p>
          </section>
        </div>

        <div className="mt-10 flex gap-3">
          <Button variant="outline" onClick={() => save.mutate(false)} disabled={save.isPending}>
            Save draft
          </Button>
          <Button onClick={() => save.mutate(true)} disabled={save.isPending}>
            Approve question set
          </Button>
        </div>
      </main>
    </>
  );
}
