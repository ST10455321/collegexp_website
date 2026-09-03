import { Link } from "@tanstack/react-router";
import { Bell, Menu, ShoppingCart, X } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCartCount } from "@/hooks/useCart";

const publicLinks = [
  { to: "/", label: "Home" },
  { to: "/discover", label: "Discover" },
  { to: "/reels", label: "Reels" },
  { to: "/rewards", label: "Rewards" },
];

const studentLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/my-events", label: "My Events" },
  { to: "/profile", label: "Profile" },
];

export function SiteHeader() {
  const { user, profile, role, signOut } = useAuth();
  const cartCount = useCartCount();
  const [open, setOpen] = useState(false);

  const links = [
    ...publicLinks,
    ...(user && role !== "organiser" ? studentLinks : []),
    ...(role === "organiser"
      ? [
          { to: "/organiser", label: "Organiser" },
          { to: "/scan", label: "Scan" },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-[1.03]">
          <Logo className="h-10 w-auto" />
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "text-primary" }}
              className="relative rounded-full px-3 py-2 font-display text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {user ? (
            <>
              {role !== "organiser" && (
                <Link
                  to="/cart"
                  aria-label="Ticket cart"
                  className="relative rounded-full border border-border p-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-display text-[9px] text-primary-foreground">
                      {cartCount}
                    </span>
                  )}
                </Link>
              )}
              <Link
                to="/notifications"
                aria-label="Notifications"
                className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Bell className="h-4 w-4" />
              </Link>
              <span className="hidden font-display text-xs uppercase tracking-widest text-primary sm:inline">
                {profile?.student_number ?? profile?.username ?? "Organiser"}
              </span>
              <Button variant="outline" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/student-login">Student login</Link>
              </Button>
              <Button size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/student-signup">Sign up</Link>
              </Button>
            </>
          )}
          <button
            className="rounded-full border border-border p-2 md:hidden"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background/95 px-4 pb-4 md:hidden">
          <nav className="flex flex-col">
            {[
              ...links,
              ...(user && role !== "organiser" ? [{ to: "/cart", label: "Cart" }] : []),
              { to: "/organiser-login", label: "Organiser login" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="border-b border-border/40 py-3 font-display text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
