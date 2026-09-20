import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getRetroBundle } from "@/lib/retros.functions";
import { RetroNav } from "@/components/RetroNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/retros/$retroId/")({
  head: () => ({
    meta: [
      { title: "Retro overview — Debrief" },
      { name: "description", content: "Where this event retro stands: intake, interviews, report." },
      { property: "og:title", content: "Retro overview — Debrief" },
      {
        property: "og:description",
        content: "Where this event retro stands: intake, interviews, report.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { retroId } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["retro", retroId],
    queryFn: () => getRetroBundle({ data: { retroId } }),
  });

  const retro = data?.retro;
  const participants = data?.participants ?? [];
  const done = participants.filter((p) => p.status === "complete").length;
  const summary = (retro?.intake_summary ?? null) as null | Record<string, unknown>;

  return (
    <>
      <RetroNav retroId={retroId} name={retro?.name} />
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="eyebrow">Status</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl">{retro?.status}</CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="eyebrow">Interviews</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl">
              {done} of {participants.length} complete
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="eyebrow">Deadline</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl">{retro?.interview_deadline ?? "—"}</CardContent>
          </Card>
        </div>

        {data?.carriedForward?.length ? (
          <section>
            <h2 className="text-2xl">Carried forward from last time</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These get asked about in the intake and in participant interviews.
            </p>
            <ul className="mt-4 space-y-2">
              {data.carriedForward.map((a) => (
                <li key={a.id} className="rounded-md border bg-card p-3 text-sm">
                  <span className="mr-2">{a.description}</span>
                  <Badge variant="outline">{a.status}</Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rule-top pt-8">
          <h2 className="text-2xl">Next step</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant={retro?.status === "draft" ? "default" : "outline"}>
              <Link to="/retros/$retroId/intake" params={{ retroId }}>
                Intake interview
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/retros/$retroId/questions" params={{ retroId }}>
                Review question set
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/retros/$retroId/setup" params={{ retroId }}>
                People and numbers
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/retros/$retroId/report" params={{ retroId }}>
                Report
              </Link>
            </Button>
          </div>
        </section>

        {summary ? (
          <section className="rule-top pt-8">
            <h2 className="text-2xl">Intake summary</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Private to admins. It shapes which topics get probed, never what answer gets
              suggested.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {Object.entries(summary).map(([key, value]) => (
                <div key={key} className="rounded-md border bg-card p-4">
                  <p className="eyebrow">{key.replace(/_/g, " ")}</p>
                  <div className="mt-2 text-sm leading-relaxed">
                    {Array.isArray(value) ? (
                      <ul className="list-disc space-y-1 pl-4">
                        {value.map((v, i) => (
                          <li key={i}>{typeof v === "string" ? v : JSON.stringify(v)}</li>
                        ))}
                      </ul>
                    ) : (
                      String(value)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
