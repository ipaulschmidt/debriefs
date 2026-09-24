import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  getRetroBundle,
  removeMetric,
  removeParticipant,
  saveMetric,
  sendInvites,
  upsertParticipants,
} from "@/lib/retros.functions";
import { RetroNav } from "@/components/RetroNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DEPARTMENTS } from "@/config/departments";
import { shareOrigin } from "@/lib/share-url";
import { exportTranscripts, revealTranscript } from "@/lib/attribution.functions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/retros/$retroId/setup")({
  head: () => ({
    meta: [
      { title: "People and numbers — Debrief" },
      { name: "description", content: "Add who was there, enter the hard numbers, send invites." },
      { property: "og:title", content: "People and numbers — Debrief" },
      {
        property: "og:description",
        content: "Add who was there, enter the hard numbers, send invites.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Setup,
});

function Setup() {
  const { retroId } = Route.useParams();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["retro", retroId],
    queryFn: () => getRetroBundle({ data: { retroId } }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["retro", retroId] });


  const [emails, setEmails] = useState<{ email: string; dept: string }[]>([
    { email: "", dept: "" },
    { email: "", dept: "" },
    { email: "", dept: "" },
  ]);
  const [m, setM] = useState({ label: "", value: "", prior: "", notes: "" });

  const addPerson = useMutation({
    mutationFn: async () => {
      await upsertParticipants({
        data: {
          retroId,
          participants: emails
            .filter((p) => p.email.trim())
            .map((p) => ({
              email: p.email.trim(),
              ...(p.dept ? { role_at_event: p.dept } : {}),
            })),
        },
      });
      // Adding someone opens their interview straight away — no extra step.
      await sendInvites({ data: { retroId } });
    },
    onSuccess: () => {
      setEmails([
        { email: "", dept: "" },
        { email: "", dept: "" },
        { email: "", dept: "" },
      ]);
      invalidate();
      toast.success("Added — their interview is open. Copy each link below and send it.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add"),
  });
  const delPerson = useMutation({
    mutationFn: (id: string) => removeParticipant({ data: { id } }),
    onSuccess: invalidate,
  });
  const addMetric = useMutation({
    mutationFn: () =>
      saveMetric({
        data: {
          retroId,
          label: m.label,
          value: m.value,
          prior_year_value: m.prior || null,
          notes: m.notes || null,
        },
      }),
    onSuccess: () => {
      setM({ label: "", value: "", prior: "", notes: "" });
      invalidate();
    },
  });
  const delMetric = useMutation({
    mutationFn: (id: string) => removeMetric({ data: { id } }),
    onSuccess: invalidate,
  });
  const origin = shareOrigin();
  const isAdmin = !!data?.isAttributionAdmin;

  const [viewing, setViewing] = useState<{ name: string; email: string } | null>(null);
  const [transcript, setTranscript] =
    useState<Awaited<ReturnType<typeof revealTranscript>> | null>(null);
  const view = useMutation({
    mutationFn: (participantId: string) =>
      revealTranscript({ data: { retroId, participantId } }),
    onSuccess: setTranscript,
    onError: (e) => {
      setViewing(null);
      toast.error(e instanceof Error ? e.message : "Could not open their answers");
    },
  });

  const download = (name: string, text: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const exportAll = useMutation({
    mutationFn: () => exportTranscripts({ data: { retroId } }),
    onSuccess: (res) => {
      const slug = (res.retro?.name ?? "retro").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const md = [
        `# ${res.retro?.name ?? "Retro"} — every question and answer`,
        res.retro?.event_date ? `Event date: ${res.retro.event_date}` : "",
        "",
        ...(res.metrics.length
          ? [
              "## Numbers",
              ...res.metrics.map(
                (x) =>
                  `- ${x.label}: ${x.value}${x.prior_year_value ? ` (last time ${x.prior_year_value})` : ""}${x.notes ? ` — ${x.notes}` : ""}`,
              ),
              "",
            ]
          : []),
        ...res.people.flatMap((p) => [
          `## ${p.email}${p.role_at_event ? ` · ${p.role_at_event}` : ""}`,
          `Status: ${p.status}`,
          "",
          ...p.turns.flatMap((t) => [
            `**Q${t.sequence}${t.was_probe ? " (follow-up)" : ""}:** ${t.question_text}`,
            "",
            t.answer_text ?? "_no answer_",
            "",
          ]),
        ]),
      ].join("\n");
      const csv = [
        ["participant_email", "department", "sequence", "section", "follow_up", "question", "answer"]
          .map(csvCell)
          .join(","),
        ...res.people.flatMap((p) =>
          p.turns.map((t) =>
            [p.email, p.role_at_event, t.sequence, t.spine_area, t.was_probe ? "yes" : "no", t.question_text, t.answer_text]
              .map(csvCell)
              .join(","),
          ),
        ),
      ].join("\n");
      download(`${slug}-answers.md`, md, "text/markdown");
      download(`${slug}-answers.csv`, csv, "text/csv");
      toast.success("Downloaded as a document and a spreadsheet.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not export"),
  });

  return (
    <>
      <RetroNav retroId={retroId} name={data?.retro?.name ?? undefined} />
      <main className="mx-auto max-w-3xl space-y-12 px-6 py-10">
        <section>
          <p className="eyebrow">The easy way</p>
          <h2 className="mt-2 text-3xl">One link for the whole team</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Drop this single link in Slack or an email to everyone who was there. Each person enters
            their own email and department, then gets their own private interview — you don't have
            to add anyone by hand. People still never see each other's answers.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Input
              readOnly
              value={data?.retro?.join_token ? `${origin}/j/${data.retro.join_token}` : "…"}
              className="text-xs"
            />
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`${origin}/j/${data?.retro?.join_token}`);
                toast.success("Team link copied");
              }}
            >
              Copy
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            The link is live right away — nothing else to press.
          </p>
        </section>

        <section className="rule-top pt-8">
          <p className="eyebrow">Or add people yourself</p>
          <h2 className="mt-2 text-3xl">People</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Just email addresses — one per box. No names needed. If you like, pick each person's
            department from the drop-down: the interviewer uses it to make sense of their answers
            (and won't quiz a marketer about booth logistics). Each person gets a private link,
            with no account or password, and never sees anyone else's answers.
          </p>

          <div className="mt-6 space-y-3">
            {(data?.participants ?? []).map((person) => (
              <div key={person.id} className="rounded-md border bg-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg">{person.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {person.email}
                      {person.role_at_event ? ` · ${person.role_at_event}` : ""}
                    </p>
                  </div>
                  <Badge variant={person.status === "complete" ? "secondary" : "outline"}>
                    {person.status.replace(/_/g, " ")}
                  </Badge>
                  {isAdmin && person.status !== "not_started" ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setTranscript(null);
                        setViewing({ name: person.name, email: person.email });
                        view.mutate(person.id);
                      }}
                    >
                      View results
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => delPerson.mutate(person.id)}>
                    Remove
                  </Button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Input readOnly value={`${origin}/i/${person.invite_token}`} className="text-xs" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${origin}/i/${person.invite_token}`);
                      toast.success("Link copied");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2">
            {emails.map((person, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="name@company.com"
                  className="flex-1"
                  value={person.email}
                  onChange={(e) =>
                    setEmails((prev) =>
                      prev.map((x, xi) => (xi === i ? { ...x, email: e.target.value } : x)),
                    )
                  }
                />
                <select
                  className="w-44 rounded-md border bg-background px-2 text-sm text-foreground"
                  value={person.dept}
                  onChange={(e) =>
                    setEmails((prev) =>
                      prev.map((x, xi) => (xi === i ? { ...x, dept: e.target.value } : x)),
                    )
                  }
                >
                  <option value="">Department · optional</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setEmails((prev) => [...prev, { email: "", dept: "" }])}
            >
              Add another box
            </Button>
            <Button
              onClick={() => addPerson.mutate()}
              disabled={addPerson.isPending || !emails.some((p) => p.email.trim())}
            >
              Add these people
            </Button>
          </div>
        </section>

        <section className="rule-top pt-8">
          <p className="eyebrow">The hard numbers · optional</p>
          <h2 className="mt-2 text-3xl">Metrics</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Entirely optional, and you fill these in yourself — nothing is pulled from anywhere.
            Badge scans, meetings booked, leads created, pipeline sourced, total cost, or anything
            else worth tracking. Whatever you add shows up in the report, next to last year's
            figure if you enter one. Skip this section and everything else still works.
          </p>

          <div className="mt-6 space-y-2">
            {(data?.metrics ?? []).map((metric) => (
              <div
                key={metric.id}
                className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm"
              >
                <span className="flex-1">{metric.label}</span>
                <span className="text-lg">{metric.value}</span>
                {metric.prior_year_value ? (
                  <span className="text-xs text-muted-foreground">
                    last year {metric.prior_year_value}
                  </span>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => delMetric.mutate(metric.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-5">
            <Input
              placeholder="Label"
              value={m.label}
              onChange={(e) => setM({ ...m, label: e.target.value })}
            />
            <Input
              placeholder="This time"
              value={m.value}
              onChange={(e) => setM({ ...m, value: e.target.value })}
            />
            <Input
              placeholder="Last time"
              value={m.prior}
              onChange={(e) => setM({ ...m, prior: e.target.value })}
            />
            <Input
              placeholder="Notes"
              value={m.notes}
              onChange={(e) => setM({ ...m, notes: e.target.value })}
            />
            <Button onClick={() => addMetric.mutate()} disabled={!m.label || !m.value}>
              Add
            </Button>
          </div>
        </section>

        <section className="rule-top pt-8">
          <Label className="eyebrow">What each person is told</Label>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>It takes ten to fifteen minutes, and they can type or speak.</li>
            <li>The report describes what happened, never who said it.</li>
            <li>A theme needs two separate interviews before it appears in the report.</li>
            <li>Only the admin can see individual answers.</li>
            <li>The deadline, and when they'll see the report.</li>
          </ul>
        </section>

        {isAdmin ? (
          <section className="rule-top pt-8">
            <p className="eyebrow">Export</p>
            <h2 className="mt-2 text-3xl">Every question and answer</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Download everyone's answers as a document and a spreadsheet, with each person's email
              and department — handy if you want to write your own report.
            </p>
            <Button className="mt-4" onClick={() => exportAll.mutate()} disabled={exportAll.isPending}>
              {exportAll.isPending ? "Preparing…" : "Export everything"}
            </Button>
          </section>
        ) : null}
      </main>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewing?.email}</DialogTitle>
            <DialogDescription>Their answers, in the order they were asked.</DialogDescription>
          </DialogHeader>
          {transcript ? (
            <div className="max-h-[32rem] space-y-4 overflow-y-auto">
              {transcript.turns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No answers yet.</p>
              ) : null}
              {transcript.turns.map((t, i) => (
                <div key={i}>
                  <p className="text-sm text-muted-foreground">{t.question_text}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{t.answer_text ?? "—"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
