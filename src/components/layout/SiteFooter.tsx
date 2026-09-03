import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/brand/Logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Logo className="h-12 w-auto" />
          <p className="max-w-xs text-xs text-muted-foreground">
            The digital year book for campus events, moments and student experience.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 font-display text-xs uppercase tracking-widest text-muted-foreground">
          <Link to="/discover" className="transition-colors hover:text-primary">
            Discover
          </Link>
          <Link to="/rewards" className="transition-colors hover:text-primary">
            Rewards
          </Link>
          <Link to="/student-signup" className="transition-colors hover:text-primary">
            Student sign up
          </Link>
          <Link to="/organiser-login" className="transition-colors hover:text-primary">
            Organisers
          </Link>
        </nav>
      </div>
      <p className="pb-8 text-center text-[11px] text-muted-foreground/70">
        © {new Date().getFullYear()} COLLAXP · Built for South African students
      </p>
    </footer>
  );
}
