import { Link } from "@tanstack/react-router";

const TABS = [
  { to: "/retros/$retroId", label: "Overview" },
  { to: "/retros/$retroId/intake", label: "Intake" },
  { to: "/retros/$retroId/questions", label: "Question set" },
  { to: "/retros/$retroId/setup", label: "People & numbers" },
  { to: "/retros/$retroId/report", label: "Report" },
  { to: "/retros/$retroId/access-log", label: "Access log" },
] as const;

export function RetroNav({ retroId, name }: { retroId: string; name?: string | undefined }) {
  return (
    <div className="border-b">
      <div className="mx-auto max-w-5xl px-6 pb-3 pt-6">
        <div className="flex items-baseline gap-4">
          <Link to="/retros" className="eyebrow hover:underline">
            ← All retros
          </Link>
          <Link to="/dashboard" className="eyebrow hover:underline">
            Dashboard
          </Link>
        </div>
        <h1 className="mt-2 text-3xl">{name ?? "Retro"}</h1>
        <nav className="mt-4 flex flex-wrap gap-4 text-sm">
          {TABS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              params={{ retroId }}
              activeOptions={{ exact: t.to === "/retros/$retroId" }}
              className="pb-2 text-muted-foreground transition-colors hover:text-foreground [&.active]:border-b-2 [&.active]:border-accent [&.active]:text-foreground"
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
