import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Debrief — post-event retros without the meeting" },
      {
        name: "description",
        content:
          "Debrief interviews each teammate privately after an event, then writes one honest report with owned action items. No group retro, no loudest voice.",
      },
      { property: "og:title", content: "Debrief — post-event retros without the meeting" },
      {
        property: "og:description",
        content:
          "Private one-on-one interviews after a trade show or conference, synthesized into one honest report.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const POINTS = [
  {
    title: "Collect independently",
    body: "Everyone is interviewed alone. Nobody sees another person's answers, a running tally, or a partial summary.",
  },
  {
    title: "Probe, don't survey",
    body: "\u201CTraffic was slow\u201D gets a follow-up: slow compared to what, and what were people asking when they did stop?",
  },
  {
    title: "Synthesize centrally",
    body: "One report at the process level. A theme needs two separate interviews before it counts as a finding.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
        <span className="display text-2xl">Debrief</span>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-20 pt-10">
        <p className="eyebrow">Post-event retrospectives</p>
        <h1 className="mt-4 max-w-3xl text-5xl leading-[1.05] md:text-7xl">
          Post-event feedback that includes everyone
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Group retros only hear from whoever talks first and loudest. Debrief interviews every
          person who was there, privately and one at a time, then turns their honest answers into a
          single report with action items someone owns.
        </p>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed">
          In a typical group retro, two or three people do the talking. Debrief interviews everyone
          individually, every time.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Start a retro</Link>
          </Button>
        </div>
      </section>

      <section className="rule-top mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-3">
          {POINTS.map((p) => (
            <div key={p.title}>
              <h2 className="text-2xl">{p.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rule-top mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl">What we promise participants, exactly</h2>
        <ul className="mt-6 max-w-2xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li>The report describes what happened and never names who said it.</li>
          <li>Colleagues never see individual responses.</li>
          <li>
            A retro admin can review individual responses if there is a specific reason, and every
            such review is recorded in a log the whole team can read.
          </li>
        </ul>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed">
          That is not anonymity, and Debrief never calls it that.
        </p>
      </section>

      <footer className="rule-top mx-auto max-w-5xl px-6 py-10 text-xs text-muted-foreground">
        Debrief — event retros, v1.
      </footer>
    </main>
  );
}
