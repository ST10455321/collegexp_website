import { useEffect, useMemo, useState } from "react";

import { LogoMark, PETAL_COUNT, PETAL_D, Wordmark } from "@/components/brand/Logo";

const KEY = "collaxp:intro-played";

type Phase = "spark" | "form" | "build" | "reveal" | "lock" | "out" | "done";

/**
 * Cinematic ~3s brand intro, staged from the storyboard:
 *   1. spark   — purple light ignites
 *   2. form    — ribbon petals draw themselves in, one by one, as a neon outline
 *   3. build   — the neon outline dissolves into the finished metallic mark
 *   4. reveal  — COLLAXP wordmark slides/wipes in next to the mark
 *   5. lock    — logo settles with a soft snap
 *   6. out     — fades to reveal the site
 *
 * Fully vector (SVG + text) — no external image assets, so it can never
 * show a broken-image icon.
 */
export function IntroOverlay() {
  const [phase, setPhase] = useState<Phase>("done");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(KEY) === "1") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sessionStorage.setItem(KEY, "1");
      return;
    }

    sessionStorage.setItem(KEY, "1");
    setPhase("spark");

    const timers = [
      window.setTimeout(() => setPhase("form"), 450),
      window.setTimeout(() => setPhase("build"), 1000),
      window.setTimeout(() => setPhase("reveal"), 1550),
      window.setTimeout(() => setPhase("lock"), 2150),
      window.setTimeout(() => setPhase("out"), 2500),
      window.setTimeout(() => setPhase("done"), 3100),
    ];

    return () => timers.forEach(window.clearTimeout);
  }, []);

  const petals = useMemo(
    () =>
      Array.from({ length: PETAL_COUNT }, (_, i) => ({
        angle: (360 / PETAL_COUNT) * i,
        delay: i * 55,
      })),
    [],
  );

  if (phase === "done") return null;

  const showFlower = phase !== "spark";
  const showNeon = phase === "form";
  const showFilledMark =
    phase === "build" || phase === "reveal" || phase === "lock" || phase === "out";
  const showText = phase === "reveal" || phase === "lock" || phase === "out";

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black transition-opacity duration-500"
      style={{ opacity: phase === "out" ? 0 : 1 }}
    >
      {/* purple light igniting */}
      <div
        className="pointer-events-none absolute h-[70vmin] w-[70vmin] rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--primary) 70%, transparent) 0%, transparent 62%)",
          animation: "collaxp-spark 1.2s ease-out both",
          opacity: phase === "spark" ? 0.9 : 0.45,
          transition: "opacity 600ms ease",
        }}
      />
      {phase === "spark" && (
        <div
          className="absolute h-3 w-3 rounded-full bg-white"
          style={{
            boxShadow: "0 0 40px 14px color-mix(in oklab, var(--primary) 85%, transparent)",
            animation: "collaxp-spark 0.9s ease-out both",
          }}
        />
      )}

      {showFlower && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-[46vmin] max-h-[360px] w-[46vmin] max-w-[360px] items-center justify-center">
            {/* stage 2: neon ribbon outline, drawn petal by petal */}
            {showNeon && (
              <svg
                viewBox="0 0 240 240"
                className="absolute inset-0 h-full w-full"
                style={{
                  filter:
                    "drop-shadow(0 0 6px var(--primary)) drop-shadow(0 0 18px color-mix(in oklab, var(--primary) 70%, transparent))",
                  animation: "collaxp-flower-spin-in 550ms cubic-bezier(0.22,1,0.36,1) both",
                }}
              >
                <g fill="none" stroke="var(--primary)" strokeWidth={3} strokeLinecap="round">
                  {petals.map(({ angle, delay }) => (
                    <path
                      key={angle}
                      d={PETAL_D}
                      pathLength={1}
                      transform={`rotate(${angle} 120 120)`}
                      style={{
                        strokeDasharray: 1,
                        animation: `collaxp-petal-draw 420ms ease-out ${delay}ms both`,
                      }}
                    />
                  ))}
                </g>
              </svg>
            )}

            {/* stage 3: dissolves into the finished metallic mark */}
            <LogoMark
              className="absolute inset-0 h-full w-full"
              filled
              style={{
                opacity: showFilledMark ? 1 : 0,
                transform: showFilledMark ? "scale(1)" : "scale(0.9)",
                transition:
                  "opacity 500ms cubic-bezier(0.22,1,0.36,1), transform 500ms cubic-bezier(0.22,1,0.36,1)",
                animation:
                  phase === "lock" || phase === "out"
                    ? "collaxp-lock 420ms cubic-bezier(0.22,1,0.36,1) both"
                    : undefined,
              }}
            />
          </div>

          {/* stage 4-6: wordmark wipes in below the mark, locks, then the whole overlay fades */}
          <div
            className="overflow-hidden"
            style={{
              opacity: showText ? 1 : 0,
              animation: showText
                ? "collaxp-wipe 620ms cubic-bezier(0.22,1,0.36,1) both"
                : undefined,
            }}
          >
            <Wordmark
              className="text-4xl sm:text-5xl"
              style={{
                display: "inline-block",
                animation:
                  phase === "lock" || phase === "out"
                    ? "collaxp-lock 420ms cubic-bezier(0.22,1,0.36,1) both"
                    : undefined,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
