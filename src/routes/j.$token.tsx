import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getJoinInfo, joinRetro } from "@/lib/interview.functions";
import { DEPARTMENTS } from "@/config/departments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/j/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Join the retro — Debrief" },
      {
        name: "description",
        content: "Enter your email to start your own private ten-minute retro interview.",
      },
      { property: "og:title", content: "Join the retro — Debrief" },
      {
        property: "og:description",
        content: "Enter your email to start your own private ten-minute retro interview.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Join,
});

function Join() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [dept, setDept] = useState("");

  const { data: retro, isLoading } = useQuery({
    queryKey: ["join", token],
    queryFn: () => getJoinInfo({ data: { joinToken: token } }),
  });

  const join = useMutation({
    mutationFn: () =>
      joinRetro({ data: { joinToken: token, email, ...(dept ? { dept } : {}) } }),
    onSuccess: (res) => navigate({ to: "/i/$token", params: { token: res.inviteToken } }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not start your survey"),
  });

  if (isLoading) {
    return <main className="mx-auto max-w-xl px-6 py-20 text-muted-foreground">Loading…</main>;
  }

  if (!retro) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <h1 className="text-3xl">This link isn't valid</h1>
        <p className="mt-3 text-muted-foreground">Ask whoever shared it to send a fresh one.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-14">
      <p className="eyebrow">{retro.name}</p>
      <h1 className="mt-2 text-4xl">Your feedback survey</h1>
      <p className="mt-4 text-base leading-relaxed">
        A private conversation about how the event actually went — ten to fifteen minutes, type or
        speak, stop and come back whenever you like.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Your email is only used to keep your place, so you can return to where you left off. The
        report describes what happened and never names who said it.
      </p>

      <div className="mt-8 space-y-3">
        <Input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select
          className="h-10 w-full rounded-md border bg-background px-2 text-sm text-foreground"
          value={dept}
          onChange={(e) => setDept(e.target.value)}
        >
          <option value="">Your department · optional</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <Button
          className="w-full"
          onClick={() => join.mutate()}
          disabled={!email.trim() || join.isPending}
        >
          {join.isPending ? "Starting…" : "Start my survey"}
        </Button>
      </div>
    </main>
  );
}
