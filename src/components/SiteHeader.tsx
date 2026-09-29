import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  const name = "أهل الصنعة";
  const tagline = "كل صنعة عند أهلها";
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-11 place-items-center rounded-xl bg-primary text-2xl font-extrabold text-primary-foreground">
            {name.charAt(0)}
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-extrabold">{name}</span>
            <span className="block text-xs text-muted-foreground">{tagline}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
