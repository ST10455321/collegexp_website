import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

export const PETAL_COUNT = 8;
// One twisted ribbon-loop petal, pointing outward from the flower's center (120,120).
export const PETAL_D = "M120,120 C162,88 150,16 120,6 C90,28 66,80 120,120 Z";

/**
 * The COLLAXP ribbon-flower mark, drawn as vector SVG (no external image).
 * `filled` renders the finished metallic look; set false for an outline-only
 * (neon) version, used mid-draw by the intro animation.
 */
export function LogoMark({
  className,
  style,
  filled = true,
}: {
  className?: string;
  style?: CSSProperties;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 240 240"
      className={cn("select-none", className)}
      style={style}
      aria-hidden
    >
      <defs>
        <linearGradient id="collaxp-mark-grad" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#f5f3ff" />
          <stop offset="45%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="#150a1e" />
        </linearGradient>
      </defs>
      <g
        fill={filled ? "url(#collaxp-mark-grad)" : "none"}
        stroke="var(--primary)"
        strokeWidth={filled ? 1.5 : 3}
        strokeLinecap="round"
      >
        {Array.from({ length: PETAL_COUNT }, (_, i) => (
          <path
            key={i}
            d={PETAL_D}
            transform={`rotate(${(360 / PETAL_COUNT) * i} 120 120)`}
          />
        ))}
      </g>
    </svg>
  );
}

/** The "COLLAXP" wordmark, styled with the site's display font. */
export function Wordmark({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn(
        "font-display font-bold uppercase leading-none tracking-wide",
        className,
      )}
      style={style}
    >
      <span className="text-foreground">COLLA</span>
      <span className="text-primary">XP</span>
    </span>
  );
}

export function Logo({
  className,
  variant = "full",
}: {
  className?: string;
  variant?: "full" | "mark";
}) {
  if (variant === "mark") {
    return <LogoMark className={className} />;
  }

  return (
    <span className={cn("inline-flex select-none items-center gap-2", className)}>
      <LogoMark className="h-full w-auto shrink-0" />
      <Wordmark className="text-[0.55em]" />
    </span>
  );
}
