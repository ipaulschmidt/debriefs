import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  draftCustomQuestion,
  generateProbes,
  getQuestionSet,
  saveProbes,
  type Probe,
} from "@/lib/intake.functions";
import { Textarea } from "@/components/ui/textarea";
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
  const [note, setNote] = useState("");
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
    mutationFn: (approve: boolean) =>
      saveProbes({
        data: { retroId, probes: probes.filter((p) => p.question.trim()), approve },
      }),
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
        <h2 className="mt-2 text-3xl">Nine fixed areas, plus anything you add</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Every person gets the same nine areas below, in this order. You can't change those. What
          you can change is the extra questions sitting inside each area: some are drafted from
          what you told us in the intake, and you can write your own as well. The interviewer also
          keeps digging on its own whenever someone gives a vague answer.
        </p>
        <div className="mt-4 rounded-md border-l-2 border-accent bg-card p-4 text-sm leading-relaxed">
          Avoid questions that suggest an answer. If a question tells someone what you think, it
          will shape what eight people tell you back. Nothing you said in the intake is ever shown
          to your team — only the topic survives, never your opinion of it.
        </div>

        <div className="mt-8 rounded-md border bg-card p-4">
          <p className="eyebrow">Anything else you want asked?</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Write it however it comes out — “get feedback on the party”, “should we do the dinner
            again”. We'll word it neutrally so it doesn't hint at your view, and drop it into the
            right area.
          </p>
          <Textarea
            className="mt-3"
            rows={3}
            placeholder="e.g. I want to know what people thought of the party and whether it's worth doing again"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            className="mt-3"
            onClick={() => draft.mutate()}
            disabled={draft.isPending || !note.trim()}
          >
            {draft.isPending ? "Writing the question…" : "Add this question"}
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            {generate.isPending
              ? "Drafting…"
              : probes.length
                ? "Redo the questions from my intake"
                : "Draft extra questions from my intake"}
          </Button>
          {qs?.approved_at ? <Badge variant="secondary">Approved</Badge> : null}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Use this after you go back and add more to your intake conversation: it rewrites the
          intake-drafted questions from scratch using everything you've said. Questions you wrote
          or added yourself are kept.
        </p>

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
                    Always asked
                  </Badge>
                </div>
                <p className="mt-2 text-base leading-relaxed">{area.openingQuestion}</p>
                <p className="mt-1 text-xs text-muted-foreground">{area.brief}</p>

                {areaProbes.map(({ p, i }) => (
                  <div key={i} className="mt-4 rounded-md border bg-card p-4">
                    <p className="eyebrow">Extra question in this area</p>
                    <Input
                      className="mt-2"
                      placeholder="Write a question — ask about a topic, don't hint at an answer"
                      value={p.question}
                      onChange={(e) =>
                        setProbes((prev) =>
                          prev.map((x, xi) => (xi === i ? { ...x, question: e.target.value } : x)),
                        )
                      }
                    />
                    {p.derivedFrom ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Drafted from something you said in the intake: “{p.derivedFrom}” — your
                        words stay private; only this question is asked.
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">Added by you.</p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => setProbes((prev) => prev.filter((_x, xi) => xi !== i))}
                    >
                      Remove question
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() =>
                    setProbes((prev) => [
                      ...prev,
                      { question: "", spineArea: area.id, derivedFrom: "" },
                    ])
                  }
                >
                  Add my own question here
                </Button>
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
