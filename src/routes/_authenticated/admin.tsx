import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getDashboard } from "@/lib/dashboard.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Debrief" },
      {
        name: "description",
        content: "Every retro, how far along it is, and what keeps coming up across events.",
      },
      { property: "og:title", content: "Admin — Debrief" },
      {
        property: "og:description",
        content: "Every retro, how far along it is, and what keeps coming up across events.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  intake: "Intake in progress",
  questions_review: "Questions to review",
  collecting: "Interviews open",
  closed: "Interviews closed",
  reported: "Report ready",
};

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
  });
  const [compare, setCompare] = useState<string[]>([]);

  const retros = data?.retros ?? [];
  const findings = data?.findings ?? [];
  const recurring = data?.recurring ?? [];

  const withReports = retros.filter((r) => r.hasReport);
  const selected = compare.length ? compare : withReports.slice(0, 3).map((r) => r.id);

  const totals = retros.reduce(
    (acc, r) => ({
      invited: acc.invited + r.invited,
      complete: acc.complete + r.complete,
    }),
    { invited: 0, complete: 0 },
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-2 text-4xl">Everything you're running</h1>
        </div>
        <Link to="/retros" className="text-sm text-muted-foreground hover:underline">
          Your retros →
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
      ) : retros.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          No retros yet. <Link to="/retros" className="underline">Create your first one.</Link>
        </p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Stat label="Retros" value={String(retros.length)} />
            <Stat
              label="Interviews finished"
              value={`${totals.complete} of ${totals.invited}`}
            />
            <Stat label="Reports ready" value={String(withReports.length)} />
          </div>

          <section className="mt-12">
            <h2 className="text-2xl">Every retro</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[42rem] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="pb-2">Event</th>
                    <th className="pb-2">Stage</th>
                    <th className="pb-2">Finished</th>
                    <th className="pb-2">Depth of answers</th>
                    <th className="pb-2">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {retros.map((r) => {
                    const pct = r.invited ? Math.round((r.complete / r.invited) * 100) : 0;
                    return (
                      <tr key={r.id} className="border-t">
                        <td className="py-3 pr-4">
                          <Link
                            to="/retros/$retroId"
                            params={{ retroId: r.id }}
                            className="hover:underline"
                          >
                            {r.name}
                          </Link>
                          {r.event_date ? (
                            <span className="block text-xs text-muted-foreground">
                              {r.event_date}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="secondary">{STATUS_LABEL[r.status] ?? r.status}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1 w-20 rounded-full bg-muted">
                              <div
                                className="h-1 rounded-full bg-foreground"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {r.complete}/{r.invited}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {r.avgCompleteness === null
                            ? "—"
                            : `${Math.round(r.avgCompleteness * 100)}% full answers`}
                          {r.thinFlagged ? ` · ${r.thinFlagged} thin` : ""}
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {r.interview_deadline ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl">What keeps coming up</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Findings that showed up in reports from more than one event. Still no names anywhere.
            </p>
            {recurring.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Nothing repeats yet — you need reports from at least two events.
              </p>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {recurring.map((theme, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Badge variant={theme.kind === "worked" ? "secondary" : "destructive"}>
                        {theme.kind === "worked" ? "Worked again" : "Broke again"}
                      </Badge>
                      <CardTitle className="mt-2 text-lg leading-snug">{theme.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {theme.occurrences.map((o, j) => (
                        <div key={j}>
                          <Link
                            to="/retros/$retroId/report"
                            params={{ retroId: o.retroId }}
                            className="text-xs uppercase tracking-wide text-muted-foreground hover:underline"
                          >
                            {o.retroName}
                          </Link>
                          <p className="leading-relaxed">{o.finding}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="mt-14">
            <h2 className="text-2xl">Compare events side by side</h2>
            {withReports.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No reports generated yet.
              </p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {withReports.map((r) => {
                    const on = selected.includes(r.id);
                    return (
                      <Button
                        key={r.id}
                        size="sm"
                        variant={on ? "default" : "outline"}
                        onClick={() =>
                          setCompare(
                            on
                              ? selected.filter((id) => id !== r.id)
                              : [...selected, r.id],
                          )
                        }
                      >
                        {r.name}
                      </Button>
                    );
                  })}
                </div>
                <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {withReports
                    .filter((r) => selected.includes(r.id))
                    .map((r) => {
                      const own = findings.filter((f) => f.retroId === r.id);
                      return (
                        <div key={r.id} className="rounded-md border p-4">
                          <p className="eyebrow">{r.event_date ?? "—"}</p>
                          <h3 className="mt-1 text-lg">{r.name}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {r.complete} of {r.invited} interviews
                          </p>
                          <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">
                            Worked
                          </p>
                          <ul className="mt-1 space-y-1 text-sm">
                            {own.filter((f) => f.kind === "worked").map((f, i) => (
                              <li key={i}>{f.finding}</li>
                            ))}
                            {own.every((f) => f.kind !== "worked") ? (
                              <li className="text-muted-foreground">—</li>
                            ) : null}
                          </ul>
                          <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">
                            Didn't work
                          </p>
                          <ul className="mt-1 space-y-1 text-sm">
                            {own.filter((f) => f.kind === "didnt").map((f, i) => (
                              <li key={i}>{f.finding}</li>
                            ))}
                            {own.every((f) => f.kind !== "didnt") ? (
                              <li className="text-muted-foreground">—</li>
                            ) : null}
                          </ul>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl">{value}</p>
    </div>
  );
}
