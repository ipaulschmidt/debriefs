import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createRetro, listRetros } from "@/lib/retros.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/retros/")({
  head: () => ({
    meta: [
      { title: "Your retros — Debrief" },
      { name: "description", content: "Every event retro you run or review in Debrief." },
      { property: "og:title", content: "Your retros — Debrief" },
      { property: "og:description", content: "Every event retro you run or review in Debrief." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RetroList,
});

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  intake: "Intake in progress",
  questions_review: "Question set to review",
  collecting: "Interviews open",
  closed: "Interviews closed",
  reported: "Report ready",
};

function RetroList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: retros = [] } = useQuery({ queryKey: ["retros"], queryFn: () => listRetros() });

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [previous, setPrevious] = useState("none");

  const create = useMutation({
    mutationFn: () =>
      createRetro({
        data: {
          name,
          eventDate: eventDate || null,
          interviewDeadline: deadline || null,
          previousRetroId: previous === "none" ? null : previous,
        },
      }),
    onSuccess: (retro) => {
      qc.invalidateQueries({ queryKey: ["retros"] });
      toast.success("Retro created. Next: the intake interview.");
      navigate({ to: "/retros/$retroId/intake", params: { retroId: retro.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create the retro"),
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="grid gap-12 md:grid-cols-[1.3fr_1fr]">
        <section>
          <div className="flex items-baseline justify-between gap-4">
            <p className="eyebrow">Your retros</p>
            <Link to="/admin" className="text-sm text-muted-foreground hover:underline">
              Admin →
            </Link>
          </div>
          <h1 className="mt-2 text-4xl">Every event, one honest report</h1>
          <div className="mt-8 space-y-3">
            {retros.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing yet. Create your first retro on the right.
              </p>
            ) : null}
            {retros.map((r) => (
              <Link
                key={r.id}
                to="/retros/$retroId"
                params={{ retroId: r.id }}
                className="block rounded-lg border bg-card p-4 transition-colors hover:border-accent"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl">{r.name}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.event_date ? `Event ${r.event_date}` : "No event date"} ·{" "}
                      {r.interview_deadline ? `deadline ${r.interview_deadline}` : "no deadline"}
                    </p>
                  </div>
                  <Badge variant="secondary">{STATUS_LABEL[r.status] ?? r.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <Card className="h-fit bg-card">
          <CardHeader>
            <CardTitle className="text-2xl">New retro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MedTech Expo 2026"
              />
            </div>
            <div className="space-y-2">

              <Label htmlFor="ed">Event date</Label>
              <Input
                id="ed"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dl">Interview deadline</Label>
              <Input
                id="dl"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            {retros.length ? (
              <div className="space-y-2">
                <Label>Follows on from</Label>
                <Select value={previous} onValueChange={setPrevious}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nothing — first one</SelectItem>
                    {retros.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Open actions from that retro carry forward and get asked about.
                </p>
              </div>
            ) : null}
            <Button
              className="w-full"
              disabled={!name || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Creating…" : "Create and start intake"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
